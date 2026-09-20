// iOS refuses to play audio (Web Audio AND speechSynthesis) unless it was
// first started INSIDE a user gesture. Before this module the metronome's
// AudioContext was built in a timer callback and speech was first requested
// from a passive effect — so on a real iPhone the app was silent while the
// speaker icon said "unmuted". Prime both inside the first gesture, once.
//
// ...and prime them AGAIN after backgrounding. That is not an edge case here:
// the standard next action in a dental emergency is to dial 999, on the same
// phone, which backgrounds the PWA and suspends its AudioContext. Coming back
// to a silent app mid-resus is the failure this module's second half prevents.
let sharedCtx: AudioContext | null = null;
let unlocked = false;
let listenersArmed = false;
let visibilityAttached = false;

const GESTURES = ['pointerdown', 'touchend', 'keydown'] as const;

// One stable handler for all three events. It has to be a module-level
// reference, not a closure made per install: removeEventListener matches by
// identity, so a fresh arrow per call could never take its own listeners off.
const onGesture = () => unlockAudio();

// capture:true on the way in, so capture:true on the way out — the pair is part
// of the identity removeEventListener matches on.
const GESTURE_IN: AddEventListenerOptions = { once: true, capture: true, passive: true };
const GESTURE_OUT: EventListenerOptions = { capture: true };

function armGestureListeners(): void {
  if (typeof window === 'undefined' || listenersArmed) return;
  for (const ev of GESTURES) window.addEventListener(ev, onGesture, GESTURE_IN);
  listenersArmed = true;
}

function disarmGestureListeners(): void {
  if (typeof window === 'undefined') {
    listenersArmed = false;
    return;
  }
  for (const ev of GESTURES) window.removeEventListener(ev, onGesture, GESTURE_OUT);
  listenersArmed = false;
}

/** Forget that audio was ever primed, so the next gesture primes it again. */
function rearm(): void {
  unlocked = false;
  armGestureListeners();
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) {
    // iOS throws here when it cannot allocate a context. Return null rather
    // than let it escape: unlockAudio() has already latched `unlocked` and the
    // gesture listeners were {once}, so an escaping throw would skip the
    // speechSynthesis prime below it and leave narration dead for the session.
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedCtx.state === 'suspended') {
    // Outside a gesture iOS rejects resume(). That is expected, not fatal —
    // swallow it so it is never an unhandled rejection, and (same reason as
    // above) never a throw that escapes getAudioContext.
    try {
      void sharedCtx.resume().catch(() => { /* stays suspended until the next gesture */ });
    } catch { /* no promise-returning resume (very old WebKit) */ }
  }
  return sharedCtx;
}

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  // The gesture that got here removed only ITS own {once} listener; the other
  // two are still hooked to window. Take them off now, or every re-arm below
  // stacks a fresh trio on top of the stale one.
  disarmGestureListeners();
  const ctx = getAudioContext();
  if (ctx) {
    try {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      g.gain.value = 0; osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.01);
    } catch { /* priming is best-effort */ }
  }
  if (typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* ignore */ }
  }
}

// Coming back from the background, iOS can hand speechSynthesis back in a
// paused state. speak() then queues silently forever — the app looks like it is
// narrating and says nothing. resume() is a no-op when it is not paused.
function resumeStuckSpeech(): void {
  try {
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  } catch { /* ignore */ }
}

function handleVisibilityChange(): void {
  // A visibility handler that throws takes the rest of the handler chain with
  // it, so the whole body is guarded.
  try {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;

    // Deliberately the module's own reference, NOT getAudioContext(): a
    // visibility event fires outside a user gesture, so a context allocated
    // here would be born suspended and unresumable, and the real gesture would
    // then find one already cached and skip the prime.
    const ctx = sharedCtx;
    if (ctx && ctx.state === 'suspended') {
      let pending: unknown;
      try {
        pending = (ctx as { resume?: () => unknown }).resume?.();
      } catch {
        pending = undefined;
      }
      if (pending && typeof (pending as Promise<void>).then === 'function') {
        // Rejected resume (iOS still wants a gesture) — make the next tap count.
        void (pending as Promise<void>).then(undefined, rearm);
      } else {
        // Old WebKit: resume() is callback-style and returns nothing, or is not
        // there at all. No way to learn whether it worked, so assume not.
        rearm();
      }
    } else if (!unlocked) {
      // Nothing to resume (no context yet, or it is already running) but audio
      // is not primed — make sure a tap can still prime it. Idempotent.
      armGestureListeners();
    }

    resumeStuckSpeech();
  } catch { /* never throw from a visibility handler */ }
}

export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  armGestureListeners();
  if (!visibilityAttached && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityAttached = true;
  }
}

// Exists only so vitest can reset this module's latches between cases — and,
// because the listeners outlive a module reset, detach them too.
export function __resetForTests(): void {
  disarmGestureListeners();
  if (visibilityAttached && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  visibilityAttached = false;
  sharedCtx = null;
  unlocked = false;
  listenersArmed = false;
}

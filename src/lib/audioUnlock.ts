// iOS refuses to play audio (Web Audio AND speechSynthesis) unless it was
// first started INSIDE a user gesture. Before this module the metronome's
// AudioContext was built in a timer callback and speech was first requested
// from a passive effect — so on a real iPhone the app was silent while the
// speaker icon said "unmuted". Prime both inside the first gesture, once.
let sharedCtx: AudioContext | null = null;
let unlocked = false;

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

export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const once = () => unlockAudio();
  for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) {
    window.addEventListener(ev, once, { once: true, capture: true, passive: true });
  }
}

// Exists only so vitest can reset this module's two latches between cases.
export function __resetForTests(): void { sharedCtx = null; unlocked = false; }

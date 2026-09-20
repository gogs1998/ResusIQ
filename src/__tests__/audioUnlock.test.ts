import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAudioContext, unlockAudio, installAudioUnlock, __resetForTests } from '../lib/audioUnlock';

// iOS stays silent unless audio was first started inside a user gesture. These
// tests pin the three halves of that fix: one shared context, a resume() whose
// rejection is swallowed, and a priming oscillator + silent utterance that fire
// exactly once on the first gesture.

/**
 * Minimal Web Audio stub — just enough for the zero-gain priming oscillator and
 * for useMetronome's click. Returns the spies the assertions care about.
 */
function stubAudioContext(
  opts: { state?: string; resume?: (() => unknown) | null } = {}
) {
  const connect = vi.fn();
  const start = vi.fn();
  const stop = vi.fn();
  const createOscillator = vi.fn(() => ({ connect, start, stop, frequency: { value: 0 } }));
  const createGain = vi.fn(() => ({ connect, gain: { value: 1 } }));
  const resume = vi.fn(opts.resume ?? (() => Promise.resolve()));
  const state = opts.state ?? 'suspended';
  // Counts allocations: a visibilitychange must never be the thing that builds
  // a context (it fires outside a gesture, so iOS would hand back a suspended
  // one that can never be resumed, and the real prime would then be skipped).
  const constructed = vi.fn();
  // The live instances, so a case can change `state` the way the OS does —
  // WebKit flips a context to 'interrupted' when another audio session (the
  // 999 call) takes over, and back to 'running' when a resume really works.
  const instances: Array<{ state: string }> = [];
  class Stub {
    state = state;
    currentTime = 0;
    destination = {};
    createOscillator = createOscillator;
    createGain = createGain;
    constructor() {
      constructed();
      instances.push(this as unknown as { state: string });
    }
  }
  // `resume: null` models very old WebKit, which has no resume() at all.
  if (opts.resume !== null) (Stub.prototype as unknown as { resume: unknown }).resume = resume;
  vi.stubGlobal('AudioContext', Stub);
  return { createOscillator, createGain, start, stop, resume, constructed, instances };
}

function stubSpeechSynthesis(opts: { paused?: boolean } = {}) {
  const speak = vi.fn();
  const resume = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, resume, paused: opts.paused ?? false });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    volume = 1;
    constructor(public text: string) {}
  });
  return { speak, resume };
}

/**
 * jsdom's `visibilityState` is a prototype getter; shadow it with an own
 * property so the module under test sees the state this case is about. The
 * shadow is removed in afterEach, not inline, so a failing assertion cannot
 * leave 'visible' pinned for the next case.
 */
function setVisibility(value: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
}

const fireVisibilityChange = (value: 'visible' | 'hidden') => {
  setVisibility(value);
  document.dispatchEvent(new Event('visibilitychange'));
};

// The rejection path re-arms from a .then handler, so the assertions have to
// wait for the microtask queue to drain. A macrotask hop drains it whatever
// the length of the chain.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('audioUnlock', () => {
  beforeEach(() => {
    __resetForTests();
    // Stated, not assumed: jsdom ships no Web Audio, and the first case below
    // depends on that. Deleting here also means a leaked stub from a case that
    // failed mid-way cannot cascade into the next one.
    delete (globalThis as { AudioContext?: unknown }).AudioContext;
  });

  // Teardown lives here rather than at the end of each case: an assertion that
  // throws would skip an inline delete and leak a fake into the next test.
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // Drop the own-property shadow so jsdom's real getter is back in charge.
    delete (document as unknown as { visibilityState?: unknown }).visibilityState;
    __resetForTests();
  });

  it('returns null when AudioContext is unavailable (jsdom)', () => {
    expect(getAudioContext()).toBeNull();
  });

  it('creates one shared context and resumes it when available', () => {
    const { resume } = stubAudioContext({ state: 'suspended' });
    const a = getAudioContext(); const b = getAudioContext();
    expect(a).toBe(b);
    expect(resume).toHaveBeenCalled();
  });

  it('returns null instead of throwing when the constructor fails', () => {
    // iOS throws when it cannot allocate a context. The throw must not escape,
    // or unlockAudio() skips the speech prime below it and narration is dead
    // for the session — the listeners are {once} and never re-arm.
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('NotSupportedError'); } });
    const { speak } = stubSpeechSynthesis();
    expect(() => getAudioContext()).not.toThrow();
    expect(getAudioContext()).toBeNull();
    unlockAudio();
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected resume() rather than leaving it unhandled', async () => {
    // Asserted by spying on the returned promise's own .catch rather than by
    // listening for process 'unhandledRejection': that event does not fire in
    // vitest's threads worker, so it would assert nothing. A recorded .catch
    // call is direct proof a handler was attached.
    const rejection = Promise.reject(new Error('gesture required'));
    const catchSpy = vi.spyOn(rejection, 'catch');
    const { resume } = stubAudioContext({ state: 'suspended', resume: () => rejection });

    const ctx = getAudioContext();
    expect(ctx).not.toBeNull();
    expect(resume).toHaveBeenCalled();
    expect(catchSpy).toHaveBeenCalled();
    // The context is still handed back — it just stays suspended until the next
    // gesture. A rejected resume is not a reason to give up on audio.
    expect(getAudioContext()).toBe(ctx);

    // Settle it so the rejection is retired inside this test either way.
    await rejection.catch(() => {});
  });

  it('does not stack a resume() per call while one is already in flight', async () => {
    // useTimer's playClick calls getAudioContext() on every metronome tick —
    // roughly 110 times a minute through the whole of CPR. After a re-arm the
    // context can sit un-resumed for a while, and without a guard each tick
    // fires another resume() and another swallowed promise.
    const { resume } = stubAudioContext({ state: 'suspended' });

    getAudioContext();
    getAudioContext();
    expect(resume).toHaveBeenCalledTimes(1);

    // ...and the guard clears when the attempt settles, so a later tick can
    // still try again. A guard that latched would be worse than none.
    await flush();
    getAudioContext();
    expect(resume).toHaveBeenCalledTimes(2);
  });

  // The other half of that guard: it must be RELEASED when nothing will ever
  // settle it. Both of these model old WebKit, where resume() is callback-style
  // (returns undefined, so `.catch` on it throws) or simply blows up. The guard
  // is set before the call, so if the synchronous failure path does not clear
  // it, `resumePending` latches true for the life of the page and the metronome
  // never asks for a resume again — silent CPR audio with no error anywhere.
  it('releases the in-flight guard when resume() is not promise-returning', () => {
    const { resume } = stubAudioContext({ state: 'suspended', resume: () => undefined });

    // Deliberately no await between them: the release has to be synchronous,
    // because nothing asynchronous is coming.
    getAudioContext();
    getAudioContext();
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it('releases the in-flight guard when resume() throws', () => {
    const { resume } = stubAudioContext({
      state: 'suspended',
      resume: () => { throw new Error('boom'); },
    });

    expect(() => getAudioContext()).not.toThrow();
    getAudioContext();
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it('a re-arm releases a resume that is still in flight, so the next tap retries', async () => {
    // The nastiest version of the guard latching. The first resume never
    // settles (a real iOS behaviour when the context is interrupted by the 999
    // call), so nothing will ever clear the guard from the promise side. The
    // return to visible then resumes, that attempt RESOLVES while the context
    // stays suspended, and the handler re-arms — handing recovery to the next
    // gesture. If the re-arm does not also release the guard, that gesture's
    // own getAudioContext() skips its resume and the tap primes nothing: the
    // app comes back from the 999 call permanently silent.
    let call = 0;
    const { resume, instances } = stubAudioContext({
      state: 'suspended',
      resume: () => (call++ === 0 ? new Promise<void>(() => {}) : Promise.resolve()),
    });
    stubSpeechSynthesis();

    installAudioUnlock();

    // The in-flight resume that will never settle.
    getAudioContext();
    expect(resume).toHaveBeenCalledTimes(1);

    // Back from the background: resume #2 resolves, but the context is still
    // down, so the handler re-arms rather than believing the resolution.
    fireVisibilityChange('visible');
    await flush();
    expect(resume).toHaveBeenCalledTimes(2);
    expect(instances[0].state).toBe('suspended');

    // The tap that is supposed to bring audio back.
    window.dispatchEvent(new Event('pointerdown'));
    expect(resume).toHaveBeenCalledTimes(3);
  });

  it('unlockAudio primes speechSynthesis with a silent utterance once', () => {
    const { speak } = stubSpeechSynthesis();
    unlockAudio(); unlockAudio();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].volume).toBe(0);
  });

  it('installAudioUnlock primes Web Audio and speech on the first pointerdown only', () => {
    const { createOscillator, start } = stubAudioContext({ state: 'suspended' });
    const { speak } = stubSpeechSynthesis();
    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);
    // The oscillator half is the half that fixes the metronome; without these
    // two assertions this test passes with that half deleted.
    expect(createOscillator).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('removes the sibling once-listeners when the first gesture unlocks', () => {
    // The three gesture listeners are {once}, so each is removed only by its
    // OWN event. A pointerdown leaves a touchend and a keydown still hooked to
    // window for the rest of the session — and once the visibility handler can
    // re-arm, those stale pairs accumulate. The unlock removes its siblings.
    const remove = vi.spyOn(window, 'removeEventListener');
    stubAudioContext({ state: 'suspended' });
    const { speak } = stubSpeechSynthesis();

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('keydown'));

    expect(speak).toHaveBeenCalledTimes(1);
    const removed = remove.mock.calls.map((c) => c[0]);
    expect(removed).toContain('touchend');
    expect(removed).toContain('keydown');
    expect(removed).toContain('pointerdown');
    // The capture flag is part of the identity removeEventListener matches on:
    // the listeners went on with capture:true, so they only come off with
    // capture:true. Removing without it silently does nothing.
    for (const ev of ['pointerdown', 'touchend', 'keydown']) {
      const call = remove.mock.calls.find((c) => c[0] === ev);
      expect(call?.[2], `removeEventListener('${ev}') options`).toEqual({ capture: true });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Backgrounding. Realistic mid-emergency: the same phone dialled 999, so the
// PWA WAS backgrounded and iOS suspended the shared AudioContext. On return the
// narration and the metronome have to work again without another install.

describe('audioUnlock — re-arm after backgrounding', () => {
  beforeEach(() => {
    __resetForTests();
    delete (globalThis as { AudioContext?: unknown }).AudioContext;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (document as unknown as { visibilityState?: unknown }).visibilityState;
    __resetForTests();
  });

  it('resumes the suspended shared context when the page comes back', async () => {
    const { resume } = stubAudioContext({ state: 'suspended' });
    stubSpeechSynthesis();

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown')); // now a context exists
    const before = resume.mock.calls.length;

    fireVisibilityChange('visible');
    await flush();

    expect(resume.mock.calls.length - before).toBe(1);
  });

  it("resumes a context WebKit has parked as 'interrupted'", async () => {
    // Safari does not suspend a context that another audio session took over —
    // it INTERRUPTS it, and reports `state === 'interrupted'`, a WebKit-only
    // value that is not in the spec's AudioContextState. The 999 call placed on
    // this same phone is exactly that other session. Gating on 'suspended'
    // alone leaves the context interrupted for the rest of the resuscitation:
    // no metronome, no narration, and nothing on screen saying so.
    const { resume, instances } = stubAudioContext({ state: 'suspended' });
    stubSpeechSynthesis();

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown')); // now a context exists
    instances[0].state = 'interrupted';
    const before = resume.mock.calls.length;

    fireVisibilityChange('visible');
    await flush();

    expect(resume.mock.calls.length - before).toBe(1);
  });

  it('re-arms when resume() RESOLVES but the state stays suspended', async () => {
    // The common iOS case, and the reason Howler and Tone.js poll state rather
    // than trust the promise: outside a gesture, resume() resolves and the
    // context stays suspended. Keying the re-arm off rejection alone leaves
    // `unlocked` latched and the listeners detached — the next tap primes
    // nothing and the app is silent for the rest of the emergency.
    stubAudioContext({ state: 'suspended', resume: () => Promise.resolve() });
    const { speak } = stubSpeechSynthesis();

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);

    fireVisibilityChange('visible');
    await flush();

    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-arm when the resume actually worked', async () => {
    // The other half of the same decision: a resume that really started the
    // context must not throw away the prime and re-hook three listeners.
    const stub = stubAudioContext({ state: 'suspended' });
    stub.resume.mockImplementation(() => {
      stub.instances[0].state = 'running';
      return Promise.resolve();
    });
    const { speak } = stubSpeechSynthesis();

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);

    fireVisibilityChange('visible');
    await flush();

    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('re-arms the gesture unlock when the resume is rejected', async () => {
    // iOS can refuse resume() outside a gesture even on a visible page. Then
    // the ONLY thing that will start audio again is the next tap — so the
    // gesture listeners must be back and `unlocked` must be cleared, or the
    // app is permanently silent for the rest of the emergency.
    stubAudioContext({ state: 'suspended', resume: () => Promise.reject(new Error('gesture required')) });
    const { speak } = stubSpeechSynthesis();

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);

    fireVisibilityChange('visible');
    await flush();

    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('installs exactly one visibility listener and three gesture listeners, however often it is called', () => {
    const onWindow = vi.spyOn(window, 'addEventListener');
    const onDocument = vi.spyOn(document, 'addEventListener');

    installAudioUnlock();
    installAudioUnlock();

    const gestures = onWindow.mock.calls.filter((c) =>
      ['pointerdown', 'touchend', 'keydown'].includes(c[0] as string)
    );
    expect(gestures.map((c) => c[0]).sort()).toEqual(['keydown', 'pointerdown', 'touchend']);
    expect(
      onDocument.mock.calls.filter((c) => c[0] === 'visibilitychange')
    ).toHaveLength(1);
  });

  // Deliberately no speechSynthesis.cancel() on the way out. It is tempting —
  // it would stop a queued instruction being read to an empty room — but it
  // throws away a HALF-SPOKEN instruction, and the operator comes back to a
  // step they have only heard the first three words of. A stutter on return is
  // the better failure mid-emergency.
  it('does nothing at all when the page is going hidden', async () => {
    const { resume, constructed } = stubAudioContext({ state: 'suspended' });
    const { resume: speechResume } = stubSpeechSynthesis({ paused: true });

    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    const before = resume.mock.calls.length;
    const built = constructed.mock.calls.length;

    fireVisibilityChange('hidden');
    await flush();

    expect(resume.mock.calls.length).toBe(before);
    expect(constructed.mock.calls.length).toBe(built);
    expect(speechResume).not.toHaveBeenCalled();
  });

  it('never allocates a context from a visibility event', async () => {
    // Nobody has tapped yet, so there is nothing to resume. Building one here
    // would build it OUTSIDE a gesture — suspended and unresumable — and
    // getAudioContext() would then hand that dead context to the metronome.
    const { constructed, resume } = stubAudioContext({ state: 'suspended' });
    stubSpeechSynthesis();

    installAudioUnlock();
    fireVisibilityChange('visible');
    await flush();

    expect(constructed).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  it('re-arms rather than trusting a resume() that returns no promise', async () => {
    // Old WebKit's resume() takes a callback and returns undefined, so there is
    // no way to learn whether it worked. Treat that as "assume not".
    stubAudioContext({ state: 'suspended', resume: () => undefined });
    const { speak } = stubSpeechSynthesis();

    installAudioUnlock();
    expect(() => window.dispatchEvent(new Event('pointerdown'))).not.toThrow();
    expect(speak).toHaveBeenCalledTimes(1);

    expect(() => fireVisibilityChange('visible')).not.toThrow();
    await flush();

    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('survives a context with no resume() at all', async () => {
    stubAudioContext({ state: 'suspended', resume: null });
    const { speak } = stubSpeechSynthesis();

    expect(() => getAudioContext()).not.toThrow();
    expect(() => unlockAudio()).not.toThrow();
    // The speech prime is the half that still works on such a device; it must
    // not be skipped by a throw from the Web Audio half above it.
    expect(speak).toHaveBeenCalledTimes(1);

    installAudioUnlock();
    expect(() => fireVisibilityChange('visible')).not.toThrow();
    await flush();

    // Not-throwing is not enough: with no way to resume, the ONLY recovery is
    // the next tap, so that path has to have re-armed.
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(2);
  });

  // A known iOS quirk: coming back from the background, the speech queue can be
  // wedged and speak() then queues silently forever. `paused` is not a reliable
  // report of that — the queue wedges with `paused === false` too — so the
  // resume is unconditional. It is a spec no-op when there is nothing paused,
  // which makes the false case free rather than wrong.
  for (const paused of [true, false]) {
    it(`calls speechSynthesis.resume() on return to visible (paused === ${paused})`, async () => {
      stubAudioContext({ state: 'running' });
      const { resume: speechResume } = stubSpeechSynthesis({ paused });

      installAudioUnlock();
      window.dispatchEvent(new Event('pointerdown'));
      fireVisibilityChange('visible');
      await flush();

      expect(speechResume).toHaveBeenCalled();
    });
  }
});

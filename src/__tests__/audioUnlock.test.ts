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
function stubAudioContext(opts: { state?: string; resume?: () => Promise<void> } = {}) {
  const connect = vi.fn();
  const start = vi.fn();
  const stop = vi.fn();
  const createOscillator = vi.fn(() => ({ connect, start, stop, frequency: { value: 0 } }));
  const createGain = vi.fn(() => ({ connect, gain: { value: 1 } }));
  const resume = vi.fn(opts.resume ?? (() => Promise.resolve()));
  const state = opts.state ?? 'suspended';
  vi.stubGlobal('AudioContext', class {
    state = state;
    currentTime = 0;
    destination = {};
    resume = resume;
    createOscillator = createOscillator;
    createGain = createGain;
  });
  return { createOscillator, createGain, start, stop, resume };
}

function stubSpeechSynthesis() {
  const speak = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    volume = 1;
    constructor(public text: string) {}
  });
  return { speak };
}

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
});

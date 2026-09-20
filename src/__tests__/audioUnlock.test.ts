import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAudioContext, unlockAudio, installAudioUnlock, __resetForTests } from '../lib/audioUnlock';

describe('audioUnlock', () => {
  beforeEach(() => __resetForTests());
  it('returns null when AudioContext is unavailable (jsdom)', () => {
    expect(getAudioContext()).toBeNull();
  });
  it('creates one shared context and resumes it when available', () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).AudioContext = class { state = 'suspended'; resume = resume; };
    const a = getAudioContext(); const b = getAudioContext();
    expect(a).toBe(b);
    expect(resume).toHaveBeenCalled();
    delete (globalThis as any).AudioContext;
  });
  it('unlockAudio primes speechSynthesis with a silent utterance once', () => {
    const speak = vi.fn();
    (globalThis as any).speechSynthesis = { speak };
    (globalThis as any).SpeechSynthesisUtterance = class { volume = 1; constructor(public text: string) {} };
    unlockAudio(); unlockAudio();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].volume).toBe(0);
    delete (globalThis as any).speechSynthesis; delete (globalThis as any).SpeechSynthesisUtterance;
  });
  it('installAudioUnlock unlocks on the first pointerdown only', () => {
    const speak = vi.fn();
    (globalThis as any).speechSynthesis = { speak };
    (globalThis as any).SpeechSynthesisUtterance = class { volume = 1; constructor(public text: string) {} };
    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);
    delete (globalThis as any).speechSynthesis; delete (globalThis as any).SpeechSynthesisUtterance;
  });
});

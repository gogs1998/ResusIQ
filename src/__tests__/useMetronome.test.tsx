import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useMetronome } from '../hooks/useTimer';
import { getAudioContext, __resetForTests } from '../lib/audioUnlock';

// The metronome borrows the shared, gesture-unlocked AudioContext from
// lib/audioUnlock instead of building its own. It used to close() its context
// on unmount — harmless when the context was its own, fatal now: the first exit
// from CPR mode would close the app-wide context and silence every later click
// and every later utterance for the rest of the session.
//
// CPRMode.test.tsx mocks useMetronome wholesale, so this is the only test that
// runs the real hook's lifecycle.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

function stubRunningAudioContext(state = 'running') {
  const connect = vi.fn();
  const start = vi.fn();
  const stop = vi.fn();
  const setValueAtTime = vi.fn();
  const exponentialRampToValueAtTime = vi.fn();
  const close = vi.fn();
  const resume = vi.fn(() => Promise.resolve());
  const createOscillator = vi.fn(() => ({
    connect, start, stop, frequency: { value: 0 }, type: 'sine',
  }));
  const createGain = vi.fn(() => ({
    connect,
    gain: { value: 0, setValueAtTime, exponentialRampToValueAtTime },
  }));
  vi.stubGlobal('AudioContext', class {
    state = state;
    currentTime = 0;
    destination = {};
    resume = resume;
    close = close;
    createOscillator = createOscillator;
    createGain = createGain;
  });
  return { createOscillator, start, close };
}

function Metronome({ onReady }: { onReady: (start: () => void) => void }) {
  const { start } = useMetronome({ bpm: 110 });
  onReady(start);
  return null;
}

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  __resetForTests();
  // No real 110bpm interval racing the assertions.
  vi.useFakeTimers();
});

afterEach(() => {
  if (root) {
    const mounted = root;
    root = null;
    act(() => mounted.unmount());
    container.remove();
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useMetronome shared-context lifecycle', () => {
  it('never closes the shared context on unmount', () => {
    const { createOscillator, start: oscStart, close } = stubRunningAudioContext();
    const shared = getAudioContext();
    expect(shared).not.toBeNull();

    let startMetronome: (() => void) | null = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<Metronome onReady={(s) => { startMetronome = s; }} />);
    });

    act(() => { startMetronome!(); });
    // The first beat plays immediately, on the shared context.
    expect(createOscillator).toHaveBeenCalled();
    expect(oscStart).toHaveBeenCalled();

    const mounted = root!;
    root = null;
    act(() => mounted.unmount());
    container.remove();

    expect(close).not.toHaveBeenCalled();
    // Still the same live instance — not closed, not rebuilt.
    expect(getAudioContext()).toBe(shared);
  });

  it('does not start oscillators into a context that is not running', () => {
    // After the 999 call the shared context comes back suspended or (on
    // WebKit) interrupted. getAudioContext() has already asked it to resume,
    // but that is asynchronous — and a node started into a context that is not
    // running is never heard and never collected, so a 110bpm metronome leaks
    // two nodes a beat for as long as it stays down. Skip the beat instead;
    // the next tick, 545ms later, clicks.
    const { createOscillator, start: oscStart } = stubRunningAudioContext('suspended');

    let startMetronome: (() => void) | null = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<Metronome onReady={(s) => { startMetronome = s; }} />);
    });

    act(() => { startMetronome!(); });

    expect(createOscillator).not.toHaveBeenCalled();
    expect(oscStart).not.toHaveBeenCalled();
  });
});

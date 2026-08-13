import { describe, it, expect, beforeEach, beforeAll, vi, afterEach, afterAll } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CPRMode } from '../components/CPRMode';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import type { ProtocolStep } from '../types';

// F10 / clinical ruling R5. Two things about the CPR screen:
//
//   1. The X ended the emergency on one tap — during compressions, with the
//      event log open. It now asks, and the metronome must keep running
//      audibly while it asks, because the question is not a reason to stop
//      pacing compressions.
//   2. The dispatcher script and the running log were reachable everywhere
//      EXCEPT here, where a second rescuer most needs them.

// The metronome is mocked so the test can assert the ONE thing that would be
// invisible otherwise: that showing the confirmation never stops it. Everything
// else — layout, the deck, the end path — runs for real.
const { stopSpy, startSpy } = vi.hoisted(() => ({ stopSpy: vi.fn(), startSpy: vi.fn() }));

vi.mock('../hooks/useTimer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useTimer')>();
  return {
    ...actual,
    useMetronome: () => ({
      isPlaying: true,
      beatCount: 12,
      start: startSpy,
      stop: stopSpy,
      toggle: vi.fn(),
      compressionNumber: 12,
      cycleNumber: 1,
    }),
  };
});

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
  });
});

let container: HTMLDivElement;
let root: Root | null = null;
let onEnd: ReturnType<typeof vi.fn>;
let onNext: ReturnType<typeof vi.fn>;

const cprStep = protocols
  .find((p) => p.id === 'cardiac_arrest')!
  .steps.find((s) => s.type === 'cpr_mode') as ProtocolStep;

const render = () => {
  onEnd = vi.fn();
  onNext = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<CPRMode step={cprStep} onNext={onNext} onEnd={onEnd} />);
  });
};

// Idempotent, and run again after every test: a failing assertion skips the
// explicit call at the end of a case, and a leaked root keeps this component's
// 1s clock interval ticking into the next one.
const unmount = () => {
  if (!root) return;
  const mounted = root;
  root = null;
  act(() => mounted.unmount());
  container.remove();
};

afterEach(unmount);

// The speech stub is this file's, not the suite's — hand the global back so it
// cannot leak into a file that means to assert on the real absence of a speech
// stack.
afterAll(() => {
  vi.unstubAllGlobals();
});

const buttonWithText = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text));

const buttonWithLabel = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

const endConfirm = () => container.querySelector('[data-end-confirm]');

describe('CPRMode end confirmation', () => {
  beforeEach(() => {
    stopSpy.mockClear();
    startSpy.mockClear();
    useAppStore.setState({
      isEmergencyActive: false,
      activeProtocol: null,
      currentStepIndex: 0,
      activeEvent: null,
      eventHistory: [],
      currentScreen: 'home',
      isMuted: true,
    });
    useAppStore.getState().startEmergency('cardiac_arrest');
  });

  it('the X asks instead of ending, in the prescribed words', () => {
    render();
    expect(endConfirm()).toBeNull();

    act(() => buttonWithLabel('End emergency')!.click());

    expect(onEnd).not.toHaveBeenCalled();
    const bar = endConfirm();
    expect(bar).not.toBeNull();
    expect(bar!.textContent).toContain('End the emergency?');
    expect(bar!.textContent).toContain('CPR guidance will stop and the event log will close.');
    expect(buttonWithText('Keep going')).toBeDefined();
    expect(buttonWithText('End emergency')).toBeDefined();

    unmount();
  });

  it('showing the confirmation does NOT stop the metronome', () => {
    // The clinical requirement in R5: compressions keep their pace, and their
    // sound, while the question is on screen.
    render();
    act(() => buttonWithLabel('End emergency')!.click());

    expect(stopSpy).not.toHaveBeenCalled();
    // The pacing display is still there to compress against.
    expect(container.textContent).toContain('of 30');

    unmount();
  });

  it('"Keep going" dismisses and the emergency continues', () => {
    render();
    act(() => buttonWithLabel('End emergency')!.click());
    act(() => buttonWithText('Keep going')!.click());

    expect(endConfirm()).toBeNull();
    expect(onEnd).not.toHaveBeenCalled();
    expect(stopSpy).not.toHaveBeenCalled();
    expect(buttonWithLabel('End emergency')).not.toBeNull();

    unmount();
  });

  it('"End emergency" is what actually ends it', () => {
    render();
    act(() => buttonWithLabel('End emergency')!.click());
    act(() => buttonWithText('End emergency')!.click());

    expect(onEnd).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('reaching for anything else dismisses the confirmation', () => {
    render();
    act(() => buttonWithLabel('End emergency')!.click());
    expect(endConfirm()).not.toBeNull();

    act(() => buttonWithText('AED ready')!.click());

    expect(endConfirm()).toBeNull();
    expect(onEnd).not.toHaveBeenCalled();

    unmount();
  });

  it('signs of life is not routed through the end confirmation', () => {
    // ROSC hands the patient onward with the log still open — it is not an end.
    render();
    act(() => buttonWithText('Signs of life?')!.click());

    expect(endConfirm()).toBeNull();
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
    expect(
      useAppStore.getState().activeEvent!.events.some((e) => e.type === 'rosc')
    ).toBe(true);

    unmount();
  });
});

describe('CPRMode deck', () => {
  beforeEach(() => {
    stopSpy.mockClear();
    useAppStore.setState({
      isEmergencyActive: false,
      activeProtocol: null,
      currentStepIndex: 0,
      activeEvent: null,
      eventHistory: [],
      currentScreen: 'home',
      isMuted: true,
    });
    useAppStore.getState().startEmergency('cardiac_arrest');
  });

  it('is mounted and collapsed, with the 999 script one tap away', () => {
    render();

    const scriptTab = buttonWithText('999 script');
    expect(scriptTab).toBeDefined();
    expect(container.querySelector('#console-deck-panel')).toBeNull();

    act(() => scriptTab!.click());
    expect(container.querySelector('#console-deck-panel')).not.toBeNull();

    unmount();
  });

  it('expanding it never covers the compression counter', () => {
    // The clinical constraint (R5): the deck may shrink what is above it, but it
    // must not overlay the pacing display or intercept a tap meant for it. That
    // holds only while the panel stays in normal flow — an absolutely positioned
    // or fixed ancestor would break it silently.
    render();
    act(() => buttonWithText('999 script')!.click());

    const panel = container.querySelector<HTMLElement>('#console-deck-panel')!;
    for (let el: HTMLElement | null = panel; el && el !== container; el = el.parentElement) {
      expect(['', 'static', 'relative'], `${el.tagName} position`).toContain(el.style.position);
    }

    // The counter is still rendered, and still above the deck in document order.
    expect(container.textContent).toContain('of 30');
    const main = container.querySelector('main')!;
    expect(main.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    unmount();
  });

  it('opening the deck does not stop the metronome', () => {
    render();
    act(() => buttonWithText('Log')!.click());
    expect(stopSpy).not.toHaveBeenCalled();

    unmount();
  });
});

import { describe, it, expect, beforeEach, beforeAll, vi, afterEach, afterAll } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore } from '../store/appStore';

// F10 / clinical ruling R5, runner half. On step 0 the corner control is an X,
// not a back arrow: it closes the event log and drops the team on the home
// screen mid-emergency. One tap was enough to do that.

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
  // Unmuting makes the runner narrate the step; jsdom has no utterance class.
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
  );
});

let container: HTMLDivElement;
let root: Root | null = null;

const render = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<ProtocolRunner />);
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

describe('ProtocolRunner end confirmation', () => {
  beforeEach(() => {
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

  it('the step-0 X asks instead of ending, in the prescribed words', () => {
    render();

    act(() => buttonWithLabel('End emergency')!.click());

    const bar = endConfirm();
    expect(bar).not.toBeNull();
    expect(bar!.textContent).toContain('End the emergency?');
    expect(bar!.textContent).toContain('Guidance will stop and the event log will close.');
    // The emergency is untouched until they answer.
    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(true);
    expect(s.activeEvent).not.toBeNull();

    unmount();
  });

  it('"Keep going" leaves the emergency running on the same step', () => {
    render();
    act(() => buttonWithLabel('End emergency')!.click());
    act(() => buttonWithText('Keep going')!.click());

    const s = useAppStore.getState();
    expect(endConfirm()).toBeNull();
    expect(s.isEmergencyActive).toBe(true);
    expect(s.currentStepIndex).toBe(0);
    expect(buttonWithLabel('End emergency')).not.toBeNull();

    unmount();
  });

  it('"End emergency" ends it and files the event', () => {
    render();
    act(() => buttonWithLabel('End emergency')!.click());
    act(() => buttonWithText('End emergency')!.click());

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeEvent).toBeNull();
    expect(s.eventHistory).toHaveLength(1);
    expect(s.eventHistory[0].completed).toBe(true);

    unmount();
  });

  it('reaching for anything else dismisses the confirmation', () => {
    render();
    act(() => buttonWithLabel('End emergency')!.click());
    expect(endConfirm()).not.toBeNull();

    act(() => buttonWithLabel('Unmute voice')!.click());

    expect(endConfirm()).toBeNull();
    expect(useAppStore.getState().isEmergencyActive).toBe(true);

    unmount();
  });

  it('past step 0 the corner control is still plain Back — no confirmation', () => {
    act(() => useAppStore.getState().goToStep(1));
    render();

    expect(buttonWithLabel('End emergency')).toBeNull();
    act(() => buttonWithLabel('Previous step')!.click());

    expect(endConfirm()).toBeNull();
    expect(useAppStore.getState().currentStepIndex).toBe(0);
    expect(useAppStore.getState().isEmergencyActive).toBe(true);

    unmount();
  });
});

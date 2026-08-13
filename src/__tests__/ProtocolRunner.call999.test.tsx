import { describe, it, expect, beforeEach, beforeAll, vi, afterEach, afterAll } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { CALL_999_CONFIRM_STEPS } from '../lib/call999';

// F4 / clinical ruling R2: a "Call 999 now" step used to log the call the moment
// anyone tapped "Done — next step", so the timer strip went green while the team
// was still looking for a phone. The footer now asks, and BOTH answers advance —
// treatment must never gate behind asserting a phone call.

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

const calls999 = () =>
  useAppStore.getState().activeEvent!.events.filter((e) => e.type === '999_called');

/** Start `protocolId` sitting on `stepId`, with the runner mounted. */
const openStep = (protocolId: string, stepId: string) => {
  const protocol = protocols.find((p) => p.id === protocolId)!;
  const index = protocol.steps.findIndex((s) => s.id === stepId);
  expect(index, `${protocolId}.${stepId}`).toBeGreaterThan(-1);
  useAppStore.getState().startEmergency(protocolId);
  act(() => useAppStore.getState().goToStep(index));
  render();
  return { protocol, index };
};

describe('ProtocolRunner 999 confirm footer', () => {
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
  });

  it('offers both answers — and no generic Done — on every listed 999 step', () => {
    for (const { protocol: protocolId, step: stepId } of CALL_999_CONFIRM_STEPS) {
      openStep(protocolId, stepId);

      expect(buttonWithText('999 called — continue'), `${protocolId}.${stepId}`).toBeDefined();
      expect(buttonWithText('Not yet — continue anyway'), `${protocolId}.${stepId}`).toBeDefined();
      expect(buttonWithText('Done — next step'), `${protocolId}.${stepId}`).toBeUndefined();

      unmount();
    }
  });

  it('"999 called" records the call once and advances', () => {
    const { protocol, index } = openStep('stroke', 'time_call');

    act(() => buttonWithText('999 called — continue')!.click());

    expect(calls999().length).toBe(1);
    expect(calls999()[0].label).toBe('999 called');
    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe(
      protocol.steps[index].next
    );

    unmount();
  });

  it('"Not yet" advances and records NOTHING about a call', () => {
    const { protocol, index } = openStep('anaphylaxis', 'call_help');

    act(() => buttonWithText('Not yet — continue anyway')!.click());

    expect(calls999().length).toBe(0);
    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe(
      protocol.steps[index].next
    );

    unmount();
  });

  it('a double-tap on the confirm still records ONE call and ONE step', () => {
    openStep('chest_pain', 'call_999_chest');

    const confirm = buttonWithText('999 called — continue')!;
    act(() => {
      confirm.click();
      confirm.click();
    });

    expect(calls999().length).toBe(1);
    expect(
      useAppStore.getState().activeEvent!.events.filter((e) => e.type === 'step_completed').length
    ).toBe(1);

    unmount();
  });

  it('dialling from the pill first, then confirming, is still one call', () => {
    openStep('adrenal_crisis', 'call_999_adrenal');

    // The pill is an anchor (tel:999), not a button.
    const pill = [...container.querySelectorAll('a')].find((a) => a.getAttribute('href') === 'tel:999');
    expect(pill).toBeDefined();
    act(() => pill!.click());
    expect(calls999().length).toBe(1);

    act(() => buttonWithText('999 called — continue')!.click());

    expect(calls999().length).toBe(1);

    unmount();
  });

  it('still records the call when the step is reached a second time, via Back', () => {
    // The confirm shares the runner's one-gesture barrier, which used to key on
    // position and never release — so a step revisited by Back had every control
    // on it dead, this one included. Here the team moves on without asserting a
    // call, comes back because the call has now been made, and confirms it.
    const { protocol, index } = openStep('stroke', 'time_call');

    act(() => buttonWithText('Not yet — continue anyway')!.click());
    expect(calls999().length).toBe(0);

    act(() => useAppStore.getState().prevStep());
    expect(useAppStore.getState().currentStepIndex).toBe(index);

    act(() => buttonWithText('999 called — continue')!.click());

    expect(calls999().length).toBe(1);
    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe(
      protocol.steps[index].next
    );

    unmount();
  });

  it('an ordinary step keeps its generic Done', () => {
    openStep('stroke', 'record_time');

    expect(buttonWithText('Done — next step')).toBeDefined();
    expect(buttonWithText('999 called — continue')).toBeUndefined();

    unmount();
  });
});

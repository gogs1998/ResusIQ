import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { HOLDING_STEPS, TERMINAL_LINES } from '../lib/terminalSteps';

// Three protocols do not end — they circle. An instruction ("stay with them")
// routes to a deterioration decision, and the "still responding" answer routes
// straight back. The team can sit here for twenty minutes.
//
// Those screens used to show "Done — next step", which is a lie: the next step
// is a re-check, not progress. They also offered no way out — `canEndFromHere`
// was false, so the one screen a team actually holds on was the one screen they
// could not close the record from. And each pass round the loop logged
// `step_completed` TWICE: once for the instruction, once for the decision
// answer, so the medico-legal record counted double for standing still.
//
// What this file pins: the honest line, a "Check again" primary that goes to
// the re-check, the end affordance, the deterioration escapes (rail + 999), and
// exactly ONE step_completed per lap.

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
    root!.render(<ProtocolRunner />);
  });
};

const unmount = () => {
  if (!root) return;
  const mounted = root;
  root = null;
  act(() => mounted.unmount());
  container.remove();
};

afterEach(unmount);
afterAll(() => vi.unstubAllGlobals());

const buttonWithText = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text));

const openStep = (protocolId: string, stepId: string) => {
  const protocol = protocols.find((p) => p.id === protocolId)!;
  const index = protocol.steps.findIndex((s) => s.id === stepId);
  expect(index, `${protocolId}.${stepId}`).toBeGreaterThan(-1);
  useAppStore.getState().startEmergency(protocolId);
  act(() => useAppStore.getState().goToStep(index));
  render();
};

const reset = () =>
  useAppStore.setState({
    isEmergencyActive: false,
    activeProtocol: null,
    currentStepIndex: 0,
    activeEvent: null,
    eventHistory: [],
    currentScreen: 'home',
    isMuted: true,
    timerAnchors: {},
  });

const completedCount = () =>
  useAppStore.getState().activeEvent!.events.filter((e) => e.type === 'step_completed').length;

const currentStepId = () => {
  const s = useAppStore.getState();
  return s.activeProtocol!.steps[s.currentStepIndex].id;
};

describe('holding steps', () => {
  beforeEach(reset);

  it('says what the screen is for instead of promising progress', () => {
    for (const key of HOLDING_STEPS) {
      const [protocolId, stepId] = key.split('#');
      openStep(protocolId, stepId);

      expect(container.textContent, key).toContain(TERMINAL_LINES.holding);
      expect(buttonWithText('Check again'), key).toBeDefined();
      // The lie, and its hard-block twin.
      expect(buttonWithText('Done — next step'), key).toBeUndefined();
      expect(buttonWithText('Next step'), key).toBeUndefined();
      // The whole point: a team holding a patient can close the record here.
      expect(buttonWithText('End emergency'), key).toBeDefined();

      unmount();
      reset();
    }
  });

  it('keeps the escape rail and the 999 pill on every one of them', () => {
    // Same blocking requirement as the terminal steps: these are the screens
    // where deterioration happens, and the loop's own decision asks about it.
    for (const key of HOLDING_STEPS) {
      const [protocolId, stepId] = key.split('#');
      openStep(protocolId, stepId);

      const rail = container.querySelector(
        'button[aria-label="Patient unresponsive and not breathing — switch to CPR now"]'
      );
      expect(rail, `${key} lost the escape rail`).not.toBeNull();
      const pill = [...container.querySelectorAll('a')].find(
        (a) => a.getAttribute('href') === 'tel:999'
      );
      expect(pill, `${key} lost the 999 pill`).toBeDefined();

      unmount();
      reset();
    }
  });

  it('ending from a holding step goes through the confirmation', () => {
    for (const key of HOLDING_STEPS) {
      const [protocolId, stepId] = key.split('#');
      openStep(protocolId, stepId);

      act(() => buttonWithText('End emergency')!.click());

      expect(container.querySelector('[data-end-confirm]'), key).not.toBeNull();
      expect(useAppStore.getState().isEmergencyActive, key).toBe(true);

      unmount();
      reset();
    }
  });

  it('one lap of the loop writes exactly one step_completed', () => {
    for (const key of HOLDING_STEPS) {
      const [protocolId, stepId] = key.split('#');
      const protocol = protocols.find((p) => p.id === protocolId)!;
      const holding = protocol.steps.find((s) => s.id === stepId)!;
      const check = protocol.steps.find((s) => s.id === holding.next)!;
      const loopBack = (check.answers ?? []).find((a) => a.next === stepId)!;

      openStep(protocolId, stepId);
      const before = completedCount();

      // Check again is navigation, not completion: the instruction is not done,
      // the team just looked again.
      act(() => buttonWithText('Check again')!.click());
      expect(currentStepId(), key).toBe(check.id);
      expect(completedCount(), `${key}: Check again logged a completion`).toBe(before);

      // The decision answer IS the event, and it is logged by chooseAnswer.
      // The runner splits "Yes — still with you" across two spans, so match on
      // the distinguishing half rather than the raw label.
      const [main, ...rest] = loopBack.label.split(' — ');
      act(() => buttonWithText(rest.join(' — ') || main)!.click());
      expect(currentStepId(), key).toBe(stepId);
      expect(completedCount(), `${key}: lap did not log exactly once`).toBe(before + 1);

      unmount();
      reset();
    }
  });

  it('a double-tap on "Check again" navigates once', () => {
    // Same frame, no render between the two clicks — the case a click-then-
    // assert test would miss.
    const protocol = protocols.find((p) => p.id === 'chest_pain')!;
    openStep('chest_pain', 'monitor_chest');
    const before = completedCount();

    act(() => {
      const again = buttonWithText('Check again')!;
      again.click();
      again.click();
    });

    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe('deterioration_check');
    expect(completedCount()).toBe(before);
    // ...and it really is one hop, not two that happened to land here.
    expect(protocol.steps.find((s) => s.id === 'monitor_chest')!.next).toBe('deterioration_check');
  });
});

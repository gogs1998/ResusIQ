import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { TERMINAL_STEPS, TERMINAL_LINES, terminalGroup } from '../lib/terminalSteps';

// The 14 steps where the guidance ends. They rendered "Done — next step" like
// every other screen, and the runner's array-order fallback then walked the
// operator into an unrelated step: on seizure.monitor_seizure, into "Seizure
// stopped — recovery position". The app asserted the seizure had stopped
// because someone tapped a button that promised a next step.
//
// The clinical ruling's BLOCKING requirement is the second half of this file:
// removing the CTA must not remove the escape rail or the 999 pill. These are
// the longest-dwell screens in the app and precisely where deterioration
// happens — asthma.reassess_severe's own text says "If they become
// unresponsive, start CPR".

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

describe('terminal steps', () => {
  beforeEach(reset);

  it('every one of the 14 offers no next step, and says so', () => {
    for (const key of Object.keys(TERMINAL_STEPS)) {
      const [protocolId, stepId] = key.split('#');
      openStep(protocolId, stepId);

      expect(buttonWithText('Done — next step'), key).toBeUndefined();
      expect(buttonWithText('Next step'), key).toBeUndefined();
      expect(container.textContent, key).toContain(TERMINAL_LINES[terminalGroup(protocolId, stepId)!]);
      expect(buttonWithText('End emergency'), key).toBeDefined();

      unmount();
      reset();
    }
  });

  it('keeps the escape rail and the 999 pill on every one of them', () => {
    // BLOCKING clinical requirement. These are hold-and-watch screens; losing
    // the deterioration escape here would be worse than the dead CTA was.
    for (const key of Object.keys(TERMINAL_STEPS)) {
      const [protocolId, stepId] = key.split('#');
      openStep(protocolId, stepId);

      const rail = container.querySelector(
        'button[aria-label="Patient unresponsive and not breathing — switch to CPR now"]'
      );
      // cardiac_arrest hides the rail by design — it IS the arrest protocol.
      if (protocolId !== 'cardiac_arrest') {
        expect(rail, `${key} lost the escape rail`).not.toBeNull();
      }
      const pill = [...container.querySelectorAll('a')].find((a) => a.getAttribute('href') === 'tel:999');
      expect(pill, `${key} lost the 999 pill`).toBeDefined();

      unmount();
      reset();
    }
  });

  it('the two groups say different things', () => {
    openStep('seizure', 'monitor_seizure');
    expect(container.textContent).toContain('stay with them until the crew take over');
    unmount();
    reset();

    openStep('stroke', 'not_stroke');
    expect(container.textContent).toContain('this guide is complete');
  });

  it('ending from a terminal step goes through the confirmation', () => {
    openStep('choking', 'choking_resolved');

    act(() => buttonWithText('End emergency')!.click());

    // The bar, not an immediate exit.
    expect(container.querySelector('[data-end-confirm]')).not.toBeNull();
    expect(useAppStore.getState().isEmergencyActive).toBe(true);

    act(() => buttonWithText('Keep going')!.click());
    expect(useAppStore.getState().isEmergencyActive).toBe(true);
  });

  it('a step that still has somewhere to go keeps its CTA', () => {
    openStep('stroke', 'record_time');
    expect(buttonWithText('Done — next step')).toBeDefined();
    expect(container.textContent).not.toContain('No further steps');
  });
});

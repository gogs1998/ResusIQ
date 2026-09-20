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
// the re-check, the end affordance, the deterioration escapes (rail + 999),
// exactly ONE step_completed per lap — and the hands-free path, which reaches
// the same handler as the footer CTA and must behave the same way.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// The first voice tests in the repo. useVoiceCommands owns a live
// SpeechRecognition instance that jsdom has no implementation of, so it is
// replaced with a capture of the handler the runner hands it; calling that
// handler is precisely what recognition.onresult does with a transcript.
// useSpeech itself stays real, so the render path is unchanged.
const voice = vi.hoisted(() => ({ say: null as ((command: string) => void) | null }));

vi.mock('../hooks/useSpeech', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useSpeech')>();
  return {
    ...actual,
    useVoiceCommands: (onCommand: (command: string) => void) => {
      voice.say = onCommand;
      return {
        isListening: false,
        startListening: () => {},
        stopListening: () => {},
        error: null,
      };
    },
  };
});

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

// The component reads goToStep out of the store at render, so a vi.spyOn on the
// getState() snapshot would not be the function it calls. One test replaces the
// store's own action with a wrapper; this hands the real one back afterwards so
// it cannot leak into the next test.
const realGoToStep = useAppStore.getState().goToStep;

afterEach(() => {
  unmount();
  useAppStore.setState({ goToStep: realGoToStep });
});
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
      // Pinned literally as well: asserting only against the constant is a
      // tautology — rewording it to "Done — next step." would leave this green.
      expect(container.textContent, key).toContain('check them again regularly');
      // And it must not make the terminal steps' claim: there IS a further step.
      expect(container.textContent, key).not.toContain('No further steps');
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
    //
    // Asserting only the landing step cannot fail: two hops to the same target
    // are indistinguishable from one, so checkAgain looks idempotent even with
    // runOnce removed. The store's goToStep is wrapped instead, and the barrier
    // is judged on the CALL COUNT.
    const protocol = protocols.find((p) => p.id === 'chest_pain')!;
    const spy = vi.fn(realGoToStep);
    useAppStore.setState({ goToStep: spy });

    openStep('chest_pain', 'monitor_chest');
    const before = completedCount();
    spy.mockClear(); // openStep navigates too.

    act(() => {
      const again = buttonWithText('Check again')!;
      again.click();
      again.click();
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe('deterioration_check');
    expect(completedCount()).toBe(before);
    // ...and it really is one hop, not two that happened to land here.
    expect(protocol.steps.find((s) => s.id === 'monitor_chest')!.next).toBe('deterioration_check');
  });

  // The hands-free path. "Done"/"next"/"continue" reach handleNext, the same
  // handler as the footer's primary — so a screen whose footer refuses to
  // advance must refuse by voice too, or the fix only covers the thumb.
  it('voice "done" on a holding step checks again — it does not complete it', () => {
    for (const key of HOLDING_STEPS) {
      const [protocolId, stepId] = key.split('#');
      const protocol = protocols.find((p) => p.id === protocolId)!;
      const holding = protocol.steps.find((s) => s.id === stepId)!;

      openStep(protocolId, stepId);
      const before = completedCount();
      expect(voice.say, 'the runner never registered a voice handler').not.toBeNull();

      act(() => voice.say!('done'));

      // Same destination as the button, and the same silence in the record.
      expect(currentStepId(), key).toBe(holding.next);
      expect(completedCount(), `${key}: voice logged a completion`).toBe(before);

      unmount();
      reset();
    }
  });

  it('voice "done" on a true terminal step does nothing at all', () => {
    // seizure#monitor_seizure has no successor, so advancing fell through to
    // the array-order neighbour: "Seizure stopped — recovery position". The
    // footer stopped offering that; the microphone was still doing it.
    openStep('seizure', 'monitor_seizure');
    const indexBefore = useAppStore.getState().currentStepIndex;
    const eventsBefore = useAppStore.getState().activeEvent!.events.length;

    act(() => voice.say!('done'));

    expect(useAppStore.getState().currentStepIndex).toBe(indexBefore);
    expect(useAppStore.getState().activeEvent!.events.length).toBe(eventsBefore);
  });
});

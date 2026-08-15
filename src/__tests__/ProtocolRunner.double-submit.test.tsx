import { describe, it, expect, beforeEach, beforeAll, vi, afterEach, afterAll } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore, countDosesGiven } from '../store/appStore';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';

// F5: every advancing control writes to the medico-legal record. A gloved
// double-tap fires both clicks before React re-renders with the new step, so
// without a barrier the second one logged a second dose and skipped a step.
//
// These drive the real component and dispatch both clicks inside a single act()
// block — the same frame, which is exactly the case a click-then-assert test
// would miss.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // The runner narrates every step; jsdom has no speech stack. Stub only what
  // the component touches, so the test exercises the real render path.
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

describe('ProtocolRunner double-submit guard', () => {
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

  it('a double-tap on "Confirm given" logs ONE dose and advances ONE step', () => {
    const anaphylaxis = protocols.find((p) => p.id === 'anaphylaxis')!;
    const adrenalineIndex = anaphylaxis.steps.findIndex(
      (s) => s.type === 'drug' && s.drug_id === 'adrenaline_im_adult'
    );
    expect(adrenalineIndex).toBeGreaterThan(-1);

    useAppStore.getState().startEmergency('anaphylaxis');
    act(() => useAppStore.getState().goToStep(adrenalineIndex));
    render();

    const confirm = buttonWithText('Confirm given');
    expect(confirm).toBeDefined();

    act(() => {
      confirm!.click();
      confirm!.click();
    });

    const after = useAppStore.getState();
    // Adrenaline has no max_doses, so nothing but the guard can prevent the
    // second log here.
    expect(countDosesGiven(after.activeEvent, 'adrenaline_im_adult')).toBe(1);
    expect(after.currentStepIndex).toBe(
      anaphylaxis.steps.findIndex((s) => s.id === anaphylaxis.steps[adrenalineIndex].next)
    );
    expect(
      after.activeEvent!.events.filter((e) => e.type === 'step_completed').length
    ).toBe(1);

    unmount();
  });

  it('a double-tap on "Done — next step" advances ONE step and logs it once', () => {
    const cardiac = protocols.find((p) => p.id === 'cardiac_arrest')!;
    useAppStore.getState().startEmergency('cardiac_arrest');
    render();

    const done = buttonWithText('Done — next step');
    expect(done).toBeDefined();

    act(() => {
      done!.click();
      done!.click();
    });

    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe('response');
    expect(
      after.activeEvent!.events.filter((e) => e.type === 'step_completed').length
    ).toBe(1);
    expect(cardiac.steps[0].id).toBe('safety');

    unmount();
  });

  it('the guard releases on the next step — taps still work after a double-tap', () => {
    useAppStore.getState().startEmergency('cardiac_arrest');
    render();

    act(() => {
      const done = buttonWithText('Done — next step')!;
      done.click();
      done.click();
    });
    act(() => {
      buttonWithText('Done — next step')!.click();
    });

    const after = useAppStore.getState();
    // safety -> response -> shout_help: the barrier is per gesture, not sticky.
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe('shout_help');

    unmount();
  });

  it('a spent max-1 drug step withdraws the confirm control (hard block)', () => {
    const seizure = protocols.find((p) => p.id === 'seizure')!;
    const midazolamIndex = seizure.steps.findIndex(
      (s) => s.type === 'drug' && s.drug_id === 'midazolam_buccal'
    );
    expect(midazolamIndex).toBeGreaterThan(-1);

    useAppStore.getState().startEmergency('seizure');
    act(() => useAppStore.getState().goToStep(midazolamIndex));
    render();

    act(() => buttonWithText('Confirm given')!.click());
    expect(countDosesGiven(useAppStore.getState().activeEvent, 'midazolam_buccal')).toBe(1);

    // Back onto the same step: the confirm affordance is gone, replaced by the
    // clinician's wording and plain onward navigation. No override gesture of
    // any kind exists here — that was rejected clinically.
    act(() => useAppStore.getState().goToStep(midazolamIndex));

    expect(buttonWithText('Confirm given')).toBeUndefined();
    expect(buttonWithText('Record another dose')).toBeUndefined();
    expect(container.textContent).toContain('Midazolam already given at');
    expect(container.textContent).toContain('Single dose only — do not repeat.');
    // The time of the recorded dose is shown, not a placeholder.
    expect(container.textContent).not.toContain('{time}');
    expect(container.textContent).toMatch(/already given at \d{2}:\d{2}/);

    const next = buttonWithText('Next step');
    expect(next).toBeDefined();
    act(() => {
      next!.click();
      next!.click();
    });
    expect(countDosesGiven(useAppStore.getState().activeEvent, 'midazolam_buccal')).toBe(1);
    // ...and it MOVES. Asserting only the dose count let a dead button pass:
    // the step this test navigates back to is the same position the confirm
    // fired from, so a guard that never released left "Next step" inert — mid
    // seizure, with the app looking frozen.
    const afterNext = useAppStore.getState();
    expect(afterNext.activeProtocol!.steps[afterNext.currentStepIndex].id).toBe(
      seizure.steps[midazolamIndex].next
    );

    unmount();
  });

  it('after Back, the FIRST tap on the primary control advances', () => {
    // The guard keyed on `${protocol}#${index}` and cleared only after a gesture
    // that did nothing. Back returns to a position a gesture already fired from,
    // so the key matched again and every subsequent tap on that step — CTA,
    // drug confirm, 999 confirm, voice "next" — was swallowed for good.
    useAppStore.getState().startEmergency('cardiac_arrest');
    render();

    act(() => buttonWithText('Done — next step')!.click());
    expect(useAppStore.getState().activeProtocol!.steps[useAppStore.getState().currentStepIndex].id)
      .toBe('response');

    act(() => useAppStore.getState().prevStep());
    expect(useAppStore.getState().currentStepIndex).toBe(0);

    // ONE tap. Not a retry, not a double-tap that happens to get through.
    act(() => buttonWithText('Done — next step')!.click());

    const after = useAppStore.getState();
    expect(after.activeProtocol!.steps[after.currentStepIndex].id).toBe('response');

    unmount();
  });

  it('an escalation drug keeps a live confirm and states the escalation', () => {
    // Clinical ruling 2026-08-13: 3 oral glucose is a threshold, not a ceiling.
    const hypo = protocols.find((p) => p.id === 'hypoglycaemia')!;
    const glucoseIndex = hypo.steps.findIndex(
      (s) => s.type === 'drug' && s.drug_id === 'glucose_oral'
    );
    expect(glucoseIndex).toBeGreaterThan(-1);

    const glucose = drugs.find((d) => d.id === 'glucose_oral')!;
    useAppStore.getState().startEmergency('hypoglycaemia');
    act(() => {
      const store = useAppStore.getState();
      for (let i = 0; i < 3; i++) store.logDrugGiven(glucose, 'Drug: glucose_oral');
      store.goToStep(glucoseIndex);
    });
    render();

    expect(container.textContent).toContain('3 doses given — this is not responding');
    expect(container.textContent).toContain('Call 999 now.');

    // The confirm is still live — demoted and relabelled, never blocked.
    const record = buttonWithText('Record another dose');
    expect(record).toBeDefined();
    act(() => record!.click());
    expect(countDosesGiven(useAppStore.getState().activeEvent, 'glucose_oral')).toBe(4);

    unmount();
  });
});

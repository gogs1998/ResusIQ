import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore, countDosesGiven } from '../store/appStore';
import { protocols } from '../data/protocols';

// F5: every advancing control writes to the medico-legal record. A gloved
// double-tap fires both clicks before React re-renders with the new step, so
// without a barrier the second one logged a second dose and skipped a step.
//
// These drive the real component and dispatch both clicks inside a single act()
// block — the same frame, which is exactly the case a click-then-assert test
// would miss.

declare global {
  // eslint-disable-next-line no-var
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
let root: Root;

const render = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<ProtocolRunner />);
  });
};

const unmount = () => {
  act(() => root.unmount());
  container.remove();
};

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

  it('a spent max-1 drug step shows the refusal instead of a confirm button', () => {
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
    // refusal and plain onward navigation.
    act(() => useAppStore.getState().goToStep(midazolamIndex));

    expect(buttonWithText('Confirm given')).toBeUndefined();
    expect(container.textContent).toContain('Already given — single dose only');
    const next = buttonWithText('Next step');
    expect(next).toBeDefined();

    // Even hammering it cannot add a second dose.
    act(() => {
      next!.click();
      next!.click();
    });
    expect(countDosesGiven(useAppStore.getState().activeEvent, 'midazolam_buccal')).toBe(1);

    unmount();
  });
});

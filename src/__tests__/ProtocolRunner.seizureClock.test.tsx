import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { timerAnchorKey } from '../lib/monotonicTimers';

// F9 / clinical ruling R4. The seizure graph loops: time_seizure ->
// prolonged_seizure -> "still under 5 minutes" -> continue_timing -> back to
// time_seizure. Every arrival used to remount a fresh 300-second countdown, so a
// team answering honestly at a real 3 minutes was handed another full 5, and
// status epilepticus treatment could be deferred by a loop nobody could see.
//
// The clock is faked by writing the anchor into the store — the same thing a
// real arrival N seconds ago would have left behind — so these tests assert the
// re-entry maths without depending on wall-clock timing.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const SEIZURE = protocols.find((p) => p.id === 'seizure')!;
const TIME_SEIZURE_INDEX = SEIZURE.steps.findIndex((s) => s.id === 'time_seizure');
const ANCHOR_KEY = timerAnchorKey('seizure', 'time_seizure');

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

afterAll(() => {
  vi.unstubAllGlobals();
});

const stepId = () => {
  const s = useAppStore.getState();
  return s.activeProtocol!.steps[s.currentStepIndex].id;
};

/** Put the runner on time_seizure with the clock already `secondsAgo` old. */
const arriveWithClockAge = (secondsAgo: number) => {
  useAppStore.getState().startEmergency('seizure');
  act(() => {
    useAppStore.setState({
      timerAnchors: { [ANCHOR_KEY]: new Date(Date.now() - secondsAgo * 1000).toISOString() },
    });
    useAppStore.getState().goToStep(TIME_SEIZURE_INDEX);
  });
  render();
};

describe('ProtocolRunner seizure clock', () => {
  beforeEach(() => {
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
  });

  it('a first arrival starts at the full five minutes and anchors itself', () => {
    useAppStore.getState().startEmergency('seizure');
    act(() => useAppStore.getState().goToStep(TIME_SEIZURE_INDEX));
    render();

    expect(container.textContent).toContain('05:00');
    expect(useAppStore.getState().timerAnchors[ANCHOR_KEY]).toBeDefined();
  });

  it('coming back round the loop shows the REMAINING time, not a fresh 5:00', () => {
    // The defect, stated as a test: arriving again at a real 4:30 must read
    // 0:30. It used to read 5:00.
    arriveWithClockAge(270);

    expect(container.textContent).toContain('00:30');
    expect(container.textContent).not.toContain('05:00');
    expect(stepId()).toBe('time_seizure');
  });

  it('does not reset when the step is left and re-entered', () => {
    arriveWithClockAge(120);
    const anchor = useAppStore.getState().timerAnchors[ANCHOR_KEY];
    expect(container.textContent).toContain('03:00');

    // Round the loop: prolonged_seizure -> continue_timing -> time_seizure.
    act(() => useAppStore.getState().goToStep(SEIZURE.steps.findIndex((s) => s.id === 'continue_timing')));
    act(() => useAppStore.getState().goToStep(TIME_SEIZURE_INDEX));

    expect(useAppStore.getState().timerAnchors[ANCHOR_KEY]).toBe(anchor);
    expect(container.textContent).toContain('03:00');
  });

  it('at five minutes of wall time it routes to the still-seizing check', () => {
    arriveWithClockAge(300);

    // The boundary itself routes — and to the decision, not to the drug.
    expect(stepId()).toBe('prolonged_seizure');
    expect(container.textContent).toContain('Is the seizure still going?');
  });

  it('a clock already well past five minutes cannot be restarted by the loop', () => {
    // Answering "still under 5 minutes" against a spent clock returns the team
    // to the question rather than buying another five minutes.
    arriveWithClockAge(600);

    expect(stepId()).toBe('prolonged_seizure');
  });

  it('the stopped-seizure exit is still reachable from where the clock routes', () => {
    // R4's guard: the backstop must never walk a stopped seizure toward
    // midazolam. It lands on a question that can be answered "it has stopped".
    arriveWithClockAge(300);

    const stopped = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Seizure has stopped')
    );
    expect(stopped).toBeDefined();
    act(() => stopped!.click());

    expect(stepId()).toBe('post_ictal');
  });


  it('a spent clock withdraws the answer that contradicts it', () => {
    // Clinical ruling R4 follow-up. "Still under 5 minutes" against a spent
    // clock led to continue_timing, whose Done bounced the team straight back
    // to this question. The answer goes; the measurement takes its place.
    arriveWithClockAge(300);
    expect(stepId()).toBe('prolonged_seizure');

    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('still under 5 minutes'))).toBe(false);
    expect(container.textContent).toContain('Past 5 minutes on the clock.');

    // What the team can still SAY about the patient is untouched: escalate, or
    // report that it has stopped.
    expect(labels.some((l) => l.includes('5 minutes or more, or it has happened again'))).toBe(true);
    expect(labels.some((l) => l.includes('Seizure has stopped'))).toBe(true);
  });

  it('a live clock keeps every answer — including "still under 5 minutes"', () => {
    // Reached the question early, by hand, with the clock still running: this is
    // the manual path R4 preserves, and nothing is withdrawn on it.
    arriveWithClockAge(120);
    act(() => {
      const done = [...container.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Done — next step')
      );
      done!.click();
    });
    expect(stepId()).toBe('prolonged_seizure');

    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('still under 5 minutes'))).toBe(true);
    expect(container.textContent).not.toContain('Past 5 minutes on the clock.');
  });

  it('suppression and the backstop route read the SAME clock', () => {
    // One second short of the boundary: the timer step does not route, and the
    // answer is still offered. They must flip together, not one before the other.
    arriveWithClockAge(299);
    expect(stepId()).toBe('time_seizure');
    act(() => {
      [...container.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Done — next step'))!
        .click();
    });
    expect(
      [...container.querySelectorAll('button')].some((b) =>
        b.textContent?.includes('still under 5 minutes')
      )
    ).toBe(true);
    unmount();

    // At the boundary the timer routes on its own AND the answer is gone.
    arriveWithClockAge(300);
    expect(stepId()).toBe('prolonged_seizure');
    expect(
      [...container.querySelectorAll('button')].some((b) =>
        b.textContent?.includes('still under 5 minutes')
      )
    ).toBe(false);
  });

  it('leaves interval timers alone — the adrenaline reassess still restarts', () => {
    // The scope guard. A non-resetting adrenaline reassess would break the
    // 5-minute repeat, which is a CLAUDE.md non-negotiable.
    const anaphylaxis = protocols.find((p) => p.id === 'anaphylaxis')!;
    const monitorIndex = anaphylaxis.steps.findIndex((s) => s.type === 'timer_block');
    expect(monitorIndex).toBeGreaterThan(-1);

    useAppStore.getState().startEmergency('anaphylaxis');
    act(() => useAppStore.getState().goToStep(monitorIndex));
    render();

    // No anchor is taken, and the interval control (which the seizure clock
    // deliberately lacks) is present.
    expect(useAppStore.getState().timerAnchors).toEqual({});
    const pause = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Pause')
    );
    expect(pause).toBeDefined();
  });
});

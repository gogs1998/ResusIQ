import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';

const reset = () =>
  useAppStore.setState({
    isEmergencyActive: false,
    activeProtocol: null,
    currentStepIndex: 0,
    activeEvent: null,
    eventHistory: [],
    currentScreen: 'home',
  });

describe('appStore emergency lifecycle', () => {
  beforeEach(reset);

  it('startEmergency activates the protocol and routes to the runner', () => {
    useAppStore.getState().startEmergency('anaphylaxis');
    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(true);
    expect(s.activeProtocol?.id).toBe('anaphylaxis');
    expect(s.currentScreen).toBe('protocol');
    expect(s.activeEvent).not.toBeNull();
  });

  it('startEmergency ignores an unknown protocol id', () => {
    useAppStore.getState().startEmergency('does_not_exist');
    expect(useAppStore.getState().isEmergencyActive).toBe(false);
  });

  it('addEventLog threads drug_id through (robust drug-given match for the 999 script)', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    store.addEventLog('drug_given', 'Drug: adrenaline_im_adult', undefined, 'adrenaline_im_adult');
    const entry = useAppStore.getState().activeEvent?.events.find((e) => e.type === 'drug_given');
    expect(entry?.drug_id).toBe('adrenaline_im_adult');
  });

  it('endEmergency completes the event and clears active state', () => {
    const store = useAppStore.getState();
    store.startEmergency('asthma');
    store.endEmergency();
    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.eventHistory).toHaveLength(1);
    expect(s.eventHistory[0].completed).toBe(true);
  });

  it('decisive tile entry skips a leading recognition step; triage keeps it', () => {
    // chest_pain opens with a recognition step (clinically cleared to skip).
    useAppStore.getState().startEmergency('chest_pain', 'tile');
    const tile = useAppStore.getState();
    expect(tile.currentStepIndex).toBeGreaterThan(0);
    expect(tile.activeProtocol?.steps[tile.currentStepIndex].recognition).toBeFalsy();
    expect(tile.activeProtocol?.steps[0].recognition).toBe(true); // step still exists

    reset();
    useAppStore.getState().startEmergency('chest_pain', 'triage');
    expect(useAppStore.getState().currentStepIndex).toBe(0); // recognition shown
  });

  it('switchProtocol swaps the active protocol on the SAME event, appending a switch log entry', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    const before = useAppStore.getState().activeEvent!;
    const eventId = before.id;
    const countBefore = before.events.length;

    store.switchProtocol('cardiac_arrest');
    const s = useAppStore.getState();
    expect(s.activeProtocol?.id).toBe('cardiac_arrest');
    expect(s.isEmergencyActive).toBe(true);
    expect(s.currentScreen).toBe('protocol');

    // Mid-emergency continuity: the SAME event object continues (elapsed clock +
    // full log survive the switch — medico-legally we never start a second event).
    expect(s.activeEvent?.id).toBe(eventId);
    // The switch is APPENDED, not replacing prior entries.
    expect(s.activeEvent!.events.length).toBe(countBefore + 1);
    const last = s.activeEvent!.events[s.activeEvent!.events.length - 1];
    expect(last.type).toBe('custom');
    expect(last.label).toBe(`Switched to: ${s.activeProtocol!.title}`);

    // Lands on the first action step, not a leading recognition step.
    expect(s.activeProtocol?.steps[s.currentStepIndex].recognition).toBeFalsy();
  });

  it('switchProtocol ignores an unknown protocol id', () => {
    const store = useAppStore.getState();
    store.startEmergency('asthma');
    store.switchProtocol('does_not_exist');
    expect(useAppStore.getState().activeProtocol?.id).toBe('asthma');
  });

  it('switchProtocol outside a live emergency changes NOTHING (no fabricated event)', () => {
    // Fresh state (beforeEach reset): no activeEvent, not active.
    useAppStore.getState().switchProtocol('cardiac_arrest');
    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.activeEvent).toBeNull();
  });

  it('does NOT skip recognition where clinical kept it (anaphylaxis) even on tile entry', () => {
    useAppStore.getState().startEmergency('anaphylaxis', 'tile');
    const s = useAppStore.getState();
    // anaphylaxis recognition is intentionally NOT flagged — must still show first
    expect(s.currentStepIndex).toBe(0);
    expect(s.activeProtocol?.steps[0].id).toBe('recognition');
  });
});

// These assert step `actions` actually EXECUTE — the previous suite only proved
// the action strings exist in the data. runStepActions is the bridge that was
// missing; the anaphylaxis start_cpr step used to say "switching you to the
// cardiac arrest guide" and then dead-end.
describe('appStore runStepActions (step-action execution)', () => {
  beforeEach(reset);

  const anaphylaxis = protocols.find((p) => p.id === 'anaphylaxis')!;
  const startCprStep = anaphylaxis.steps.find((s) => s.id === 'start_cpr')!;

  it('switch_protocol action hands off to cardiac_arrest on the SAME event', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    const eventId = useAppStore.getState().activeEvent!.id;

    // Sanity: the step really carries the action we are exercising.
    expect(startCprStep.actions).toContain('switch_protocol:cardiac_arrest');

    store.runStepActions(startCprStep);

    const s = useAppStore.getState();
    expect(s.activeProtocol?.id).toBe('cardiac_arrest');
    expect(s.isEmergencyActive).toBe(true);
    // Same event — the medico-legal record and elapsed clock continue.
    expect(s.activeEvent?.id).toBe(eventId);
    const last = s.activeEvent!.events.at(-1)!;
    expect(last.label).toBe('Switched to: Cardiac Arrest (CPR + AED)');
    // Lands on cardiac_arrest's first action step, not a recognition step.
    expect(s.activeProtocol?.steps[s.currentStepIndex].recognition).toBeFalsy();
  });

  it('log:<typed-label> is logged AS that event type with a human label', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    const countBefore = useAppStore.getState().activeEvent!.events.length;

    store.runStepActions({ id: 't', type: 'instruction', say: '', show: '', actions: ['log:999_called'] });

    const events = useAppStore.getState().activeEvent!.events;
    expect(events.length).toBe(countBefore + 1);
    const entry = events.at(-1)!;
    // Typed so TimerStrip's 999 chip (which matches on type '999_called') sees it.
    expect(entry.type).toBe('999_called');
    expect(entry.label).toBe('999 called');
  });

  it('log:<free-text> falls back to a custom entry with the raw label', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');

    store.runStepActions({ id: 't', type: 'instruction', say: '', show: '', actions: ['log:kit_opened'] });

    const entry = useAppStore.getState().activeEvent!.events.at(-1)!;
    expect(entry.type).toBe('custom');
    expect(entry.label).toBe('kit_opened');
  });

  it('suggest: and unknown verbs change nothing', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    const before = useAppStore.getState().activeEvent!.events.length;

    store.runStepActions({
      id: 't',
      type: 'instruction',
      say: '',
      show: '',
      actions: ['suggest:call_999', 'orbit:mars'],
    });

    const s = useAppStore.getState();
    expect(s.activeEvent!.events.length).toBe(before);
    expect(s.activeProtocol?.id).toBe('anaphylaxis');
  });
});

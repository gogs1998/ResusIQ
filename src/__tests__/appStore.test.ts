import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/appStore';

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

  it('switchProtocol swaps the active protocol on the SAME event, logging the switch', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    const eventId = useAppStore.getState().activeEvent?.id;

    store.switchProtocol('cardiac_arrest');
    const s = useAppStore.getState();
    expect(s.activeProtocol?.id).toBe('cardiac_arrest');
    expect(s.isEmergencyActive).toBe(true);
    expect(s.currentScreen).toBe('protocol');
    // Same event continues (elapsed clock + log survive the switch).
    expect(s.activeEvent?.id).toBe(eventId);
    const switched = s.activeEvent?.events.some((e) => /^Switched to:/.test(e.label));
    expect(switched).toBe(true);
    // Lands on the first action step, not a leading recognition step.
    expect(s.activeProtocol?.steps[s.currentStepIndex].recognition).toBeFalsy();
  });

  it('switchProtocol ignores an unknown protocol id', () => {
    const store = useAppStore.getState();
    store.startEmergency('asthma');
    store.switchProtocol('does_not_exist');
    expect(useAppStore.getState().activeProtocol?.id).toBe('asthma');
  });

  it('does NOT skip recognition where clinical kept it (anaphylaxis) even on tile entry', () => {
    useAppStore.getState().startEmergency('anaphylaxis', 'tile');
    const s = useAppStore.getState();
    // anaphylaxis recognition is intentionally NOT flagged — must still show first
    expect(s.currentStepIndex).toBe(0);
    expect(s.activeProtocol?.steps[0].id).toBe('recognition');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore, countDosesGiven } from '../store/appStore';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import { doseLimitClass } from '../lib/doseLimits';

const reset = () =>
  useAppStore.setState({
    isEmergencyActive: false,
    activeProtocol: null,
    currentStepIndex: 0,
    activeEvent: null,
    eventHistory: [],
    currentScreen: 'home',
    // A fresh app holds no clocks. Without this the anchors of one test leak
    // into the next, which is how the "refuses to anchor outside a live
    // emergency" case first failed — the leftover map, not the call under test.
    timerAnchors: {},
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

  it('switchProtocol to cardiac_arrest lands on start_cpr, not the top of the protocol', () => {
    // F1: the escape rail promises "Tap to start CPR now". A deterioration
    // entry has already asserted unresponsive + not breathing, so re-running
    // safety → response → airway → breathing_check → "are they breathing?"
    // delays compressions on a patient already declared arrested.
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    store.switchProtocol('cardiac_arrest');

    const s = useAppStore.getState();
    const cardiac = s.activeProtocol!;
    expect(cardiac.id).toBe('cardiac_arrest');
    expect(cardiac.steps[s.currentStepIndex].id).toBe('start_cpr');
    expect(s.currentStepIndex).toBe(cardiac.steps.findIndex((st) => st.id === 'start_cpr'));
    // The skipped steps are still in the graph — Back reaches them.
    expect(cardiac.steps.some((st) => st.id === 'breathing_check')).toBe(true);
  });

  it('a fresh (non-deterioration) cardiac_arrest entry keeps the full sequence', () => {
    // The landing map must not leak into tile/triage entry, where the premise
    // has NOT been asserted.
    useAppStore.getState().startEmergency('cardiac_arrest', 'tile');
    const tile = useAppStore.getState();
    expect(tile.activeProtocol?.steps[tile.currentStepIndex].id).toBe('safety');

    reset();
    useAppStore.getState().startEmergency('cardiac_arrest', 'triage');
    expect(useAppStore.getState().currentStepIndex).toBe(0);
  });

  it('startEmergency landOn starts on the named step; an unknown id falls back', () => {
    useAppStore.getState().startEmergency('cardiac_arrest', 'triage', { landOn: 'start_cpr' });
    const s = useAppStore.getState();
    expect(s.activeProtocol?.steps[s.currentStepIndex].id).toBe('start_cpr');

    reset();
    useAppStore.getState().startEmergency('cardiac_arrest', 'triage', { landOn: 'no_such_step' });
    expect(useAppStore.getState().currentStepIndex).toBe(0);
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

// F2/F11: max_doses used to be metadata the execution path never read, so
// "single dose — do not repeat" was a caption. These pin the ceiling at the one
// place a dose can enter the record.
describe('appStore logDrugGiven (max_doses enforcement)', () => {
  beforeEach(reset);

  const drugById = (id: string) => drugs.find((d) => d.id === id)!;
  const dosesOf = (id: string) =>
    countDosesGiven(useAppStore.getState().activeEvent, id);

  it('refuses a second midazolam and appends nothing to the log', () => {
    const store = useAppStore.getState();
    store.startEmergency('seizure');
    const midazolam = drugById('midazolam_buccal');
    expect(midazolam.max_doses).toBe(1);

    expect(store.logDrugGiven(midazolam, 'Drug: midazolam_buccal').ok).toBe(true);
    const afterFirst = useAppStore.getState().activeEvent!.events.length;

    const second = store.logDrugGiven(midazolam, 'Drug: midazolam_buccal');
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('max_doses_reached');
    // The refusal is not itself an event — a phantom entry would be as wrong in
    // the medico-legal record as the extra dose.
    expect(useAppStore.getState().activeEvent!.events.length).toBe(afterFirst);
    expect(dosesOf('midazolam_buccal')).toBe(1);
  });

  it('two rapid calls for a max-1 drug yield exactly one dose', () => {
    // The double-tap case: no debounce involved, the count itself refuses.
    const store = useAppStore.getState();
    store.startEmergency('hypoglycaemia');
    const glucagon = drugById('glucagon_im');
    store.logDrugGiven(glucagon, 'Drug: glucagon_im');
    store.logDrugGiven(glucagon, 'Drug: glucagon_im');
    expect(dosesOf('glucagon_im')).toBe(1);
  });

  it('refuses a second glucagon — the kit holds one dose', () => {
    const store = useAppStore.getState();
    store.startEmergency('hypoglycaemia');
    const glucagon = drugById('glucagon_im');
    expect(glucagon.max_doses).toBe(1);

    expect(store.logDrugGiven(glucagon, 'Drug: glucagon_im').ok).toBe(true);
    expect(store.logDrugGiven(glucagon, 'Drug: glucagon_im')).toEqual({
      ok: false,
      reason: 'max_doses_reached',
    });
    expect(dosesOf('glucagon_im')).toBe(1);
  });

  it('a FOURTH oral glucose still logs — 3 is an escalation threshold, not a ban', () => {
    // Clinical ruling 2026-08-13: a cap above 1 says the treatment is not
    // working, not that a further dose is forbidden. Blocking it would stop a
    // clinician recording a dose they judged necessary once the patient is awake
    // and swallowing safely — corrupting the record rather than protecting them.
    const store = useAppStore.getState();
    store.startEmergency('hypoglycaemia');
    const glucose = drugById('glucose_oral');
    expect(glucose.max_doses).toBe(3);

    for (let i = 0; i < 4; i++) {
      expect(store.logDrugGiven(glucose, 'Drug: glucose_oral').ok).toBe(true);
    }
    expect(dosesOf('glucose_oral')).toBe(4);
  });

  it('a FOURTH GTN spray still logs — same escalation class', () => {
    const store = useAppStore.getState();
    store.startEmergency('chest_pain');
    const gtn = drugById('gtn_sublingual');
    expect(gtn.max_doses).toBe(3);

    for (let i = 0; i < 4; i++) {
      expect(store.logDrugGiven(gtn, 'Drug: gtn_sublingual').ok).toBe(true);
    }
    expect(dosesOf('gtn_sublingual')).toBe(4);
  });

  it('classifies ceilings and escalation thresholds from the data alone', () => {
    expect(doseLimitClass(drugById('midazolam_buccal'))).toBe('hard_block');
    expect(doseLimitClass(drugById('glucagon_im'))).toBe('hard_block');
    expect(doseLimitClass(drugById('glucose_oral'))).toBe('escalation');
    expect(doseLimitClass(drugById('gtn_sublingual'))).toBe('escalation');
    expect(doseLimitClass(drugById('adrenaline_im_adult'))).toBeNull();
  });

  it('adrenaline has no ceiling — a fifth dose still logs', () => {
    // CLAUDE.md non-negotiable: adrenaline repeats every 5 min with no fixed
    // in-flow maximum. The data carries no max_doses and the store must not
    // invent one.
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    const adrenaline = drugById('adrenaline_im_adult');
    expect(adrenaline.max_doses).toBeUndefined();

    for (let i = 0; i < 5; i++) {
      expect(store.logDrugGiven(adrenaline, 'Drug: adrenaline_im_adult').ok).toBe(true);
    }
    expect(dosesOf('adrenaline_im_adult')).toBe(5);
  });

  it('the ceiling is per drug, not shared across drugs', () => {
    const store = useAppStore.getState();
    store.startEmergency('hypoglycaemia');
    store.logDrugGiven(drugById('glucagon_im'), 'Drug: glucagon_im');
    expect(store.logDrugGiven(drugById('midazolam_buccal'), 'Drug: midazolam_buccal').ok).toBe(true);
    expect(dosesOf('glucagon_im')).toBe(1);
    expect(dosesOf('midazolam_buccal')).toBe(1);
  });

  it('countDosesGiven ignores non-drug entries and other drugs', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    store.addEventLog('step_completed', 'Drug: midazolam_buccal');
    store.logDrugGiven(drugById('adrenaline_im_adult'), 'Drug: adrenaline_im_adult');
    expect(dosesOf('midazolam_buccal')).toBe(0);
    expect(countDosesGiven(null, 'adrenaline_im_adult')).toBe(0);
    expect(countDosesGiven(useAppStore.getState().activeEvent, undefined)).toBe(0);
  });
});

// F4 / clinical ruling R2: "999 called" is an assertion the team makes, never a
// side effect of tapping past a screen — and however many controls they assert
// it through, it happened once.
describe('appStore log999Called (999 is asserted, not inferred)', () => {
  beforeEach(reset);

  const calls999 = () =>
    useAppStore.getState().activeEvent!.events.filter((e) => e.type === '999_called');

  it('logs one typed entry the 999 chip, script and SBAR can all read', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');

    expect(store.log999Called()).toEqual({ ok: true });

    expect(calls999().length).toBe(1);
    expect(calls999()[0].label).toBe('999 called');
  });

  it('a second assertion does not add a second call to the record', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');

    store.log999Called();
    expect(store.log999Called()).toEqual({ ok: false, reason: 'already_logged' });

    expect(calls999().length).toBe(1);
  });

  it('pill tap then step confirm on the same emergency is ONE call', () => {
    // The realistic sequence: someone taps the 999 pill to dial, and the team
    // then confirms on the "Call 999 now" step. Two controls, one call.
    const store = useAppStore.getState();
    store.startEmergency('chest_pain');

    store.log999Called(); // pill
    store.log999Called(); // confirm control

    expect(calls999().length).toBe(1);
  });

  it('a new emergency can log its own call', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    store.log999Called();
    store.endEmergency();

    useAppStore.getState().startEmergency('stroke');
    expect(useAppStore.getState().log999Called()).toEqual({ ok: true });
    expect(calls999().length).toBe(1);
  });

  it('outside an emergency it writes nothing and says so', () => {
    expect(useAppStore.getState().log999Called()).toEqual({ ok: false, reason: 'no_active_event' });
    expect(useAppStore.getState().activeEvent).toBeNull();
  });

  it('a log:999_called step action, if data ever reintroduces one, is deduped too', () => {
    const store = useAppStore.getState();
    store.startEmergency('anaphylaxis');
    store.log999Called();

    store.runStepActions({ id: 't', type: 'instruction', say: '', show: '', actions: ['log:999_called'] });

    expect(calls999().length).toBe(1);
  });
});

// F9 / clinical ruling R4: the seizure clock is anchored in the store, not in
// the timer component, precisely so that remounting the step cannot restart it.
describe('appStore anchorTimer (monotonic clocks)', () => {
  beforeEach(reset);

  const KEY = 'seizure#time_seizure';

  it('records the first arrival and returns it', () => {
    const store = useAppStore.getState();
    store.startEmergency('seizure');

    const anchor = store.anchorTimer(KEY);
    expect(anchor).not.toBeNull();
    expect(useAppStore.getState().timerAnchors[KEY]).toBe(anchor);
  });

  it('is idempotent — a second arrival does not move the start time', () => {
    // The arrival effect runs on every render pass through the step, and the
    // loop brings the team back to it. Neither may restart the seizure clock.
    const store = useAppStore.getState();
    store.startEmergency('seizure');

    const first = store.anchorTimer(KEY);
    const second = useAppStore.getState().anchorTimer(KEY);
    const third = useAppStore.getState().anchorTimer(KEY);

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(Object.keys(useAppStore.getState().timerAnchors)).toEqual([KEY]);
  });

  it('refuses to anchor outside a live emergency', () => {
    expect(useAppStore.getState().anchorTimer(KEY)).toBeNull();
    expect(useAppStore.getState().timerAnchors).toEqual({});
  });

  it('is cleared when the emergency ends', () => {
    const store = useAppStore.getState();
    store.startEmergency('seizure');
    store.anchorTimer(KEY);
    expect(useAppStore.getState().timerAnchors[KEY]).toBeDefined();

    useAppStore.getState().endEmergency();
    expect(useAppStore.getState().timerAnchors).toEqual({});
  });

  it('a later emergency never inherits a spent clock', () => {
    // The clock is faked so the two anchors cannot land in the same millisecond
    // — comparing real timestamps here asserted an artifact, not the property.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-13T10:00:00.000Z'));
      const store = useAppStore.getState();
      store.startEmergency('seizure');
      const first = store.anchorTimer(KEY);
      expect(first).toBe('2026-08-13T10:00:00.000Z');
      useAppStore.getState().endEmergency();

      vi.setSystemTime(new Date('2026-08-13T10:20:00.000Z'));
      useAppStore.getState().startEmergency('seizure');
      expect(useAppStore.getState().timerAnchors).toEqual({});

      // The new emergency times itself from ITS own start, twenty minutes on —
      // not from the seizure that ended.
      expect(useAppStore.getState().anchorTimer(KEY)).toBe('2026-08-13T10:20:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('survives a protocol switch — the same event keeps its clocks', () => {
    const store = useAppStore.getState();
    store.startEmergency('seizure');
    const anchor = store.anchorTimer(KEY);

    useAppStore.getState().switchProtocol('cardiac_arrest');

    expect(useAppStore.getState().timerAnchors[KEY]).toBe(anchor);
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

// Stage 4: the OS chrome follows the app into theatre. jsdom gives us a real
// document, so the meta-tag side of it is directly assertable.
describe('emergency OS chrome', () => {
  beforeEach(() => {
    reset();
    document.getElementById('riq-theme-color-emergency')?.remove();
  });

  const override = () => document.getElementById('riq-theme-color-emergency') as HTMLMetaElement | null;

  it('points theme-color at the theatre surface while an emergency runs', () => {
    expect(override()).toBeNull();

    useAppStore.getState().startEmergency('anaphylaxis');

    expect(override()).not.toBeNull();
    expect(override()!.content).toBe('#0C1118');
    expect(override()!.name).toBe('theme-color');
  });

  it('hands it back when the emergency ends', () => {
    useAppStore.getState().startEmergency('anaphylaxis');
    useAppStore.getState().endEmergency();
    expect(override()).toBeNull();
  });

  it('does not stack overrides across successive emergencies', () => {
    useAppStore.getState().startEmergency('anaphylaxis');
    useAppStore.getState().startEmergency('asthma');
    expect(document.querySelectorAll('#riq-theme-color-emergency')).toHaveLength(1);
  });
});

// Task 0.2: a reload mid-emergency must NOT destroy the emergency.
//
// iOS evicts a backgrounded PWA while someone answers the phone; a pull-to-
// refresh does the same thing by hand. Before this, partialize dropped the
// whole emergency — protocol position, elapsed clock, every logged dose and the
// 999 timestamp — and nothing reached eventHistory, because only endEmergency /
// endEvent move activeEvent there. These exercise REAL rehydration through the
// persist middleware (useAppStore.persist.rehydrate), not a hand-rolled fake.
describe('appStore persistence (an emergency survives a reload)', () => {
  // Read the key and version off the live persist config — never guess them.
  const STORAGE_KEY = useAppStore.persist.getOptions().name!;
  const VERSION = useAppStore.persist.getOptions().version!;
  // The shape shipped before this change: practiceSetup / eventHistory /
  // isVoiceEnabled only.
  const PREVIOUS_VERSION = 1;

  const seed = (version: number, state: Record<string, unknown>) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version }));

  const readPersisted = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    return JSON.parse(raw!) as { state: Record<string, unknown>; version: number };
  };

  const anEvent = (id: string) => ({
    id,
    timestamp: '2026-09-20T09:00:00.000Z',
    protocol_id: 'anaphylaxis',
    protocol_version: '2026.1',
    practice_id: 'p1',
    events: [
      {
        id: 'log-1',
        timestamp: '2026-09-20T09:00:01.000Z',
        type: 'drug_given',
        label: 'Drug: adrenaline_im_adult',
        drug_id: 'adrenaline_im_adult',
      },
    ],
    completed: false,
  });

  beforeEach(() => {
    reset();
    useAppStore.setState({ practiceSetup: null, isVoiceEnabled: true });
    document.getElementById('riq-theme-color-emergency')?.remove();
    // AFTER the resets — setState itself writes through the persist middleware.
    localStorage.clear();
  });

  it('persists the active emergency', () => {
    useAppStore.getState().startEmergency('anaphylaxis', 'tile');
    useAppStore.getState().goToStep(3);
    useAppStore
      .getState()
      .addEventLog('drug_given', 'Drug: adrenaline_im_adult', undefined, 'adrenaline_im_adult');
    useAppStore.getState().anchorTimer('anaphylaxis#adrenaline');

    const persisted = readPersisted();
    expect(persisted.state.isEmergencyActive).toBe(true);
    expect(persisted.state.currentStepIndex).toBe(3);
    // The ID, never the object: a full Protocol snapshot would resume OLD
    // clinical text after an app update.
    expect(persisted.state.activeProtocolId).toBe('anaphylaxis');
    expect(persisted.state).not.toHaveProperty('activeProtocol');

    const activeEvent = persisted.state.activeEvent as { events: { drug_id?: string }[] };
    expect(activeEvent).toBeTruthy();
    expect(activeEvent.events.some((e) => e.drug_id === 'adrenaline_im_adult')).toBe(true);

    // Wall-clock (ISO) anchors, so the elapsed clock survives the reload.
    const anchors = persisted.state.timerAnchors as Record<string, string>;
    expect(anchors['anaphylaxis#adrenaline']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rehydrates a persisted emergency and resolves the protocol object', async () => {
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'anaphylaxis',
      currentStepIndex: 2,
      activeEvent: anEvent('evt-live'),
      timerAnchors: { 'anaphylaxis#adrenaline': '2026-09-20T09:00:00.000Z' },
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(true);
    expect(s.currentStepIndex).toBe(2);
    expect(s.activeProtocol?.id).toBe('anaphylaxis');
    // Referentially the LIVE protocol from data/protocols — not a deserialized
    // snapshot of whatever the clinical text said when the tab was last open.
    expect(s.activeProtocol).toBe(protocols.find((p) => p.id === 'anaphylaxis'));
    // The runner is on screen, not the home tiles.
    expect(s.currentScreen).toBe('protocol');
    expect(s.activeEvent?.id).toBe('evt-live');
    expect(s.activeEvent?.events).toHaveLength(1);
    expect(s.timerAnchors['anaphylaxis#adrenaline']).toBe('2026-09-20T09:00:00.000Z');
    // Nothing was archived — the emergency is still running.
    expect(s.eventHistory).toHaveLength(0);
  });

  it('discards an unresumable emergency safely, keeping its record', async () => {
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'no_such_protocol',
      currentStepIndex: 2,
      activeEvent: anEvent('evt-orphan'),
      timerAnchors: { 'x#y': '2026-09-20T09:00:00.000Z' },
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.currentStepIndex).toBe(0);
    expect(s.activeEvent).toBeNull();
    expect(s.timerAnchors).toEqual({});
    // The flow could not resume, but the medico-legal record must not vanish.
    expect(s.eventHistory).toHaveLength(1);
    expect(s.eventHistory[0].id).toBe('evt-orphan');
    expect(s.eventHistory[0].completed).toBe(true);
    // The logged dose is still there, and the close is timestamped.
    expect(s.eventHistory[0].events.some((e) => e.drug_id === 'adrenaline_im_adult')).toBe(true);
    expect(s.eventHistory[0].events.length).toBeGreaterThan(1);
  });

  it('discards an emergency whose step index no longer exists in the protocol', async () => {
    // Same safety net for the other way a resume can be impossible: the
    // protocol resolved, but an app update shortened it under the saved index.
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'anaphylaxis',
      currentStepIndex: 9999,
      activeEvent: anEvent('evt-oob'),
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.currentStepIndex).toBe(0);
    expect(s.eventHistory.map((e) => e.id)).toEqual(['evt-oob']);
  });

  it('old persisted shape (previous version) still loads', async () => {
    const archived = { ...anEvent('evt-archived'), completed: true };
    seed(PREVIOUS_VERSION, {
      practiceSetup: {
        id: 'p1',
        name: 'Old Practice',
        address: '1 Old Street',
        postcode: 'G1 1AA',
        phone: '0141 000 0000',
        aed_present: true,
        oxygen_present: true,
        staff_roles: [],
        equipment: [],
      },
      eventHistory: [archived],
      isVoiceEnabled: false,
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.currentStepIndex).toBe(0);
    expect(s.activeEvent).toBeNull();
    expect(s.timerAnchors).toEqual({});
    // The pre-existing record is untouched, and the old preferences survive.
    expect(s.eventHistory).toHaveLength(1);
    expect(s.eventHistory[0].id).toBe('evt-archived');
    expect(s.practiceSetup?.name).toBe('Old Practice');
    expect(s.isVoiceEnabled).toBe(false);
  });
  // ---------------------------------------------------------------------
  // Hardening: a corrupt or hand-edited blob must never cost the archive.
  //
  // The failure mode is indirect and total. `merge` throwing is swallowed by
  // zustand's hydrate().catch, so `set(stateFromStorage, true)` never runs and
  // the store keeps its factory defaults — then the NEXT ordinary write
  // serialises those empty defaults straight over the blob. practiceSetup and
  // every archived emergency are gone from disk, from a single malformed field.
  // ---------------------------------------------------------------------

  const aPractice = {
    id: 'p1',
    name: 'Corrupt Blob Practice',
    address: '1 Old Street',
    postcode: 'G1 1AA',
    phone: '0141 000 0000',
    aed_present: true,
    oxygen_present: true,
    staff_roles: [],
    equipment: [],
  };

  it('the real (non-demo) build has a storage — regression: storage:undefined silently disabled persist', () => {
    expect(useAppStore.persist).toBeDefined();
    useAppStore.getState().setScreen('reports'); // any write
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('a malformed activeEvent cannot destroy practiceSetup or the archive', async () => {
    const archived = { ...anEvent('evt-archived'), completed: true };
    seed(VERSION, {
      practiceSetup: aPractice,
      eventHistory: [archived],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'no_such_protocol',
      currentStepIndex: 2,
      // No `events` array: closeUnresumableEvent used to spread it and throw.
      activeEvent: { id: 'broken' },
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.activeEvent).toBeNull();
    expect(s.practiceSetup?.name).toBe('Corrupt Blob Practice');
    expect(s.eventHistory.map((e) => e.id)).toEqual(['evt-archived']);

    // And the blob itself survives the next ordinary write.
    useAppStore.getState().setScreen('reports');
    const persisted = readPersisted();
    expect((persisted.state.eventHistory as { id: string }[]).map((e) => e.id)).toEqual([
      'evt-archived',
    ]);
    expect((persisted.state.practiceSetup as { name: string }).name).toBe(
      'Corrupt Blob Practice'
    );
  });

  it('does not resume on a malformed activeEvent even when the protocol resolves', async () => {
    const archived = { ...anEvent('evt-archived'), completed: true };
    seed(VERSION, {
      practiceSetup: aPractice,
      eventHistory: [archived],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'anaphylaxis',
      currentStepIndex: 2,
      activeEvent: { id: 'broken' },
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.activeEvent).toBeNull();
    expect(s.currentStepIndex).toBe(0);
    // Nothing was archived from the broken blob, and nothing was lost.
    expect(s.eventHistory.map((e) => e.id)).toEqual(['evt-archived']);
  });

  it('salvages eventHistory element-wise — one bad record does not bin the archive', async () => {
    const good = { ...anEvent('evt-good'), completed: true };
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [good, { id: 'evt-garbage' }],
      isVoiceEnabled: true,
      isEmergencyActive: false,
      activeProtocolId: null,
      currentStepIndex: 0,
      activeEvent: null,
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();

    expect(useAppStore.getState().eventHistory.map((e) => e.id)).toEqual(['evt-good']);
  });

  // I1: an emergency with no event is not an emergency. Resuming one puts the
  // runner on screen while addEventLog, log999Called and anchorTimer all no-op —
  // the seizure clock never anchors and endEmergency archives nothing.
  it('refuses to resume an emergency with no activeEvent', async () => {
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'anaphylaxis',
      currentStepIndex: 2,
      activeEvent: null,
      timerAnchors: { 'anaphylaxis#adrenaline': '2026-09-20T09:00:00.000Z' },
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.isEmergencyActive).toBe(false);
    expect(s.activeProtocol).toBeNull();
    expect(s.currentStepIndex).toBe(0);
    expect(s.timerAnchors).toEqual({});
    // There was no event to close, so history stays untouched.
    expect(s.eventHistory).toHaveLength(0);
  });

  it('a resume re-arms the OS chrome; an unresumable one does not', async () => {
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'anaphylaxis',
      currentStepIndex: 2,
      activeEvent: anEvent('evt-live'),
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();
    expect(document.getElementById('riq-theme-color-emergency')).not.toBeNull();

    document.getElementById('riq-theme-color-emergency')?.remove();
    localStorage.clear();
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'no_such_protocol',
      currentStepIndex: 2,
      activeEvent: anEvent('evt-orphan'),
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();
    expect(document.getElementById('riq-theme-color-emergency')).toBeNull();
  });

  it('a resume logs nothing — the record picks up exactly where it stopped', async () => {
    seed(VERSION, {
      practiceSetup: null,
      eventHistory: [],
      isVoiceEnabled: true,
      isEmergencyActive: true,
      activeProtocolId: 'anaphylaxis',
      currentStepIndex: 2,
      activeEvent: anEvent('evt-live'),
      timerAnchors: {},
    });

    await useAppStore.persist.rehydrate();

    const s = useAppStore.getState();
    expect(s.activeEvent?.events).toHaveLength(1);
    expect(s.activeEvent?.events.some((e) => e.type === 'step_completed')).toBe(false);
  });
});

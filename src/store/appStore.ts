import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppScreen,
  Protocol,
  ProtocolStep,
  EmergencyEvent,
  EventLogEntry,
  PracticeSetup,
  EventType,
  Drug
} from '../types';
import { protocols } from '../data/protocols';
import { enableWakeLock, disableWakeLock } from '../lib/wakeLock';
import { enterEmergencyChrome, exitEmergencyChrome } from '../lib/osChrome';
import { doseLimitClass, isAtDoseLimit } from '../lib/doseLimits';
import { has999Called } from '../lib/call999';
import { newId } from '../lib/ids';
import { isDemoMode } from '../lib/demoMode';

interface AppState {
  // Navigation
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  
  // Emergency Mode
  isEmergencyActive: boolean;
  activeProtocol: Protocol | null;
  currentStepIndex: number;
  startEmergency: (
    protocolId: string,
    source?: 'tile' | 'triage' | 'library',
    opts?: { landOn?: string }
  ) => void;
  switchProtocol: (protocolId: string) => void;
  runStepActions: (step: ProtocolStep) => void;
  setProtocol: (protocol: Protocol | null) => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  endEmergency: () => void;
  
  // Triage
  triageAnswers: Record<string, boolean | string>;
  setTriageAnswer: (questionId: string, answer: boolean | string) => void;
  clearTriageAnswers: () => void;
  
  // Event Logging
  activeEvent: EmergencyEvent | null;
  eventHistory: EmergencyEvent[];
  createEvent: (protocolId: string) => void;
  addEventLog: (type: EventType, label: string, details?: string, drugId?: string) => void;
  logDrugGiven: (
    drug: Drug,
    label: string,
    doseText?: string
  ) => { ok: boolean; reason?: 'max_doses_reached' };
  log999Called: () => { ok: boolean; reason?: 'already_logged' | 'no_active_event' };

  // Monotonic timer anchors, keyed by timerAnchorKey(protocol, step). See
  // lib/monotonicTimers for which steps qualify and why.
  timerAnchors: Record<string, string>;
  anchorTimer: (key: string) => string | null;
  endEvent: (outcome?: string, notes?: string) => void;
  
  // Voice
  isVoiceEnabled: boolean;
  isMuted: boolean;
  toggleVoice: () => void;
  toggleMute: () => void;
  
  // Practice Setup
  practiceSetup: PracticeSetup | null;
  setPracticeSetup: (setup: PracticeSetup) => void;
  
  // Training Mode
  isTrainingMode: boolean;
  setTrainingMode: (enabled: boolean) => void;
}

// The leading-recognition skip predicate. Decisive entry — a tile tap OR a
// mid-emergency protocol switch — lands on the first non-`recognition` step so
// the user leads with the action, not a symptom-recognition prompt. Recognition
// steps are never deleted (Back still reaches them). ONE definition so tile
// entry and switchProtocol can never diverge on which steps are skippable; this
// predicate is adversarially verified by the safety tests (e.g. stroke FAST /
// adrenal steroid gates carry no recognition flag, so they can never be skipped).
function firstActionStepIndex(steps: Protocol['steps']): number {
  let i = 0;
  while (i < steps.length - 1 && steps[i].recognition) i++;
  return i;
}

// Deterioration landing — where a protocol entered mid-emergency starts.
//
// Clinical premise: every arrival path into cardiac_arrest as a DETERIORATION
// (the escape rail, or a step's `switch_protocol:cardiac_arrest` action) has
// already asserted "unresponsive and not breathing". The opening steps of
// cardiac_arrest — safety, response, shout_help, airway, breathing_check,
// breathing_decision — exist to establish exactly that. Re-asking them delays
// compressions on a patient the operator has already declared arrested, which
// is the harm the escape rail exists to prevent. So a deterioration entry lands
// on `start_cpr`; the pre-answered steps stay in the graph and Back still
// reaches them.
//
// This does NOT apply to a fresh entry (home tile, triage result confirmation):
// there the premise has not been asserted, so the full recognition sequence
// runs and only the leading-recognition skip applies. The one exception is a
// triage path that has itself answered unconscious + not breathing — it passes
// `landOn` explicitly rather than inheriting this map.
//
// Keys/values are held to real protocol and step ids by the data-integrity
// tests, which also assert the landing step carries no `recognition` flag.
export const DETERIORATION_LANDING: Record<string, string> = {
  cardiac_arrest: 'start_cpr',
};

// Resolve a step id to its index, or -1 when absent/undefined. Callers fall
// back to their own default index so a stale id can never strand the runner on
// step -1.
function stepIndexById(steps: Protocol['steps'], stepId: string | undefined): number {
  return stepId ? steps.findIndex((s) => s.id === stepId) : -1;
}

// Doses of one drug already recorded on an event. The single counting rule,
// shared by the enforcement in logDrugGiven and by the UI that has to show the
// same verdict: the runner derives its "already given" state from this at
// render, so Back into a spent drug step cannot disagree with the store about
// whether another dose is allowed.
export function countDosesGiven(
  event: EmergencyEvent | null,
  drugId: string | undefined
): number {
  if (!event || !drugId) return 0;
  return event.events.filter((e) => e.type === 'drug_given' && e.drug_id === drugId).length;
}

// Runtime mirror of the EventType union (the type itself is erased at build
// time). Lets runStepActions tell a `log:<label>` whose label names a real event
// type (e.g. log:999_called) — which must be logged AS that type so the 999 chip
// / 999 script / SBAR recognise it — from a free-text label logged as 'custom'.
//
// Locked to the union in BOTH directions so the list can never silently drift
// from EventType: `satisfies readonly EventType[]` rejects a value that isn't an
// EventType, and `_ExhaustiveEventTypes` fails to compile if a union member is
// missing from the list below.
const EVENT_TYPE_LIST = [
  'protocol_started',
  'step_completed',
  'drug_given',
  'drug_confirmed',
  '999_called',
  'aed_attached',
  'shock_delivered',
  'rosc',
  'oxygen_started',
  'symptoms_started',
  'ambulance_arrived',
  'handover',
  'custom',
] as const satisfies readonly EventType[];
type _ExhaustiveEventTypes = Exclude<EventType, (typeof EVENT_TYPE_LIST)[number]> extends never
  ? true
  : never;
const _eventTypesAreExhaustive: _ExhaustiveEventTypes = true;
void _eventTypesAreExhaustive;
const EVENT_TYPES: ReadonlySet<EventType> = new Set(EVENT_TYPE_LIST);

// Human-readable labels for the typed log verbs that appear in protocols.ts
// actions. Falls back to the raw label for any typed event without an entry.
const LOG_LABELS: Record<string, string> = {
  '999_called': '999 called',
  aed_attached: 'AED attached',
  shock_delivered: 'Shock delivered',
  oxygen_started: 'Oxygen started',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentScreen: 'home',
      setScreen: (screen) => set({ currentScreen: screen }),
      
      // Emergency Mode
      isEmergencyActive: false,
      activeProtocol: null,
      currentStepIndex: 0,
      
      startEmergency: (protocolId, source, opts) => {
        const protocol = protocols.find(p => p.id === protocolId);
        if (protocol) {
          // Decisive entry (tile tap) skips leading recognition/symptom steps —
          // the user already chose the condition, so lead with the action.
          // Triage/library keep them (arrived via uncertainty).
          //
          // `landOn` overrides both: a caller that has ALREADY established the
          // protocol's entry criteria (the triage unconscious + not-breathing
          // fast-path) names the step to start on, so the operator is not asked
          // again what they just answered. An unknown id falls back to the
          // source-based index rather than stranding the runner.
          const landOnIndex = stepIndexById(protocol.steps, opts?.landOn);
          const startIndex = landOnIndex >= 0
            ? landOnIndex
            : source === 'tile' ? firstActionStepIndex(protocol.steps) : 0;
          const event: EmergencyEvent = {
            id: newId(),
            timestamp: new Date().toISOString(),
            protocol_id: protocolId,
            protocol_version: '2026.1',
            practice_id: get().practiceSetup?.id || 'unknown',
            events: [{
              id: newId(),
              timestamp: new Date().toISOString(),
              type: 'protocol_started',
              label: `Started: ${protocol.title}`
            }],
            completed: false
          };
          set({
            isEmergencyActive: true,
            activeProtocol: protocol,
            currentStepIndex: startIndex,
            currentScreen: 'protocol',
            activeEvent: event,
            // A new emergency times itself from scratch — never from a clock
            // left anchored by the last one.
            timerAnchors: {}
          });
          // Keep screen awake during emergency (re-acquires on foreground), and
          // take the OS chrome dark with the app.
          enableWakeLock();
          enterEmergencyChrome();
        }
      },
      
      // Mid-emergency deterioration: swap the active protocol WITHOUT starting a
      // new event — the log and elapsed clock continue (a second event would
      // fracture the medico-legal record). The single code path for switching
      // protocols mid-emergency: EscapeRail calls it directly, and a protocol
      // step's `switch_protocol:<id>` action routes through it via
      // runStepActions (so the anaphylaxis→CPR handoff is one graph edge, not a
      // hand-wired branch).
      //
      // EVERY call is a deterioration by construction (it is guarded on
      // activeEvent), so the landing uses DETERIORATION_LANDING where the target
      // declares one — cardiac_arrest lands on `start_cpr`, honouring the escape
      // rail's "Tap to start CPR now" promise. Targets without an entry fall
      // back to the leading-recognition skip a decisive tile entry uses.
      // Unknown ids are a silent no-op — target validity is owned by the
      // data-integrity tests (every switch_protocol action targets a real
      // protocol), not re-checked at runtime.
      switchProtocol: (protocolId) => {
        const { activeEvent, activeProtocol } = get();
        // A switch outside a live emergency is a programming error: refuse it
        // rather than silently no-op the log or fabricate a fresh event here
        // (that would double startEmergency's semantics).
        if (!activeEvent) return;
        // No-op if we're already running this protocol (also absorbs a
        // double-fire race before the button unmounts).
        if (activeProtocol?.id === protocolId) return;
        const protocol = protocols.find(p => p.id === protocolId);
        if (!protocol) return;
        const landingIndex = stepIndexById(protocol.steps, DETERIORATION_LANDING[protocolId]);
        set({
          isEmergencyActive: true,
          activeProtocol: protocol,
          currentStepIndex: landingIndex >= 0 ? landingIndex : firstActionStepIndex(protocol.steps),
          currentScreen: 'protocol',
        });
        // Records the switch on the SAME event log.
        get().addEventLog('custom', `Switched to: ${protocol.title}`);
      },

      // Execute a step's declarative `actions` — the bridge that turns the
      // formerly-dead `actions` data in protocols.ts into runtime behaviour.
      // Called by the runner on step COMPLETION (leaving the step), never on
      // render, so back-navigation can't re-fire and nothing fires before the
      // user actually did the thing. Verbs:
      //   switch_protocol:<id> — hand off to another protocol (via switchProtocol,
      //     which keeps the same event + elapsed clock).
      //   log:<label>          — append an event-log entry. When <label> is an
      //     EventType (e.g. 999_called), it is logged AS that type with a human
      //     label so downstream readers (TimerStrip's 999 chip, the 999 script,
      //     SBAR) recognise it; otherwise it is a 'custom' entry with the raw label.
      //   suggest:<x>          — deliberate no-op: the persistent 999 pill already
      //     surfaces the suggestion; no UI is built off it here.
      //   anything else        — no-op (forward-compat for future verbs).
      runStepActions: (step) => {
        for (const action of step.actions ?? []) {
          const sep = action.indexOf(':');
          const verb = sep === -1 ? action : action.slice(0, sep);
          const arg = sep === -1 ? '' : action.slice(sep + 1);
          switch (verb) {
            case 'switch_protocol':
              get().switchProtocol(arg);
              break;
            case 'log':
              // No protocol step carries log:999_called any more (ruling R2 —
              // the log follows a human assertion, not a step completion), but
              // route it through the deduped logger anyway so a future data
              // change can only ever produce ONE call entry per emergency.
              if (arg === '999_called') {
                get().log999Called();
              } else if (EVENT_TYPES.has(arg as EventType)) {
                get().addEventLog(arg as EventType, LOG_LABELS[arg] ?? arg);
              } else {
                get().addEventLog('custom', arg);
              }
              break;
            case 'suggest':
              // No-op: the persistent 999 pill already surfaces call_999.
              break;
            default:
              // Unknown verb — no-op so new data can't crash an old client.
              break;
          }
        }
      },

      setProtocol: (protocol) => set({ activeProtocol: protocol, currentStepIndex: 0 }),

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },
      
      goToStep: (index) => set({ currentStepIndex: index }),
      
      endEmergency: () => {
        const { activeEvent, eventHistory } = get();
        // Release wake lock (also stops the foreground re-acquire) and hand the
        // OS chrome back.
        disableWakeLock();
        exitEmergencyChrome();
        if (activeEvent) {
          const completedEvent = { ...activeEvent, completed: true };
          set({ 
            isEmergencyActive: false,
            activeProtocol: null,
            currentStepIndex: 0,
            currentScreen: 'home',
            activeEvent: null,
            eventHistory: [...eventHistory, completedEvent],
            timerAnchors: {}
          });
        } else {
          set({ 
            isEmergencyActive: false,
            activeProtocol: null,
            currentStepIndex: 0,
            currentScreen: 'home',
            timerAnchors: {}
          });
        }
      },
      
      // Triage
      triageAnswers: {},
      setTriageAnswer: (questionId, answer) => set(state => ({
        triageAnswers: { ...state.triageAnswers, [questionId]: answer }
      })),
      clearTriageAnswers: () => set({ triageAnswers: {} }),
      
      // Event Logging
      activeEvent: null,
      eventHistory: [],
      
      createEvent: (protocolId) => {
        const event: EmergencyEvent = {
          id: newId(),
          timestamp: new Date().toISOString(),
          protocol_id: protocolId,
          protocol_version: '2026.1',
          practice_id: get().practiceSetup?.id || 'unknown',
          events: [],
          completed: false
        };
        set({ activeEvent: event });
      },
      
      addEventLog: (type, label, details, drugId) => {
        const { activeEvent } = get();
        if (activeEvent) {
          const entry: EventLogEntry = {
            id: newId(),
            timestamp: new Date().toISOString(),
            type,
            label,
            details,
            drug_id: drugId
          };
          set({
            activeEvent: {
              ...activeEvent,
              events: [...activeEvent.events, entry]
            }
          });
        }
      },
      
      // The ONLY way a drug administration reaches the log. `max_doses` in
      // drugs.ts was previously metadata the execution path never read, so
      // "single dose — do not repeat" was a caption, not a rule: Back onto the
      // step and Confirm given again appended a second dose.
      //
      // ONLY a true ceiling refuses (max_doses === 1 — midazolam, glucagon).
      // A higher cap is an escalation threshold, not a ban, and logs normally so
      // a clinician can still record a dose they judged necessary; the runner
      // states the escalation instead. See doseLimitClass for the full reasoning
      // and the clinical ruling behind it. Adrenaline declares no max_doses and
      // stays repeatable every 5 minutes as the anaphylaxis rule requires.
      //
      // A refusal logs NOTHING: a refused attempt is not a clinical event, and
      // writing one would put a phantom dose in the medico-legal record.
      // `doseText` is what was actually given — the band, or free text — and is
      // the only thing allowed to state a dose in the record (see lib/drugLog:
      // the deck used to print the drug's ADULT dose against every entry,
      // including paediatric ones). Nothing populates it yet; capturing the band
      // at confirm time is the follow-on. Until it does, readers say the dose was
      // not recorded rather than inventing one.
      logDrugGiven: (drug, label, doseText) => {
        const dosesGiven = countDosesGiven(get().activeEvent, drug.id);
        if (doseLimitClass(drug) === 'hard_block' && isAtDoseLimit(drug, dosesGiven)) {
          return { ok: false, reason: 'max_doses_reached' };
        }
        get().addEventLog('drug_given', label, doseText, drug.id);
        return { ok: true };
      },

      // The ONLY way "999 has been called" reaches the log (clinical ruling R2,
      // 2026-08-13). It used to be a step action — completing a "Call 999 now"
      // instruction with the generic Done painted the timer strip green while
      // someone was still finding a phone. Now it is written only where a human
      // asserts it: the tel:999 pill, or the explicit confirm control on a 999
      // step.
      //
      // Deduped to ONE entry per emergency. Those two paths overlap constantly
      // (tap the pill to dial, then confirm on the step), and a second entry
      // would read as a second call to the 999 script, the SBAR and anyone
      // reviewing the record afterwards. Nothing downstream counts calls; they
      // all ask "was 999 called, and when" — which the first entry answers.
      log999Called: () => {
        const { activeEvent } = get();
        if (!activeEvent) return { ok: false, reason: 'no_active_event' };
        if (has999Called(activeEvent)) return { ok: false, reason: 'already_logged' };
        get().addEventLog('999_called', LOG_LABELS['999_called']);
        return { ok: true };
      },

      timerAnchors: {},

      // First arrival wins, for the life of ONE emergency.
      //
      // The seizure clock is anchored here rather than by the timer component so
      // that re-entering the step cannot restart it: a component remount is
      // exactly what used to hand the team a fresh five minutes (F9). Idempotent
      // by construction — a second call returns the first anchor untouched — so
      // the arrival effect can run on every render pass without lying about when
      // the seizure started.
      //
      // Tied to the active event: cleared when one starts and when one ends, so
      // a later emergency never inherits a spent clock. Not persisted, for the
      // same reason activeEvent is not.
      anchorTimer: (key) => {
        const { activeEvent, timerAnchors } = get();
        // No live event means no emergency to time. Refusing here keeps a stray
        // anchor from outliving the record it belongs to.
        if (!activeEvent) return null;
        const existing = timerAnchors[key];
        if (existing) return existing;
        const anchor = new Date().toISOString();
        set({ timerAnchors: { ...timerAnchors, [key]: anchor } });
        return anchor;
      },

      endEvent: (outcome, notes) => {
        const { activeEvent, eventHistory } = get();
        if (activeEvent) {
          const completedEvent: EmergencyEvent = {
            ...activeEvent,
            completed: true,
            outcome,
            notes
          };
          set({
            activeEvent: null,
            eventHistory: [...eventHistory, completedEvent],
            timerAnchors: {}
          });
        }
      },
      
      // Voice
      isVoiceEnabled: true,
      isMuted: false,
      toggleVoice: () => set(state => ({ isVoiceEnabled: !state.isVoiceEnabled })),
      toggleMute: () =>
        set(state => {
          const isMuted = !state.isMuted;
          // Muting must silence the sentence being spoken, not just future ones.
          if (isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          return { isMuted };
        }),
      
      // Practice Setup
      practiceSetup: null,
      setPracticeSetup: (setup) => set({ practiceSetup: setup }),
      
      // Training Mode
      isTrainingMode: false,
      setTrainingMode: (enabled) => set({ isTrainingMode: enabled })
    }),
    {
      // Demo mode persists nothing beyond the tab: throwaway key, sessionStorage —
      // public visitors must not inherit each other's (or a real practice's) state.
      name: isDemoMode ? 'resusiq-demo' : 'resusiq-storage',
      storage: isDemoMode ? createJSONStorage(() => sessionStorage) : undefined,
      // Bump `version` whenever the persisted shape below changes, and handle
      // the upgrade in `migrate`. Without this, a schema change silently
      // corrupts rehydrated eventHistory / practiceSetup from older installs.
      version: 1,
      partialize: (state) => ({
        practiceSetup: state.practiceSetup,
        eventHistory: state.eventHistory,
        isVoiceEnabled: state.isVoiceEnabled
      }),
      migrate: (persistedState) => {
        // v0 (unversioned) -> v1: shapes are compatible; guard against a
        // partially-written or corrupt blob so the app still boots cleanly.
        const state = (persistedState ?? {}) as Partial<{
          practiceSetup: PracticeSetup | null;
          eventHistory: EmergencyEvent[];
          isVoiceEnabled: boolean;
        }>;
        if (!Array.isArray(state.eventHistory)) {
          state.eventHistory = [];
        }
        return state;
      }
    }
  )
);

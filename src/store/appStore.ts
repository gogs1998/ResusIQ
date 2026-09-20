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

  // Set by `merge` when a reload RESUMED an emergency, and by nothing else.
  // Deliberately NOT persisted: it describes this boot, not the record — a
  // persisted copy would announce a resume that had already been acknowledged,
  // reload after reload. Cleared the moment the team moves.
  resumedAt: string | null;
  
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

// ── Persistence ──────────────────────────────────────────────────────────────
//
// What survives a reload. Task 0.2: the emergency itself is in here now.
//
// A mid-emergency reload is a realistic event, not a corner case — iOS evicts a
// backgrounded PWA while someone answers the phone, and a pull-to-refresh does
// the same thing by hand. This used to persist practiceSetup / eventHistory /
// isVoiceEnabled only, so a reload destroyed the protocol position, the elapsed
// clock, every logged dose and the 999 timestamp, and nothing reached
// eventHistory (only endEmergency / endEvent move activeEvent there). A total,
// medico-legal loss.
//
// NOTE the protocol is stored as an ID, never as the object: see `merge`.
interface PersistedAppState {
  practiceSetup: PracticeSetup | null;
  eventHistory: EmergencyEvent[];
  isVoiceEnabled: boolean;
  isEmergencyActive: boolean;
  activeProtocolId: string | null;
  currentStepIndex: number;
  activeEvent: EmergencyEvent | null;
  // Wall-clock ISO strings (see anchorTimer), NOT performance.now() readings —
  // which is the only reason they mean anything after a reload.
  timerAnchors: Record<string, string>;
  // Task 0.6. A reload used to turn training mode off, which took the 999 dial
  // guard down with it — and now that an emergency resumes across a reload, a
  // drill comes back up in the runner with nothing between a tap on a 999
  // control and a real ambulance. `resumedAt` is NOT in here: see AppState.
  isTrainingMode: boolean;
}

// A persisted timerAnchors blob is only usable if every value is a string; a
// half-written or hand-edited map must not reach the timer components.
function isAnchorMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string')
  );
}

// The persisted blob is data from disk, not a typed value: it can be truncated
// by an eviction mid-write, or hand-edited. Anything read out of it that the
// rehydrate path will dereference has to be checked first — `closeUnresumableEvent`
// spreads `event.events`, so an activeEvent missing that array used to throw
// straight out of `merge` (see the comment there for what that costs).
//
// Structural, not exhaustive: the fields the emergency/record paths actually
// touch. `id` and `timestamp` identify the record; `events` is the log itself.
function isEmergencyEventish(value: unknown): value is EmergencyEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<EmergencyEvent>;
  return typeof v.id === 'string' && typeof v.timestamp === 'string' && Array.isArray(v.events);
}

// Close out an event whose emergency cannot be resumed. The flow is gone, but
// the record must not be: everything already logged (doses, the 999 call) stays,
// and a timestamped closing entry says when and why it stopped, so the gap in
// the record is explained rather than silent.
function closeUnresumableEvent(event: EmergencyEvent): EmergencyEvent {
  return {
    ...event,
    completed: true,
    events: [
      ...event.events,
      {
        id: newId(),
        timestamp: new Date().toISOString(),
        type: 'custom',
        label: 'Record closed — the emergency could not be resumed after a restart',
      },
    ],
  };
}

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
      // A first boot resumed nothing.
      resumedAt: null,

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
            timerAnchors: {},
            // Nothing was resumed: this one starts here, in front of the team.
            resumedAt: null
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
          // A deterioration is the team moving, so the resume line has done its
          // job — and it would otherwise sit above a protocol it never named.
          resumedAt: null,
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
          set({ currentStepIndex: currentStepIndex - 1, resumedAt: null });
        }
      },

      // The single step-change choke point: the runner's advance() and its
      // decision answers both route through here (neither logs from the store),
      // which is why retiring the resume line needs exactly one clear. `Back`
      // is the only other step change, and prevStep above clears it too.
      goToStep: (index) => set({ currentStepIndex: index, resumedAt: null }),

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
            timerAnchors: {},
            resumedAt: null
          });
        } else {
          set({
            isEmergencyActive: false,
            activeProtocol: null,
            currentStepIndex: 0,
            currentScreen: 'home',
            timerAnchors: {},
            resumedAt: null
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
      // a later emergency never inherits a spent clock. Persisted alongside
      // activeEvent (Task 0.2) — these are WALL-CLOCK ISO timestamps, so they
      // still mean the same thing after a reload; a performance.now() reading
      // would not, and must never be stored here.
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

      // Currently unwired (endEmergency is the live path). Note before anything
      // calls it: it archives the event but leaves `isEmergencyActive` set, so
      // it must also clear the emergency flags — otherwise it persists exactly
      // the eventless-active blob that `merge` now refuses to resume.
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
      // ALWAYS a defined storage. Passing `storage: undefined` for the real
      // build did not fall back to zustand's default — an explicit undefined
      // still wins the options spread, and persist then short-circuits into its
      // "storage unavailable" mode: no api.persist, no writes, nothing saved at
      // all. Name the storage for both branches instead.
      storage: createJSONStorage(() => (isDemoMode ? sessionStorage : localStorage)),
      // Bump `version` whenever the persisted shape below changes, and handle
      // the upgrade in `migrate`. Without this, a schema change silently
      // corrupts rehydrated eventHistory / practiceSetup from older installs.
      version: 3,
      partialize: (state): PersistedAppState => ({
        practiceSetup: state.practiceSetup,
        eventHistory: state.eventHistory,
        isVoiceEnabled: state.isVoiceEnabled,
        isEmergencyActive: state.isEmergencyActive,
        // The ID, NEVER the Protocol object. A stored Protocol is a snapshot of
        // every step's clinical text; resuming from it after an app update
        // would put OLD doses and OLD wording back in front of the team. The
        // live object is re-resolved from data/protocols on every rehydrate.
        activeProtocolId: state.activeProtocol?.id ?? null,
        currentStepIndex: state.currentStepIndex,
        activeEvent: state.activeEvent,
        timerAnchors: state.timerAnchors,
        // Task 0.6: a reload must not silently end the drill and re-arm the
        // real 999 dialler. See PersistedAppState.
        isTrainingMode: state.isTrainingMode
      }),
      migrate: (persistedState, version): PersistedAppState => {
        const state = (persistedState ?? {}) as Partial<PersistedAppState>;
        // Shared by both branches — these keys mean the same thing in every
        // version, and every one of them also guards a partially-written or
        // hand-edited blob.
        const carried = {
          practiceSetup: state.practiceSetup ?? null,
          // Element-wise: one malformed record must not cost the whole archive.
          eventHistory: Array.isArray(state.eventHistory)
            ? state.eventHistory.filter(isEmergencyEventish)
            : [],
          isVoiceEnabled: typeof state.isVoiceEnabled === 'boolean' ? state.isVoiceEnabled : true,
          // New in v3, so absent from every shape this function can be handed.
          // Absent means OFF, never "unknown, keep the last value": defaulting
          // a training guard ON would put a confirmation dialog in front of a
          // REAL 999 call.
          isTrainingMode: false
        };

        // v2 -> v3. THIS is the branch the M4 note below warned about: a v2
        // blob can hold an emergency that is still in flight, so every
        // emergency key is carried across untouched and `merge` (which is the
        // only place that decides resumability) sees exactly what it would
        // have seen without the version bump. Blanking them here would throw
        // away a live medico-legal record on an app update.
        if (version === 2) {
          return {
            ...carried,
            isEmergencyActive: state.isEmergencyActive ?? false,
            activeProtocolId: state.activeProtocolId ?? null,
            currentStepIndex: state.currentStepIndex ?? 0,
            activeEvent: state.activeEvent ?? null,
            timerAnchors: state.timerAnchors ?? {}
          };
        }

        // v0 (unversioned) / v1 -> v3: those shapes carried no emergency at
        // all, so the emergency keys take their defaults and the app boots
        // idle.
        //
        // M4: this used to ignore `version` entirely, which was correct while
        // v0 and v1 were the only inputs — both predate the emergency keys, so
        // "drop the emergency, keep the archive" held for all of them. It is
        // NOT correct for v2, which is why the branch above exists. Any future
        // version must decide for itself which side of that line it is on.
        return {
          ...carried,
          isEmergencyActive: false,
          activeProtocolId: null,
          currentStepIndex: 0,
          activeEvent: null,
          timerAnchors: {}
        };
      },
      // Rehydration decides whether the saved emergency can actually be
      // RESUMED, and does it here rather than after the fact so the store is
      // never momentarily in the "active but protocolless" shape App.tsx routes
      // on.
      //
      // The input is `unknown` on purpose. It is a JSON blob off disk, and the
      // previous `as Partial<PersistedAppState>` cast made TypeScript assert a
      // shape nothing had verified. `PersistedAppState` remains the WRITE
      // contract (partialize/migrate); reads narrow.
      //
      // M1: when the stored `version` matches, zustand does not write the merged
      // result back — so an unresumable close (the orphaned event moved into
      // eventHistory) lives in memory until the next ordinary store write
      // flushes it. Benign: the close is idempotent, so booting twice off the
      // same blob lands in the same place, with no duplicate archive entry.
      merge: (persistedState, currentState): AppState => {
        // A corrupt blob must NEVER throw out of here. zustand swallows the
        // throw inside hydrate().catch, so `set(stateFromStorage, true)` never
        // runs, the store keeps its factory defaults, and the next ordinary
        // write then serialises those empty defaults straight over the blob —
        // practiceSetup and every archived emergency gone from disk. Falling
        // back to the in-memory defaults loses one reload; throwing loses the
        // medico-legal record.
        try {
          const p: Record<string, unknown> =
            typeof persistedState === 'object' &&
            persistedState !== null &&
            !Array.isArray(persistedState)
              ? (persistedState as Record<string, unknown>)
              : {};

          const base: AppState = {
            ...currentState,
            practiceSetup:
              p.practiceSetup !== undefined
                ? (p.practiceSetup as PracticeSetup | null)
                : currentState.practiceSetup,
            // Salvaged element-wise: ONE malformed record must not discard the
            // whole archive.
            eventHistory: Array.isArray(p.eventHistory)
              ? p.eventHistory.filter(isEmergencyEventish)
              : currentState.eventHistory,
            isVoiceEnabled:
              typeof p.isVoiceEnabled === 'boolean' ? p.isVoiceEnabled : currentState.isVoiceEnabled,
            // Narrowed to exactly `true`, and OFF for anything else — a blob
            // written by an older build has no such key, and a truthy string
            // from a hand-edited one must not arm a guard in front of a real
            // 999 call.
            isTrainingMode: p.isTrainingMode === true
          };

          // Re-resolve the protocol from the LIVE data by id — see partialize.
          const protocolId = typeof p.activeProtocolId === 'string' ? p.activeProtocolId : null;
          const protocol = protocolId
            ? protocols.find((candidate) => candidate.id === protocolId) ?? null
            : null;
          const stepIndex = Number.isInteger(p.currentStepIndex)
            ? (p.currentStepIndex as number)
            : 0;
          const savedEvent = isEmergencyEventish(p.activeEvent) ? p.activeEvent : null;

          // `savedEvent` is part of the resumability test, not just cargo. An
          // emergency with no event is not an emergency: addEventLog,
          // log999Called and anchorTimer all no-op without one, so the runner
          // would come back on screen with the seizure clock unable to anchor
          // and endEmergency archiving nothing. Failing this falls through to
          // the inactive path below, which is safe — there is no event to close,
          // so the archive is untouched.
          if (
            p.isEmergencyActive === true &&
            protocol &&
            savedEvent &&
            stepIndex >= 0 &&
            stepIndex < protocol.steps.length
          ) {
            return {
              ...base,
              isEmergencyActive: true,
              activeProtocol: protocol,
              currentStepIndex: stepIndex,
              currentScreen: 'protocol',
              activeEvent: savedEvent,
              timerAnchors: isAnchorMap(p.timerAnchors) ? p.timerAnchors : {},
              // Stamped HERE, atomically with the resume decision, so the flag
              // and the resumed emergency can never disagree — an effect that
              // set it afterwards would have a window where the runner is on
              // screen mid-protocol with no sign that anything happened.
              resumedAt: new Date().toISOString()
            };
          }

          // Not resumable: the protocol id is gone from the data, or an update
          // shortened the protocol out from under the saved index. Close the
          // flow — but move the orphaned event into history first. Losing the
          // record as well would compound the failure.
          return {
            ...base,
            eventHistory: savedEvent
              ? [...base.eventHistory, closeUnresumableEvent(savedEvent)]
              : base.eventHistory,
            isEmergencyActive: false,
            activeProtocol: null,
            currentStepIndex: 0,
            activeEvent: null,
            timerAnchors: {},
            // Nothing resumed, so there is nothing to announce.
            resumedAt: null
          };
        } catch (err) {
          console.error('[appStore] persist merge failed; falling back to in-memory defaults', err);
          return { ...currentState };
        }
      },
      onRehydrateStorage: () => (state) => {
        // A reload loses the side-effects startEmergency fired. Re-arm them for
        // a resumed emergency; `merge` has already guaranteed anything active
        // here really is resumable. No pagehide/visibilitychange flush is
        // needed to go with this: persist writes synchronously on every `set`,
        // so the record is already durable, and flushing activeEvent into
        // eventHistory would double-record it when the resumed emergency is
        // later ended normally.
        if (!state || typeof window === 'undefined') return;
        if (state.isEmergencyActive && state.activeProtocol) {
          enableWakeLock();
          enterEmergencyChrome();
        }
      }
    }
  )
);

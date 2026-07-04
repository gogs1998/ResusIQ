import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppScreen,
  Protocol,
  ProtocolStep,
  EmergencyEvent,
  EventLogEntry,
  PracticeSetup,
  EventType
} from '../types';
import { protocols } from '../data/protocols';
import { enableWakeLock, disableWakeLock } from '../lib/wakeLock';
import { newId } from '../lib/ids';

interface AppState {
  // Navigation
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  
  // Emergency Mode
  isEmergencyActive: boolean;
  activeProtocol: Protocol | null;
  currentStepIndex: number;
  startEmergency: (protocolId: string, source?: 'tile' | 'triage' | 'library') => void;
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
      
      startEmergency: (protocolId, source) => {
        const protocol = protocols.find(p => p.id === protocolId);
        if (protocol) {
          // Decisive entry (tile tap) skips leading recognition/symptom steps —
          // the user already chose the condition, so lead with the action.
          // Triage/library keep them (arrived via uncertainty).
          const startIndex = source === 'tile' ? firstActionStepIndex(protocol.steps) : 0;
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
            activeEvent: event
          });
          // Keep screen awake during emergency (re-acquires on foreground)
          enableWakeLock();
        }
      },
      
      // Mid-emergency deterioration: swap the active protocol WITHOUT starting a
      // new event — the log and elapsed clock continue (a second event would
      // fracture the medico-legal record). The single code path for switching
      // protocols mid-emergency: EscapeRail calls it directly, and a protocol
      // step's `switch_protocol:<id>` action routes through it via
      // runStepActions (so the anaphylaxis→CPR handoff is one graph edge, not a
      // hand-wired branch). Applies the same
      // leading-recognition skip a decisive tile entry uses, so e.g.
      // cardiac_arrest lands on its first action step, not a recognition step.
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
        set({
          isEmergencyActive: true,
          activeProtocol: protocol,
          currentStepIndex: firstActionStepIndex(protocol.steps),
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
              if (EVENT_TYPES.has(arg as EventType)) {
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
        // Release wake lock (also stops the foreground re-acquire)
        disableWakeLock();
        if (activeEvent) {
          const completedEvent = { ...activeEvent, completed: true };
          set({ 
            isEmergencyActive: false,
            activeProtocol: null,
            currentStepIndex: 0,
            currentScreen: 'home',
            activeEvent: null,
            eventHistory: [...eventHistory, completedEvent]
          });
        } else {
          set({ 
            isEmergencyActive: false,
            activeProtocol: null,
            currentStepIndex: 0,
            currentScreen: 'home'
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
            eventHistory: [...eventHistory, completedEvent]
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
      name: 'resusiq-storage',
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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppScreen,
  Protocol,
  EmergencyEvent,
  EventLogEntry,
  PracticeSetup,
  EventType
} from '../types';
import { protocols } from '../data/protocols';
import { enableWakeLock, disableWakeLock } from '../lib/wakeLock';

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
  setProtocol: (protocol: Protocol | null) => void;
  nextStep: () => void;
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
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            protocol_id: protocolId,
            protocol_version: '2026.1',
            practice_id: get().practiceSetup?.id || 'unknown',
            events: [{
              id: crypto.randomUUID(),
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
      // new event — the log and elapsed clock continue. This is the single code
      // path for a `switch_protocol:<id>` action (EscapeRail calls it directly;
      // ProtocolRunner routes step actions through it too). Applies the same
      // leading-recognition skip a decisive tile entry uses, so e.g.
      // cardiac_arrest lands on its first action step, not a recognition step.
      switchProtocol: (protocolId) => {
        const protocol = protocols.find(p => p.id === protocolId);
        if (!protocol) return;
        set({
          isEmergencyActive: true,
          activeProtocol: protocol,
          currentStepIndex: firstActionStepIndex(protocol.steps),
          currentScreen: 'protocol',
        });
        // Records the switch on the SAME event log (no-op if none is active).
        get().addEventLog('custom', `Switched to: ${protocol.title}`);
      },

      setProtocol: (protocol) => set({ activeProtocol: protocol, currentStepIndex: 0 }),
      
      nextStep: () => {
        const { activeProtocol, currentStepIndex } = get();
        if (activeProtocol && currentStepIndex < activeProtocol.steps.length - 1) {
          const newIndex = currentStepIndex + 1;
          set({ currentStepIndex: newIndex });
          get().addEventLog('step_completed', `Step: ${activeProtocol.steps[newIndex].id}`);
        }
      },
      
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
          id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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

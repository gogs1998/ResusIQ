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
import { requestWakeLock } from '../main';

// Wake lock handle (keep screen on during emergencies)
let wakeLockHandle: any = null;

interface AppState {
  // Navigation
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  
  // Emergency Mode
  isEmergencyActive: boolean;
  activeProtocol: Protocol | null;
  currentStepIndex: number;
  startEmergency: (protocolId: string) => void;
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
  addEventLog: (type: EventType, label: string, details?: string) => void;
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
      
      startEmergency: (protocolId) => {
        const protocol = protocols.find(p => p.id === protocolId);
        if (protocol) {
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
            currentStepIndex: 0,
            currentScreen: 'protocol',
            activeEvent: event
          });
          // Keep screen awake during emergency
          requestWakeLock().then(lock => { wakeLockHandle = lock; });
        }
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
        // Release wake lock
        if (wakeLockHandle) {
          try { wakeLockHandle.release(); } catch { /* ignore */ }
          wakeLockHandle = null;
        }
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
      
      addEventLog: (type, label, details) => {
        const { activeEvent } = get();
        if (activeEvent) {
          const entry: EventLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type,
            label,
            details
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
      toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
      
      // Practice Setup
      practiceSetup: null,
      setPracticeSetup: (setup) => set({ practiceSetup: setup }),
      
      // Training Mode
      isTrainingMode: false,
      setTrainingMode: (enabled) => set({ isTrainingMode: enabled })
    }),
    {
      name: 'resusiq-storage',
      partialize: (state) => ({
        practiceSetup: state.practiceSetup,
        eventHistory: state.eventHistory,
        isVoiceEnabled: state.isVoiceEnabled
      })
    }
  )
);

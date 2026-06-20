// Core types for ResusIQ - Medical Emergency Protocol App

// ==================== PROTOCOL TYPES ====================

export type StepType = 
  | 'instruction' 
  | 'drug' 
  | 'timer_block' 
  | 'decision' 
  | 'cpr_mode' 
  | 'call_emergency' 
  | 'handover'
  | 'role_assignment';

export interface ProtocolStep {
  id: string;
  type: StepType;
  say: string;
  show: string;
  actions?: string[];
  drug_id?: string;
  require_confirm?: boolean;
  duration_seconds?: number;
  on_timer_end_next?: string;
  question?: string;
  answers?: { label: string; next: string }[];
  next?: string;
  roles?: RoleAssignment[];
  metronome_bpm?: number;
  compressions_per_cycle?: number;
  breaths_per_cycle?: number;
}

export interface RoleAssignment {
  role: string;
  task: string;
}

export interface TriageQuestion {
  id: string;
  text: string;
  type: 'boolean' | 'choice' | 'optional';
  choices?: string[];
}

export interface EntryCriteria {
  question_id: string;
  equals?: boolean;
  contains?: string;
}

export interface Protocol {
  id: string;
  title: string;
  category: EmergencyCategory;
  icon: string;
  color: string;
  entry_criteria: EntryCriteria[];
  steps: ProtocolStep[];
  references: string[];
}

// A single age-banded paediatric dose. dose/volume_ml are strings because
// guidance gives ranges for some bands (e.g. <6 months = 100–150 micrograms);
// never coerce these to a single number or strip the dash.
export interface ChildDoseBand {
  label: string;        // e.g. "6 months – 6 years"
  dose: string;         // e.g. "150 micrograms"
  volume_ml?: string;   // e.g. "0.15 ml"
  min_age_months?: number;
  max_age_months?: number;
}

export interface Drug {
  id: string;
  name: string;
  indication: string;
  adult_dose: string;
  adult_dose_text: string;
  child_dose?: string;
  child_dose_text?: string;
  // Structured age bands; when present, UI renders these instead of the
  // free-text child_dose/child_dose_text (kept as fallback for other drugs).
  child_dose_bands?: ChildDoseBand[];
  route: 'IM' | 'IV' | 'SL' | 'INH' | 'ORAL' | 'BUCCAL';
  site?: string;
  how_to_give: string;
  repeat_interval_min?: number;
  max_doses?: number;
  warnings: string[];
  contraindications?: string[];
  references: string[];
}

export interface ProtocolPack {
  pack_id: string;
  pack_version: string;
  last_updated: string;
  source: string;
  protocols: Protocol[];
  drugs: Drug[];
  triage_questions: TriageQuestion[];
}

// ==================== EMERGENCY CATEGORIES ====================

export type EmergencyCategory = 
  | 'unconscious'
  | 'breathing'
  | 'cardiac'
  | 'allergic'
  | 'metabolic'
  | 'neurological'
  | 'airway'
  | 'stroke';

export interface EmergencyTile {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  protocol_id: string;
  priority: number;
}

// ==================== PRACTICE SETUP ====================

export interface PracticeSetup {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  aed_present: boolean;
  aed_location?: string;
  oxygen_present: boolean;
  oxygen_location?: string;
  drugs_kit_location?: string;
  last_kit_check?: string;
  staff_roles: StaffRole[];
  equipment: EquipmentItem[];
}

export interface StaffRole {
  id: string;
  name: string;
  default_tasks: string[];
}

export interface EquipmentItem {
  id: string;
  name: string;
  present: boolean;
  location?: string;
  expiry_date?: string;
  quantity?: number;
}

// ==================== EVENT LOGGING ====================

export interface EmergencyEvent {
  id: string;
  timestamp: string;
  protocol_id: string;
  protocol_version: string;
  practice_id: string;
  events: EventLogEntry[];
  outcome?: string;
  notes?: string;
  staff_initials?: string[];
  completed: boolean;
}

export interface EventLogEntry {
  id: string;
  timestamp: string;
  type: EventType;
  label: string;
  details?: string;
  step_id?: string;
  drug_id?: string;
  confirmed_by?: string;
}

export type EventType = 
  | 'protocol_started'
  | 'step_completed'
  | 'drug_given'
  | 'drug_confirmed'
  | '999_called'
  | 'aed_attached'
  | 'shock_delivered'
  | 'rosc'
  | 'oxygen_started'
  | 'symptoms_started'
  | 'ambulance_arrived'
  | 'handover'
  | 'custom';

// ==================== UI STATE ====================

export type AppScreen = 
  | 'home'
  | 'emergency'
  | 'triage'
  | 'protocol'
  | 'drugs'
  | 'timers'
  | 'event_log'
  | 'setup'
  | 'training'
  | 'reports'
  | 'protocol_library'
  | 'call_999'
  | 'sbar'
  | 'ai_assistant';

export interface AppState {
  currentScreen: AppScreen;
  activeProtocol: Protocol | null;
  currentStepIndex: number;
  activeEmergencyEvent: EmergencyEvent | null;
  practiceSetup: PracticeSetup | null;
  isVoiceEnabled: boolean;
  isMuted: boolean;
  triageAnswers: Record<string, boolean | string>;
}

// ==================== VOICE ====================

export interface VoiceCommand {
  phrases: string[];
  action: string;
}

export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice?: SpeechSynthesisVoice;
}

// ==================== TRAINING ====================

export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  protocol_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  time_limit_seconds?: number;
  key_steps: string[];
}

export interface TrainingSession {
  id: string;
  scenario_id: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  steps_completed: string[];
  mistakes: string[];
  time_taken_seconds: number;
}

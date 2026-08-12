/**
 * UI identity for the 10 emergencies — labels, scan-cues, and colour marks.
 * Not clinical content: protocol wording and doses live in data/protocols.ts.
 * Ranked by acuity so the home grid can put life-threats above the rest.
 */
export type ConditionTone = 'critical' | 'severe' | 'urgent' | 'standard';

export interface ConditionTile {
  id: string;
  label: string;
  cue: string;
  icon: string;
  tone: ConditionTone;
}

export const CONDITIONS: ConditionTile[] = [
  { id: 'cardiac_arrest', label: 'Cardiac arrest', cue: 'Unresponsive, not breathing', icon: 'HeartPulse', tone: 'critical' },
  { id: 'anaphylaxis', label: 'Anaphylaxis', cue: 'Sudden swelling, rash, or wheeze', icon: 'ShieldAlert', tone: 'severe' },
  { id: 'choking', label: 'Choking', cue: 'Cannot speak or cough', icon: 'Wind', tone: 'severe' },
  { id: 'chest_pain', label: 'Chest pain', cue: 'Pain, tightness, or crushing', icon: 'Heart', tone: 'severe' },
  { id: 'stroke', label: 'Stroke', cue: 'Face, arm, or speech', icon: 'Zap', tone: 'severe' },
  { id: 'asthma', label: 'Asthma attack', cue: 'Wheeze, tight chest', icon: 'Stethoscope', tone: 'urgent' },
  { id: 'hypoglycaemia', label: 'Low blood sugar', cue: 'Confused, sweaty, known diabetic', icon: 'Droplet', tone: 'urgent' },
  { id: 'seizure', label: 'Seizure', cue: 'Shaking or unresponsive', icon: 'Brain', tone: 'urgent' },
  { id: 'adrenal_crisis', label: 'Adrenal crisis', cue: 'On steroids and collapsed', icon: 'AlertOctagon', tone: 'urgent' },
  { id: 'syncope', label: 'Fainting', cue: 'Collapsed, now recovering', icon: 'CircleOff', tone: 'standard' },
];

export const CONDITION_MARK: Record<string, string> = {
  cardiac_arrest: 'var(--cond-cardiac)',
  anaphylaxis: 'var(--cond-anaphyl)',
  choking: 'var(--cond-choking)',
  asthma: 'var(--cond-asthma)',
  chest_pain: 'var(--cond-chest)',
  hypoglycaemia: 'var(--cond-hypo)',
  seizure: 'var(--cond-seizure)',
  syncope: 'var(--cond-faint)',
  stroke: 'var(--cond-stroke)',
  adrenal_crisis: 'var(--cond-adrenal)',
};

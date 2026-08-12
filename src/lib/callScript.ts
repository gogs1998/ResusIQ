import type { EventLogEntry } from '../types';

export function drugWasGiven(events: EventLogEntry[] | undefined, match: string): boolean {
  const needle = match.toLowerCase();
  return (events ?? []).some(
    (e) =>
      e.type === 'drug_given' &&
      (e.drug_id?.toLowerCase().includes(needle) || e.label.toLowerCase().includes(needle))
  );
}

/** Dispatcher-facing one-liner. Only asserts a drug was given when the event log says so. */
export function getPatientState(protocolId: string | undefined, events: EventLogEntry[] | undefined): string {
  if (!protocolId) return 'Unwell — requires emergency assessment';
  switch (protocolId) {
    case 'cardiac_arrest':
      return 'Unconscious and not breathing. CPR in progress.';
    case 'anaphylaxis':
      return drugWasGiven(events, 'adrenaline')
        ? 'Suspected anaphylaxis. Adrenaline given IM.'
        : 'Suspected anaphylaxis — adrenaline not yet given.';
    case 'asthma':
      return drugWasGiven(events, 'salbutamol')
        ? 'Severe asthma. Salbutamol given.'
        : 'Severe asthma — salbutamol not yet given.';
    case 'hypoglycaemia':
      return 'Hypoglycaemia. Known diabetic.';
    case 'syncope':
      return 'Collapsed / fainted. Lying flat.';
    case 'seizure':
      return 'Having a seizure / post-seizure.';
    case 'chest_pain':
      return drugWasGiven(events, 'aspirin')
        ? 'Chest pain, suspected heart attack. Aspirin given.'
        : 'Chest pain, suspected heart attack — aspirin not yet given.';
    case 'choking':
      return 'Choking. Back blows and abdominal thrusts being given.';
    case 'stroke':
      return 'Suspected stroke. FAST positive.';
    case 'adrenal_crisis':
      return 'Suspected adrenal crisis. Patient on steroids.';
    default:
      return 'Unwell — requires emergency assessment';
  }
}

export function buildScriptLines(opts: {
  protocolId?: string;
  protocolTitle?: string;
  practiceName?: string;
  address?: string;
  postcode?: string;
  phone?: string;
  events?: EventLogEntry[];
}): { label: string; text: string }[] {
  const address = opts.address || '[Practice address not set]';
  const postcode = opts.postcode || '[Postcode not set]';
  const phone = opts.phone || '[Phone not set]';
  const practiceName = opts.practiceName || 'Dental Practice';
  const emergencyType = opts.protocolTitle || 'Medical Emergency';
  return [
    { label: 'Service', text: 'AMBULANCE' },
    { label: 'Location', text: `${practiceName}, ${address}, ${postcode}` },
    { label: 'Phone', text: phone },
    { label: 'Emergency', text: emergencyType },
    { label: 'Patient', text: 'Adult patient at dental practice' },
    { label: 'State', text: getPatientState(opts.protocolId, opts.events) },
  ];
}

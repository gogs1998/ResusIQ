import type { Drug, EmergencyEvent } from '../types';

// What a drug's `max_doses` MEANS at the confirm button.
//
// The number alone does not say — and treating every ceiling the same way was
// clinically wrong (ruling 2026-08-13). Two different things are encoded in one
// field:
//
//   max_doses === 1  — a true ceiling. The dose must not be repeated
//     (midazolam: respiratory depression) or the practice kit physically holds
//     one (glucagon). There is no clinical circumstance in a dental practice
//     where the app should help give a second, so the confirm control is
//     withdrawn. No override gesture exists, deliberately: a clinician acting
//     outside the app records through the normal log path, so the block sits on
//     the action affordance and never on the record.
//
//   max_doses > 1   — an escalation threshold, not a ban. Reaching it means the
//     treatment is not working and the team must escalate, but a further dose
//     can still be the right call (more oral glucose once the patient is awake
//     and swallowing safely). Blocking here would stop a clinician recording a
//     dose they judged necessary, which corrupts the record rather than
//     protecting the patient. The confirm stays live; the UI states the
//     escalation instead.
export type DoseLimitClass = 'hard_block' | 'escalation';

export function doseLimitClass(drug: Drug): DoseLimitClass | null {
  if (drug.max_doses === undefined) return null;
  return drug.max_doses === 1 ? 'hard_block' : 'escalation';
}

/** True once the recorded doses of `drug` have reached its declared ceiling. */
export function isAtDoseLimit(drug: Drug, dosesGiven: number): boolean {
  return drug.max_doses !== undefined && dosesGiven >= drug.max_doses;
}

/**
 * What the runner says once a capped drug reaches its limit. Clinical copy,
 * prescribed verbatim by the clinical reviewer — treat a change here as a
 * clinical change, not a wording tweak.
 *
 * `{time}` in a hard-block hero is replaced with the wall-clock time of the dose
 * already on the record, so the operator can see whether the interval that
 * matters has passed rather than guessing. Escalation heroes carry no time: what
 * matters there is the count, not when.
 *
 * Coverage of every capped drug is held by the data-integrity tests.
 */
export interface DoseLimitNotice {
  hero: string;
  detail: string;
}

export const DOSE_LIMIT_NOTICES: Record<string, DoseLimitNotice> = {
  midazolam_buccal: {
    hero: 'Midazolam already given at {time}',
    detail:
      'Single dose only — do not repeat. Keep their airway clear and have suction ready. If the seizure has not stopped 10 minutes after the dose, tell the 999 call handler.',
  },
  glucagon_im: {
    hero: 'Glucagon already given at {time}',
    detail:
      'One dose is all the practice kit holds. It takes 10 to 15 minutes to work. Keep them in the recovery position, wait for the ambulance, and give oral glucose as soon as they can swallow safely.',
  },
  glucose_oral: {
    hero: '3 doses given — this is not responding',
    detail:
      'Call 999 now. Check they are fully awake and can swallow safely before giving any more.',
  },
  gtn_sublingual: {
    hero: '3 sprays given — treat this as a heart attack',
    detail:
      'Call 999 now. Do not give more GTN if they are light-headed or their systolic BP is below 100.',
  },
};

/** ISO timestamp of the most recent recorded dose of `drugId`, or null. */
export function lastDoseTimestamp(
  event: EmergencyEvent | null,
  drugId: string | undefined
): string | null {
  if (!event || !drugId) return null;
  let latest: string | null = null;
  for (const e of event.events) {
    if (e.type === 'drug_given' && e.drug_id === drugId) {
      if (latest === null || new Date(e.timestamp) > new Date(latest)) latest = e.timestamp;
    }
  }
  return latest;
}

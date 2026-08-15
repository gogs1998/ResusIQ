import type { EmergencyEvent } from '../types';

// Who may assert that 999 has been called.
//
// Clinical ruling R2 (2026-08-13): a "Call 999 now" step used to carry
// `log:999_called` in its actions, so tapping the generic "Done — next step"
// painted the timer strip green as if the ambulance had been dialled — while
// someone was still hunting for a phone. The log entry now records only what the
// team explicitly asserts, from two places: the persistent tel:999 pill, and the
// primary control of the confirm footer below.
//
// The four steps whose whole instruction IS "call 999". Held to the data by the
// data-integrity tests (each id exists, sits in the named protocol, and still
// carries `suggest:call_999`).
//
// Deliberately NOT every step that suggests 999: hypoglycaemia, asthma and
// seizure raise 999 as one option inside a wider decision, and giving them the
// same two-control footer was ruled a later, non-blocking change (R2, F17).
export const CALL_999_CONFIRM_STEPS: readonly { protocol: string; step: string }[] = [
  { protocol: 'anaphylaxis', step: 'call_help' },
  { protocol: 'chest_pain', step: 'call_999_chest' },
  { protocol: 'stroke', step: 'time_call' },
  { protocol: 'adrenal_crisis', step: 'call_999_adrenal' },
];

/**
 * True when this step's footer must ask the team whether 999 was actually
 * called, instead of the generic Done. Matched on protocol AND step id: step ids
 * are only unique within a protocol.
 */
export function requires999Confirm(
  protocolId: string | undefined,
  stepId: string | undefined
): boolean {
  if (!protocolId || !stepId) return false;
  return CALL_999_CONFIRM_STEPS.some((s) => s.protocol === protocolId && s.step === stepId);
}

/** True once this emergency already holds a 999 call on the record. */
export function has999Called(event: EmergencyEvent | null): boolean {
  return !!event?.events.some((e) => e.type === '999_called');
}

// Footer copy for the confirm pair. The secondary is clinically mandatory (R2):
// treatment must never gate behind asserting a phone call, because the
// delegated-call workflow — one person dials while another treats — is the
// guideline-concordant one. It advances and logs nothing.
export const CALL_999_CONFIRMED_LABEL = '999 called — continue';
export const CALL_999_NOT_YET_LABEL = 'Not yet — continue anyway';

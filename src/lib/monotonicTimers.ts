// Which timer_block steps measure ONE elapsing thing, and which measure "wait N
// from now".
//
// Most timer_blocks are the second kind and MUST restart on each pass: the
// anaphylaxis 5-minute adrenaline reassess, the hypoglycaemia wait-and-recheck.
// Their loop is "do the thing, wait the interval, look again", so a timer that
// carried its remaining time across passes would break the q5min adrenaline
// repeat — a CLAUDE.md non-negotiable.
//
// The seizure clock is the first kind, and treating it like the second was the
// defect (Grok F9). `time_seizure` counts the seizure itself, not an interval:
// the graph loops time_seizure -> prolonged_seizure -> "still under 5 minutes"
// -> continue_timing -> back to time_seizure, and each arrival remounted a fresh
// 300-second countdown. A team answering honestly at a real 3 minutes was handed
// another full 5 minutes, so status epilepticus — 999 and buccal midazolam —
// could be deferred indefinitely by a loop the operator could not see.
//
// Clinical ruling R4 (2026-08-13): anchor one monotonic wall clock at the FIRST
// arrival, never reset it on re-entry, and at 5 minutes route to the
// still-seizing check. The check, not the drug: a seizure that has stopped
// answers "Seizure has stopped" there and goes to post-ictal care, so the clock
// can never walk a stopped seizure toward midazolam.
//
// Code-side and deliberately not a protocols.ts field: this is execution
// semantics, not clinical content, and protocol/drug data changes are clinical
// changes. The ids are held to the data by the data-integrity tests.
export const MONOTONIC_TIMER_STEPS: Readonly<Record<string, string>> = {
  seizure: 'time_seizure',
};

/** True when this step's countdown measures one continuous event, not an interval. */
export function isMonotonicTimerStep(
  protocolId: string | undefined,
  stepId: string | undefined
): boolean {
  if (!protocolId || !stepId) return false;
  return MONOTONIC_TIMER_STEPS[protocolId] === stepId;
}

/** Key under which this step's anchor is held for the active emergency. */
export function timerAnchorKey(protocolId: string, stepId: string): string {
  return `${protocolId}#${stepId}`;
}

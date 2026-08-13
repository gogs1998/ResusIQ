import type { Protocol } from '../types';
import { remainingSeconds } from './emergencyTimers';

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

/**
 * Seconds left on a protocol's monotonic clock, readable from ANY step in that
 * protocol — not just the timer step that owns it.
 *
 * Null when the protocol has no monotonic clock or has not reached it yet. 0
 * means spent. This is the single reading behind both the backstop route and
 * the answer suppression below, so the two can never disagree about whether
 * five minutes have passed.
 */
export function monotonicClockRemaining(
  protocol: Protocol | null | undefined,
  timerAnchors: Record<string, string>,
  now: Date
): number | null {
  if (!protocol) return null;
  const stepId = MONOTONIC_TIMER_STEPS[protocol.id];
  if (!stepId) return null;
  const anchor = timerAnchors[timerAnchorKey(protocol.id, stepId)];
  if (!anchor) return null;
  const step = protocol.steps.find((s) => s.id === stepId);
  if (!step?.duration_seconds) return null;
  return remainingSeconds(anchor, step.duration_seconds, now);
}

// Answers withdrawn once the clock is spent.
//
// Clinical ruling R4 follow-up (2026-08-13), on the loop this fix exposed: with
// the clock spent, answering "still under 5 minutes" sent the team to
// continue_timing, whose Done returned them to the timer step, which routed
// them straight back to the same question. A bounce through a screen they never
// got to read.
//
// The ruling withdraws that one answer rather than the bounce, because on a
// spent clock EVERY reason for choosing it — a mis-tap, a belief the seizure
// started later, or a SECOND seizure — is itself an indication to escalate
// (NICE NG217 §7, SDCEP: recurrence in quick succession is an indication in its
// own right). Nothing observable about the patient becomes unsayable: still
// seizing and stopped both survive, and the first answer now carries the
// recurrence criterion. Only the contradiction of the app's own measurement is
// withdrawn — the same principle as the midazolam hard block, which removes the
// affordance that helps do the wrong thing and never the ability to record what
// happened.
//
// Keyed on the graph edge, not the label: the labels are clinical copy and may
// be reworded, but the edge is what makes it the wrong door.
export const SPENT_CLOCK_SUPPRESSIONS: readonly {
  protocol: string;
  step: string;
  answerNext: string;
  note: string;
}[] = [
  {
    protocol: 'seizure',
    step: 'prolonged_seizure',
    answerNext: 'continue_timing',
    note: 'Past 5 minutes on the clock.',
  },
];

/** The suppression that applies to this step, or null. Caller checks the clock. */
export function spentClockSuppression(
  protocolId: string | undefined,
  stepId: string | undefined
): (typeof SPENT_CLOCK_SUPPRESSIONS)[number] | null {
  if (!protocolId || !stepId) return null;
  return (
    SPENT_CLOCK_SUPPRESSIONS.find((s) => s.protocol === protocolId && s.step === stepId) ?? null
  );
}

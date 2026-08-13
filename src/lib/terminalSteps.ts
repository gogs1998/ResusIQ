import type { Protocol, ProtocolStep } from '../types';

// Steps the protocol author meant as the end, and what the screen should say
// when the guidance runs out.
//
// These 14 steps declare no `next` and offer no answers. The runner's fallback
// is "advance to whatever sits next in the array", so they rendered the same
// "Done — next step" as every other screen and then walked the operator into an
// unrelated step. seizure.monitor_seizure fell through to post_ictal, whose
// first line is "Seizure stopped — recovery position": the app asserted the
// seizure had stopped because someone tapped a button that promised a next
// step. That is the same class of defect as the auto-logged 999 chip (F4) and
// the deck's adult-dose line (F8) — a claim with no evidence behind it — and it
// lands on the longest-dwell screens in the product.
//
// Clinical ruling (2026-08-13): ship all 14 or none, in two groups that differ
// only in what the line says, with ONE quiet `End emergency` across both.
//
//   GROUP A — still in the crisis, ambulance pending. The team is holding the
//   patient and watching. Deliberately NO extra friction here: a screen someone
//   sits on for twenty minutes must not train them to tap through a guard.
//
//   GROUP B — resolved, or stood down because this was not the emergency they
//   thought. Nothing is pending.
//
// "Ambulance handover" was rejected as a label: the app cannot witness a
// handover, and on Group B nobody is handing over anything.
export type TerminalGroup = 'awaiting_crew' | 'complete';

export const TERMINAL_LINES: Record<TerminalGroup, string> = {
  awaiting_crew: 'No further steps — stay with them until the crew take over.',
  complete: 'No further steps — this guide is complete.',
};

export const TERMINAL_STEPS: Readonly<Record<string, TerminalGroup>> = {
  // Group A — in crisis, ambulance pending.
  'cardiac_arrest#monitor': 'awaiting_crew',
  'asthma#reassess_severe': 'awaiting_crew',
  'hypoglycaemia#monitor_hypo': 'awaiting_crew',
  'syncope#recovery_position_syncope': 'awaiting_crew',
  'seizure#monitor_seizure': 'awaiting_crew',
  'seizure#call_999_first': 'awaiting_crew',
  'adrenal_crisis#monitor_adrenal': 'awaiting_crew',
  // Group B — resolved or stood down.
  'asthma#monitor_moderate': 'complete',
  'hypoglycaemia#recovery_hypo': 'complete',
  'syncope#assess_cause': 'complete',
  'seizure#monitor_recovery': 'complete',
  'choking#choking_resolved': 'complete',
  'stroke#not_stroke': 'complete',
  'adrenal_crisis#consider_other': 'complete',
};

/** The end-state group for this step, or null if the guidance continues. */
export function terminalGroup(
  protocolId: string | undefined,
  stepId: string | undefined
): TerminalGroup | null {
  if (!protocolId || !stepId) return null;
  return TERMINAL_STEPS[`${protocolId}#${stepId}`] ?? null;
}

/**
 * Steps that declare no onward route of their own — the set TERMINAL_STEPS must
 * cover exactly. Shared with the data-integrity tests so the list cannot drift
 * from the graph: a step that gains a `next` should leave this set, and a new
 * end state must be classified rather than silently inheriting a Done button.
 */
export function stepsWithoutOnwardRoute(protocol: Protocol): ProtocolStep[] {
  return protocol.steps.filter(
    (s) =>
      !s.next &&
      // A timer_block routes on expiry; that is an onward route, not an end.
      !s.on_timer_end_next &&
      (s.answers ?? []).length === 0 &&
      s.type !== 'decision' &&
      s.type !== 'cpr_mode' &&
      // A step whose action hands off to another protocol ends this protocol,
      // not the emergency — its CTA is already labelled for the destination.
      !(s.actions ?? []).some((a) => a.startsWith('switch_protocol:'))
  );
}

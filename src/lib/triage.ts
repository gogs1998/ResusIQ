// Triage routing predicates.
//
// Kept out of TriageWizard so the life-critical routing rule is testable on its
// own and cannot drift with the wizard's question order or React state timing.

/**
 * Cardiac-arrest fast-path: the patient is unresponsive AND not breathing
 * normally, which is cardiac_arrest's own entry criteria (`protocols.ts`).
 * Once both are answered there is nothing left for the questionnaire to
 * establish — every remaining question (rash, chest pain, seizure, choking,
 * stroke, wheeze) delays compressions on an arrested patient.
 *
 * Order-independent: it reads the answer set, not the question just answered,
 * so it fires whichever of the two is answered second.
 *
 * Deliberately strict (`=== false`). The wizard's boolean questions record real
 * booleans; anything else — a missing answer, or a free-text answer from a
 * future question type — is not an assertion of arrest and must not skip the
 * rest of triage.
 */
export function shouldFastPathToArrest(answers: Record<string, boolean | string>): boolean {
  return answers['conscious'] === false && answers['breathing_normally'] === false;
}

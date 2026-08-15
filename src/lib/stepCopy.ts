import type { ProtocolStep } from '../types';

// Pure copy helpers for the console runner. Kept out of the component so the
// duplicate-suppression rule — which decides whether a step's support line is
// shown at all — is unit-tested rather than buried inline. The console shows ONE
// instruction; a support line that only echoes the hero (a say≈show duplicate)
// is noise under stress and is suppressed here.

/**
 * Split a step's `show` into its hero (first line) and support (everything after
 * the first blank line). Convention across protocols.ts is `HERO\n\n<detail>`.
 * Support is '' when there is no detail.
 */
export function splitHero(show: string): { hero: string; support: string } {
  const [hero, ...rest] = show.split('\n\n');
  return { hero: hero ?? '', support: rest.join('\n\n') };
}

// Normalise for duplicate comparison: lowercase, strip punctuation, collapse
// whitespace. So "Start CPR now" and "start cpr now." compare equal.
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when `support` adds nothing over `hero`: it is empty, equals the hero, or
 * merely repeats the hero as a leading phrase. The caller then renders only the
 * hero. Directional on purpose — support that STARTS with the hero is an echo;
 * support that merely mentions a hero word mid-sentence is not.
 */
export function isDuplicateSupport(hero: string, support: string): boolean {
  const h = normalise(hero);
  const s = normalise(support);
  if (s === '') return true;
  if (h === '') return false;
  return s === h || s.startsWith(h);
}

/**
 * The protocol id a step's `switch_protocol:` action targets, or null if it has
 * none. Drives the footer button label and lets the runner know a step's
 * completion hands off to another protocol rather than advancing linearly.
 */
export function switchTargetId(step: Pick<ProtocolStep, 'actions'>): string | null {
  const prefix = 'switch_protocol:';
  const action = (step.actions ?? []).find((a) => a.startsWith(prefix));
  return action ? action.slice(prefix.length) : null;
}

/**
 * Footer-button label for a step that switches protocol — named for the
 * destination so the button announces where the tap goes ("Start CPR now"),
 * not a generic "next". All current switch targets are cardiac_arrest.
 */
export function switchButtonLabel(targetId: string): string {
  return targetId === 'cardiac_arrest' ? 'Start CPR now' : 'Continue';
}

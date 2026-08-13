import type { CSSProperties } from 'react';

/**
 * How loudly a condition asks to be found.
 *
 * The grid used to be ten identical pale cards in alphabetical-ish order, so
 * cardiac arrest and fainting competed for the same glance and the only thing
 * separating them was a small red tint behind an icon (Grok UX1). Under
 * adrenaline that is not a hierarchy, it is a list — and the operator either
 * reads all ten or gives up and dials 999.
 *
 * Ranking is by how fast an untreated case kills, which is also the order a
 * dental team would be taught:
 *   critical — minutes, and the treatment is CPR. One condition, and it gets
 *              the whole width.
 *   severe   — life-threatening now; the four that need adrenaline, an airway,
 *              999 and a clock.
 *   urgent   — serious, treatable in the chair, rarely fatal within minutes.
 *   standard — usually self-limiting. Fainting sits last on purpose: it is the
 *              most COMMON thing a practice sees, and putting the most common
 *              thing first is what made the grid unreadable.
 */
export type TileTone = 'critical' | 'severe' | 'urgent' | 'standard';

// Each tile: plain-English name (the lay word a panicking carer recognises) plus
// one navigational cue line. Cue copy is fixed — a glance-level "is this the one?"
// hint, NOT a clinical instruction. `cond` is the per-condition icon hue token
// from colors.css. Order here IS the render order; it is asserted in the
// data-integrity tests so a well-meaning alphabetisation cannot bury CPR.
export const TILES: {
  id: string;
  label: string;
  icon: string;
  cue: string;
  cond: string;
  tone: TileTone;
}[] = [
  { id: 'cardiac_arrest', label: 'Cardiac arrest', icon: 'HeartPulse', cue: 'Not breathing · start CPR', cond: 'var(--cond-cardiac)', tone: 'critical' },
  { id: 'anaphylaxis', label: 'Anaphylaxis', icon: 'ShieldAlert', cue: 'Severe allergic reaction', cond: 'var(--cond-anaphyl)', tone: 'severe' },
  { id: 'choking', label: 'Choking', icon: 'Wind', cue: 'Airway blocked', cond: 'var(--cond-choking)', tone: 'severe' },
  { id: 'chest_pain', label: 'Chest pain', icon: 'Heart', cue: 'Suspected heart attack', cond: 'var(--cond-chest)', tone: 'severe' },
  { id: 'stroke', label: 'Stroke', icon: 'Zap', cue: 'Face · arm · speech', cond: 'var(--cond-stroke)', tone: 'severe' },
  { id: 'asthma', label: 'Asthma attack', icon: 'Stethoscope', cue: "Wheeze · can't speak", cond: 'var(--cond-asthma)', tone: 'urgent' },
  { id: 'hypoglycaemia', label: 'Low blood sugar', icon: 'Droplet', cue: 'Diabetic · confused', cond: 'var(--cond-hypo)', tone: 'urgent' },
  { id: 'seizure', label: 'Seizure', icon: 'Brain', cue: 'Convulsions', cond: 'var(--cond-seizure)', tone: 'urgent' },
  { id: 'adrenal_crisis', label: 'Adrenal crisis', icon: 'AlertOctagon', cue: 'On steroids · collapsed', cond: 'var(--cond-adrenal)', tone: 'urgent' },
  { id: 'syncope', label: 'Fainting', icon: 'CircleOff', cue: 'Collapse · pale', cond: 'var(--cond-faint)', tone: 'standard' },
];

/** Tiles in one tier, in ranked order. */
export function tilesByTone(...tones: TileTone[]) {
  return TILES.filter((t) => tones.includes(t.tone));
}

/**
 * The condition's own hue, softened against the surface it sits on rather than
 * against white — the theatre surfaces are near-black, and mixing toward white
 * there produces a washed pastel that reads as disabled.
 */
export function conditionSpine(cond: string): CSSProperties['borderLeft'] {
  return `4px solid color-mix(in srgb, ${cond} 70%, var(--surface))`;
}

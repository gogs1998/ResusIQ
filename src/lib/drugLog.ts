// What a recorded dose is allowed to SAY it was.
//
// The deck's "drugs given" panel printed `drug.adult_dose_text` against every
// logged administration (Grok F8). Nothing in the record supported that: a child
// given 150 micrograms of adrenaline was listed as "500 micrograms IM", and that
// panel is read aloud to the paramedic at handover. The app was inventing a dose
// from a drug id.
//
// Until the runner captures the band at confirm time, the honest answer is to
// say what was actually recorded, and where there is nothing recorded, to say so
// and name who can answer it. `details` on the drug_given entry is that recorded
// dose text; logDrugGiven accepts it and nothing populates it yet.
export const DOSE_NOT_RECORDED_LINE = 'Dose per age band — confirm with the person who gave it.';

/**
 * The dose line for a logged administration: what was recorded, or an explicit
 * statement that it was not. Never a dose derived from the drug alone.
 */
export function loggedDoseText(details: string | undefined): string {
  const recorded = details?.trim();
  return recorded ? recorded : DOSE_NOT_RECORDED_LINE;
}

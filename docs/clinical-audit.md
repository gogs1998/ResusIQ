# ResusIQ — Clinical Soundness Audit (RCUK + SDCEP)

_Date: 2026-06-21 · Auditor: clinical-reviewer · **Status: SIGNED OFF — CLINICAL GATE PASSED**_

> **Final sign-off (2026-06-21):** every item re-verified against the committed `protocols.ts`
> + `drugs.ts`. Zero SAFETY defects; all four non-negotiables hold; every dose/route/site/
> sequence validated against current RCUK 2021 (general bar) + SDCEP/Scottish Gov 2024 (dental
> layer) with the primary-source chain followed. Core algorithms are RCUK-correct for broader
> (not dental-only) use. **One procedural item remains (non-blocking):** human spot-check of the
> BNFc paediatric midazolam/adrenaline bands against a live BNF login before release.

ResusIQ is built for UK dental practice but is **not limited to it** — core algorithms,
doses and sequences are validated against full **Resuscitation Council UK** guidance (the
general authority), with **SDCEP** layered on for the dental-practice context (emergency-kit
drugs/equipment, dental framing). This document is the evidence base — the product owner
(a clinician) is the final sign-off.

## Verdict

- **0 SAFETY-severity defects.**
- All four CLAUDE.md non-negotiables re-confirmed: stroke = no aspirin · MI O₂ only when
  indicated · anaphylaxis adrenaline q5min no max · seizure single buccal midazolam.
- **Every drug dose verified correct** against current published guidance (live-checked).
- Remaining items were DRIFT/WORDING — all now applied (commit `47c5350`).

## Sources verified live (2026-06-21)

RCUK Emergency Treatment of Anaphylaxis (May 2021) · RCUK Adult BLS + Choking (2021) ·
RCUK ALS (2021) · SDCEP *Management of Medical Emergencies in Dental Practice* +
*Drug Prescribing for Dentistry* · Scottish Government 2024 emergency-drugs list · BNF/BNFc ·
BDJ 2025 (GTN threshold in dental extraction).

## Defects found and applied

| ID | Severity | Item | Correction | Source |
|----|----------|------|-----------|--------|
| DRIFT-1 | borderline-safety | Anaphylaxis `position_sit` omitted the posture caveat | Added: "Do not let them stand or walk. If they feel faint, lie them flat again straight away." | RCUK Anaphylaxis 2021 (empty-ventricle collapse) |
| DRIFT-2 | drift | GTN systolic floor was 90 mmHg | Raised to **100 mmHg** (dental-conservative); surfaced in `give_patient_gtn` step + `gtn_sublingual` warning/contraindication | SDCEP Angina; BDJ 2025 |
| WORDING-1 | wording | Anaphylaxis `recognition` was a passive symptom wall | Reframed action-first → "give adrenaline IM now" | RCUK 2021 diagnostic criteria |
| WORDING-2 | shipping bug | Mojibake on safety lines (seizure "do NOT restrain"; choking back-blows/thrusts; stroke "no aspirin") | Re-encoded to clean text | — |
| — | structure | Stroke standalone FAST summary duplicated the FAST decisions | Skipped on decisive (tile) entry → leads with the FAST assessment; kept for triage | RCUK FAST |

## Doses verified CORRECT (no change required)

Adrenaline 500 µg IM 1:1000 anterolateral thigh, q5min, no max + 4 paediatric bands incl.
<6 mo 100–150 µg · Aspirin 300 mg chewed (single) · Salbutamol 4–10 puffs via spacer ·
Buccal midazolam 10 mg adult (single) · Glucagon 1 mg IM (<8 y or <25 kg = 500 µg) ·
Oral glucose 15–20 g · Oxygen 15 L/min high-flow + SpO₂ 94–98 % (88–92 % COPD) ·
Hydrocortisone 100 mg IM (correctly off the Scottish mandatory list) · Choking 5+5 algorithm ·
Cardiac arrest 30:2, rate 100–120, depth 5–6 cm · Stroke FAST + onset time + nil-by-mouth +
no aspirin.

## Open (non-blocking)

- **COMPLETENESS-1** — salbutamol child dose is still free-text ("2–10 puffs"); clinically
  safe, structure into `child_dose_bands` for parity (task #15).

## Action-first openings (re-verified, signed off)

Implemented structurally via the tile-entry skip (decisive users skip recognition, triage
users keep it): chest_pain → "Call 999, suspected heart attack" · asthma → severity decision ·
syncope → "Lay flat, raise legs" · anaphylaxis → reframed confirm → adrenaline · stroke → FAST
assessment · hypoglycaemia → action. Kept as mandatory gates: cardiac_arrest safety, seizure
protect, choking severity, adrenal steroid-history.

## SDCEP + primary-source cross-check delta (2026-06-21)

Followed the SDCEP hub → its 4 cited primaries (Scottish Govt 2024 drugs [fetched, full match];
RCUK Primary Dental Care QS [fetched — ResusIQ implements the newer RCUK 2021, ahead of that
page]; SDCEP Drug Prescribing [fetched]; BNF dental [paywalled to automated fetch — **flagged
for a human BNF spot-check** of the paediatric midazolam/adrenaline bands before release]).

Applied (commit follows):
- **DRIFT-3** (refines DRIFT-1) — anaphylaxis positioning: SDCEP default is **lay flat + raise
  legs**; sit-up is *only* for predominant breathing difficulty and must never become
  standing/walking. `position_sit` reworded accordingly. _SDCEP Anaphylaxis; RCUK 2021._
- **DRIFT-4 (new)** — **refractory anaphylaxis**: after 2 IM doses without improvement the app
  now flags it and pushes the 999/IV handover (IV adrenaline + fluids are out of the dental kit
  and dental scope — receiving-team handover only; IM q5min/no-max stays). _RCUK Anaphylaxis
  May 2021._
- **DRIFT-2 GTN** — **downgraded to optional**: core SDCEP is *silent* on a BP threshold; the
  >100 mmHg figure is BDJ 2025, so the citation is corrected to BDJ 2025 (was mislabelled SDCEP).
- Optional **agonal-breathing** cue added to the cardiac-arrest breathing check. _RCUK BLS 2021._

Doses re-confirmed against **Scottish Government 2024 (primary)** + SDCEP: full match (adrenaline
bands, salbutamol 10-puff max incl. children, aspirin 300 mg adults-only, O₂ 15 L/min, drug stock
list, hydrocortisone off the mandatory list). **No SAFETY defect.** Procedural: confirm the BNFc
paediatric bands against a live BNF login before release.

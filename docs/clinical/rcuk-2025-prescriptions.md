# RCUK 2025 clinical prescriptions — implementation-ready wording

**Status:** prescribed 2026-09-11 by four clinical-reviewer passes against live primary sources (RCUK Guidelines 2025 First Aid / Adult BLS / ALS / Paediatric BLS / Special Circumstances, RCUK Anaphylaxis May 2021 — still current, SDCEP, Scottish Government 2024, BTS 2017, NICE NG185/NG217/NG243, BSPED, BUCCOLAM and GlucaGen SmPCs). **No human clinician has signed any of this.** That remains the headline caveat.

**How to apply:** text-only unless a section says otherwise. Keep every step `id`, `type`, `next`, `drug_id`, `require_confirm`, `actions` unchanged except where a "graph change" block gives the before/after. Apply wording verbatim. Any deviation goes back to the clinical reviewer. Non-negotiables (CLAUDE.md) are re-confirmed by every pass and must survive: stroke = no aspirin; MI = oxygen only when indicated, never routine high-flow; anaphylaxis adrenaline q5min NO maximum; seizure SINGLE buccal midazolam for prolonged only.

**Decisions taken by Gordon 2026-09-11/20:** aspirin before GTN; offer the kit GTN (not only the patient's own); adult-only CPR scope statement now, child CPR branch next release; drop the midazolam 3–6-month row.

Files: `src/data/protocols.ts` (P), `src/data/drugs.ts` (D), `src/lib/doseLimits.ts` (DL).

---

## A. cardiac_arrest (P)

### A1. Oxygen attached to ventilation + compression-only fallback (GUIDANCE_DRIFT)
No new step. Text-only on three steps + one drug warning.

`shout_help.roles[1]`: `'Fetch the defibrillator and oxygen'` → `'Fetch the defibrillator, the oxygen and the pocket mask or bag and mask'`

`start_cpr` (also the deterioration landing — the send-for-defib + 999 fold must stay):
```
say: 'Start CPR now. 30 compressions, then 2 breaths. Send someone for the defibrillator and oxygen, and make sure 999 is on the line.',
show: 'Start CPR now.\n\n30 compressions, then 2 breaths.\nSend someone for the defibrillator and oxygen, and make sure 999 is on the line — do not stop compressions to wait.\nBreaths: pocket mask or bag and mask. Oxygen at 15 L/min onto the mask port as soon as it arrives. Each breath about 1 second, just enough to see the chest rise.\nIf you can’t give breaths, keep doing compressions without stopping.\nChild or baby? Give 5 rescue breaths first, then 15 compressions to 2 breaths, pressing one third of the chest depth. Tell the 999 call handler their age.',
```
(The last line is the A2 adult-only scope statement.)

`cpr_mode.show`:
```
'Push hard and fast in the centre of their chest.\n\nRate 100 to 120 a minute. Depth 5 to 6 cm. Let the chest come all the way back up.\nOxygen 15 L/min on the pocket mask or bag. Can’t give breaths? Keep compressing without stopping.'
```
`cpr_mode.say` unchanged.

### A2. Adult-only scope statement (SAFETY — ship now; child branch next release)
- `title`: `'Cardiac Arrest (CPR + AED)'` → `'Cardiac Arrest — adult (CPR + AED)'`
- `start_cpr.show` — the child line is already in A1.
- `safety.show`: `'Make sure it’s safe to approach them.'` → `'Make sure it’s safe to approach them.\n\nThis is the adult sequence. For a child or baby the differences are shown at the CPR step.'`

### A3. Wording (non-blocking)
- `breathing_check.show`: `'Look and feel for normal breathing.\n\nNo more than 10 seconds. Occasional gasps, or slow laboured breathing, are not normal breathing — treat as cardiac arrest.'`
- `aed_attach.show`: append `' Take off a bra if it’s in the way.'` to the detail line.
- `monitor`: say `'Stay with them and keep watching their breathing until the ambulance crew take over.'`; show `'Stay with them until the ambulance arrives.\n\nKeep checking they are still breathing normally. If they stop, start CPR.'`

### A4. references
```
['Resuscitation Council UK Guidelines 2025 — Adult Basic Life Support (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Adult Advanced Life Support (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Paediatric Basic Life Support (27 Oct 2025)', 'Resuscitation Council UK — Quality Standards: Primary dental care (updated May 2020)', 'SDCEP Practice Support Manual — Medical emergencies and life support']
```
Header comment `protocols.ts:3` → `// UK Dental Emergency Protocols - Based on Resuscitation Council UK Guidelines 2025 (Oct 2025) & SDCEP / RCUK Quality Standards for Primary Dental Care`

### A5. Code-side (not clinical): `CPRMode.tsx` hard-codes 30:2 (`beat % 30`, `>= 27`). A future 15:2 child step is dead data until it reads `step.compressions_per_cycle`. Not for this release.

---

## B. choking (P) — infant branch (SAFETY)

**Graph change:**
- `assess_severity.answers[1].next`: `'severe_choking'` → `'age_check_choking'`
- `mild_resolved.answers[1].next`: `'severe_choking'` → `'age_check_choking'`
- `conscious_check_choking.answers[0].next`: `'severe_choking'` UNCHANGED.
Children over 1 year keep abdominal thrusts (PBLS 2025 confirmed).

**New steps — insert after `mild_resolved`:**
```ts
{ id: 'age_check_choking', type: 'decision',
  say: 'Is this a baby under 1 year old?',
  show: 'Is this a baby under 1 year old?\n\nBabies get chest thrusts, never abdominal thrusts.',
  question: 'Is the patient a baby under 1 year old?',
  answers: [
    { label: 'No — child or adult', next: 'severe_choking' },
    { label: 'Yes — baby under 1', next: 'infant_back_blows' }
  ] },
{ id: 'infant_back_blows', type: 'instruction',
  say: 'Call 999 now, then lay the baby face down along your forearm with their head low and give up to 5 back blows between the shoulder blades.',
  show: 'Give up to 5 back blows between the shoulder blades.\n\nBaby face down along your forearm, forearm resting on your thigh. Support their head with your hand and keep it lower than their chest. Use the heel of your hand. Call 999 now.',
  actions: ['suggest:call_999'], next: 'infant_back_blows_check' },
{ id: 'infant_back_blows_check', type: 'decision',
  say: 'Has it cleared after the back blows?', show: 'Has it cleared?',
  question: 'Has the obstruction cleared?',
  answers: [
    { label: 'Yes — it’s cleared', next: 'choking_resolved' },
    { label: 'No — still choking', next: 'infant_chest_thrusts' }
  ] },
{ id: 'infant_chest_thrusts', type: 'instruction',
  say: 'Turn the baby face up on your lap with their head low and give up to 5 chest thrusts on the lower half of the breastbone.',
  show: 'Give up to 5 chest thrusts.\n\nBaby face up along your lap, head lower than chest. Both thumbs on the lower half of the breastbone, fingers around the chest. Push down sharply — like a chest compression but sharper and slower. Never push on a baby’s tummy.',
  next: 'infant_thrusts_check' },
{ id: 'infant_thrusts_check', type: 'decision',
  say: 'Has it cleared?', show: 'Has it cleared?',
  question: 'Has the obstruction cleared?',
  answers: [
    { label: 'Yes — it’s cleared', next: 'choking_resolved' },
    { label: 'No — still choking', next: 'infant_alternate_cycle' }
  ] },
{ id: 'infant_alternate_cycle', type: 'instruction',
  say: 'Keep alternating 5 back blows and 5 chest thrusts. Make sure 999 is on the way.',
  show: 'Keep going: 5 back blows, then 5 chest thrusts.\n\nRepeat until it clears or the baby goes limp. Make sure 999 has been called.',
  actions: ['suggest:call_999'], next: 'infant_conscious_check' },
{ id: 'infant_conscious_check', type: 'decision',
  say: 'Is the baby still conscious?', show: 'Is the baby still conscious?',
  question: 'Is the baby still conscious?',
  answers: [
    { label: 'Yes — keep going', next: 'infant_back_blows' },
    { label: 'No — gone limp', next: 'infant_choking_cpr' }
  ] },
// TERMINAL variant (child CPR branch not shipping this release):
{ id: 'infant_choking_cpr', type: 'instruction',
  say: 'Lay the baby on a firm flat surface, remove anything you can see in the mouth, give 5 rescue breaths over their mouth and nose, then 15 chest compressions to 2 breaths.',
  show: 'Lay them flat on a firm surface and start baby CPR.\n\nLook in the mouth — remove anything you can see, no blind finger sweeps.\n5 rescue breaths first, your mouth over their mouth and nose, head in a neutral position.\nThen 15 compressions to 2 breaths: two fingers or two thumbs on the lower half of the breastbone, one third of the chest depth, 100 to 120 a minute.\nKeep 999 on speakerphone — the call handler will talk you through it.' }
```
Code-side: `infant_choking_cpr` is a new terminal step — add it to `TERMINAL_STEPS` (awaiting-crew group) and confirm `ProtocolRunner.terminal.test.tsx` count assertions (14 → 15).

**Text updates:**
- `choking_resolved`: say `'It’s cleared. Keep watching them. If you gave abdominal thrusts or chest thrusts, they need to be checked by a doctor.'`; show `'Cleared — well done.\n\nKeep watching them in case it comes back. Anyone who had abdominal thrusts, chest thrusts or chest compressions must be checked by a doctor. Write up what happened.'`
- `choking_cpr.show`: `'Lower them to the floor and start CPR.\n\nLook in the mouth — remove anything you can see with suction or forceps. No blind finger sweeps. Make sure 999 has been called. I’ll take you through CPR.'`

**references:** `['Resuscitation Council UK Guidelines 2025 — First Aid: choking (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Adult Basic Life Support (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Paediatric Basic Life Support: foreign body airway obstruction (27 Oct 2025)', 'SDCEP Practice Support Manual — Medical emergencies and life support']`

---

## C. anaphylaxis (P + D) — 0 SAFETY; Anaphylaxis guideline May 2021 still current

`repeat_adrenaline` (keep id/type/drug_id/require_confirm/next):
```
say: 'Repeat the adrenaline now — same dose, ideally into the other thigh — and again every 5 minutes; there is no upper limit. If they are still no better after two doses this is refractory anaphylaxis, so make sure the ambulance is on its way now for the IV adrenaline and fluids you cannot give here. Keep the oxygen on and keep them flat with their legs raised.',
show: 'Repeat adrenaline IM now\n\nSame dose, ideally into the other thigh. Every 5 minutes — no upper limit.\nNo better after 2 doses = refractory: make sure 999 is coming now for IV adrenaline and fluids you cannot give here.\nKeep oxygen on, keep them flat with legs raised.',
```
`position_sit` (optional wording): say `'Sit them up with their legs out straight to help their breathing, but never let them stand or walk. If they feel faint, lay them flat and raise their legs again straight away.'`; show `'Sit them up, legs out straight\n\nNever let them stand or walk.\nIf they feel faint: lay flat and raise the legs again immediately.'`

D `adrenaline_im_adult`: `how_to_give` append `'\n6. Repeat doses: use the other thigh if you can'`; `warnings[2]` → `'Repeat every 5 minutes if no improvement — ideally into the other thigh'`; keep "No upper limit" warning.

references (P): `['Resuscitation Council UK — Emergency treatment of anaphylaxis (May 2021, current)', 'Resuscitation Council UK Guidelines 2025 (First Aid; Special Circumstances)', 'SDCEP', 'BNF']`
references (D adrenaline): `['Scottish Government 2024', 'Resuscitation Council UK Anaphylaxis (May 2021)', 'Resuscitation Council UK Guidelines 2025 (First Aid)', 'BNF']`

---

## D. asthma (P + D)

`oxygen_severe` (keep id/type/drug_id/require_confirm:false/next):
```
say: 'Put them on oxygen now — 15 litres a minute through a non-rebreather mask. If you have a pulse oximeter, aim for 94 to 98 percent.',
show: 'Oxygen 15 L/min, non-rebreather mask\n\nUse the mask with the reservoir bag.\nIf you have a pulse oximeter, aim for SpO2 94–98%.',
```
`escalate.show`: `'Call 999 now if not already done.\n\nGive up to 10 more puffs of salbutamol, one at a time.\nOxygen 15 L/min through a non-rebreather mask — aim for SpO2 94–98% if you have a pulse oximeter.'`
`severe_asthma` (optional): say `'This is severe — call 999 now and say severe asthma attack. Tell them if the lips are blue, they are exhausted or confused, or the chest has gone quiet. Stay with them and keep them upright.'`; show `'Call 999 now — say severe asthma attack.\n\nTell them if: lips blue, exhausted or confused, chest gone quiet — that is life-threatening.\nStay with them, keep them upright.'`

D `oxygen_high_flow`: `indication` → `'Anaphylaxis, cardiac arrest, severe asthma, adrenal crisis, unconscious'`; warnings insert FIRST `'Cardiac arrest: connect the oxygen to the pocket mask port or the bag-valve-mask reservoir at 15 L/min — a non-rebreather mask does nothing for someone who is not breathing'`, then `'Once a pulse oximeter is on, aim for SpO2 94–98% (88–92% only in known COPD at risk of CO2 retention)'`; COPD warning → `'In known COPD: still give 15 L/min in these emergencies (anaphylaxis, arrest, severe asthma, SpO₂ < 88%) — RCUK 2025 First Aid gives high flow to everyone with life-threatening hypoxaemia'`.
references (D oxygen_high_flow): `['Scottish Government 2024', 'Resuscitation Council UK Guidelines 2025 (ALS, First Aid)', 'Resuscitation Council UK Anaphylaxis (May 2021)', 'BTS Emergency Oxygen Guideline (2017)']`
references (P asthma): `['BTS/SIGN 158 acute asthma (2019)', 'NICE NG245 (2024)', 'Resuscitation Council UK Guidelines 2025 (First Aid)', 'SDCEP']`
references (D salbutamol): `['Scottish Government 2024', 'SDCEP', 'BNF', 'BTS/SIGN 158 (2019) — acute asthma', 'NICE NG245 (2024)']`

---

## E. adrenal_crisis (P + D) — RCUK has no adrenal guidance; drop it from refs

D `hydrocortisone_im.how_to_give[2]`: `'3. Can repeat after 6 hours if needed'` → `'3. No repeat is needed in practice — hospital continues hydrocortisone (adults 50 mg every 6 hours or by infusion)'`; remove `repeat_interval_min: 360`; `max_doses` stays undefined.
references (P and D): `['NICE NG243 (2024)', 'BSPED consensus (2023)', 'Society for Endocrinology', 'SDCEP', 'BNF']`

---

## F. chest_pain (P + D) — the oxygen rework (SAFETY) + ordering

### F1. `oxygen_moderate_flow` — FULL REPLACEMENT (D)
```ts
{
  id: 'oxygen_moderate_flow',
  name: 'Oxygen — Titrated (only if hypoxic)',
  indication: 'Chest pain / suspected MI — ONLY if breathless, cyanosed, or SpO₂ below 94% (below 88% if known COPD). Not routine.',
  adult_dose: 'Reservoir mask 15 L/min if SpO₂ < 88%, cyanosed or no oximeter; otherwise titrate to SpO₂ 94–98%',
  adult_dose_text:
    'The kit’s reservoir (non-rebreather) mask only works at 15 L/min — it cannot be turned down.\n' +
    'SpO₂ below 88%, blue lips, or no oximeter and breathless: 15 L/min via reservoir mask — everyone, including known COPD.\n' +
    'SpO₂ 88–93% and not COPD: if you have a simple face mask (5–10 L/min) or nasal cannulae (1–4 L/min), titrate to 94–98%. If the reservoir mask is all you have, use it at 15 L/min and take it off once SpO₂ is 94–98%, then re-check every few minutes.\n' +
    'Known COPD and SpO₂ 88% or above: no oxygen (target 88–92%). Below 88%: 15 L/min as above; remove once above 92%.',
  route: 'INH',
  how_to_give:
    '1. Check SpO₂ with the pulse oximeter if you have one; look at the lips and tongue for blueness (darker skin: pallor or blue inside the lips)\n' +
    '2. SpO₂ 94% or above, not breathless, not blue → do NOT give oxygen\n' +
    '3. Reservoir mask: connect to the cylinder, set 15 L/min, let the bag fill, then fit over nose and mouth\n' +
    '4. Never run a reservoir mask below 15 L/min — the bag empties and they re-breathe their own CO₂\n' +
    '5. Simple face mask (5–10 L/min) or nasal cannulae (1–4 L/min), if you have them: use these to titrate to target instead\n' +
    '6. Re-check SpO₂ every few minutes: mask off once in target, back on if they drop below\n' +
    '7. Tell the ambulance crew the flow used, the SpO₂ readings and the times',
  warnings: [
    'Only give oxygen if breathless, cyanosed, or SpO₂ below 94% — target 94–98% (RCUK 2025 First Aid; BTS 2017 rec F13; NICE NG185). Routine oxygen in a heart attack does not help and may enlarge the infarct.',
    'SpO₂ below 88% or cyanosed: 15 L/min via reservoir mask to everyone, including known COPD (RCUK 2025 First Aid)',
    'Known COPD: target 88–92% — at 88% or above give none; below 88% give 15 L/min and remove once above 92%',
    'A reservoir mask cannot deliver 5–10 L/min — at low flow the bag collapses and CO₂ is re-breathed. Use it at 15 L/min or not at all.',
    'No pulse oximeter (it is “helpful, not essential” in the Scottish Government 2024 kit): give 15 L/min only if breathless or blue, and tell the crew it was given without a reading',
    'SDCEP Drug Prescribing still says “100% oxygen, 15 L/min” for every angina/MI patient. That is superseded — BTS 2017 F13, NICE NG185, ESC 2023 and RCUK 2025 First Aid all titrate to SpO₂ and give none if 94% or above.',
    'Oxygen does not treat the pain or the clot — aspirin and GTN still go ahead'
  ],
  contraindications: [ 'SpO₂ 94% or above with no breathlessness and no cyanosis — no benefit, possible harm' ],
  references: [
    'Resuscitation Council UK Guidelines 2025 — First Aid: Use of pulse oximetry and oxygen (27 Oct 2025)',
    'BTS Guideline for oxygen use in adults in healthcare and emergency settings (Thorax 2017) — rec F13',
    'NICE NG185 Acute coronary syndromes (2020) — oxygen not routine; SpO₂ 94–98% / 88–92%',
    'ESC 2023 ACS Guidelines — oxygen only if SaO₂ < 90%',
    'BDJ 2025;239:519–521 — Management of angina in emergency tooth extraction',
    'Scottish Government 2024 — Emergency drugs and equipment in primary dental care (reservoir mask mandatory; oximeter helpful, not essential)'
  ]
}
```

### F2. Graph change — oxygen gate earlier, aspirin before GTN (DECIDED)
| Step | Field | Before | After |
|---|---|---|---|
| `position_chest` | `next` | `'gtn_check'` | `'oxygen_chest'` |
| `oxygen_chest` | answers[1].next | `'monitor_chest'` | `'aspirin'` |
| `give_oxygen_chest` | `next` | `'monitor_chest'` | `'aspirin'` |
| `give_oxygen_chest` | `actions` | (absent) | `['log:oxygen_started']` |
| `aspirin` | `next` | `'oxygen_chest'` | `'gtn_check'` |
| `gtn_check` | answers[1].next | `'aspirin'` | `'monitor_chest'` |
| `give_patient_gtn` | `next` | `'aspirin'` | `'monitor_chest'` |
Array order (cosmetic; keep `recognise` at index 0): recognise, call_999_chest, position_chest, oxygen_chest, give_oxygen_chest, aspirin, gtn_check, give_patient_gtn, monitor_chest, deterioration_check, start_cpr_chest.
Test pins verified to hold: `safety-rules.test.ts` oxygen-reachable-only-via-decision + `usesHighFlow === false` (no `oxygen_high_flow` step enters chest_pain); `appStore.test.ts` recognise stays index 0 `recognition:true`.

### F3. Step texts
`oxygen_chest`:
```
say: 'Are they breathless, blue around the lips, or is their oxygen level under 94 percent? If not, they don’t need oxygen.',
show: 'Breathless, blue around the lips, or sats under 94%?\n\nIf none of these, don’t give oxygen. Extra oxygen in a heart attack doesn’t help and can do harm — sats of 94% or above need none (88% or above if known COPD). No oximeter? Go by breathlessness and colour.',
question: 'Breathless, cyanosed, or SpO₂ below 94%?',
answers: [
  { label: 'Yes — breathless, blue, or sats under 94%', next: 'give_oxygen_chest' },
  { label: 'No — breathing fine, no oxygen needed', next: 'aspirin' }
]
```
`give_oxygen_chest`:
```
say: 'Give oxygen through the reservoir mask at 15 litres a minute. Take it off once their levels are 94 to 98 percent, and keep checking.',
show: 'Oxygen — reservoir mask, 15 L/min.\n\nThe kit’s reservoir mask only works at 15 L/min — never turn it down. Aim for sats 94 to 98% (88 to 92% if known COPD): once there, mask off and re-check every few minutes. Under 88% or blue: 15 L/min for everyone, COPD included. A simple mask or nasal cannulae, if you have them, can titrate instead.',
```
`recognise` (stays `recognition:true`; now pure recognition, safe to skip):
```
say: 'This could be a heart attack. Central chest pain that may spread to the arm, jaw or back, with sweating, feeling sick or breathlessness.',
show: 'Could this be a heart attack?\n\nCentral chest pain that may spread to the arm, jaw or back, with sweating, nausea or breathlessness. Pain that GTN doesn’t settle within a few minutes is a heart attack until proven otherwise.',
```
`call_999_chest` (folds in the sit-up):
```
say: 'Sit them up, supported, and call 999 now. Say you think it’s a heart attack.',
show: 'Sit them up, supported. Call 999 now — say suspected heart attack.\n\nGet someone to fetch the emergency kit, the oxygen and the defibrillator while you stay with them.',
```
`position_chest`:
```
say: 'Keep them sitting up, supported and resting, in whatever position is easiest. If they feel faint, lie them down.',
show: 'Sitting up, supported, and resting.\n\nKnees bent if that’s easier. If they feel faint or their blood pressure is low, lie them down. Don’t let them walk about.',
```
`gtn_check`:
```
say: 'Do they have GTN — their own spray, or the one in the kit? Only use it if their systolic blood pressure is above 100.',
show: 'GTN — theirs or the kit’s?\n\nGive it only if systolic BP is above 100 mmHg. Skip it if BP is under 100, they feel faint, or they’ve taken sildenafil, tadalafil or similar in the last 2 days.',
question: 'Give GTN?',
answers: [
  { label: 'Yes — give GTN', next: 'give_patient_gtn' },
  { label: 'No — none, BP under 100, or recent Viagra-type tablet', next: 'monitor_chest' }
]
```
`give_patient_gtn`:
```
say: 'Give 1 to 2 sprays of GTN under the tongue, with them sitting. Only if their systolic blood pressure is above 100.',
show: 'GTN spray, 1 to 2 sprays under the tongue.\n\nTheirs or the kit’s. Only while sitting or lying, and only if systolic BP is above 100 mmHg (BDJ 2025). Repeat after 5 minutes if the pain stays, up to 3 doses. Pain not settling — tell 999.',
```
`aspirin`:
```
say: 'Give one 300 milligram aspirin to chew — or dissolved in a little water if their mouth is numb. First check they’re not allergic and not bleeding.',
show: 'Aspirin 300 mg — chew it.\n\nIf they can’t chew (numb mouth), disperse it in a little water. First check: no aspirin allergy, no active bleeding, not already taken today, 16 or over. Single dose. Tell the crew the time it was given.',
```
D `aspirin_oral`: how_to_give[3] → `'4. Chew it — or, if they can’t chew, disperse in a little water and swallow'`; warnings[1] → `'Call 999 first, or have someone else call while you give it — do not hold the aspirin back waiting for the call to connect'`; warnings append `'Tell the ambulance crew that 300 mg aspirin was given, and the time (SDCEP: send a note with the patient)'`; references `['Resuscitation Council UK Guidelines 2025 — First Aid: Chest pain', 'NICE NG185 Acute coronary syndromes (2020) — rec 1.1.4', 'SDCEP Drug Prescribing — Angina & MI', 'BNF', 'Scottish Government 2024']`.
D `gtn_sublingual`: warnings[1] → `'Their own spray or the kit’s — either is fine; the kit spray is a mandatory stock item'`; references `['Scottish Government 2024', 'SDCEP Drug Prescribing — Angina & MI', 'BDJ 2025;239:519–521 (systolic > 100 mmHg)', 'Resuscitation Council UK Guidelines 2025 — First Aid: Chest pain', 'BNF']`.

references (P chest_pain):
```
['Resuscitation Council UK Guidelines 2025 — First Aid: Chest pain; Use of pulse oximetry and oxygen (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Adult basic life support', 'NICE NG185 Acute coronary syndromes (2020) — aspirin rec 1.1.4; oxygen not routine', 'BTS Guideline for oxygen use in adults (2017) — rec F13', 'ESC 2023 ACS Guidelines — oxygen only if SaO₂ < 90%', 'SDCEP Drug Prescribing for Dentistry — Angina & MI (its 15 L/min oxygen line is superseded)', 'BDJ 2025;239:519–521 — GTN only if systolic > 100 mmHg', 'BNF — Medical emergencies in dental practice', 'Scottish Government 2024 — Emergency drugs and equipment in primary dental care']
```

---

## G. stroke (P) — no aspirin re-confirmed; FAST hard gate re-confirmed

`position_stroke`:
```
say: 'Sit them up a little and keep them comfortable while you wait. Oxygen only if they’re blue or struggling to breathe.',
show: 'Keep them comfortable.\n\nIf awake, sit them up a little. If not responding, recovery position.\nOxygen only if they’re blue (darker skin: blue inside the lips), breathless, or sats under 94% — not routinely.',
```
`stroke_cpr`:
```
say: 'Check their breathing. If it’s not normal, start CPR now.',
show: 'Check their breathing.\n\nOccasional gasps are not normal breathing. If not breathing normally, start CPR now.',
```
references: `['Resuscitation Council UK Guidelines 2025 — First Aid: Stroke (FAST; oxygen only if hypoxic); Recovery position (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Adult basic life support', 'NICE NG128 Stroke and TIA in over 16s (2019, updated 2022) — no aspirin before imaging; swallow screen; oxygen only if hypoxic', 'Stroke Association — FAST', 'SDCEP Drug Prescribing for Dentistry — Stroke (its 15 L/min oxygen line is superseded)']`

---

## H. syncope (P)

`position`:
```
say: 'Lay them flat and raise their legs, unless they’re breathless. Loosen anything tight around their neck.',
show: 'Lay them flat and raise their legs.\n\nDon’t raise the legs if they’re breathless. Loosen tight clothing at the neck. This gets blood back to their head — most faints come round quickly.',
```
`abcde` (adds `actions`; `next` unchanged):
```
say: 'Not coming round — call 999 now. Then open the airway and look and feel for normal breathing.',
show: 'They’re not recovering — call 999 now.\n\nWhile the call connects: tilt the head back, lift the chin, and look and feel for normal breathing. Occasional gasps are not normal breathing.',
actions: ['suggest:call_999'],
```
`recovery_position_syncope`:
```
say: 'Roll them onto their side. Make sure 999 is on the way, and keep checking their breathing.',
show: 'Roll them onto their side, into the recovery position.\n\nMake sure 999 has been called. Keep checking they’re still breathing normally — if it stops being normal, start CPR.',
```
references: `['Resuscitation Council UK Guidelines 2025 — First Aid: Recovery position; Use of pulse oximetry and oxygen (no dedicated faint section) (27 Oct 2025)', 'Resuscitation Council UK Guidelines 2025 — Adult basic life support (call 999 before the breathing check; agonal breathing)', 'ERC Guidelines 2021 — First Aid: presyncope (lie flat; physical counterpressure manoeuvres)', 'SDCEP Drug Prescribing for Dentistry — Faint (lay flat, raise feet unless breathless; its 15 L/min oxygen line is superseded)']`

---

## I. hypoglycaemia (P + D)

`recognise`:
```
say: 'Low blood sugar in a diabetic patient. They may be sweaty, shaky, confused or drowsy. If you have a glucose meter, below 4 is low.',
show: 'Low blood sugar?\n\nSweaty, shaky, confused, irritable or drowsy in a diabetic patient.\nIf you have a meter: below 4 mmol/L is low. Do not wait for a meter if they have symptoms — treat.',
```
`wait_response` — `duration_seconds: 600` → `900`:
```
say: 'Wait 15 minutes, then check them again. If they become drowsy at any point, stop and check now.',
show: 'Wait 15 minutes.\n\nThen check whether they are improving. If they become drowsy or stop swallowing safely at any point, tap Done and check now.',
```
`reassess_hypo` (SAFETY — third answer; graph change):
```
say: 'Are they getting better? If you have a meter, check again now.',
show: 'Are they improving?\n\nIf you have a meter, recheck now: 4 mmol/L or above with symptoms settling means improving.',
answers: [
  { label: 'Yes — improving', next: 'recovery_hypo' },
  { label: 'No — no better, but awake and swallowing', next: 'repeat_glucose' },
  { label: 'Worse — drowsy or can’t swallow now', next: 'unconscious_hypo' }
]
```
`repeat_glucose`:
```
say: 'They are still awake and swallowing safely, so give another dose of fast-acting sugar. If there’s no improvement after 3 doses, call 999.',
show: 'Repeat the fast-acting sugar — only while they are awake and swallowing safely.\n\nStill no better after 3 doses? Call 999.',
```
`recovery_position_hypo`:
```
say: 'Roll them onto their side into the recovery position and keep their airway open. If they are not breathing normally, start CPR instead.',
show: 'Roll them into the recovery position.\n\nKeep their airway open and keep watching their breathing. Not breathing normally, or only gasping? Start CPR — use the cardiac arrest rail.',
```
`give_glucagon`:
```
say: 'Give glucagon into the muscle. 1 milligram for an adult or a child of 25 kilograms or more. Half that for a child under 25 kilograms.',
show: 'Glucagon IM — 1 mg for an adult.\n\nChild 25 kg and over: 1 mg (the full 1 ml). Child under 25 kg: 500 micrograms (0.5 ml of the made-up kit). Weight decides; if you do not know it, 8 years and under means 500 micrograms.\nIt takes 10 to 15 minutes to work.',
```
D `glucose_oral`: add
```
child_dose: '12 y+: 15 g · 5–11 y: 10 g · under 5 y: 5 g',
child_dose_text: 'Child 12–17 years: 15 g\nChild 5–11 years: 10 g\nChild under 5 years: 5 g\nRepeat after 15 minutes if not improving. A child who is awake but will not swallow: half a teaspoon of sugar (2.5 g) under the tongue.',
child_dose_bands: [
  { label: '12 years and over', dose: '15 g', min_age_months: 144 },
  { label: '5–11 years', dose: '10 g', min_age_months: 60, max_age_months: 144 },
  { label: 'Under 5 years', dose: '5 g', max_age_months: 60 },
],
```
how_to_give step 3 → `'3. Wait 15 minutes, then reassess (recheck the meter if you have one)\n'`; warning "BM < 4" → `'If you have a glucose meter: below 4 mmol/L is low. Do not delay treatment to find one'`; keep 150–200 ml (RCUK's 50–100 mL is inconsistent with its own 15–20 g; JBDS 2023 says 150–200). references `['Resuscitation Council UK 2025 First Aid Guidelines', 'SDCEP Drug Prescribing for Dentistry', 'Scottish Government 2024', 'BNF', 'JBDS 2023 / Diabetes UK']`.

D `glucagon_im` (SAFETY ×2):
```
adult_dose_text: '1 mg (the full 1 ml of the made-up kit) intramuscularly. Takes 10–15 minutes to work.',
child_dose: 'Under 25 kg: 500 micrograms · 25 kg and over: 1 mg (weight decides; if unknown, 8 years and under = 500 micrograms)',
child_dose_text: 'Child body-weight 25 kg and over: 1 mg (1 ml) IM\nChild body-weight under 25 kg: 500 micrograms (0.5 ml of the made-up 1 mg kit) IM\nWeight decides. If you cannot weigh or ask: 8 years and under, give 500 micrograms; 9 years and over, give 1 mg.',
how_to_give: '1. Reconstitute powder with the diluent in the kit (gives 1 mg in 1 ml)\n2. Gently swirl (do not shake vigorously)\n3. Adult or child 25 kg and over: inject the full 1 ml IM. Child under 25 kg: inject 0.5 ml IM\n4. Place patient in recovery position\n5. Once conscious and able to swallow → give oral glucose',
// REMOVE repeat_interval_min: 10   (max_doses: 1 stays)
warnings: ['Call 999 for any unconscious hypoglycaemia', 'Place in recovery position immediately', 'Takes 10–15 minutes to work — be patient', 'No response 10 minutes after the dose: tell the 999 call handler — they need IV glucose, which you cannot give here', 'Give oral glucose as soon as patient can swallow', 'Less effective in alcohol-induced or prolonged hypoglycaemia, prolonged fasting, adrenal insufficiency', 'Less effective in malnourished patients'],
contraindications: ['Phaeochromocytoma', 'Known hypersensitivity to glucagon'],
references: ['Scottish Government 2024', 'SDCEP Drug Prescribing for Dentistry', 'BNF/BNFc', 'GlucaGen HypoKit SmPC (emc/1289, 2023)']
```
Code-side twin: `TimerStrip.pickTrackedDose` must skip any drug where `isAtDoseLimit(drug, doses)` is true so a capped drug can never show "DUE NOW". Also `DrugCard` renders "Every N minutes · max 1 doses" — removing the interval fixes it; the guard is defence in depth.

references (P hypoglycaemia): `['Resuscitation Council UK 2025 First Aid Guidelines — Hypoglycaemia', 'SDCEP Drug Prescribing for Dentistry — Hypoglycaemia', 'BNF/BNFc — Glucagon', 'JBDS 2023 / Diabetes UK']`

---

## J. seizure (P + D) — single dose UPHELD (deliberate divergence from NICE second-dose option); 3–6 m row DROPPED

`prolonged_seizure.answers[0].label` → `'Yes — 5 minutes or more, or another seizure started before they recovered'`
`call_999_seizure`: say `'Call 999 now. A seizure lasting 5 minutes or more is a medical emergency.'`; show `'Call 999 now.\n\nPROLONGED — a seizure of 5 minutes or more, or seizures repeating without recovery, is status epilepticus and needs the ambulance.'`
`midazolam_check`: say `'Do you have midazolam for buccal use — a Buccolam syringe, or the 10 milligram in 2 millilitre ampoule?'`; show `'Do you have midazolam for buccal use?\n\nBuccolam pre-filled syringe, or the 10 mg in 2 ml injection ampoule drawn into an oral syringe.'`; question `'Do you have buccal midazolam?'`
`give_midazolam.show`: `'Give buccal midazolam — one dose only.\n\nAdult and 10 years+: 10 mg (2 ml). 5 to under 10: 7.5 mg (1.5 ml). 1 to under 5: 5 mg (1 ml). 6 months to under 1 year: 2.5 mg (0.5 ml). Under 6 months: no dose from this app — 999 leads.\nPlace between the gum and cheek, half each side. Single dose — do not repeat.'`
`monitor_seizure.show`: `'Stay with them until the ambulance arrives.\n\nKeep their airway clear and have suction ready. Give oxygen at 15 L/min if you have it. Be ready to start CPR if they stop breathing normally.'`
`post_ictal.show`: `'Seizure stopped — recovery position.\n\nCheck their airway. Give oxygen if they look blue or are struggling to breathe. They may be confused or drowsy for a while. Stay with them.'`
`monitor_recovery.show`: `'Stay with them until they are fully recovered.\n\nRecovery can take time. Do not leave them on their own, and do not send them home until they have fully recovered.'`

D `midazolam_buccal`:
```
indication: 'Prolonged convulsive seizure (5 minutes or more) or repeated seizures without recovery in between',
child_dose: '10 y+: 10 mg · 5 to <10 y: 7.5 mg · 1 to <5 y: 5 mg · 6 m to <1 y: 2.5 mg · under 6 m: no dose — 999',
child_dose_text: 'Child 10 years and over: 10 mg (2 ml)\nChild 5 to under 10 years: 7.5 mg (1.5 ml)\nChild 1 to under 5 years: 5 mg (1 ml)\nChild 6 months to under 1 year: 2.5 mg (0.5 ml)\nUnder 6 months: no dose from this app. Call 999, protect them, keep the airway open and give oxygen. The licence limits this age group to hospital-level supervision.\nVolumes are for midazolam 10 mg in 2 ml (5 mg/ml): Buccolam pre-filled syringes, or the injection ampoule used buccally as stocked in UK emergency dental kits.',
how_to_give: '1. Call 999 BEFORE giving midazolam\n2. Only give if the seizure has lasted 5 minutes or more, or seizures are repeating without recovery\n3. Carefully open the mouth (do not force)\n4. Insert syringe between gum and cheek\n5. Inject slowly — give half on each side\n6. Have suction ready',
warnings: ['ONLY for a convulsive seizure lasting 5 minutes or more, or repeating without recovery — NOT for a seizure that has stopped', 'SINGLE DOSE ONLY — do not repeat', 'Under 6 months: no dose from this app — call 999. The licence limits use at 3 to 6 months to hospital-level supervision, and respiratory depression can be delayed at this age', 'Call 999 BEFORE giving', 'Have suction ready — risk of aspiration', 'Monitor airway closely — can cause respiratory depression', 'Midazolam is a controlled drug (Schedule 3)', 'Dental hygienists/therapists: can only give under written direction of dentist (Patient Specific Directive)'],
references: ['Scottish Government 2024', 'SDCEP Drug Prescribing for Dentistry — Epilepsy', 'BNF/BNFc', 'BUCCOLAM SmPC (emc/2768, 2026)', 'NICE NG217 (2022)']
```
Remove the 3–6-month row wherever it appears (`drugs.ts` bands/text). Do NOT cite NICE as the source of the single-dose rule.
references (P seizure) — RCUK has no seizure chapter, do not cite it: `['NICE NG217 (2022) §7 — status epilepticus in the community', 'SDCEP Drug Prescribing for Dentistry — Epilepsy', 'BUCCOLAM SmPC (emc/2768, 2026)', 'BNF/BNFc — Midazolam oromucosal', 'Scottish Government 2024 — emergency drugs (midazolam ampoule)']`

---

## K. doseLimits.ts (DL)
```ts
midazolam_buccal: {
  hero: 'Midazolam already given at {time}',
  detail: 'Single dose only — do not repeat. Keep their airway clear and have suction ready. If the seizure has not stopped 5 minutes after the dose, tell the 999 call handler it is still going.',
},
glucagon_im: {
  hero: 'Glucagon already given at {time}',
  detail: 'One dose is all the practice kit holds. It takes 10 to 15 minutes to work. Keep them in the recovery position and wait for the ambulance. No response after 10 minutes: tell the 999 call handler — they need IV glucose. Give oral glucose as soon as they can swallow safely.',
},
```
(`{time}` retained — data-integrity test requires it on hard-block heroes.)

## L. drugs.ts header (D)
```
// Sources (verified September 2026):
//   1. Scottish Government (2024) — Emergency drugs & equipment in primary dental care (8 Feb 2024)
//   2. SDCEP — Drug Prescribing for Dentistry: Medical emergencies; Practice Support Manual
//   3. Resuscitation Council UK Guidelines 2025 (BLS, ALS, First Aid — published 27 Oct 2025)
//      RCUK Emergency treatment of anaphylaxis (May 2021) — still current, not superseded by 2025
//   4. BNF / BNFc — Medical emergencies in the community; product SmPCs (emc) where cited
```
`oxygen_moderate_flow` references are in F1; `hydrocortisone_im` in E.

## M. Contested / for the human clinician
- Midazolam single-dose vs NICE NG217 second-dose option (app is deliberately more conservative — keep, but a clinician must own it).
- NG128 stroke oxygen <95% vs RCUK/BTS 94% (chose 94% app-wide).
- Kit GTN for non-angina pain follows SDCEP, not RCUK lay text.
- Infant chest-thrust hero uses two thumbs (PBLS 2025); "two fingers for a lone rescuer" is also defensible.
- Human clinician sign-off still outstanding for everything.

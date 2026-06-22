import type { Drug } from '../types';

// UK Dental Emergency Drugs
// ========================
// Sources (verified March 2026):
//   1. Scottish Government (2024) — Emergency drugs & equipment in primary dental care
//   2. SDCEP Practice Support Manual — Medical Emergencies in Dental Practice
//   3. Resuscitation Council UK 2021 Guidelines (Anaphylaxis, BLS, ALS)
//   4. BNF — Prescribing in dental practice: Medical emergencies
//
// MANDATORY EMERGENCY DRUGS — Scottish Government list (page 4):
//   1. Adrenaline 1:1000 (1 mg/ml) ampoules or pre-filled syringes
//   2. Aspirin 300 mg dispersible tablets
//   3. Glucagon 1 mg for IM injection
//   4. GTN spray 400 micrograms per metered dose
//   5. Midazolam oromucosal solution (controlled drug)
//   6. Oral glucose — gel, tablets, sugary drink, sugar lumps
//   7. Oxygen — minimum 30 min supply at 15 L/min
//   8. Salbutamol inhaler 100 micrograms per actuation
//   9. Flumazenil 0.5 mg/5 ml (ONLY sedation practices)
//
// ⚠ IMPORTANT: Drug doses reflect published guidance at time of writing.
// Always cross-refer to current BNF and Resuscitation Council UK guidelines.

export const drugs: Drug[] = [

  // ═══════════════════════ ADRENALINE ═══════════════════════
  {
    id: 'adrenaline_im_adult',
    name: 'Adrenaline (Epinephrine) 1:1000',
    indication: 'Anaphylaxis',
    adult_dose: '500 micrograms (0.5 ml)',
    adult_dose_text: '0.5 ml of 1:1000 solution (500 micrograms) by IM injection into the anterolateral mid-thigh',
    child_dose: '6–12 y: 300 μg (0.3 ml) · <6 y: 150 μg (0.15 ml)',
    child_dose_text:
      'Child 6–12 years: 300 micrograms (0.3 ml of 1:1000) IM\n' +
      'Child under 6 years: 150 micrograms (0.15 ml of 1:1000) IM',
    // RCUK 2021 Emergency Treatment of Anaphylaxis — IM adrenaline 1:1000 by age.
    child_dose_bands: [
      { label: 'Adult / over 12 years', dose: '500 micrograms', volume_ml: '0.5 ml', min_age_months: 144 },
      { label: '6–12 years', dose: '300 micrograms', volume_ml: '0.3 ml', min_age_months: 72, max_age_months: 144 },
      { label: '6 months – 6 years', dose: '150 micrograms', volume_ml: '0.15 ml', min_age_months: 6, max_age_months: 72 },
      { label: 'Under 6 months', dose: '100–150 micrograms', volume_ml: '0.1–0.15 ml', max_age_months: 6 },
    ],
    route: 'IM',
    site: 'Anterolateral mid-thigh (outer thigh)',
    how_to_give:
      '1. Use a 1 ml syringe with blue (23 G) or green (21 G) needle\n' +
      '2. Draw up correct volume from 1:1000 ampoule\n' +
      '3. Inject deep IM into outer mid-thigh\n' +
      '4. Can inject through clothing in extremis\n' +
      '5. Massage injection site briefly',
    repeat_interval_min: 5,
    warnings: [
      'CONFIRM concentration is 1:1000 (1 mg/ml) — NOT 1:10,000',
      'IM route ONLY in dental practice — NEVER give IV',
      'Repeat every 5 minutes if no improvement',
      'No upper limit on number of doses',
      'Auto-injectors (EpiPen/Jext 300 μg) deliver LESS than recommended adult dose — if used first, give second dose from ampoule',
      'Call 999 immediately — do not wait to assess response'
    ],
    references: ['Scottish Government 2024', 'Resuscitation Council UK 2021', 'BNF']
  },

  // ═══════════════════════ ORAL GLUCOSE ═══════════════════════
  {
    id: 'glucose_oral',
    name: 'Oral Glucose',
    indication: 'Hypoglycaemia (conscious patient)',
    adult_dose: '15–20 g fast-acting carbohydrate',
    adult_dose_text:
      '15–20 g fast-acting carbohydrate:\n' +
      '• GlucoGel: 1–2 tubes squeezed inside cheek\n' +
      '• Glucose tablets: 4–5 tablets (~4 g each)\n' +
      '• Non-diet fizzy drink: 150–200 ml\n' +
      '• Sugar lumps: 3–4',
    route: 'ORAL',
    how_to_give:
      '1. Confirm patient is conscious and can swallow safely\n' +
      '2. Give chosen glucose source\n' +
      '3. Wait 10–15 minutes, then reassess\n' +
      '4. Repeat up to 3 times if no improvement\n' +
      '5. Once recovered, give longer-acting carbohydrate (biscuit, sandwich, next meal)',
    repeat_interval_min: 15,
    max_doses: 3,
    warnings: [
      'Patient MUST be conscious and able to swallow',
      'Do NOT give anything by mouth if drowsy or unconscious',
      'If no improvement after 3 treatments → call 999',
      'Follow successful treatment with longer-acting carbohydrate',
      'Use glucometer to confirm if available (BM < 4 mmol/L)'
    ],
    references: ['Scottish Government 2024', 'SDCEP', 'BNF', 'Diabetes UK']
  },

  // ═══════════════════════ GLUCAGON ═══════════════════════
  {
    id: 'glucagon_im',
    name: 'Glucagon 1 mg Injection',
    indication: 'Severe hypoglycaemia (unconscious / unable to swallow)',
    adult_dose: '1 mg (1 unit)',
    adult_dose_text: '1 mg intramuscularly. Takes 10–15 minutes to work.',
    child_dose: '<8 y or <25 kg: 500 micrograms (0.5 mg)',
    child_dose_text:
      'Child ≥ 8 years or ≥ 25 kg: 1 mg IM\n' +
      'Child < 8 years or < 25 kg: 500 micrograms IM',
    route: 'IM',
    site: 'Deltoid, anterolateral thigh, or buttock',
    how_to_give:
      '1. Reconstitute powder with diluent provided in kit\n' +
      '2. Gently swirl (do not shake vigorously)\n' +
      '3. Inject entire contents IM\n' +
      '4. Place patient in recovery position\n' +
      '5. Once conscious and able to swallow → give oral glucose',
    repeat_interval_min: 10,
    max_doses: 1,
    warnings: [
      'Call 999 for any unconscious hypoglycaemia',
      'Place in recovery position immediately',
      'Takes 10–15 minutes to work — be patient',
      'Give oral glucose as soon as patient can swallow',
      'Less effective in alcohol-induced or prolonged hypoglycaemia',
      'Less effective in malnourished patients'
    ],
    references: ['Scottish Government 2024', 'SDCEP', 'BNF']
  },

  // ═══════════════════════ SALBUTAMOL ═══════════════════════
  {
    id: 'salbutamol_inhaled',
    name: 'Salbutamol 100 μg Inhaler + Spacer',
    indication: 'Acute asthma attack',
    adult_dose: '4–10 puffs via spacer',
    adult_dose_text:
      'Moderate: 4 puffs initially (1 puff at a time)\n' +
      'Severe: up to 10 puffs (1 puff at a time)\n' +
      'Each puff: 5 tidal breaths through spacer',
    child_dose: '2–10 puffs via spacer',
    child_dose_text: 'Child: 2–10 puffs via spacer (with face mask if needed)',
    route: 'INH',
    how_to_give:
      '1. Sit the patient upright\n' +
      '2. Shake inhaler well\n' +
      '3. Insert into spacer device\n' +
      '4. Give ONE puff at a time\n' +
      '5. Patient takes 5 normal breaths through spacer after each puff\n' +
      '6. Wait ~30 seconds between puffs',
    repeat_interval_min: 10,
    warnings: [
      'ALWAYS use with spacer in an emergency',
      'Patient must sit upright — never lie flat',
      'If severe or life-threatening → call 999 immediately',
      'If no spacer available, use direct to mouth (less effective)',
      'Monitor for deterioration — silent chest is life-threatening'
    ],
    references: ['Scottish Government 2024', 'SDCEP', 'BNF', 'BTS/SIGN Asthma Guidelines']
  },

  // ═══════════════════════ ASPIRIN ═══════════════════════
  {
    id: 'aspirin_oral',
    name: 'Aspirin 300 mg Dispersible',
    indication: 'Suspected myocardial infarction (MI)',
    adult_dose: '300 mg single dose',
    adult_dose_text: 'One 300 mg dispersible aspirin — patient must CHEW, not swallow whole',
    route: 'ORAL',
    how_to_give:
      '1. Confirm no aspirin allergy and no active bleeding\n' +
      '2. Give ONE 300 mg dispersible aspirin tablet\n' +
      '3. Patient must CHEW the tablet (faster absorption)\n' +
      '4. Do not give with water — chew and dissolve in mouth\n' +
      '5. Single dose only — do not repeat',
    warnings: [
      'Patient must CHEW — not swallow whole',
      'Give ONLY after 999 has been called',
      'Contraindicated if aspirin allergy',
      'Contraindicated if active GI bleeding',
      'Not for children under 16 (Reye\'s syndrome)',
      'Single dose only — do not repeat'
    ],
    contraindications: [
      'Known aspirin/NSAID allergy',
      'Active peptic ulcer or GI bleeding',
      'Bleeding disorders',
      'Children under 16 years'
    ],
    references: ['Scottish Government 2024', 'SDCEP', 'BNF', 'Resuscitation Council UK 2021']
  },

  // ═══════════════════════ GTN ═══════════════════════
  {
    id: 'gtn_sublingual',
    name: 'GTN Spray 400 μg/dose',
    indication: 'Angina / cardiac ischaemia',
    adult_dose: '1–2 sprays (400–800 μg)',
    adult_dose_text: '1–2 metered sprays (400 micrograms each) under the tongue',
    route: 'SL',
    how_to_give:
      '1. Patient MUST be seated or lying down (risk of hypotension)\n' +
      '2. Spray under tongue — do NOT inhale spray\n' +
      '3. Patient closes mouth after spray\n' +
      '4. Can repeat after 5 minutes if pain persists\n' +
      '5. Maximum 3 doses total\n' +
      '6. Pain not relieved after 3 doses → suspect MI → call 999',
    repeat_interval_min: 5,
    max_doses: 3,
    warnings: [
      'Patient MUST be sitting or lying — can cause dangerous drop in BP',
      'If patient has own GTN spray, try theirs first',
      'Pain persisting > 15 min despite GTN = likely MI',
      'Do NOT give if systolic BP below 100 mmHg (BDJ 2025)',
      'Ask about recent PDE5 inhibitor use (Viagra/sildenafil, tadalafil)'
    ],
    contraindications: [
      'Systolic blood pressure below 100 mmHg',
      'Recent use of PDE5 inhibitors (sildenafil, tadalafil, vardenafil)',
      'Severe aortic stenosis',
      'Marked hypotension or signs of shock'
    ],
    references: ['Scottish Government 2024', 'SDCEP', 'BNF']
  },

  // ═══════════════════════ MIDAZOLAM ═══════════════════════
  {
    id: 'midazolam_buccal',
    name: 'Midazolam Oromucosal Solution',
    indication: 'Status epilepticus (seizure > 5 minutes)',
    adult_dose: '10 mg buccal',
    adult_dose_text: '10 mg administered between gum and cheek (half on each side)',
    child_dose: '5–10 y: 7.5 mg · 1–5 y: 5 mg',
    child_dose_text:
      'Child > 10 years: 10 mg buccal\n' +
      'Child 5–10 years: 7.5 mg buccal\n' +
      'Child 1–5 years: 5 mg buccal',
    route: 'BUCCAL',
    site: 'Between gum and cheek — half on each side',
    how_to_give:
      '1. Call 999 BEFORE giving midazolam\n' +
      '2. Only give if seizure has lasted > 5 minutes\n' +
      '3. Carefully open the mouth (do not force)\n' +
      '4. Insert syringe between gum and cheek\n' +
      '5. Inject slowly — give half on each side\n' +
      '6. Have suction ready',
    max_doses: 1,
    warnings: [
      'ONLY give for seizure lasting > 5 minutes — NOT for a seizure that has stopped',
      'SINGLE DOSE ONLY — do not repeat',
      'Call 999 BEFORE giving',
      'Have suction ready — risk of aspiration',
      'Monitor airway closely — can cause respiratory depression',
      'Midazolam is a controlled drug (Schedule 3)',
      'Dental hygienists/therapists: can only give under written direction of dentist (Patient Specific Directive)'
    ],
    references: ['Scottish Government 2024', 'SDCEP', 'BNF', 'NICE Epilepsy']
  },

  // ═══════════════════════ OXYGEN ═══════════════════════
  {
    id: 'oxygen_high_flow',
    name: 'Oxygen — High Flow (15 L/min)',
    indication: 'Anaphylaxis, cardiac arrest, severe asthma, unconscious',
    adult_dose: '15 L/min',
    adult_dose_text: '15 L/min via non-rebreather mask with reservoir bag',
    route: 'INH',
    how_to_give:
      '1. Connect non-rebreather mask (with reservoir bag) to oxygen cylinder\n' +
      '2. Turn flow to 15 L/min\n' +
      '3. Wait for reservoir bag to inflate before placing on patient\n' +
      '4. Place mask over nose and mouth, ensure good seal\n' +
      '5. Delivers ~85% oxygen concentration',
    warnings: [
      'Scottish Government requires minimum 30 min supply at 15 L/min',
      'Check cylinder gauge regularly — know when it is getting low',
      'In known COPD: still give oxygen in emergency, but monitor closely',
      'Size D cylinder (340 L) = ~22 min at 15 L/min',
      'Size CD cylinder (460 L) = ~30 min at 15 L/min',
      'Size E cylinder (680 L) = ~45 min at 15 L/min'
    ],
    references: ['Scottish Government 2024', 'Resuscitation Council UK 2021', 'BTS O₂ Guidelines']
  },
  {
    id: 'oxygen_moderate_flow',
    name: 'Oxygen — Moderate Flow (5–10 L/min)',
    indication: 'Angina (if hypoxic), post-syncope recovery',
    adult_dose: '5–10 L/min',
    adult_dose_text: '5–10 L/min via simple face mask (or nasal cannulae at 1–4 L/min)',
    route: 'INH',
    how_to_give:
      '1. Connect simple face mask or nasal cannulae to O₂ cylinder\n' +
      '2. Turn flow to appropriate rate\n' +
      '3. Aim SpO₂ 94–98% (88–92% if known COPD)\n' +
      '4. Monitor patient response with pulse oximeter if available',
    warnings: [
      'For MI/angina: only give oxygen if hypoxic (SpO₂ < 94%)',
      'Routine high-flow O₂ in MI is NOT recommended (Resus Council UK)',
      'In COPD: target SpO₂ 88–92%',
      'Use pulse oximeter to guide therapy if available'
    ],
    references: ['Resuscitation Council UK 2021', 'BTS O₂ Guidelines', 'NICE MI guideline']
  },

  // ═══════════════════════ HYDROCORTISONE ═══════════════════════
  // Note: NOT on Scottish Government mandatory drug list, but listed in BNF
  // dental emergencies for adrenal crisis. Consider stocking if treating
  // patients on long-term steroids.
  {
    id: 'hydrocortisone_im',
    name: 'Hydrocortisone 100 mg Injection',
    indication: 'Adrenal crisis (steroid-dependent patients)',
    adult_dose: '100 mg IM or slow IV',
    adult_dose_text: '100 mg by intramuscular injection (or slow IV if access available)',
    // Paediatric bands per BSPED 2024 consensus / NICE NG243 (2024): the older
    // 50/25/25 mg bands under-dosed children — corrected 2026-06-22 (clinical
    // reviewer signed off; see memory/clinical-decisions).
    child_dose: '6 y and over: 100 mg · 1–5 y: 50 mg · <1 y: 25 mg',
    child_dose_text:
      'Child 6 years and over: 100 mg IM\n' +
      'Child 1–5 years: 50 mg IM\n' +
      'Infant under 1 year: 25 mg IM',
    route: 'IM',
    site: 'Deltoid or anterolateral thigh',
    how_to_give:
      '1. Reconstitute with water for injection (if powder form)\n' +
      '2. Inject IM into deltoid or outer thigh\n' +
      '3. Can repeat after 6 hours if needed\n' +
      '4. Patient should be laid flat with legs elevated',
    repeat_interval_min: 360,
    warnings: [
      'Only for patients on long-term systemic steroids (>5 mg prednisolone daily)',
      'Also for patients who stopped steroids within past 12 months',
      'Patients on high-dose inhaled steroids may also be at risk',
      'Adrenal crisis can mimic syncope but does NOT respond to lying flat',
      'NOT on Scottish Government mandatory drug list — check local guidance',
      'Call 999 for all suspected adrenal crisis'
    ],
    references: ['BNF', 'SDCEP', 'Resuscitation Council UK 2021']
  }
];

export const getDrugById = (id: string): Drug | undefined => {
  return drugs.find(d => d.id === id);
};

export const getDrugsByIndication = (indication: string): Drug[] => {
  return drugs.filter(d =>
    d.indication.toLowerCase().includes(indication.toLowerCase())
  );
};

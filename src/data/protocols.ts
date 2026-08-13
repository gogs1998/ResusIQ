import type { Protocol, TriageQuestion } from '../types';

// UK Dental Emergency Protocols - Based on Resuscitation Council UK 2021 & SDCEP Guidelines

export const protocols: Protocol[] = [
  // ==================== CARDIAC ARREST / CPR ====================
  {
    id: 'cardiac_arrest',
    title: 'Cardiac Arrest (CPR + AED)',
    category: 'unconscious',
    icon: 'Heart',
    color: '#dc2626',
    entry_criteria: [
      { question_id: 'conscious', equals: false },
      { question_id: 'breathing_normally', equals: false }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP'],
    steps: [
      {
        id: 'safety',
        type: 'instruction',
        say: 'First, make sure it is safe to approach them.',
        show: 'Make sure it’s safe to approach them.',
        next: 'response'
      },
      {
        id: 'response',
        type: 'instruction',
        say: 'Shake their shoulders gently and ask loudly, are you alright?',
        show: 'Shake their shoulders and shout, "Are you alright?"',
        next: 'shout_help'
      },
      {
        id: 'shout_help',
        type: 'role_assignment',
        say: 'Shout for help. Get someone to call 999 on speakerphone now and fetch the defibrillator.',
        show: 'Shout for help.\n\nGet someone to call 999 on speakerphone and fetch the defibrillator.',
        roles: [
          { role: 'Person 1', task: 'Call 999 now, speakerphone on' },
          { role: 'Person 2', task: 'Fetch the defibrillator and oxygen' },
          { role: 'You', task: 'Stay with them and start CPR' }
        ],
        actions: ['suggest:call_999'],
        next: 'airway'
      },
      {
        id: 'airway',
        type: 'instruction',
        say: 'Tilt their head back and lift their chin to open the airway.',
        show: 'Tilt their head back and lift their chin.',
        next: 'breathing_check'
      },
      {
        id: 'breathing_check',
        type: 'instruction',
        say: 'Look and feel for normal breathing for no more than 10 seconds.',
        show: 'Look and feel for normal breathing.\n\nNo more than 10 seconds. Occasional gasps are not normal breathing.',
        next: 'breathing_decision'
      },
      {
        id: 'breathing_decision',
        type: 'decision',
        say: 'Are they breathing normally?',
        show: 'Are they breathing normally?',
        question: 'Are they breathing normally?',
        answers: [
          { label: 'Yes — they’re breathing', next: 'recovery_position' },
          { label: 'No — not breathing normally', next: 'start_cpr' }
        ]
      },
      {
        id: 'recovery_position',
        type: 'instruction',
        say: 'Roll them onto their side into the recovery position and keep watching their breathing.',
        show: 'Roll them onto their side.\n\nKeep watching their breathing. Make sure 999 is on the way.',
        next: 'monitor'
      },
      {
        id: 'start_cpr',
        type: 'instruction',
        say: 'Start CPR now. Give 30 chest compressions, then 2 rescue breaths. Send someone for the defibrillator and make sure 999 is on the line.',
        show: 'Start CPR now.\n\n30 compressions, then 2 breaths.\nSend someone for the defibrillator and 999 — do not stop compressions to wait.',
        next: 'cpr_mode'
      },
      {
        id: 'cpr_mode',
        type: 'cpr_mode',
        say: 'Push hard and fast in the centre of their chest.',
        show: 'Push hard and fast in the centre of their chest.\n\nRate 100 to 120 a minute. Depth 5 to 6 cm. Let the chest come all the way back up.',
        metronome_bpm: 110,
        compressions_per_cycle: 30,
        breaths_per_cycle: 2,
        next: 'aed_check'
      },
      {
        id: 'aed_check',
        type: 'decision',
        say: 'Is the defibrillator here?',
        show: 'Is the defibrillator here?',
        question: 'Is the defibrillator here?',
        answers: [
          { label: 'Yes — it’s here', next: 'aed_attach' },
          { label: 'No — keep doing CPR', next: 'cpr_mode' }
        ]
      },
      {
        id: 'aed_attach',
        type: 'instruction',
        say: 'Turn the defibrillator on and attach the pads to their bare chest, then follow its voice.',
        show: 'Turn it on and put the pads on their bare chest.\n\nOne below the right collarbone, one on the left side just below the armpit.',
        actions: ['log:aed_attached'],
        next: 'aed_analyse'
      },
      {
        id: 'aed_analyse',
        type: 'instruction',
        say: 'Stand clear and do not touch them while it checks the heart.',
        show: 'Stand clear. Don’t touch them.\n\nANALYSING — let it check the heart.',
        next: 'shock_decision'
      },
      {
        id: 'shock_decision',
        type: 'decision',
        say: 'Is it telling you to give a shock?',
        show: 'Is it telling you to give a shock?',
        question: 'Is it telling you to give a shock?',
        answers: [
          { label: 'Yes — shock advised', next: 'deliver_shock' },
          { label: 'No — no shock advised', next: 'resume_cpr' }
        ]
      },
      {
        id: 'deliver_shock',
        type: 'instruction',
        say: 'Make sure everyone is clear, then press the flashing shock button.',
        show: 'Make sure everyone is clear, then press the shock button.\n\nSTAND CLEAR — then start CPR again straight away.',
        actions: ['log:shock_delivered'],
        next: 'resume_cpr'
      },
      {
        id: 'resume_cpr',
        type: 'timer_block',
        say: 'Start CPR again straight away and keep going for 2 minutes.',
        show: 'Start CPR again straight away.\n\nKeep going for 2 minutes until it tells you to stop.',
        duration_seconds: 120,
        on_timer_end_next: 'aed_analyse',
        next: 'aed_analyse'
      },
      {
        id: 'monitor',
        type: 'instruction',
        say: 'Keep going until the ambulance crew take over or they start breathing normally.',
        show: 'Keep going until the ambulance arrives.\n\nBe ready to restart CPR if they stop breathing.'
      }
    ]
  },

  // ==================== ANAPHYLAXIS ====================
  {
    id: 'anaphylaxis',
    title: 'Anaphylaxis',
    category: 'allergic',
    icon: 'AlertTriangle',
    color: '#ea580c',
    entry_criteria: [
      { question_id: 'rash_swelling_wheeze', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP', 'BNF'],
    steps: [
      {
        id: 'recognition',
        type: 'instruction',
        say: 'They came on suddenly and have an Airway, Breathing or Circulation problem — this is anaphylaxis, so give adrenaline IM now. Skin changes may or may not be there.',
        show: 'This is anaphylaxis — give adrenaline IM now\n\nSudden onset + an Airway, Breathing or Circulation problem.\nSkin changes may or may not be present.',
        next: 'stop_trigger'
      },
      {
        id: 'stop_trigger',
        type: 'instruction',
        say: 'Stop the trigger if you can. Stop any drug or infusion that might be the cause.',
        show: 'Stop the trigger if you can\n\nStop any drug or infusion that could be causing it.',
        next: 'call_help'
      },
      {
        id: 'call_help',
        type: 'role_assignment',
        say: 'Get help now — call 999 and tell them anaphylaxis. Stay with them and get ready to give adrenaline.',
        show: 'Call 999 now — say anaphylaxis\n\nGet the emergency drugs kit and stay with them.',
        roles: [
          { role: 'Person 1', task: 'Call 999 now — say anaphylaxis' },
          { role: 'Person 2', task: 'Bring the emergency drugs kit' },
          { role: 'You', task: 'Stay with them and give adrenaline' }
        ],
        actions: ['suggest:call_999'],
        next: 'position'
      },
      {
        id: 'position',
        type: 'decision',
        say: 'Get them into position. Lay them flat and raise their legs, unless breathing is their main problem.',
        show: 'Position them\n\nLay flat + raise legs by default.\nSit up only if breathing is the main problem.',
        question: 'Is breathing their main problem?',
        answers: [
          { label: 'Yes — breathing is the main problem', next: 'position_sit' },
          { label: 'No — lay them flat and raise the legs', next: 'position_flat' }
        ]
      },
      {
        id: 'position_sit',
        type: 'instruction',
        say: 'Sit them up to help their breathing, but never let them stand or walk. If they feel faint, lay them flat and raise their legs again straight away.',
        show: 'Sit them up to ease breathing\n\nNever let them stand or walk.\nIf they feel faint: lay flat and raise the legs again immediately.',
        next: 'adrenaline'
      },
      {
        id: 'position_flat',
        type: 'instruction',
        say: 'Lay them flat and raise their legs. Do not sit them up — it can drop their blood pressure further.',
        show: 'Lay them flat, legs raised\n\nDo not sit them up — it can worsen low blood pressure.',
        next: 'adrenaline'
      },
      {
        id: 'adrenaline',
        type: 'drug',
        drug_id: 'adrenaline_im_adult',
        say: 'Give adrenaline into the outer thigh now. For an adult that is 500 micrograms — half a millilitre of 1 in 1000.',
        show: 'Give adrenaline IM now\n\nAdult: 500 micrograms (0.5 ml of 1:1000), into the outer mid-thigh.\nChild doses by age are shown below.',
        require_confirm: true,
        next: 'oxygen'
      },
      {
        id: 'oxygen',
        type: 'drug',
        drug_id: 'oxygen_high_flow',
        say: 'Put them on high-flow oxygen — 15 litres a minute through a non-rebreather mask.',
        show: 'High-flow oxygen, 15 L/min\n\nUse a non-rebreather mask with the reservoir bag.',
        require_confirm: false,
        actions: ['log:oxygen_started'],
        next: 'monitor_response'
      },
      {
        id: 'monitor_response',
        type: 'timer_block',
        say: 'Stay with them and watch closely. Reassess at 5 minutes — if they are no better, you will repeat the adrenaline.',
        show: 'Watch closely — reassess at 5 minutes\n\nGet ready to repeat adrenaline if they are not improving.',
        duration_seconds: 300,
        on_timer_end_next: 'reassess',
        next: 'reassess'
      },
      {
        id: 'reassess',
        type: 'decision',
        say: 'Five minutes on — check them again. Are they getting better?',
        show: 'Reassess — are they improving?',
        question: 'Are they improving?',
        answers: [
          { label: 'Yes — they are improving', next: 'continue_monitor' },
          { label: 'No — no better, or worse', next: 'repeat_adrenaline' }
        ]
      },
      {
        id: 'repeat_adrenaline',
        type: 'drug',
        drug_id: 'adrenaline_im_adult',
        say: 'Repeat the adrenaline now, same dose, and again every 5 minutes — there is no upper limit. If they are still no better after two doses this is refractory anaphylaxis, so make sure the ambulance is on its way now for the IV adrenaline and fluids you cannot give here. Keep the oxygen on and keep them flat with their legs raised.',
        show: 'Repeat adrenaline IM now\n\nSame dose, every 5 minutes — no upper limit.\nNo better after 2 doses = refractory: make sure 999 is coming now for IV adrenaline and fluids you cannot give here.\nKeep oxygen on, keep them flat with legs raised.',
        require_confirm: true,
        next: 'monitor_response'
      },
      {
        id: 'continue_monitor',
        type: 'instruction',
        say: 'They are improving — stay with them. Keep the oxygen on, watch for any deterioration, and be ready to start CPR if they stop responding.',
        show: 'Keep monitoring\n\nKeep the oxygen on and watch for deterioration.\nBe ready to start CPR if they stop responding, and wait for the ambulance.',
        next: 'cardiac_arrest_check'
      },
      {
        id: 'cardiac_arrest_check',
        type: 'decision',
        say: 'Check them — have they become unresponsive and stopped breathing normally?',
        show: 'Are they unresponsive and not breathing normally?',
        question: 'Have they become unresponsive and stopped breathing normally?',
        answers: [
          { label: 'Yes — unresponsive, not breathing', next: 'start_cpr' },
          { label: 'No — keep monitoring', next: 'continue_monitor' }
        ]
      },
      {
        id: 'start_cpr',
        type: 'instruction',
        say: 'Start CPR now. I will switch you to the cardiac arrest guide.',
        show: 'Start CPR now\n\nSwitching you to the cardiac arrest guide.',
        actions: ['switch_protocol:cardiac_arrest']
      }
    ]
  },

  // ==================== ASTHMA ====================
  {
    id: 'asthma',
    title: 'Asthma Attack',
    category: 'breathing',
    icon: 'Wind',
    color: '#2563eb',
    entry_criteria: [
      { question_id: 'wheeze', equals: true },
      { question_id: 'known_asthma', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP', 'BTS/SIGN Guidelines'],
    steps: [
      {
        id: 'recognise',
        recognition: true,
        type: 'instruction',
        say: 'Sit them upright and keep them calm. They are having an asthma attack — wheeze, breathlessness, a tight chest, struggling to speak.',
        show: 'Sit them upright. Keep calm.\n\nAsthma attack: wheeze, breathless, tight chest, struggling to speak.',
        next: 'assess_severity'
      },
      {
        id: 'assess_severity',
        type: 'decision',
        say: 'How bad is it? Can they speak a full sentence in one breath?',
        show: 'Can they speak a full sentence in one breath?',
        question: 'Can they speak a full sentence in one breath?',
        answers: [
          { label: 'Yes — they can finish a sentence', next: 'moderate_asthma' },
          { label: 'No — too breathless to finish a sentence', next: 'severe_asthma' }
        ]
      },
      {
        id: 'moderate_asthma',
        type: 'instruction',
        say: 'Keep them sitting upright and calm. Loosen anything tight around the neck.',
        show: 'Keep them upright and calm.\n\nLoosen tight clothing around the neck.',
        next: 'salbutamol'
      },
      {
        id: 'severe_asthma',
        type: 'instruction',
        say: 'This is severe — call 999 now and tell them life-threatening asthma. Help is on the way; stay with them.',
        show: 'Call 999 now — say life-threatening asthma.\n\nSTANDBY — stay with them, keep them upright.',
        actions: ['suggest:call_999'],
        next: 'salbutamol_severe'
      },
      {
        id: 'salbutamol',
        type: 'drug',
        drug_id: 'salbutamol_inhaled',
        say: 'Give their salbutamol through the spacer — 4 puffs, one puff at a time.',
        show: 'Salbutamol through the spacer — 4 puffs.\n\nOne puff at a time, 5 breaths each, about 30 seconds between puffs.',
        require_confirm: true,
        next: 'reassess_moderate'
      },
      {
        id: 'salbutamol_severe',
        type: 'drug',
        drug_id: 'salbutamol_inhaled',
        say: 'Give salbutamol through the spacer — up to 10 puffs, one puff at a time.',
        show: 'Salbutamol through the spacer — up to 10 puffs.\n\nOne puff at a time, 5 breaths each.',
        require_confirm: true,
        next: 'oxygen_severe'
      },
      {
        id: 'oxygen_severe',
        type: 'drug',
        drug_id: 'oxygen_high_flow',
        say: 'If you have oxygen, give it now at 15 litres a minute through a mask.',
        show: 'Give oxygen if you have it.\n\n15 litres a minute through a mask.',
        require_confirm: false,
        next: 'reassess_severe'
      },
      {
        id: 'reassess_moderate',
        type: 'timer_block',
        say: 'Give it 5 minutes to work, then check them again.',
        show: 'Wait 5 minutes, then reassess.',
        duration_seconds: 300,
        on_timer_end_next: 'moderate_check'
      },
      {
        id: 'moderate_check',
        type: 'decision',
        say: 'How are they now — are they getting better?',
        show: 'Are they improving?',
        question: 'Are they improving?',
        answers: [
          { label: 'Yes — breathing is easing', next: 'monitor_moderate' },
          { label: 'No — same or getting worse', next: 'escalate' }
        ]
      },
      {
        id: 'monitor_moderate',
        type: 'instruction',
        say: 'Good. Keep watching them. You can repeat the salbutamol every 10 minutes if they need it.',
        show: 'Keep watching them.\n\nRepeat salbutamol every 10 minutes if needed. Get medical advice before they leave if not fully back to normal.'
      },
      {
        id: 'escalate',
        type: 'instruction',
        say: 'They are not improving — call 999 now if you have not already, and give more salbutamol.',
        show: 'Call 999 now if not already done.\n\nGive up to 10 more puffs of salbutamol. Give oxygen if you have it.',
        actions: ['suggest:call_999'],
        next: 'reassess_severe'
      },
      {
        id: 'reassess_severe',
        type: 'instruction',
        say: 'Stay with them and keep treating. If they stop responding and stop breathing normally, start CPR.',
        show: 'Stay with them until the ambulance arrives.\n\nRepeat salbutamol every 10 minutes, keep oxygen flowing. If they become unresponsive, start CPR.'
      }
    ]
  },

  // ==================== HYPOGLYCAEMIA ====================
  {
    id: 'hypoglycaemia',
    title: 'Hypoglycaemia',
    category: 'metabolic',
    icon: 'Droplet',
    color: '#7c3aed',
    entry_criteria: [
      { question_id: 'known_diabetes', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP', 'Diabetes UK'],
    steps: [
      {
        id: 'recognise',
        recognition: true,
        type: 'instruction',
        say: 'Low blood sugar in a diabetic patient. They may be sweaty, shaky, confused or drowsy.',
        show: 'Low blood sugar?\n\nSweaty, shaky, confused, irritable or drowsy in a diabetic patient.',
        next: 'conscious_check'
      },
      {
        id: 'conscious_check',
        type: 'decision',
        say: 'Are they fully awake and able to swallow safely?',
        show: 'Are they awake and able to swallow safely?',
        question: 'Are they awake and able to swallow safely?',
        answers: [
          { label: 'Yes — awake, can swallow', next: 'oral_glucose' },
          { label: 'No — drowsy, unconscious or can’t swallow', next: 'unconscious_hypo' }
        ]
      },
      {
        id: 'oral_glucose',
        type: 'drug',
        drug_id: 'glucose_oral',
        say: 'Give them fast-acting sugar by mouth now. About 15 to 20 grams.',
        show: 'Give 15 to 20 g of fast-acting sugar.\n\n1 to 2 tubes of glucose gel, or 4 to 5 glucose tablets, or 150 to 200 ml of a non-diet sugary drink. Not a diet drink.',
        require_confirm: true,
        next: 'wait_response'
      },
      {
        id: 'wait_response',
        type: 'timer_block',
        say: 'Wait 10 to 15 minutes, then check them again.',
        show: 'Wait 10 to 15 minutes.\n\nThen check whether they are improving.',
        duration_seconds: 600,
        on_timer_end_next: 'reassess_hypo'
      },
      {
        id: 'reassess_hypo',
        type: 'decision',
        say: 'Are they getting better?',
        show: 'Are they improving?',
        question: 'Are they improving?',
        answers: [
          { label: 'Yes — improving', next: 'recovery_hypo' },
          { label: 'No — no better yet', next: 'repeat_glucose' }
        ]
      },
      {
        id: 'repeat_glucose',
        type: 'drug',
        drug_id: 'glucose_oral',
        say: 'Give another dose of fast-acting sugar. If there’s no improvement after 3 doses, call 999.',
        show: 'Repeat the fast-acting sugar.\n\nStill no better after 3 doses? Call 999.',
        require_confirm: true,
        next: 'third_check'
      },
      {
        id: 'third_check',
        type: 'decision',
        say: 'Is this the third dose with still no improvement?',
        show: 'Third dose and still no better?',
        question: 'Third dose and still no better?',
        answers: [
          { label: 'Yes — call 999', next: 'call_999_hypo' },
          { label: 'No — wait and check again', next: 'wait_response' }
        ]
      },
      {
        id: 'call_999_hypo',
        type: 'instruction',
        say: 'Call 999 now. Tell them it’s low blood sugar that isn’t responding to treatment.',
        show: 'Call 999 now.\n\nSay: low blood sugar not responding to treatment.',
        actions: ['suggest:call_999'],
        next: 'monitor_hypo'
      },
      {
        id: 'recovery_hypo',
        type: 'instruction',
        say: 'They’re recovering. Once they’re fully back to normal, give them a longer-lasting carbohydrate.',
        show: 'They’re recovering.\n\nWhen fully alert, give longer-lasting carbs: a biscuit, a sandwich, or their next meal.'
      },
      {
        id: 'unconscious_hypo',
        type: 'instruction',
        say: 'Call 999 now. Do not put anything in their mouth.',
        show: 'Call 999 now.\n\nNothing by mouth — they can’t protect their airway.',
        actions: ['suggest:call_999'],
        next: 'recovery_position_hypo'
      },
      {
        id: 'recovery_position_hypo',
        type: 'instruction',
        say: 'Roll them onto their side into the recovery position and keep their airway open.',
        show: 'Roll them into the recovery position.\n\nKeep their airway open and keep watching their breathing.',
        next: 'glucagon_check'
      },
      {
        id: 'glucagon_check',
        type: 'decision',
        say: 'Do you have glucagon to hand?',
        show: 'Is glucagon available?',
        question: 'Is glucagon available?',
        answers: [
          { label: 'Yes — glucagon available', next: 'give_glucagon' },
          { label: 'No — none available', next: 'monitor_hypo' }
        ]
      },
      {
        id: 'give_glucagon',
        type: 'drug',
        drug_id: 'glucagon_im',
        say: 'Give glucagon into the muscle. 1 milligram for an adult.',
        show: 'Glucagon IM — 1 mg for an adult.\n\nChild under 8 years or under 25 kg: 500 micrograms. It takes 10 to 15 minutes to work.',
        require_confirm: true,
        next: 'monitor_hypo'
      },
      {
        id: 'monitor_hypo',
        type: 'instruction',
        say: 'Keep watching them closely until the ambulance arrives. Only give sugar by mouth once they’re awake and can swallow.',
        show: 'Keep watching them until the ambulance arrives.\n\nGive sugar by mouth only once they’re awake and able to swallow safely.'
      }
    ]
  },

  // ==================== SYNCOPE / FAINT ====================
  {
    id: 'syncope',
    title: 'Syncope (Faint)',
    category: 'unconscious',
    icon: 'CircleOff',
    color: '#6b7280',
    entry_criteria: [],
    references: ['Resuscitation Council UK 2021', 'SDCEP'],
    steps: [
      {
        id: 'recognise',
        recognition: true,
        type: 'instruction',
        say: 'A simple faint. They may feel hot, sick or lightheaded and go pale before they pass out.',
        show: 'Looks like a faint.\n\nHot, sweaty, sick, going pale, then a brief loss of consciousness. The next step gets blood back to their head.',
        next: 'position'
      },
      {
        id: 'position',
        type: 'instruction',
        say: 'Lay them flat and raise their legs. Loosen anything tight around their neck.',
        show: 'Lay them flat and raise their legs.\n\nLoosen tight clothing at the neck. This gets blood back to their head — most faints come round quickly.',
        next: 'check_response'
      },
      {
        id: 'check_response',
        type: 'decision',
        say: 'Are they coming round?',
        show: 'Are they coming round?',
        question: 'Are they coming round?',
        answers: [
          { label: 'Yes — they’re responding', next: 'recovery' },
          { label: 'No — still out after a minute', next: 'abcde' }
        ]
      },
      {
        id: 'recovery',
        type: 'instruction',
        say: 'Good. Keep them flat until they feel fully back to normal, then sit them up slowly.',
        show: 'Keep them lying flat until they feel fully recovered.\n\nThen sit them up slowly — no rush. Offer a sip of water once they’re alert.',
        next: 'assess_cause'
      },
      {
        id: 'assess_cause',
        type: 'instruction',
        say: 'A simple faint settles fast. If they’re slow to recover or something feels off, think again about the cause.',
        show: 'A simple faint recovers quickly.\n\nThink again if they’re slow to come round, or if there’s chest pain, palpitations, pregnancy, or a long loss of consciousness — and be ready to call 999.'
      },
      {
        id: 'abcde',
        type: 'instruction',
        say: 'Not coming round — check the basics. Open the airway, and look and feel for normal breathing.',
        show: 'They’re not recovering — treat this as serious.\n\nTilt the head back, lift the chin, and look and feel for normal breathing. Occasional gasps are not normal breathing.',
        next: 'breathing_check_syncope'
      },
      {
        id: 'breathing_check_syncope',
        type: 'decision',
        say: 'Are they breathing normally?',
        show: 'Are they breathing normally?',
        question: 'Is the patient breathing normally?',
        answers: [
          { label: 'Yes — they’re breathing', next: 'recovery_position_syncope' },
          { label: 'No — not breathing normally', next: 'cpr' }
        ]
      },
      {
        id: 'recovery_position_syncope',
        type: 'instruction',
        say: 'Roll them onto their side and call 999. Keep watching their breathing.',
        show: 'Roll them onto their side, into the recovery position.\n\nCall 999 now. Keep watching their breathing until help arrives.',
        actions: ['suggest:call_999']
      },
      {
        id: 'cpr',
        type: 'instruction',
        say: 'Not breathing normally — start CPR now. I’ll switch you to the cardiac arrest steps.',
        show: 'Not breathing normally — start CPR.\n\nSwitching you to the cardiac arrest protocol now.',
        actions: ['switch_protocol:cardiac_arrest']
      }
    ]
  },

  // ==================== SEIZURE ====================
  {
    id: 'seizure',
    title: 'Seizure',
    category: 'neurological',
    icon: 'Zap',
    color: '#8b5cf6',
    entry_criteria: [
      { question_id: 'seizure', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP', 'NICE Epilepsy'],
    steps: [
      {
        id: 'protect',
        type: 'instruction',
        say: 'Protect them from injury and move hard objects away. Do not restrain them, and do not put anything in their mouth.',
        show: 'Protect them from injury.\n\nMove hard objects away and cushion their head. Do not restrain them. Do not put anything in their mouth.',
        next: 'time_seizure'
      },
      {
        id: 'time_seizure',
        type: 'timer_block',
        say: 'Note the time it started and time the seizure.',
        show: 'Time the seizure from now.\n\nNote the start time. If it was already going before you opened this, count from when it actually started.\nMost seizures stop on their own within 5 minutes.',
        duration_seconds: 300,
        on_timer_end_next: 'prolonged_seizure'
      },
      {
        id: 'prolonged_seizure',
        type: 'decision',
        say: 'Has the seizure lasted longer than 5 minutes?',
        show: 'Has the seizure lasted longer than 5 minutes?',
        question: 'Has the seizure lasted longer than 5 minutes?',
        answers: [
          { label: 'Yes — longer than 5 minutes', next: 'call_999_seizure' },
          { label: 'No — still seizing, under 5 minutes', next: 'continue_timing' },
          { label: 'Seizure has stopped', next: 'post_ictal' }
        ]
      },
      {
        id: 'continue_timing',
        type: 'instruction',
        say: 'Keep timing and keep protecting them. Call 999 if it passes 5 minutes.',
        show: 'Keep timing. Keep them safe.\n\nIf the seizure passes 5 minutes, call 999.',
        next: 'time_seizure'
      },
      {
        id: 'call_999_seizure',
        type: 'instruction',
        say: 'Call 999 now. A seizure lasting longer than 5 minutes is a medical emergency.',
        show: 'Call 999 now.\n\nPROLONGED — a seizure over 5 minutes is status epilepticus and needs the ambulance.',
        actions: ['suggest:call_999'],
        next: 'midazolam_check'
      },
      {
        id: 'midazolam_check',
        type: 'decision',
        say: 'Do you have buccal midazolam in the emergency kit?',
        show: 'Do you have buccal midazolam?',
        question: 'Do you have buccal midazolam?',
        answers: [
          { label: 'Yes — it is in the kit', next: 'give_midazolam' },
          { label: 'No — not available', next: 'monitor_seizure' }
        ]
      },
      {
        id: 'give_midazolam',
        type: 'drug',
        drug_id: 'midazolam_buccal',
        say: 'Give one dose of buccal midazolam between the gum and cheek. For an adult that is 10 milligrams. This is a single dose only — do not repeat it.',
        show: 'Give buccal midazolam — one dose only.\n\nAdult and 10 years+: 10 mg (2 ml). 5 to under 10: 7.5 mg (1.5 ml). 1 to under 5: 5 mg (1 ml). 6 months to under 1 year: 2.5 mg (0.5 ml).\nPlace between the gum and cheek, half each side. Single dose — do not repeat.',
        require_confirm: true,
        next: 'monitor_seizure'
      },
      {
        id: 'monitor_seizure',
        type: 'instruction',
        say: 'Stay with them and keep watching their airway and breathing. Have suction ready.',
        show: 'Stay with them until the ambulance arrives.\n\nKeep their airway clear and have suction ready. Be ready to start CPR if they stop breathing normally.'
      },
      {
        id: 'post_ictal',
        type: 'instruction',
        say: 'The seizure has stopped. Roll them onto their side into the recovery position and check their airway.',
        show: 'Seizure stopped — recovery position.\n\nCheck their airway. They may be confused or drowsy for a while. Stay with them.',
        next: 'post_ictal_assessment'
      },
      {
        id: 'post_ictal_assessment',
        type: 'decision',
        say: 'Is this their first ever seizure, or is anything unusual about it?',
        show: 'First seizure, or anything unusual?',
        question: 'First seizure or unusual features?',
        answers: [
          { label: 'Yes — first seizure, or unusual', next: 'call_999_first' },
          { label: 'No — known epilepsy, typical seizure', next: 'monitor_recovery' }
        ]
      },
      {
        id: 'call_999_first',
        type: 'instruction',
        say: 'Call 999. A first or unusual seizure needs to be assessed.',
        show: 'Call 999.\n\nA first-ever, prolonged, repeated or unusual seizure, or any injury, needs medical assessment.',
        actions: ['suggest:call_999']
      },
      {
        id: 'monitor_recovery',
        type: 'instruction',
        say: 'Stay with them until they have fully recovered, and do not leave them alone.',
        show: 'Stay with them until they are fully recovered.\n\nRecovery can take time. Do not leave them on their own.'
      }
    ]
  },

  // ==================== CHEST PAIN / MI ====================
  {
    id: 'chest_pain',
    title: 'Chest Pain / Suspected MI',
    category: 'cardiac',
    icon: 'HeartPulse',
    color: '#dc2626',
    entry_criteria: [
      { question_id: 'chest_pain', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP', 'BNF'],
    steps: [
      {
        id: 'recognise',
        recognition: true,
        type: 'instruction',
        say: 'Sit them up, supported, and keep them calm. This could be a heart attack.',
        show: 'Sit them up, supported. Keep them calm.\n\nCould be a heart attack: central chest pain that may spread to the arm, jaw or back, with sweating, nausea or breathlessness.',
        next: 'call_999_chest'
      },
      {
        id: 'call_999_chest',
        type: 'instruction',
        say: 'Call 999 now and say you think it’s a heart attack.',
        show: 'Call 999 now — say suspected heart attack.\n\nGet someone to fetch the emergency kit and the defibrillator while you stay with them.',
        actions: ['suggest:call_999'],
        next: 'position_chest'
      },
      {
        id: 'position_chest',
        type: 'instruction',
        say: 'Keep them sitting up and resting, in whatever position feels easiest.',
        show: 'Keep them sitting up and resting.\n\nSupported, knees bent if that’s more comfortable. Don’t let them walk about.',
        next: 'gtn_check'
      },
      {
        id: 'gtn_check',
        type: 'decision',
        say: 'Do they carry their own GTN spray for angina?',
        show: 'Do they have their own GTN spray?',
        question: 'Do they have their own GTN spray?',
        answers: [
          { label: 'Yes — they have their own GTN', next: 'give_patient_gtn' },
          { label: 'No — no GTN', next: 'aspirin' }
        ]
      },
      {
        id: 'give_patient_gtn',
        type: 'drug',
        drug_id: 'gtn_sublingual',
        say: 'Give 1 to 2 sprays of their GTN under the tongue — but only if they’re sitting and their systolic blood pressure is above 100.',
        show: 'GTN spray, 1 to 2 sprays under the tongue.\n\nOnly if systolic blood pressure is above 100 mmHg (BDJ 2025), and only while they’re sitting or lying. Repeat after 5 minutes if pain stays. Up to 3 doses.',
        require_confirm: true,
        next: 'aspirin'
      },
      {
        id: 'aspirin',
        type: 'drug',
        drug_id: 'aspirin_oral',
        say: 'Give one 300 milligram aspirin to chew, not swallow — first check they’re not allergic and not bleeding.',
        show: 'Aspirin 300 mg — they must chew it.\n\nFirst check: no aspirin allergy, no active bleeding, not already taken today, and they’re 16 or over. Single dose only.',
        require_confirm: true,
        next: 'oxygen_chest'
      },
      {
        id: 'oxygen_chest',
        type: 'decision',
        say: 'Are they breathless, or are their oxygen levels low?',
        show: 'Are they breathless or are their oxygen levels low?',
        question: 'Are they breathless or are their oxygen levels low?',
        answers: [
          { label: 'Yes — breathless or oxygen low', next: 'give_oxygen_chest' },
          { label: 'No — breathing fine', next: 'monitor_chest' }
        ]
      },
      {
        id: 'give_oxygen_chest',
        type: 'drug',
        drug_id: 'oxygen_moderate_flow',
        say: 'Give oxygen now, just enough to bring their levels back to normal.',
        show: 'Oxygen only because they need it.\n\nAim for oxygen levels of 94 to 98 percent. Don’t give routine high-flow oxygen in a heart attack — it can do harm.',
        next: 'monitor_chest'
      },
      {
        id: 'monitor_chest',
        type: 'instruction',
        say: 'Stay with them, keep talking to them, and have the defibrillator ready.',
        show: 'Stay with them until the ambulance arrives.\n\nKeep talking to them, have the defibrillator close, and be ready to start CPR if they collapse.',
        next: 'deterioration_check'
      },
      {
        id: 'deterioration_check',
        type: 'decision',
        say: 'Are they still responding to you?',
        show: 'Are they still responding?',
        question: 'Are they still responding?',
        answers: [
          { label: 'No — they’ve collapsed', next: 'start_cpr_chest' },
          { label: 'Yes — still with you', next: 'monitor_chest' }
        ]
      },
      {
        id: 'start_cpr_chest',
        type: 'instruction',
        say: 'They’ve gone into cardiac arrest. Start CPR now — I’ll take you through it.',
        show: 'Start CPR now.\n\nSwitching you to the cardiac arrest guide.',
        actions: ['switch_protocol:cardiac_arrest']
      }
    ]
  },

  // ==================== CHOKING ====================
  {
    id: 'choking',
    title: 'Choking',
    category: 'airway',
    icon: 'AlertOctagon',
    color: '#f59e0b',
    entry_criteria: [
      { question_id: 'choking', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP'],
    steps: [
      {
        id: 'assess_severity',
        type: 'decision',
        say: 'First, can they cough, speak or breathe?',
        show: 'Can they cough, speak or breathe?\n\nA strong cough is a good sign — let them try to clear it themselves.',
        question: 'Can the patient cough, speak or breathe?',
        answers: [
          { label: 'Coughing — still able to cough', next: 'mild_choking' },
          { label: 'Can’t cough, breathe or speak', next: 'severe_choking' }
        ]
      },
      {
        id: 'mild_choking',
        type: 'instruction',
        say: 'Encourage them to keep coughing. Don’t hit their back yet.',
        show: 'Encourage them to keep coughing.\n\nDon’t slap their back or interfere. Stay with them and watch closely in case it gets worse.',
        next: 'mild_resolved'
      },
      {
        id: 'mild_resolved',
        type: 'decision',
        say: 'Has it cleared?',
        show: 'Has it cleared?',
        question: 'Has the obstruction cleared?',
        answers: [
          { label: 'Yes — they’ve cleared it', next: 'choking_resolved' },
          { label: 'No — it’s getting worse', next: 'severe_choking' }
        ]
      },
      {
        id: 'severe_choking',
        type: 'instruction',
        say: 'Call 999 now, then give up to 5 sharp back blows between their shoulder blades.',
        show: 'Give up to 5 back blows between their shoulder blades.\n\nStand to the side and slightly behind. Lean them well forward and support their chest with one hand. Call 999 now.',
        actions: ['suggest:call_999'],
        next: 'back_blows_check'
      },
      {
        id: 'back_blows_check',
        type: 'decision',
        say: 'Has it cleared after the back blows?',
        show: 'Has it cleared?',
        question: 'Has the obstruction cleared?',
        answers: [
          { label: 'Yes — they’ve cleared it', next: 'choking_resolved' },
          { label: 'No — still choking', next: 'abdominal_thrusts' }
        ]
      },
      {
        id: 'abdominal_thrusts',
        type: 'instruction',
        say: 'Now give up to 5 abdominal thrusts. Pull sharply inward and upward.',
        show: 'Give up to 5 abdominal thrusts.\n\nStand behind them and put your arms around their upper tummy. Make a fist above the navel, below the ribcage. Grab it with your other hand and pull sharply in and up.',
        next: 'thrusts_check'
      },
      {
        id: 'thrusts_check',
        type: 'decision',
        say: 'Has it cleared?',
        show: 'Has it cleared?',
        question: 'Has the obstruction cleared?',
        answers: [
          { label: 'Yes — they’ve cleared it', next: 'choking_resolved' },
          { label: 'No — still choking', next: 'alternate_cycle' }
        ]
      },
      {
        id: 'alternate_cycle',
        type: 'instruction',
        say: 'Keep alternating 5 back blows and 5 abdominal thrusts. Make sure 999 is on the way.',
        show: 'Keep going: 5 back blows, then 5 abdominal thrusts.\n\nRepeat until it clears or they pass out. Make sure 999 has been called.',
        actions: ['suggest:call_999'],
        next: 'conscious_check_choking'
      },
      {
        id: 'conscious_check_choking',
        type: 'decision',
        say: 'Are they still conscious?',
        show: 'Are they still conscious?',
        question: 'Is the patient still conscious?',
        answers: [
          { label: 'Yes — keep going', next: 'severe_choking' },
          { label: 'No — they’ve passed out', next: 'choking_cpr' }
        ]
      },
      {
        id: 'choking_cpr',
        type: 'instruction',
        say: 'Lower them carefully to the floor, call 999, and start CPR now.',
        show: 'Lower them to the floor and start CPR.\n\nMake sure 999 has been called. I’ll take you through CPR.',
        actions: ['switch_protocol:cardiac_arrest']
      },
      {
        id: 'choking_resolved',
        type: 'instruction',
        say: 'It’s cleared. Keep watching them. If you gave abdominal thrusts, they need to be checked by a doctor.',
        show: 'Cleared — well done.\n\nKeep watching them in case it comes back. If you gave any abdominal thrusts, they must be checked by a doctor. Write up what happened.'
      }
    ]
  },

  // ==================== STROKE ====================
  {
    id: 'stroke',
    title: 'Stroke / TIA',
    category: 'stroke',
    icon: 'Brain',
    color: '#0891b2',
    entry_criteria: [
      { question_id: 'stroke_symptoms', equals: true }
    ],
    references: ['Resuscitation Council UK 2021', 'SDCEP', 'FAST Campaign'],
    steps: [
      {
        id: 'fast',
        recognition: true,
        type: 'instruction',
        say: 'Check them with FAST — face, arms, speech, and time to call 999.',
        show: 'Check them with FAST.\n\nFace, arms, speech — then time to call 999.',
        next: 'face_check'
      },
      {
        id: 'face_check',
        type: 'decision',
        say: 'Ask them to smile. Has one side of their face dropped?',
        show: 'Ask them to smile.\n\nHas one side of their face dropped?',
        question: 'Has their face dropped on one side?',
        answers: [
          { label: 'Yes — face has dropped', next: 'time_call' },
          { label: 'No — face looks even', next: 'arm_check' }
        ]
      },
      {
        id: 'arm_check',
        type: 'decision',
        say: 'Ask them to raise both arms. Can they hold them up?',
        show: 'Ask them to raise both arms.\n\nCan they hold both up, or does one drift down?',
        question: 'Is one arm weak?',
        answers: [
          { label: 'Yes — one arm is weak', next: 'time_call' },
          { label: 'No — both arms hold up', next: 'speech_check' }
        ]
      },
      {
        id: 'speech_check',
        type: 'decision',
        say: 'Ask them to speak. Is their speech slurred or muddled?',
        show: 'Ask them to repeat a simple phrase.\n\nIs their speech slurred or muddled?',
        question: 'Is their speech affected?',
        answers: [
          { label: 'Yes — speech is slurred or muddled', next: 'time_call' },
          { label: 'No — speech is clear', next: 'any_positive' }
        ]
      },
      {
        id: 'any_positive',
        type: 'decision',
        say: 'Were any of the face, arm, or speech signs there?',
        show: 'Were any FAST signs present?\n\nFace, arm, or speech — even just one.',
        question: 'Were any FAST signs present?',
        answers: [
          { label: 'Yes — call 999 now', next: 'time_call' },
          { label: 'No — keep watching them', next: 'not_stroke' }
        ]
      },
      {
        id: 'time_call',
        type: 'instruction',
        say: 'Call 999 now. Tell them it is a suspected stroke.',
        show: 'Call 999 now.\n\nSay "suspected stroke" — they need it fast.',
        actions: ['suggest:call_999'],
        next: 'record_time'
      },
      {
        id: 'record_time',
        type: 'instruction',
        say: 'Note when the signs started, or when they were last seen well.',
        show: 'Note the time it started.\n\nIf you are not sure, when were they last seen well? This guides treatment.',
        next: 'position_stroke'
      },
      {
        id: 'position_stroke',
        type: 'instruction',
        say: 'Sit them up a little and keep them comfortable while you wait.',
        show: 'Keep them comfortable.\n\nIf awake, sit them up a little. If not responding, recovery position.',
        next: 'monitor_stroke'
      },
      {
        id: 'monitor_stroke',
        type: 'instruction',
        say: 'Keep watching them. Nothing to eat or drink, and do not give aspirin.',
        show: 'Keep watching them — stay ready.\n\nNothing to eat or drink.\nDo not give aspirin — it could be a bleed.\nReassure them and note any change.',
        next: 'deterioration_stroke'
      },
      {
        id: 'deterioration_stroke',
        type: 'decision',
        say: 'Are they still responding to you?',
        show: 'Are they still responding?',
        question: 'Are they still responding?',
        answers: [
          { label: 'No — they’ve collapsed', next: 'stroke_cpr' },
          { label: 'Yes — still responding', next: 'monitor_stroke' }
        ]
      },
      {
        id: 'stroke_cpr',
        type: 'instruction',
        say: 'Check their breathing. If it is not normal, start CPR now.',
        show: 'Check their breathing.\n\nIf not breathing normally, start CPR now.',
        actions: ['switch_protocol:cardiac_arrest']
      },
      {
        id: 'not_stroke',
        type: 'instruction',
        say: 'No clear stroke signs. Keep watching them and get advice if you are worried.',
        show: 'No clear stroke signs.\n\nKeep watching them, think about other causes, and get medical advice if anything changes.'
      }
    ]
  },

  // ==================== ADRENAL CRISIS ====================
  {
    id: 'adrenal_crisis',
    title: 'Adrenal Crisis',
    category: 'metabolic',
    icon: 'ShieldAlert',
    color: '#b45309',
    entry_criteria: [],
    references: ['BNF', 'SDCEP', 'Resuscitation Council UK 2021'],
    steps: [
      {
        id: 'recognise',
        type: 'instruction',
        say: 'Suspect adrenal crisis if they are on long-term steroids and have collapsed without recovering when laid flat.',
        show: 'Suspect adrenal crisis.\n\nOn long-term steroids and collapsed, not recovering when laid flat. Often pale, weak, very low blood pressure.',
        next: 'steroid_check'
      },
      {
        id: 'steroid_check',
        type: 'decision',
        say: 'Are they on long-term steroids, or did they stop steroids within the last 12 months?',
        show: 'Are they on long-term steroids, or stopped within the last 12 months?',
        question: 'Are they on long-term steroids, or did they stop steroids in the past 12 months?',
        answers: [
          { label: 'Yes — on or recently on steroids', next: 'call_999_adrenal' },
          { label: 'No / unsure — not steroid-dependent', next: 'consider_other' }
        ]
      },
      {
        id: 'call_999_adrenal',
        type: 'instruction',
        say: 'Call 999 now. Tell them you suspect adrenal crisis in a patient who depends on steroids.',
        show: 'Call 999 now.\n\nSay: suspected adrenal crisis, steroid-dependent patient.',
        actions: ['suggest:call_999'],
        next: 'position_adrenal'
      },
      {
        id: 'position_adrenal',
        type: 'instruction',
        say: 'Lay them flat and raise their legs.',
        show: 'Lay them flat. Raise their legs.',
        next: 'hydrocortisone_check'
      },
      {
        id: 'hydrocortisone_check',
        type: 'decision',
        say: 'Do you have a hydrocortisone injection, and are you trained to give it?',
        show: 'Hydrocortisone injection to hand?',
        question: 'Do you have hydrocortisone injection available?',
        answers: [
          { label: 'Yes — have it and trained', next: 'give_hydrocortisone' },
          { label: 'No — not available', next: 'oxygen_adrenal' }
        ]
      },
      {
        id: 'give_hydrocortisone',
        type: 'drug',
        drug_id: 'hydrocortisone_im',
        say: 'Give hydrocortisone 100 milligrams by intramuscular injection into the outer thigh or upper arm.',
        show: 'Hydrocortisone 100 mg IM.\n\nAdult: 100 mg. Child 6 years and over: 100 mg. Child 1 to 5 years: 50 mg. Under 1 year: 25 mg. Outer thigh or upper arm.',
        require_confirm: true,
        next: 'oxygen_adrenal'
      },
      {
        id: 'oxygen_adrenal',
        type: 'drug',
        drug_id: 'oxygen_high_flow',
        say: 'Give high-flow oxygen if you have it.',
        show: 'High-flow oxygen if available.\n\n15 litres a minute through a non-rebreather mask.',
        require_confirm: false,
        next: 'monitor_adrenal'
      },
      {
        id: 'monitor_adrenal',
        type: 'instruction',
        say: 'Keep them flat and keep watching their breathing until the ambulance arrives. Be ready to start CPR if they stop breathing normally.',
        show: 'Keep them flat, legs raised. Watch their breathing.\n\nBe ready to start CPR if they stop breathing normally. Stay until the ambulance arrives.'
      },
      {
        id: 'consider_other',
        type: 'instruction',
        say: 'They are not on steroids, so think about other causes such as a faint, low blood sugar, or anaphylaxis.',
        show: 'Not steroid-dependent — think of other causes.\n\nFaint, low blood sugar, anaphylaxis, or a cardiac cause. Go back to triage if unsure.'
      }
    ]
  }
];

export const triageQuestions: TriageQuestion[] = [
  { id: 'conscious', text: 'Is the patient conscious?', type: 'boolean' },
  { id: 'breathing_normally', text: 'Is the patient breathing normally?', type: 'boolean' },
  { id: 'rash_swelling_wheeze', text: 'Any rash, swelling, or wheeze?', type: 'boolean' },
  { id: 'chest_pain', text: 'Chest pain or discomfort?', type: 'boolean' },
  { id: 'seizure', text: 'Is the patient having a seizure?', type: 'boolean' },
  { id: 'choking', text: 'Is the patient choking?', type: 'boolean' },
  { id: 'stroke_symptoms', text: 'Face droop, arm weakness, or speech problems?', type: 'boolean' },
  { id: 'wheeze', text: 'Wheezing or difficulty breathing?', type: 'boolean' },
  { id: 'known_diabetes', text: 'Known diabetic?', type: 'optional' },
  { id: 'known_asthma', text: 'Known asthmatic?', type: 'optional' },
  { id: 'known_epilepsy', text: 'Known epileptic?', type: 'optional' }
];

export const getProtocolById = (id: string): Protocol | undefined => {
  return protocols.find(p => p.id === id);
};

export const getProtocolsByCategory = (category: string): Protocol[] => {
  return protocols.filter(p => p.category === category);
};

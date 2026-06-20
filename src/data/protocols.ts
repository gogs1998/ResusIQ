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
        say: 'Check for danger. Ensure the area is safe.',
        show: 'CHECK DANGER - Ensure area is safe',
        next: 'response'
      },
      {
        id: 'response',
        type: 'instruction',
        say: 'Shake shoulders gently and shout. Are you alright?',
        show: 'CHECK RESPONSE - Shake & shout "Are you alright?"',
        next: 'shout_help'
      },
      {
        id: 'shout_help',
        type: 'role_assignment',
        say: 'Shout for help now. Assign someone to call 999 and get the AED.',
        show: 'SHOUT FOR HELP',
        roles: [
          { role: 'Person 1', task: 'Call 999 - speakerphone on' },
          { role: 'Person 2', task: 'Get AED and oxygen' },
          { role: 'You', task: 'Start assessment and CPR' }
        ],
        actions: ['suggest:call_999'],
        next: 'airway'
      },
      {
        id: 'airway',
        type: 'instruction',
        say: 'Open the airway. Head tilt, chin lift.',
        show: 'OPEN AIRWAY - Head tilt, chin lift',
        next: 'breathing_check'
      },
      {
        id: 'breathing_check',
        type: 'instruction',
        say: 'Look, listen, and feel for breathing. Take no more than 10 seconds.',
        show: 'CHECK BREATHING - Look, listen, feel (max 10 seconds)',
        next: 'breathing_decision'
      },
      {
        id: 'breathing_decision',
        type: 'decision',
        say: 'Is the patient breathing normally?',
        show: 'Is patient breathing normally?',
        question: 'Is the patient breathing normally?',
        answers: [
          { label: 'Yes - Breathing', next: 'recovery_position' },
          { label: 'No / Abnormal', next: 'start_cpr' }
        ]
      },
      {
        id: 'recovery_position',
        type: 'instruction',
        say: 'Place in the recovery position. Call 999 if not done. Monitor breathing.',
        show: 'RECOVERY POSITION - Monitor breathing continuously',
        next: 'monitor'
      },
      {
        id: 'start_cpr',
        type: 'instruction',
        say: 'Start CPR immediately. 30 compressions then 2 breaths.',
        show: 'START CPR NOW - 30:2 ratio',
        next: 'cpr_mode'
      },
      {
        id: 'cpr_mode',
        type: 'cpr_mode',
        say: 'Performing CPR. Push hard and fast in the centre of the chest.',
        show: 'CPR IN PROGRESS\n\nRate: 100-120/min\nDepth: 5-6cm\nAllow full recoil',
        metronome_bpm: 110,
        compressions_per_cycle: 30,
        breaths_per_cycle: 2,
        next: 'aed_check'
      },
      {
        id: 'aed_check',
        type: 'decision',
        say: 'Is the AED here?',
        show: 'Is AED available?',
        question: 'Is the AED here?',
        answers: [
          { label: 'Yes', next: 'aed_attach' },
          { label: 'No - Continue CPR', next: 'cpr_mode' }
        ]
      },
      {
        id: 'aed_attach',
        type: 'instruction',
        say: 'Attach AED pads. One below right collarbone, one on left side below armpit. Follow AED prompts.',
        show: 'ATTACH AED PADS\n\nâ€¢ Right: Below collarbone\nâ€¢ Left: Side of chest, below armpit\n\nFollow AED voice prompts',
        actions: ['log:aed_attached'],
        next: 'aed_analyse'
      },
      {
        id: 'aed_analyse',
        type: 'instruction',
        say: 'Stand clear. AED is analysing. Do not touch the patient.',
        show: 'STAND CLEAR - AED ANALYSING',
        next: 'shock_decision'
      },
      {
        id: 'shock_decision',
        type: 'decision',
        say: 'Does the AED advise a shock?',
        show: 'AED advises shock?',
        question: 'AED advises shock?',
        answers: [
          { label: 'Yes - Shock advised', next: 'deliver_shock' },
          { label: 'No - No shock', next: 'resume_cpr' }
        ]
      },
      {
        id: 'deliver_shock',
        type: 'instruction',
        say: 'Stand clear. Press the shock button now. Then immediately resume CPR.',
        show: 'STAND CLEAR\nDELIVER SHOCK\nThen resume CPR immediately',
        actions: ['log:shock_delivered'],
        next: 'resume_cpr'
      },
      {
        id: 'resume_cpr',
        type: 'timer_block',
        say: 'Resume CPR immediately. Continue for 2 minutes until AED re-analyses.',
        show: 'RESUME CPR - 2 minutes',
        duration_seconds: 120,
        on_timer_end_next: 'aed_analyse',
        next: 'aed_analyse'
      },
      {
        id: 'monitor',
        type: 'instruction',
        say: 'Continue monitoring until ambulance arrives. Be ready to restart CPR if they stop breathing.',
        show: 'MONITOR CONTINUOUSLY\nBe ready to restart CPR'
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
        say: 'Recognise anaphylaxis. Look for: Sudden onset. Airway swelling. Breathing difficulty. Circulation problems. Skin changes.',
        show: 'RECOGNISE ANAPHYLAXIS\n\nâ€¢ Sudden onset\nâ€¢ Airway: swelling, hoarse voice\nâ€¢ Breathing: wheeze, stridor\nâ€¢ Circulation: pale, clammy, low BP\nâ€¢ Skin: itchy rash, flushing',
        next: 'stop_trigger'
      },
      {
        id: 'stop_trigger',
        type: 'instruction',
        say: 'Stop the trigger if possible. Remove any IV drugs. Stop any infusions.',
        show: 'STOP TRIGGER - Remove causative agent if possible',
        next: 'call_help'
      },
      {
        id: 'call_help',
        type: 'role_assignment',
        say: 'Call for help. Call 999 immediately. State anaphylaxis.',
        show: 'CALL 999 - State ANAPHYLAXIS',
        roles: [
          { role: 'Person 1', task: 'Call 999 - say ANAPHYLAXIS' },
          { role: 'Person 2', task: 'Get emergency drugs kit' },
          { role: 'You', task: 'Stay with patient, give adrenaline' }
        ],
        actions: ['suggest:call_999', 'log:999_called'],
        next: 'position'
      },
      {
        id: 'position',
        type: 'decision',
        say: 'Position the patient. If breathing difficulty, sit them up. Otherwise, lie flat with legs raised.',
        show: 'POSITION PATIENT',
        question: 'Is the patient having breathing difficulty?',
        answers: [
          { label: 'Yes - Breathing problems', next: 'position_sit' },
          { label: 'No - Circulation problems', next: 'position_flat' }
        ]
      },
      {
        id: 'position_sit',
        type: 'instruction',
        say: 'Sit the patient upright to help breathing.',
        show: 'SIT UPRIGHT - Easier to breathe',
        next: 'adrenaline'
      },
      {
        id: 'position_flat',
        type: 'instruction',
        say: 'Lie flat with legs raised. Do not sit up if low blood pressure.',
        show: 'LIE FLAT - Legs raised\n\nâš ï¸ Do NOT sit up if hypotensive',
        next: 'adrenaline'
      },
      {
        id: 'adrenaline',
        type: 'drug',
        drug_id: 'adrenaline_im_adult',
        say: 'Give adrenaline intramuscular now. Adult dose: 500 micrograms. That is 0.5ml of 1 in 1000. Inject into outer thigh.',
        show: 'ADRENALINE IM NOW\n\nAdult: 500 micrograms (0.5ml of 1:1000)\nChild 6-12: 300 micrograms (0.3ml)\nChild <6: 150 micrograms (0.15ml)\n\nSite: Outer mid-thigh',
        require_confirm: true,
        next: 'oxygen'
      },
      {
        id: 'oxygen',
        type: 'drug',
        drug_id: 'oxygen_high_flow',
        say: 'Give high flow oxygen. 15 litres per minute via non-rebreather mask.',
        show: 'OXYGEN 15 L/min\nNon-rebreather mask with reservoir',
        require_confirm: false,
        actions: ['log:oxygen_started'],
        next: 'monitor_response'
      },
      {
        id: 'monitor_response',
        type: 'timer_block',
        say: 'Monitor closely. Reassess in 5 minutes. If no improvement, repeat adrenaline.',
        show: 'MONITOR & REASSESS\n\nTimer: 5 minutes to reassess\nPrepare to repeat adrenaline if no improvement',
        duration_seconds: 300,
        on_timer_end_next: 'reassess',
        next: 'reassess'
      },
      {
        id: 'reassess',
        type: 'decision',
        say: 'Reassess the patient. Is there improvement?',
        show: 'REASSESS - Any improvement?',
        question: 'Is the patient improving?',
        answers: [
          { label: 'Yes - Improving', next: 'continue_monitor' },
          { label: 'No - Not improving', next: 'repeat_adrenaline' }
        ]
      },
      {
        id: 'repeat_adrenaline',
        type: 'drug',
        drug_id: 'adrenaline_im_adult',
        say: 'Repeat adrenaline now. Same dose. Can repeat every 5 minutes. There is no upper limit on the number of doses.',
        show: 'REPEAT ADRENALINE IM\n\nSame dose as before\nCan repeat every 5 minutes\nNo upper limit on doses',
        require_confirm: true,
        next: 'monitor_response'
      },
      {
        id: 'continue_monitor',
        type: 'instruction',
        say: 'Continue monitoring. Keep oxygen on. Watch for deterioration. Be ready to start CPR if they become unresponsive.',
        show: 'CONTINUE MONITORING\n\nâ€¢ Keep oxygen on\nâ€¢ Watch for deterioration\nâ€¢ Prepare for CPR if needed\nâ€¢ Wait for ambulance'
      },
      {
        id: 'cardiac_arrest_check',
        type: 'decision',
        say: 'Has the patient become unresponsive and stopped breathing?',
        show: 'Patient unresponsive?',
        question: 'Has patient become unresponsive?',
        answers: [
          { label: 'Yes - Cardiac arrest', next: 'start_cpr' },
          { label: 'No - Continue monitoring', next: 'continue_monitor' }
        ]
      },
      {
        id: 'start_cpr',
        type: 'instruction',
        say: 'Start CPR immediately. Switch to cardiac arrest protocol.',
        show: 'START CPR - Switch to Cardiac Arrest protocol',
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
        type: 'instruction',
        say: 'Recognise asthma attack. Wheeze. Shortness of breath. Tight chest. Difficulty speaking.',
        show: 'RECOGNISE ASTHMA ATTACK\n\nâ€¢ Wheeze\nâ€¢ Shortness of breath\nâ€¢ Chest tightness\nâ€¢ Difficulty speaking\nâ€¢ Using accessory muscles',
        next: 'assess_severity'
      },
      {
        id: 'assess_severity',
        type: 'decision',
        say: 'Assess severity. Can the patient speak in full sentences?',
        show: 'ASSESS SEVERITY',
        question: 'Can patient speak in full sentences?',
        answers: [
          { label: 'Yes - Can speak', next: 'moderate_asthma' },
          { label: 'No - Cannot complete sentences', next: 'severe_asthma' }
        ]
      },
      {
        id: 'moderate_asthma',
        type: 'instruction',
        say: 'Moderate attack. Keep calm. Sit patient upright.',
        show: 'MODERATE ATTACK\n\nâ€¢ Stay calm\nâ€¢ Sit upright\nâ€¢ Loosen tight clothing',
        next: 'salbutamol'
      },
      {
        id: 'severe_asthma',
        type: 'instruction',
        say: 'Severe attack. Call 999 now. This is a life-threatening emergency.',
        show: 'âš ï¸ SEVERE/LIFE-THREATENING\n\nCALL 999 IMMEDIATELY',
        actions: ['suggest:call_999'],
        next: 'salbutamol_severe'
      },
      {
        id: 'salbutamol',
        type: 'drug',
        drug_id: 'salbutamol_inhaled',
        say: 'Give salbutamol inhaler. 4 puffs via spacer. One puff at a time. 5 breaths per puff.',
        show: 'SALBUTAMOL via SPACER\n\n4 puffs initially\nâ€¢ One puff at a time\nâ€¢ 5 breaths per puff\nâ€¢ Wait 30 seconds between puffs',
        require_confirm: true,
        next: 'reassess_moderate'
      },
      {
        id: 'salbutamol_severe',
        type: 'drug',
        drug_id: 'salbutamol_inhaled',
        say: 'Give salbutamol inhaler via spacer. Up to 10 puffs. One puff at a time.',
        show: 'SALBUTAMOL via SPACER\n\nUp to 10 puffs\nâ€¢ One puff at a time\nâ€¢ 5 breaths per puff',
        require_confirm: true,
        next: 'oxygen_severe'
      },
      {
        id: 'oxygen_severe',
        type: 'drug',
        drug_id: 'oxygen_high_flow',
        say: 'Give high flow oxygen if available.',
        show: 'OXYGEN if available\n15 L/min via mask',
        require_confirm: false,
        next: 'reassess_severe'
      },
      {
        id: 'reassess_moderate',
        type: 'timer_block',
        say: 'Reassess in 5 minutes. If improving, continue to monitor.',
        show: 'REASSESS in 5 minutes',
        duration_seconds: 300,
        on_timer_end_next: 'moderate_check'
      },
      {
        id: 'moderate_check',
        type: 'decision',
        say: 'Reassess. Is the patient improving?',
        show: 'Is patient improving?',
        question: 'Is the patient improving?',
        answers: [
          { label: 'Yes - Improving', next: 'monitor_moderate' },
          { label: 'No - Getting worse', next: 'escalate' }
        ]
      },
      {
        id: 'monitor_moderate',
        type: 'instruction',
        say: 'Continue monitoring. Can repeat salbutamol every 10 minutes if needed.',
        show: 'MONITOR\n\nCan repeat salbutamol every 10 minutes\nSeek medical advice if not fully recovered'
      },
      {
        id: 'escalate',
        type: 'instruction',
        say: 'Not improving. Call 999 if not already done. Give more salbutamol.',
        show: 'ESCALATE - CALL 999\n\nGive up to 10 puffs salbutamol\nGive oxygen if available',
        actions: ['suggest:call_999'],
        next: 'reassess_severe'
      },
      {
        id: 'reassess_severe',
        type: 'instruction',
        say: 'Continue monitoring. Prepare for deterioration. If they become unresponsive, start CPR.',
        show: 'MONITOR CONTINUOUSLY\n\nâ€¢ Repeat salbutamol every 10 mins\nâ€¢ Keep oxygen flowing\nâ€¢ Prepare for CPR if deteriorates\nâ€¢ Wait for ambulance'
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
        type: 'instruction',
        say: 'Recognise hypoglycaemia. Sweating. Shaking. Confusion. Aggression. Pallor. Weakness.',
        show: 'RECOGNISE HYPOGLYCAEMIA\n\nâ€¢ Sweating, trembling\nâ€¢ Confusion, irritability\nâ€¢ Pallor, weakness\nâ€¢ Hunger\nâ€¢ Drowsiness\nâ€¢ Known diabetic',
        next: 'conscious_check'
      },
      {
        id: 'conscious_check',
        type: 'decision',
        say: 'Is the patient conscious and able to swallow safely?',
        show: 'Can patient swallow safely?',
        question: 'Is patient conscious and able to swallow?',
        answers: [
          { label: 'Yes - Conscious', next: 'oral_glucose' },
          { label: 'No - Unconscious/drowsy', next: 'unconscious_hypo' }
        ]
      },
      {
        id: 'oral_glucose',
        type: 'drug',
        drug_id: 'glucose_oral',
        say: 'Give oral glucose now. Glucose gel, glucose tablets, or sugary drink. 15 to 20 grams.',
        show: 'GIVE ORAL GLUCOSE\n\nâ€¢ GlucoGel: 1-2 tubes\nâ€¢ Glucose tablets: 4-5 tablets\nâ€¢ Sugary drink: 150-200ml\nâ€¢ NOT diet drinks',
        require_confirm: true,
        next: 'wait_response'
      },
      {
        id: 'wait_response',
        type: 'timer_block',
        say: 'Wait 10 to 15 minutes. Then reassess.',
        show: 'WAIT 10-15 MINUTES\nThen reassess',
        duration_seconds: 600,
        on_timer_end_next: 'reassess_hypo'
      },
      {
        id: 'reassess_hypo',
        type: 'decision',
        say: 'Reassess. Is the patient improving?',
        show: 'Is patient improving?',
        question: 'Is the patient improving?',
        answers: [
          { label: 'Yes - Improving', next: 'recovery_hypo' },
          { label: 'No - No improvement', next: 'repeat_glucose' }
        ]
      },
      {
        id: 'repeat_glucose',
        type: 'drug',
        drug_id: 'glucose_oral',
        say: 'Repeat oral glucose. If no improvement after 3 treatments, call 999.',
        show: 'REPEAT ORAL GLUCOSE\n\nâš ï¸ If no improvement after 3 treatments - CALL 999',
        require_confirm: true,
        next: 'third_check'
      },
      {
        id: 'third_check',
        type: 'decision',
        say: 'Is this the third treatment without improvement?',
        show: 'Third treatment without improvement?',
        question: 'Third attempt without improvement?',
        answers: [
          { label: 'Yes - Call 999', next: 'call_999_hypo' },
          { label: 'No - Wait and reassess', next: 'wait_response' }
        ]
      },
      {
        id: 'call_999_hypo',
        type: 'instruction',
        say: 'Call 999 now. State hypoglycaemia not responding to treatment.',
        show: 'CALL 999\n\nState: Hypoglycaemia not responding',
        actions: ['suggest:call_999'],
        next: 'monitor_hypo'
      },
      {
        id: 'recovery_hypo',
        type: 'instruction',
        say: 'Patient improving. Give longer acting carbohydrate when fully recovered. Biscuits, sandwich, or their next meal.',
        show: 'RECOVERY\n\nGive longer-acting carbs:\nâ€¢ Biscuits\nâ€¢ Sandwich\nâ€¢ Next meal\n\nDiscuss with patient'
      },
      {
        id: 'unconscious_hypo',
        type: 'instruction',
        say: 'Patient unconscious. Call 999 immediately. Do not give anything by mouth.',
        show: 'âš ï¸ UNCONSCIOUS - CALL 999\n\nDO NOT give anything by mouth',
        actions: ['suggest:call_999'],
        next: 'recovery_position_hypo'
      },
      {
        id: 'recovery_position_hypo',
        type: 'instruction',
        say: 'Place in recovery position. Protect airway.',
        show: 'RECOVERY POSITION\nProtect airway',
        next: 'glucagon_check'
      },
      {
        id: 'glucagon_check',
        type: 'decision',
        say: 'Is glucagon available?',
        show: 'Glucagon available?',
        question: 'Do you have glucagon?',
        answers: [
          { label: 'Yes', next: 'give_glucagon' },
          { label: 'No', next: 'monitor_hypo' }
        ]
      },
      {
        id: 'give_glucagon',
        type: 'drug',
        drug_id: 'glucagon_im',
        say: 'Give glucagon intramuscular. Adult: 1 milligram.',
        show: 'GLUCAGON IM\n\nAdult: 1mg\nChild <8 years or <25kg: 500 micrograms',
        require_confirm: true,
        next: 'monitor_hypo'
      },
      {
        id: 'monitor_hypo',
        type: 'instruction',
        say: 'Monitor continuously. Give oral glucose when conscious and able to swallow. Wait for ambulance.',
        show: 'MONITOR\n\nâ€¢ Recovery position\nâ€¢ Give oral glucose when conscious\nâ€¢ Wait for ambulance'
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
        type: 'instruction',
        say: 'Recognise faint. Feeling hot and sweaty. Nausea. Going pale. Lightheadedness. Loss of consciousness.',
        show: 'RECOGNISE FAINT\n\nâ€¢ Feeling faint/lightheaded\nâ€¢ Nausea\nâ€¢ Vision going dark\nâ€¢ Sweating\nâ€¢ Pallor',
        next: 'position'
      },
      {
        id: 'position',
        type: 'instruction',
        say: 'Lay the patient flat. Raise their legs. Loosen tight clothing.',
        show: 'LAY FLAT\nRAISE LEGS\nLoosen tight clothing',
        next: 'check_response'
      },
      {
        id: 'check_response',
        type: 'decision',
        say: 'Is the patient responding?',
        show: 'Is patient responding?',
        question: 'Is the patient responding?',
        answers: [
          { label: 'Yes - Responding', next: 'recovery' },
          { label: 'No - Still unconscious', next: 'abcde' }
        ]
      },
      {
        id: 'recovery',
        type: 'instruction',
        say: 'Keep lying flat until fully recovered. Then sit up slowly. Offer water.',
        show: 'RECOVERY\n\nâ€¢ Keep flat until fully recovered\nâ€¢ Sit up slowly\nâ€¢ Offer water\nâ€¢ Do not rush',
        next: 'assess_cause'
      },
      {
        id: 'assess_cause',
        type: 'instruction',
        say: 'Simple vascular faint usually recovers quickly. Consider other causes if not recovering or if unusual features.',
        show: 'ASSESS CAUSE\n\nSimple faint: Quick recovery\n\nâš ï¸ Consider other causes if:\nâ€¢ Not recovering quickly\nâ€¢ Chest pain\nâ€¢ Palpitations\nâ€¢ Pregnancy\nâ€¢ Prolonged unconsciousness'
      },
      {
        id: 'abcde',
        type: 'instruction',
        say: 'Check ABC. Airway, Breathing, Circulation. If not breathing normally, start CPR.',
        show: 'CHECK ABC\n\nA - Airway open?\nB - Breathing normally?\nC - Signs of circulation?',
        next: 'breathing_check_syncope'
      },
      {
        id: 'breathing_check_syncope',
        type: 'decision',
        say: 'Is the patient breathing normally?',
        show: 'Breathing normally?',
        question: 'Is the patient breathing normally?',
        answers: [
          { label: 'Yes - Breathing', next: 'recovery_position_syncope' },
          { label: 'No - Not breathing', next: 'cpr' }
        ]
      },
      {
        id: 'recovery_position_syncope',
        type: 'instruction',
        say: 'Place in recovery position. Call 999. Monitor breathing continuously.',
        show: 'RECOVERY POSITION\nCALL 999\nMonitor breathing',
        actions: ['suggest:call_999']
      },
      {
        id: 'cpr',
        type: 'instruction',
        say: 'Not breathing. Start CPR. Switch to cardiac arrest protocol.',
        show: 'START CPR\nSwitch to Cardiac Arrest protocol',
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
        say: 'Protect from injury. Move objects away. Do NOT restrain. Do NOT put anything in mouth.',
        show: 'PROTECT FROM INJURY\n\nâœ“ Move objects away\nâœ“ Protect head if possible\nâœ— Do NOT restrain\nâœ— Do NOT put anything in mouth',
        next: 'time_seizure'
      },
      {
        id: 'time_seizure',
        type: 'timer_block',
        say: 'Time the seizure. Note when it started.',
        show: 'TIME THE SEIZURE\n\nNote start time',
        duration_seconds: 300,
        on_timer_end_next: 'prolonged_seizure'
      },
      {
        id: 'prolonged_seizure',
        type: 'decision',
        say: 'Has the seizure lasted more than 5 minutes?',
        show: 'Seizure >5 minutes?',
        question: 'Has the seizure lasted more than 5 minutes?',
        answers: [
          { label: 'Yes - Over 5 minutes', next: 'call_999_seizure' },
          { label: 'No - Still seizing', next: 'continue_timing' },
          { label: 'Seizure stopped', next: 'post_ictal' }
        ]
      },
      {
        id: 'continue_timing',
        type: 'instruction',
        say: 'Continue timing. Protect from injury. Call 999 if seizure continues over 5 minutes.',
        show: 'CONTINUE TIMING\nProtect from injury',
        next: 'time_seizure'
      },
      {
        id: 'call_999_seizure',
        type: 'instruction',
        say: 'Prolonged seizure. Call 999 now. This is status epilepticus.',
        show: 'âš ï¸ PROLONGED SEIZURE\n\nCALL 999 IMMEDIATELY\nStatus epilepticus',
        actions: ['suggest:call_999'],
        next: 'midazolam_check'
      },
      {
        id: 'midazolam_check',
        type: 'decision',
        say: 'Is buccal midazolam available?',
        show: 'Midazolam available?',
        question: 'Do you have buccal midazolam?',
        answers: [
          { label: 'Yes', next: 'give_midazolam' },
          { label: 'No', next: 'monitor_seizure' }
        ]
      },
      {
        id: 'give_midazolam',
        type: 'drug',
        drug_id: 'midazolam_buccal',
        say: 'Give buccal midazolam. Adult: 10 milligrams. Insert between gum and cheek.',
        show: 'BUCCAL MIDAZOLAM\n\nAdult: 10mg\nChild 10+: 10mg\nChild 5-10: 7.5mg\nChild 1-5: 5mg\n\nBetween gum and cheek',
        require_confirm: true,
        next: 'monitor_seizure'
      },
      {
        id: 'monitor_seizure',
        type: 'instruction',
        say: 'Monitor continuously. Be ready to protect airway. Have suction ready.',
        show: 'MONITOR\n\nâ€¢ Protect airway\nâ€¢ Have suction ready\nâ€¢ Wait for ambulance'
      },
      {
        id: 'post_ictal',
        type: 'instruction',
        say: 'Seizure has stopped. Place in recovery position. Check airway. They may be confused or drowsy.',
        show: 'POST-ICTAL\n\nRecovery position\nCheck airway\nPatient may be confused\nStay with them',
        next: 'post_ictal_assessment'
      },
      {
        id: 'post_ictal_assessment',
        type: 'decision',
        say: 'Is this their first seizure, or is something unusual?',
        show: 'First seizure or unusual?',
        question: 'First seizure or unusual features?',
        answers: [
          { label: 'Yes - First/unusual', next: 'call_999_first' },
          { label: 'No - Known epileptic, typical seizure', next: 'monitor_recovery' }
        ]
      },
      {
        id: 'call_999_first',
        type: 'instruction',
        say: 'First seizure or unusual. Call 999 for assessment.',
        show: 'CALL 999\n\nFirst seizure needs medical assessment',
        actions: ['suggest:call_999']
      },
      {
        id: 'monitor_recovery',
        type: 'instruction',
        say: 'Monitor recovery. Stay with them until fully recovered. Do not leave alone.',
        show: 'MONITOR RECOVERY\n\nStay with patient\nDo not leave alone\nMay take time to fully recover'
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
        type: 'instruction',
        say: 'Recognise cardiac chest pain. Central crushing pain. May radiate to arm or jaw. Sweating. Nausea. Shortness of breath.',
        show: 'RECOGNISE CARDIAC PAIN\n\nâ€¢ Central/left chest pain\nâ€¢ Crushing, heavy, tight\nâ€¢ May radiate to arm, jaw, back\nâ€¢ Sweating, pallor\nâ€¢ Nausea\nâ€¢ Shortness of breath',
        next: 'call_999_chest'
      },
      {
        id: 'call_999_chest',
        type: 'instruction',
        say: 'Call 999 immediately. State suspected heart attack.',
        show: 'CALL 999 IMMEDIATELY\n\nState: Suspected heart attack',
        actions: ['suggest:call_999', 'log:999_called'],
        next: 'position_chest'
      },
      {
        id: 'position_chest',
        type: 'instruction',
        say: 'Position for comfort. Usually sitting up, supported. Knees bent.',
        show: 'POSITION FOR COMFORT\n\nUsually sitting up, supported\nKnees bent\nW position',
        next: 'gtn_check'
      },
      {
        id: 'gtn_check',
        type: 'decision',
        say: 'Is this angina? Does the patient have their own GTN spray?',
        show: 'Patient has own GTN?',
        question: 'Does patient have their own GTN spray?',
        answers: [
          { label: 'Yes - Has GTN', next: 'give_patient_gtn' },
          { label: 'No', next: 'aspirin' }
        ]
      },
      {
        id: 'give_patient_gtn',
        type: 'drug',
        drug_id: 'gtn_sublingual',
        say: 'Give their GTN spray. One to two sprays under the tongue.',
        show: 'GTN SPRAY\n\n1-2 sprays under tongue\nPatient must be seated\nCan repeat after 5 minutes\nMax 3 doses',
        require_confirm: true,
        next: 'aspirin'
      },
      {
        id: 'aspirin',
        type: 'drug',
        drug_id: 'aspirin_oral',
        say: 'Give aspirin 300 milligrams. Patient must CHEW, not swallow whole. Check no allergy first.',
        show: 'ASPIRIN 300mg\n\nMust CHEW the tablet\n\nâš ï¸ Check:\nâ€¢ No aspirin allergy\nâ€¢ No active bleeding\nâ€¢ Not already taken today',
        require_confirm: true,
        next: 'oxygen_chest'
      },
      {
        id: 'oxygen_chest',
        type: 'decision',
        say: 'Is the patient short of breath or oxygen saturation low?',
        show: 'Needs oxygen?',
        question: 'Is patient breathless or hypoxic?',
        answers: [
          { label: 'Yes - Give oxygen', next: 'give_oxygen_chest' },
          { label: 'No - Not needed', next: 'monitor_chest' }
        ]
      },
      {
        id: 'give_oxygen_chest',
        type: 'drug',
        drug_id: 'oxygen_moderate_flow',
        say: 'Give oxygen if needed. Aim for normal saturations.',
        show: 'OXYGEN if hypoxic\n\nAim for SpO2 94-98%',
        next: 'monitor_chest'
      },
      {
        id: 'monitor_chest',
        type: 'instruction',
        say: 'Monitor continuously. Prepare AED. Be ready to start CPR if they collapse.',
        show: 'MONITOR CONTINUOUSLY\n\nâ€¢ Keep talking to patient\nâ€¢ Prepare AED\nâ€¢ Be ready for CPR\nâ€¢ Wait for ambulance',
        next: 'deterioration_check'
      },
      {
        id: 'deterioration_check',
        type: 'decision',
        say: 'Has the patient become unresponsive?',
        show: 'Patient unresponsive?',
        question: 'Has patient become unresponsive?',
        answers: [
          { label: 'Yes - Collapsed', next: 'start_cpr_chest' },
          { label: 'No - Still conscious', next: 'monitor_chest' }
        ]
      },
      {
        id: 'start_cpr_chest',
        type: 'instruction',
        say: 'Cardiac arrest. Start CPR. Switch to cardiac arrest protocol.',
        show: 'CARDIAC ARREST\nStart CPR immediately',
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
        say: 'Assess severity. Can they cough or speak?',
        show: 'ASSESS CHOKING SEVERITY\n\nCan patient cough effectively?',
        question: 'Can the patient cough or speak?',
        answers: [
          { label: 'Yes - Mild (can cough)', next: 'mild_choking' },
          { label: 'No - Severe (silent/weak)', next: 'severe_choking' }
        ]
      },
      {
        id: 'mild_choking',
        type: 'instruction',
        say: 'Mild obstruction. Encourage coughing. Do not interfere. Monitor for deterioration.',
        show: 'MILD OBSTRUCTION\n\nâ€¢ Encourage coughing\nâ€¢ Do not slap back yet\nâ€¢ Monitor for deterioration',
        next: 'mild_resolved'
      },
      {
        id: 'mild_resolved',
        type: 'decision',
        say: 'Has the obstruction cleared?',
        show: 'Obstruction cleared?',
        question: 'Has the obstruction cleared?',
        answers: [
          { label: 'Yes - Cleared', next: 'choking_resolved' },
          { label: 'No - Getting worse', next: 'severe_choking' }
        ]
      },
      {
        id: 'severe_choking',
        type: 'instruction',
        say: 'Severe obstruction. Call for help. Give up to 5 back blows.',
        show: 'SEVERE OBSTRUCTION\n\n1. Stand to the side and slightly behind\n2. Support chest with one hand\n3. Give up to 5 sharp back blows between shoulder blades',
        actions: ['suggest:call_999'],
        next: 'back_blows_check'
      },
      {
        id: 'back_blows_check',
        type: 'decision',
        say: 'Has the obstruction cleared after back blows?',
        show: 'Cleared after back blows?',
        question: 'Obstruction cleared?',
        answers: [
          { label: 'Yes - Cleared', next: 'choking_resolved' },
          { label: 'No - Still choking', next: 'abdominal_thrusts' }
        ]
      },
      {
        id: 'abdominal_thrusts',
        type: 'instruction',
        say: 'Give up to 5 abdominal thrusts. Stand behind. Clench fist above navel. Pull sharply inward and upward.',
        show: 'ABDOMINAL THRUSTS\n\n1. Stand behind patient\n2. Clench fist, place above navel\n3. Grasp with other hand\n4. Pull sharply inward and upward\n5. Up to 5 thrusts',
        next: 'thrusts_check'
      },
      {
        id: 'thrusts_check',
        type: 'decision',
        say: 'Has the obstruction cleared?',
        show: 'Obstruction cleared?',
        question: 'Obstruction cleared?',
        answers: [
          { label: 'Yes - Cleared', next: 'choking_resolved' },
          { label: 'No - Still choking', next: 'alternate_cycle' }
        ]
      },
      {
        id: 'alternate_cycle',
        type: 'instruction',
        say: 'Continue alternating 5 back blows and 5 abdominal thrusts. Call 999 if not done.',
        show: 'ALTERNATE\n\n5 Back blows â†” 5 Abdominal thrusts\n\nCall 999 if not already done\nContinue until cleared or unconscious',
        actions: ['suggest:call_999'],
        next: 'conscious_check_choking'
      },
      {
        id: 'conscious_check_choking',
        type: 'decision',
        say: 'Is the patient still conscious?',
        show: 'Patient conscious?',
        question: 'Is the patient still conscious?',
        answers: [
          { label: 'Yes - Continue', next: 'severe_choking' },
          { label: 'No - Unconscious', next: 'choking_cpr' }
        ]
      },
      {
        id: 'choking_cpr',
        type: 'instruction',
        say: 'Patient unconscious. Lower to floor carefully. Start CPR. Call 999 if not done.',
        show: 'UNCONSCIOUS\n\nLower to floor\nStart CPR immediately\nCall 999',
        actions: ['switch_protocol:cardiac_arrest']
      },
      {
        id: 'choking_resolved',
        type: 'instruction',
        say: 'Obstruction cleared. Monitor for deterioration. If abdominal thrusts were given, advise medical review.',
        show: 'RESOLVED\n\nâ€¢ Monitor for deterioration\nâ€¢ If abdominal thrusts given, advise medical review\nâ€¢ Document incident'
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
        type: 'instruction',
        say: 'Use FAST. Face: has their face fallen on one side? Arms: can they raise both arms? Speech: is their speech slurred? Time: time to call 999.',
        show: 'FAST ASSESSMENT\n\nF - Face: Facial weakness?\nA - Arms: Arm weakness?\nS - Speech: Slurred speech?\nT - Time to call 999',
        next: 'face_check'
      },
      {
        id: 'face_check',
        type: 'decision',
        say: 'Face. Ask them to smile. Has one side of the face dropped?',
        show: 'FACE\n\nAsk to smile\nHas face dropped on one side?',
        question: 'Facial drooping?',
        answers: [
          { label: 'Yes - Face dropped', next: 'arm_check' },
          { label: 'No', next: 'arm_check' }
        ]
      },
      {
        id: 'arm_check',
        type: 'decision',
        say: 'Arms. Ask them to raise both arms. Can they keep them up?',
        show: 'ARMS\n\nAsk to raise both arms\nCan they keep both up?',
        question: 'Arm weakness?',
        answers: [
          { label: 'Yes - Arm weakness', next: 'speech_check' },
          { label: 'No', next: 'speech_check' }
        ]
      },
      {
        id: 'speech_check',
        type: 'decision',
        say: 'Speech. Is their speech slurred or muddled? Can they speak clearly?',
        show: 'SPEECH\n\nIs speech slurred?\nCan they repeat a simple phrase?',
        question: 'Speech problems?',
        answers: [
          { label: 'Yes - Speech affected', next: 'time_call' },
          { label: 'No', next: 'any_positive' }
        ]
      },
      {
        id: 'any_positive',
        type: 'decision',
        say: 'Were any FAST signs positive?',
        show: 'Any FAST signs positive?',
        question: 'Any positive FAST signs?',
        answers: [
          { label: 'Yes - Call 999', next: 'time_call' },
          { label: 'No - Monitor', next: 'not_stroke' }
        ]
      },
      {
        id: 'time_call',
        type: 'instruction',
        say: 'Time to call 999. State suspected stroke. Note the time symptoms started.',
        show: 'TIME - CALL 999 NOW\n\nState: SUSPECTED STROKE\n\nâš ï¸ NOTE TIME OF ONSET\nThis is critical for treatment',
        actions: ['suggest:call_999', 'log:999_called'],
        next: 'record_time'
      },
      {
        id: 'record_time',
        type: 'instruction',
        say: 'Record the time symptoms started. This is critical for treatment decisions.',
        show: 'RECORD ONSET TIME\n\nWhen did symptoms start?\nWhen were they last seen well?',
        next: 'position_stroke'
      },
      {
        id: 'position_stroke',
        type: 'instruction',
        say: 'Position comfortably. If conscious, slightly raised head. If unconscious, recovery position.',
        show: 'POSITION\n\nConscious: Comfortable, head slightly raised\nUnconscious: Recovery position',
        next: 'monitor_stroke'
      },
      {
        id: 'monitor_stroke',
        type: 'instruction',
        say: 'Monitor continuously. Do not give anything to eat or drink. Do NOT give aspirin. Aspirin is dangerous in stroke as it could be a bleed. Be ready for deterioration.',
        show: 'MONITOR\n\nâœ— Nothing to eat or drink\nâœ— Do NOT give aspirin (could be haemorrhagic stroke)\nâœ“ Monitor ABCDE\nâœ“ Reassure patient\nâœ“ Note any changes\nâœ“ Wait for ambulance',
        next: 'deterioration_stroke'
      },
      {
        id: 'deterioration_stroke',
        type: 'decision',
        say: 'Has the patient become unresponsive?',
        show: 'Patient unresponsive?',
        question: 'Has patient become unresponsive?',
        answers: [
          { label: 'Yes - Collapsed', next: 'stroke_cpr' },
          { label: 'No - Conscious', next: 'monitor_stroke' }
        ]
      },
      {
        id: 'stroke_cpr',
        type: 'instruction',
        say: 'Check breathing. If not breathing normally, start CPR.',
        show: 'CHECK BREATHING\n\nIf not breathing normally - START CPR',
        actions: ['switch_protocol:cardiac_arrest']
      },
      {
        id: 'not_stroke',
        type: 'instruction',
        say: 'No obvious stroke signs. Continue to monitor. Consider other causes. Seek medical advice if concerned.',
        show: 'NO OBVIOUS STROKE\n\nContinue to monitor\nConsider other causes\nSeek medical advice if any concerns'
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
        say: 'Suspect adrenal crisis in patients on long-term steroids who collapse and do not respond to lying flat. Signs include severe pallor, weakness, nausea, low blood pressure.',
        show: 'RECOGNISE ADRENAL CRISIS\n\n⚠️ Key question: Is patient on steroids?\n\n• Long-term prednisolone (>5mg/day)\n• Stopped steroids in past 12 months\n• High-dose inhaled steroids\n\nSigns:\n• Collapse not responding to lying flat\n• Severe pallor, weakness\n• Nausea, vomiting\n• Low blood pressure',
        next: 'steroid_check'
      },
      {
        id: 'steroid_check',
        type: 'decision',
        say: 'Is this patient on long-term steroids, or have they stopped steroids within the past 12 months?',
        show: 'On long-term steroids?',
        question: 'Is this patient on long-term steroids or recently stopped steroids?',
        answers: [
          { label: 'Yes - On steroids', next: 'call_999_adrenal' },
          { label: 'No / Unsure', next: 'consider_other' }
        ]
      },
      {
        id: 'call_999_adrenal',
        type: 'instruction',
        say: 'Call 999 immediately. State suspected adrenal crisis in a steroid-dependent patient.',
        show: 'CALL 999 IMMEDIATELY\n\nState: Suspected adrenal crisis\nSteroid-dependent patient',
        actions: ['suggest:call_999', 'log:999_called'],
        next: 'position_adrenal'
      },
      {
        id: 'position_adrenal',
        type: 'instruction',
        say: 'Lay the patient flat. Raise legs if possible.',
        show: 'LAY FLAT\nRAISE LEGS',
        next: 'hydrocortisone_check'
      },
      {
        id: 'hydrocortisone_check',
        type: 'decision',
        say: 'Is hydrocortisone injection available?',
        show: 'Hydrocortisone available?',
        question: 'Do you have hydrocortisone injection?',
        answers: [
          { label: 'Yes', next: 'give_hydrocortisone' },
          { label: 'No', next: 'oxygen_adrenal' }
        ]
      },
      {
        id: 'give_hydrocortisone',
        type: 'drug',
        drug_id: 'hydrocortisone_im',
        say: 'Give hydrocortisone 100 milligrams intramuscular injection.',
        show: 'HYDROCORTISONE 100mg IM\n\nAdult: 100mg\nChild 6-12: 50mg\nChild 1-6: 25mg\n\nInject into outer thigh or deltoid',
        require_confirm: true,
        next: 'oxygen_adrenal'
      },
      {
        id: 'oxygen_adrenal',
        type: 'drug',
        drug_id: 'oxygen_high_flow',
        say: 'Give high flow oxygen if available.',
        show: 'OXYGEN 15 L/min if available',
        require_confirm: false,
        next: 'monitor_adrenal'
      },
      {
        id: 'monitor_adrenal',
        type: 'instruction',
        say: 'Monitor continuously. Keep flat. Wait for ambulance. Be ready to start CPR if they become unresponsive and stop breathing.',
        show: 'MONITOR CONTINUOUSLY\n\n• Keep flat with legs raised\n• Monitor airway and breathing\n• Prepare for CPR if deteriorates\n• Wait for ambulance'
      },
      {
        id: 'consider_other',
        type: 'instruction',
        say: 'Not obviously steroid dependent. Consider other causes such as syncope, hypoglycaemia, or anaphylaxis.',
        show: 'CONSIDER OTHER CAUSES\n\n• Simple faint (syncope)\n• Hypoglycaemia\n• Anaphylaxis\n• Cardiac event\n\nReturn to triage if unsure'
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

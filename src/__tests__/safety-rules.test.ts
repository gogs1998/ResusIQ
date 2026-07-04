import { describe, it, expect } from 'vitest';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';

// These tests encode the non-negotiable clinical safety rules from CLAUDE.md.
// If one fails, a safety rule has regressed — do NOT "fix" the test without
// the clinical reviewer signing off.

const protocol = (id: string) => protocols.find((p) => p.id === id)!;
const drug = (id: string) => drugs.find((d) => d.id === id)!;

describe('CLAUDE.md safety non-negotiables', () => {
  it('Stroke flow gives NO aspirin', () => {
    const stroke = protocol('stroke');
    expect(stroke).toBeDefined();
    const usesAspirin = stroke.steps.some((s) => s.drug_id === 'aspirin_oral');
    expect(usesAspirin).toBe(false);
  });

  it('Anaphylaxis: adrenaline repeats every 5 min with NO fixed maximum', () => {
    const adrenaline = drug('adrenaline_im_adult');
    expect(adrenaline.repeat_interval_min).toBe(5);
    expect(adrenaline.max_doses).toBeUndefined();
    // and the anaphylaxis protocol actually uses it
    expect(protocol('anaphylaxis').steps.some((s) => s.drug_id === 'adrenaline_im_adult')).toBe(true);
  });

  it('Seizure: buccal midazolam is a SINGLE dose', () => {
    expect(drug('midazolam_buccal').max_doses).toBe(1);
  });

  it('MI / chest pain: oxygen is gated by a decision (only when indicated), not high-flow by default', () => {
    const chestPain = protocol('chest_pain');
    expect(chestPain.steps.some((s) => s.type === 'decision')).toBe(true);
    // The MI flow uses moderate-flow (target SpO2), never routine high-flow O2.
    const usesHighFlow = chestPain.steps.some((s) => s.drug_id === 'oxygen_high_flow');
    expect(usesHighFlow).toBe(false);
  });

  it('Anaphylaxis adrenaline carries the full RCUK age bands incl. the <6 month band', () => {
    const bands = drug('adrenaline_im_adult').child_dose_bands ?? [];
    expect(bands.length).toBeGreaterThanOrEqual(4);
    const infantBand = bands.find((b) => b.max_age_months === 6);
    expect(infantBand, 'under-6-months band present').toBeDefined();
  });
});

// Flow-level pins: the rules above must hold in the branches a user can actually
// walk, not just in drug metadata. (Adversarial review 2026-07-04.)
describe('safety rules hold in the flow', () => {
  const step = (protocolId: string, stepId: string) =>
    protocol(protocolId).steps.find((s) => s.id === stepId)!;

  it('Stroke: the explicit "do not give aspirin" warning text is present', () => {
    const stroke = protocol('stroke');
    const warned = stroke.steps.some(
      (s) => /do not give aspirin/i.test(s.show ?? '') || /do not give aspirin/i.test(s.say ?? '')
    );
    expect(warned).toBe(true);
  });

  it('Stroke: any single positive FAST sign routes straight to the 999 call (hard gate)', () => {
    expect(step('stroke', 'face_check').answers?.[0].next).toBe('time_call');
    expect(step('stroke', 'arm_check').answers?.[0].next).toBe('time_call');
    expect(step('stroke', 'speech_check').answers?.[0].next).toBe('time_call');
  });

  it('Anaphylaxis: the reassess loop reaches repeat_adrenaline, which loops back to monitoring', () => {
    const reassess = step('anaphylaxis', 'reassess');
    const notImproving = reassess.answers?.find((a) => a.next === 'repeat_adrenaline');
    expect(notImproving, 'reassess routes not-improving to repeat_adrenaline').toBeDefined();
    const repeat = step('anaphylaxis', 'repeat_adrenaline');
    expect(repeat.drug_id).toBe('adrenaline_im_adult');
    expect(repeat.next).toBe('monitor_response'); // the every-5-min loop
  });

  it('Anaphylaxis: deterioration has a wired in-flow path to CPR', () => {
    expect(step('anaphylaxis', 'continue_monitor').next).toBe('cardiac_arrest_check');
    const check = step('anaphylaxis', 'cardiac_arrest_check');
    const arrested = check.answers?.find((a) => a.next === 'start_cpr');
    expect(arrested, 'arrest answer routes to start_cpr').toBeDefined();
    expect(step('anaphylaxis', 'start_cpr').actions).toContain('switch_protocol:cardiac_arrest');
  });

  it('Seizure: exactly ONE midazolam step, reachable only through a decision gate', () => {
    const seizure = protocol('seizure');
    const midazolamSteps = seizure.steps.filter((s) => s.drug_id === 'midazolam_buccal');
    expect(midazolamSteps).toHaveLength(1);
    const target = midazolamSteps[0].id;
    // No unconditional pointer may lead into the drug step — only decision answers.
    for (const s of seizure.steps) {
      expect(s.next, `${s.id}.next must not bypass the midazolam gate`).not.toBe(target);
      expect(s.on_timer_end_next, `${s.id} timer must not bypass the gate`).not.toBe(target);
    }
    const gated = seizure.steps.some((s) => (s.answers ?? []).some((a) => a.next === target));
    expect(gated, 'midazolam reachable via a decision answer').toBe(true);
  });

  it('Chest pain: every oxygen step is reachable only through a decision gate', () => {
    const chestPain = protocol('chest_pain');
    const oxygenIds = chestPain.steps
      .filter((s) => s.drug_id?.includes('oxygen'))
      .map((s) => s.id);
    expect(oxygenIds.length).toBeGreaterThan(0);
    for (const target of oxygenIds) {
      for (const s of chestPain.steps) {
        expect(s.next, `${s.id}.next must not bypass the oxygen gate`).not.toBe(target);
        expect(s.on_timer_end_next, `${s.id} timer must not bypass the gate`).not.toBe(target);
      }
      const gated = chestPain.steps.some((s) => (s.answers ?? []).some((a) => a.next === target));
      expect(gated, `${target} reachable via a decision answer`).toBe(true);
    }
  });
});

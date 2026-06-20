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

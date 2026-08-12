import { describe, it, expect } from 'vitest';
import { getPatientState, drugWasGiven } from '../lib/callScript';
import type { EventLogEntry } from '../types';

describe('callScript patient state', () => {
  it('does not claim adrenaline was given without a log entry', () => {
    expect(getPatientState('anaphylaxis', [])).toContain('not yet given');
  });

  it('asserts adrenaline only after drug_given', () => {
    const events: EventLogEntry[] = [{
      id: '1',
      timestamp: '2026-08-12T10:00:00.000Z',
      type: 'drug_given',
      label: 'Drug: adrenaline_im_adult',
      drug_id: 'adrenaline_im_adult',
    }];
    expect(drugWasGiven(events, 'adrenaline')).toBe(true);
    expect(getPatientState('anaphylaxis', events)).toContain('Adrenaline given');
  });
});

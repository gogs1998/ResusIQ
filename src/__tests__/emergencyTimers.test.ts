import { describe, it, expect } from 'vitest';
import { elapsedSeconds, formatClock, nextDoseCountdown } from '../lib/emergencyTimers';
import type { EventLogEntry } from '../types';

const t = (iso: string) => new Date(iso);

describe('emergencyTimers', () => {
  it('elapsedSeconds counts whole seconds from start', () => {
    expect(elapsedSeconds('2026-08-12T10:00:00.000Z', t('2026-08-12T10:01:05.000Z'))).toBe(65);
  });

  it('formatClock rolls hours into minutes', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(75)).toBe('01:15');
    expect(formatClock(75 * 60 + 4)).toBe('75:04');
  });

  it('nextDoseCountdown is null until the drug is given', () => {
    expect(nextDoseCountdown([], 'adrenaline_im_adult', 5, t('2026-08-12T10:00:00.000Z'))).toBeNull();
  });

  it('nextDoseCountdown counts down from last drug_given', () => {
    const events: EventLogEntry[] = [{
      id: '1',
      timestamp: '2026-08-12T10:00:00.000Z',
      type: 'drug_given',
      label: 'Drug: adrenaline_im_adult',
      drug_id: 'adrenaline_im_adult',
    }];
    const mid = nextDoseCountdown(events, 'adrenaline_im_adult', 5, t('2026-08-12T10:03:00.000Z'));
    expect(mid).toEqual({ due: false, secondsLeft: 120 });
    const due = nextDoseCountdown(events, 'adrenaline_im_adult', 5, t('2026-08-12T10:05:00.000Z'));
    expect(due).toEqual({ due: true, secondsLeft: 0 });
  });
});

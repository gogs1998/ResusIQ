import { describe, it, expect } from 'vitest';
import type { EventLogEntry } from '../types';
import {
  elapsedSeconds,
  nextDoseCountdown,
  formatClock,
  hhmm,
  remainingSeconds,
} from '../lib/emergencyTimers';

// Pure time math for the console's pinned timer strip. Every test passes an
// explicit `now` — no reliance on Date.now(), so the suite is deterministic.

const iso = (ms: number) => new Date(ms).toISOString();

// Minimal EventLogEntry factory — only the fields the timers read matter.
const drugEvent = (atMs: number, drugId: string): EventLogEntry => ({
  id: `e-${atMs}`,
  timestamp: iso(atMs),
  type: 'drug_given',
  label: `Drug: ${drugId}`,
  drug_id: drugId,
});

describe('elapsedSeconds', () => {
  it('counts whole seconds from start to now', () => {
    const start = iso(0);
    expect(elapsedSeconds(start, new Date(65_000))).toBe(65);
  });

  it('floors sub-second remainders (does not round up)', () => {
    const start = iso(0);
    expect(elapsedSeconds(start, new Date(1_999))).toBe(1);
  });

  it('is zero at the exact start instant', () => {
    const start = iso(10_000);
    expect(elapsedSeconds(start, new Date(10_000))).toBe(0);
  });

  it('never returns negative on clock skew (now before start)', () => {
    const start = iso(10_000);
    expect(elapsedSeconds(start, new Date(9_000))).toBe(0);
  });
});

describe('nextDoseCountdown', () => {
  const drugId = 'adrenaline_im_adult';
  const fiveMin = 5;

  it('returns null when the drug has never been given', () => {
    const events: EventLogEntry[] = [];
    expect(nextDoseCountdown(events, drugId, fiveMin, new Date(0))).toBeNull();
  });

  it('returns null when only a DIFFERENT drug was given', () => {
    const events = [drugEvent(0, 'oxygen_high_flow')];
    expect(nextDoseCountdown(events, drugId, fiveMin, new Date(60_000))).toBeNull();
  });

  it('counts down from a single dose (not yet due)', () => {
    const events = [drugEvent(0, drugId)];
    // 2 minutes after a 5-minute interval → 3 minutes (180s) left, not due.
    const r = nextDoseCountdown(events, drugId, fiveMin, new Date(120_000));
    expect(r).toEqual({ due: false, secondsLeft: 180 });
  });

  it('is due exactly at the interval boundary (secondsLeft 0)', () => {
    const events = [drugEvent(0, drugId)];
    const r = nextDoseCountdown(events, drugId, fiveMin, new Date(300_000));
    expect(r).toEqual({ due: true, secondsLeft: 0 });
  });

  it('stays due past the interval (secondsLeft clamped at 0)', () => {
    const events = [drugEvent(0, drugId)];
    const r = nextDoseCountdown(events, drugId, fiveMin, new Date(600_000));
    expect(r).toEqual({ due: true, secondsLeft: 0 });
  });

  it('measures from the LATEST matching dose when several were given', () => {
    // Dose 1 at t=0, dose 2 at t=5min. At t=6min the countdown must be from
    // dose 2 (4 min / 240s left), not dose 1 (which would read as due).
    const events = [drugEvent(0, drugId), drugEvent(300_000, drugId)];
    const r = nextDoseCountdown(events, drugId, fiveMin, new Date(360_000));
    expect(r).toEqual({ due: false, secondsLeft: 240 });
  });

  it('uses the latest dose even when log order is not chronological', () => {
    const events = [drugEvent(300_000, drugId), drugEvent(0, drugId)];
    const r = nextDoseCountdown(events, drugId, fiveMin, new Date(360_000));
    expect(r).toEqual({ due: false, secondsLeft: 240 });
  });

  it('handles clock skew (now before the dose) as a full interval remaining, not due', () => {
    const events = [drugEvent(300_000, drugId)];
    const r = nextDoseCountdown(events, drugId, fiveMin, new Date(0));
    expect(r).toEqual({ due: false, secondsLeft: 300 });
  });
});

describe('hhmm', () => {
  it('formats a local wall-clock time as zero-padded HH:MM', () => {
    // Built from local components, then round-tripped through ISO, so the
    // assertion is independent of the runner's timezone.
    const d = new Date(2026, 0, 1, 9, 5, 0);
    expect(hhmm(d.toISOString())).toBe('09:05');
  });
});

describe('formatClock', () => {
  it('zero-pads minutes and seconds', () => {
    expect(formatClock(64)).toBe('01:04');
  });

  it('is 00:00 at zero', () => {
    expect(formatClock(0)).toBe('00:00');
  });

  it('lets minutes roll past 60 without an hours field', () => {
    expect(formatClock(75 * 60 + 4)).toBe('75:04');
  });

  it('floors fractional seconds', () => {
    expect(formatClock(64.9)).toBe('01:04');
  });

  it('floors negatives to 00:00', () => {
    expect(formatClock(-30)).toBe('00:00');
  });
});

// F9 / clinical ruling R4: the seizure clock counts ONE elapsing thing. Its
// whole job is to give the same answer on the second visit to the step as it
// would have on the first — the loop must not buy the seizure another 5 minutes.
describe('remainingSeconds', () => {
  const anchor = '2026-08-13T10:00:00.000Z';
  const at = (seconds: number) => new Date(Date.parse(anchor) + seconds * 1000);

  it('is the full duration at the anchor instant', () => {
    expect(remainingSeconds(anchor, 300, at(0))).toBe(300);
  });

  it('counts down with real time, not with visits to the step', () => {
    expect(remainingSeconds(anchor, 300, at(30))).toBe(270);
    // The loop's re-entry case: back on the step at a real 4:30, and it says
    // 0:30 — not a fresh 5:00, which is the defect this replaces.
    expect(remainingSeconds(anchor, 300, at(270))).toBe(30);
  });

  it('is 0 at exactly the duration — the boundary routes', () => {
    expect(remainingSeconds(anchor, 300, at(300))).toBe(0);
  });

  it('clamps at 0 however long the step is left behind', () => {
    expect(remainingSeconds(anchor, 300, at(301))).toBe(0);
    expect(remainingSeconds(anchor, 300, at(60 * 60))).toBe(0);
  });

  it('does not run backwards if the clock is behind the anchor', () => {
    expect(remainingSeconds(anchor, 300, at(-90))).toBe(300);
  });
});

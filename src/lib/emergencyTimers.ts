import type { EventLogEntry } from '../types';

// Pure time math for the console's pinned timer strip (TimerStrip). Kept free of
// Date.now() so every value is a function of its inputs — callers pass an
// explicit `now`, the UI supplies `new Date()` on each 1s tick. No component
// mirrors the event log; these read from it directly.

/** Whole seconds elapsed from an ISO start time to `now`. Floored, never negative. */
export function elapsedSeconds(startTimeIso: string, now: Date): number {
  const deltaMs = now.getTime() - new Date(startTimeIso).getTime();
  if (deltaMs <= 0) return 0;
  return Math.floor(deltaMs / 1000);
}

/**
 * Countdown to the next dose of `drugId`, measured from the LATEST `drug_given`
 * event for that drug and its `repeat_interval_min`.
 *
 * Returns `null` when the drug has never been given (nothing to count down).
 * Otherwise `{ due, secondsLeft }`: `secondsLeft` clamps at 0, and `due` is true
 * (with `secondsLeft` 0) once the interval has fully elapsed — the boundary
 * itself counts as due, matching "repeat every 5 minutes".
 */
export function nextDoseCountdown(
  events: EventLogEntry[],
  drugId: string,
  repeatIntervalMin: number,
  now: Date,
): { due: boolean; secondsLeft: number } | null {
  let latestMs = -Infinity;
  for (const e of events) {
    if (e.type === 'drug_given' && e.drug_id === drugId) {
      const t = new Date(e.timestamp).getTime();
      if (t > latestMs) latestMs = t;
    }
  }
  if (latestMs === -Infinity) return null;

  const intervalSeconds = repeatIntervalMin * 60;
  const sinceDose = elapsedSeconds(new Date(latestMs).toISOString(), now);
  const secondsLeft = Math.max(0, intervalSeconds - sinceDose);
  return { due: secondsLeft === 0, secondsLeft };
}

/** MM:SS, zero-padded. Minutes roll past 60 (no hours field); negatives floor to 00:00. */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const mm = Math.floor(safe / 60).toString().padStart(2, '0');
  const ss = (safe % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

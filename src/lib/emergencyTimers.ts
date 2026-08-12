import type { EventLogEntry } from '../types';

export function elapsedSeconds(startTimeIso: string, now: Date): number {
  const start = Date.parse(startTimeIso);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now.getTime() - start) / 1000));
}

/** MM:SS, with hours rolled into minutes (75:04). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function nextDoseCountdown(
  events: EventLogEntry[],
  drugId: string,
  repeatIntervalMin: number,
  now: Date
): { due: boolean; secondsLeft: number } | null {
  if (!repeatIntervalMin || repeatIntervalMin <= 0) return null;
  const given = [...events].reverse().find(
    (e) => e.type === 'drug_given' && (e.drug_id === drugId || e.label.toLowerCase().includes(drugId.toLowerCase()))
  );
  if (!given) return null;
  const elapsed = elapsedSeconds(given.timestamp, now);
  const window = repeatIntervalMin * 60;
  const secondsLeft = window - elapsed;
  return { due: secondsLeft <= 0, secondsLeft: Math.max(0, secondsLeft) };
}

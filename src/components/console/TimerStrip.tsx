import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { EventLogEntry, ProtocolStep } from '../../types';
import { useAppStore } from '../../store/appStore';
import { getDrugById } from '../../data/drugs';
import { elapsedSeconds, nextDoseCountdown, formatClock } from '../../lib/emergencyTimers';

// Pinned timer strip — timers are first-class in the console (999 asks elapsed
// time first; drug repeats are clinically load-bearing). Everything derives from
// the store + emergencyTimers on a single 1s tick; nothing mirrors the log.

const chipBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '7px 11px',
};

const chipKey: CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const chipVal: CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: 'var(--text-1)',
};

// Local wall-clock HH:MM (24h) for the moment an event was logged.
function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function TimerStrip() {
  const { activeEvent, activeProtocol } = useAppStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!activeEvent) return null;

  const events = activeEvent.events;

  // Elapsed since the emergency started.
  const elapsed = elapsedSeconds(activeEvent.timestamp, now);

  // 999 chip: ok-state once a 999_called entry exists, muted before.
  const call999 = events.find((e) => e.type === '999_called');

  // Dose chip: the repeat-eligible drug in this protocol that has been given.
  // If several qualify, track the one dosed most recently.
  const tracked = pickTrackedDose(activeProtocol?.steps ?? [], events, now);

  return (
    <div className="flex" style={{ gap: 8 }} aria-label="Emergency timers">
      <div style={chipBase}>
        <span style={chipKey}>Elapsed</span>
        <span className="riq-data" style={chipVal}>{formatClock(elapsed)}</span>
      </div>

      <div style={chipBase}>
        <span style={chipKey}>999 called</span>
        {call999 ? (
          <span className="riq-data" style={{ ...chipVal, color: 'var(--green-bright)' }}>
            ✓ {hhmm(call999.timestamp)}
          </span>
        ) : (
          <span className="riq-data" style={{ ...chipVal, fontSize: 13, color: 'var(--text-3)' }}>
            not logged
          </span>
        )}
      </div>

      {tracked && (
        <div
          style={{
            ...chipBase,
            ...(tracked.countdown.due
              ? { borderColor: 'var(--warn)', background: 'var(--warn-tint)' }
              : null),
          }}
        >
          <span style={chipKey}>{tracked.label}</span>
          <span
            className="riq-data"
            style={{ ...chipVal, ...(tracked.countdown.due ? { color: 'var(--warn)' } : null) }}
          >
            {tracked.countdown.due ? 'DUE NOW' : formatClock(tracked.countdown.secondsLeft)}
          </span>
        </div>
      )}
    </div>
  );
}

// Find the repeat-eligible drug (a drug step whose drug has repeat_interval_min)
// that has actually been given, choosing the most recently dosed if several.
function pickTrackedDose(
  steps: ProtocolStep[],
  events: EventLogEntry[],
  now: Date,
) {
  const seen = new Set<string>();
  let best: { label: string; countdown: { due: boolean; secondsLeft: number }; lastMs: number } | null = null;

  for (const step of steps) {
    if (step.type !== 'drug' || !step.drug_id || seen.has(step.drug_id)) continue;
    seen.add(step.drug_id);
    const drug = getDrugById(step.drug_id);
    if (!drug?.repeat_interval_min) continue;

    const countdown = nextDoseCountdown(events, step.drug_id, drug.repeat_interval_min, now);
    if (!countdown) continue;

    const doses = events.filter((e) => e.type === 'drug_given' && e.drug_id === step.drug_id);
    const lastMs = Math.max(...doses.map((e) => new Date(e.timestamp).getTime()));
    const doseNumber = doses.length + 1;
    const shortName = drug.name.split(/[\s(]/)[0];

    if (!best || lastMs > best.lastMs) {
      best = { label: `${shortName} · dose ${doseNumber}`, countdown, lastMs };
    }
  }
  return best;
}

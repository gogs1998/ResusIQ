import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { drugs } from '../../data/drugs';
import { elapsedSeconds, formatClock, nextDoseCountdown } from '../../lib/emergencyTimers';

const SHORT_REPEAT_MAX_MIN = 15;

export function TimerStrip() {
  const { activeEvent, activeProtocol } = useAppStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!activeEvent) return null;

  const elapsed = formatClock(elapsedSeconds(activeEvent.timestamp, now));
  const called999 = activeEvent.events.find((e) => e.type === '999_called');
  const calledAt = called999
    ? formatClock(elapsedSeconds(activeEvent.timestamp, new Date(called999.timestamp)))
    : null;

  const doseChips = (activeProtocol?.steps ?? [])
    .filter((s) => s.drug_id)
    .map((s) => s.drug_id!)
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .map((id) => {
      const drug = drugs.find((d) => d.id === id);
      if (!drug?.repeat_interval_min || drug.repeat_interval_min > SHORT_REPEAT_MAX_MIN) return null;
      const cd = nextDoseCountdown(activeEvent.events, id, drug.repeat_interval_min, now);
      if (!cd) return null;
      return { id, name: drug.name, ...cd };
    })
    .filter((x): x is { id: string; name: string; due: boolean; secondsLeft: number } => x !== null);

  return (
    <div
      className="flex items-center"
      style={{ gap: 8, padding: '6px 16px 8px', overflowX: 'auto' }}
    >
      <Chip label="Elapsed" value={elapsed} />
      {called999 && (
        <Chip label="999" value={calledAt ? `at ${calledAt}` : 'called'} tone="ok" />
      )}
      {doseChips.map((d) => (
        <Chip
          key={d.id}
          label={d.due ? `${d.name.split(' ')[0]} due` : `${d.name.split(' ')[0]} repeat`}
          value={d.due ? 'NOW' : formatClock(d.secondsLeft)}
          tone={d.due ? 'warn' : 'info'}
        />
      ))}
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'info' }) {
  const color =
    tone === 'warn' ? 'var(--warn)' :
    tone === 'ok' ? 'var(--green-bright)' :
    tone === 'info' ? 'var(--brand)' :
    'var(--text-2)';
  return (
    <div
      style={{
        flexShrink: 0,
        padding: '6px 10px',
        borderRadius: 8,
        background: 'var(--surface-1)',
        border: `1px solid ${tone === 'warn' ? 'var(--warn-border)' : 'var(--border)'}`,
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{label}</div>
      <div className="riq-data" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginTop: 1 }}>{value}</div>
    </div>
  );
}

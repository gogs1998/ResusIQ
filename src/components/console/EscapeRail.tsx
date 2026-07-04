import type { CSSProperties } from 'react';
import { HeartPulse } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

// The architectural guarantee: from any protocol, one tap switches straight to
// cardiac_arrest / CPR. Deterioration is no longer per-protocol hand-wiring — it
// lives here, on every runner screen. Hidden only when already in cardiac arrest.
// Routes through the store's switchProtocol (the single switch_protocol path).
//
// `onEscape` overrides the default tap behaviour for callers that run BEFORE an
// emergency exists — TriageWizard mounts the same rail but there is no activeEvent
// yet, so switchProtocol would no-op; it passes startEmergency('cardiac_arrest',
// 'tile') instead. One rail component, one set of styles, two entry points.

interface EscapeRailProps {
  onEscape?: () => void;
}

export function EscapeRail({ onEscape }: EscapeRailProps = {}) {
  const activeProtocol = useAppStore((s) => s.activeProtocol);
  const switchProtocol = useAppStore((s) => s.switchProtocol);

  // Hidden while already in cardiac arrest; switchProtocol also no-ops on a
  // double-fire race, so a rapid double-tap can never re-log the switch.
  if (activeProtocol?.id === 'cardiac_arrest') return null;

  const handleEscape = onEscape ?? (() => switchProtocol('cardiac_arrest'));

  const wrap: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    background: 'var(--red-tint-2)',
    border: '1.5px solid var(--red)',
    borderRadius: 13,
    padding: '12px 14px',
    color: 'var(--red-strong)',
    cursor: 'pointer',
  };

  return (
    <button
      type="button"
      onClick={handleEscape}
      className="active:scale-[0.99] transition-transform"
      style={wrap}
      aria-label="Patient unresponsive and not breathing — switch to CPR now"
    >
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--red-tint)', color: 'var(--red-strong)' }}
      >
        <HeartPulse className="w-5 h-5" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="block font-extrabold" style={{ fontSize: 14, color: 'var(--red-strong)', lineHeight: 1.2 }}>
          Unresponsive &amp; not breathing?
        </span>
        <span className="block" style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', opacity: 0.85, marginTop: 1 }}>
          Tap any time — switches straight to CPR
        </span>
      </span>
    </button>
  );
}

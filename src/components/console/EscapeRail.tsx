import type { CSSProperties } from 'react';
import { HeartPulse } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

// The architectural guarantee: from any protocol, one tap switches straight to
// cardiac_arrest / CPR. Deterioration is no longer per-protocol hand-wiring — it
// lives here, on every runner screen. Hidden only when already in cardiac arrest.
// Routes through the store's switchProtocol (the single switch_protocol path).

export function EscapeRail() {
  const { activeProtocol, switchProtocol } = useAppStore();

  if (activeProtocol?.id === 'cardiac_arrest') return null;

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
      onClick={() => switchProtocol('cardiac_arrest')}
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

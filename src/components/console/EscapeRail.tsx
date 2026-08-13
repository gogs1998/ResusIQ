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
// yet, so switchProtocol would no-op; it passes
// startEmergency('cardiac_arrest', 'triage', { landOn: 'start_cpr' }) instead,
// which lands on compressions exactly like the mid-emergency switch does. One
// rail component, one set of styles, two entry points, one landing.

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

  // Red hierarchy, three levels, so the colour still means something (Grok UX2
  // counted three equal red affordances in one footer and called the language
  // collapsed):
  //   filled red      — the escalation that IS the next action (Start CPR now)
  //   red tint + rule — the 999 pill and the "999 called" confirm
  //   red on neutral  — this rail: always present, rarely the answer
  // The rail keeps a red keyline, a red mark and red text, so it is still
  // unmistakably the emergency exit; it stops shouting at the same volume as
  // the thing the operator is actually being asked to do.
  const wrap: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    background: 'var(--surface-1)',
    border: '1px solid var(--border-strong)',
    borderLeft: '3px solid var(--red)',
    borderRadius: 'var(--radius-md)',
    padding: '11px 14px',
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
        style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--red-tint)', color: 'var(--red-strong)' }}
      >
        <HeartPulse className="w-5 h-5" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="block font-extrabold" style={{ fontSize: 15, color: 'var(--red-strong)', lineHeight: 1.2 }}>
          Unresponsive &amp; not breathing?
        </span>
        <span className="block" style={{ fontSize: 'var(--fs-caption)', fontWeight: 600, color: 'var(--text-2)', marginTop: 1 }}>
          Tap to start CPR now
        </span>
      </span>
    </button>
  );
}

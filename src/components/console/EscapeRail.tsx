import { HeartPulse } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

/** Persistent wrong-protocol escape. Hidden while already in cardiac arrest. */
export function EscapeRail() {
  const { activeProtocol, isEmergencyActive, switchProtocol, startEmergency } = useAppStore();
  if (activeProtocol?.id === 'cardiac_arrest') return null;

  const go = () => {
    if (isEmergencyActive) switchProtocol('cardiac_arrest');
    else startEmergency('cardiac_arrest');
  };

  return (
    <button
      onClick={go}
      className="w-full flex items-center text-left active:scale-[0.99] transition-transform"
      style={{
        gap: 10,
        minHeight: 52,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--red-tint)',
        border: '1.5px solid var(--red-border)',
        color: 'var(--red)',
      }}
      aria-label="Unresponsive and not breathing. Switches straight to CPR."
    >
      <HeartPulse className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block font-extrabold" style={{ fontSize: 14, lineHeight: 1.15 }}>
          Unresponsive and not breathing?
        </span>
        <span className="block" style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
          Switches straight to CPR
        </span>
      </span>
    </button>
  );
}

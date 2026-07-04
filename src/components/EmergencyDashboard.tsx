import {
  Heart,
  Wind,
  Droplet,
  CircleOff,
  Zap,
  HeartPulse,
  AlertOctagon,
  Brain,
  ShieldAlert,
  Phone,
  Volume2,
  VolumeX,
  Settings,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';
import type { CSSProperties, ComponentType } from 'react';
import { useAppStore } from '../store/appStore';

const iconMap: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  Heart,
  Wind,
  Droplet,
  CircleOff,
  Zap,
  HeartPulse,
  AlertOctagon,
  Brain,
  ShieldAlert,
  Stethoscope,
};

// Each tile: plain-English name (the lay word a panicking carer recognises) plus
// one navigational cue line. Cue copy is fixed — a glance-level "is this the one?"
// hint, NOT a clinical instruction. `crit` flags the two genuinely life-threat
// conditions (red chip); the rest read as calm ink. `cond` is the per-condition
// icon hue token from colors.css.
const TILES: { id: string; label: string; icon: string; cue: string; cond: string; crit?: boolean }[] = [
  { id: 'cardiac_arrest', label: 'Cardiac arrest', icon: 'HeartPulse', cue: 'Not breathing · start CPR', cond: 'var(--cond-cardiac)', crit: true },
  { id: 'anaphylaxis', label: 'Anaphylaxis', icon: 'ShieldAlert', cue: 'Severe allergic reaction', cond: 'var(--cond-anaphyl)', crit: true },
  { id: 'choking', label: 'Choking', icon: 'Wind', cue: 'Airway blocked', cond: 'var(--cond-choking)' },
  { id: 'asthma', label: 'Asthma attack', icon: 'Stethoscope', cue: "Wheeze · can't speak", cond: 'var(--cond-asthma)' },
  { id: 'chest_pain', label: 'Chest pain', icon: 'Heart', cue: 'Suspected heart attack', cond: 'var(--cond-chest)' },
  { id: 'hypoglycaemia', label: 'Low blood sugar', icon: 'Droplet', cue: 'Diabetic · confused', cond: 'var(--cond-hypo)' },
  { id: 'seizure', label: 'Seizure', icon: 'Brain', cue: 'Convulsions', cond: 'var(--cond-seizure)' },
  { id: 'syncope', label: 'Fainting', icon: 'CircleOff', cue: 'Collapse · pale', cond: 'var(--cond-faint)' },
  { id: 'stroke', label: 'Stroke', icon: 'Zap', cue: 'Face · arm · speech', cond: 'var(--cond-stroke)' },
  { id: 'adrenal_crisis', label: 'Adrenal crisis', icon: 'AlertOctagon', cue: 'On steroids · collapsed', cond: 'var(--cond-adrenal)' },
];

const TOOLS = [
  { screen: 'protocol_library' as const, label: 'Library' },
  { screen: 'sbar' as const, label: 'SBAR' },
  { screen: 'reports' as const, label: 'Reports' },
  { screen: 'training' as const, label: 'Training' },
];

const headerBtn: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
};

export function EmergencyDashboard() {
  const { startEmergency, setScreen, practiceSetup, isMuted, toggleMute, isTrainingMode } = useAppStore();

  return (
    <div
      className="riq-ward-focus flex flex-col overflow-hidden safe-area-top"
      style={{ height: '100dvh', background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      {/* Header */}
      <header className="flex-none flex items-start justify-between" style={{ padding: '14px 20px 4px' }}>
        <div>
          <h1 className="font-bold" style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            <span style={{ color: 'var(--text-1)' }}>Resus</span><span style={{ color: 'var(--brand)' }}>IQ</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>
            {isTrainingMode ? 'Training mode' : "What's happening? Tap the condition."}
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 2, marginRight: -8 }}>
          <button onClick={toggleMute} style={headerBtn} aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'} aria-pressed={isMuted}>
            {isMuted ? <VolumeX className="w-5 h-5" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-5 h-5" style={{ color: 'var(--text-2)' }} />}
          </button>
          <button onClick={() => setScreen('setup')} style={headerBtn} aria-label="Settings">
            <Settings className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
          </button>
        </div>
      </header>

      {/* Practice badge — kept, compact single line */}
      {practiceSetup?.address && (
        <div className="flex-none flex items-center gap-1.5" style={{ margin: '0 20px 2px' }}>
          <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
          <p className="truncate" style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {practiceSetup.name || practiceSetup.address}{practiceSetup.postcode ? ` · ${practiceSetup.postcode}` : ''}
          </p>
        </div>
      )}

      {/* Condition grid + demoted nav — fills the middle, no scroll */}
      <main className="flex-1 flex flex-col min-h-0" style={{ padding: '8px 14px 0' }}>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {TILES.map((tile) => {
            const Icon = iconMap[tile.icon] ?? Heart;
            return (
              <button
                key={tile.id}
                onClick={() => startEmergency(tile.id, 'tile')}
                className="flex flex-col text-left active:scale-[0.98] transition-transform"
                style={{
                  gap: 7,
                  padding: '11px 12px 10px',
                  borderRadius: 12,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 25, height: 25, borderRadius: 7, background: tile.crit ? 'var(--red-tint)' : 'var(--surface-3)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: tile.cond }} />
                </span>
                <span className="font-bold" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
                  {tile.label}
                </span>
                <span style={{ fontSize: 10.5, lineHeight: 1.25, color: 'var(--text-2)' }}>
                  {tile.cue}
                </span>
              </button>
            );
          })}
        </div>

        {/* Demoted secondary nav — one quiet text row */}
        <nav className="flex items-center justify-center flex-wrap" style={{ gap: 4, marginTop: 'auto', padding: '10px 0 2px' }}>
          {TOOLS.map(({ screen, label }, i) => (
            <span key={screen} className="flex items-center" style={{ gap: 4 }}>
              {i > 0 && <span aria-hidden style={{ fontSize: 12, color: 'var(--text-3)' }}>·</span>}
              <button
                onClick={() => setScreen(screen)}
                className="active:opacity-60 transition-opacity"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'transparent', border: 'none', padding: '4px 6px' }}
              >
                {label}
              </button>
            </span>
          ))}
        </nav>
      </main>

      {/* Pinned footer: triage gate + Call 999 */}
      <div className="flex-none safe-area-bottom flex flex-col" style={{ gap: 8, padding: '8px 14px 14px' }}>
        <button
          onClick={() => setScreen('triage')}
          className="w-full flex items-center justify-between text-left active:scale-[0.99] transition-transform"
          style={{
            padding: '11px 16px',
            borderRadius: 12,
            background: 'var(--warn-tint)',
            border: '1px solid var(--amber-600)',
            color: 'var(--amber-700)',
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          <span>Not sure? Answer a few questions</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--amber-700)' }} />
        </button>

        <a
          href="tel:999"
          className="w-full flex items-center justify-center active:scale-[0.99] transition-transform"
          style={{
            gap: 10,
            padding: 15,
            borderRadius: 12,
            background: 'var(--red)',
            color: '#fff',
            boxShadow: 'var(--shadow-999)',
            textDecoration: 'none',
          }}
        >
          <Phone className="w-5 h-5 flex-shrink-0" />
          <span className="text-center" style={{ lineHeight: 1.15 }}>
            <span className="block" style={{ fontSize: 16, fontWeight: 800 }}>Call 999</span>
            <span className="block" style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85 }}>ambulance — emergency services</span>
          </span>
        </a>
      </div>
    </div>
  );
}

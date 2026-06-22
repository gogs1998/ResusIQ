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
  ClipboardList,
  GraduationCap,
  BookOpen,
  FileText,
  CircleHelp,
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

// Plain-English tile names (sentence case) — the lay word a panicking carer
// recognises, not the clinical term. Icon names map into iconMap above.
const TILES: { id: string; label: string; icon: string }[] = [
  { id: 'cardiac_arrest', label: 'Cardiac arrest', icon: 'HeartPulse' },
  { id: 'anaphylaxis', label: 'Anaphylaxis', icon: 'ShieldAlert' },
  { id: 'choking', label: 'Choking', icon: 'Wind' },
  { id: 'asthma', label: 'Asthma attack', icon: 'Stethoscope' },
  { id: 'chest_pain', label: 'Chest pain', icon: 'Heart' },
  { id: 'hypoglycaemia', label: 'Low blood sugar', icon: 'Droplet' },
  { id: 'seizure', label: 'Seizure', icon: 'Brain' },
  { id: 'syncope', label: 'Fainting', icon: 'CircleOff' },
  { id: 'stroke', label: 'Stroke', icon: 'Zap' },
  { id: 'adrenal_crisis', label: 'Adrenal crisis', icon: 'AlertOctagon' },
];

const TOOLS = [
  { screen: 'protocol_library' as const, icon: BookOpen, label: 'Library' },
  { screen: 'sbar' as const, icon: FileText, label: 'SBAR' },
  { screen: 'reports' as const, icon: ClipboardList, label: 'Reports' },
  { screen: 'training' as const, icon: GraduationCap, label: 'Training' },
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

function TileIcon({ name }: { name: string }) {
  const Icon = iconMap[name] ?? Heart;
  return (
    <span
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--teal-50)' }}
    >
      <Icon className="w-8 h-8" style={{ color: 'var(--teal-700)' }} />
    </span>
  );
}

export function EmergencyDashboard() {
  const { startEmergency, setScreen, practiceSetup, isMuted, toggleMute, isTrainingMode } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-start justify-between" style={{ padding: '12px 24px 8px' }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.svg" alt="" className="w-9 h-9 rounded-xl" />
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--fs-lead)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--text-1)' }}>Resus</span><span style={{ color: 'var(--brand)' }}>IQ</span>
            </h1>
            <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', marginTop: 2 }}>
              {isTrainingMode ? 'Training mode' : "What's happening? Tap to begin."}
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ gap: 2 }}>
          <button onClick={toggleMute} style={headerBtn} aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'} aria-pressed={isMuted}>
            {isMuted ? <VolumeX className="w-6 h-6" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-6 h-6" style={{ color: 'var(--text-2)' }} />}
          </button>
          <button onClick={() => setScreen('setup')} style={headerBtn} aria-label="Settings">
            <Settings className="w-6 h-6" style={{ color: 'var(--text-2)' }} />
          </button>
        </div>
      </header>

      {/* Practice badge */}
      {practiceSetup?.address && (
        <div className="flex items-center gap-1.5" style={{ margin: '0 24px 4px' }}>
          <Stethoscope className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
          <p className="truncate" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-2)' }}>
            {practiceSetup.name || practiceSetup.address}{practiceSetup.postcode ? ` · ${practiceSetup.postcode}` : ''}
          </p>
        </div>
      )}

      {/* Scrollable tile grid */}
      <main className="flex-1 overflow-y-auto" style={{ padding: '8px 24px 12px', minHeight: 0 }}>
        <div className="grid grid-cols-2" style={{ gap: 16 }}>
          {TILES.map((tile) => (
            <button
              key={tile.id}
              onClick={() => startEmergency(tile.id, 'tile')}
              className="flex flex-col text-left active:scale-[0.98] transition-transform"
              style={{
                gap: 16,
                minHeight: 150,
                padding: 22,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface)',
                boxShadow: 'var(--shadow-md)',
                border: 'none',
              }}
            >
              <TileIcon name={tile.icon} />
              <span className="font-bold" style={{ fontSize: 'var(--fs-subtitle)', lineHeight: 1.1, letterSpacing: '-0.01em', marginTop: 'auto', color: 'var(--text-1)' }}>
                {tile.label}
              </span>
            </button>
          ))}
        </div>

        {/* Guided "Not sure?" — warm amber, reassuring */}
        <button
          onClick={() => setScreen('triage')}
          className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
          style={{
            marginTop: 16,
            gap: 18,
            minHeight: 96,
            padding: '20px 22px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--amber-50)',
            boxShadow: '0 0 0 2px var(--amber-600) inset, var(--shadow-sm)',
            border: 'none',
          }}
        >
          <span className="flex items-center justify-center flex-shrink-0" style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--amber-100)' }}>
            <CircleHelp className="w-7 h-7" style={{ color: 'var(--amber-700)' }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold" style={{ fontSize: 'var(--fs-lead)', lineHeight: 1.15, color: 'var(--text-1)' }}>Not sure?</span>
            <span className="block" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--amber-700)', marginTop: 2 }}>Answer a few quick questions</span>
          </span>
          <ChevronRight className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--amber-700)' }} />
        </button>

        {/* Low-emphasis tools row */}
        <div className="grid grid-cols-4" style={{ gap: 8, marginTop: 24 }}>
          {TOOLS.map(({ screen, icon: Icon, label }) => (
            <button
              key={screen}
              onClick={() => setScreen(screen)}
              className="flex flex-col items-center gap-1.5 active:opacity-70 transition-opacity"
              style={{ padding: '12px 4px', borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
            >
              <Icon className="w-5 h-5" style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>{label}</span>
            </button>
          ))}
        </div>
      </main>

      {/* Persistent Call 999 — pinned, with a bottom protection fade */}
      <div
        className="safe-area-bottom"
        style={{ padding: '12px 24px 24px', background: 'linear-gradient(0deg, var(--canvas) 72%, transparent)' }}
      >
        <a
          href="tel:999"
          className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
          style={{
            gap: 14,
            minHeight: 'var(--touch-hero)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--red)',
            color: '#fff',
            boxShadow: 'var(--shadow-999)',
            textDecoration: 'none',
          }}
        >
          <Phone className="w-7 h-7" />
          <span className="text-center" style={{ lineHeight: 1.1 }}>
            <span className="block font-bold" style={{ fontSize: 'var(--fs-subtitle)' }}>Call 999</span>
            <span className="block" style={{ fontSize: 'var(--fs-caption)', opacity: 0.9, fontWeight: 500 }}>Ambulance — emergency services</span>
          </span>
        </a>
      </div>
    </div>
  );
}

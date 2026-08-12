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
import { CONDITIONS, CONDITION_MARK } from '../lib/conditions';

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

const TOOLS = [
  { screen: 'protocol_library' as const, icon: BookOpen, label: 'Library' },
  { screen: 'sbar' as const, icon: FileText, label: 'SBAR' },
  { screen: 'reports' as const, icon: ClipboardList, label: 'Reports' },
  { screen: 'training' as const, icon: GraduationCap, label: 'Training' },
];

export function EmergencyDashboard() {
  const { startEmergency, setScreen, practiceSetup, isMuted, toggleMute, isTrainingMode } = useAppStore();
  const critical = CONDITIONS.find((c) => c.tone === 'critical')!;
  const rest = CONDITIONS.filter((c) => c.tone !== 'critical');
  const CriticalIcon = iconMap[critical.icon] ?? HeartPulse;

  return (
    <div className="riq-screen safe-area-top">
      {isTrainingMode && (
        <div className="riq-training">Training — not a real emergency</div>
      )}

      <header className="flex items-center justify-between" style={{ padding: '10px 16px 8px' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo-mark.svg" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="font-extrabold" style={{ fontSize: 22, letterSpacing: '-0.03em', lineHeight: 1 }}>
              Resus<span style={{ color: 'var(--brand)' }}>IQ</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {isTrainingMode ? 'Training' : 'Tap the emergency'}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <button onClick={toggleMute} className="riq-icon-btn" aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'} aria-pressed={isMuted}>
            {isMuted ? <VolumeX className="w-5 h-5" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button onClick={() => setScreen('setup')} className="riq-icon-btn" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {practiceSetup?.address && (
        <p className="truncate" style={{ margin: '0 20px 8px', fontSize: 12, color: 'var(--text-3)' }}>
          {practiceSetup.name || practiceSetup.address}
          {practiceSetup.postcode ? ` · ${practiceSetup.postcode}` : ''}
        </p>
      )}

      <main className="flex-1 overflow-y-auto" style={{ padding: '4px 16px 12px', minHeight: 0 }}>
        {/* Break-glass: cardiac arrest is a different species of control */}
        <button
          onClick={() => startEmergency(critical.id, 'tile')}
          className="w-full flex items-center text-left active:scale-[0.99] transition-transform"
          style={{
            gap: 14,
            minHeight: 76,
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--red)',
            color: '#fff',
            border: 'none',
            boxShadow: 'var(--shadow-999)',
          }}
        >
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.16)' }}
          >
            <CriticalIcon className="w-7 h-7" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-extrabold" style={{ fontSize: 20, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {critical.label}
            </span>
            <span className="block" style={{ fontSize: 13, opacity: 0.9, marginTop: 3, fontWeight: 500 }}>
              {critical.cue}
            </span>
          </span>
          <ChevronRight className="w-6 h-6 flex-shrink-0" style={{ opacity: 0.85 }} />
        </button>

        {/* Remaining conditions — unique colour mark per tile, not identical cards */}
        <div className="grid grid-cols-2" style={{ gap: 8, marginTop: 10 }}>
          {rest.map((tile) => {
            const Icon = iconMap[tile.icon] ?? Heart;
            const mark = CONDITION_MARK[tile.id];
            return (
              <button
                key={tile.id}
                onClick={() => startEmergency(tile.id, 'tile')}
                className="flex flex-col text-left active:scale-[0.98] transition-transform"
                style={{
                  minHeight: 92,
                  padding: '12px 12px 12px 14px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: mark,
                  }}
                />
                <span
                  className="flex items-center justify-center"
                  style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${mark} 14%, white)` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: mark }} />
                </span>
                <span className="font-bold" style={{ fontSize: 15, lineHeight: 1.15, letterSpacing: '-0.01em', marginTop: 10, color: 'var(--text-1)' }}>
                  {tile.label}
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.25, color: 'var(--text-3)', marginTop: 2 }}>
                  {tile.cue}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setScreen('triage')}
          className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
          style={{
            marginTop: 10,
            gap: 12,
            minHeight: 64,
            padding: '12px 14px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--amber-50)',
            border: '1.5px solid var(--amber-600)',
          }}
        >
          <span className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--amber-100)' }}>
            <CircleHelp className="w-5 h-5" style={{ color: 'var(--amber-700)' }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold" style={{ fontSize: 16, color: 'var(--text-1)', lineHeight: 1.15 }}>Not sure?</span>
            <span className="block" style={{ fontSize: 12, color: 'var(--amber-700)', marginTop: 1 }}>Three yes / no questions</span>
          </span>
          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--amber-700)' }} />
        </button>

        <div className="grid grid-cols-4" style={{ gap: 4, marginTop: 14 }}>
          {TOOLS.map(({ screen, icon: Icon, label }) => (
            <button
              key={screen}
              onClick={() => setScreen(screen)}
              className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
              style={{ padding: '10px 2px', borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{label}</span>
            </button>
          ))}
        </div>
      </main>

      <div
        className="safe-area-bottom"
        style={{ padding: '8px 16px 16px', background: 'linear-gradient(0deg, var(--bg) 70%, transparent)' }}
      >
        <a href="tel:999" className="riq-hero riq-hero-999">
          <Phone className="w-6 h-6" />
          <span className="text-center" style={{ lineHeight: 1.1 }}>
            <span className="block" style={{ fontSize: 20 }}>Call 999</span>
            <span className="block" style={{ fontSize: 11, opacity: 0.9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Ambulance
            </span>
          </span>
        </a>
      </div>
    </div>
  );
}

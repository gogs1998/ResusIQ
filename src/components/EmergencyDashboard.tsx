import {
  Heart,
  AlertTriangle,
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
  Mic,
  Stethoscope
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  AlertTriangle,
  Wind,
  Droplet,
  CircleOff,
  Zap,
  HeartPulse,
  AlertOctagon,
  Brain,
  ShieldAlert
};

// Clear Signal: tiles are dark surfaces with a hairline border + a subtle
// corner hue-wash in the per-condition colour (depth from borders, not bold
// gradient fills). `accent` maps each tile to its --cond-* token.
const surface: CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border)',
};

export function EmergencyDashboard() {
  const {
    startEmergency,
    setScreen,
    practiceSetup,
    isMuted,
    toggleMute,
    isTrainingMode
  } = useAppStore();

  const emergencyTiles = [
    { id: 'cardiac_arrest', title: 'CARDIAC ARREST', subtitle: 'Unconscious · Not breathing', accent: 'var(--cond-cardiac)', priority: 1 },
    { id: 'anaphylaxis', title: 'ANAPHYLAXIS', subtitle: 'Severe allergic reaction', accent: 'var(--cond-anaphyl)', priority: 2 },
    { id: 'choking', title: 'CHOKING', subtitle: 'Airway obstruction', accent: 'var(--cond-choking)', priority: 3 },
    { id: 'asthma', title: 'ASTHMA', subtitle: 'Acute attack', accent: 'var(--cond-asthma)', priority: 4 },
    { id: 'chest_pain', title: 'CHEST PAIN', subtitle: 'Suspected MI', accent: 'var(--cond-chest)', priority: 5 },
    { id: 'hypoglycaemia', title: 'HYPO', subtitle: 'Low blood sugar', accent: 'var(--cond-hypo)', priority: 6 },
    { id: 'seizure', title: 'SEIZURE', subtitle: 'Convulsion', accent: 'var(--cond-seizure)', priority: 7 },
    { id: 'syncope', title: 'FAINT', subtitle: 'Vasovagal', accent: 'var(--cond-faint)', priority: 8 },
    { id: 'stroke', title: 'STROKE', subtitle: 'FAST assessment', accent: 'var(--cond-stroke)', priority: 9 },
    { id: 'adrenal_crisis', title: 'ADRENAL', subtitle: 'Steroid crisis', accent: 'var(--cond-adrenal)', priority: 10 },
  ];

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Status Bar / Header */}
      <header className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-strong))', boxShadow: 'var(--glow-brand)' }}
          >
            <HeartPulse className="w-5 h-5" style={{ color: 'var(--text-on-color)' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ResusIQ</h1>
            <p className="cs-eyebrow mt-0.5">
              {isTrainingMode ? 'Training Mode' : 'Emergency Protocols'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={isMuted ? { background: 'var(--red-tint)', border: '1px solid var(--red)' } : surface}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-4 h-4" style={{ color: 'var(--text-2)' }} />}
          </button>
          <button
            onClick={() => setScreen('setup')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={surface}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
          </button>
        </div>
      </header>

      {/* Hero Action Buttons */}
      <div className="px-4 pt-2 pb-1">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Call 999 */}
          <a
            href="tel:999"
            className="relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--red), var(--red-strong))', boxShadow: 'var(--glow-red)', color: 'var(--text-on-color)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <Phone className="w-7 h-7" />
            <span className="text-base font-bold tracking-wide">CALL 999</span>
          </a>
          {/* Voice AI */}
          <button
            onClick={() => setScreen('ai_assistant')}
            className="relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--ai-from), var(--ai-to))', boxShadow: 'var(--glow-ai)', color: 'var(--text-on-color)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <Mic className="w-7 h-7" />
            <span className="text-base font-bold tracking-wide">VOICE AI</span>
          </button>
        </div>

        {/* Practice Address Badge */}
        {practiceSetup?.address && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3" style={surface}>
            <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
            <p className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>
              {practiceSetup.name || practiceSetup.address}{practiceSetup.postcode ? ` · ${practiceSetup.postcode}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Emergency Grid */}
      <main className="flex-1 px-4 pt-3 pb-2 overflow-y-auto">
        <p className="cs-eyebrow mb-2.5 pl-1">Select Emergency</p>
        <div className="grid grid-cols-2 gap-2.5">
          {emergencyTiles.map((tile) => {
            const protocol = protocols.find(p => p.id === tile.id);
            const IconComponent = protocol ? iconMap[protocol.icon] : Heart;

            return (
              <button
                key={tile.id}
                onClick={() => startEmergency(tile.id)}
                className="relative overflow-hidden rounded-2xl p-3.5 text-left active:scale-[0.97] transition-transform"
                style={{ ...surface, ['--accent' as string]: tile.accent } as CSSProperties}
              >
                {/* Subtle corner hue-wash in the condition colour */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(circle at 85% -10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%)' }}
                />
                <div className="relative flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] leading-tight tracking-tight" style={{ color: 'var(--text-1)' }}>{tile.title}</h3>
                    <p className="text-[11px] mt-0.5 leading-tight" style={{ color: 'var(--text-3)' }}>{tile.subtitle}</p>
                  </div>
                  {IconComponent && (
                    <div
                      className="ml-2 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--accent) 16%, transparent)' }}
                    >
                      <IconComponent className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Tab Bar — glass */}
      <nav className="px-3 pb-2 safe-area-bottom">
        <div
          className="rounded-2xl p-1.5 grid grid-cols-5 gap-1"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--blur-bar)', WebkitBackdropFilter: 'var(--blur-bar)', border: '1px solid var(--border)' }}
        >
          {[
            { screen: 'triage' as const, icon: AlertTriangle, label: 'Triage' },
            { screen: 'protocol_library' as const, icon: BookOpen, label: 'Library' },
            { screen: 'sbar' as const, icon: FileText, label: 'SBAR' },
            { screen: 'reports' as const, icon: ClipboardList, label: 'Reports' },
            { screen: 'training' as const, icon: GraduationCap, label: 'Training' },
          ].map(({ screen, icon: Icon, label }) => (
            <button
              key={screen}
              onClick={() => setScreen(screen)}
              className="flex flex-col items-center gap-0.5 py-2 rounded-xl active:opacity-70 transition-opacity"
            >
              <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--text-2)' }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-3)' }}>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Disclaimer */}
      <div className="text-center px-4 pb-2 safe-area-bottom">
        <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>
          Supports trained teams · Resuscitation Council UK · SDCEP
        </p>
      </div>
    </div>
  );
}

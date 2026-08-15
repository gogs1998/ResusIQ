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
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react';
import type { CSSProperties, ComponentType } from 'react';
import { useAppStore } from '../store/appStore';
import { TILES, tilesByTone, conditionSpine } from '../lib/conditions';

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
  { screen: 'protocol_library' as const, label: 'Library', Icon: BookOpen },
  { screen: 'sbar' as const, label: 'SBAR', Icon: ClipboardList },
  { screen: 'reports' as const, label: 'Reports', Icon: FileText },
  { screen: 'training' as const, label: 'Training', Icon: GraduationCap },
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

const kicker: CSSProperties = {
  fontSize: 'var(--fs-label)',
  fontWeight: 800,
  letterSpacing: 'var(--ls-eyebrow)',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  margin: '14px 2px 7px',
};

export function EmergencyDashboard() {
  const { startEmergency, setScreen, practiceSetup, isMuted, toggleMute, isTrainingMode } = useAppStore();

  const hero = TILES.find((t) => t.tone === 'critical')!;
  const lifeThreat = tilesByTone('severe');
  const other = tilesByTone('urgent', 'standard');
  const HeroIcon = iconMap[hero.icon] ?? Heart;

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

      {/* Ranked conditions + triage. Fits 390x780 without scrolling; shorter
          screens and iOS text zoom SCROLL rather than clip, so the last tile is
          never unreachable. The 999 control below stays pinned either way. */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ padding: '6px 14px 0' }}>
        {/* The one condition where seconds decide the outcome gets the whole
            width and the only filled red on the screen. */}
        <button
          onClick={() => startEmergency(hero.id, 'tile')}
          aria-label={`${hero.label}. ${hero.cue.replace(/\s*·\s*/g, ', ')}`}
          className="w-full flex items-center text-left active:scale-[0.99] transition-transform"
          style={{
            gap: 13,
            minHeight: 76,
            padding: '12px 14px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--red)',
            border: 'none',
            boxShadow: 'var(--shadow-999)',
            color: '#fff',
          }}
        >
          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.16)' }}
          >
            <HeroIcon className="w-7 h-7" style={{ color: '#fff' }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              {hero.label}
            </span>
            <span className="block" style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>
              {hero.cue}
            </span>
          </span>
          <ChevronRight className="w-6 h-6 flex-shrink-0" style={{ opacity: 0.8 }} />
        </button>

        <p style={kicker}>Life threat</p>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {lifeThreat.map((tile) => {
            const Icon = iconMap[tile.icon] ?? Heart;
            return (
              <button
                key={tile.id}
                onClick={() => startEmergency(tile.id, 'tile')}
                aria-label={`${tile.label}. ${tile.cue.replace(/\s*·\s*/g, ', ')}`}
                className="flex flex-col text-left active:scale-[0.98] transition-transform"
                style={{
                  gap: 6,
                  minHeight: 78,
                  padding: '11px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: conditionSpine(tile.cond),
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--surface-3)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: tile.cond }} />
                </span>
                <span className="font-bold" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
                  {tile.label}
                </span>
                <span style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.2, color: 'var(--text-2)' }}>
                  {tile.cue}
                </span>
              </button>
            );
          })}
        </div>

        <p style={kicker}>Other emergencies</p>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          {other.map((tile) => {
            const Icon = iconMap[tile.icon] ?? Heart;
            return (
              <button
                key={tile.id}
                onClick={() => startEmergency(tile.id, 'tile')}
                aria-label={`${tile.label}. ${tile.cue.replace(/\s*·\s*/g, ', ')}`}
                className="flex items-center text-left active:scale-[0.98] transition-transform"
                style={{
                  gap: 10,
                  minHeight: 56,
                  padding: '9px 11px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderLeft: conditionSpine(tile.cond),
                }}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--surface-3)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: tile.cond }} />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold" style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.12, color: 'var(--text-1)' }}>
                    {tile.label}
                  </span>
                  <span className="block truncate" style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.2, color: 'var(--text-2)' }}>
                    {tile.cue}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Triage sits under the conditions, not above them: it is the answer to
            "I don't know", and offering it first taught the operator to fill in
            a form before looking for what they already recognise. */}
        <button
          onClick={() => setScreen('triage')}
          className="w-full flex items-center justify-between text-left active:scale-[0.99] transition-transform"
          style={{
            marginTop: 14,
            padding: '11px 14px',
            borderRadius: 'var(--radius-md)',
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
      </main>

      {/* Pinned: 999, then the tools row. 999 is red tint + keyline, not filled —
          the filled red on this screen belongs to cardiac arrest, and two solid
          reds is the collapse of the colour language Grok flagged. It is still
          full width, still one tap, and now reads as the escalation it is rather
          than competing with the guidance the app exists to give. */}
      <div className="flex-none safe-area-bottom flex flex-col" style={{ gap: 6, padding: '8px 14px 10px' }}>
        <a
          href="tel:999"
          className="w-full flex items-center justify-center active:scale-[0.99] transition-transform"
          style={{
            gap: 10,
            minHeight: 54,
            borderRadius: 'var(--radius-md)',
            background: 'var(--red-tint-2)',
            border: '1.5px solid var(--red)',
            textDecoration: 'none',
          }}
        >
          <Phone className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--red-strong)' }} />
          <span className="text-center" style={{ lineHeight: 1.15 }}>
            <span className="block" style={{ fontSize: 16, fontWeight: 800, color: 'var(--red-strong)' }}>Call 999</span>
            <span className="block" style={{ fontSize: 'var(--fs-caption)', fontWeight: 600, color: 'var(--red-strong)', opacity: 0.8 }}>
              ambulance — emergency services
            </span>
          </span>
        </a>

        {/* Tools — a 4-up row of real targets. They were an interpunct-separated
            text strip: easy to miss, and hard to hit with gloves on. */}
        <nav className="grid grid-cols-4" style={{ gap: 4 }}>
          {TOOLS.map(({ screen, label, Icon }) => (
            <button
              key={screen}
              onClick={() => setScreen(screen)}
              className="flex flex-col items-center justify-center active:opacity-60 transition-opacity"
              style={{ gap: 3, minHeight: 46, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', color: 'var(--text-2)' }}
            >
              <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

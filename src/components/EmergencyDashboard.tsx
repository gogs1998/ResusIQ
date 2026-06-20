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
    { id: 'cardiac_arrest', title: 'CARDIAC ARREST', subtitle: 'Unconscious · Not breathing', color: 'from-red-600 to-red-800', ring: 'ring-red-500/30', priority: 1 },
    { id: 'anaphylaxis', title: 'ANAPHYLAXIS', subtitle: 'Severe allergic reaction', color: 'from-orange-500 to-orange-700', ring: 'ring-orange-500/30', priority: 2 },
    { id: 'choking', title: 'CHOKING', subtitle: 'Airway obstruction', color: 'from-amber-500 to-amber-700', ring: 'ring-amber-500/30', priority: 3 },
    { id: 'asthma', title: 'ASTHMA', subtitle: 'Acute attack', color: 'from-blue-500 to-blue-700', ring: 'ring-blue-500/30', priority: 4 },
    { id: 'chest_pain', title: 'CHEST PAIN', subtitle: 'Suspected MI', color: 'from-rose-600 to-rose-800', ring: 'ring-rose-500/30', priority: 5 },
    { id: 'hypoglycaemia', title: 'HYPO', subtitle: 'Low blood sugar', color: 'from-purple-500 to-purple-700', ring: 'ring-purple-500/30', priority: 6 },
    { id: 'seizure', title: 'SEIZURE', subtitle: 'Convulsion', color: 'from-violet-500 to-violet-700', ring: 'ring-violet-500/30', priority: 7 },
    { id: 'syncope', title: 'FAINT', subtitle: 'Vasovagal', color: 'from-slate-500 to-slate-700', ring: 'ring-slate-500/30', priority: 8 },
    { id: 'stroke', title: 'STROKE', subtitle: 'FAST assessment', color: 'from-cyan-600 to-cyan-800', ring: 'ring-cyan-500/30', priority: 9 },
    { id: 'adrenal_crisis', title: 'ADRENAL', subtitle: 'Steroid crisis', color: 'from-amber-600 to-amber-800', ring: 'ring-amber-600/30', priority: 10 },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col safe-area-top">
      {/* Status Bar / Header */}
      <header className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ResusIQ</h1>
            <p className="text-[10px] font-medium tracking-wider uppercase text-zinc-500">
              {isTrainingMode ? 'Training Mode' : 'Emergency Protocols'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={toggleMute}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center active:bg-zinc-800 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
          </button>
          <button 
            onClick={() => setScreen('setup')}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center active:bg-zinc-800 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Hero Action Buttons */}
      <div className="px-4 pt-2 pb-1">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Call 999 */}
          <a
            href="tel:999"
            className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 shadow-xl shadow-red-600/20 active:scale-[0.97] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <Phone className="w-7 h-7" />
            <span className="text-base font-bold tracking-wide">CALL 999</span>
          </a>
          {/* Voice AI */}
          <button
            onClick={() => setScreen('ai_assistant')}
            className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 shadow-xl shadow-violet-600/20 active:scale-[0.97] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <Mic className="w-7 h-7" />
            <span className="text-base font-bold tracking-wide">VOICE AI</span>
          </button>
        </div>

        {/* Practice Address Badge */}
        {practiceSetup?.address && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl py-2 px-3">
            <Stethoscope className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <p className="text-[11px] text-zinc-400 truncate">
              {practiceSetup.name || practiceSetup.address}{practiceSetup.postcode ? ` · ${practiceSetup.postcode}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Emergency Grid */}
      <main className="flex-1 px-4 pt-3 pb-2 overflow-y-auto">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-2.5 pl-1">
          Select Emergency
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {emergencyTiles.map((tile) => {
            const protocol = protocols.find(p => p.id === tile.id);
            const IconComponent = protocol ? iconMap[protocol.icon] : Heart;
            
            return (
              <button
                key={tile.id}
                onClick={() => startEmergency(tile.id)}
                className={`relative overflow-hidden bg-gradient-to-br ${tile.color} rounded-2xl p-3.5 text-left shadow-lg ring-1 ${tile.ring} active:scale-[0.97] transition-transform`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(255,255,255,0.12),transparent_50%)]" />
                <div className="relative flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] leading-tight tracking-tight">{tile.title}</h3>
                    <p className="text-[11px] text-white/70 mt-0.5 leading-tight">{tile.subtitle}</p>
                  </div>
                  {IconComponent && (
                    <div className="ml-2 mt-0.5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4.5 h-4.5 text-white/80" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="px-3 pb-2 safe-area-bottom">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-1.5 grid grid-cols-5 gap-1">
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
              className="flex flex-col items-center gap-0.5 py-2 rounded-xl active:bg-zinc-800 transition-colors"
            >
              <Icon className="w-[18px] h-[18px] text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Disclaimer */}
      <div className="text-center px-4 pb-2 safe-area-bottom">
        <p className="text-[9px] text-zinc-700">
          Supports trained teams · Resuscitation Council UK · SDCEP
        </p>
      </div>
    </div>
  );
}

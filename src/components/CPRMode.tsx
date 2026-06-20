import { useState, useEffect } from 'react';
import { 
  Phone, 
  X, 
  Zap, 
  Heart,
  Volume2,
  VolumeX,
  Activity
} from 'lucide-react';
import type { ProtocolStep } from '../types';
import { useMetronome, useStopwatch } from '../hooks/useTimer';
import { useSpeech } from '../hooks/useSpeech';
import { useAppStore } from '../store/appStore';

interface CPRModeProps {
  step: ProtocolStep;
  onNext: () => void;
  onEnd: () => void;
}

export function CPRMode({ step, onNext, onEnd }: CPRModeProps) {
  const { isMuted, toggleMute, addEventLog, practiceSetup } = useAppStore();
  const { speak } = useSpeech();
  
  const { 
    isPlaying, 
    start: startMetronome, 
    stop: stopMetronome,
    compressionNumber,
    cycleNumber
  } = useMetronome({ 
    bpm: step.metronome_bpm || 110,
    onBeat: (beat) => {
      // Announce breath pause every 30 compressions
      if (beat % 30 === 0 && !isMuted) {
        speak('Two breaths', false);
      }
    }
  });
  
  const { formattedTime, start: startTimer } = useStopwatch();
  const [shockCount, setShockCount] = useState(0);
  const [showAEDPrompt, setShowAEDPrompt] = useState(false);

  useEffect(() => {
    if (!isMuted) {
      speak('Starting CPR. Push hard and fast. I will count the rhythm.');
    }
    startMetronome();
    startTimer();
    addEventLog('step_completed', 'CPR Started');
  }, []);

  const handleShockDelivered = () => {
    setShockCount(prev => prev + 1);
    addEventLog('shock_delivered', `Shock ${shockCount + 1} delivered`);
    setShowAEDPrompt(false);
    if (!isMuted) {
      speak('Shock delivered. Resume CPR immediately.');
    }
  };

  const handleROSC = () => {
    addEventLog('rosc', 'Return of spontaneous circulation');
    stopMetronome();
    if (!isMuted) {
      speak('ROSC detected. Place in recovery position. Continue monitoring.');
    }
    onNext();
  };

  const handleCall999 = () => {
    addEventLog('999_called', '999 called');
    window.location.href = 'tel:999';
  };

  const toggleMetronome = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  // Breath warning zone
  const breathWarning = compressionNumber >= 27;
  // Pulse ring scale based on compression count
  const pulseActive = isPlaying;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col safe-area-top">
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onEnd}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center active:bg-zinc-800"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
          <div>
            <h1 className="font-bold text-sm text-red-400 tracking-tight">CPR IN PROGRESS</h1>
            <p className="text-[10px] text-zinc-500 font-medium">{formattedTime} elapsed</p>
          </div>
        </div>
        <button
          onClick={toggleMute}
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isMuted ? 'bg-red-500/20 border border-red-500/30' : 'bg-zinc-900 border border-zinc-800'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
        </button>
      </header>

      {/* Call 999 */}
      <div className="mx-4 mb-3">
        <a
          href="tel:999"
          onClick={() => { addEventLog('999_called', '999 called'); }}
          className="flex items-center justify-center gap-2 bg-red-600/15 border border-red-500/25 rounded-xl py-2.5 px-4 active:bg-red-600/25 transition-colors"
        >
          <Phone className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-red-400">CALL 999</span>
          {practiceSetup?.postcode && (
            <span className="text-xs text-red-400/60 ml-1">· {practiceSetup.postcode}</span>
          )}
        </a>
      </div>

      {/* Main CPR Display */}
      <main className="flex-1 px-4 flex flex-col">
        {/* Compression Counter — centrepiece */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          {/* Pulsing rings */}
          <div className="relative w-52 h-52 flex items-center justify-center">
            {pulseActive && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: `${60 / (step.metronome_bpm || 110)}s` }} />
                <div className="absolute inset-3 rounded-full bg-red-500/15" />
              </>
            )}
            <div
              className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                pulseActive
                  ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                  : 'bg-zinc-900 border border-zinc-800'
              }`}
            >
              <div className="text-center">
                <Heart className={`w-8 h-8 mx-auto mb-1 ${pulseActive ? 'text-white/80' : 'text-zinc-600'}`} />
                <p className="text-5xl font-bold tabular-nums">{compressionNumber}</p>
                <p className="text-[11px] text-white/50 font-medium">of 30</p>
              </div>
            </div>
          </div>

          {/* Cycle counter */}
          <p className="mt-3 text-sm text-zinc-500 font-medium">Cycle <span className="text-zinc-300 font-bold">{cycleNumber}</span></p>

          {/* Breath Warning */}
          {breathWarning && (
            <div className="mt-3 bg-blue-500/15 border border-blue-500/30 rounded-xl px-5 py-2.5 animate-pulse">
              <p className="font-bold text-blue-300 text-sm tracking-wide">2 RESCUE BREATHS</p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 mb-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-white tabular-nums">30:2</p>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Ratio</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white tabular-nums">100–120</p>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Rate /min</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white tabular-nums">5–6cm</p>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Depth</p>
            </div>
          </div>
        </div>

        {/* Metronome toggle */}
        <button
          onClick={toggleMetronome}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm mb-3 flex items-center justify-center gap-2 transition-colors ${
            isPlaying
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 active:bg-amber-500/25'
              : 'bg-green-500/15 border border-green-500/30 text-green-400 active:bg-green-500/25'
          }`}
        >
          <Activity className="w-4 h-4" />
          {isPlaying ? 'Pause Metronome' : 'Start Metronome'}
        </button>
      </main>

      {/* AED + ROSC Footer */}
      <div className="px-4 pb-3 safe-area-bottom space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowAEDPrompt(true)}
            className="relative overflow-hidden bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 active:scale-[0.97] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <Zap className="w-5 h-5" />
            AED Ready
          </button>
          <button
            onClick={handleROSC}
            className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 active:scale-[0.97] transition-transform"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,255,255,0.15),transparent_60%)]" />
            Signs of Life?
          </button>
        </div>

        {shockCount > 0 && (
          <p className="text-center text-xs text-zinc-500">
            Shocks delivered: <span className="text-amber-400 font-bold">{shockCount}</span>
          </p>
        )}
      </div>

      {/* AED Shock Modal */}
      {showAEDPrompt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Zap className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold mb-1">AED READY</h2>
            <p className="text-zinc-400 text-sm mb-6">Stand clear before delivering shock</p>
            
            <button
              onClick={handleShockDelivered}
              className="w-full bg-gradient-to-br from-red-500 to-red-700 py-4 rounded-2xl font-bold text-lg mb-3 shadow-lg shadow-red-600/20 active:scale-[0.97] transition-transform"
            >
              ⚡ SHOCK DELIVERED
            </button>
            
            <button
              onClick={() => setShowAEDPrompt(false)}
              className="w-full bg-zinc-800 border border-zinc-700 py-3 rounded-2xl text-sm font-medium text-zinc-400 active:bg-zinc-700"
            >
              No Shock Advised
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

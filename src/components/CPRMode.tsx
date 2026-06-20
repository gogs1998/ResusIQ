import { useState, useEffect } from 'react';
import {
  Phone,
  X,
  Zap,
  Volume2,
  VolumeX,
  Wind,
  Play,
  Pause,
  HeartPulse
} from 'lucide-react';
import type { ProtocolStep } from '../types';
import { Sheet } from './Sheet';
import { Callout } from './Callout';
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
    <div
      className="min-h-screen flex flex-col safe-area-top"
      style={{ background: 'radial-gradient(120% 60% at 50% 30%, #160a0c, var(--bg))', color: 'var(--text-1)' }}
    >
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onEnd}
            aria-label="End emergency"
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 40%, transparent)' }}
          >
            <X className="w-4 h-4" style={{ color: 'var(--red)' }} />
          </button>
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.16em' }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red)' }} aria-hidden />
              CPR IN PROGRESS
            </h1>
            <p className="cs-numeric text-[11px] mt-0.5" style={{ color: 'var(--text-2)' }}>{formattedTime} elapsed</p>
          </div>
        </div>
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
          aria-pressed={isMuted}
          className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
          style={isMuted ? { background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' } : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          {isMuted ? <VolumeX className="w-4 h-4" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-4 h-4" style={{ color: 'var(--text-2)' }} />}
        </button>
      </header>

      {/* Call 999 */}
      <div className="mx-4 mb-3">
        <a
          href="tel:999"
          onClick={() => { addEventLog('999_called', '999 called'); }}
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 active:opacity-80 transition-opacity"
          style={{ background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 40%, transparent)' }}
        >
          <Phone className="w-4 h-4" style={{ color: 'var(--red)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--red)' }}>CALL 999</span>
          {practiceSetup?.postcode && (
            <span className="text-xs ml-1" style={{ color: 'color-mix(in srgb, var(--red) 60%, transparent)' }}>· {practiceSetup.postcode}</span>
          )}
        </a>
      </div>

      {/* Main CPR Display */}
      <main className="flex-1 px-4 flex flex-col">
        {/* Compression Counter — centrepiece */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          {/* Pulsing ring — DS resus-pulse-cpr (0.545s / 110 BPM) */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            <div
              className={`relative w-[220px] h-[220px] rounded-full flex items-center justify-center ${pulseActive ? 'animate-pulse-cpr' : ''}`}
              style={{ border: '3px solid color-mix(in srgb, var(--red) 50%, transparent)', boxShadow: 'inset 0 0 0 10px var(--red-tint)' }}
            >
              <div className="text-center">
                <p className="cs-numeric font-bold leading-none" style={{ fontSize: 'var(--fs-numeric-xl)', color: 'var(--red)' }}>{compressionNumber}</p>
                <p className="cs-eyebrow mt-1">of 30</p>
              </div>
            </div>
          </div>

          {/* Cycle + shock counter */}
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            CYCLE {cycleNumber}{shockCount > 0 && ` · ${shockCount} SHOCK${shockCount > 1 ? 'S' : ''}`}
          </p>

          {/* Breath Warning — amber safety shout */}
          {breathWarning && (
            <div className="mt-3 rounded-xl px-5 py-2.5 flex items-center gap-2 animate-pulse" style={{ background: 'var(--decision-tint)', border: '1px solid color-mix(in srgb, var(--decision) 40%, transparent)' }}>
              <Wind className="w-4 h-4" style={{ color: 'var(--decision)' }} />
              <p className="font-bold text-sm tracking-wide" style={{ color: 'var(--decision)' }}>2 RESCUE BREATHS</p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="cs-card p-3.5 mb-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="cs-numeric text-xl font-bold" style={{ color: 'var(--text-1)' }}>30:2</p>
              <p className="cs-eyebrow mt-0.5">Ratio</p>
            </div>
            <div>
              <p className="cs-numeric text-xl font-bold" style={{ color: 'var(--text-1)' }}>100–120</p>
              <p className="cs-eyebrow mt-0.5">Rate /min</p>
            </div>
            <div>
              <p className="cs-numeric text-xl font-bold" style={{ color: 'var(--text-1)' }}>5–6cm</p>
              <p className="cs-eyebrow mt-0.5">Depth</p>
            </div>
          </div>
        </div>

        {/* Metronome toggle — neutral secondary */}
        <button
          onClick={toggleMetronome}
          className="w-full py-3.5 rounded-2xl font-bold text-sm mb-3 flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', minHeight: 'var(--touch-comfort)' }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Pause metronome' : 'Resume metronome'}
        </button>
      </main>

      {/* AED + ROSC Footer */}
      <div className="px-4 pb-3 safe-area-bottom">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowAEDPrompt(true)}
            className="rounded-2xl py-4 font-bold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
            style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', minHeight: 'var(--touch-comfort)', boxShadow: 'var(--glow-red)' }}
          >
            <Zap className="w-5 h-5" />
            AED Ready
          </button>
          <button
            onClick={handleROSC}
            className="rounded-2xl py-4 font-bold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
            style={{ background: 'var(--green)', color: 'var(--text-on-light)', minHeight: 'var(--touch-comfort)', boxShadow: 'var(--glow-green)' }}
          >
            <HeartPulse className="w-5 h-5" />
            Signs of Life?
          </button>
        </div>
      </div>

      {/* AED Shock dialog */}
      <Sheet
        open={showAEDPrompt}
        onClose={() => setShowAEDPrompt(false)}
        title="AED Ready"
        accent="var(--red)"
        icon={<Zap className="w-6 h-6" />}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowAEDPrompt(false)}
              className="py-3 rounded-xl text-sm font-medium active:opacity-80 transition-opacity"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
            >
              No Shock Advised
            </button>
            <button
              onClick={handleShockDelivered}
              className="py-3 rounded-xl font-bold active:opacity-90 transition-opacity"
              style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', minHeight: 'var(--touch-min)', boxShadow: 'var(--glow-red)' }}
            >
              SHOCK DELIVERED
            </button>
          </div>
        }
      >
        <Callout tone="contra" title="Stand clear" items={['Stand clear before delivering shock']} />
      </Sheet>
    </div>
  );
}

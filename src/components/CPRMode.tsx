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
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between" style={{ padding: '8px 12px' }}>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onEnd}
            aria-label="End emergency"
            className="flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
          >
            <X className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
          </button>
          <div>
            <h1 className="font-bold flex items-center gap-2" style={{ color: 'var(--red)', fontSize: 'var(--fs-body)', lineHeight: 1.1 }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--red)' }} aria-hidden />
              CPR in progress
            </h1>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{formattedTime} elapsed</p>
          </div>
        </div>
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
          aria-pressed={isMuted}
          className="flex items-center justify-center active:opacity-80 transition-opacity"
          style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
        >
          {isMuted ? <VolumeX className="w-6 h-6" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-6 h-6" style={{ color: 'var(--text-2)' }} />}
        </button>
      </header>

      {/* Call 999 */}
      <a
        href="tel:999"
        onClick={() => { addEventLog('999_called', '999 called'); }}
        className="flex items-center justify-center active:scale-[0.99] transition-transform"
        style={{ gap: 8, margin: '0 16px 12px', minHeight: 52, borderRadius: 'var(--radius-md)', background: 'var(--red-50)', border: '1.5px solid var(--red-200)', textDecoration: 'none' }}
      >
        <Phone className="w-5 h-5" style={{ color: 'var(--red)' }} />
        <span className="font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--red-700)' }}>Call 999</span>
        {practiceSetup?.postcode && (
          <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--red-600)', opacity: 0.8 }}>· {practiceSetup.postcode}</span>
        )}
      </a>

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
          <p className="mt-4 font-bold" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-label)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase' }}>
            Cycle {cycleNumber}{shockCount > 0 && ` · ${shockCount} shock${shockCount > 1 ? 's' : ''}`}
          </p>

          {/* Breath Warning — amber safety shout */}
          {breathWarning && (
            <div className="mt-4 flex items-center gap-2 animate-pulse" style={{ padding: '12px 22px', borderRadius: 'var(--radius-md)', background: 'var(--amber-50)', border: '1.5px solid var(--amber-600)' }}>
              <Wind className="w-5 h-5" style={{ color: 'var(--amber-700)' }} />
              <p className="font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--amber-700)' }}>Give 2 breaths</p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 text-center" style={{ gap: 12, padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
          <div>
            <p className="font-bold" style={{ fontSize: 'var(--fs-subtitle)', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>30:2</p>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginTop: 2 }}>Ratio</p>
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 'var(--fs-subtitle)', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>100–120</p>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginTop: 2 }}>Rate /min</p>
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 'var(--fs-subtitle)', color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>5–6cm</p>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginTop: 2 }}>Depth</p>
          </div>
        </div>

        {/* Metronome toggle — neutral secondary */}
        <button
          onClick={toggleMetronome}
          className="w-full flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{ minHeight: 'var(--touch-comfort)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', border: 'none', color: 'var(--text-1)', fontWeight: 600, fontSize: 'var(--fs-body-sm)', marginBottom: 12 }}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isPlaying ? 'Pause metronome' : 'Resume metronome'}
        </button>
      </main>

      {/* AED + ROSC Footer */}
      <div className="safe-area-bottom" style={{ padding: '0 24px 24px' }}>
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <button
            onClick={() => setShowAEDPrompt(true)}
            className="flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ minHeight: 'var(--touch-comfort)', borderRadius: 'var(--radius-xl)', background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 'var(--fs-body)', boxShadow: 'var(--shadow-999)', border: 'none' }}
          >
            <Zap className="w-6 h-6" />
            AED ready
          </button>
          <button
            onClick={handleROSC}
            className="flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ minHeight: 'var(--touch-comfort)', borderRadius: 'var(--radius-xl)', background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 'var(--fs-body)', boxShadow: 'var(--shadow-btn)', border: 'none' }}
          >
            <HeartPulse className="w-6 h-6" />
            Signs of life?
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
              className="font-medium active:opacity-80 transition-opacity"
              style={{ borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)', fontSize: 'var(--fs-body-sm)' }}
            >
              No shock advised
            </button>
            <button
              onClick={handleShockDelivered}
              className="font-bold active:opacity-90 transition-opacity"
              style={{ borderRadius: 'var(--radius-md)', background: 'var(--red)', color: '#fff', minHeight: 'var(--touch-min)', boxShadow: 'var(--shadow-999)', border: 'none', fontSize: 'var(--fs-body-sm)' }}
            >
              Shock delivered
            </button>
          </div>
        }
      >
        <Callout tone="contra" title="Stand clear" items={['Stand clear before delivering shock']} />
      </Sheet>
    </div>
  );
}

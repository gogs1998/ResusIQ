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
import { useMetronome } from '../hooks/useTimer';
import { useSpeech } from '../hooks/useSpeech';
import { useAppStore } from '../store/appStore';
import { elapsedSeconds, formatClock } from '../lib/emergencyTimers';

interface CPRModeProps {
  step: ProtocolStep;
  onNext: () => void;
  onEnd: () => void;
}

export function CPRMode({ step, onNext, onEnd }: CPRModeProps) {
  const { isMuted, toggleMute, addEventLog, practiceSetup, activeEvent } = useAppStore();
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

  const [shockCount, setShockCount] = useState(0);
  const [showAEDPrompt, setShowAEDPrompt] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isMuted) {
      speak('Starting CPR. Push hard and fast. I will count the rhythm.');
    }
    startMetronome();
    addEventLog('step_completed', 'CPR Started');
  }, []);

  // 1s tick for the header elapsed clock — derived from activeEvent.timestamp,
  // the same source the runner header reads, so the emergency clock is continuous
  // across the handoff into CPR.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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

  const rate = step.metronome_bpm || 110;
  const elapsed = activeEvent ? elapsedSeconds(activeEvent.timestamp, now) : 0;

  return (
    <div
      className="theatre flex flex-col safe-area-top"
      style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      {/* Header — end · title · mute · elapsed clock */}
      <header className="flex items-center" style={{ gap: 8, padding: '14px 16px 0', flexShrink: 0 }}>
        <button
          onClick={onEnd}
          aria-label="End emergency"
          className="flex items-center justify-center flex-shrink-0 active:opacity-80 transition-opacity"
          style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
        >
          <X className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
        </button>
        <h1 className="flex-1 min-w-0 font-extrabold truncate" style={{ fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', margin: 0 }}>
          Cardiac arrest · CPR
        </h1>
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
          aria-pressed={isMuted}
          className="flex items-center justify-center flex-shrink-0 active:opacity-80 transition-opacity"
          style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
        >
          {isMuted ? <VolumeX className="w-5 h-5" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-5 h-5" style={{ color: 'var(--text-2)' }} />}
        </button>
        {activeEvent && (
          <div className="text-right flex-shrink-0">
            <div className="riq-data font-bold" style={{ fontSize: 15, color: 'var(--text-1)', lineHeight: 1 }}>{formatClock(elapsed)}</div>
            <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 2 }}>Elapsed</div>
          </div>
        )}
      </header>

      {/* Centre — the compression counter is the whole screen */}
      <main className="flex-1 flex flex-col items-center justify-center" style={{ padding: '8px 20px', minHeight: 0, overflow: 'hidden' }}>
        {/* Eyebrow — red dot + push-hard shout */}
        <div className="flex items-center" style={{ gap: 8, marginBottom: 18 }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
          <span className="font-extrabold" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            Compressions — push hard, push fast
          </span>
        </div>

        {/* Pulsing ring — DS pulse-cpr (0.545s / 110 BPM), reduced-motion aware */}
        <div className="relative flex items-center justify-center" style={{ width: 224, height: 224 }}>
          <div
            className={`relative rounded-full flex items-center justify-center ${pulseActive ? 'animate-pulse-cpr' : ''}`}
            style={{ width: 220, height: 220, border: '3px solid color-mix(in srgb, var(--red) 55%, transparent)', boxShadow: 'inset 0 0 0 10px var(--red-tint)' }}
          >
            <div className="text-center">
              <p className="riq-data" style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: 'var(--text-1)' }}>{compressionNumber}</p>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginTop: 4 }}>of 30</p>
            </div>
          </div>
        </div>

        {/* Cycle + shock counter */}
        <p className="font-extrabold" style={{ marginTop: 18, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
          Cycle {cycleNumber}{shockCount > 0 && ` · ${shockCount} shock${shockCount > 1 ? 's' : ''}`}
        </p>

        {/* Breath Warning — amber safety shout */}
        {breathWarning && (
          <div className="flex items-center animate-pulse" style={{ gap: 8, marginTop: 14, padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--warn-tint)', border: '1.5px solid var(--warn)' }}>
            <Wind className="w-5 h-5" style={{ color: 'var(--warn)' }} />
            <p className="font-bold" style={{ fontSize: 15, color: 'var(--warn)' }}>Give 2 breaths</p>
          </div>
        )}

        {/* Stats row — rate · ratio · depth. Rate is the RCUK guideline range
            (100–120/min), NOT the metronome tick rate — see the pill below. */}
        <div className="flex items-start justify-center" style={{ gap: 28, marginTop: 24 }}>
          <div className="text-center">
            <div className="riq-data" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>100–120</div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginTop: 4 }}>per min</div>
          </div>
          <div className="text-center">
            <div className="riq-data" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>30:2</div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginTop: 4 }}>cycle</div>
          </div>
          <div className="text-center">
            <div className="riq-data" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>5–6</div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginTop: 4 }}>cm deep</div>
          </div>
        </div>

        {/* Metronome toggle — neutral secondary */}
        <button
          onClick={toggleMetronome}
          className="inline-flex items-center justify-center active:opacity-80 transition-opacity"
          style={{ gap: 8, marginTop: 24, minHeight: 44, padding: '0 18px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, fontSize: 13 }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Pause metronome' : 'Resume metronome'}
          <span className="riq-data" style={{ color: 'var(--text-3)', fontWeight: 700 }}>· {rate} bpm</span>
        </button>
      </main>

      {/* Footer — AED · signs of life · persistent 999 */}
      <footer className="safe-area-bottom" style={{ flexShrink: 0, padding: '10px 18px 16px' }}>
        <div className="grid grid-cols-2" style={{ gap: 10 }}>
          <button
            onClick={() => setShowAEDPrompt(true)}
            className="flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{ gap: 8, minHeight: 'var(--touch-comfort)', borderRadius: 'var(--radius-xl)', background: 'var(--surface-1)', border: '1.5px solid var(--warn)', color: 'var(--warn)', fontWeight: 700, fontSize: 'var(--fs-body)' }}
          >
            <Zap className="w-5 h-5" />
            AED ready
          </button>
          <button
            onClick={handleROSC}
            className="flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{ gap: 8, minHeight: 'var(--touch-comfort)', borderRadius: 'var(--radius-xl)', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)', fontWeight: 700, fontSize: 'var(--fs-body)' }}
          >
            <HeartPulse className="w-5 h-5" />
            Signs of life?
          </button>
        </div>

        <a
          href="tel:999"
          onClick={() => { addEventLog('999_called', '999 called'); }}
          className="flex items-center justify-center active:scale-[0.99] transition-transform"
          style={{ gap: 8, marginTop: 10, minHeight: 52, borderRadius: 'var(--radius-md)', background: 'var(--red-tint-2)', border: '1.5px solid var(--red)', textDecoration: 'none' }}
        >
          <Phone className="w-5 h-5" style={{ color: 'var(--red-strong)' }} />
          <span className="font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--red-strong)' }}>Call 999</span>
          {practiceSetup?.postcode && (
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--red-strong)', opacity: 0.75 }}>· {practiceSetup.postcode}</span>
          )}
        </a>
      </footer>

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

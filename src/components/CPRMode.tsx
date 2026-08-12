import { useState, useEffect } from 'react';
import {
  Phone,
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
  const { isMuted, toggleMute, addEventLog, practiceSetup, isTrainingMode } = useAppStore();
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

  const breathWarning = compressionNumber >= 27;
  const pulseActive = isPlaying;

  return (
    <div className="riq-screen theatre safe-area-top">
      {isTrainingMode && (
        <div className="riq-training">Training — not a real emergency</div>
      )}

      <header className="flex items-center justify-between" style={{ padding: '4px 8px' }}>
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onEnd}
            aria-label="End emergency"
            className="flex items-center justify-center flex-shrink-0"
            style={{
              minWidth: 56,
              height: 48,
              padding: '0 10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--red-tint)',
              border: '1px solid var(--red-border)',
              color: 'var(--red)',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            End
          </button>
          <div className="min-w-0">
            <h1 className="font-extrabold flex items-center gap-2" style={{ color: 'var(--red)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.1 }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red)' }} aria-hidden />
              CPR in progress
            </h1>
            <p className="riq-data" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{formattedTime}</p>
          </div>
        </div>
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
          aria-pressed={isMuted}
          className="riq-icon-btn"
        >
          {isMuted ? <VolumeX className="w-5 h-5" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-5 h-5" />}
        </button>
      </header>

      <a
        href="tel:999"
        onClick={() => { addEventLog('999_called', '999 called'); }}
        className="riq-999-strip"
        style={{ marginBottom: 8 }}
      >
        <Phone className="w-4 h-4" />
        Call 999
        {practiceSetup?.postcode && (
          <span className="riq-data" style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>· {practiceSetup.postcode}</span>
        )}
      </a>

      <main className="flex-1 px-4 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              className={`relative w-[200px] h-[200px] rounded-full flex items-center justify-center ${pulseActive ? 'animate-pulse-cpr' : ''}`}
              style={{
                border: '3px solid var(--red)',
                boxShadow: 'inset 0 0 0 12px var(--red-tint), 0 0 40px rgba(255,90,82,0.18)',
              }}
            >
              <div className="text-center">
                <p className="riq-data font-bold leading-none" style={{ fontSize: 72, color: 'var(--red)' }}>{compressionNumber}</p>
                <p className="riq-kicker mt-1" style={{ color: 'var(--text-3)' }}>of 30</p>
              </div>
            </div>
          </div>

          <p className="riq-data mt-4 font-bold" style={{ color: 'var(--text-2)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Cycle {cycleNumber}{shockCount > 0 && ` · ${shockCount} shock${shockCount > 1 ? 's' : ''}`}
          </p>

          {breathWarning && (
            <div
              className="mt-4 flex items-center gap-2 animate-pulse"
              style={{
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--warn-tint)',
                border: '1.5px solid var(--warn-border)',
              }}
            >
              <Wind className="w-5 h-5" style={{ color: 'var(--warn)' }} />
              <p className="font-extrabold" style={{ fontSize: 18, color: 'var(--warn)' }}>Give 2 breaths</p>
            </div>
          )}
        </div>

        <div
          className="grid grid-cols-3 text-center"
          style={{
            gap: 0,
            padding: '12px 8px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            marginBottom: 10,
          }}
        >
          {[
            { v: '30:2', l: 'Ratio' },
            { v: '100–120', l: 'Rate /min' },
            { v: '5–6 cm', l: 'Depth' },
          ].map((s) => (
            <div key={s.l}>
              <p className="riq-data font-bold" style={{ fontSize: 18, color: 'var(--text-1)' }}>{s.v}</p>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 2 }}>{s.l}</p>
            </div>
          ))}
        </div>

        <button
          onClick={toggleMetronome}
          className="w-full flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{
            minHeight: 52,
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            color: 'var(--text-1)',
            fontWeight: 700,
            fontSize: 15,
            marginBottom: 10,
          }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Pause metronome' : 'Resume metronome'}
        </button>
      </main>

      <div className="safe-area-bottom" style={{ padding: '0 16px 16px' }}>
        <div className="grid grid-cols-2" style={{ gap: 8 }}>
          <button
            onClick={() => setShowAEDPrompt(true)}
            className="flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              minHeight: 72,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--red)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: 'var(--shadow-999)',
              border: 'none',
            }}
          >
            <Zap className="w-5 h-5" />
            AED ready
          </button>
          <button
            onClick={handleROSC}
            className="flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              minHeight: 72,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand)',
              color: '#0C1210',
              fontWeight: 800,
              fontSize: 15,
              boxShadow: 'var(--shadow-btn)',
              border: 'none',
            }}
          >
            <HeartPulse className="w-5 h-5" />
            Signs of life?
          </button>
        </div>
      </div>

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
              style={{
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                minHeight: 56,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              No shock advised
            </button>
            <button
              onClick={handleShockDelivered}
              className="font-bold active:opacity-90 transition-opacity"
              style={{
                borderRadius: 'var(--radius-md)',
                background: 'var(--red)',
                color: '#fff',
                minHeight: 56,
                boxShadow: 'var(--shadow-999)',
                border: 'none',
                fontSize: 14,
              }}
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

import { Phone, MapPin, ArrowLeft, Copy, Check, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

export function CallScript() {
  const { practiceSetup, setScreen, activeProtocol, activeEvent } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const address = practiceSetup?.address || '[Practice address not set]';
  const postcode = practiceSetup?.postcode || '[Postcode not set]';
  const phone = practiceSetup?.phone || '[Phone not set]';
  const practiceName = practiceSetup?.name || 'Dental Practice';

  const emergencyType = activeProtocol?.title || 'Medical Emergency';

  const scriptLines = [
    { label: 'Service', text: 'AMBULANCE' },
    { label: 'Location', text: `${practiceName}, ${address}, ${postcode}` },
    { label: 'Phone', text: phone },
    { label: 'Emergency', text: emergencyType },
    { label: 'Patient', text: 'Adult patient at dental practice' },
    { label: 'State', text: getPatientState() },
  ];

  // Only assert a drug was administered when it was actually confirmed in-flow.
  // Reading from the event log (as SBARHandover does) prevents the 999 script
  // from telling a dispatcher a drug was given when the step was skipped.
  function drugGiven(match: string): boolean {
    return (activeEvent?.events ?? []).some(
      (e) =>
        e.type === 'drug_given' &&
        (e.drug_id?.toLowerCase().includes(match) ||
          e.label.toLowerCase().includes(match))
    );
  }

  function getPatientState(): string {
    if (!activeProtocol) return 'Unwell — requires emergency assessment';
    switch (activeProtocol.id) {
      case 'cardiac_arrest':
        return 'Unconscious and not breathing. CPR in progress.';
      case 'anaphylaxis':
        return drugGiven('adrenaline')
          ? 'Suspected anaphylaxis. Adrenaline given IM.'
          : 'Suspected anaphylaxis — adrenaline not yet given.';
      case 'asthma':
        return drugGiven('salbutamol')
          ? 'Severe asthma. Salbutamol given.'
          : 'Severe asthma — salbutamol not yet given.';
      case 'hypoglycaemia':
        return 'Hypoglycaemia. Known diabetic.';
      case 'syncope':
        return 'Collapsed / fainted. Lying flat.';
      case 'seizure':
        return 'Having a seizure / post-seizure.';
      case 'chest_pain':
        return drugGiven('aspirin')
          ? 'Chest pain, suspected heart attack. Aspirin given.'
          : 'Chest pain, suspected heart attack — aspirin not yet given.';
      case 'choking':
        return 'Choking. Back blows and abdominal thrusts being given.';
      case 'stroke':
        return 'Suspected stroke. FAST positive.';
      case 'adrenal_crisis':
        return 'Suspected adrenal crisis. Patient on steroids.';
      default:
        return 'Unwell — requires emergency assessment';
    }
  }

  const fullScript = scriptLines.map(l => `${l.label}: ${l.text}`).join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
        <button onClick={() => setScreen('home')} aria-label="Back" className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
        </button>
        <Phone className="w-5 h-5" style={{ color: 'var(--red)' }} />
        <h1 className="text-lg font-bold flex-1" style={{ color: 'var(--text-1)' }}>999 Call Script</h1>
        <div className="cs-numeric flex items-center gap-1 text-sm" style={{ color: 'var(--text-2)' }}>
          <Clock className="w-4 h-4" />
          {formatTime(elapsedSeconds)}
        </div>
      </header>

      {/* Call Button */}
      <div className="p-4">
        <a
          href="tel:999"
          className="w-full font-bold py-5 px-6 rounded-2xl flex items-center justify-center gap-3 text-2xl active:opacity-90 transition-opacity text-center"
          style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', boxShadow: 'var(--glow-red)', minHeight: 'var(--touch-hero)' }}
        >
          <Phone className="w-8 h-8" />
          TAP TO CALL 999
        </a>
      </div>

      {/* Practice Address - prominent */}
      <div className="px-4 pb-3">
        <div className="cs-card cs-step-card p-4" style={{ ['--step-accent' as string]: 'var(--decision)', background: 'var(--decision-tint)' } as CSSProperties}>
          <div className="flex items-start gap-3">
            <MapPin className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: 'var(--decision)' }} />
            <div>
              <p className="cs-eyebrow" style={{ color: 'var(--decision)' }}>Practice Address</p>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-1)' }}>{practiceName}</p>
              <p className="text-base" style={{ color: 'var(--text-2)' }}>{address}</p>
              <p className="cs-numeric text-xl font-bold mt-1" style={{ color: 'var(--decision)' }}>{postcode}</p>
              {phone && phone !== '[Phone not set]' && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Tel: {phone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Script */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="cs-eyebrow">What to say</h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            {copied ? <Check className="w-4 h-4" style={{ color: 'var(--green)' }} /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="space-y-3">
          <ScriptStep number={1} instruction="State service needed:">
            <p className="text-2xl font-bold" style={{ color: 'var(--red)' }}>"AMBULANCE"</p>
          </ScriptStep>

          <ScriptStep number={2} instruction="Give your location:">
            <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>"{practiceName}"</p>
            <p className="text-base" style={{ color: 'var(--text-2)' }}>"{address}"</p>
            <p className="cs-numeric text-lg font-bold" style={{ color: 'var(--decision)' }}>"{postcode}"</p>
          </ScriptStep>

          <ScriptStep number={3} instruction="Describe the emergency:">
            <p className="text-lg font-semibold" style={{ color: 'var(--cond-anaphyl)' }}>"{emergencyType}"</p>
          </ScriptStep>

          <ScriptStep number={4} instruction="Patient status:">
            <p className="text-base" style={{ color: 'var(--text-1)' }}>"{getPatientState()}"</p>
          </ScriptStep>

          <ScriptStep number={5} instruction="Answer their questions">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Stay on the line. The operator will guide you.
              Put phone on SPEAKER so you can continue treatment.
            </p>
          </ScriptStep>
        </div>

        {/* Important reminders */}
        <div className="mt-4 cs-card p-4 space-y-2">
          <h3 className="cs-eyebrow">Remember</h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--text-2)' }}>
            <li>• Put phone on SPEAKER MODE</li>
            <li>• Do NOT hang up — let them hang up first</li>
            <li>• Send someone to meet the ambulance at the door</li>
            <li>• Have patient's medical history ready if possible</li>
            <li>• Note the time of the call</li>
          </ul>
        </div>
      </div>

      {/* Back to protocol button */}
      <div className="p-4 safe-area-bottom">
        <button
          onClick={() => setScreen('protocol')}
          className="w-full font-semibold py-3 px-6 rounded-2xl active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
        >
          ← Back to Protocol
        </button>
      </div>
    </div>
  );
}

function ScriptStep({ number, instruction, children }: { number: number; instruction: string; children: React.ReactNode }) {
  return (
    <div className="cs-card p-4">
      <div className="flex items-start gap-3">
        <div className="cs-numeric w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>
          {number}
        </div>
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>{instruction}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

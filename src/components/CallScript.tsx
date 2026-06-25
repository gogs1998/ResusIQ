import { Phone, MapPin, ArrowLeft, Copy, Check, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

const backBtn: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  flexShrink: 0,
};

const eyebrow: CSSProperties = {
  fontSize: 'var(--fs-label)',
  fontWeight: 700,
  letterSpacing: 'var(--ls-label)',
  textTransform: 'uppercase',
};

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
      <header className="flex items-center" style={{ gap: 8, padding: '8px 12px', height: 'var(--appbar-h)' }}>
        <button onClick={() => setScreen('home')} aria-label="Back" style={backBtn} className="active:opacity-70 transition-opacity">
          <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
        </button>
        <h1 className="font-bold flex-1" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>999 call script</h1>
        <div
          className="cs-numeric flex items-center gap-1.5"
          style={{ fontSize: 'var(--fs-body-sm)', fontWeight: 600, color: 'var(--text-2)' }}
        >
          <Clock className="w-5 h-5" />
          {formatTime(elapsedSeconds)}
        </div>
      </header>

      {/* Call Button */}
      <div style={{ padding: '8px 24px 16px' }}>
        <a
          href="tel:999"
          className="w-full font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-transform text-center"
          style={{
            fontSize: 'var(--fs-subtitle)',
            background: 'var(--red)',
            color: '#fff',
            boxShadow: 'var(--shadow-999)',
            borderRadius: 'var(--radius-xl)',
            minHeight: 'var(--touch-hero)',
            textDecoration: 'none',
            padding: '0 24px',
          }}
        >
          <Phone className="w-8 h-8" />
          Tap to call 999
        </a>
      </div>

      {/* Practice Address - prominent */}
      <div style={{ padding: '0 24px 16px' }}>
        <div
          style={{
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--teal-100)',
            padding: 20,
          }}
        >
          <div className="flex items-start" style={{ gap: 16 }}>
            <MapPin className="w-7 h-7 flex-shrink-0" style={{ color: 'var(--brand)', marginTop: 2 }} />
            <div>
              <p style={{ ...eyebrow, color: 'var(--teal-700)' }}>Practice address</p>
              <p className="font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)', marginTop: 6 }}>{practiceName}</p>
              <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', marginTop: 2 }}>{address}</p>
              <p className="cs-numeric font-bold" style={{ fontSize: 'var(--fs-subtitle)', color: 'var(--brand)', marginTop: 6 }}>{postcode}</p>
              {phone && phone !== '[Phone not set]' && (
                <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-3)', marginTop: 6 }}>Tel: {phone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Script */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px 16px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h2 style={{ ...eyebrow, color: 'var(--text-3)' }}>What to say</h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
            style={{
              fontSize: 'var(--fs-label)',
              fontWeight: 600,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)',
              border: 'none',
              color: copied ? 'var(--green-700)' : 'var(--text-2)',
            }}
          >
            {copied ? <Check className="w-5 h-5" style={{ color: 'var(--green-600)' }} /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col" style={{ gap: 12 }}>
          <ScriptStep number={1} instruction="State the service needed">
            <p className="font-bold" style={{ fontSize: 'var(--fs-subtitle)', color: 'var(--red-700)' }}>"Ambulance"</p>
          </ScriptStep>

          <ScriptStep number={2} instruction="Give your location">
            <p className="font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)' }}>"{practiceName}"</p>
            <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', marginTop: 2 }}>"{address}"</p>
            <p className="cs-numeric font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--brand)', marginTop: 2 }}>"{postcode}"</p>
          </ScriptStep>

          <ScriptStep number={3} instruction="Describe the emergency">
            <p className="font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)' }}>"{emergencyType}"</p>
          </ScriptStep>

          <ScriptStep number={4} instruction="Patient status">
            <p className="font-semibold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)' }}>"{getPatientState()}"</p>
          </ScriptStep>

          <ScriptStep number={5} instruction="Answer their questions">
            <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-normal)' }}>
              Stay on the line. The operator will guide you.
              Put the phone on speaker so you can continue treatment.
            </p>
          </ScriptStep>
        </div>

        {/* Important reminders */}
        <div
          style={{
            marginTop: 16,
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-sm)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}
        >
          <h3 style={{ ...eyebrow, color: 'var(--teal-700)', marginBottom: 12 }}>Remember</h3>
          <ul className="flex flex-col" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', gap: 10, listStyle: 'none', padding: 0, margin: 0, lineHeight: 'var(--lh-normal)' }}>
            <li>Put the phone on speaker mode</li>
            <li>Do not hang up — let them hang up first</li>
            <li>Send someone to meet the ambulance at the door</li>
            <li>Have the patient's medical history ready if possible</li>
            <li>Note the time of the call</li>
          </ul>
        </div>
      </div>

      {/* Back to protocol button */}
      <div className="safe-area-bottom" style={{ padding: 24 }}>
        <button
          onClick={() => setScreen('protocol')}
          className="w-full flex items-center justify-center gap-2 font-semibold active:scale-[0.98] transition-transform"
          style={{
            fontSize: 'var(--fs-body-sm)',
            padding: '0 24px',
            minHeight: 'var(--touch-min)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-sm)',
            border: 'none',
            color: 'var(--text-2)',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to protocol
        </button>
      </div>
    </div>
  );
}

function ScriptStep({ number, instruction, children }: { number: number; instruction: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
      }}
    >
      <div className="flex items-start" style={{ gap: 16 }}>
        <div
          className="cs-numeric flex items-center justify-center font-bold flex-shrink-0"
          style={{ width: 36, height: 36, borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-body-sm)', background: 'var(--teal-50)', color: 'var(--brand)' }}
        >
          {number}
        </div>
        <div className="flex-1">
          <p style={{ fontSize: 'var(--fs-label)', color: 'var(--text-3)', marginBottom: 6 }}>{instruction}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

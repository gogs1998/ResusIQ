import { Phone, MapPin, ArrowLeft, Copy, Check, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useState, useEffect } from 'react';

export function CallScript() {
  const { practiceSetup, setScreen, activeProtocol } = useAppStore();
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

  function getPatientState(): string {
    if (!activeProtocol) return 'Unwell — requires emergency assessment';
    switch (activeProtocol.id) {
      case 'cardiac_arrest':
        return 'Unconscious and not breathing. CPR in progress.';
      case 'anaphylaxis':
        return 'Suspected anaphylaxis. Adrenaline has been given IM.';
      case 'asthma':
        return 'Severe asthma attack. Salbutamol given via spacer.';
      case 'hypoglycaemia':
        return 'Hypoglycaemia. Known diabetic.';
      case 'syncope':
        return 'Collapsed / fainted. Lying flat.';
      case 'seizure':
        return 'Having a seizure / post-seizure.';
      case 'chest_pain':
        return 'Chest pain. Suspected heart attack. Aspirin given.';
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-red-700 p-4 flex items-center gap-3">
        <button onClick={() => setScreen('home')} className="p-2 -ml-2 rounded-lg hover:bg-red-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Phone className="w-6 h-6" />
        <h1 className="text-xl font-bold flex-1">999 Call Script</h1>
        <div className="flex items-center gap-1 text-sm opacity-90">
          <Clock className="w-4 h-4" />
          {formatTime(elapsedSeconds)}
        </div>
      </header>

      {/* Call Button */}
      <div className="p-4">
        <a
          href="tel:999"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-5 px-6 rounded-xl flex items-center justify-center gap-3 text-2xl shadow-lg active:scale-98 transition-all block text-center"
        >
          <Phone className="w-8 h-8" />
          TAP TO CALL 999
        </a>
      </div>

      {/* Practice Address - prominent */}
      <div className="px-4 pb-3">
        <div className="bg-yellow-600/20 border-2 border-yellow-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-yellow-300 text-sm uppercase tracking-wide">Practice Address</p>
              <p className="text-lg font-bold mt-1">{practiceName}</p>
              <p className="text-base">{address}</p>
              <p className="text-xl font-bold text-yellow-300 mt-1">{postcode}</p>
              {phone && phone !== '[Phone not set]' && (
                <p className="text-sm text-gray-300 mt-1">Tel: {phone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Script */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-300">WHAT TO SAY</h2>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="space-y-3">
          <ScriptStep number={1} instruction="State service needed:">
            <p className="text-2xl font-bold text-red-400">"AMBULANCE"</p>
          </ScriptStep>

          <ScriptStep number={2} instruction="Give your location:">
            <p className="text-lg font-semibold">"{practiceName}"</p>
            <p className="text-base">"{address}"</p>
            <p className="text-lg font-bold text-yellow-300">"{postcode}"</p>
          </ScriptStep>

          <ScriptStep number={3} instruction="Describe the emergency:">
            <p className="text-lg font-semibold text-orange-300">"{emergencyType}"</p>
          </ScriptStep>

          <ScriptStep number={4} instruction="Patient status:">
            <p className="text-base">"{getPatientState()}"</p>
          </ScriptStep>

          <ScriptStep number={5} instruction="Answer their questions">
            <p className="text-sm text-gray-400">
              Stay on the line. The operator will guide you.
              Put phone on SPEAKER so you can continue treatment.
            </p>
          </ScriptStep>
        </div>

        {/* Important reminders */}
        <div className="mt-4 bg-gray-800 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-gray-300 text-sm uppercase">Remember</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Put phone on SPEAKER MODE</li>
            <li>• Do NOT hang up — let them hang up first</li>
            <li>• Send someone to meet the ambulance at the door</li>
            <li>• Have patient's medical history ready if possible</li>
            <li>• Note the time of the call</li>
          </ul>
        </div>
      </div>

      {/* Back to protocol button */}
      <div className="p-4 bg-gray-800">
        <button
          onClick={() => setScreen('protocol')}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl"
        >
          ← Back to Protocol
        </button>
      </div>
    </div>
  );
}

function ScriptStep({ number, instruction, children }: { number: number; instruction: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
          {number}
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">{instruction}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

import { ArrowLeft, Copy, Check, Share2, ClipboardList } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useState } from 'react';
import { format } from 'date-fns';

export function SBARHandover() {
  const { setScreen, practiceSetup, activeProtocol, activeEvent, eventHistory } = useAppStore();
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const practiceName = practiceSetup?.name || 'Dental Practice';
  const address = practiceSetup?.address || '';
  const postcode = practiceSetup?.postcode || '';
  const emergencyType = activeProtocol?.title || 'Medical Emergency';

  // Get event log entries for timeline
  const currentEvent = activeEvent || (eventHistory.length > 0 ? eventHistory[eventHistory.length - 1] : null);
  const logEntries = currentEvent?.events || [];

  const now = new Date();

  // Build SBAR text
  const sbarText = buildSBAR();

  function buildSBAR(): string {
    const lines: string[] = [];
    
    lines.push('═══ SBAR HANDOVER ═══');
    lines.push(`Date/Time: ${format(now, 'dd/MM/yyyy HH:mm')}`);
    lines.push('');
    
    // SITUATION
    lines.push('── S: SITUATION ──');
    lines.push(`I am calling from ${practiceName}, ${address} ${postcode}.`);
    lines.push(`We have a ${patientAge ? patientAge + ' year old' : ''} ${patientGender || 'patient'} ${patientName ? `(${patientName})` : ''} with ${emergencyType}.`);
    lines.push('');

    // BACKGROUND
    lines.push('── B: BACKGROUND ──');
    if (medicalHistory) lines.push(`Medical history: ${medicalHistory}`);
    if (medications) lines.push(`Current medications: ${medications}`);
    if (allergies) lines.push(`Allergies: ${allergies}`);
    if (!medicalHistory && !medications && !allergies) {
      lines.push('Medical history: Not known / unable to obtain');
    }
    lines.push('');

    // ASSESSMENT
    lines.push('── A: ASSESSMENT ──');
    lines.push(`Emergency type: ${emergencyType}`);
    if (logEntries.length > 0) {
      lines.push('Actions taken:');
      logEntries.forEach(entry => {
        const time = format(new Date(entry.timestamp), 'HH:mm:ss');
        lines.push(`  ${time} - ${entry.label}`);
      });
    }
    lines.push('');

    // RECOMMENDATION
    lines.push('── R: RECOMMENDATION ──');
    lines.push('Patient requires emergency transfer to hospital.');
    if (additionalInfo) lines.push(`Additional: ${additionalInfo}`);
    lines.push('');
    lines.push(`Contact: ${practiceSetup?.phone || 'N/A'}`);

    return lines.join('\n');
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sbarText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SBAR Handover',
          text: sbarText,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-blue-800 p-4 flex items-center gap-3">
        <button onClick={() => setScreen('home')} className="p-2 -ml-2 rounded-lg hover:bg-blue-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ClipboardList className="w-6 h-6" />
        <h1 className="text-xl font-bold flex-1">SBAR Handover</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* What is SBAR */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-3">
          <p className="text-sm text-blue-300">
            <strong>SBAR</strong> = Situation, Background, Assessment, Recommendation.
            Use this to hand over to the ambulance crew.
          </p>
        </div>

        {/* Patient Details */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Patient Details</h2>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Patient name (if known)"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Age"
                value={patientAge}
                onChange={e => setPatientAge(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={patientGender}
                onChange={e => setPatientGender(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </section>

        {/* Background */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Background</h2>
          <div className="space-y-2">
            <textarea
              placeholder="Medical history (e.g., diabetes, asthma, heart disease)"
              value={medicalHistory}
              onChange={e => setMedicalHistory(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <textarea
              placeholder="Current medications"
              value={medications}
              onChange={e => setMedications(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <input
              type="text"
              placeholder="Allergies (NKDA if none known)"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </section>

        {/* Auto-populated Assessment */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Assessment (auto-filled)</h2>
          <div className="bg-gray-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Emergency:</span>
              <span className="font-semibold text-orange-300">{emergencyType}</span>
            </div>
            {logEntries.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Actions taken:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {logEntries.map((entry, i) => (
                    <div key={i} className="text-sm flex items-start gap-2">
                      <span className="text-gray-500 font-mono text-xs mt-0.5">
                        {format(new Date(entry.timestamp), 'HH:mm:ss')}
                      </span>
                      <span className="text-gray-300">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {logEntries.length === 0 && (
              <p className="text-sm text-gray-500 italic">No logged actions yet</p>
            )}
          </div>
        </section>

        {/* Recommendation */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Additional Information</h2>
          <textarea
            placeholder="Any other information for the ambulance crew"
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </section>

        {/* Preview */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Handover Preview</h2>
          <pre className="bg-gray-950 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
            {sbarText}
          </pre>
        </section>
      </div>

      {/* Action buttons */}
      <div className="p-4 bg-gray-800 grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleShare}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>
    </div>
  );
}

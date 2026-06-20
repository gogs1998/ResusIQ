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
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
        <button onClick={() => setScreen('home')} aria-label="Back" className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
        </button>
        <ClipboardList className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        <h1 className="text-lg font-bold flex-1" style={{ color: 'var(--text-1)' }}>SBAR Handover</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* What is SBAR */}
        <div className="rounded-xl p-3" style={{ background: 'var(--brand-tint)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)' }}>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            <strong style={{ color: 'var(--brand)' }}>SBAR</strong> = Situation, Background, Assessment, Recommendation.
            Use this to hand over to the ambulance crew.
          </p>
        </div>

        {/* Patient Details */}
        <section>
          <h2 className="cs-eyebrow mb-2">Patient Details</h2>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Patient name (if known)"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="cs-input"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Age"
                value={patientAge}
                onChange={e => setPatientAge(e.target.value)}
                className="cs-input"
              />
              <select
                value={patientGender}
                onChange={e => setPatientGender(e.target.value)}
                className="cs-input"
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
          <h2 className="cs-eyebrow mb-2">Background</h2>
          <div className="space-y-2">
            <textarea
              placeholder="Medical history (e.g., diabetes, asthma, heart disease)"
              value={medicalHistory}
              onChange={e => setMedicalHistory(e.target.value)}
              rows={2}
              className="cs-input resize-none"
            />
            <textarea
              placeholder="Current medications"
              value={medications}
              onChange={e => setMedications(e.target.value)}
              rows={2}
              className="cs-input resize-none"
            />
            <input
              type="text"
              placeholder="Allergies (NKDA if none known)"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              className="cs-input"
            />
          </div>
        </section>

        {/* Auto-populated Assessment */}
        <section>
          <h2 className="cs-eyebrow mb-2">Assessment (auto-filled)</h2>
          <div className="cs-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>Emergency:</span>
              <span className="font-semibold" style={{ color: 'var(--cond-anaphyl)' }}>{emergencyType}</span>
            </div>
            {logEntries.length > 0 && (
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Actions taken:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {logEntries.map((entry, i) => (
                    <div key={i} className="text-sm flex items-start gap-2">
                      <span className="cs-numeric text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                        {format(new Date(entry.timestamp), 'HH:mm:ss')}
                      </span>
                      <span style={{ color: 'var(--text-2)' }}>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {logEntries.length === 0 && (
              <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>No logged actions yet</p>
            )}
          </div>
        </section>

        {/* Recommendation */}
        <section>
          <h2 className="cs-eyebrow mb-2">Additional Information</h2>
          <textarea
            placeholder="Any other information for the ambulance crew"
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            rows={2}
            className="cs-input resize-none"
          />
        </section>

        {/* Preview */}
        <section>
          <h2 className="cs-eyebrow mb-2">Handover Preview</h2>
          <pre className="rounded-xl p-4 text-sm whitespace-pre-wrap font-mono overflow-x-auto" style={{ background: 'var(--surface-inset)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            {sbarText}
          </pre>
        </section>
      </div>

      {/* Action buttons */}
      <div className="p-4 grid grid-cols-2 gap-3 safe-area-bottom">
        <button
          onClick={handleCopy}
          className="font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
        >
          {copied ? <Check className="w-5 h-5" style={{ color: 'var(--green)' }} /> : <Copy className="w-5 h-5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleShare}
          className="font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
          style={{ background: 'var(--brand)', color: 'var(--text-on-light)', minHeight: 'var(--touch-min)' }}
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
      </div>
    </div>
  );
}

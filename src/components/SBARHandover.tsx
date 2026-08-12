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

  const eyebrowStyle = {
    fontSize: 'var(--fs-label)',
    fontWeight: 700,
    letterSpacing: 'var(--ls-label)',
    textTransform: 'uppercase' as const,
            color: 'var(--brand-strong)',
  };

  const inputStyle = {
    width: '100%',
    minHeight: 'var(--touch-min)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    fontSize: 'var(--fs-body-sm)',
    color: 'var(--text-1)',
  };

  return (
    <div className="riq-screen safe-area-top">
      {/* Header */}
      <header className="flex items-center gap-2 px-2" style={{ height: 'var(--appbar-h)' }}>
        <button
          onClick={() => setScreen('home')}
          aria-label="Back"
          className="flex items-center justify-center active:opacity-60 transition-opacity"
          style={{ width: 56, height: 56, background: 'transparent', border: 'none' }}
        >
          <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
        </button>
        <ClipboardList className="w-6 h-6" style={{ color: 'var(--brand)' }} />
        <h1 className="font-bold flex-1" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>SBAR handover</h1>
      </header>

      <div className="flex-1 overflow-y-auto" style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* What is SBAR */}
        <div style={{ background: 'var(--brand-tint)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', lineHeight: 'var(--lh-normal)' }}>
            <strong style={{ color: 'var(--brand-strong)' }}>SBAR</strong> = Situation, Background, Assessment, Recommendation.
            Use this to hand over to the ambulance crew.
          </p>
        </div>

        {/* Patient Details */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={eyebrowStyle}>Patient details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder="Patient name (if known)"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              style={inputStyle}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Age"
                value={patientAge}
                onChange={e => setPatientAge(e.target.value)}
                style={inputStyle}
              />
              <select
                value={patientGender}
                onChange={e => setPatientGender(e.target.value)}
                style={inputStyle}
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </section>

        {/* Background */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={eyebrowStyle}>Background</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              placeholder="Medical history (e.g., diabetes, asthma, heart disease)"
              value={medicalHistory}
              onChange={e => setMedicalHistory(e.target.value)}
              rows={2}
              className="resize-none"
              style={inputStyle}
            />
            <textarea
              placeholder="Current medications"
              value={medications}
              onChange={e => setMedications(e.target.value)}
              rows={2}
              className="resize-none"
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Allergies (NKDA if none known)"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              style={inputStyle}
            />
          </div>
        </section>

        {/* Auto-populated Assessment */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={eyebrowStyle}>Assessment (auto-filled)</h2>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-3)' }}>Emergency:</span>
              <span className="font-semibold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--cond-anaphyl)' }}>{emergencyType}</span>
            </div>
            {logEntries.length > 0 && (
              <div>
                <p className="mb-2" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-3)' }}>Actions taken:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {logEntries.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2" style={{ fontSize: 'var(--fs-body-sm)' }}>
                      <span className="cs-numeric mt-0.5" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>
                        {format(new Date(entry.timestamp), 'HH:mm:ss')}
                      </span>
                      <span style={{ color: 'var(--text-2)' }}>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {logEntries.length === 0 && (
              <p className="italic" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-3)' }}>No logged actions yet</p>
            )}
          </div>
        </section>

        {/* Recommendation */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={eyebrowStyle}>Additional information</h2>
          <textarea
            placeholder="Any other information for the ambulance crew"
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            rows={2}
            className="resize-none"
            style={inputStyle}
          />
        </section>

        {/* Preview */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={eyebrowStyle}>Handover preview</h2>
          <pre
            className="whitespace-pre-wrap overflow-x-auto"
            style={{ background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', padding: 16, fontSize: 'var(--fs-caption)', color: 'var(--text-2)', lineHeight: 'var(--lh-normal)' }}
          >
            {sbarText}
          </pre>
        </section>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 safe-area-bottom" style={{ padding: 24, gap: 12 }}>
        <button
          onClick={handleCopy}
          className="font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-2)', borderRadius: 'var(--radius-lg)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body-sm)' }}
        >
          {copied ? <Check className="w-6 h-6" style={{ color: 'var(--green)' }} /> : <Copy className="w-6 h-6" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={handleShare}
          className="font-semibold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
          style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-btn)', borderRadius: 'var(--radius-lg)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body-sm)' }}
        >
          <Share2 className="w-6 h-6" />
          Share
        </button>
      </div>
    </div>
  );
}

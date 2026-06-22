import { useEffect, useCallback, useState } from 'react';
import {
  ArrowLeft,
  Phone,
  Volume2,
  VolumeX,
  Check,
  X,
  Timer,
  Pill,
  Users,
  ChevronRight,
  Mic,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store/appStore';
import { voiceCommandsSupported } from '../lib/platform';
import { useSpeech, useVoiceCommands } from '../hooks/useSpeech';
import { useTimer } from '../hooks/useTimer';
import { getDrugById } from '../data/drugs';
import { DrugCard } from './DrugCard';
import { ChildDoseBands } from './ChildDoseBands';
import { CPRMode } from './CPRMode';

// Short, calm kicker word per step type (sits above the instruction in teal).
const KICKER: Record<string, string> = {
  instruction: 'Action',
  drug: 'Give medicine',
  decision: 'Decision',
  timer_block: 'Reassess',
  role_assignment: 'Assign roles',
};

// Header icon button (transparent, large tap target).
const headBtn: CSSProperties = {
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

export function ProtocolRunner() {
  const {
    activeProtocol,
    currentStepIndex,
    nextStep,
    prevStep,
    goToStep,
    endEmergency,
    isMuted,
    toggleMute,
    addEventLog,
    practiceSetup,
  } = useAppStore();

  const { speak, isSpeaking } = useSpeech();
  const [showDrugCard, setShowDrugCard] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  const currentStep = activeProtocol?.steps[currentStepIndex];

  // Speak current step when it changes
  useEffect(() => {
    if (currentStep && !isMuted) {
      speak(currentStep.say);
    }
  }, [currentStep, isMuted, speak]);

  // Linear progression for non-decision steps.
  const advance = useCallback(() => {
    if (currentStep) {
      addEventLog('step_completed', currentStep.show.split('\n')[0]);
    }
    if (currentStep?.next) {
      const nextStepIndex = activeProtocol?.steps.findIndex(s => s.id === currentStep.next);
      if (nextStepIndex !== undefined && nextStepIndex >= 0) goToStep(nextStepIndex);
      else nextStep();
    } else {
      nextStep();
    }
  }, [currentStep, addEventLog, activeProtocol, goToStep, nextStep]);

  // Decision steps resolve in ONE tap: choosing an answer logs the choice and
  // jumps straight to that branch's target step.
  const chooseAnswer = useCallback((answer: { label: string; next: string }) => {
    if (currentStep) {
      addEventLog('step_completed', `${currentStep.show.split('\n')[0]} → ${answer.label}`);
    }
    const nextStepIndex = activeProtocol?.steps.findIndex(s => s.id === answer.next);
    if (nextStepIndex !== undefined && nextStepIndex >= 0) goToStep(nextStepIndex);
    else nextStep();
  }, [currentStep, addEventLog, activeProtocol, goToStep, nextStep]);

  // On a require_confirm (drug) step one press logs the drug as given and
  // advances — keeps the event log honest without a two-tap dance.
  const handleConfirm = useCallback(() => {
    if (currentStep?.type === 'drug' && currentStep.drug_id) {
      addEventLog('drug_given', `Drug: ${currentStep.drug_id}`, undefined, currentStep.drug_id);
    }
    advance();
  }, [currentStep, addEventLog, advance]);

  const handleNext = useCallback(() => {
    if (currentStep?.require_confirm) {
      handleConfirm();
    } else {
      advance();
    }
  }, [currentStep, handleConfirm, advance]);

  const handleRepeat = useCallback(() => {
    if (currentStep) speak(currentStep.say);
  }, [currentStep, speak]);

  // Back: previous step, or end the emergency from the first step.
  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) endEmergency();
    else prevStep();
  }, [currentStepIndex, endEmergency, prevStep]);

  // Voice command handler.
  const handleVoiceCommand = useCallback((command: string) => {
    const c = command.toLowerCase();
    if (c.includes('next') || c.includes('continue') || c.includes('done') || c.includes('given') || c.includes('confirm')) {
      if (currentStep?.type !== 'decision') handleNext();
    } else if (c.includes('back') || c.includes('previous')) {
      prevStep();
    } else if (c.includes('repeat')) {
      handleRepeat();
    } else if (c.includes('mute') || c.includes('quiet')) {
      toggleMute();
    } else if (c.includes('999') || c.includes('emergency')) {
      window.location.href = 'tel:999';
    }
  }, [currentStep, prevStep, handleRepeat, toggleMute, handleNext]);

  const { isListening, startListening, stopListening } = useVoiceCommands(handleVoiceCommand);

  // Hands-free voice loop: while ON and the app isn't speaking, keep the mic
  // open. Half-duplex — listening pauses while TTS speaks. Needs native QA.
  useEffect(() => {
    if (!voiceCommandsSupported) return;
    if (!handsFree || isSpeaking) {
      if (isListening) void stopListening();
      return;
    }
    if (!isListening) {
      const t = setTimeout(() => { void startListening(); }, 500);
      return () => clearTimeout(t);
    }
  }, [handsFree, isSpeaking, isListening, startListening, stopListening]);

  if (!activeProtocol || !currentStep) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <p style={{ color: 'var(--text-3)' }}>No protocol selected</p>
      </div>
    );
  }

  // CPR mode is its own full-screen experience.
  if (currentStep.type === 'cpr_mode') {
    return <CPRMode step={currentStep} onNext={handleNext} onEnd={endEmergency} />;
  }

  const drug = currentStep.drug_id ? getDrugById(currentStep.drug_id) : null;
  const totalSteps = activeProtocol.steps.length;
  const isDecision = currentStep.type === 'decision';

  // Step hierarchy: `show` is "HERO\n\n<detail>".
  const [stepHero, ...stepRest] = currentStep.show.split('\n\n');
  const stepDetail = stepRest.join('\n\n');
  const kicker = KICKER[currentStep.type] ?? 'Action';

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-center" style={{ gap: 8, padding: '8px 12px' }}>
        <button onClick={handleBack} style={headBtn} aria-label={currentStepIndex === 0 ? 'End emergency' : 'Previous step'}>
          {currentStepIndex === 0 ? <X className="w-7 h-7" style={{ color: 'var(--text-2)' }} /> : <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />}
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="font-bold truncate" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)', lineHeight: 1.1 }}>{activeProtocol.title}</div>
          <div style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', marginTop: 2 }}>
            Step {currentStepIndex + 1} of {totalSteps}
          </div>
        </div>
        {voiceCommandsSupported && (
          <button
            onClick={() => setHandsFree(h => !h)}
            style={headBtn}
            aria-label={handsFree ? 'Turn off hands-free voice' : 'Turn on hands-free voice'}
            aria-pressed={handsFree}
          >
            <Mic className="w-6 h-6" style={{ color: handsFree ? 'var(--brand)' : 'var(--text-3)' }} />
          </button>
        )}
        <button onClick={toggleMute} style={headBtn} aria-label={isMuted ? 'Unmute voice' : 'Mute voice'} aria-pressed={isMuted}>
          {isMuted ? <VolumeX className="w-6 h-6" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-6 h-6" style={{ color: 'var(--text-2)' }} />}
        </button>
      </header>

      {/* Segmented progress */}
      <div className="flex" style={{ gap: 6, padding: '0 16px 8px' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 'var(--radius-pill)',
              background: i < currentStepIndex ? 'var(--teal-600)' : i === currentStepIndex ? 'var(--teal-400)' : 'var(--ink-100)',
            }}
          />
        ))}
      </div>

      {/* Persistent Call 999 (compact, tonal — always reachable) */}
      <a
        href="tel:999"
        onClick={() => addEventLog('999_called', '999 called')}
        className="flex items-center justify-center active:scale-[0.99] transition-transform"
        style={{ gap: 8, margin: '0 16px 4px', minHeight: 52, borderRadius: 'var(--radius-md)', background: 'var(--red-50)', border: '1.5px solid var(--red-200)', textDecoration: 'none' }}
      >
        <Phone className="w-5 h-5" style={{ color: 'var(--red)' }} />
        <span className="font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--red-700)' }}>Call 999</span>
        {practiceSetup?.postcode && (
          <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--red-600)', opacity: 0.8 }}>· {practiceSetup.postcode}</span>
        )}
      </a>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col" style={{ padding: '12px 24px 16px', minHeight: 0 }}>
        {/* SR announcement */}
        <div aria-live="assertive" role="status" className="sr-only">
          {`Step ${currentStepIndex + 1} of ${totalSteps}. ${currentStep.show}`}
        </div>

        <div className={isDecision ? '' : 'flex-1 flex flex-col justify-center'} style={{ paddingTop: 4 }}>
          {/* Kicker + reading-aloud indicator */}
          <div className="flex items-center" style={{ gap: 12, marginBottom: 18 }}>
            <span className="font-bold" style={{ fontSize: 'var(--fs-label)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--teal-700)' }}>
              {kicker}
            </span>
            <button
              onClick={handleRepeat}
              className="inline-flex items-center"
              style={{ gap: 8, background: 'transparent', border: 'none', padding: 0, fontSize: 'var(--fs-caption)', fontWeight: 600, color: isSpeaking ? 'var(--teal-600)' : 'var(--ink-400)' }}
              aria-label="Read this step aloud again"
            >
              {isSpeaking ? (
                <span className="riq-eq" aria-hidden><span /><span /><span /><span /></span>
              ) : (
                <Volume2 className="w-[18px] h-[18px]" />
              )}
              {isSpeaking ? 'Reading aloud' : 'Tap to hear'}
            </button>
          </div>

          {/* The one instruction */}
          <h2 className="whitespace-pre-line" style={{ fontSize: 'var(--fs-step)', fontWeight: 'var(--fw-semibold)', lineHeight: 'var(--lh-snug)', letterSpacing: 'var(--ls-tight)', color: 'var(--ink-900)' }}>
            {isDecision && currentStep.question ? currentStep.question : stepHero}
          </h2>
          {stepDetail && (
            <p className="whitespace-pre-line" style={{ fontSize: 'var(--fs-lead)', color: 'var(--ink-600)', lineHeight: 'var(--lh-relaxed)', marginTop: 16 }}>
              {stepDetail}
            </p>
          )}

          {/* Roles */}
          {currentStep.roles && currentStep.roles.length > 0 && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentStep.roles.map((role, idx) => (
                <div key={idx} className="flex items-center" style={{ gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
                  <span className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--teal-50)' }}>
                    <Users className="w-5 h-5" style={{ color: 'var(--teal-700)' }} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="block font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>{role.role}</span>
                    <span className="block" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)' }}>{role.task}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Decision choices — one tap each */}
          {isDecision && currentStep.answers && (
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {currentStep.answers.map((answer, idx) => {
                const isYes = /^yes/i.test(answer.label);
                const isNo = /^no/i.test(answer.label);
                const ring = isYes ? 'var(--green-600)' : isNo ? 'var(--red-600)' : 'var(--border-strong)';
                const iconBg = isYes ? 'var(--green-100)' : isNo ? 'var(--red-100)' : 'var(--teal-50)';
                const iconColor = isYes ? 'var(--green-700)' : isNo ? 'var(--red-700)' : 'var(--teal-700)';
                return (
                  <button
                    key={idx}
                    onClick={() => chooseAnswer(answer)}
                    className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
                    style={{ gap: 18, minHeight: 'var(--touch-comfort)', padding: '18px 22px', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', border: `2px solid ${ring}`, boxShadow: 'var(--shadow-sm)' }}
                  >
                    <span className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: iconBg }}>
                      {isYes ? <Check className="w-6 h-6" style={{ color: iconColor }} /> : isNo ? <X className="w-6 h-6" style={{ color: iconColor }} /> : <ChevronRight className="w-6 h-6" style={{ color: iconColor }} />}
                    </span>
                    <span className="flex-1 font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)', lineHeight: 1.2 }}>{answer.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Drug card */}
          {currentStep.type === 'drug' && drug && (
            <button
              onClick={() => setShowDrugCard(true)}
              className="w-full flex items-center text-left active:scale-[0.99] transition-transform"
              style={{ marginTop: 24, gap: 16, padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-md)', border: 'none' }}
            >
              <span className="flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--teal-50)' }}>
                <Pill className="w-6 h-6" style={{ color: 'var(--teal-700)' }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)' }}>{drug.name}</span>
                <span className="block" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)', marginTop: 2 }}>{drug.adult_dose_text}</span>
              </span>
              <ChevronRight className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
            </button>
          )}

          {currentStep.type === 'drug' && drug?.child_dose_bands && (
            <div style={{ marginTop: 16 }}>
              <ChildDoseBands drug={drug} />
            </div>
          )}

          {/* Timer */}
          {currentStep.type === 'timer_block' && currentStep.duration_seconds && (
            <div style={{ marginTop: 24 }}>
              <TimerDisplay seconds={currentStep.duration_seconds} onComplete={handleNext} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="safe-area-bottom" style={{ padding: '8px 24px 24px' }}>
        {!isDecision && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{ gap: 12, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-btn)', border: 'none' }}
          >
            <Check className="w-6 h-6" />
            <span className="font-bold" style={{ fontSize: 'var(--fs-subtitle)' }}>
              {currentStep.require_confirm ? (currentStep.type === 'drug' ? 'Confirm given' : 'Confirm done') : 'Done — next step'}
            </span>
          </button>
        )}
        {currentStepIndex > 0 && (
          <button
            onClick={prevStep}
            className="w-full flex items-center justify-center active:opacity-70 transition-opacity"
            style={{ gap: 6, marginTop: 10, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-3)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontSize: 'var(--fs-body-sm)', fontWeight: 500 }}>Back a step</span>
          </button>
        )}
      </footer>

      {showDrugCard && drug && <DrugCard drug={drug} onClose={() => setShowDrugCard(false)} />}
    </div>
  );
}

function TimerDisplay({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const { formattedTime, isRunning, start, pause } = useTimer({ initialSeconds: seconds, onComplete, autoStart: true });
  return (
    <div className="text-center" style={{ padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}>
      <p className="font-bold" style={{ fontSize: 'var(--fs-label)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Timer className="w-4 h-4" /> Reassess timer
      </p>
      <p className="font-bold" style={{ fontSize: 'var(--fs-display)', lineHeight: 1, color: 'var(--ink-900)', margin: '8px 0', fontVariantNumeric: 'tabular-nums' }}>{formattedTime}</p>
      <button
        onClick={isRunning ? pause : start}
        style={{ minHeight: 48, padding: '0 24px', borderRadius: 'var(--radius-md)', background: 'var(--teal-50)', color: 'var(--teal-700)', border: 'none', fontWeight: 600, fontSize: 'var(--fs-body-sm)' }}
      >
        {isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}

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
import { useAppStore } from '../store/appStore';
import { voiceCommandsSupported } from '../lib/platform';
import { useSpeech, useVoiceCommands } from '../hooks/useSpeech';
import { useTimer } from '../hooks/useTimer';
import { getDrugById } from '../data/drugs';
import { DrugCard } from './DrugCard';
import { ChildDoseBands } from './ChildDoseBands';
import { CPRMode } from './CPRMode';

const KICKER: Record<string, string> = {
  instruction: 'Action',
  drug: 'Give medicine',
  decision: 'Decide',
  timer_block: 'Reassess',
  role_assignment: 'Assign roles',
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
    isTrainingMode,
  } = useAppStore();

  const { speak, isSpeaking } = useSpeech();
  const [showDrugCard, setShowDrugCard] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  const currentStep = activeProtocol?.steps[currentStepIndex];

  useEffect(() => {
    if (currentStep && !isMuted) {
      speak(currentStep.say);
    }
  }, [currentStep, isMuted, speak]);

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

  const chooseAnswer = useCallback((answer: { label: string; next: string }) => {
    if (currentStep) {
      addEventLog('step_completed', `${currentStep.show.split('\n')[0]} → ${answer.label}`);
    }
    const nextStepIndex = activeProtocol?.steps.findIndex(s => s.id === answer.next);
    if (nextStepIndex !== undefined && nextStepIndex >= 0) goToStep(nextStepIndex);
    else nextStep();
  }, [currentStep, addEventLog, activeProtocol, goToStep, nextStep]);

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
      <div className="riq-screen items-center justify-center">
        <p style={{ color: 'var(--text-3)' }}>No protocol selected</p>
      </div>
    );
  }

  if (currentStep.type === 'cpr_mode') {
    return <CPRMode step={currentStep} onNext={handleNext} onEnd={endEmergency} />;
  }

  const drug = currentStep.drug_id ? getDrugById(currentStep.drug_id) : null;
  const totalSteps = activeProtocol.steps.length;
  const isDecision = currentStep.type === 'decision';
  const [stepHero, ...stepRest] = currentStep.show.split('\n\n');
  const stepDetail = stepRest.join('\n\n');
  const kicker = KICKER[currentStep.type] ?? 'Action';

  return (
    <div className="riq-screen theatre safe-area-top">
      {isTrainingMode && (
        <div className="riq-training">Training — not a real emergency</div>
      )}

      <header className="flex items-center" style={{ gap: 4, padding: '4px 8px' }}>
        <button
          onClick={endEmergency}
          className="flex items-center justify-center gap-1 flex-shrink-0"
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
          aria-label="End emergency"
        >
          End
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div
            className="truncate"
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-2)',
            }}
          >
            {activeProtocol.title}
          </div>
          <div className="riq-data" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {currentStepIndex + 1} / {totalSteps}
          </div>
        </div>
        {voiceCommandsSupported && (
          <button
            onClick={() => setHandsFree(h => !h)}
            className="riq-icon-btn"
            aria-label={handsFree ? 'Turn off hands-free voice' : 'Turn on hands-free voice'}
            aria-pressed={handsFree}
          >
            <Mic className="w-5 h-5" style={{ color: handsFree ? 'var(--brand)' : 'var(--text-3)' }} />
          </button>
        )}
        <button
          onClick={toggleMute}
          className="riq-icon-btn"
          aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
          aria-pressed={isMuted}
        >
          {isMuted ? <VolumeX className="w-5 h-5" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex" style={{ gap: 3, padding: '0 16px 8px' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < currentStepIndex ? 'var(--brand)' : i === currentStepIndex ? 'var(--text-1)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      <a
        href="tel:999"
        onClick={() => addEventLog('999_called', '999 called')}
        className="riq-999-strip"
      >
        <Phone className="w-4 h-4" />
        Call 999
        {practiceSetup?.postcode && (
          <span className="riq-data" style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>
            · {practiceSetup.postcode}
          </span>
        )}
      </a>

      <main className="flex-1 overflow-y-auto flex flex-col" style={{ padding: '16px 20px 12px', minHeight: 0 }}>
        <div aria-live="assertive" role="status" className="sr-only">
          {`Step ${currentStepIndex + 1} of ${totalSteps}. ${currentStep.show}`}
        </div>

        <div className={isDecision ? '' : 'flex-1 flex flex-col justify-center'}>
          <div className="flex items-center" style={{ gap: 12, marginBottom: 14 }}>
            <span className="riq-kicker">{kicker}</span>
            <button
              onClick={handleRepeat}
              className="inline-flex items-center"
              style={{
                gap: 8,
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: 12,
                fontWeight: 700,
                color: isSpeaking ? 'var(--brand)' : 'var(--text-3)',
              }}
              aria-label="Read this step aloud again"
            >
              {isSpeaking ? (
                <span className="riq-eq" aria-hidden><span /><span /><span /><span /></span>
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isSpeaking ? 'Reading' : 'Hear again'}
            </button>
          </div>

          <h2
            className="whitespace-pre-line"
            style={{
              fontSize: 'var(--fs-step)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: 'var(--text-1)',
              textWrap: 'balance',
            }}
          >
            {isDecision && currentStep.question ? currentStep.question : stepHero}
          </h2>
          {stepDetail && (
            <p
              className="whitespace-pre-line"
              style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.4, marginTop: 12 }}
            >
              {stepDetail}
            </p>
          )}

          {currentStep.roles && currentStep.roles.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentStep.roles.map((role, idx) => (
                <div
                  key={idx}
                  className="flex items-center"
                  style={{
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-tint)' }}
                  >
                    <Users className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="block font-bold" style={{ fontSize: 15, color: 'var(--text-1)' }}>{role.role}</span>
                    <span className="block" style={{ fontSize: 13, color: 'var(--text-2)' }}>{role.task}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {isDecision && currentStep.answers && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentStep.answers.map((answer, idx) => {
                const isYes = /^yes/i.test(answer.label);
                const isNo = /^no/i.test(answer.label);
                const ring = isYes ? 'var(--green-bright)' : isNo ? 'var(--red)' : 'var(--border-strong)';
                const iconBg = isYes ? 'var(--green-tint)' : isNo ? 'var(--red-tint)' : 'var(--brand-tint)';
                const iconColor = isYes ? 'var(--green-bright)' : isNo ? 'var(--red)' : 'var(--brand)';
                const [main, ...subParts] = answer.label.split(' — ');
                const sub = subParts.join(' — ');
                return (
                  <button
                    key={idx}
                    onClick={() => chooseAnswer(answer)}
                    className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
                    style={{
                      gap: 14,
                      minHeight: 72,
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-1)',
                      border: `2px solid ${ring}`,
                    }}
                  >
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: 44, height: 44, borderRadius: 10, background: iconBg }}
                    >
                      {isYes ? <Check className="w-6 h-6" style={{ color: iconColor }} /> : isNo ? <X className="w-6 h-6" style={{ color: iconColor }} /> : <ChevronRight className="w-6 h-6" style={{ color: iconColor }} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold" style={{ fontSize: 18, color: 'var(--text-1)', lineHeight: 1.2 }}>{main}</span>
                      {sub && <span className="block" style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{sub}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.type === 'drug' && drug && (
            <button
              onClick={() => setShowDrugCard(true)}
              className="w-full text-left active:scale-[0.99] transition-transform"
              style={{
                marginTop: 20,
                padding: '16px 18px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
              }}
            >
              <span className="flex items-center" style={{ gap: 12 }}>
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--drug-tint)' }}
                >
                  <Pill className="w-5 h-5" style={{ color: 'var(--drug)' }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold" style={{ fontSize: 16, color: 'var(--text-1)' }}>{drug.name}</span>
                  <span className="riq-data block" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-bright)', marginTop: 4, letterSpacing: '-0.02em' }}>
                    {drug.adult_dose}
                  </span>
                  <span className="block" style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{drug.adult_dose_text}</span>
                </span>
                <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
              </span>
            </button>
          )}

          {currentStep.type === 'drug' && drug?.child_dose_bands && (
            <div style={{ marginTop: 12 }}>
              <ChildDoseBands drug={drug} />
            </div>
          )}

          {currentStep.type === 'timer_block' && currentStep.duration_seconds && (
            <div style={{ marginTop: 20 }}>
              <TimerDisplay seconds={currentStep.duration_seconds} onComplete={handleNext} />
            </div>
          )}
        </div>
      </main>

      <footer className="safe-area-bottom" style={{ padding: '8px 16px 16px' }}>
        {!isDecision && (
          <button onClick={handleNext} className="riq-hero">
            <Check className="w-6 h-6" />
            {currentStep.require_confirm
              ? (currentStep.type === 'drug' ? 'Confirm given' : 'Confirm done')
              : 'Done — next'}
          </button>
        )}
        {currentStepIndex > 0 && (
          <button
            onClick={prevStep}
            className="w-full flex items-center justify-center active:opacity-70 transition-opacity"
            style={{ gap: 6, marginTop: 8, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-3)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Back a step</span>
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
    <div
      className="text-center"
      style={{
        padding: 24,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}
    >
      <p className="riq-kicker" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Timer className="w-3.5 h-3.5" /> Reassess
      </p>
      <p className="riq-data font-bold" style={{ fontSize: 'var(--fs-display)', lineHeight: 1, color: 'var(--text-1)', margin: '10px 0' }}>
        {formattedTime}
      </p>
      <button
        onClick={isRunning ? pause : start}
        style={{
          minHeight: 48,
          padding: '0 24px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--brand-tint)',
          color: 'var(--brand)',
          border: 'none',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}

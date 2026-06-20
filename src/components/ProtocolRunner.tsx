import { useEffect, useCallback, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  Check,
  CheckCheck,
  Timer,
  Pill,
  Users,
  GitBranch,
  CircleArrowRight,
  Mic
} from 'lucide-react';
import type { CSSProperties, ComponentType } from 'react';
import { useAppStore } from '../store/appStore';
import { voiceCommandsSupported } from '../lib/platform';
import { useSpeech, useVoiceCommands } from '../hooks/useSpeech';
import { useTimer } from '../hooks/useTimer';
import { getDrugById } from '../data/drugs';
import { DrugCard } from './DrugCard';
import { ChildDoseBands } from './ChildDoseBands';

// Fixed step-type → Clear Signal token mapping. Meanings never swap.
const STEP_TYPES: Record<string, { accent: string; tint: string; label: string; Icon: ComponentType<{ className?: string; style?: CSSProperties }> }> = {
  instruction: { accent: 'var(--instruction)', tint: 'var(--surface-2)', label: 'ACTION', Icon: CircleArrowRight },
  drug: { accent: 'var(--drug)', tint: 'var(--drug-tint)', label: 'DRUG', Icon: Pill },
  decision: { accent: 'var(--decision)', tint: 'var(--decision-tint)', label: 'DECISION', Icon: GitBranch },
  timer_block: { accent: 'var(--timed)', tint: 'var(--timed-tint)', label: 'TIMED', Icon: Timer },
  role_assignment: { accent: 'var(--roles)', tint: 'var(--roles-tint)', label: 'ROLES', Icon: Users },
};

// Reusable header-chip style (44px touch floor, surface-2 + border).
const chip: CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
};
import { CPRMode } from './CPRMode';

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
    practiceSetup
  } = useAppStore();

  const { speak } = useSpeech();
  const [showDrugCard, setShowDrugCard] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const currentStep = activeProtocol?.steps[currentStepIndex];

  // Speak current step when it changes
  useEffect(() => {
    if (currentStep && !isMuted) {
      speak(currentStep.say);
    }
  }, [currentStep, isMuted, speak]);

  // NOTE: handleNext/handleConfirm are memoized and declared BEFORE
  // handleVoiceCommand so the voice handler can list them as deps. Without
  // this, the recognition instance binds once to a stale closure and spoken
  // "next"/"confirm"/"given" act on an outdated step/answer mid-emergency.
  const handleNext = useCallback(() => {
    if (currentStep?.require_confirm && !confirmationRequired) {
      setConfirmationRequired(true);
      speak('Confirm when done. Say confirm or press the confirm button.');
      return;
    }

    if (currentStep?.type === 'decision' && !selectedAnswer) {
      speak('Please select an answer.');
      return;
    }

    // Log step completion
    if (currentStep) {
      addEventLog('step_completed', currentStep.show.split('\n')[0]);
    }

    // Handle decision branching
    if (currentStep?.type === 'decision' && selectedAnswer) {
      const answer = currentStep.answers?.find(a => a.label === selectedAnswer);
      if (answer) {
        const nextStepIndex = activeProtocol?.steps.findIndex(s => s.id === answer.next);
        if (nextStepIndex !== undefined && nextStepIndex >= 0) {
          goToStep(nextStepIndex);
        } else {
          nextStep();
        }
      }
      setSelectedAnswer(null);
    } else if (currentStep?.next) {
      const nextStepIndex = activeProtocol?.steps.findIndex(s => s.id === currentStep.next);
      if (nextStepIndex !== undefined && nextStepIndex >= 0) {
        goToStep(nextStepIndex);
      } else {
        nextStep();
      }
    } else {
      nextStep();
    }

    setConfirmationRequired(false);
  }, [currentStep, confirmationRequired, selectedAnswer, addEventLog, activeProtocol, goToStep, nextStep, speak]);

  const handleConfirm = useCallback(() => {
    if (currentStep?.type === 'drug' && currentStep.drug_id) {
      addEventLog('drug_given', `Drug: ${currentStep.drug_id}`, undefined, currentStep.drug_id);
    }
    setConfirmationRequired(false);
    handleNext();
  }, [currentStep, addEventLog, handleNext]);

  // Voice command handler — depends on the memoized handlers above so it is
  // recreated whenever step/answer/confirmation state changes.
  const handleVoiceCommand = useCallback((command: string) => {
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('next') || lowerCommand.includes('continue')) {
      if (!confirmationRequired) {
        handleNext();
      }
    } else if (lowerCommand.includes('back') || lowerCommand.includes('previous')) {
      prevStep();
    } else if (lowerCommand.includes('repeat')) {
      if (currentStep) {
        speak(currentStep.say);
      }
    } else if (lowerCommand.includes('confirm') || lowerCommand.includes('yes') || lowerCommand.includes('given')) {
      if (confirmationRequired) {
        handleConfirm();
      }
    } else if (lowerCommand.includes('mute') || lowerCommand.includes('quiet')) {
      toggleMute();
    } else if (lowerCommand.includes('999') || lowerCommand.includes('emergency')) {
      window.location.href = 'tel:999';
    }
  }, [confirmationRequired, currentStep, prevStep, speak, toggleMute, handleNext, handleConfirm]);

  const { isListening, startListening, stopListening } = useVoiceCommands(handleVoiceCommand);

  const handleRepeat = () => {
    if (currentStep) {
      speak(currentStep.say);
    }
  };

  if (!activeProtocol || !currentStep) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500">No protocol selected</p>
      </div>
    );
  }

  // Special handling for CPR mode
  if (currentStep.type === 'cpr_mode') {
    return (
      <CPRMode 
        step={currentStep}
        onNext={handleNext}
        onEnd={endEmergency}
      />
    );
  }

  const drug = currentStep.drug_id ? getDrugById(currentStep.drug_id) : null;
  const totalSteps = activeProtocol.steps.length;

  // Clear Signal step-type tokens — fixed meaning, never swap. Plain steps
  // fall back to `instruction` (ACTION) so a badge always renders.
  const stepType = STEP_TYPES[currentStep.type] ?? STEP_TYPES.instruction;

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={endEmergency}
            aria-label="End emergency"
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={chip}
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
          </button>
          <div>
            <h1 className="font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-1)' }}>{activeProtocol.title}</h1>
            <p className="cs-eyebrow mt-0.5">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
            aria-pressed={isMuted}
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={isMuted ? { background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' } : chip}
          >
            {isMuted ? <VolumeX className="w-4 h-4" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-4 h-4" style={{ color: 'var(--text-2)' }} />}
          </button>
          {/* Voice commands rely on Web Speech STT, which is silently
              non-functional in an installed iOS PWA. Only show the mic where
              it actually works so users never trust a dead button. */}
          {voiceCommandsSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
              aria-pressed={isListening}
              className={`w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity ${isListening ? 'animate-pulse' : ''}`}
              style={isListening ? { background: 'var(--brand-tint)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)' } : chip}
            >
              <Mic className="w-4 h-4" style={{ color: isListening ? 'var(--brand)' : 'var(--text-2)' }} />
            </button>
          )}
        </div>
      </header>

      {/* Progress Bar — segmented */}
      <div className="px-4 pb-2 flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className="h-[5px] flex-1 rounded-full transition-colors duration-300"
            style={
              i < currentStepIndex
                ? { background: 'var(--green)' }
                : i === currentStepIndex
                ? { background: 'var(--text-1)', boxShadow: '0 0 8px rgba(247,248,250,0.5)' }
                : { background: 'var(--surface-3)' }
            }
          />
        ))}
      </div>

      {/* Call 999 Strip */}
      <div className="mx-4 mb-2">
        <a
          href="tel:999"
          onClick={() => { addEventLog('999_called', '999 called'); }}
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 active:opacity-80 transition-opacity"
          style={{ background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)' }}
        >
          <Phone className="w-4 h-4" style={{ color: 'var(--red)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--red)' }}>CALL 999</span>
          {practiceSetup?.postcode && (
            <span className="text-xs ml-1" style={{ color: 'color-mix(in srgb, var(--red) 60%, transparent)' }}>· {practiceSetup.postcode}</span>
          )}
        </a>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 overflow-y-auto pb-4">
        {/* Screen-reader announcement of the current step */}
        <div aria-live="assertive" role="status" className="sr-only">
          {`Step ${currentStepIndex + 1} of ${totalSteps}. ${currentStep.show}`}
        </div>

        {/* Step Type Badge — always rendered */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-3"
          style={{ background: stepType.tint, border: `1px solid color-mix(in srgb, ${stepType.accent} 45%, transparent)` }}
        >
          <stepType.Icon className="w-3.5 h-3.5" style={{ color: stepType.accent }} />
          <span className="cs-eyebrow" style={{ color: stepType.accent }}>{stepType.label}</span>
        </div>

        {/* Step Content Card */}
        <div className="cs-card cs-step-card p-5 mb-4" style={{ ['--step-accent' as string]: stepType.accent } as CSSProperties}>
          <p className="cs-instruction whitespace-pre-line">
            {currentStep.show}
          </p>
        </div>

        {/* Role Assignments */}
        {currentStep.roles && currentStep.roles.length > 0 && (
          <div className="cs-card cs-step-card p-4 mb-4" style={{ ['--step-accent' as string]: 'var(--roles)' } as CSSProperties}>
            <h3 className="cs-eyebrow mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--roles)' }}>
              <Users className="w-3.5 h-3.5" /> Assign Roles
            </h3>
            <div className="space-y-2">
              {currentStep.roles.map((role, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--roles-tint)', border: '1px solid color-mix(in srgb, var(--roles) 30%, transparent)', color: 'var(--roles)' }}>{role.role}</span>
                  <span style={{ color: 'var(--text-2)' }}>{role.task}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Options */}
        {currentStep.type === 'decision' && currentStep.answers && (
          <div className="mb-4">
            {currentStep.question && (
              <p className="text-[18px] font-semibold mb-2.5" style={{ color: 'var(--text-1)' }}>{currentStep.question}</p>
            )}
            <div
              className="space-y-2"
              role="radiogroup"
              aria-label={currentStep.question || 'Select an option'}
            >
              {currentStep.answers.map((answer, idx) => {
                const selected = selectedAnswer === answer.label;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(answer.label)}
                    role="radio"
                    aria-checked={selected}
                    className="w-full p-4 rounded-2xl text-left transition-all active:opacity-90"
                    style={{ minHeight: 'var(--touch-comfort)', background: selected ? 'var(--decision-tint)' : 'var(--surface-2)', border: `1.5px solid ${selected ? 'var(--decision)' : 'var(--border)'}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ border: `2px solid ${selected ? 'var(--decision)' : 'var(--text-3)'}`, background: selected ? 'var(--decision)' : 'transparent' }}
                      >
                        {selected && <Check className="w-3 h-3" style={{ color: 'var(--text-on-light)' }} />}
                      </div>
                      <span className="font-medium text-[15px]" style={{ color: 'var(--text-1)' }}>{answer.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drug Card Button */}
        {currentStep.type === 'drug' && drug && (
          <button
            onClick={() => setShowDrugCard(true)}
            className="w-full rounded-2xl p-4 mb-4 text-left active:opacity-90 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{drug.name}</p>
                <p className="cs-numeric text-[13px] mt-0.5" style={{ color: 'var(--text-2)' }}>{drug.adult_dose_text}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--drug-tint)' }}>
                  <Pill className="w-5 h-5" style={{ color: 'var(--drug)' }} />
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
              </div>
            </div>
          </button>
        )}

        {/* Paediatric dose bands — rendered from the drug object so they
            stay in sync with the drug card (single source of truth) */}
        {currentStep.type === 'drug' && drug?.child_dose_bands && (
          <div className="mb-4">
            <ChildDoseBands drug={drug} />
          </div>
        )}

        {/* Timer Display for timed steps */}
        {currentStep.type === 'timer_block' && currentStep.duration_seconds && (
          <TimerDisplay 
            seconds={currentStep.duration_seconds} 
            onComplete={handleNext}
          />
        )}

        {/* Confirmation Dialog */}
        {confirmationRequired && currentStep.require_confirm && (
          <div className="cs-card cs-step-card p-4 mb-4" style={{ ['--step-accent' as string]: 'var(--green)' } as CSSProperties}>
            <p className="cs-eyebrow mb-3 flex items-center gap-2" style={{ color: 'var(--green)' }}>
              <CheckCheck className="w-4 h-4" /> Confirm when completed
            </p>
            <button
              onClick={handleConfirm}
              className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
              style={{ background: 'var(--green)', color: 'var(--text-on-light)', boxShadow: 'var(--glow-green)' }}
            >
              <Check className="w-5 h-5" />
              CONFIRM DONE
            </button>
          </div>
        )}
      </main>

      {/* Navigation Footer — secondary Back/Repeat row above a full-width hero Next */}
      <footer className="px-4 pb-3 safe-area-bottom">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="py-3.5 rounded-2xl flex items-center justify-center gap-1 active:opacity-80 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', minHeight: 'var(--touch-min)' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Back</span>
          </button>
          <button
            onClick={handleRepeat}
            className="py-3.5 rounded-2xl flex items-center justify-center gap-1 active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', minHeight: 'var(--touch-min)' }}
          >
            <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Repeat</span>
          </button>
        </div>
        <button
          onClick={handleNext}
          disabled={currentStep.type === 'decision' && !selectedAnswer}
          className="w-full rounded-2xl flex items-center justify-center gap-1.5 font-bold active:opacity-90 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--green)', color: 'var(--text-on-light)', minHeight: 'var(--touch-hero)', boxShadow: 'var(--glow-green)' }}
        >
          <span className="text-base">Next step</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>

      {/* Drug Card Modal */}
      {showDrugCard && drug && (
        <DrugCard drug={drug} onClose={() => setShowDrugCard(false)} />
      )}
    </div>
  );
}

// Timer Display Component
function TimerDisplay({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const { formattedTime, isRunning, start, pause } = useTimer({
    initialSeconds: seconds,
    onComplete,
    autoStart: true
  });

  return (
    <div className="cs-card cs-step-card p-5 mb-4 text-center" style={{ ['--step-accent' as string]: 'var(--timed)' } as CSSProperties}>
      <p className="cs-eyebrow mb-2 flex items-center justify-center gap-1.5" style={{ color: 'var(--timed)' }}>
        <Timer className="w-3.5 h-3.5" /> Reassess Timer
      </p>
      <p className="cs-numeric text-[64px] leading-none font-bold" style={{ color: 'var(--timed)' }}>{formattedTime}</p>
      <div className="mt-3">
        <button
          onClick={isRunning ? pause : start}
          className="px-6 py-2 rounded-xl text-sm font-medium active:opacity-80 transition-opacity"
          style={{ background: 'var(--timed-tint)', border: '1px solid color-mix(in srgb, var(--timed) 30%, transparent)', color: 'var(--timed)', minHeight: 'var(--touch-min)' }}
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  );
}

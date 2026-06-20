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
  Timer,
  Pill,
  Users,
  AlertTriangle,
  Mic,
  CircleDot
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useSpeech, useVoiceCommands } from '../hooks/useSpeech';
import { useTimer } from '../hooks/useTimer';
import { getDrugById } from '../data/drugs';
import { DrugCard } from './DrugCard';
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

  // Voice command handler
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
  }, [confirmationRequired, currentStep, prevStep, speak, toggleMute]);

  const { isListening, startListening, stopListening } = useVoiceCommands(handleVoiceCommand);

  const handleNext = () => {
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
  };

  const handleConfirm = () => {
    if (currentStep?.type === 'drug' && currentStep.drug_id) {
      addEventLog('drug_given', `Drug: ${currentStep.drug_id}`);
    }
    setConfirmationRequired(false);
    handleNext();
  };

  const handleCall999 = () => {
    addEventLog('999_called', '999 called');
    window.location.href = 'tel:999';
  };

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
  const progress = ((currentStepIndex + 1) / activeProtocol.steps.length) * 100;
  const totalSteps = activeProtocol.steps.length;

  // Step type styling
  const stepTypeConfig = {
    drug: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'DRUG', icon: Pill, color: 'text-purple-400' },
    decision: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'DECISION', icon: AlertTriangle, color: 'text-amber-400' },
    role_assignment: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'ROLES', icon: Users, color: 'text-blue-400' },
    timer_block: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'TIMED', icon: Timer, color: 'text-cyan-400' },
  };
  const stepConfig = stepTypeConfig[currentStep.type as keyof typeof stepTypeConfig];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col safe-area-top">
      {/* Header */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={endEmergency}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center active:bg-zinc-800"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-tight">{activeProtocol.title}</h1>
            <p className="text-[10px] text-zinc-500 font-medium">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isMuted ? 'bg-red-500/20 border border-red-500/30' : 'bg-zinc-900 border border-zinc-800'
            } active:opacity-80`}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
          </button>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isListening ? 'bg-green-500/20 border border-green-500/40 animate-pulse' : 'bg-zinc-900 border border-zinc-800'
            } active:opacity-80`}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-green-400' : 'text-zinc-400'}`} />
          </button>
        </div>
      </header>

      {/* Progress Bar — segmented */}
      <div className="px-4 pb-2 flex gap-0.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
              i < currentStepIndex ? 'bg-green-500' : i === currentStepIndex ? 'bg-white' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Call 999 Strip */}
      <div className="mx-4 mb-2">
        <a
          href="tel:999"
          onClick={() => { addEventLog('999_called', '999 called'); }}
          className="flex items-center justify-center gap-2 bg-red-600/15 border border-red-500/25 rounded-xl py-2.5 px-4 active:bg-red-600/25 transition-colors"
        >
          <Phone className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-red-400">CALL 999</span>
          {practiceSetup?.postcode && (
            <span className="text-xs text-red-400/60 ml-1">· {practiceSetup.postcode}</span>
          )}
        </a>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 overflow-y-auto pb-4">
        {/* Step Type Badge */}
        {stepConfig && (
          <div className={`inline-flex items-center gap-1.5 ${stepConfig.bg} border ${stepConfig.border} rounded-lg px-2.5 py-1 mb-3`}>
            <stepConfig.icon className={`w-3 h-3 ${stepConfig.color}`} />
            <span className={`text-[10px] font-bold tracking-wider ${stepConfig.color}`}>{stepConfig.label}</span>
          </div>
        )}

        {/* Step Content Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
          <p className="text-[17px] font-semibold leading-relaxed whitespace-pre-line text-zinc-100">
            {currentStep.show}
          </p>
        </div>

        {/* Role Assignments */}
        {currentStep.roles && currentStep.roles.length > 0 && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-4">
            <h3 className="font-bold mb-2.5 text-blue-400 text-xs tracking-wider uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Assign Roles
            </h3>
            <div className="space-y-2">
              {currentStep.roles.map((role, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm">
                  <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2.5 py-1 rounded-lg text-xs font-bold">{role.role}</span>
                  <span className="text-zinc-300">{role.task}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Options */}
        {currentStep.type === 'decision' && currentStep.answers && (
          <div className="space-y-2 mb-4">
            {currentStep.answers.map((answer, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAnswer(answer.label)}
                className={`w-full p-4 rounded-2xl text-left transition-all border ${
                  selectedAnswer === answer.label
                    ? 'bg-green-500/15 border-green-500/40 ring-1 ring-green-500/20'
                    : 'bg-zinc-900 border-zinc-800 active:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswer === answer.label ? 'border-green-500 bg-green-500' : 'border-zinc-600'
                  }`}>
                    {selectedAnswer === answer.label && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-medium text-[15px]">{answer.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Drug Card Button */}
        {currentStep.type === 'drug' && drug && (
          <button
            onClick={() => setShowDrugCard(true)}
            className="w-full bg-purple-500/10 border border-purple-500/25 rounded-2xl p-4 mb-4 text-left active:bg-purple-500/15 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-purple-300">{drug.name}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{drug.adult_dose_text}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Pill className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-[11px] mt-2 text-purple-400/60 font-medium">Tap for full drug card →</p>
          </button>
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
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4">
            <p className="font-bold text-amber-400 text-sm mb-3 flex items-center gap-2">
              <CircleDot className="w-4 h-4" /> Confirm when completed
            </p>
            <button
              onClick={handleConfirm}
              className="w-full bg-green-600 active:bg-green-700 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-colors"
            >
              <Check className="w-5 h-5" />
              CONFIRM DONE
            </button>
          </div>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="px-4 pb-3 safe-area-bottom">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="bg-zinc-900 border border-zinc-800 disabled:opacity-30 py-4 rounded-2xl flex items-center justify-center gap-1 active:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-400 font-medium">Back</span>
          </button>
          <button
            onClick={handleRepeat}
            className="bg-zinc-900 border border-zinc-800 py-4 rounded-2xl flex items-center justify-center gap-1 active:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400 font-medium">Repeat</span>
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep.type === 'decision' && !selectedAnswer}
            className="bg-green-600 disabled:opacity-30 py-4 rounded-2xl flex items-center justify-center gap-1 font-bold active:bg-green-700 shadow-lg shadow-green-600/20 transition-colors"
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
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
    <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-2xl p-5 mb-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/70 mb-2">⏱ Reassess Timer</p>
      <p className="text-5xl font-mono font-bold text-cyan-300">{formattedTime}</p>
      <div className="mt-3">
        <button
          onClick={isRunning ? pause : start}
          className="bg-cyan-500/20 border border-cyan-500/30 px-6 py-2 rounded-xl text-sm font-medium text-cyan-300 active:bg-cyan-500/30"
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  );
}

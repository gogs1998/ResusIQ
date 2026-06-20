import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { triageQuestions, protocols } from '../data/protocols';

export function TriageWizard() {
  const { 
    setScreen, 
    startEmergency, 
    triageAnswers, 
    setTriageAnswer, 
    clearTriageAnswers
  } = useAppStore();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const essentialQuestions = triageQuestions.filter(q => q.type === 'boolean');
  const currentQuestion = essentialQuestions[currentQuestionIndex];

  const handleAnswer = (answer: boolean) => {
    setTriageAnswer(currentQuestion.id, answer);
    
    // Check for immediate routing
    if (currentQuestion.id === 'conscious' && !answer) {
      // Not conscious - check breathing
      const breathingAnswered = triageAnswers['breathing_normally'];
      if (breathingAnswered === false) {
        // Unconscious and not breathing - cardiac arrest
        startEmergency('cardiac_arrest');
        return;
      }
    }

    if (currentQuestionIndex < essentialQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const determineProtocol = (): string => {
    const answers = triageAnswers;

    // Check for unconscious + not breathing first
    if (answers['conscious'] === false && answers['breathing_normally'] === false) {
      return 'cardiac_arrest';
    }

    // Check for choking
    if (answers['choking'] === true) {
      return 'choking';
    }

    // Check for anaphylaxis signs
    if (answers['rash_swelling_wheeze'] === true) {
      return 'anaphylaxis';
    }

    // Check for stroke
    if (answers['stroke_symptoms'] === true) {
      return 'stroke';
    }

    // Check for seizure
    if (answers['seizure'] === true) {
      return 'seizure';
    }

    // Check for chest pain
    if (answers['chest_pain'] === true) {
      return 'chest_pain';
    }

    // Check for breathing problems (asthma)
    if (answers['wheeze'] === true) {
      return 'asthma';
    }

    // Unconscious but breathing - could be hypo or syncope
    if (answers['conscious'] === false && answers['breathing_normally'] === true) {
      return 'syncope';
    }

    // Default to syncope for unexplained collapse
    return 'syncope';
  };

  const getRecommendedProtocol = () => {
    const protocolId = determineProtocol();
    return protocols.find(p => p.id === protocolId);
  };

  const handleStartProtocol = () => {
    const protocolId = determineProtocol();
    clearTriageAnswers();
    startEmergency(protocolId);
  };

  const handleBack = () => {
    if (showResult) {
      setShowResult(false);
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      clearTriageAnswers();
      setScreen('home');
    }
  };

  if (showResult) {
    const recommendedProtocol = getRecommendedProtocol();
    
    return (
      <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
          <button
            onClick={handleBack}
            aria-label="Back"
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Triage Result</h1>
        </header>

        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="cs-card p-6 w-full max-w-md text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--decision)' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>Recommended Protocol</h2>
            <div
              className="relative overflow-hidden rounded-xl p-4 mb-6"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', ['--accent' as string]: recommendedProtocol?.color || 'var(--text-3)' } as CSSProperties}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 85% -10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%)' }} />
              <p className="relative text-3xl font-bold" style={{ color: 'var(--text-1)' }}>{recommendedProtocol?.title}</p>
            </div>

            <button
              onClick={handleStartProtocol}
              className="w-full p-4 rounded-xl font-bold text-xl flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
              style={{ background: 'var(--green)', color: 'var(--text-on-light)', minHeight: 'var(--touch-comfort)', boxShadow: 'var(--glow-green)' }}
            >
              START PROTOCOL
              <ChevronRight className="w-6 h-6" />
            </button>

            <button
              onClick={() => setScreen('emergency')}
              className="w-full mt-3 p-3 rounded-xl text-sm active:opacity-80 transition-opacity"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
            >
              Choose different protocol
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
        <button
          onClick={handleBack}
          aria-label="Back"
          className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Quick Triage</h1>
          <p className="cs-eyebrow mt-0.5">
            Question {currentQuestionIndex + 1} of {essentialQuestions.length}
          </p>
        </div>
      </header>

      {/* Progress */}
      <div className="h-2" style={{ background: 'var(--surface-3)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / essentialQuestions.length) * 100}%`, background: 'var(--brand)' }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <p className="cs-instruction text-center mb-8">
            {currentQuestion?.text}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer(true)}
              className="p-8 rounded-2xl flex flex-col items-center gap-2 active:opacity-90 transition-opacity"
              style={{ background: 'var(--green)', color: 'var(--text-on-light)' }}
            >
              <Check className="w-12 h-12" />
              <span className="text-2xl font-bold">YES</span>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="p-8 rounded-2xl flex flex-col items-center gap-2 active:opacity-90 transition-opacity"
              style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)' }}
            >
              <X className="w-12 h-12" />
              <span className="text-2xl font-bold">NO</span>
            </button>
          </div>
        </div>
      </main>

      {/* Emergency shortcut */}
      <footer className="p-4 safe-area-bottom" style={{ background: 'var(--red-tint)' }}>
        <p className="text-center text-sm mb-2" style={{ color: 'var(--red)' }}>
          If in doubt, go directly to:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => startEmergency('cardiac_arrest')}
            className="p-3 rounded-lg text-sm font-bold active:opacity-90 transition-opacity"
            style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', minHeight: 'var(--touch-min)' }}
          >
            CARDIAC ARREST
          </button>
          <button
            onClick={() => {
              window.location.href = 'tel:999';
            }}
            className="p-3 rounded-lg text-sm font-bold active:opacity-90 transition-opacity"
            style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', minHeight: 'var(--touch-min)' }}
          >
            CALL 999
          </button>
        </div>
      </footer>
    </div>
  );
}

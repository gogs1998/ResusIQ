import { useState } from 'react';
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
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gray-800 p-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Triage Result</h1>
        </header>

        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
            <h2 className="text-2xl font-bold mb-2">Recommended Protocol</h2>
            <div 
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: recommendedProtocol?.color || '#374151' }}
            >
              <p className="text-3xl font-bold">{recommendedProtocol?.title}</p>
            </div>
            
            <button
              onClick={handleStartProtocol}
              className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold text-xl flex items-center justify-center gap-2"
            >
              START PROTOCOL
              <ChevronRight className="w-6 h-6" />
            </button>

            <button
              onClick={() => setScreen('emergency')}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-600 p-3 rounded-xl text-sm"
            >
              Choose different protocol
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Quick Triage</h1>
          <p className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {essentialQuestions.length}
          </p>
        </div>
      </header>

      {/* Progress */}
      <div className="h-2 bg-gray-700">
        <div 
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / essentialQuestions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <p className="text-2xl font-bold text-center mb-8">
            {currentQuestion?.text}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleAnswer(true)}
              className="bg-green-600 hover:bg-green-700 p-8 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
            >
              <Check className="w-12 h-12" />
              <span className="text-2xl font-bold">YES</span>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="bg-red-600 hover:bg-red-700 p-8 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"
            >
              <X className="w-12 h-12" />
              <span className="text-2xl font-bold">NO</span>
            </button>
          </div>
        </div>
      </main>

      {/* Emergency shortcut */}
      <footer className="bg-red-900/50 p-4">
        <p className="text-center text-sm text-red-300 mb-2">
          If in doubt, go directly to:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => startEmergency('cardiac_arrest')}
            className="bg-red-600 hover:bg-red-700 p-3 rounded-lg text-sm font-bold"
          >
            CARDIAC ARREST
          </button>
          <button
            onClick={() => {
              window.location.href = 'tel:999';
            }}
            className="bg-red-600 hover:bg-red-700 p-3 rounded-lg text-sm font-bold"
          >
            CALL 999
          </button>
        </div>
      </footer>
    </div>
  );
}

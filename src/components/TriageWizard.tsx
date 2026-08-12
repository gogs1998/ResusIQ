import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Check,
  X,
  Phone,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { triageQuestions, protocols } from '../data/protocols';
import { EscapeRail } from './console/EscapeRail';

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

    if (currentQuestion.id === 'conscious' && !answer) {
      const breathingAnswered = triageAnswers['breathing_normally'];
      if (breathingAnswered === false) {
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

    if (answers['conscious'] === false && answers['breathing_normally'] === false) {
      return 'cardiac_arrest';
    }
    if (answers['choking'] === true) {
      return 'choking';
    }
    if (answers['rash_swelling_wheeze'] === true) {
      return 'anaphylaxis';
    }
    if (answers['stroke_symptoms'] === true) {
      return 'stroke';
    }
    if (answers['seizure'] === true) {
      return 'seizure';
    }
    if (answers['chest_pain'] === true) {
      return 'chest_pain';
    }
    if (answers['wheeze'] === true) {
      return 'asthma';
    }
    if (answers['conscious'] === false && answers['breathing_normally'] === true) {
      return 'syncope';
    }
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
      <div className="riq-screen theatre safe-area-top">
        <header className="flex items-center" style={{ gap: 4, padding: '4px 8px' }}>
          <button onClick={handleBack} aria-label="Back" className="riq-icon-btn">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold" style={{ fontSize: 16 }}>Guided help</h1>
        </header>

        <main className="flex-1 flex flex-col justify-center" style={{ padding: '8px 20px 24px' }}>
          <p className="riq-kicker" style={{ marginBottom: 12 }}>Based on your answers</p>
          <h2 className="font-extrabold" style={{ fontSize: 'var(--fs-step)', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
            Start the {recommendedProtocol?.title} guide.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-2)', marginTop: 14, lineHeight: 1.4 }}>
            If that doesn’t match what you’re seeing, you can pick a different emergency instead.
          </p>

          <button onClick={handleStartProtocol} className="riq-hero" style={{ marginTop: 28 }}>
            Start guide
            <ChevronRight className="w-6 h-6" />
          </button>
          <button
            onClick={() => setScreen('emergency')}
            className="w-full active:opacity-70 transition-opacity"
            style={{
              marginTop: 10,
              minHeight: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Choose a different emergency
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="riq-screen theatre safe-area-top">
      <header className="flex items-center" style={{ gap: 4, padding: '4px 8px' }}>
        <button onClick={handleBack} aria-label="Back" className="riq-icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <CircleHelp className="w-5 h-5" style={{ color: 'var(--warn)' }} />
          <div>
            <h1 className="font-bold" style={{ fontSize: 16, lineHeight: 1.1 }}>Guided help</h1>
            <p className="riq-data" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
              {currentQuestionIndex + 1} / {essentialQuestions.length}
            </p>
          </div>
        </div>
      </header>

      <div style={{ height: 3, margin: '0 16px', borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / essentialQuestions.length) * 100}%`, background: 'var(--brand)' }}
        />
      </div>

      <main className="flex-1 flex flex-col justify-center" style={{ padding: '12px 20px 16px' }}>
        <h2 className="font-extrabold" style={{ fontSize: 'var(--fs-step)', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 28, textWrap: 'balance' }}>
          {currentQuestion?.text}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => handleAnswer(true)}
            className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
            style={{
              gap: 14,
              minHeight: 72,
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-1)',
              border: '2px solid var(--border-strong)',
            }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-3)' }}>
              <Check className="w-6 h-6" style={{ color: 'var(--text-1)' }} />
            </span>
            <span className="font-bold" style={{ fontSize: 20 }}>Yes</span>
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
            style={{
              gap: 14,
              minHeight: 72,
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-1)',
              border: '2px solid var(--border-strong)',
            }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-3)' }}>
              <X className="w-6 h-6" style={{ color: 'var(--text-1)' }} />
            </span>
            <span className="font-bold" style={{ fontSize: 20 }}>No</span>
          </button>
        </div>
      </main>

      <footer className="safe-area-bottom" style={{ padding: '12px 16px 16px' }}>
        <p className="text-center" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
          If in doubt, go straight to
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <EscapeRail />
          <a
            href="tel:999"
            className="flex items-center justify-center gap-1.5 font-extrabold active:scale-[0.98] transition-transform"
            style={{
              minHeight: 56,
              borderRadius: 'var(--radius-md)',
              background: 'var(--red)',
              color: '#fff',
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-999)',
            }}
          >
            <Phone className="w-4 h-4" /> Call 999
          </a>
        </div>
      </footer>
    </div>
  );
}

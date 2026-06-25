import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Check,
  X,
  Phone,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store/appStore';
import { triageQuestions, protocols } from '../data/protocols';

const backBtn: CSSProperties = {
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
        <header className="flex items-center" style={{ gap: 8, padding: '8px 12px' }}>
          <button onClick={handleBack} aria-label="Back" style={backBtn}>
            <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
          </button>
          <h1 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>Guided help</h1>
        </header>

        <main className="flex-1 flex flex-col justify-center" style={{ padding: '8px 24px 24px' }}>
          <p className="font-bold" style={{ fontSize: 'var(--fs-label)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--teal-700)', marginBottom: 12 }}>
            Based on your answers
          </p>
          <h2 className="font-semibold" style={{ fontSize: 'var(--fs-step)', lineHeight: 'var(--lh-snug)', letterSpacing: 'var(--ls-tight)', color: 'var(--ink-900)' }}>
            Start the {recommendedProtocol?.title} guide.
          </h2>
          <p style={{ fontSize: 'var(--fs-lead)', color: 'var(--ink-600)', marginTop: 16, lineHeight: 'var(--lh-relaxed)' }}>
            If that doesn’t match what you’re seeing, you can pick a different emergency instead.
          </p>

          <button
            onClick={handleStartProtocol}
            className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{ gap: 12, marginTop: 32, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 'var(--fs-subtitle)', boxShadow: 'var(--shadow-btn)', border: 'none' }}
          >
            Start guide
            <ChevronRight className="w-6 h-6" />
          </button>
          <button
            onClick={() => setScreen('emergency')}
            className="w-full active:opacity-70 transition-opacity"
            style={{ marginTop: 12, minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-2)', fontWeight: 600, fontSize: 'var(--fs-body-sm)', border: 'none' }}
          >
            Choose a different emergency
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-center" style={{ gap: 8, padding: '8px 12px' }}>
        <button onClick={handleBack} aria-label="Back" style={backBtn}>
          <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
        </button>
        <div className="flex items-center gap-2">
          <CircleHelp className="w-5 h-5" style={{ color: 'var(--amber-700)' }} />
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)', lineHeight: 1.1 }}>Guided help</h1>
            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', marginTop: 2 }}>
              Question {currentQuestionIndex + 1} of {essentialQuestions.length}
            </p>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div style={{ height: 6, margin: '0 24px', borderRadius: 'var(--radius-pill)', background: 'var(--ink-100)', overflow: 'hidden' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / essentialQuestions.length) * 100}%`, background: 'var(--brand)' }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 flex flex-col justify-center" style={{ padding: '8px 24px 16px' }}>
        <h2 className="font-semibold" style={{ fontSize: 'var(--fs-step)', lineHeight: 'var(--lh-snug)', letterSpacing: 'var(--ls-tight)', color: 'var(--ink-900)', marginBottom: 32 }}>
          {currentQuestion?.text}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={() => handleAnswer(true)}
            className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
            style={{ gap: 18, minHeight: 'var(--touch-comfort)', padding: '18px 22px', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', border: '2px solid var(--green-600)', boxShadow: 'var(--shadow-sm)' }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--green-100)' }}>
              <Check className="w-6 h-6" style={{ color: 'var(--green-700)' }} />
            </span>
            <span className="font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)' }}>Yes</span>
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
            style={{ gap: 18, minHeight: 'var(--touch-comfort)', padding: '18px 22px', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', border: '2px solid var(--red-600)', boxShadow: 'var(--shadow-sm)' }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--red-100)' }}>
              <X className="w-6 h-6" style={{ color: 'var(--red-700)' }} />
            </span>
            <span className="font-bold" style={{ fontSize: 'var(--fs-lead)', color: 'var(--text-1)' }}>No</span>
          </button>
        </div>
      </main>

      {/* Emergency shortcut */}
      <footer className="safe-area-bottom" style={{ padding: '12px 24px 24px' }}>
        <p className="text-center" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)', marginBottom: 10 }}>
          If in doubt, go straight to
        </p>
        <div className="grid grid-cols-2" style={{ gap: 10 }}>
          <button
            onClick={() => startEmergency('cardiac_arrest')}
            className="font-bold active:scale-[0.98] transition-transform"
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1.5px solid var(--red-200)', color: 'var(--red-700)', fontSize: 'var(--fs-body-sm)' }}
          >
            Cardiac arrest
          </button>
          <a
            href="tel:999"
            className="flex items-center justify-center gap-1.5 font-bold active:scale-[0.98] transition-transform"
            style={{ minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-lg)', background: 'var(--red)', color: '#fff', fontSize: 'var(--fs-body-sm)', textDecoration: 'none', boxShadow: 'var(--shadow-999)' }}
          >
            <Phone className="w-4 h-4" /> Call 999
          </a>
        </div>
      </footer>
    </div>
  );
}

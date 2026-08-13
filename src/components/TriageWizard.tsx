import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  X,
  Phone,
  HeartPulse,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store/appStore';
import { triageQuestions, protocols } from '../data/protocols';
import { shouldFastPathToArrest } from '../lib/triage';
import { EscapeRail } from './console/EscapeRail';

const backBtn: CSSProperties = {
  width: 44,
  height: 44,
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
    // Evaluate the fast-path against the answers INCLUDING this one. `answer`
    // is merged locally rather than read back from the store: setTriageAnswer
    // does not mutate the `triageAnswers` captured by this closure, so a check
    // against store state would always miss the answer that just triggered it.
    const answersWithThis = { ...triageAnswers, [currentQuestion.id]: answer };
    setTriageAnswer(currentQuestion.id, answer);

    // Unresponsive + not breathing: start CPR now, on whichever of the two is
    // answered second. Every remaining question is time the patient does not
    // have. Lands on start_cpr — this path IS the arrest recognition, so the
    // protocol must not ask it again.
    if (shouldFastPathToArrest(answersWithThis)) {
      clearTriageAnswers();
      startEmergency('cardiac_arrest', 'triage', { landOn: 'start_cpr' });
      return;
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

  // The "If in doubt" panel — the pre-emergency safety exits, shared by both the
  // question and result screens. CARDIAC ARREST here deliberately keeps step-0
  // routing: "if in doubt" is the one entry that has NOT asserted arrest, so it
  // gets the check-response / check-breathing sequence. The EscapeRail above is
  // the opposite assertion ("unresponsive & not breathing") and lands on CPR.
  const inDoubtPanel = (
    <div style={{ padding: '12px 14px', borderRadius: 13, background: 'var(--red-tint-2)', border: '1.5px solid var(--red)' }}>
      <p className="font-bold" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red-strong)', opacity: 0.9, marginBottom: 10 }}>
        If in doubt, go straight to
      </p>
      <div className="grid grid-cols-2" style={{ gap: 10 }}>
        <button
          onClick={() => startEmergency('cardiac_arrest')}
          className="flex items-center justify-center active:scale-[0.98] transition-transform"
          style={{ gap: 8, minHeight: 52, borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', border: '1.5px solid var(--red)', color: 'var(--red-strong)', fontSize: 'var(--fs-body-sm)', fontWeight: 700 }}
        >
          <HeartPulse className="w-5 h-5" /> Cardiac arrest
        </button>
        <a
          href="tel:999"
          className="flex items-center justify-center active:scale-[0.98] transition-transform"
          style={{ gap: 8, minHeight: 52, borderRadius: 'var(--radius-md)', background: 'var(--red)', color: '#fff', fontSize: 'var(--fs-body-sm)', fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow-999)' }}
        >
          <Phone className="w-5 h-5" /> Call 999
        </a>
      </div>
    </div>
  );

  if (showResult) {
    const recommendedProtocol = getRecommendedProtocol();

    return (
      <div className="theatre flex flex-col safe-area-top" style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text-1)' }}>
        <header className="flex items-center" style={{ gap: 10, padding: '14px 16px 0', flexShrink: 0 }}>
          <button onClick={handleBack} aria-label="Back" style={backBtn}>
            <ArrowLeft className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
          </button>
          <h1 className="flex-1 min-w-0 font-extrabold truncate" style={{ fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', margin: 0 }}>
            Guided help
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col justify-center" style={{ padding: '16px 18px', minHeight: 0 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
            <span className="font-extrabold" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Based on your answers
            </span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.14, letterSpacing: '-0.02em', color: 'var(--text-1)', textWrap: 'balance', margin: 0 }}>
            Start the {recommendedProtocol?.title} guide.
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--text-2)', marginTop: 12, lineHeight: 1.45 }}>
            If that doesn’t match what you’re seeing, you can pick a different emergency instead.
          </p>

          <button
            onClick={handleStartProtocol}
            className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
            style={{ gap: 10, marginTop: 28, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: 'var(--brand)', color: '#fff', fontWeight: 800, fontSize: 'var(--fs-subtitle)', boxShadow: 'var(--shadow-btn)', border: 'none' }}
          >
            Start guide
            <ChevronRight className="w-6 h-6" />
          </button>
          <button
            onClick={() => setScreen('emergency')}
            className="w-full active:opacity-70 transition-opacity"
            style={{ marginTop: 10, minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, fontSize: 'var(--fs-body-sm)' }}
          >
            Choose a different emergency
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="theatre flex flex-col safe-area-top" style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header — back · title · progress */}
      <header style={{ padding: '14px 16px 0', flexShrink: 0 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <button onClick={handleBack} aria-label="Back" style={backBtn}>
            <ArrowLeft className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
          </button>
          <h1 className="flex-1 min-w-0 font-extrabold truncate" style={{ fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', margin: 0 }}>
            Guided help
          </h1>
        </div>

        <div className="flex items-center" style={{ gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-inset)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 'var(--radius-pill)', background: 'var(--brand)', width: `${((currentQuestionIndex + 1) / essentialQuestions.length) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
          <span className="riq-data flex-shrink-0" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }} aria-label={`Question ${currentQuestionIndex + 1} of ${essentialQuestions.length}`}>
            {currentQuestionIndex + 1} / {essentialQuestions.length}
          </span>
        </div>
      </header>

      {/* Question — the hero, with one-tap Yes / No answer cards */}
      <main className="flex-1 overflow-y-auto flex flex-col justify-center" style={{ padding: '16px 18px', minHeight: 0 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.16, letterSpacing: '-0.02em', color: 'var(--text-1)', textWrap: 'balance', margin: 0 }}>
          {currentQuestion?.text}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
          <button
            onClick={() => handleAnswer(true)}
            className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
            style={{ gap: 14, minHeight: 70, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--green-tint)' }}>
              <Check className="w-6 h-6" style={{ color: 'var(--green-bright)' }} />
            </span>
            <span className="font-bold" style={{ fontSize: 18.5, color: 'var(--text-1)' }}>Yes</span>
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
            style={{ gap: 14, minHeight: 70, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--red-tint)' }}>
              <X className="w-6 h-6" style={{ color: 'var(--red)' }} />
            </span>
            <span className="font-bold" style={{ fontSize: 18.5, color: 'var(--text-1)' }}>No</span>
          </button>
        </div>
      </main>

      {/* Footer — escape rail (the architectural guarantee) + if-in-doubt exits */}
      <footer className="safe-area-bottom" style={{ flexShrink: 0, padding: '10px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EscapeRail
          onEscape={() => {
            clearTriageAnswers();
            startEmergency('cardiac_arrest', 'triage', { landOn: 'start_cpr' });
          }}
        />
        {inDoubtPanel}
      </footer>
    </div>
  );
}

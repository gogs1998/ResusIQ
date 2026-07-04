import { useEffect, useCallback, useState, useRef } from 'react';
import {
  ArrowLeft,
  Phone,
  Volume2,
  VolumeX,
  Check,
  X,
  Timer,
  Users,
  ChevronRight,
  Mic,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useAppStore } from '../store/appStore';
import { voiceCommandsSupported } from '../lib/platform';
import { switchTargetId, switchButtonLabel, splitHero, isDuplicateSupport } from '../lib/stepCopy';
import { elapsedSeconds, formatClock } from '../lib/emergencyTimers';
import { useSpeech, useVoiceCommands } from '../hooks/useSpeech';
import { useTimer } from '../hooks/useTimer';
import { getDrugById } from '../data/drugs';
import { DrugCard } from './DrugCard';
import { ChildDoseBands } from './ChildDoseBands';
import { CPRMode } from './CPRMode';
import { TimerStrip } from './console/TimerStrip';
import { EscapeRail } from './console/EscapeRail';
import { Deck } from './console/Deck';

// Eyebrow per step type: a tracked caps label + a SEMANTIC dot colour (colour is
// the four-word language — red = drug/critical, amber = a decision to make,
// blue = timed/info, neutral = plain instruction/role).
const EYEBROW: Record<string, { label: string; dot: string }> = {
  instruction: { label: 'Action', dot: 'var(--text-2)' },
  drug: { label: 'Give medicine', dot: 'var(--red)' },
  decision: { label: 'Decision', dot: 'var(--warn)' },
  timer_block: { label: 'Reassess', dot: 'var(--brand)' },
  role_assignment: { label: 'Assign roles', dot: 'var(--text-2)' },
  call_emergency: { label: 'Call 999', dot: 'var(--red)' },
  handover: { label: 'Handover', dot: 'var(--text-2)' },
};

// Footer icon button (transparent, large tap target) — mute / hands-free.
const footBtn: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  flexShrink: 0,
};

export function ProtocolRunner() {
  const {
    activeProtocol,
    currentStepIndex,
    prevStep,
    goToStep,
    endEmergency,
    isMuted,
    toggleMute,
    addEventLog,
    runStepActions,
    activeEvent,
    practiceSetup,
  } = useAppStore();

  const { speak, isSpeaking } = useSpeech();
  const [showDrugCard, setShowDrugCard] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // 1s tick for the header elapsed clock (999 asks elapsed time first). Derived
  // from activeEvent.timestamp, same source the TimerStrip reads.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentStep = activeProtocol?.steps[currentStepIndex];

  // Speak each step once when it becomes current. Guard on the step id so a
  // change in `speak` identity alone — it is recreated on the `voiceschanged`
  // event as voices load — can't re-speak the same step (the first-step
  // double-speak). Muting resets the guard so a later unmute re-reads the step.
  const lastSpokenStepId = useRef<string | null>(null);
  useEffect(() => {
    if (isMuted) {
      lastSpokenStepId.current = null;
      return;
    }
    if (currentStep && lastSpokenStepId.current !== currentStep.id) {
      lastSpokenStepId.current = currentStep.id;
      speak(currentStep.say);
    }
  }, [currentStep, isMuted, speak]);

  // Linear progression for non-decision steps. Step `actions` fire HERE, on
  // completion (leaving the step) — not on render — so back-navigation can't
  // re-fire them and they run only after the user did the thing.
  const advance = useCallback(() => {
    if (!currentStep || !activeProtocol) return;
    // Log this step's completion exactly once. All navigation below goes through
    // goToStep, which does NOT log — advancing via any store helper that logs on
    // arrival would emit a SECOND 'step_completed' (for the destination step) on
    // the same advance.
    addEventLog('step_completed', currentStep.show.split('\n')[0]);
    runStepActions(currentStep);
    // A switch_protocol action has already moved us to the new protocol + step.
    if (switchTargetId(currentStep)) return;
    const byId = currentStep.next
      ? activeProtocol.steps.findIndex(s => s.id === currentStep.next)
      : -1;
    if (byId >= 0) goToStep(byId);
    else if (currentStepIndex < activeProtocol.steps.length - 1) goToStep(currentStepIndex + 1);
    // else: terminal step with no successor — nothing to advance to.
  }, [currentStep, activeProtocol, currentStepIndex, addEventLog, runStepActions, goToStep]);

  // Decision steps resolve in ONE tap: choosing an answer logs the choice, runs
  // any step actions, and jumps straight to that branch's target step. Navigation
  // is goToStep-only for the same single-log reason as advance().
  const chooseAnswer = useCallback((answer: { label: string; next: string }) => {
    if (currentStep) {
      addEventLog('step_completed', `${currentStep.show.split('\n')[0]} → ${answer.label}`);
      runStepActions(currentStep);
      // Defensive: no decision carries a switch today, but if one did the switch
      // owns navigation — don't also jump to answer.next.
      if (switchTargetId(currentStep)) return;
    }
    const byId = activeProtocol?.steps.findIndex(s => s.id === answer.next) ?? -1;
    if (byId >= 0) goToStep(byId);
    // answer.next always resolves (data-integrity test); no fallback jump.
  }, [currentStep, addEventLog, runStepActions, activeProtocol, goToStep]);

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
      // Voice can advance/confirm, but NEVER selects a decision answer: choosing
      // a clinical branch by voice stays a deliberate safety gate until native STT.
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
  // A step that hands off to another protocol on completion (e.g. start_cpr →
  // cardiac_arrest). Its footer button is labelled for the destination, and the
  // escape rail is suppressed on it (the primary action already goes to CPR).
  const switchTarget = switchTargetId(currentStep);

  // Step hierarchy: hero = the bare imperative, support = added detail. Support
  // that only echoes the hero (say≈show) is suppressed so one instruction shows.
  const { hero: rawHero, support: rawSupport } = splitHero(currentStep.show);
  const heroText = isDecision && currentStep.question ? currentStep.question : rawHero;
  const supportText = isDuplicateSupport(heroText, rawSupport) ? '' : rawSupport;
  const eyebrow = EYEBROW[currentStep.type] ?? EYEBROW.instruction;

  // Screen-reader announcement mirrors what sighted users see: the question on a
  // decision, otherwise the hero plus any visible (non-suppressed) support line.
  const announceText = isDecision && currentStep.question
    ? currentStep.question
    : supportText ? `${heroText}. ${supportText}` : heroText;

  const elapsed = activeEvent ? elapsedSeconds(activeEvent.timestamp, now) : 0;
  const progressPct = totalSteps > 1 ? Math.round((currentStepIndex / (totalSteps - 1)) * 100) : 100;

  // ONE dominant action per state: green = confirm a dose given, red = escalate
  // to CPR, blue = proceed. Decisions have no footer CTA (answers act).
  const primaryBg = switchTarget ? 'var(--red)' : currentStep.type === 'drug' ? 'var(--green)' : 'var(--brand)';
  const primaryLabel = switchTarget
    ? switchButtonLabel(switchTarget)
    : currentStep.require_confirm
      ? (currentStep.type === 'drug' ? 'Confirm given' : 'Confirm done')
      : 'Done — next step';

  return (
    <div className="theatre flex flex-col safe-area-top" style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* Header — back · protocol · elapsed clock, then progress + pinned timers */}
      <header style={{ padding: '14px 16px 0', flexShrink: 0 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            onClick={handleBack}
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none' }}
            aria-label={currentStepIndex === 0 ? 'End emergency' : 'Previous step'}
          >
            {currentStepIndex === 0 ? <X className="w-6 h-6" style={{ color: 'var(--text-3)' }} /> : <ArrowLeft className="w-6 h-6" style={{ color: 'var(--text-3)' }} />}
          </button>
          <h1 className="flex-1 min-w-0 font-extrabold truncate" style={{ fontSize: 12.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', margin: 0 }}>
            {activeProtocol.title}
          </h1>
          <div className="text-right flex-shrink-0">
            <div className="riq-data font-bold" style={{ fontSize: 15, color: 'var(--text-1)', lineHeight: 1 }}>{formatClock(elapsed)}</div>
            <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 2 }}>Elapsed</div>
          </div>
        </div>

        {/* Thin progress bar + step counter (replaces the segmented dashes) */}
        <div className="flex items-center" style={{ gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-inset)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 'var(--radius-pill)', background: 'var(--brand)', width: `${progressPct}%`, transition: 'width 0.3s ease' }} />
          </div>
          <span className="riq-data flex-shrink-0" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{currentStepIndex + 1} / {totalSteps}</span>
        </div>

        {/* Pinned timers — first-class. One tick source: the runner owns `now`
            and passes it so the header clock and strip never differ by a second. */}
        <div style={{ marginTop: 10 }}>
          <TimerStrip now={now} />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" style={{ padding: '16px 18px 8px', minHeight: 0 }}>
        {/* SR announcement — role="alert" is implicitly assertive (no role/aria-live
            contradiction); reads what sighted users see for this step. */}
        <div role="alert" className="sr-only">
          {`Step ${currentStepIndex + 1} of ${totalSteps}. ${announceText}`}
        </div>

        {/* Eyebrow: semantic dot + tracked label · reading-aloud indicator */}
        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: eyebrow.dot, flexShrink: 0 }} />
            <span className="font-extrabold truncate" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{eyebrow.label}</span>
          </div>
          <button
            onClick={handleRepeat}
            className="inline-flex items-center flex-shrink-0"
            style={{ gap: 6, background: 'transparent', border: 'none', padding: '4px 0', fontSize: 11, fontWeight: 600, color: isSpeaking ? 'var(--brand)' : 'var(--text-3)' }}
            aria-label="Read this step aloud again"
          >
            {isSpeaking ? (
              <span className="riq-eq" aria-hidden><span /><span /><span /><span /></span>
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            {isSpeaking ? 'Reading aloud' : 'Tap to hear'}
          </button>
        </div>

        {/* Hero — the one instruction */}
        <h2 className="whitespace-pre-line" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.14, letterSpacing: '-0.02em', color: 'var(--text-1)', textWrap: 'balance', margin: '12px 0 0' }}>
          {heroText}
        </h2>
        {supportText && (
          <p className="whitespace-pre-line" style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.45, marginTop: 8 }}>
            {supportText}
          </p>
        )}

        {/* Roles */}
        {currentStep.roles && currentStep.roles.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentStep.roles.map((role, idx) => (
              <div key={idx} className="flex items-center" style={{ gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <span className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--surface-3)' }}>
                  <Users className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
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
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentStep.answers.map((answer, idx) => {
              const isYes = /^yes/i.test(answer.label);
              const isNo = /^no/i.test(answer.label);
              const [mainLabel, ...subParts] = answer.label.split(' — ');
              const sub = subParts.join(' — ');
              const markBg = isYes ? 'var(--green-tint)' : isNo ? 'var(--red-tint)' : 'var(--brand-tint)';
              const markColor = isYes ? 'var(--green-bright)' : isNo ? 'var(--red)' : 'var(--brand)';
              return (
                <button
                  key={idx}
                  onClick={() => chooseAnswer(answer)}
                  className="w-full flex items-center text-left active:scale-[0.98] transition-transform"
                  style={{ gap: 14, minHeight: 70, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                >
                  <span className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: markBg }}>
                    {isYes ? <Check className="w-6 h-6" style={{ color: markColor }} /> : isNo ? <X className="w-6 h-6" style={{ color: markColor }} /> : <ChevronRight className="w-6 h-6" style={{ color: markColor }} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold" style={{ fontSize: 18.5, color: 'var(--text-1)', lineHeight: 1.15 }}>{mainLabel}</span>
                    {sub && <span className="block" style={{ fontSize: 13.5, color: 'var(--text-3)', marginTop: 2 }}>{sub}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Drug — dose panel (tap for the full card), amber warning strip */}
        {currentStep.type === 'drug' && drug && (
          <div style={{ marginTop: 18, borderRadius: 14, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border-strong)' }}>
            <button
              onClick={() => setShowDrugCard(true)}
              className="w-full text-left active:opacity-90 transition-opacity"
              style={{ display: 'block', padding: '14px 16px 12px', background: 'transparent', border: 'none' }}
            >
              <div className="flex items-baseline" style={{ gap: 8 }}>
                <span className="riq-data font-extrabold" style={{ fontSize: 29, color: 'var(--text-1)', lineHeight: 1 }}>{drug.adult_dose}</span>
                <span className="font-bold" style={{ fontSize: 15, color: 'var(--text-2)' }}>{drug.route}</span>
              </div>
              <div className="flex items-center" style={{ gap: 6, marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>
                <span className="truncate">{drug.site ?? drug.name}</span>
                <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>·</span>
                <span className="flex-shrink-0" style={{ color: 'var(--brand)', fontWeight: 600 }}>full card</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
              </div>
            </button>
            {drug.warnings.length > 0 && (
              <div className="flex" style={{ gap: 8, padding: '9px 16px', background: 'var(--warn-tint)', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.4 }}>
                <span aria-hidden style={{ flexShrink: 0 }}>⚠︎</span>
                <span>{drug.warnings[0]}</span>
              </div>
            )}
          </div>
        )}

        {currentStep.type === 'drug' && drug?.child_dose_bands && (
          <div style={{ marginTop: 12 }}>
            <ChildDoseBands drug={drug} />
          </div>
        )}

        {/* Timer */}
        {currentStep.type === 'timer_block' && currentStep.duration_seconds && (
          <div style={{ marginTop: 18 }}>
            <TimerDisplay seconds={currentStep.duration_seconds} onComplete={handleNext} />
          </div>
        )}
      </main>

      {/* Footer — one dominant CTA, persistent 999 + voice controls, escape rail, deck */}
      <footer style={{ flexShrink: 0 }}>
        <div style={{ padding: '10px 18px 12px' }}>
          {!isDecision && (
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
              style={{ gap: 10, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: primaryBg, color: '#fff', border: 'none', boxShadow: 'var(--shadow-btn)' }}
            >
              <Check className="w-6 h-6" />
              <span className="font-extrabold" style={{ fontSize: 'var(--fs-subtitle)' }}>{primaryLabel}</span>
            </button>
          )}

          {/* Persistent 999 (logs on tap, doesn't block the dial) + voice controls */}
          <div className="flex items-center" style={{ gap: 8, marginTop: isDecision ? 0 : 10 }}>
            <a
              href="tel:999"
              onClick={() => addEventLog('999_called', '999 called')}
              className="flex-1 flex items-center justify-center active:scale-[0.99] transition-transform"
              style={{ gap: 8, minHeight: 52, borderRadius: 'var(--radius-md)', background: 'var(--red-tint-2)', border: '1.5px solid var(--red)', textDecoration: 'none' }}
            >
              <Phone className="w-5 h-5" style={{ color: 'var(--red-strong)' }} />
              <span className="font-bold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--red-strong)' }}>Call 999</span>
              {practiceSetup?.postcode && (
                <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--red-strong)', opacity: 0.75 }}>· {practiceSetup.postcode}</span>
              )}
            </a>
            <button onClick={toggleMute} style={footBtn} aria-label={isMuted ? 'Unmute voice' : 'Mute voice'} aria-pressed={isMuted}>
              {isMuted ? <VolumeX className="w-5 h-5" style={{ color: 'var(--red)' }} /> : <Volume2 className="w-5 h-5" style={{ color: 'var(--text-2)' }} />}
            </button>
            {voiceCommandsSupported && (
              <button
                onClick={() => setHandsFree(h => !h)}
                style={footBtn}
                aria-label={handsFree ? 'Turn off hands-free voice' : 'Turn on hands-free voice'}
                aria-pressed={handsFree}
              >
                <Mic className="w-5 h-5" style={{ color: handsFree ? 'var(--brand)' : 'var(--text-3)' }} />
              </button>
            )}
          </div>

          {/* Escape rail — suppressed on a step whose action already switches to CPR */}
          {switchTarget !== 'cardiac_arrest' && (
            <div style={{ marginTop: 10 }}>
              <EscapeRail />
            </div>
          )}
        </div>

        {/* Deck — full-bleed at the very bottom, extends over the home indicator */}
        <div style={{ background: 'var(--surface-inset)', paddingBottom: 'var(--sab)' }}>
          <Deck />
        </div>
      </footer>

      {showDrugCard && drug && <DrugCard drug={drug} onClose={() => setShowDrugCard(false)} />}
    </div>
  );
}

function TimerDisplay({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const { formattedTime, isRunning, start, pause } = useTimer({ initialSeconds: seconds, onComplete, autoStart: true });
  return (
    <div className="text-center" style={{ padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <p className="font-bold" style={{ fontSize: 'var(--fs-label)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Timer className="w-4 h-4" /> Reassess timer
      </p>
      <p className="riq-data font-extrabold" style={{ fontSize: 'var(--fs-display)', lineHeight: 1, color: 'var(--text-1)', margin: '8px 0' }}>{formattedTime}</p>
      <button
        onClick={isRunning ? pause : start}
        style={{ minHeight: 48, padding: '0 24px', borderRadius: 'var(--radius-md)', background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border)', fontWeight: 600, fontSize: 'var(--fs-body-sm)' }}
      >
        {isRunning ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}

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
import { useAppStore, countDosesGiven } from '../store/appStore';
import {
  doseLimitClass,
  isAtDoseLimit,
  lastDoseTimestamp,
  DOSE_LIMIT_NOTICES,
} from '../lib/doseLimits';
import { voiceCommandsSupported } from '../lib/platform';
import { switchTargetId, switchButtonLabel, splitHero, isDuplicateSupport } from '../lib/stepCopy';
import {
  requires999Confirm,
  CALL_999_CONFIRMED_LABEL,
  CALL_999_NOT_YET_LABEL,
} from '../lib/call999';
import { elapsedSeconds, formatClock, hhmm } from '../lib/emergencyTimers';
import {
  isMonotonicTimerStep,
  timerAnchorKey,
  monotonicClockRemaining,
  spentClockSuppression,
} from '../lib/monotonicTimers';
import { useSpeech, useVoiceCommands } from '../hooks/useSpeech';
import { useTimer } from '../hooks/useTimer';
import { getDrugById } from '../data/drugs';
import { DrugCard } from './DrugCard';
import { ChildDoseBands } from './ChildDoseBands';
import { CPRMode } from './CPRMode';
import {
  EndConfirmBar,
  END_CONFIRM_BODY_RUNNER,
  END_CONFIRM_ATTR,
} from './console/EndConfirmBar';
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
    logDrugGiven,
    log999Called,
    runStepActions,
    timerAnchors,
    anchorTimer,
    activeEvent,
    practiceSetup,
  } = useAppStore();

  const { speak, isSpeaking } = useSpeech();
  const [showDrugCard, setShowDrugCard] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  // The end confirmation, held as the POSITION it was opened on rather than a
  // bare flag. Only a tap used to dismiss it, so a voice "next" or a timer
  // auto-advance carried the bar onto later steps — hiding the protocol title
  // and the elapsed clock behind an "End emergency" button on a step that never
  // asked for one. A key that stops matching needs no effect to clear it: the
  // step moves, and the confirmation is simply no longer for this screen.
  const [confirmingEndAt, setConfirmingEndAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // 1s tick for the header elapsed clock (999 asks elapsed time first). Derived
  // from activeEvent.timestamp, same source the TimerStrip reads.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentStep = activeProtocol?.steps[currentStepIndex];

  // Dose limit for this step, derived from the event log on every render rather
  // than held in component state — so returning to a spent drug step by Back
  // shows the same verdict the store would give, instead of a fresh-looking
  // Confirm button.
  //
  // Two outcomes, because `max_doses` means two different things (see
  // doseLimitClass): a hard block withdraws the confirm control, an escalation
  // keeps it live and says the treatment is not working.
  const drug = currentStep?.drug_id ? getDrugById(currentStep.drug_id) : null;
  const dosesGiven = countDosesGiven(activeEvent, currentStep?.drug_id);
  const atDoseLimit = drug ? isAtDoseLimit(drug, dosesGiven) : false;
  const limitClass = drug ? doseLimitClass(drug) : null;
  const hardBlocked = atDoseLimit && limitClass === 'hard_block';
  const escalated = atDoseLimit && limitClass === 'escalation';

  // A step whose whole instruction is "call 999" asks, in the footer, whether
  // the call actually happened — instead of a generic Done that used to log the
  // call for them (clinical ruling R2, 2026-08-13; see lib/call999).
  const needs999Confirm = requires999Confirm(activeProtocol?.id, currentStep?.id);

  // The seizure clock. A timer_block that measures ONE elapsing thing rather
  // than an interval reads its remaining time from an anchor fixed at first
  // arrival, so the protocol's timing loop can never hand the team another five
  // minutes (F9, clinical ruling R4 — see lib/monotonicTimers).
  const isMonotonicTimer =
    currentStep?.type === 'timer_block' &&
    isMonotonicTimerStep(activeProtocol?.id, currentStep.id);
  const anchorKey =
    isMonotonicTimer && activeProtocol && currentStep
      ? timerAnchorKey(activeProtocol.id, currentStep.id)
      : null;
  const timerAnchor = anchorKey ? timerAnchors[anchorKey] : undefined;

  // Anchor on arrival. Idempotent in the store, so re-entering the step through
  // the loop records nothing new and the original start time stands.
  useEffect(() => {
    if (anchorKey) anchorTimer(anchorKey);
  }, [anchorKey, anchorTimer]);

  // ONE reading of the clock, shared by everything that acts on it: the display,
  // the backstop route, and the answer suppression below. They cannot disagree
  // about whether five minutes have passed because there is nothing to disagree
  // with.
  const clockRemaining = monotonicClockRemaining(activeProtocol, timerAnchors, now);

  // Before the anchor exists (the very first render of a first arrival) the full
  // duration is the correct answer — that arrival IS the start.
  const monotonicRemaining =
    isMonotonicTimer && currentStep?.duration_seconds
      ? clockRemaining ?? currentStep.duration_seconds
      : null;

  // With the clock spent, the answer that contradicts it is withdrawn and a
  // statement of the measurement takes its place (clinical ruling R4 follow-up;
  // see lib/monotonicTimers for why this answer and not the bounce).
  const suppression = clockRemaining === 0
    ? spentClockSuppression(activeProtocol?.id, currentStep?.id)
    : null;

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

  // ONE gesture at a time.
  //
  // Every advancing path — the hero CTA, a decision answer, a drug confirm, and
  // the reassess timer completing — logs to the medico-legal record and moves
  // the step. Two of them landing in the same frame logs the event twice and
  // skips a step, because React has not re-rendered with the new step in
  // between: a gloved double-tap on "Confirm given" recorded two IM doses, and a
  // manual Done racing the timer's auto-advance skipped past the next
  // instruction entirely. (The timer is the sharper edge: useTimer fires
  // onComplete from inside a setState updater, which React may invoke more than
  // once for a single expiry.)
  //
  // The barrier is a ref holding the position a gesture fired from. It cannot be
  // state: a second tap in the same frame would still read the old value, since
  // state updates are async — which is the very race being closed.
  //
  // Position, not a boolean. The key carries the protocol as well as the index
  // because the anaphylaxis → cardiac_arrest handoff moves between two different
  // steps that share the id 'start_cpr'.
  //
  // It is RELEASED on every position change, and that release is the whole
  // correctness argument. The original version left the ref holding the key it
  // fired from and reasoned that a key never recurs — which is false the moment
  // anyone taps Back. Returning to a step a gesture already fired from matched
  // the stale key, so every later tap on that step was swallowed: silently, for
  // good, with no visible state to explain it. Back onto a spent midazolam step
  // and "Next step" simply stopped working, mid-seizure, on a frozen-looking
  // screen. The escalation controls and the 999 confirm inherit the same path.
  //
  // The effect cannot reintroduce the double-tap it guards against: two taps in
  // one frame are not separated by a render, so nothing clears between them.
  const advancingFromRef = useRef<string | null>(null);
  const positionKey = `${activeProtocol?.id}#${currentStepIndex}`;

  // Step 0 is the only place the corner control ends the emergency, so it is the
  // only place the bar can belong — the second belt, for a step change that
  // bypasses gestures entirely.
  const showEndConfirm = confirmingEndAt === positionKey && currentStepIndex === 0;

  useEffect(() => {
    advancingFromRef.current = null;
  }, [positionKey]);

  const runOnce = useCallback((op: () => void) => {
    if (advancingFromRef.current === positionKey) return;
    const before = useAppStore.getState();
    const eventsBefore = before.activeEvent?.events.length ?? 0;
    advancingFromRef.current = positionKey;
    op();
    // The store commits synchronously. A gesture that neither moved nor wrote
    // anything — a dose refused at its ceiling — leaves nothing to protect, and
    // holding the barrier there would block the operator's next tap on a screen
    // that never re-renders. Anything that did navigate or log keeps it.
    const after = useAppStore.getState();
    const moved =
      after.activeProtocol?.id !== before.activeProtocol?.id ||
      after.currentStepIndex !== before.currentStepIndex;
    const logged = (after.activeEvent?.events.length ?? 0) !== eventsBefore;
    if (!moved && !logged) advancingFromRef.current = null;
  }, [positionKey]);

  // Linear progression for non-decision steps. Step `actions` fire HERE, on
  // completion (leaving the step) — not on render — so back-navigation can't
  // re-fire them and they run only after the user did the thing.
  //
  // Unguarded: the guard is applied by the callers below, so one gesture can
  // log a dose AND advance without tripping its own barrier.
  const performAdvance = useCallback(() => {
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

  const advance = useCallback(() => runOnce(performAdvance), [runOnce, performAdvance]);

  // Decision steps resolve in ONE tap: choosing an answer logs the choice, runs
  // any step actions, and jumps straight to that branch's target step. Navigation
  // is goToStep-only for the same single-log reason as advance().
  const chooseAnswer = useCallback((answer: { label: string; next: string }) => {
    runOnce(() => {
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
    });
  }, [runOnce, currentStep, addEventLog, runStepActions, activeProtocol, goToStep]);

  // On a require_confirm (drug) step one press logs the drug as given and
  // advances — keeps the event log honest without a two-tap dance. The store
  // owns the dose ceiling: if it refuses, nothing is logged and we stay put so
  // the refused state is what the operator sees.
  const handleConfirm = useCallback(() => {
    runOnce(() => {
      if (currentStep?.type === 'drug' && currentStep.drug_id) {
        const stepDrug = getDrugById(currentStep.drug_id);
        if (stepDrug) {
          if (!logDrugGiven(stepDrug, `Drug: ${currentStep.drug_id}`).ok) return;
        } else {
          // The ONLY path that reaches the log without passing logDrugGiven's
          // ceiling — and it is unreachable by construction: a data-integrity
          // test asserts every step drug_id resolves to a real drug, and a
          // second one that drug_id appears only on 'drug' steps. Reaching here
          // means the id names no drug, so there is no max_doses to enforce and
          // nothing for the ceiling to say; dropping the administration instead
          // would lose a dose from the medico-legal record, which is the worse
          // failure. If a future change makes this reachable with a real drug,
          // it must go through logDrugGiven.
          addEventLog('drug_given', `Drug: ${currentStep.drug_id}`, undefined, currentStep.drug_id);
        }
      }
      performAdvance();
    });
  }, [runOnce, currentStep, addEventLog, logDrugGiven, performAdvance]);

  // The 999 confirm: records the call the team says they made, then advances.
  // Deduped in the store, because the same team may already have logged it by
  // tapping the pill to dial. Its neutral twin in the footer is plain advance()
  // — no log — and so is the voice "done", which must never assert a phone call
  // nobody has confirmed on screen.
  const handle999Confirmed = useCallback(() => {
    runOnce(() => {
      log999Called();
      performAdvance();
    });
  }, [runOnce, log999Called, performAdvance]);

  const handleNext = useCallback(() => {
    // A hard-blocked drug step offers plain onward navigation, not another
    // confirm — including for the voice command, which must never stall on a
    // refusal. An escalated step still confirms: the dose is not forbidden.
    if (currentStep?.require_confirm && !hardBlocked) {
      handleConfirm();
    } else {
      advance();
    }
  }, [currentStep, hardBlocked, handleConfirm, advance]);

  // The backstop (R4). Once the wall clock is spent the step routes onward to
  // the still-seizing check — including on arrival, so coming back round the
  // loop cannot park the team on a dead 00:00 timer, and cannot restart it.
  // Routing goes through the graph's own target, which is the decision step:
  // a seizure that has stopped answers "Seizure has stopped" there and goes to
  // post-ictal care, so the clock can never walk it toward midazolam.
  useEffect(() => {
    if (monotonicRemaining === 0) handleNext();
  }, [monotonicRemaining, handleNext]);

  const handleRepeat = useCallback(() => {
    if (currentStep) speak(currentStep.say);
  }, [currentStep, speak]);

  // Back: previous step, or — from the first step, where the control becomes an
  // X — ask before ending. On step 0 the same corner that means "go back
  // everywhere else" closes the event log and drops the team back to the home
  // screen mid-emergency, which is not a gesture to take on one tap (F10, R5).
  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) setConfirmingEndAt(positionKey);
    else {
      // Going back re-enters a position the confirmation may have been opened
      // on; drop it so it cannot reappear unbidden under the returning thumb.
      setConfirmingEndAt(null);
      prevStep();
    }
  }, [currentStepIndex, positionKey, prevStep]);

  // Voice command handler.
  const handleVoiceCommand = useCallback((command: string) => {
    const c = command.toLowerCase();
    if (c.includes('next') || c.includes('continue') || c.includes('done') || c.includes('given') || c.includes('confirm')) {
      // Voice can advance/confirm, but NEVER selects a decision answer: choosing
      // a clinical branch by voice stays a deliberate safety gate until native STT.
      if (currentStep?.type !== 'decision') handleNext();
    } else if (c.includes('back') || c.includes('previous')) {
      setConfirmingEndAt(null);
      prevStep();
    } else if (c.includes('repeat')) {
      handleRepeat();
    } else if (c.includes('mute') || c.includes('quiet')) {
      toggleMute();
    } else if (c.includes('999') || c.includes('emergency')) {
      // Same act as tapping the pill — a person asking for the call to be
      // placed — so it reaches the record the same way, through the deduped
      // logger. Saying "999" used to dial without leaving a trace, which put
      // the log's honesty back where F4 found it.
      log999Called();
      window.location.href = 'tel:999';
    }
  }, [currentStep, prevStep, handleRepeat, toggleMute, handleNext, log999Called]);

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

  // The clinician's words for this limit, with the recorded time of the dose
  // already given substituted in. Every capped drug has an entry (held by the
  // data-integrity tests); the fallback only exists so a data change can never
  // render an empty panel mid-emergency.
  const doseNotice = drug ? DOSE_LIMIT_NOTICES[drug.id] : undefined;
  const lastDoseIso = lastDoseTimestamp(activeEvent, currentStep?.drug_id);
  const doseNoticeHero = (doseNotice?.hero ?? `${drug?.name ?? 'This medicine'} already given`)
    .replace('{time}', lastDoseIso ? hhmm(lastDoseIso) : '—');
  const doseNoticeDetail = doseNotice?.detail ?? '';

  return (
    <div
      className="theatre flex flex-col safe-area-top"
      style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text-1)' }}
      // Reaching for anything else answers the question — same rule as CPR.
      onClickCapture={(e) => {
        if (!showEndConfirm) return;
        if (!(e.target as Element).closest(`[${END_CONFIRM_ATTR}]`)) setConfirmingEndAt(null);
      }}
    >
      {/* Header — back · protocol · elapsed clock, then progress + pinned timers.
          The confirmation takes the top row's place rather than covering the
          step, so the instruction the team is working from stays readable. */}
      <header style={{ padding: '14px 16px 0', flexShrink: 0 }}>
        {showEndConfirm ? (
          <EndConfirmBar
            body={END_CONFIRM_BODY_RUNNER}
            onKeepGoing={() => setConfirmingEndAt(null)}
            onEnd={endEmergency}
          />
        ) : (
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
        )}

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

        {/* Decision choices — one tap each. A suppressed answer keeps its place
            in the list, occupied by the measurement that withdrew it, so the
            option does not silently vanish from under a thumb already moving. */}
        {isDecision && currentStep.answers && (
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentStep.answers.map((answer, idx) => {
              if (suppression && answer.next === suppression.answerNext) {
                return (
                  <p
                    key={idx}
                    role="status"
                    style={{ margin: 0, padding: '0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}
                  >
                    {suppression.note}
                  </p>
                );
              }
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

        {/* Timer. A monotonic step shows the wall clock it is anchored to; every
            other timer_block keeps the interval countdown that restarts on each
            pass, which is correct for a reassess cycle. */}
        {currentStep.type === 'timer_block' && currentStep.duration_seconds && (
          <div style={{ marginTop: 18 }}>
            {monotonicRemaining !== null ? (
              <MonotonicTimerDisplay remaining={monotonicRemaining} anchorIso={timerAnchor} />
            ) : (
              <TimerDisplay seconds={currentStep.duration_seconds} onComplete={handleNext} />
            )}
          </div>
        )}
      </main>

      {/* Footer — one dominant CTA, persistent 999 + voice controls, escape rail, deck */}
      <footer style={{ flexShrink: 0 }}>
        <div style={{ padding: '10px 18px 12px' }}>
          {/* Dose limit reached — the notice is the same panel in both classes,
              so the operator reads one consistent surface; what differs is
              whether a confirm control sits under it. */}
          {!isDecision && atDoseLimit && (
            <div
              role="status"
              style={{ padding: '13px 16px', borderRadius: 'var(--radius-xl)', background: 'var(--warn-tint)', border: '1.5px solid var(--warn)' }}
            >
              <div className="flex items-start" style={{ gap: 10 }}>
                <span aria-hidden style={{ flexShrink: 0, fontSize: 17, color: 'var(--warn)', lineHeight: 1.2 }}>⚠︎</span>
                <span className="font-extrabold" style={{ fontSize: 16.5, color: 'var(--warn)', lineHeight: 1.25 }}>
                  {doseNoticeHero}
                </span>
              </div>
              {doseNoticeDetail && (
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.45, margin: '8px 0 0 27px' }}>
                  {doseNoticeDetail}
                </p>
              )}
            </div>
          )}

          {/* Hard block: the confirm control is withdrawn entirely — an
              available button that refuses on tap still invites the tap under
              stress. Onward navigation is never blocked. */}
          {!isDecision && hardBlocked && (
            <button
              onClick={advance}
              className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
              style={{ gap: 10, marginTop: 10, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: 'var(--brand)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-btn)' }}
            >
              <ChevronRight className="w-6 h-6" />
              <span className="font-extrabold" style={{ fontSize: 'var(--fs-subtitle)' }}>Next step</span>
            </button>
          )}

          {/* Escalation: the dose is not forbidden, so the confirm stays live —
              but demoted below the warning, and labelled for what it actually
              does, so it is a deliberate act rather than the obvious next tap.
              Moving on without recording a dose stays available below it. */}
          {!isDecision && escalated && (
            <>
              <button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
                style={{ gap: 10, marginTop: 10, minHeight: 'var(--touch-min)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', color: 'var(--text-2)', border: '1px solid var(--border-strong)' }}
              >
                <Check className="w-5 h-5" />
                <span className="font-bold" style={{ fontSize: 'var(--fs-body-sm)' }}>Record another dose</span>
              </button>
              <button
                onClick={advance}
                className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
                style={{ gap: 10, marginTop: 10, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: 'var(--brand)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-btn)' }}
              >
                <ChevronRight className="w-6 h-6" />
                <span className="font-extrabold" style={{ fontSize: 'var(--fs-subtitle)' }}>Next step</span>
              </button>
            </>
          )}

          {/* A "call 999" step ends in a question, not a Done: did the call
              happen? The primary records it; the secondary moves on and records
              nothing. Both advance — treatment must never gate behind asserting
              a phone call (R2), so there is no dead end here for a team where
              one person is still dialling.

              The primary is red TINT, not solid: solid red on this screen means
              "escalate to CPR", and a confirmation is not an escalation. */}
          {!isDecision && !atDoseLimit && needs999Confirm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handle999Confirmed}
                className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
                style={{ gap: 10, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: 'var(--red-tint-2)', border: '1.5px solid var(--red)', color: 'var(--red-strong)' }}
              >
                <Phone className="w-6 h-6" />
                <span className="font-extrabold" style={{ fontSize: 'var(--fs-subtitle)' }}>{CALL_999_CONFIRMED_LABEL}</span>
              </button>
              <button
                onClick={advance}
                className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
                style={{ gap: 10, minHeight: 'var(--touch-comfort)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', color: 'var(--text-2)' }}
              >
                <ChevronRight className="w-5 h-5" />
                <span className="font-bold" style={{ fontSize: 'var(--fs-body)' }}>{CALL_999_NOT_YET_LABEL}</span>
              </button>
            </div>
          )}

          {!isDecision && !atDoseLimit && !needs999Confirm && (
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center active:scale-[0.98] transition-transform"
              style={{ gap: 10, minHeight: 'var(--touch-hero)', borderRadius: 'var(--radius-xl)', background: primaryBg, color: '#fff', border: 'none', boxShadow: 'var(--shadow-btn)' }}
            >
              <Check className="w-6 h-6" />
              <span className="font-extrabold" style={{ fontSize: 'var(--fs-subtitle)' }}>{primaryLabel}</span>
            </button>
          )}

          {/* Persistent 999 (logs on tap, doesn't block the dial) + voice controls.
              Deduped in the store: tapping to dial and then confirming on a 999
              step is one call, and must read as one call. */}
          <div className="flex items-center" style={{ gap: 8, marginTop: isDecision ? 0 : 10 }}>
            <a
              href="tel:999"
              onClick={() => log999Called()}
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

// The seizure clock: one wall-clock reading, derived from the anchor and the
// runner's tick. It owns no countdown of its own — there is nothing here to
// remount and restart, which is precisely the bug (F9).
//
// No pause control, deliberately. The interval timer below can be paused
// because it measures the team's waiting; this one measures the patient's
// seizure, and pausing it would only make the record lie about how long it ran.
// The start time is shown because that is what 999 asks for.
function MonotonicTimerDisplay({ remaining, anchorIso }: { remaining: number; anchorIso?: string }) {
  return (
    <div className="text-center" style={{ padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <p className="font-bold" style={{ fontSize: 'var(--fs-label)', letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Timer className="w-4 h-4" /> Seizure clock
      </p>
      <p className="riq-data font-extrabold" style={{ fontSize: 'var(--fs-display)', lineHeight: 1, color: 'var(--text-1)', margin: '8px 0' }}>
        {formatClock(remaining)}
      </p>
      {anchorIso && (
        <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>
          Timing from {hhmm(anchorIso)} — this clock does not reset
        </p>
      )}
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

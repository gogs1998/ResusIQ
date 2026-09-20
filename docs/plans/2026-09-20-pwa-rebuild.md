# PWA Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild ResusIQ's workflow and layout to the validated design — an assessment-first front door, Guide/Clinician modes, three tabs, pre-recorded voice — while landing the RCUK 2025 clinical set and the audit fixes.

**Architecture:** One React 19 + TypeScript + Zustand PWA. The protocol graph (`src/data/protocols.ts`) stays the brain; the rebuild changes entry (collapse door), presentation (mode density on one step component), and IA (tab bar). Clinical data changes come verbatim from `docs/clinical/rcuk-2025-prescriptions.md`. Design source of truth: `docs/plans/2026-09-20-pwa-rebuild-design.md` — read it first.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, Zustand (persisted), vitest (jsdom, **threads pool**), vite-plugin-pwa, lucide-react.

---

## Read this before touching anything — project gotchas that have burned people

1. **`npx tsc -b` is the type gate. `tsc --noEmit` checks NOTHING** (root tsconfig is `files: []`) and always passes.
2. **Tests: verify the FILE COUNT, not the summary line.** `npm test` must report **15+ files** (count `find src -name '*.test.ts*'`). The forks pool silently dropped files and printed "12 passed (12)" as if green; `pool: 'threads'` is pinned in `vitest.config.ts` — do not change it.
3. **The repo lives on a UNC share where git CANNOT write loose objects** (`fsync … Bad file descriptor`, deterministic). `git add`/`commit`/`stash` fail. **Commit via a local clone:** clone to the scratchpad, copy changed files in, commit + push there, then on the share `git fetch origin && git merge --ff-only origin/main` (remove any untracked file that is tracked upstream first). `git checkout`/`merge --ff-only` work on the share; only object writes fail.
4. **One writer per tree.** Never have two agents editing `D:\VSCode\ResusIQ` at once.
5. **`src/data/protocols.ts` and `src/data/drugs.ts` are clinical.** Change them only per `docs/clinical/rcuk-2025-prescriptions.md`, verbatim. The four non-negotiables are locked by `src/__tests__/safety-rules.test.ts` — if that file goes red, stop.
6. Curly quotes (`’ —`) are used intentionally in clinical strings. Files are UTF-8; **never** write them with PowerShell `Set-Content` (BOM/cp1252 damage has shipped twice). `scripts/verify-encoding.mjs` must report only the two known doc false-positives.
7. `ProtocolRunner` must always be reachable during an active emergency; the tab bar must hide when `isEmergencyActive`.
8. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

Run all gates with: `cd D:\VSCode\ResusIQ && npx tsc -b && npm test 2>&1 | grep -E "Test Files|Tests " && npm run build 2>&1 | tail -3`

---

## Phase 0 — Safety fixes that unblock everything (no design dependency)

### Task 0.1: Audio unlock on first gesture (the silent-iPhone fix)

**Files:**
- Create: `src/lib/audioUnlock.ts`
- Modify: `src/main.tsx` (call `installAudioUnlock()` once)
- Modify: `src/hooks/useTimer.ts:139-143` (metronome uses the shared context)
- Test: `src/__tests__/audioUnlock.test.ts`

**Step 1: Write the failing test**
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAudioContext, unlockAudio, installAudioUnlock, __resetForTests } from '../lib/audioUnlock';

describe('audioUnlock', () => {
  beforeEach(() => __resetForTests());
  it('returns null when AudioContext is unavailable (jsdom)', () => {
    expect(getAudioContext()).toBeNull();
  });
  it('creates one shared context and resumes it when available', () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).AudioContext = class { state = 'suspended'; resume = resume; };
    const a = getAudioContext(); const b = getAudioContext();
    expect(a).toBe(b);
    expect(resume).toHaveBeenCalled();
    delete (globalThis as any).AudioContext;
  });
  it('unlockAudio primes speechSynthesis with a silent utterance once', () => {
    const speak = vi.fn();
    (globalThis as any).speechSynthesis = { speak };
    (globalThis as any).SpeechSynthesisUtterance = class { volume = 1; constructor(public text: string) {} };
    unlockAudio(); unlockAudio();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].volume).toBe(0);
    delete (globalThis as any).speechSynthesis; delete (globalThis as any).SpeechSynthesisUtterance;
  });
  it('installAudioUnlock unlocks on the first pointerdown only', () => {
    const speak = vi.fn();
    (globalThis as any).speechSynthesis = { speak };
    (globalThis as any).SpeechSynthesisUtterance = class { volume = 1; constructor(public text: string) {} };
    installAudioUnlock();
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('pointerdown'));
    expect(speak).toHaveBeenCalledTimes(1);
    delete (globalThis as any).speechSynthesis; delete (globalThis as any).SpeechSynthesisUtterance;
  });
});
```
**Step 2:** `npx vitest run src/__tests__/audioUnlock.test.ts` → FAIL (module not found).

**Step 3: Implement** `src/lib/audioUnlock.ts`:
```ts
// iOS refuses to play audio (Web Audio AND speechSynthesis) unless it was
// first started INSIDE a user gesture. Before this module the metronome's
// AudioContext was built in a timer callback and speech was first requested
// from a passive effect — so on a real iPhone the app was silent while the
// speaker icon said "unmuted". Prime both inside the first gesture, once.
let sharedCtx: AudioContext | null = null;
let unlocked = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  if (sharedCtx && sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  const ctx = getAudioContext();
  if (ctx) {
    try {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      g.gain.value = 0; osc.connect(g); g.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.01);
    } catch { /* priming is best-effort */ }
  }
  if (typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* ignore */ }
  }
}

export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const once = () => unlockAudio();
  for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) {
    window.addEventListener(ev, once, { once: true, capture: true, passive: true });
  }
}

export function __resetForTests(): void { sharedCtx = null; unlocked = false; }
```
In `src/main.tsx`, import and call `installAudioUnlock()` before render. In `useTimer.ts` `playClick`: replace `new AudioContext()` with `getAudioContext()` and early-return if null. **Also remove `audioContextRef` and its unmount `close()`** — with a shared context, closing it on CPR-mode unmount permanently silences ALL later audio (a closed AudioContext is terminal and the lazy guard never recreates it); leave a comment that the context is owned by `lib/audioUnlock`. In `audioUnlock.ts`, wrap `new Ctor()` in try/catch (return null) so a Web Audio failure never blocks the speechSynthesis prime, and `.catch(() => {})` the `resume()` promise (`playClick` calls it every beat). Add a metronome mount/unmount test asserting `close` is never called. *(Amended 2026-09-20 after the Task 0.1 code-quality review.)*

**Step 4:** run the test file → PASS. **Step 5:** run the full gate. **Step 6:** commit `fix(audio): unlock speech + AudioContext inside the first user gesture`.

### Task 0.2: Persist the active emergency across reload

**Files:** Modify `src/store/appStore.ts` (`partialize` ~:526-530); Test: add to `src/__tests__/appStore.test.ts`.

**Step 1: Failing test** — start an emergency, log a drug, read `localStorage['resusiq-store']` (the persist key — check the `name` in the persist config), assert `activeEvent`, `activeProtocol.id`, `currentStepIndex`, `isEmergencyActive` are present in the persisted state.
**Step 2:** run → FAIL. **Step 3:** add `isEmergencyActive`, `activeProtocol`, `currentStepIndex`, `activeEvent`, `timerAnchors` to `partialize`; bump persist `version` and add a `migrate` that tolerates their absence. Also add a `visibilitychange`/`pagehide` listener (in `main.tsx`) that flushes `activeEvent` into `eventHistory` if the page is being discarded mid-emergency — but do NOT end the emergency. **Step 4:** PASS. **Step 5:** gate + commit `fix(store): persist the active emergency so a reload mid-emergency resumes`.

**Follow-up (from the Task 0.2 code review, not done here):** interval `timer_block` countdowns — the anaphylaxis 5-minute adrenaline reassess, the hypo recheck — are component state in `TimerDisplay`, not store state, so they are outside what `partialize` saves. A resumed emergency restarts every interval countdown from full, which can understate the time since the last adrenaline dose. The persisted monotonic anchors (`timerAnchors`) cover only monotonic steps (the seizure clock), by design. The fix is to anchor interval timers off the last matching `drug_given` timestamp in `activeEvent` on mount, rather than off mount time. It needs **clinical-reviewer sign-off before implementation**, because it changes what the team is shown about the adrenaline q5min rule.

### Task 0.3: Monitoring loops get an honest end state and an exit

**Files:** Modify `src/lib/terminalSteps.ts`, `src/components/ProtocolRunner.tsx` (`canEndFromHere` ~:238); Test: `src/__tests__/ProtocolRunner.terminal.test.tsx`.

**Step 1: Failing test** — for `chest_pain.monitor_chest`, `anaphylaxis.continue_monitor`, `stroke.monitor_stroke`: render at that step and assert the footer line reads as a holding state (not "Done — next step") and that the end-emergency affordance is available (`canEndFromHere` true).
**Step 2:** FAIL. **Step 3:** add a `HOLDING_STEPS` set (`awaiting_crew` group) to `terminalSteps.ts` for those three ids; make `terminalGroup()` return it for holding steps; relax the `stepsWithoutOnwardRoute` invariant so an explicitly-listed holding step may route onward; `canEndFromHere = index===0 || terminalGroup !== null`. The re-check loop stays (clinically wanted) — the primary button label becomes "Check again" and `step_completed` is logged once per loop entry, not twice. **Step 4:** PASS. **Step 5:** gate + commit `fix(runner): holding steps get an end affordance and honest footer`.

### Task 0.4: Layout residuals

**Files:** `src/components/ProtocolRunner.tsx` (main `ref` + scroll-to-top on `currentStepIndex`; `<main>` overflow-y auto fallback), `CPRMode.tsx:177` (`minHeight: 'min(300px, 100%)'`), `TriageWizard.tsx:180,238` (`justifyContent: 'safe center'`) + result screen `safe-area-bottom`, `AIAssistant.tsx` + `ProtocolLibrary.tsx:106,196` `safe-area-bottom`, `vite.config.ts` `theme_color`/`background_color` → `#0C1118`, `Deck.tsx:146` `40vh`→`40dvh`, and change the five shells' `height: '100dvh'` → `'100%'`.
**Test:** `src/__tests__/layoutInvariants.test.ts` — grep-style assertions that no component file contains `height: '100dvh'` and that the three named containers include `safe-area-bottom`.
**Commit:** `fix(layout): scroll reset, safe-area-bottom, landscape fallback, shells use 100%`.

### Task 0.5: Re-arm audio after backgrounding

**Files:** Modify `src/lib/audioUnlock.ts`; Test: extend `src/__tests__/audioUnlock.test.ts`.

iOS suspends the shared `AudioContext` when the PWA is backgrounded — realistic mid-emergency, because the same phone often dialled 999. `src/lib/wakeLock.ts` already has the house pattern (`handleVisibilityChange` → re-acquire on `visible`). Mirror it: on `visibilitychange` → `visible`, call `resume()` on the shared context; if it rejects (Safari refuses outside a gesture), re-arm the one-shot gesture listeners (`installAudioUnlock` must be idempotent — track whether listeners are armed) and reset `unlocked` so the next tap primes again.

**Step 1: Failing tests** — (i) with a stubbed context whose `resume` resolves, dispatching `visibilitychange` with `document.visibilityState === "visible"` calls `resume` once; (ii) with `resume` rejecting, the next `pointerdown` calls `speechSynthesis.speak` again (the one-shot listeners were re-armed and `unlocked` reset). **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + full gate. **Step 5:** commit `fix(audio): re-arm the shared context and gesture unlock after backgrounding`.

Also add the two old-WebKit probe tests the 0.1 review left as nice-to-have: `resume()` returning `undefined`, and a context with no `resume()` at all — both must not throw and must still let `unlockAudio()` prime speech (they pin the only unpinned guard in `audioUnlock.ts`). **Device check (cannot be automated):** install the PWA on an iPhone → collapse door → first narration audible → CPR → metronome ticks → background 10 s → return → both still work. Record the result in memory; the unit tests prove priming fires, not that iOS accepts it.

### Task 0.6: Persist training mode; resume banner

**Files:** `src/store/appStore.ts` (`partialize` + `migrate`: add `isTrainingMode`), `src/components/ProtocolRunner.tsx` (banner); tests in `appStore.test.ts` and `ProtocolRunner` tests.

Found during Task 0.2: `isTrainingMode` is not persisted, so a reload silently turns training mode OFF and drops the 999 dial guard — a drill could ring a real ambulance. Persist it (version bump + migrate). Separately, a resumed emergency currently drops the team into `ProtocolRunner` mid-protocol with no signal that it is a resume and the elapsed clock jumps: add a one-line, non-blocking banner in the runner header area — `Resumed — started HH:MM` — shown only when the store rehydrated an active emergency (set a transient `resumedAt` in the rehydrate handler; clear it on the next step change). No blocking prompt on the emergency path.

**Steps:** failing tests (training flag survives rehydrate; dial guard still active after rehydrate; banner renders only on resume and disappears on step change) → implement → gate → commit `fix(store,runner): persist training mode; show a resume banner`.

---

## Phase 1 — RCUK 2025 clinical set (data, verbatim from the prescriptions file)

**Rule for every task here:** open `docs/clinical/rcuk-2025-prescriptions.md`, apply the named section **verbatim**, run `safety-rules.test.ts` + `data-integrity.test.ts` after each task. If any non-negotiable test fails, revert and stop.

### Task 1.1: Choking infant branch (§B) — SAFETY
Files: `src/data/protocols.ts` (choking), `src/lib/terminalSteps.ts` (+`infant_choking_cpr`), tests `data-integrity.test.ts`, `ProtocolRunner.terminal.test.tsx`.
Step 1: extend `data-integrity` with a test that `choking` contains `age_check_choking` whose No→`severe_choking` and Yes→`infant_back_blows`, that no path from `infant_*` reaches `abdominal_thrusts`, and that every new id resolves. Step 2: FAIL. Step 3: apply §B (graph change + 7 steps + text updates + references). Update `TERMINAL_STEPS` (count 14→15) and the terminal test's expected count. Step 4: PASS + full gate. Commit `content(choking): infant (<1y) branch — back blows + chest thrusts, never abdominal (RCUK PBLS 2025)`.

### Task 1.2: Cardiac arrest — oxygen on ventilation, compression-only, adult-only scope, refs (§A)
Text-only. Test: `safety-rules`/`data-integrity` green; add an assertion that `start_cpr.show` contains `'15 L/min'` and `'Child or baby'`. Commit `content(cardiac): oxygen on the mask, compression-only fallback, adult-only scope (RCUK 2025)`.

### Task 1.3: Chest pain oxygen rework + ordering (§F) — SAFETY
Files: `drugs.ts` (`oxygen_moderate_flow` full replacement, `aspirin_oral`, `gtn_sublingual`), `protocols.ts` (chest_pain graph + texts + refs).
Step 1: failing tests — `oxygen_chest` is reached from `position_chest`; `give_oxygen_chest.next === 'aspirin'`; `aspirin.next === 'gtn_check'`; `oxygen_moderate_flow.adult_dose_text` contains `'reservoir'` and not `'5–10 L/min via simple face mask'`; and the two existing safety pins still pass. Step 2: FAIL. Step 3: apply §F1–F3 verbatim. Step 4: PASS + gate. Commit `content(chest pain): oxygen executable with the reservoir mask, gate moved earlier, aspirin before GTN (RCUK 2025/BTS/NICE)`.

### Task 1.4: Hypoglycaemia + glucagon + glucose (§I) — SAFETY
Step 1: failing tests — `reassess_hypo` has 3 answers and the third routes to `unconscious_hypo`; `wait_response.duration_seconds === 900`; `glucagon_im.repeat_interval_min` is undefined; `glucagon_im.how_to_give` contains `'0.5 ml'`. Step 3: apply §I. Also code-side: in `src/components/console/TimerStrip.tsx` `pickTrackedDose`, skip drugs where `isAtDoseLimit(drug, doses)` — add a test that a capped drug never yields a countdown. Commit `content(hypo): drowsy exit, 15-min repeat, weight-led glucagon; no DUE-NOW for capped drugs`.

### Task 1.5: Seizure + midazolam (§J, §K)
Apply §J + §K; drop the 3–6 m row everywhere; `doseLimits` text. Test: `safety-rules` single-midazolam pin green; add assertion that no `midazolam` band has `max_age_months < 6` with a numeric dose. Commit `content(seizure): 5-min wording, kit formulation, 3–6m row dropped, 5-min 999 update (NICE NG217/SmPC)`.

### Task 1.6: Anaphylaxis, asthma, adrenal, stroke, syncope, headers (§C, §D, §E, §G, §H, §L)
Text-only + references. Test: full suite green; `data-integrity` reference arrays non-empty. Commit `content: RCUK 2025 wording + citations — anaphylaxis, asthma, adrenal, stroke, syncope`.

---

## Phase 2 — The front door and the tab bar

### Task 2.1: Conditions → obvious tiles + collapse door
Files: `src/lib/conditions.ts` (TILES), `src/components/EmergencyDashboard.tsx`; test `src/__tests__/EmergencyDashboard.test.tsx`.
Step 1: failing test — home renders a primary control with text matching `/collapsed/i` and exactly six tiles: Choking, Chest pain, Allergic reaction, Breathing difficulty, Fitting, Stroke; does NOT render Cardiac arrest / Fainting / Low blood sugar / Adrenal crisis tiles; renders Call 999. Step 3: implement per design §3 (labels map to protocol ids: choking, chest_pain, anaphylaxis, asthma, seizure, stroke). Keep the hero 104px, tiles ≥64px. Commit `feat(home): assessment-first front door — collapse door + six obvious tiles`.

### Task 2.2: Collapse assessment flow
Files: `src/lib/triage.ts` (or new `src/lib/collapse.ts`), `src/components/CollapseFlow.tsx`, `src/store/appStore.ts` (`startCollapse()`), tests `src/__tests__/collapse.test.ts`.
Design: a two-question router (responding? → breathing?) that reuses the wording of `cardiac_arrest.response` / `breathing_check` and lands via `startEmergency(id, 'collapse')` / `switchProtocol`: not breathing → `cardiac_arrest` at `start_cpr`; breathing → a cause-check decision (diabetic / just had a fit / eaten-injected-stung / on steroids / none) → `hypoglycaemia`@`unconscious_hypo` / `seizure`@`post_ictal` / `anaphylaxis`@`recognition` / `adrenal_crisis`@`recognise` / `syncope`@`abcde`; responding → "What's wrong?" → tiles or `syncope`@`recovery`.
Step 1: failing tests — each answer path lands on the named protocol + step id; no path reaches CPR without both answers. **Clinical gate:** before merging, the branch targets above go to the clinical reviewer for ratification (they are protocol routing = clinical). Commit `feat(collapse): two-question assessment path — responding? breathing? → route`.

### Task 2.3: Tab bar + Ask/Learn screens (shells)
Files: `src/App.tsx`, new `src/components/TabBar.tsx`, `src/components/AskScreen.tsx`, `src/components/LearnScreen.tsx`; `src/types/index.ts` (AppScreen adds `'ask' | 'learn'`); test `src/__tests__/App.tabs.test.tsx`.
Step 1: failing tests — tab bar renders three tabs on home; is NOT rendered when `isEmergencyActive`; Learn shows library + training entries; Reports/SBAR are no longer on home. Step 3: implement; move Library/Training under Learn; Settings behind the gear. Commit `feat(ia): Emergency / Ask / Learn tab bar; hidden during emergencies`.

### Task 2.4: Retire the recognition skip; fold openings
Files: `src/store/appStore.ts` (`firstActionStepIndex` — keep for `switchProtocol` deterioration landing only, remove from tile entry), `protocols.ts` (asthma `recognise`: fold "Sit them upright" into `assess_severity.show` lead line per the clinical note), `src/__tests__/appStore.test.ts:57-68` (rewrite the mirror test), add `src/__tests__/protocolContent.test.ts`: every `recognition:true` step's `show` first line contains no imperative verb from a list (`Sit, Lay, Give, Call, Roll, Put, Start, Turn, Shake`).
Commit `fix(entry): tile entry no longer skips clinical actions; recognition steps bound to be passive`.

---

## Phase 3 — Guide and Clinician modes

### Task 3.1: Mode setting
Files: `src/store/appStore.ts` (`uiMode: 'guide' | 'clinician'`, default `'guide'`, persisted, `setUiMode`), `src/components/PracticeSetup.tsx` (a segmented control), test in `appStore.test.ts`. Commit `feat(settings): Guide / Clinician mode, persisted`.

### Task 3.2: Guide-mode step screen
Files: `src/components/ProtocolRunner.tsx` (render by `uiMode`), new `src/components/step/StepGuide.tsx`, `src/components/step/StepControls.tsx`; test `src/__tests__/ProtocolRunner.guide.test.tsx`.
Step 1: failing tests — in guide mode an instruction step renders exactly three buttons (primary, Call 999, the CPR escape); no progress bar; no mic; no deck; a decision step renders its answers as the primary controls and no "Done" button; a drug step's primary reads `Given`; the instruction uses `--fs-step`; header shows condition + elapsed clock only. Step 3: build `StepGuide` per design §4; the escape control calls the existing `switchProtocol('cardiac_arrest')` path. Commit `feat(runner): Guide mode — one instruction, one button, three controls`.

### Task 3.3: Clinician density
Same component with `density='clinician'`: adds step counter, inline drug card, dose-ceiling notices, a single-handle sheet for script/doses/log (reuse `Deck` with one tab). Test: clinician mode renders the counter and drug card; guide does not. Commit `feat(runner): Clinician mode — checklist density over the same step`.

### Task 3.4: End-of-emergency summary
Files: new `src/components/EmergencySummary.tsx`, `appStore.ts` (`endEmergency` → `screen: 'summary'`), `App.tsx`; test — ending renders the summary with elapsed, drugs+times, 999 time, primary "Hand over (SBAR)". Commit `feat(end): summary screen with SBAR handover as the primary action`.

---

## Phase 4 — Ask and Learn

### Task 4.1: Ask — data lookup
Files: new `src/lib/ask.ts` (tokenised search over `drugs` + `protocols`: name, indication, aliases e.g. "adrenaline/epinephrine", "child/paeds/paediatric/kids"), `src/components/AskScreen.tsx` (search field → answer card: dose bands, route, site, references); test `src/__tests__/ask.test.ts` — `"child adrenaline dose"` returns `adrenaline_im_adult` with its child bands; `"midazolam"` returns the single-dose warning; results are always records from the data (assert no free text beyond the record). Commit `feat(ask): instant lookup over the verified drug data — never generated`.

### Task 4.2: Learn
Move `ProtocolLibrary` + `TrainingMode` entries under `LearnScreen`; keep all content. Test: Learn lists all 10 protocols incl. the four not on the home grid. Commit `feat(learn): library and drills under one tab`.

---

## Phase 5 — Pre-recorded voice (after Phase 1 freezes the text)

### Task 5.1: Narration manifest + generator
Files: new `scripts/generate-narration.mjs` (collects every `say` in `protocols.ts` + the 4 CPRMode literals; SHA-256 each; calls a TTS provider via env `NARRATION_TTS=openai|elevenlabs|google` + key; writes `public/narration/<hash>.opus` and `public/narration/manifest.json` `{hash: text}`), new `src/lib/narration.ts` (`getClipUrl(text): string | null` via the manifest + `import.meta.env.BASE_URL`); test `src/__tests__/narration.test.ts` — hash is stable; unknown text → null; and a **binding test**: every `say` in `protocols.ts` has a manifest entry (skipped with a clear message if `manifest.json` is absent, so CI without clips still passes). Commit `feat(voice): content-hash-keyed narration manifest + generator`.

### Task 5.2: Playback with fail-safe fallback
Files: `src/hooks/useSpeech.ts` — `speak(text)`: if `getClipUrl(text)` → play via `<audio>` (using the unlocked context), set `isSpeaking` from events; else fall back to `speechSynthesis`. Test: with a manifest hit, `speechSynthesis.speak` is NOT called; with a miss, it IS. `vite.config.ts` globPatterns add `opus`. Commit `feat(voice): play pre-recorded clips, browser TTS only as fallback`.

---

## Phase 6 — Verification

### Task 6.1: New binding tests (the ones the audits said were missing)
`src/__tests__/flowInvariants.test.ts`: tile → first shown step is an action (not `recognition:true`); actions fire once on completion and never on back-then-forward for `log:*` (except `shock_delivered`); every step can reach an end affordance; guide-mode control count ≤ 3 on every step type. Commit `test: bind the flow invariants the 2026-08-30 audits found unbound`.

### Task 6.2: Full gate + device checklist
Run the full gate (file count = 16+). Deploy. Gordon's phone checklist: iPhone 17 installed app — no top gap, nothing clipped; voice speaks; metronome ticks; collapse → CPR in 2 taps; SE-class and landscape; iPad. Only then tag `pwa-rebuild-v1`.

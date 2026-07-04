# ADVERSARIAL HANDOFF — ResusIQ

**For:** the reviewer (Claude Fable) taking an adversarial pass.
**From:** the implementing agent (Claude Opus 4.8), 2026-07.
**HEAD at handoff:** `9b20555` on `main` (github.com/gogs1998/ResusIQ). Live: https://gogs1998.github.io/ResusIQ/

## How to read this document

This is a **hostile-review brief, not a status report.** Your job is to *break* it, not to confirm it works. Everything below is a *claim I am making* — treat each as unverified until you have checked it against the code and the primary sources yourself. Where I say "verified", I mean *an LLM agent verified it against web sources*, **not** a human clinician. That distinction is the single most important thing in this file.

**ResusIQ is clinical decision-support used by non-clinicians during a real medical emergency.** A wrong dose, a broken decision branch, or a confidently-worded but incorrect instruction can contribute to a death. Bias your review toward "this could hurt someone" over "this is a nice-to-have."

## Run it

Working dir: `D:\VSCode\ResusIQ` (Windows; bash + PowerShell both available).
- `npx tsc -b` — the **real** type gate. (Do NOT trust `tsc --noEmit`: root tsconfig is `files: []` + references, so `--noEmit` checks nothing and always passes. This has bitten us.)
- `npm test` — vitest, currently 42 tests incl. the safety invariants.
- `npm run build` — production build (runs `tsc -b` too).
- `npx vite --host` — LAN dev server. Live web app auto-deploys from `main` via GitHub Actions.

Full green at handoff: `tsc -b` exit 0, 42/42 tests, build OK.

## Where the truth lives

- **Clinical content:** `src/data/protocols.ts` (10 protocols) and `src/data/drugs.ts` (10 drugs). Changes here are *clinical* changes. This is your primary attack surface.
- **Safety invariants as tests:** `src/__tests__/safety-rules.test.ts` + `data-integrity.test.ts` + `appStore.test.ts`.
- **Flow logic:** `src/store/appStore.ts` (startEmergency, entry-source skip, event log), `src/components/ProtocolRunner.tsx` (step rendering, decisions, drug confirm), `src/components/CPRMode.tsx`.
- **Durable clinical rationale + prior sign-offs:** `C:\Users\gordo\.claude\projects\D--VSCode-ResusIQ\memory\clinical-decisions.md` and `known_risks.md`. Read these — they record *why* things are the way they are, and every "signed off" claim you should be suspicious of.
- **Project rules:** `CLAUDE.md` (the non-negotiables). `HANDOFF.md` (older technical brief).

## The four safety non-negotiables (from CLAUDE.md)

These are locked as tests in `safety-rules.test.ts`. **Verify the tests actually assert what they claim, and that nothing routes around them:**
1. **Stroke → NO aspirin.** (Aspirin is contraindicated: could be a haemorrhagic bleed.)
2. **MI / chest pain → oxygen only when indicated** (hypoxic, SpO2 target 94–98%), never routine high-flow.
3. **Anaphylaxis → adrenaline IM repeats every 5 min, NO fixed maximum.**
4. **Seizure → single buccal midazolam, prolonged (>5 min) seizures only.**

Attack idea: a passing test proves the string exists; it does **not** prove the *flow* can't reach a state that violates the spirit. Trace the actual branches.

## What changed this session (so you know what's freshest = riskiest)

Rewrites are recent and therefore least-scrutinised. In rough risk order:

1. **All 10 protocols' step wording was rewritten** to a calm one-line voice (commits `374f33f`, `dcdec15`, `c0c6cb7`, `708f0fa`). Claim: *text-only, no dose/number/branch changed* except where a reviewer flagged a real issue. **Verify that claim is true** — diff each protocol object against the pre-rewrite version (`git show 210c8d9:src/data/protocols.ts`) and confirm every `id`, `type`, `next`, branch `next`, `drug_id`, `require_confirm`, `actions`, and numeric field is byte-identical. Any silent branch/dose change is a bug.

2. **Paediatric hydrocortisone dose was CHANGED** (`708f0fa`, adrenal crisis). This is the one deliberate clinical-value change: bands went from (6–12y=50mg, 1–6y=25mg, <1y=25mg) to (**6y+=100mg, 1–5y=50mg, <1y=25mg**), citing BSPED 2024 / NICE NG243. An agent decided the old values were under-dosed. **Independently verify these numbers against BSPED/NICE.** If wrong, this is a direct patient-safety defect I introduced. Check `drugs.ts` `hydrocortisone_im` AND `protocols.ts` `give_hydrocortisone.show` agree.

3. **Decision steps now resolve in ONE tap** (`0457b32`): tapping an answer jumps straight to its branch, no confirm. Verify decisions can't mis-fire and that the answer→`next` mapping is correct for every decision (especially the safety gates: GTN BP check, aspirin allergy/bleeding, swallow-safety in hypoglycaemia, steroid-history in adrenal, FAST in stroke).

4. **Browser Gemini Live voice was REMOVED** from the web app (`6f09aa3`); read-aloud now uses browser `SpeechSynthesis` only. `AIAssistant.tsx` still exists but is no longer routed to. Verify nothing still depends on the deleted `geminiTTS` path and that muting/`isMuted` actually silences narration.

5. **Six secondary screens were restyled by PARALLEL AGENTS** (`9b20555`): SBARHandover, CallScript, EventReports, ProtocolLibrary, PracticeSetup, TrainingMode. Claim: *visual-only, no logic touched*. Parallel agents are the **highest risk for subtle inconsistency** — diff these for any accidental behavioural/text-meaning change, especially CallScript (`getPatientState` drives what a user tells a 999 dispatcher) and SBAR.

## Highest-value adversarial targets (attack these first)

- **Branch-graph integrity, all 10 protocols.** For every step, does every `next` / `answers[].next` resolve to a real step id? Any dead pointer, orphan step, or unreachable branch? Any infinite loop with no exit? `data-integrity.test.ts` claims to cover PROTOCOL_MAP + graph — confirm it actually does, then find what it misses.
- **Drug card vs protocol step agreement.** Each `drug` step shows a dose in `show`; the `DrugCard`/`drugs.ts` shows another. Do they ever disagree? (The hydrocortisone change is the obvious place to check both were updated.)
- **Decision answer wording vs branch target.** House style flipped some answer orders (e.g. chest_pain/stroke put "No — collapsed" first). Confirm the *label* still points to the *correct* `next` after any reorder — an inverted mapping here is silent and lethal.
- **The safety gates that are phrased as ordinary decisions.** GTN "systolic >100", aspirin "no allergy/bleeding", hypoglycaemia "awake + can swallow", adrenal "on steroids". These are SAFETY checks wearing a decision UI. Can a user blow past them? Is the gate obvious in the wording?
- **Dose/route/site for every drug** in `drugs.ts` vs current RCUK/SDCEP/BNF/BNFc. Don't trust the memory file's "verified correct" list — re-check. Known soft spots the agents themselves flagged: salbutamol child band is free-text (not structured); BNFc paediatric bands were never checked against a live BNF by a human.
- **Stroke specifically:** confirm aspirin appears *only* in a "do NOT give aspirin" line and nowhere as an action; confirm nil-by-mouth survives; confirm the standalone `fast` summary card + face/arm/speech decisions aren't contradictory.
- **CPRMode:** rate 100–120 (metronome 110 BPM = 0.545s), depth 5–6cm, 30:2, "resume CPR immediately after shock", agonal-gasps caveat. Verify the metronome/counter logic matches the displayed numbers.
- **Mojibake / glyph regressions.** Prior audits found `•`/`⚠`/mojibake corrupting *safety* lines. Grep the whole of `protocols.ts`/`drugs.ts` for non-ASCII and confirm none garbles a clinical instruction. (Note: curly quotes `’ —` are used intentionally now.)

## Known gaps / things I did NOT do (don't re-flag as discoveries, but do pressure-test)

- **No human clinician has signed off any of this.** All clinical "verification" was LLM-vs-web-sources. This is the headline caveat.
- **BNFc paediatric bands** not checked against a live (paywalled) BNF by a human.
- **Stroke `fast` intro card** is arguably redundant with the face/arm/speech decisions; left in deliberately (fold deferred to future entry-source gating).
- **Conversational voice assistant** deferred to a native iOS (Capacitor) build; the web app has one-way read-aloud only. `AIAssistant.tsx`/Capacitor config are present but not wired into the web flow.
- **Entry-source skip** (`startEmergency(id, 'tile')` skips leading `recognition:true` steps) — verify it skips only *passive* recognition steps and never a real diagnostic gate (adrenal steroid_check, stroke FAST must NOT be skipped).
- **No e2e/UI tests** — only unit/data tests. Every screen interaction is unverified by automation.

## What a good adversarial finding looks like here

Rank by patient impact: a wrong dose or a decision branch that routes a real emergency to the wrong protocol is P0; a safety gate a panicking user can skip is P0/P1; a confusingly-worded instruction is P1/P2; a visual glitch is P3. For each finding give: the file+line, the exact clinical/source contradiction (with the RCUK/SDCEP/BNF citation), and the concrete failure scenario. Assume I was overconfident; the memory file's sign-offs are the prime suspects.

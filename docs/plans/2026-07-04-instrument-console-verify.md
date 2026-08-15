# Instrument Console — Verification Pass (Task 8)

**Date:** 2026-07-04 · **Verifier:** Fable (orchestrator, hands-on) · **HEAD:** post-4007174 + this commit · **Branch:** redesign/instrument (unpushed)

## Gates
`npx tsc -b` exit 0 · `npm test` 128/128 (6 files; was 42 at session start) · `npm run build` exit 0, main chunk ~295 KB / ~87 KB gzip, no >500 KB warning, PWA precache generated.

## Live end-to-end (driven personally in Chrome over LAN dev server)
- **Home (Ward):** cool light grid, all 10 conditions + cues, red chips only on cardiac/anaphylaxis, demoted nav row, pinned triage + 999. Scroll fallback active on short viewports; measured one-screenful at 390×780 (Task 6 fix f4e9e34).
- **Stroke FAST hard gate (clinical fix 90ba8ff): CONFIRMED LIVE** — tapping "Yes — face has dropped" jumped step 2/12 → 6/12 (time_call), no recall-question dependency.
- **Step-action execution (b5fe089): CONFIRMED LIVE** — completing time_call fired `log:999_called`; the TimerStrip 999 chip flipped "not logged" → ✓ HH:MM (green).
- **Escape rail + switchProtocol: CONFIRMED LIVE** — from mid-stroke, one tap switched to CARDIAC ARREST (CPR + AED) at its first action step; elapsed clock CONTINUOUS across the switch; 999 chip preserved; rail correctly hidden inside cardiac_arrest; auto-speak fired; deck Log shows the single continuous event ("Started: Stroke / TIA" → switch entry); deck 999-script tab renders the light document card with Copy, content reflecting the switched protocol.
- Header clock and TimerStrip elapsed tick in sync (single tick source, 4f2430d).

## Machine checks
- **Wording freeze:** word-diff of SBAR/CallScript across the Task 7 sweep = zero non-style word changes (dispatcher/handover wording intact).
- **Dead-token sweep:** zero `--teal-*` consumers anywhere; raw scale now deleted (this commit). Zero Lexend references. Zero warm-sand `#F4EFE8`.
- **Displayed clinical numbers** vs memory/clinical-decisions.md audit list: protocols.ts/drugs.ts untouched all session (every review verified empty diffs); the two restyled number surfaces are CPR stats (100–120 / 30:2 / 5–6 cm — regression to "110" caught in review, fixed c554c23; metronome pill labels 110 bpm as the tick rate) and the drug dose card (renders directly from drugs.ts). Tile cue lines (10 strings) are navigational, not dosing — flagged for clinical glance in Task 9's sign-off round.
- **Four-meaning colour language enforced:** TrainingMode difficulty badges were the last green/amber/red-as-decoration holdout → neutralised (this commit).

## A11y (from the review chain + spot checks)
Step announcer role="alert", reads `question` on decisions (matches sighted hero); h1 = protocol title; focus-visible outlines verified visible on dark (and immune to the overflow-hidden clipping that killed box-shadow rings); deck aria-expanded/aria-controls + Escape; tile aria-labels strip middots; contrast spot-checks pass (text-2 ≈8.6:1, text-3 ≈7.1:1 on theatre bg; cue text ≈5.7:1 on white). **Open (accepted):** decision one-tap buttons are deliberately NOT radios (commit-on-tap model — a radio group implies select-then-confirm); 999 sub-label 10.5px white@.85 on red ≈3.85:1 (supplementary; primary label passes).

## Known residuals (deliberate, tracked)
1. Task 9 (pending, clinical sign-off): reworded near-duplicate decision copy (e.g. FAST face hero + support) — content edit in protocols.ts.
2. Voice answer-selection on decisions ruled a deliberate safety gate until native STT (Capacitor phase).
3. `on_timer_end_next` is documentary at runtime (advance uses next/sequential); pinned by test to stay equal to the effective target.
4. Modes (street/clinician) are Phase 3 — design locked in the design doc, nothing built.
5. Mid-emergency reload still loses activeEvent (pre-existing; candidates: persist partialize — schedule with Phase 2).

## Verdict
Phase 1 of the Instrument redesign is complete and verified: 22 commits, 42→128 tests, three gates green throughout, emergency loop verified live end-to-end including both morning clinical fixes. Ready for Gordon's device test and push/merge decision.

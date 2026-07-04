# Instrument Console Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild ResusIQ's UI as the "Instrument" system — light Ward surfaces, dark Theatre emergency console with pinned timers, escape rail, and a slide-up 999/drugs/log deck — without touching clinical data or flow semantics.

**Architecture:** Retarget the existing semantic CSS-token layer (`src/design-system/tokens/colors.css`: `--bg`, `--surface-1`, `--text-1`… are consumed inline by every component) to the new Ward palette, and add a `.theatre` class scope that redefines the *same* semantic names to dark values. New console chrome (TimerStrip / EscapeRail / Deck) are additive components inside ProtocolRunner. Protocol/drug data and the step engine are untouched.

**Tech stack:** React 19 + TS, Zustand (`src/store/appStore.ts`), Tailwind v4 utilities + inline `var(--token)` styles, @fontsource self-hosted fonts, vitest (78 tests).

**Read first:** `CLAUDE.md` (non-negotiables), `docs/plans/2026-07-04-instrument-console-design.md` (the design this implements).

**Hard rules for every task:**
- NEVER edit `src/data/protocols.ts` or `src/data/drugs.ts` (clinical, separately governed).
- Gates after every task: `npx tsc -b` exit 0 (NOT `--noEmit` — it checks nothing here) and `npm test` 78/78. Commit only when green.
- Keep existing aria-labels, `aria-live` step announcer, radiogroup semantics, and focus-visible styles working.
- Reference mockup for look & spacing: `docs/design-handoff/instrument-mockup.html` (Task 0 copies it into the repo).

---

### Task 0: Vendor the mockup into the repo (reference material)

**Files:** Create `docs/design-handoff/instrument-mockup.html`
Copy from `C:\Users\gordo\AppData\Local\Temp\claude\D--VSCode-ResusIQ\1790137f-c471-4a6c-92a3-88ce3822a539\scratchpad\resusiq-instrument-mockup.html`. Commit: `docs(design): vendor instrument console mockup`.

### Task 1: Fonts — Lexend → Inter + mono data stack

**Files:** Modify `src/design-system/tokens/fonts.css`, `src/design-system/tokens/typography.css`; `package.json` (dep).

1. `npm install @fontsource/inter` (weights via subpath imports like the current Lexend pattern: 400/500/600/700/800).
2. `fonts.css`: replace the six `@fontsource/lexend/*.css` imports with the Inter equivalents.
3. `typography.css`: point `--font-sans` at `'Inter', -apple-system, 'Segoe UI', sans-serif`; ADD `--font-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace;` and a utility class `.riq-data { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }` (put the class in `src/index.css`).
4. Remove `@fontsource/lexend` from package.json.
5. Gates green → commit `design(tokens): Inter + tabular mono data stack replaces Lexend`.

### Task 2: Colour tokens — Ward retune + `.theatre` dark scope

**Files:** Modify `src/design-system/tokens/colors.css` only.

1. Retune the raw + semantic values in `:root` (Ward): `--canvas: #F4F6F9`, `--surface-2sand → #FAFBFD`, `--surface-3: #EDF1F6`, `--surface-inset: #E8EDF3`, borders `--ink-100 → #E1E7EE`, `--border-faint: #EBF0F5`; neutrals go cool: `--ink-900: #101720`, `--ink-500: #5B6873`, `--ink-400: #7E8B99`. Semantics: `--red-600: #D92D20`, `--green-600: #178A53`, `--amber-600: #B54708` (text-safe on light), `--brand: #175CD3` (info blue replaces teal as brand; keep the `--teal-*` raws defined so nothing breaks). Kill the rainbow: `--drug`, `--decision`, `--timed`, `--roles` all map to `--ink-700`; their `-tint`s to `--surface-3`.
2. ADD at the end a `.theatre { … }` block redefining the SAME semantic names for dark: `--bg: #0C1118; --surface-1: #151D29; --surface-2: #121A24; --surface-3: #1A2534; --surface-inset: #101823; --border: #2A3644; --border-strong: #3D5B82; --border-faint: #1D2733; --text-1: #F2F6FA; --text-2: #9FB0C2; --text-3: #8FA0B3; --red: #E5484D; --red-tint: rgba(255,77,77,.12); --red-tint-2: #2A1214; --green: #178A53; --green-tint: rgba(61,214,140,.14); --warn: #FFB224; --warn-tint: rgba(255,178,36,.08); --brand: #54C1FF; --brand-tint: rgba(84,193,255,.10); --scrim: rgba(2,6,12,.6); --focus-color: #54C1FF; --focus-ring: 0 0 0 4px rgba(84,193,255,.35);` plus `--text-on-color: #fff`.
3. Also add `.theatre` green-on-dark accent: `--green-bright: #3DD68C` (new name, used for confirmed text/icons on dark).
4. Gates green → visual smoke (`npx vite --host`, check home still legible) → commit `design(tokens): cool Ward palette + .theatre dark emergency scope`.

### Task 3: Console chrome components (additive, pure-render + one lib helper)

**Files:** Create `src/lib/emergencyTimers.ts`, `src/components/console/TimerStrip.tsx`, `src/components/console/EscapeRail.tsx`, `src/components/console/Deck.tsx`; Test `src/__tests__/emergencyTimers.test.ts`.

1. **TDD the helper first.** `emergencyTimers.ts` exports pure functions:
   - `elapsedSeconds(startTimeIso: string, now: Date): number`
   - `nextDoseCountdown(events: EventLogEntry[], drugId: string, repeatIntervalMin: number, now: Date): { due: boolean; secondsLeft: number } | null` — null if no `drug_given` event for that drug yet; `due` when elapsed ≥ interval.
   - `formatClock(totalSeconds: number): string` — `MM:SS`, hours roll into minutes (`75:04`).
   Write failing tests (fixed `now` values, no Date.now in tests), see them fail, implement, see 78→~84 pass.
2. **TimerStrip**: renders elapsed (from `activeEvent.start_time`), 999-called tick (event log has a `999_called` entry → show ✓ + time), and — when the active protocol has a repeat-interval drug already given — the countdown chip (amber `due` state text `DUE NOW`). Ticks with a 1s `setInterval`; cleans up. All numerals class `riq-data`.
3. **EscapeRail**: full-width red-tint button ("Unresponsive & not breathing?" / sub "Switches straight to CPR"), `aria-label` included. On tap → the SAME code path the runner uses for `switch_protocol:cardiac_arrest` actions (find it in `ProtocolRunner.tsx` — reuse, don't duplicate; extract to a store action if it's inline). Renders `null` when `activeProtocol.id === 'cardiac_arrest'`.
4. **Deck**: bottom sheet (fixed to runner bottom, drag-handle button toggles, `aria-expanded`), three tabs — 999 script / Drugs / Log. For content: refactor `CallScript.tsx` so its script-building body (incl. `getPatientState`) is exported as `<CallScriptContent/>` used by both the standalone screen and the deck tab; Drugs tab lists `drug_given` events + opens the existing drug card component; Log tab renders `activeEvent.events` rows (time `riq-data` + label). No new routes; deck lives inside the runner (CLAUDE.md: runner stays reachable).
5. Gates green → commit `feat(console): timer helpers + TimerStrip, EscapeRail, Deck chrome`.

### Task 4: ProtocolRunner becomes the console

**Files:** Modify `src/components/ProtocolRunner.tsx`.

1. Wrap the root in `className="theatre"` (tokens flip dark; fix any hardcoded light hexes found inside).
2. New header per mockup: back · protocol title (caps, 12.5px/800/tracked) · elapsed clock (`riq-data`, "ELAPSED" microlabel) · thin progress bar + `step n / n`. TimerStrip directly below.
3. Body: eyebrow (step-type as a semantic dot: red=drug/critical, amber=decision-gate, blue=info — NOT the old violet badge system), hero `~30px/800/-.02em` `text-wrap:balance`, support line. **Duplicate-copy rule:** if the support/`say` line, lowercased/stripped of punctuation, equals the hero (or hero is a prefix of it), don't render it.
4. Answers: 70px min-height cards per mockup (mark chip ✓/✕ green/red tint, label 18.5px/700, sub-label from the `— reason` suffix: split label on ` — ` into main+sub). One-tap commit behaviour unchanged.
5. Drug steps: dose panel (dose `riq-data` ~29px/800, meta line, amber warning strip), single green GIVEN hero button with logged-time preview. Keep `require_confirm` semantics (the single press IS the confirm — no second CTA).
6. Mount EscapeRail above the Deck at the bottom; persistent 999 pill stays (red, `tel:999`).
7. Manual smoke on dev server (stroke + anaphylaxis + seizure runs). Gates green → commit `design(runner): theatre console — header clock, timer strip, escape rail, deck`.

### Task 5: CPRMode + TriageWizard join the Theatre

**Files:** Modify `src/components/CPRMode.tsx`, `src/components/TriageWizard.tsx`.
CPR: `.theatre` wrap; big `riq-data` counter in a pulse ring (reuse `.animate-pulse-cpr` timing 0.545s), stats row `110 / 30:2 / 5–6cm`, AED amber-outline + signs-of-life buttons per mockup. NO logic/timing changes.
Triage: `.theatre` wrap, answer cards restyled like runner decisions; keep the "If in doubt → CARDIAC ARREST / 999" footer; add EscapeRail here too.
Gates green → commit `design(cpr, triage): theatre restyle + escape rail on triage`.

### Task 6: Ward home — dense grid

**Files:** Modify `src/components/EmergencyDashboard.tsx`.
Per mockup: header (brand + mute/settings) · compact 2-col grid of ALL 10 tiles on one 390×780 viewport (icon chip 25px, name 14px/700, one-line plain-language cue 10.5px — cues per mockup home screen), crit tiles (cardiac/anaphylaxis) red icon chips · demoted text row Library/SBAR/Reports/Training · amber "Not sure?" triage card · red Call 999 block. Remove any remaining hero/voice tiles. Verify no scroll needed at 390×780. Gates green → commit `design(home): one-screenful condition grid, demoted secondary nav`.

### Task 7: Ward sweep — secondary screens

**Files:** Modify `src/components/{ProtocolLibrary,SBARHandover,CallScript,EventReports,PracticeSetup,TrainingMode}.tsx`.
Mostly free via tokens; job is to hunt hardcoded warm-sand/teal hexes and rounded-pill excess, align to Ward (1px borders, 12px radius, ink text, blue brand accents only for info). CallScript standalone screen now renders `<CallScriptContent/>` from Task 3. NO text/logic changes (these screens' wording is dispatcher/handover-sensitive). Gates green → commit `design(ward): secondary screens on cool light system`.

### Task 8: Verification pass (do not skip)

1. `npx tsc -b` && `npm test` && `npm run build` — all green, note bundle warnings.
2. Dev server + browser screenshots at 390×844: home, stroke runner (decision), anaphylaxis (drug + deck open on 999 script), CPR, triage, library, SBAR. Compare against mockup.
3. Grep sweep: `--teal-` / `#F4EFE8` / `Lexend` should have zero live references outside token raws.
4. A11y spot-check: tab order on runner, aria-live announces step change, deck toggle `aria-expanded`, escape rail reachable by keyboard.
5. Write findings to `docs/plans/2026-07-04-instrument-console-verify.md`. Commit any fixes individually.

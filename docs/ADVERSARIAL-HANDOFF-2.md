# ADVERSARIAL HANDOFF #2 — ResusIQ "Instrument"

**For:** an external adversarial reviewer (Grok) assessing the whole project.
**From:** the orchestrating agent (Claude Fable) that directed the 2026-07-04 rebuild, 2026-08-07.
**HEAD at handoff:** `917feb1` on branch `redesign/instrument`.
**Gates at handoff (run 2026-08-07):** `npx tsc -b` exit 0 · `npm test` 128/128 (6 files) · `npm run build` green (~8 s, main chunk ~295 KB / ~87 KB gzip).

## 0 · Read this first: what you can and cannot see, and who to distrust

- **The GitHub remote is STALE.** `origin/main` sits at `89888be` — the pre-rebuild app. Everything below lives on the local branch `redesign/instrument` (28 commits ahead of origin, incl. 3 clinical/test commits on local `main`). If you are reading this ON GitHub, the branch has since been pushed for your benefit; diff against `origin/main@89888be` to see the whole rebuild at once. The live site (gogs1998.github.io/ResusIQ) still runs the OLD app until Gordon merges/pushes `main` — do not assess the deployed site as if it were this branch.
- **Distrust the author.** I (Fable) prescribed the redesign, arbitrated every review, wrote the verification doc (`docs/plans/2026-07-04-instrument-console-verify.md`), and personally drove the "verified live" claims. Builder-verifies-own-build is a structural bias; treat every ✅ in that doc as a claim to break, not a fact.
- **Distrust the reviews too.** Implementation was Claude Opus subagents; each task got a spec review + a quality review (also Opus, but same model family, same prompts authored by me). A whole class of bug — see §4 — survived TWO independent adversarial passes earlier the same day because the reviewers' scopes tiled imperfectly. Assume more such seams exist.
- **No human clinician has ever signed off any clinical content.** All clinical verification is LLM-vs-web-sources (RCUK/SDCEP/BNF/BSPED), done ≥3 separate times by different agents. This remains the headline caveat of the entire project.
- ResusIQ is decision support used by dental teams (possibly panicking non-clinicians) during real emergencies. **Rank findings by patient impact:** wrong dose / wrong branch / unreachable life-critical action = P0; a gate a stressed user can blow through = P0/P1; misleading dispatcher info = P1; confusing copy = P2; cosmetics = P3.

## 1 · Run it

Windows, `D:\VSCode\ResusIQ` (bash + PowerShell). Node 22.
- `npx tsc -b` — the REAL type gate. (`tsc --noEmit` checks NOTHING here — root tsconfig is `files: []` + references — and always passes. Documented trap, has bitten twice.)
- `npm test` — vitest, 128 tests incl. safety invariants + graph reachability + execution-level action tests.
- `npm run build` — production build (runs tsc -b). ⚠️ tailwindcss is PINNED at 4.3.2: 4.2.x's scanner throws `RangeError: Invalid code point` on Windows only (Linux CI stays green — that asymmetry hid a broken local build for weeks).
- `npx vite --host` — LAN dev server for phone testing. Insecure-origin `crypto.randomUUID` crash was fixed via `src/lib/ids.ts` (`newId()`); if you see UUID errors on LAN, that fix has regressed.

## 2 · What the product now IS (the 2026-07-04 rebuild)

The runner was promoted from a linear wizard to a **console with a guided thread**:
- **Theatre (dark) surfaces** during an active emergency — `ProtocolRunner`, `CPRMode`, `TriageWizard` — via a `.theatre` token scope; light "Ward" everywhere else (`src/design-system/tokens/colors.css`; colour is a strict 4-meaning language: red=life threat/999, amber=safety gate, green=confirmed done, blue=info/voice).
- **TimerStrip** (`src/components/console/TimerStrip.tsx`): elapsed clock (from `activeEvent.timestamp`), 999-called tick, drug-repeat countdown ("DUE NOW") — pure helpers in `src/lib/emergencyTimers.ts`.
- **EscapeRail** (`.../EscapeRail.tsx`): persistent "Unresponsive & not breathing? → CPR" on every runner/triage screen → `appStore.switchProtocol('cardiac_arrest')`. Deterioration→CPR is meant to be an architectural guarantee, not per-protocol wiring.
- **Deck** (`.../Deck.tsx`): in-runner bottom sheet — 999 dispatcher script (shared `CallScriptContent`, event-log-driven), drugs given, full event log. This is how the dispatcher script became reachable mid-emergency (it previously was not).
- **Step-action execution engine** (`appStore.runStepActions`, fired from ProtocolRunner's completion paths): `switch_protocol:` → `switchProtocol()`; `log:<label>` → typed event-log entries; `suggest:` → deliberate no-op. Before 2026-07-04, step `actions` were 100% dead data.
- Desktop presents the app as a centred 430px instrument on a dark backdrop (`src/index.css` @media ≥720px); phones untouched.

**Where truth lives:** clinical content `src/data/protocols.ts` (10 protocols) + `src/data/drugs.ts` (10 drugs) — **unchanged by the restyle commits; only `90ba8ff` touched them** (see §3). Flow: `src/store/appStore.ts`, `src/components/ProtocolRunner.tsx`, `CPRMode.tsx`. Tests: `src/__tests__/`. Design rationale: `docs/plans/2026-07-04-instrument-console-{design,plan,verify}.md`. Prior hostile brief (still instructive): `docs/ADVERSARIAL-HANDOFF.md`.

## 3 · The four non-negotiables, plus the new invariants

Locked as tests in `safety-rules.test.ts` — verify the tests bind the FLOW, not just strings (they were strengthened for exactly that reason; judge whether it worked):
1. Stroke → NO aspirin, anywhere, ever (only the "do not give" warning).
2. MI/chest pain → oxygen only when indicated (gated decision, 94–98% target, never routine high-flow).
3. Anaphylaxis → adrenaline IM q5min, NO fixed maximum (+ refractory-handover wording).
4. Seizure → SINGLE buccal midazolam, prolonged (>5 min) only, reachable only via decision gate.

New invariants introduced 2026-07-04 (each is an attack surface):
5. **FAST hard gate** (`90ba8ff`): ANY single positive face/arm/speech answer routes straight to `time_call` (999). The old soft `any_positive` recall question remains only on the all-negative path.
6. **Anaphylaxis deterioration loop** (`90ba8ff`): `continue_monitor` → `cardiac_arrest_check` → `start_cpr` (switch action). Previously orphaned.
7. **Event-log continuity across `switchProtocol`**: same `activeEvent`, elapsed clock never resets, one 'custom' "Switched to:" entry; guards: no-op without an activeEvent, no-op on same/unknown id.
8. Actions fire on step COMPLETION only — back-navigation must never re-fire them; a switch-action step suppresses linear navigation after the switch.

## 4 · Humility section: what earlier adversaries missed (assume the pattern continues)

On 2026-07-04, a hostile clinical pass and a hostile code pass ran the same morning (their briefs: `docs/ADVERSARIAL-HANDOFF.md`). Both were thorough; both **missed that step `actions` were never executed** — the clinical pass verified the data graph, the code pass verified components, and the dead wiring sat exactly between their scopes. It surfaced only when an implementer went looking for code to reuse. Corollaries for you:
- Hunt the SEAMS: store↔component, data↔renderer, test↔runtime, PWA/service-worker↔deploy.
- A green test proves what it asserts, nothing more. The suite grew 42→128 in one day, written by the same agents that wrote the code under test. Look for tests that mirror implementation rather than intent.
- "Verified live" = one agent, one desktop Chrome, one afternoon. No real iPhone, no installed-PWA session, no screen reader, no gloved hands.

## 5 · Highest-value attack surfaces (freshest & least-verified first)

1. **The action engine's ordering and races.** `runStepActions` → `switchProtocol` → suppression of linear nav via closure-captured `currentStep`. Attack: rapid double-taps, voice "next" racing a tap, timer auto-advance landing on a switch step, back-nav around action steps, a decision answer whose target step ITSELF carries actions. Any path that fires an action twice (double drug/999 log = medico-legal corruption) or zero times (dead-end).
2. **TimerStrip truthfulness.** `nextDoseCountdown` picks the LATEST `drug_given` for ONE drug. Attack: protocols with multiple repeat-interval drugs; a second adrenaline logged from the Deck vs the step path; clock skew; the "DUE NOW" boundary; what the strip shows after switchProtocol into a protocol whose tracked drug differs.
3. **Deck 999 script vs reality.** `getPatientState` still hardcodes "FAST positive" (stroke) and "on steroids" (adrenal) from protocol id, ignoring in-flow answers — known residual, but PRESSURE-TEST the rest: after a mid-emergency switch, does the script describe the current condition or the original one? Is every drug line strictly event-log-gated?
4. **EscapeRail edge cases.** Hidden inside cardiac_arrest and on steps whose action switches there — can a user be stranded anywhere with no CPR path? Triage uses an `onEscape` override (pre-emergency `startEmergency`) — does the guard/override interplay hold on every render path?
5. **Entry-source skip + switch skip.** `firstActionStepIndex` skips leading `recognition:true` steps on tile entry AND on every switch. Verify no protocol's diagnostic gate (adrenal `steroid_check`, stroke FAST, choking severity) is or ever could be recognition-flagged; verify triage/library entries still show recognition.
6. **Clinical content, from scratch.** Re-verify every dose/route/band in `drugs.ts` and every branch in `protocols.ts` against current RCUK/SDCEP/BNF/BSPED as if nobody ever had. Known open completeness items: midazolam 3 mo–1 yr band absent; salbutamol child dose free-text. The paediatric hydrocortisone bands (<1y 25 / 1–5y 50 / 6y+ 100 mg) follow BSPED (PMC10646833) — the Australian RCH tables differ; UK authority is BSPED, don't "correct" toward RCH.
7. **Wording-freeze claims.** The restyle claims byte-identical dispatcher/handover wording (CallScript/SBAR) and behaviour-identical CPR timing. Diff `89888be → 917feb1` yourself for those files.
8. **PWA/service-worker staleness.** The old app's SW precaches aggressively. When the new build deploys to the same origin, verify update flow: can a dental practice's installed PWA keep serving the OLD shell (old bugs, old flows) indefinitely? What is the update UX mid-emergency?
9. **A11y and stress ergonomics.** role="alert" announcer, focus-visible on dark, deck keyboard flow, 100dvh shells under iOS Dynamic Type / text zoom (home got a scroll fallback — did every Theatre screen?), glove-sized hit targets, TTS overlap with the metronome.
10. **State durability.** Mid-emergency reload loses `activeEvent` (known, open). Attack adjacent: persist version/migrate vs the store's new fields; two tabs open simultaneously; endEmergency during an open Deck; training mode flag leaking into a real emergency.

## 6 · Known residuals — don't re-flag as discoveries, DO pressure-test the reasoning

- Task 9 open: reworded near-duplicate decision copy (e.g. FAST hero + support restate each other) — content edit awaiting clinical sign-off.
- Voice answer-selection on decisions is DELIBERATELY tap-only until native STT (Capacitor phase) — judge whether that's the right call.
- `on_timer_end_next` is documentary at runtime (advance uses `next`/sequential); a test pins it equal to the effective target.
- Street/clinician modes are design-only (Phase 3). Conversational voice/LLM co-pilot is the north star; architecture rule: LLM = mouth/ears, protocol graph = brain.
- MHRA medical-device classification / DCB0129 clinical-safety documentation: UNASSESSED. For a UK clinical tool this may be the largest non-code risk in the project.
- 999 sub-label contrast ≈3.85:1 (supplementary text); decision buttons deliberately not radios (commit-on-tap).

## 7 · Deliverable

For each finding: file:line, the exact contradiction (with citation for clinical claims), a concrete failure scenario with a real user in it, severity P0–P3 by patient impact, and — where you can — the minimal fix. Separately: list what you CONFIRMED sound, so coverage is legible. If you find nothing at P0/P1, say so plainly; do not manufacture severity.

---

## 8 · Independent gate verification (added by a second agent, 2026-08-07)

Appended by a different Claude instance than the author, at the user's request, precisely because §0 says to distrust the author. I re-ran the gates §0 claims rather than repeating them:

| Claim in §0 | Independently re-run | Result |
|---|---|---|
| `npx tsc -b` exit 0 | yes | **CONFIRMED** — exit 0 |
| `npm test` 128/128 (6 files) | yes | **CONFIRMED** — 128 passed, 6 files |
| `npm run build` green | yes | **CONFIRMED** — build OK, PWA precache 34 entries / 623.25 KiB |

Two corrections to §0–§1, both minor but they are exactly the kind of claim this document tells you to break:

1. **"tailwindcss is PINNED at 4.3.2" is inaccurate.** `package.json` declares `"tailwindcss": "^4.3.2"` — a caret range (≥4.3.2 <5.0.0), not a pin. The stated Windows-only `RangeError` failure was in 4.2.x, which the range does exclude, so the immediate breakage is not reachable; but a fresh `npm install` can float to any future 4.x, and the lockfile is the only thing actually holding the version. If reproducible builds matter here, this is a real (P3) supply-chain/repro gap, and the doc's own wording would have misled you.
2. **Precache is 34 entries / 623.25 KiB** on this build — worth knowing before you attack §5.8 (service-worker staleness), since it bounds what an installed PWA can keep serving.

**Access note (read before you start):** at the time this addendum was written, `redesign/instrument` existed **only locally** — `origin` had just `main`, `resusiq-redesign`, `resusiq-remediation-batch`, `resusiq-ux-rework`. §0's conditional ("if you are reading this on GitHub, the branch has since been pushed") was therefore FALSE at authoring time. If you cannot see commits after `89888be`, you are looking at the pre-rebuild app and **nothing in §2–§6 applies to what's in front of you** — stop and ask for the branch before reviewing, rather than reviewing the wrong tree.

Everything else in this document is the author's claim, not mine, and remains yours to break.

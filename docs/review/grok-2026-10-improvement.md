# ResusIQ — improvement review

**From:** Grok · **Date:** 2026-10-08
**Tree:** `main` @ `43eed3d` (handoff 4 on top of `6e28c8e`), reviewed on branch `grok/2026-10-review`
**Scope:** Track A of `docs/HANDOFF-4-GROK.md`. Answers A1–A7. Nothing here is a proposal to edit `src/data/`.

## Gates, re-run on this clone

| Gate | Result |
|---|---|
| `npx tsc -b` | exit 0 |
| `npm test` | **21 files, 381 tests**, all passed |
| `node scripts/verify-encoding.mjs` | exactly the two known doc false positives (`docs/design-handoff/design-rework.md`, `docs/usability-review.md`) |
| `npx vitest run src/__tests__/safety-rules.test.ts` | **11 tests**, passed |
| `npm run build` | exit 0. `index` 315.54 kB (gzip 92.30), `genai` 249.40 kB (gzip 51.01), `AIAssistant` 139.28 kB (gzip 46.06). Precache **36 entries / 683.38 KiB**. |

The file count is 21. The forks-pool failure mode did not recur.

## Verdict

The agreed design is the right product, and it has not been built. Phase 0 did what it was supposed to do, which is why the app still looks like the thing the owner already rejected. Do not start a fourth reskin, and do not spend the next release only on clinical wording.

Ship a thin slice of the design next: the collapse door, and a guide-mode step screen with three controls. Do the RCUK 2025 wording in parallel, not in front of that. Delete the Gemini assistant now. It is unreachable, it tells a model to diagnose, and it is the only reason `@google/genai` is in the build.

Two amendments to the design, both small, are in A1. One August finding is still open and has fallen off the known-open list: the 999 script still invents the patient's state (F7). That should be fixed before the infant choking branch ships, because the script currently says abdominal thrusts are being given.

---

## A1. Is the agreed design the right answer?

Yes. `docs/plans/2026-09-20-pwa-rebuild-design.md` is still the right shape: assessment before diagnosis, one step screen with a density switch, three tabs, Ask as a lookup.

I re-read the home and the runner against that document rather than against the August screenshots.

The home is better than the August review described. Cardiac arrest is now a full-width filled control (`EmergencyDashboard.tsx` around the hero button), Call 999 is a tint rather than a second filled red, and Library / SBAR / Reports / Training are real targets. That addressed the worst of UX1. It did not change the entry model. There are still ten tiles (`src/lib/conditions.ts` lines 38–47), including cardiac arrest, fainting, low blood sugar and adrenal crisis, which the design is right to take off the door because a collapsed patient does not look like a diagnosis. Under them sits "Not sure? Answer a few questions", which is still the long triage wizard. The fast-path inside that wizard is fixed (A7, F3). The wizard being the way in for "I don't know" is the product problem the door exists to remove.

The step screen is still the admin console from UX2. On a drug step the operator gets a back control, a step counter, a progress bar, the timer strip, a "tap to hear" control, an adult dose panel, a warning line, Confirm given, Call 999, mute, a mic when voice commands are supported, the escape rail, and the deck (`ProtocolRunner.tsx` header from line 587, dose panel at line 763, footer from line 954). Guide mode in the design deletes most of that. I do not have a cheaper information architecture that gets to "this feels finished". A different paint on these same controls will produce the same owner reaction as the last three reskins.

Two amendments, argued against the design document specifically.

**Amendment 1. "Two taps to CPR" currently lands one screen short of CPR.** The design says a "not breathing" answer lands on `cardiac_arrest` / `start_cpr`, and calls that two taps to CPR. `start_cpr` is an instruction whose `next` is `cpr_mode` (`protocols.ts` lines 79–83). The metronome is the screen after that. The same gap is already in the shipped escape rail: the rail says "Tap to start CPR now" (`EscapeRail.tsx` line 74) and `DETERIORATION_LANDING` sends it to `start_cpr` (`appStore.ts` lines 126–128), not to `cpr_mode`. F1 from August is fixed as specified and is still one tap short of the promise on the control. When the door is built, land the not-breathing answer on `cpr_mode`, and move the "30 compressions, fetch the defibrillator, 999" line onto that screen. That is a step-id landing change. Say so at review time: anyone mid-emergency on `start_cpr` at the moment of deploy must be archived, not resumed onto `cpr_mode`, under the v4 rule.

**Amendment 2. The guide-mode mock shows one adult dose.** The mock's detail line is "500 micrograms". The runner already does that, at 29px (`ProtocolRunner.tsx` line 771), with the child bands behind "full card". A practice that sees children will read the adult dose first, in the mode the design makes the default. Clinician mode's drug card is the right place for the full bands, but only if the guide-mode line does not assert a single adult figure whenever `child_dose_text` exists. Show the bands that are already in `drugs.ts`, or show no number until someone has picked a band. Picking the band, and the words of that question, need the clinical reviewer. Displaying text that is already in the drug record does not.

I would not replace the three-tab IA, the hidden-during-emergency rule, or "Ask is a lookup". Those are the design.

## A2. Clinical content before the visible rebuild?

No. Not as a sequence that blocks the owner from seeing a different app.

The plan's real ordering constraint is Phase 5: clips are hashed from frozen phrase text, so the RCUK 2025 wording has to land before anyone renders audio (`2026-09-20-pwa-rebuild.md`, Phase 5). That constraint does not apply to layout. A guide-mode chrome pass reads `step.show`; it does not care whether the oxygen sentence has been rewritten yet. Doing all of Phase 1 first spends another release on changes the owner has already said they cannot see.

Split Phase 1 instead of blocking on it.

- In parallel with the door and the guide screen: the wording tasks (cardiac oxygen line, chest-pain oxygen rework, references, the midazolam row). They will touch strings the new screen displays. Touching them twice is cheaper than shipping another invisible release.
- Before the door merges: clinical ratification of the cause-check branch targets. The plan already says this. The door's "diabetic / fit / eaten or stung / steroids / none" routing is a clinical change even though the code that paints the question is not in `src/data`.
- Before the infant choking branch (plan task 1.1): fix the 999 script, below. The script tells the dispatcher "Back blows and abdominal thrusts being given" for every choking emergency (`CallScript.tsx` lines 85–86). An infant branch whose whole point is that abdominal thrusts are never used will make that sentence a new falsehood on the day it ships.

The anaphylaxis holding loop still has no route back to `repeat_adrenaline` (`protocols.ts` lines 257–272). That stays a Phase 1 clinical item, as already logged. It does not block the door.

## A3. Is removing the Gemini assistant the right call?

Yes. Remove it now. It is not on the emergency path, and it should not become the Ask tab.

What the chunks actually do:

- The emergency cold load is `index` (315.54 kB / 92.30 kB gzip) plus CSS (51.17 / 10.34) plus the Latin webfonts the CSS requests. `@google/genai` is a manual chunk (`vite.config.ts` lines 131–133) and both `genai-*.js` and `AIAssistant-*.js` are excluded from the precache (lines 75–77). A team that never opens that screen does not download them.
- Nothing in `src/` navigates to that screen. `App.tsx` line 59 renders `AIAssistant` for `currentScreen === 'ai_assistant'`. The only other mention of that screen id in `src/` is the type union. Narration does not call Gemini. `geminiTTS` is gone. The comment in `vite.config.ts` that says a present API key makes `speak()` take the Gemini path is stale.
- The component that remains is the wrong product. Its system prompt tells the model to "diagnose the most likely emergency and set the protocol" (`AIAssistant.tsx` line 50), and the dose list it injects is a string the model is asked to copy. That is the opposite of design section 5, and it is the opposite of "the graph is the brain". The prompt also still says Resuscitation Council UK 2021 and an oxygen threshold that Phase 1 is about to change. Dead code that diagnoses is not a harmless leftover.

Removing it means deleting `AIAssistant.tsx`, the lazy route, the `@google/genai` dependency, and the `PROTOCOL_MAP` export. `data-integrity.test.ts` lines 513–520 import that export. Move the map out or delete the describe block with the component. `src/lib/audio.ts` (`AudioStreamer`, `ScriptProcessorNode`) is only there for the live session; it goes too if nothing else imports it. Check before deleting.

What else is carrying weight it should not:

- The precache is 683 KiB with those two chunks already excluded. A large part of the rest is self-hosted Inter (five weights) and IBM Plex Mono (two), including subsets the precache then ignores (`fonts.css` imports the whole family; `globIgnores` drops Cyrillic, Greek, Vietnamese and latin-ext). Worth a Latin-only import when someone is next in that file. It is not why the app feels unfinished.
- `motion` is pulled in by `AIAssistant.tsx` line 23. It leaves the build with the assistant.
- Do not split `protocols.ts` out of `index`. The emergency path has to run offline. 92 kB gzip for the runner plus the ten protocols is the product, not a mistake.

## A4. A cheaper change than the Phase 3 rebuild?

Yes, and it is a cut of Phase 3, not a different idea.

Most of the value the owner can feel is two screens:

1. **The door** (plan tasks 2.1 and 2.2). One primary, "They've collapsed", and six obvious tiles. Cardiac arrest, syncope, hypoglycaemia and adrenal crisis leave the grid and stay in Learn.
2. **Guide chrome on the existing runner**, not a second component and not the clinician sheet yet. For `uiMode === 'guide'` (default), do not render the progress bar, the step counter, the timer strip's empty states, the mic, or the deck. Leave the primary action, Call 999, and the escape rail. Decisions stay as the large answer buttons, which are already the right control. Drug steps read "Given".

That is the design's own "Guide is Clinician with things taken away", shipped before Clinician exists. The density switch can be a boolean around the blocks that are already in `ProtocolRunner.tsx`. A new `StepGuide.tsx` can wait until the boolean has survived one release.

Do not spend this slice on Ask, Learn, the end-of-emergency summary, or pre-recorded clips. Those are real and they are later. The summary (plan task 3.4) is the right fix for "ending dumps you on the home screen", and it can follow the door by a release without making the door feel unfinished.

The home work that already shipped (hero tile, tinted 999, real tool targets) should stay. The door replaces the grid; it should not throw away the colour discipline.

## A5. Cold start on a four-year-old iPhone

I measured the payload. I did not measure that phone, and I did not have surgery wifi.

Accountable compressed weight for the first load, from this build:

| Piece | Raw | Gzip |
|---|---|---|
| `index-*.js` | 315.54 kB | 92.30 kB |
| `index-*.css` | 51.17 kB | 10.34 kB |
| Inter Latin, five weights | about 121 kB of woff2 | already compressed |
| IBM Plex Mono Latin, two weights | about 30 kB of woff2 | already compressed |

Call the critical transfer about 250 kB, then the service worker fills an offline precache of 683 KiB uncompressed. The Gemini chunks are not in either number.

A transfer of that size is not why the app feels like an MVP. The tap count is. I would not open a performance project ahead of the door. The measurement that would change that is a Safari timeline on an iPhone 14 (the four-year-old phone as of this month) loading the installed PWA on the practice's wifi: time to first paint, time to the first spoken word, time from tile to metronome. The simulator launch in the iOS review is a current iPhone 16 Plus image on a fast Mac, and it says nothing about this.

## A6. Where is coverage thin for Phases 1–3?

The suite is in better shape than the August "tests mirror the implementation" warning. Of 381 tests, 19 are in `layoutInvariants.test.ts`, which is the source-grep file. That is 5 percent, and it is the right tool for "no component sets `height: 100dvh`". The other 362 tests exercise the store and the runner, including the seams that used to be untested: resume by step id, the 999 confirm replacing a drug confirm, double-submit, dose ceilings, the deterioration landing, the monotonic seizure clock, the holding footer.

Thin, relative to the work ahead:

- **`CallScript.tsx` has no test.** A grep of `src/__tests__` for `FAST positive` and `CallScript` finds nothing. F7 below is unbound. This is the gap to close first, because it is a current behaviour rather than a future screen.
- **The interval-timer restart is locked in as the current contract.** `ProtocolRunner.seizureClock.test.tsx` has a test whose name is that the adrenaline reassess still restarts. A fix has to change that test, and it still needs the clinical sign-off already logged under plan task 0.2. The test is doing the right thing by not pretending the bug is fixed.
- **Nothing captures a dose band.** `logDrugGiven` accepts `doseText` (`appStore.ts` lines 582–588) and the runner calls it without one (`ProtocolRunner.tsx` line 371). `drugLog.ts` lines 9–13 say so in the comment, and the deck tests assert the honest fallback. There is no test that a confirm writes the band, because the product never asks.
- **Phase 2 and Phase 3 have no code, so they have no tests.** The plan's failing-test-first tasks are the right way to add them. The ones I would not let slip: each collapse answer lands on a named protocol and step id; no path reaches CPR without both questions; guide mode renders three controls on an instruction step and does not render the deck. Those are in the plan. Write them against the slice in A4, not against the full six phases.
- **`safety-rules.test.ts` binds the four rules at the data layer**, plus a handful of flow edges. It does not bind screen copy. Phase 1's wording tasks need their own assertions, taken from the prescription file, or a text-only clinical edit can pass the tripwire while saying the wrong thing. The tripwire going red is still a stop. It going green is not a content review.

## A7. August findings: what was closed narrowly, and what is still open

I re-read F1–F19 against this tree. These are not new findings. They are a check on the closures.

Closed properly, and I am not re-opening them:

| Id | What I saw |
|---|---|
| F1 | `switchProtocol` to cardiac arrest lands on `start_cpr`, not step 0. Tested in `appStore.test.ts`. The fresh tile still starts at `safety`, which is what the write-up asked for. The remaining one-tap gap is amendment 1 in A1, not a failed fix. |
| F2 | `max_doses === 1` refuses in `logDrugGiven` and the runner withdraws the confirm. Adrenaline still has no `max_doses`. |
| F3 | `TriageWizard.tsx` lines 51–58 fast-path on the answer just given, including this tap, and pass `landOn: 'start_cpr'`. The old dead check is gone. |
| F4 | No step action contains `log:999_called`. `log999Called` is deduped and only runs from a human assertion. A data-integrity test holds the absence. |
| F5 | `advancingFromRef` is keyed by protocol and index, and it is cleared when the position changes, so Back does not swallow the next tap. The comment at `ProtocolRunner.tsx` lines 249–256 records the first version of this fix getting that wrong, and the correction. |
| F9 | The seizure clock is an anchored wall time. Re-entering the step does not restart it. |
| F10 | CPR's X asks first (`CPRMode.tsx` lines 136–142). The deck is mounted in CPR mode (line 291). |
| F11 | Glucose and GTN stay overridable on purpose (`doseLimits.ts`: a cap above 1 is an escalation, not a ban). That matches the clinical ruling. I am not re-opening it. |
| F12 | Training mode is persisted, drills are stamped at start (`appStore.ts` line 356), and `TrainingDialGuard` sits over `tel:999`. |
| F13 | The active emergency is persisted and resumed by `currentStepId`. v2/v3 are archived. |
| F6 | Not closed wrongly. The infant band August asked for is present, including a 3-to-6-month row with a hospital-only caution (`drugs.ts` lines 231–237). The later prescription (section J) is stricter: drop that row and give no dose under 6 months. It is unapplied, which is Phase 1, not a bad closure. |

Still open, and not on the handoff's known-open list:

### F7 · The 999 script still invents the patient. P1

**Where:** `CallScript.tsx` lines 62–93, `getPatientState`.

**What is wrong:** Stroke always says "FAST positive." Adrenal crisis always says "Patient on steroids." Asthma always says "Severe asthma." Choking always says "Back blows and abdominal thrusts being given." Hypoglycaemia always says "Known diabetic." Drug lines for adrenaline, salbutamol and aspirin are correctly gated on the event log. These five are not.

**Why it matters:** This is what a receptionist reads to the dispatcher. A stroke protocol that was opened and then walked down the all-negative path is still `activeProtocol.id === 'stroke'`, so the script asserts a FAST-positive stroke. When the infant choking branch lands, the thrusts sentence becomes a false account of treatment that the protocol has just forbidden.

**Cheapest fix:** Build the sentence from the event log and the decision answers already stored as `step_completed` labels. If the log does not contain a positive FAST answer, do not say FAST positive; say "suspected stroke" only. Same for steroids, severity, thrusts and "known diabetic". No change to `src/data`. Add the test that is missing (A6) before changing the strings, with one fixture per protocol that must not over-claim.

**Needs `src/data`?** No.

Closed too narrowly:

### F8 · The record no longer lies about the dose, and it still doesn't contain one. P2 residual

**Where:** `src/lib/drugLog.ts` lines 9–13; `ProtocolRunner.tsx` line 371; `appStore.ts` lines 576–588.

**What is wrong:** August's bug was the deck reading `adult_dose_text` back to the paramedic, so a child given 150 micrograms was handed over as 500. That lie is gone. The deck says "Dose per age band — confirm with the person who gave it." `logDrugGiven` has a `doseText` argument, and nothing passes it.

**Why it matters:** The handover is honest and incomplete. The person who gave the dose may not be the person holding the phone when the crew arrives. The screen they gave it from still leads with the adult figure (A1, amendment 2).

**Cheapest fix:** Inside the guide-mode slice, when a drug has child bands, require a band choice before Confirm given, and pass that band's existing text as `doseText`. The words of the choice need the clinical reviewer if they are new. The strings already on the drug do not.

**Needs `src/data`?** Only if the reviewer wants new wording. Recording the existing band text does not.

### F19 · "Given" still confirms a drug by voice. Not closed, and not newly wrong

`ProtocolRunner.tsx` lines 476–481. "done", "given" and "confirm" call `handleNext`, which confirms a drug step. Decisions stay tap-only. The August note was that a noisy surgery can confirm a dose by accident. That is still true, and it is still the right tradeoff until native recognition is good enough to trust with less (see the iOS review, B5). Half-duplex is in place (lines 501–513): the mic is stopped while the app is speaking. I am not raising this as a new defect. Do not let the guide-mode slice delete the primary button in favour of the mic.

### F18, F14, F15, F16

`role="alert"` still fires on every step (`ProtocolRunner.tsx` lines 665–668). Leave it until someone runs VoiceOver on a device; I could not. The assistant is F14, and A3 is the closure. The service worker is still `autoUpdate`, so a practice can be on an old shell until the next launch. That is acceptable for this app and not worth a banner project. Tailwind is still `"^4.3.2"` in `package.json` line 44. The lockfile is the pin. Leave it.

## Corrections to the known-open list

I am not re-reporting these. Three of the logged items are slightly different from the sentence in the handoff.

- **Training flag.** A drill is stamped `outcome: training_drill` at start (`appStore.ts` line 356). `closeUnresumableEvent` then overwrites `outcome` with `unresumable` (line 279). The gap is real, and it is only the unresumable path: a drill the app could not resume is indistinguishable from a real episode the app could not resume. A drill that ends normally keeps the stamp.
- **`bg-gray-800/700`.** Not in `src/` or the stylesheets. I searched for `gray-800` and for a Tailwind opacity written as `/700`. Treat it as already gone.
- **The other logged items are still as written.** No React error boundary. `localStorage` writes are unguarded and `eventHistory` has no cap. The eight `min-h-screen` shells are still there (App loading state, CallScript, SBAR, Training, Practice setup, the runner's empty state, Reports, Library). Anaphylaxis `continue_monitor` has no third answer back to `repeat_adrenaline`. Back onto a confirmed adrenaline step re-offers Confirm given, because adrenaline has no dose ceiling and the confirm guard only blocks a second tap in the same frame. CPR mute reflects the store's mute flag, not an interrupted audio session. The on-device audio checklist has not been done; this Mac did not do it either.

## What I could not verify

- The on-device checklist in the handoff: installed PWA, narration, metronome, background ten seconds, both still audible. The unit tests show the unlock runs. They do not show that iOS accepts it.
- A four-year-old iPhone on surgery wifi. A5 is a payload measurement.
- VoiceOver against `role="alert"` on a real step change.
- Whether a practice's installed PWA is actually updating. I read the Workbox config and did not watch an update on a device.

What I would need: one iPhone that has seen a real iOS update cycle, the practice wifi or a throttled profile, and twenty minutes on the checklist already written in the plan. No further code reading will answer it.

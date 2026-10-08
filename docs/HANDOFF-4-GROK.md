# ResusIQ — Handoff 4: improvement review + iOS assessment

**For:** Grok (local agent) · **Written:** 2026-10-08 by Claude Opus 5
**Repo state:** `main` = `6e28c8e`, deployed and live at <https://resusiq.app>

**Your workspace — clone it fresh on the Mac:**

```bash
git clone https://github.com/gogs1998/ResusIQ.git
cd ResusIQ && npm install
```

Everything you need is in the repo; this document is `docs/HANDOFF-4-GROK.md`. Do not work in
`D:\VSCode\ResusIQ` — that is the owner's Windows working tree on a UNC share where git cannot
write objects. Being on a Mac matters: it unblocks the whole of Track B (§6).

---

## 0. Your remit

Two tracks. Both end in a written assessment, not a merge.

- **Track A — improve the app.** The owner's verdict on the product, after three reskins and a
  shipped safety phase, is still that it does not feel finished. Tell us what to do about it.
- **Track B — assess the iOS port.** Capacitor groundwork exists; the native project does not.
  Say whether to go, how, in what order, and what it costs.

You may read anything, run anything, and prototype on a branch. Nothing merges to `main` without
going through the review pipeline described in §7, because `main` auto-deploys to an app that UK
dental practices use during real medical emergencies.

---

## 1. Read these first

Do not re-report what these already record. If you disagree with a conclusion in one of them,
argue against it explicitly rather than presenting it as a new finding.

| File | What it is |
|---|---|
| `docs/review/grok-findings.md` | **Your own review, 2026-08-07.** F1–F19, UX1–UX5. Every P0 and P1 was fixed. |
| `docs/ADVERSARIAL-HANDOFF.md`, `-2.md` | Earlier adversarial handoffs, incl. a verification addendum. |
| `docs/plans/2026-09-20-pwa-rebuild-design.md` | **The agreed target design.** Assessment-first front door, Guide/Clinician modes, three tabs. Validated with the owner in conversation. |
| `docs/plans/2026-09-20-pwa-rebuild.md` | The phased plan. **Phase 0 is done and shipped. Phases 1–6 are not started.** Read the gotchas header. |
| `docs/clinical/rcuk-2025-prescriptions.md` | Clinical wording already prescribed against RCUK 2025, **not yet applied** — that is Phase 1. |
| `docs/clinical/2026-09-20-phase0-ui-copy-review.md` | The Phase 0 UI-copy rulings (holding lines, record-closed entry, resume banner). |
| `docs/clinical/2026-09-21-anaphylaxis-landing.md` | The anaphylaxis reorder ruling, incl. one hard rule you must not break (§3). |
| `docs/ios-plan/strategy.md`, `capacitor-setup.md` | June 2026. Partly stale — see §6 for what changed. |
| `CLAUDE.md` | Project rules and the four clinical non-negotiables. |
| `HANDOFF.md` | Older technical brief; background only. |

---

## 2. State as of today

**Shipped 2026-09-20 (Phase 0)** — safety and plumbing, deliberately invisible:

- Persistence was **dead in the live app from 15 Aug to 20 Sep**: an explicit `storage: undefined`
  in the Zustand persist config disabled the middleware entirely, so practice details and every
  emergency record were wiped on each reload. Fixed.
- An emergency now survives a reload: step, event log, drug times and timer anchors are persisted
  and resumed, with a `Resumed — record started HH:MM` banner. An emergency that cannot be resumed
  is archived with a dated "Record closed" note instead of being discarded.
- iPhone audio: gesture unlock on first tap, re-arm on return from background, including Safari's
  `'interrupted'` context state and the case where `resume()` resolves without resuming.
- The three monitoring loops (chest pain, anaphylaxis, stroke) got an honest footer, a
  `Check them again` primary and an end-emergency affordance, and now log once per lap, not twice.
- Layout: shells at `height: 100%` rather than `100dvh`, scroll reset on step change, safe-area
  padding, a real CPR landscape floor, and `build.cssTarget` pinned so Lightning CSS stops
  emitting range-syntax media queries that iOS 16.0–16.3 drops whole.
- Training mode persists but can no longer outlive its drill (it was about to put a confirm dialog
  in front of a real 999 call); drills are stamped and labelled in the record.

**Shipped 2026-09-24** — from the owner's device reports:

- Narration picks one British voice deterministically and holds it, instead of taking whatever
  iOS happened to list first; the first line waits up to 1 s for the voice list so it matches the
  rest; a mute pressed during that wait is honoured. `src/lib/voiceChoice.ts`, `src/hooks/useSpeech.ts`.
- The Anaphylaxis tile now lands on the adrenaline dose card. `recognition` and `stop_trigger`
  were deleted as screens and folded into detail lines; 14 steps → 12. Clinically ratified.
- That reorder exposed a worse bug: **resume was keyed by step index**, so a team mid-emergency
  at deploy time could resume onto a different step — one of which skipped the dose card. Resume
  is now keyed by `currentStepId` (persist v4); emergencies saved under v2/v3 are archived rather
  than guessed at.

**Gates.** Run all of these from your clone before claiming anything passes:

```bash
npx tsc -b                               # exit 0. NOT `tsc --noEmit` — that checks nothing here
npm test                                 # must report 21 files / 381 tests — verify the FILE COUNT
npm run build
node scripts/verify-encoding.mjs         # only 2 known doc false positives may appear
npx vitest run src/__tests__/safety-rules.test.ts   # 11 tests, the clinical tripwire
```

---

## 3. Rules of engagement

1. **The four non-negotiables** (CLAUDE.md): stroke — no aspirin; MI — oxygen only when indicated;
   anaphylaxis — adrenaline every 5 min with no in-flow maximum; seizure — single buccal
   midazolam. `src/__tests__/safety-rules.test.ts` is the tripwire. If it goes red, stop.
2. **`src/data/protocols.ts` and `src/data/drugs.ts` are clinical, not code.** Do not edit them.
   Propose changes as a prescription: exact replacement text, exact `next` rewiring, and a
   citation to RCUK / SDCEP / BNF. A clinical reviewer ratifies before anything is applied.
3. **Never put a 999-confirm on a drug step.** That footer *replaces* the "Confirm given" control,
   so the dose would be given and never recorded. See `docs/clinical/2026-09-21-anaphylaxis-landing.md`.
4. **Resume is keyed by step id.** If you propose deleting or renaming a step id, say so loudly and
   name the migration consequence.
5. **`ProtocolRunner` must stay reachable** while an emergency is active. No navigation may hide it.
6. **Do not change `pool: 'threads'` in `vitest.config.ts`.** The forks pool silently dropped test
   files and printed a green summary. Always check the file count, not the pass line.
7. **UTF-8.** Curly quotes and em dashes in clinical strings are intentional. Never write these
   files with PowerShell `Set-Content` — it has corrupted them twice. `verify-encoding.mjs` must
   stay at exactly the two known documentation false positives.
8. **Branch, don't push `main`.** `main` deploys to the live app on push.

---

## 4. Known-open — already logged, do not re-report as findings

- **Interval countdowns restart on resume.** `TimerDisplay` keeps interval `timer_block` countdowns
  in component state; only monotonic steps use persisted anchors. A reload at 4:50 into the
  anaphylaxis 5-minute reassess hands back a fresh 5:00, delaying the adrenaline repeat prompt.
  Needs clinical sign-off because it touches the q5min rule. Logged under Task 0.2 in the plan.
- **No React error boundary anywhere.** Any render throw mid-emergency is a white screen.
- **`localStorage.setItem` is unguarded** against `QuotaExceededError`, and `eventHistory` has no
  cap. Dormant while persistence was broken; live now.
- **Eight screens still use `min-h-screen`**, so their `overflow-y-auto` panes are inert and long
  content clips inside the ≥720px desktop frame with no scrollbar.
- **Anaphylaxis `continue_monitor` has no route back to `repeat_adrenaline`** on biphasic
  recurrence short of arrest. RCUK 2021 expects a repeat on deterioration. Phase 1 clinical item.
- **`EmergencyEvent` has no training flag**, so a drill closed as unresumable is indistinguishable
  from a real episode in the archive. Phase 3/4 backlog.
- **Back from the 999 screen onto a confirmed dose step** re-offers a live "Confirm given", which
  double-logs and resets the repeat countdown. Pre-existing class, now one tap from the busiest
  screen.
- **CPR mode has no "sound is off, tap to restore" affordance** between an audio interruption and
  the next tap.
- **A `bg-gray-800/700` class** exists somewhere in the components — almost certainly a typo for `/70`.
- **The on-device audio check has never been done.** Install the PWA on an iPhone → start an
  emergency → hear narration → start CPR → hear the metronome → background 10 s → return → confirm
  both still work. Unit tests prove priming fires, not that iOS accepts it. If you can get this
  done or scripted, it is the single most valuable unverified thing in the project.

---

## 5. Track A — what "improve" means here

Honest framing, so you are not solving the wrong problem. The owner has said, across three
redesigns, that the app is "too complicated" and looks like an MVP. The 2026-08-30 audits explain
why: every reskin restyled the same complexity — twelve tap targets on a drug step, seven taps
from the cardiac tile to compressions, and an entry model that asks a panicking person to diagnose
before the app will help. Phase 0 fixed none of that on purpose; it fixed the things that would
have lost a record or stayed silent. The owner's reaction to the Phase 0 deploy was "it looks the
same", which was correct.

So the visible work is Phases 2–3 and it has not started. Questions, in the order I care about:

- **A1.** Is the agreed design in `2026-09-20-pwa-rebuild-design.md` the right answer — collapse
  door, two modes, three tabs? If you think there is a cheaper or better path to "this feels like a
  finished clinical tool", argue against that document specifically.
- **A2.** The plan does clinical content (Phase 1) before the visible rebuild (Phases 2–3). Is that
  the right sequence, given the owner's priority is layout and workflow?
- **A3.** Bundle: `index` 315 KB, plus lazy `genai` 249 KB and `AIAssistant` 139 KB. The design says
  the Ask tab is a **data-only lookup over the verified drug and protocol records, never generated
  text**. That makes the Gemini assistant dead weight. Is removing it now the right call, and what
  else is carrying weight it should not?
- **A4.** The step screen is the product. Phase 3 rebuilds it with a density switch. Is there a
  cheaper change that lands most of the value?
- **A5.** Cold-start and runtime behaviour on a four-year-old iPhone on surgery wifi. Measure, don't
  estimate.
- **A6.** 381 tests, of which roughly 5% are source-grep assertions. Where is coverage thin for the
  Phase 1–3 work ahead?
- **A7.** Anything from your August findings you think was closed wrongly or closed too narrowly.

---

## 6. Track B — iOS

### Already wired, do not rediscover

`@capacitor/core`, `/cli`, `/ios`, `@capacitor-community/keep-awake` and
`@capacitor-community/speech-recognition` are in `package.json`. `capacitor.config.ts` exists
(`appId` is still the placeholder `com.resusiq.app`). `src/lib/platform.ts` exposes `isNative` and
`voiceCommandsSupported`; `src/lib/wakeLock.ts` and `src/hooks/useSpeech.ts` already branch on
native. The JS seams are in place.

**Missing:** the `ios/` native project (`npx cap add ios` — Mac only), Apple Developer enrolment,
and the native swaps themselves.

### What changed since the June strategy

- **The browser Gemini Live voice is gone from the emergency path.** Narration is browser TTS, now
  with a deterministic voice picker. Phase 5 plans pre-recorded clips keyed by a SHA-256 of the
  phrase text with a TTS fallback. So "backgrounded `AudioContext` kills Gemini Live" is no longer
  the driver the June doc made it.
- Audio unlock and re-arm are solved in the web layer (`src/lib/audioUnlock.ts`), including the
  iOS `'interrupted'` state. Wake lock already re-acquires on `visibilitychange`.
- **iOS 26 and 27 have shipped since that document was written.** On-device Foundation Models, App
  Intents, SpeechAnalyzer as SFSpeechRecognizer's successor, and better AVSpeechSynthesizer voices
  all now exist. The product's north star is "Hey Siri, emergency" with the protocol graph as the
  brain and the model only as mouth and ears.

### Questions

- **B1.** Is Capacitor still the right vehicle, or has anything changed that favours React Native
  or native Swift? Be sceptical of your own answer; a rewrite costs months.
- **B2.** Be specific and hard-nosed: **what does a native shell buy today that the PWA cannot do?**
  List each item with the evidence. Wake Lock below iOS 18.4 and hands-free STT in an installed PWA
  are the two I know of. Are they still true on current iOS?
- **B3.** Does an on-device Foundation Model make the Ask tab worth building natively, while
  honouring the rule that the answer is always the verified record and never generated?
- **B4.** App Intents for "Hey Siri, emergency": feasible, and what is the realistic latency from
  voice to compressions? This is the most valuable product idea in the project if it works.
- **B5.** SpeechAnalyzer for hands-free in a noisy surgery with gloves on. Is the half-duplex rule
  (pause recognition while speaking) still needed, and does it survive a live 999 call seizing the
  audio route?
- **B6.** Pre-recorded clips versus AVSpeechSynthesizer for narration. Which wins on an iPhone, and
  does the native path change the Phase 5 plan?
- **B7.** Regulatory and store: App Review Guideline 1.4.1, and the MHRA line between
  decision-support and a classified medical device. What must change in the listing and the app?
- **B8.** Effort to TestFlight, in weeks, with Apple enrolment lead time factored in, and what you
  would cut to get a usable build in front of one practice soonest.

### You are on a Mac — so you can actually do this, not just plan it

The owner develops on Windows, which is why `ios/` has never been generated. You are not, so the
step that has blocked this since June is available to you:

```bash
npm install && npm run build
npx cap add ios      # generates ios/ — needs Xcode + CocoaPods
npx cap sync ios     # copies dist/ and installs pods
npx cap open ios     # Xcode; set your Team, then Run on a connected iPhone
```

After any web change: `npm run build && npx cap sync ios`.

**Authorised without further sign-off:** generating the `ios/` project, getting it to launch on a
device or simulator, and reporting what breaks. It is additive and touches no web source. Commit
it on your branch, not `main`.

**Needs the assessment agreed first:** the native swaps (STT, keep-awake, `AVAudioSession`), because
they change behaviour the clinical flow depends on.

**Still a real lead-time blocker, and not yours to solve:** Apple Developer enrolment. Nothing
reaches TestFlight without it, organisation enrolment needs a D-U-N-S number and can take weeks,
and the bundle id in `capacitor.config.ts` is still the placeholder `com.resusiq.app`. Say in your
report exactly what the owner must start and when, so it runs in parallel with your work rather
than after it.

Report what the first native build actually does — unvarnished. Portrait lock, safe areas, the
status bar, audio on first tap, the metronome, speech, and what a live 999 call does to the audio
session. That is information nobody has yet.

---

## 7. Deliverables

Write two documents in your clone:

- `docs/review/grok-2026-10-improvement.md`
- `docs/review/grok-2026-10-ios.md`

Commit them on a branch `grok/2026-10-review` and push it to GitHub — the owner reads it there, and
a pushed branch is how the work gets reviewed. If you generate the native project, put `ios/` on
that same branch (or a `grok/ios-shell` branch if you prefer it isolated). Keep your August severity
scheme: **P0** patient-harm, **P1** high clinical or medico-legal impact, **P2** real but lower
harm, **P3** polish and process. For every finding give the file and line, what is wrong, why it
matters clinically or commercially, and the cheapest fix that works. Mark clearly anything that
would need `src/data` changed, because that routes to a clinical reviewer and not to code.

If you prototype, keep prototype commits separate and labelled. End each document with what you
could not verify and what you would need in order to verify it — that is more useful than a guess
presented as a finding.

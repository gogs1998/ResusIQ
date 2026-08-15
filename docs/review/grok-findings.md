# Adversarial review — Grok (2026-08-07)

**Branch:** `redesign/instrument` @ `b5cbb9c` (did not switch; tree left untouched)  
**Brief:** `docs/ADVERSARIAL-HANDOFF-2.md`  
**Stance:** break the product; rank by patient impact. No source edits, commits, or pushes.

---

## Independent gate re-run

| Gate | Result |
|------|--------|
| `npx tsc -b` | **exit 0** |
| `npm test` | **128/128** (6 files) |
| `npm run build` | **exit 0** — main ~295 KB / ~87 KB gzip; PWA precache **34 entries / 623.25 KiB** |

Gates match the brief. A green suite does **not** cover the failures below — several sit in UI/store seams the tests never exercise.

---

## P0 — patient-harm class

### F1 · EscapeRail / `switch_protocol` does **not** go “straight to CPR”

**Where:**  
- `src/store/appStore.ts:170–188` (`switchProtocol` → `firstActionStepIndex`)  
- `src/lib` predicate `firstActionStepIndex` (`appStore.ts:68–71`)  
- `src/data/protocols.ts:18–94` (`cardiac_arrest` steps; none flagged `recognition`)  
- `src/components/console/EscapeRail.tsx:5–7, 59–62` (copy: “switches straight to CPR”)  
- Callers: EscapeRail default; `anaphylaxis.start_cpr`, `syncope.cpr`, `chest_pain.start_cpr_chest`, `choking.choking_cpr`, `stroke.stroke_cpr` actions

**Contradiction:**  
User (or protocol) has already decided “unresponsive & not breathing / start CPR”. Runtime still lands on `cardiac_arrest` step **0** (`safety` → response → shout_help → airway → breathing_check → **decision** → only then `start_cpr` → `cpr_mode`). EscapeRail is then **hidden** (`EscapeRail.tsx:25`) because `activeProtocol.id === 'cardiac_arrest'`, so there is no second shortcut into compressions. Copy and architecture claim an “architectural guarantee”; behaviour is “restart the full arrest protocol from the top.”

**Failure scenario:**  
Nurse completes anaphylaxis, patient collapses. She taps **“Unresponsive & not breathing?”** (or confirms the in-flow CPR step). App says it is switching to the cardiac arrest guide. She gets “Make sure it’s safe to approach,” then several more screens, including “Are they breathing normally?” again — while no compressions are guided. Metronome/`CPRMode` only appears many taps later.

**Severity:** **P0** (unreachable / delayed life-critical action under the product’s own CPR promise)

**Minimal fix:**  
For deterioration entry (`switchProtocol`, EscapeRail mid-emergency, and in-flow `switch_protocol:cardiac_arrest`), land on `start_cpr` or `cpr_mode` (or a dedicated `entry: 'deterioration'` index). Keep step-0 entry for a **fresh** home-tile / triage start of cardiac arrest. Update EscapeRail copy to match real landing if you keep step 0 for any path.

---

### F2 · `max_doses` is metadata only — midazolam can be re-confirmed via Back

**Where:**  
- `src/data/drugs.ts:245` (`midazolam_buccal.max_doses: 1`)  
- `src/components/ProtocolRunner.tsx:137–144` (`handleConfirm` always logs `drug_given`)  
- `src/components/ProtocolRunner.tsx:158–162` (`prevStep` unconstrained)  
- `src/store/appStore.ts` — no dose-count / max check  
- Locked claim: `safety-rules.test.ts:28–30`, `CLAUDE.md` non-negotiable #4

**Contradiction:**  
Tests pin `max_doses === 1` on the drug object and that only one midazolam **step** exists in the graph. Nothing prevents Back → same step → **Confirm given** again. Each press appends another `drug_given` for `midazolam_buccal`. The single-dose clinical rule is not enforced in the execution path.

**Failure scenario:**  
Receptionist gives buccal midazolam for a prolonged seizure, confirms. Patient still seizing; she taps Back, re-reads the dose, taps **Confirm given** again. Event log (and SBAR) show two doses; patient may receive a second midazolam → respiratory depression risk. Product still displays “Single dose — do not repeat.”

**Severity:** **P0** (wrong dose / double administration of a max-1 controlled drug)

**Minimal fix:**  
In `handleConfirm` (or `addEventLog` for `drug_given`): if `drug.max_doses` is set and count of `drug_given` for that `drug_id` on `activeEvent` already ≥ max, refuse re-log, keep UI on a “already given — single dose only” state, do not treat as a fresh confirm. Same guard for glucagon (`max_doses: 1`) and soft-cap glucose/GTN.

---

### F3 · Triage “immediate cardiac arrest” routing is dead code

**Where:** `src/components/TriageWizard.tsx:42–54`, questions order `protocols.ts:1182–1183` (`conscious` then `breathing_normally`)

**Contradiction:**  
```ts
if (currentQuestion.id === 'conscious' && !answer) {
  const breathingAnswered = triageAnswers['breathing_normally'];
  if (breathingAnswered === false) {
    startEmergency('cardiac_arrest');
    return;
  }
}
```
- On **conscious = No**, breathing has not been asked → condition never true.  
- On **breathing_normally = No**, `currentQuestion.id` is not `'conscious'` → block never runs.  
`setTriageAnswer` is also async w.r.t. the closure’s `triageAnswers`, so even a reordered check would race. Result: user walks **all remaining boolean questions** (rash, chest pain, seizure, choking, stroke, wheeze) while the patient is unconscious and not breathing. `determineProtocol()` eventually returns `cardiac_arrest` only after the full wizard — and then still lands at cardiac step 0 (F1).

**Failure scenario:**  
Dental nurse uses Guided help for a collapsed patient. Answers No / No. App continues “Any rash…?”, “Chest pain…?”, etc. CPR is delayed by a full questionnaire.

**Severity:** **P0** (delayed life-critical path)

**Minimal fix:**  
On `breathing_normally` answer (or after any answer), if `conscious === false && breathing_normally === false`, call `startEmergency('cardiac_arrest')` immediately (prefer deterioration landing from F1). Delete or rewrite the impossible `conscious`-only check. Add a unit test that simulates the two answers and asserts an active cardiac emergency without further questions.

---

## P1 — high clinical / medico-legal impact

### F4 · Completing a “Call 999” **instruction** logs `999_called` without a confirm

**Where:**  
- `protocols.ts:194` anaphylaxis `call_help` — `actions: ['suggest:call_999', 'log:999_called']`  
- `protocols.ts:774` chest_pain `call_999_chest`  
- `protocols.ts:1042` stroke `time_call`  
- `protocols.ts:1126` adrenal `call_999_adrenal`  
- `ProtocolRunner.tsx:103–110` — actions fire on any “Done — next step”  
- Consumers: `TimerStrip.tsx:64–88` (green “999 called” chip), `CallScript.tsx` / SBAR log

**Contradiction:**  
Drug steps use `require_confirm` + “Confirm given”. 999 steps use the generic **Done** CTA but still execute `log:999_called`. A panicked tap advances and paints the strip as if ambulance has been dialled. The persistent `tel:999` control is separate and honest; the auto-log is not.

**Failure scenario:**  
Anaphylaxis: staff tap Done on “Call 999 now” while someone else is still finding a phone. TimerStrip shows a green tick + time. Team assumes 999 is done; minutes pass without a call.

**Severity:** **P1** (false safety signal on a life-critical action)

**Minimal fix:**  
Remove `log:999_called` from step `actions`. Log only from the real `tel:999` onClick (already present) and/or a dedicated **“999 is dialling / Confirm called”** control. Optionally keep `suggest:call_999` only.

---

### F5 · Primary CTA has no double-submit guard (double drug / double advance)

**Where:** `ProtocolRunner.tsx:103–152`, `137–144` — no disable/debounce; store updates sync but React `currentStep` can stay stale for a second click in the same frame.

**Contradiction:**  
Rapid double-tap on **Confirm given** can log two `drug_given` events and run `advance` twice (skip a step). Same for non-drug Done (e.g. double `log:oxygen_started` / double `step_completed`). Timer auto-complete (`TimerDisplay` → `handleNext`) racing a manual Done is the same class of bug. Tests only call store methods once.

**Failure scenario:**  
Gloved double-tap on adrenaline **Confirm given** → two IM doses logged within a second, or skip past oxygen/monitoring.

**Severity:** **P1**

**Minimal fix:**  
Disable primary button until `currentStep.id` changes; ignore advance if `advancingRef` is set; for drugs, refuse second `drug_given` within the same step visit (pairs with F2).

---

### F6 · Midazolam missing 3 months–&lt;1 year band (2.5 mg)

**Where:** `drugs.ts:231–235`, `protocols.ts:704–705` (show text same bands)

**Contradiction:**  
BUCCOLAM SPC / licensed UK bands include **3 months to &lt;1 year: 2.5 mg** (yellow). App only lists adult 10 / &gt;10 y 10 / 5–10 y 7.5 / 1–5 y 5 mg. Handoff already listed this as open completeness; it remains a real under-specified paediatric path. Scottish dental midazolam guidance also references age-banded buccal doses including a 2.5 mg presentation for infants.

**Failure scenario:**  
12-month-old seizing &gt;5 min in a family practice. Staff use ResusIQ; closest listed band is “1–5 y: 5 mg” or they invent a dose. Wrong dose or hesitation.

**Severity:** **P1** (wrong / missing dose band for a real age group)

**Minimal fix:**  
Add child band + show/say text: 3 mo–&lt;1 y **2.5 mg** (note 3–6 mo hospital-setting caution per SPC). Prefer structured `child_dose_bands` like adrenaline. Clinical sign-off still required.

---

### F7 · 999 script invents clinical facts not taken from the flow

**Where:** `CallScript.tsx:62–93` `getPatientState()`

| Protocol | Script asserts | Reality |
|----------|----------------|---------|
| `stroke` | “FAST positive.” | Hardcoded; ignores all-negative path / never stores FAST answers |
| `adrenal_crisis` | “Patient on steroids.” | Hardcoded; user may have answered No → `consider_other` but script only shown under adrenal protocol after Yes path in practice — still not event-log based; if protocol id is adrenal, always claims steroids |
| `asthma` | Always “**Severe** asthma” | Moderate path uses same script |
| `choking` | “Back blows and abdominal thrusts being given.” | Mild choking / resolved path may never have thrusts |
| `hypoglycaemia` | “Known diabetic.” only | Omits glucagon/oral glucose actually given (unlike adrenaline/aspirin which are event-gated) |

**Failure scenario:**  
Stroke path: all FAST signs No → “keep watching” (`not_stroke`), or user opens 999 from another entry. Dispatcher told “FAST positive.” Wrong pre-hospital prioritisation / stroke pathway language.

**Severity:** **P1** for stroke/adrenal hardcodes; asthma/choking wording **P1/P2** boundary — treat as **P1** where dispatcher acuity is overstated.

**Minimal fix:**  
Derive state only from event log + recorded decision answers (store key answers on the event). Never hardcode FAST+/steroids. Severity for asthma: only say “severe/life-threatening” if that branch was taken or 999 was escalated.

---

### F8 · Deck “Drugs given” always shows **adult** dose text

**Where:** `Deck.tsx:149–163` — `drug.adult_dose_text` for every `drug_given` row

**Contradiction:**  
Paediatric adrenaline/glucagon/hydrocortisone/midazolam may have been given at child dose; Deck and any read-aloud of that panel report adult text (e.g. adrenaline 500 micrograms).

**Failure scenario:**  
Child anaphylaxis: 150 μg given; handover nurse reads Deck → tells paramedic “500 micrograms IM.” Wrong dose in the clinical record verbalised at scene.

**Severity:** **P1**

**Minimal fix:**  
Log selected band / free-text dose on `drug_given` (`details` or structured field), or show “Dose: see protocol / age band — confirm with giver” rather than adult_dose_text. Best: capture age band at confirm time.

---

### F9 · Seizure timer restart can delay status-epilepticus treatment

**Where:** `protocols.ts:655–680` — `time_seizure` (300 s) → `prolonged_seizure` → “still under 5 min” → `continue_timing` → **back to `time_seizure`** (new 300 s mount)

**Contradiction:**  
`TimerDisplay` remounts with a full 5-minute countdown. Wall-clock seizure length is not tracked. User who answers “still under 5 minutes” at real T+3 min can be pushed into another full timer before the prolonged branch is forced.

**Failure scenario:**  
Seizure ongoing; staff trust the in-app timer. Path restarts; midazolam/999 delayed past 5 minutes of real time.

**Severity:** **P1**

**Minimal fix:**  
One monotonic seizure clock from first entry (store timestamp); “still under 5 min” should not reset duration. Auto-route to prolonged when wall time ≥ 5 min regardless of path loops.

---

### F10 · CPRMode: no Deck / no 999 script; End (X) abandons the emergency

**Where:** `CPRMode.tsx:107–115` (X → `onEnd` → `endEmergency`), no `Deck`/`EscapeRail`/TimerStrip 999 chip

**Contradiction:**  
Instrument redesign made dispatcher script reachable mid-emergency via Deck — except the highest-acuity screen. Accidental X completes/clears the active emergency (same as ending), losing runner state.

**Failure scenario:**  
During CPR, second person needs the 999 address script; it is not on this screen. Or thumb hits X → app returns home mid-arrest.

**Severity:** **P1** (script gap + catastrophic exit affordance)

**Minimal fix:**  
Confirm dialog on End; keep `tel:999` + postcode (present) and add collapsed Deck or “999 script” sheet. Prefer “End emergency?” with two taps.

---

## P2 — real but lower immediate harm

### F11 · `max_doses` for glucose (3) / GTN (3) never enforced  
Same root as F2; hypo loop + Back can exceed 3 oral glucose doses. Soft decision “third dose?” is trust-based.

### F12 · Training mode is cosmetic only  
`isTrainingMode` only changes dashboard subtitle (`EmergencyDashboard.tsx:85`). Real `tel:999`, real event history, no watermark on runner. Risk of accidental live 999 / polluted medico-legal logs during drills.

### F13 · Mid-emergency reload drops `activeEvent`  
`partialize` (`appStore.ts:354–358`) persists setup/history/voice only — known residual. Refresh during resus → home, empty live log. Adjacent: two tabs can diverge on the same origin storage for history.

### F14 · AI co-pilot is not the protocol graph  
`AIAssistant.tsx` injects condensed steps/doses into an LLM with tools to start protocols. Architecture rule “LLM = mouth/ears, graph = brain” is only soft prompt text. Model can still invent sequencing; network required. Offline emergency path does not depend on it — good — but online misuse remains.

### F15 · PWA update UX  
`vite.config.ts` `registerType: 'autoUpdate'`, precache 34 / 623 KiB. Better than manual prompt staleness, but no in-app “updated protocols available” banner; installed clients update on their own schedule. Old clinical bugs can persist until SW activates.

### F16 · Tailwind not pinned  
`package.json` `"tailwindcss": "^4.3.2"` (caret). Brief’s “PINNED” claim is false (already corrected in §8 of handoff). Lockfile holds today’s build; floating 4.x is a repro risk (P3 supply-chain if 4.x breaks Windows again).

### F17 · Hypoglycaemia / asthma 999 often only `suggest:`  
Unlike anaphylaxis/MI/stroke/adrenal, many 999 prompts never auto-log (honest) but also never force the dial affordance beyond the shared pill — acceptable, but strip stays “not logged” until tap. Document as intentional inconsistency after F4 fix.

### F18 · `role="alert"` on every step change  
`ProtocolRunner.tsx:285–287` — assertive live region on each step may interrupt screen-reader users and conflict with TTS. Stress a11y issue.

### F19 · Voice “next/confirm” on drug steps  
Hands-free can confirm drugs; decisions correctly blocked. Accidental “done/given” in noisy surgery could advance/confirm (pairs with F5).

---

## P3 — polish / process

- Progress bar uses step **index** not clinical progress (loops make % lie).  
- SBAR / log labels use raw `drug_id` strings (`Drug: midazolam_buccal`).  
- MHRA/DCB0129 still unassessed (project-level, not a code bug).  
- No human clinician sign-off on any content (stated; remains the headline risk).  
- `createEvent` store API appears unused by UI (dead surface).  
- Tests mirror implementation heavily (e.g. action execution tests call `runStepActions` directly, never ProtocolRunner).  

---

## What was confirmed **sound**

1. **Gates** clean on this HEAD (`tsc -b`, 128 tests, build + PWA precache sizes as above).  
2. **Four CLAUDE.md non-negotiables in data/graph form:** no aspirin `drug_id` on stroke; MI uses `oxygen_moderate_flow` only via decision (not high-flow drug id); adrenaline `repeat_interval_min: 5`, no `max_doses`; single midazolam **step** gated by decisions (data layer).  
3. **FAST hard gate:** face/arm/speech Yes → `time_call` (`protocols.ts` + safety tests).  
4. **Anaphylaxis deterioration graph:** `continue_monitor` → `cardiac_arrest_check` → `start_cpr` with `switch_protocol:cardiac_arrest` (wiring exists; landing broken per F1).  
5. **`runStepActions` is live** (not dead data): switch/log/suggest verbs; same `activeEvent` across `switchProtocol`; unknown protocol no-op; no switch without activeEvent.  
6. **Recognition skip:** only five steps flagged; adrenal `steroid_check`, stroke FAST items, choking severity, anaphylaxis recognition **not** skippable via flag. Tile vs triage skip behaviour matches tests.  
7. **Timer helpers pure** (`emergencyTimers.ts`); dose countdown from latest `drug_given`; boundary = due.  
8. **`newId()`** secure-context fallback for LAN HTTP still present.  
9. **App emergency override:** `isEmergencyActive && activeProtocol` always mounts `ProtocolRunner` (`App.tsx:69–71`) — Deck cannot navigate away from runner.  
10. **Decision answers not selectable by voice** (deliberate safety gate).  
11. **Drug IDs / next / answer.next / switch targets / timer targets** structurally intact (`data-integrity` suite).  
12. **Hydrocortisone paediatric bands** present as BSPED-style 100/50/25 mg (not “corrected” to RCH).  
13. **Persist versioning** (`version: 1` + migrate) for partialized fields is real; active emergency deliberately not persisted (known tradeoff).  

---

## Attack surface map (brief §5) — status

| Surface | Outcome |
|---------|---------|
| Action engine races / double-fire | **F5** (+ F2 re-entry) |
| TimerStrip multi-drug | Tracks most recent repeatable dose only — acceptable limitation; not P0 |
| Deck 999 vs reality | **F7**, **F8** |
| EscapeRail | **F1** (core break of the guarantee) |
| Entry-source skip | Sound for flagged steps; F1 is switch landing, not recognition skip |
| Clinical content | **F6** midazolam band; non-negotiables intact in data |
| Wording freeze CallScript/SBAR | Not byte-diffed to `89888be` this pass; F7 is behavioural falsehood regardless |
| PWA staleness | **F15** residual |
| A11y / stress | **F10**, **F18**, **F19** |
| State durability | **F13**, **F12** |
| Appearance / workflow | **§ Appearance & workflow** (below) — product-confidence blocker, mostly P2 |

---

## Appearance & workflow — “it just looks and feels poor”

Product judgment (not a clinical safety class, but a real ship risk): the Instrument rebuild has a **coherent token story on paper** and a **thin, admin-looking product in practice**. It does not read as the design metaphor it claims — *“the defib that talks you through it + the laminated flowchart on the wall”* (`docs/plans/2026-07-04-instrument-console-design.md`). It reads as a polished form wizard with emergency chrome bolted on.

Severity here is mostly **P2** (trust, glanceability, time-to-action under stress). It compounds P0/P1 control-flow bugs: when the UI already feels unconvincing, operators will abandon it for memory or paper.

### UX1 · Home is sparse, small, and unranked (P2)

**Where:** `EmergencyDashboard.tsx` (tile grid ~lines 113–146; tools row 148–162; footer 165–203); preview `_preview/dashboard.png`.

**What is wrong:**
- Condition tiles use **14px labels**, **10.5px cues**, and **16×16-ish icons** in a 25px chip — far below “instrument / glance at 1 m” density. Cardiac arrest and adrenal crisis compete visually with the same quiet white cards; only a tiny red tint on the icon distinguishes life-threat.
- Secondary tools (Library · SBAR · Reports · Training) are a **muted text row** with interpuncts — easy to miss, hard to hit with gloves, and still competing with the emergency grid for attention without earning a proper nav model.
- Footer stacks **amber triage** + **red 999** under a small grid: the hierarchy is “fill form / call ambulance / maybe pick a condition,” not “pick the emergency **now**.”
- There is **no voice-AI path on home** in this build (older dark mockups had a co-equal Voice tile). Hands-free is buried elsewhere or absent from the launchpad — contrary to the product’s own differentiator narrative.

**Failure scenario:** Receptionist opens the app mid-panic. Ten equal pale tiles, tiny type, a soft “Not sure?” strip, a big Call 999. She cannot find the condition fast; she dials 999 and abandons the guide.

**Minimal direction:** Enlarge tiles (label ≥18px, cue ≥13px, icon ≥28px); make cardiac arrest + anaphylaxis **visually dominant** (full-width or larger hit targets); one clear secondary “Not sure / Guided help”; demote Library/SBAR/Reports/Training behind a single **More** or settings overflow; restore a **hands-free / voice** entry if that remains a product claim.

---

### UX2 · Theatre runner is chrome-heavy; the instruction fights for space (P2)

**Where:** `ProtocolRunner.tsx` layout — header (back, title, elapsed, progress, TimerStrip) + main hero + footer (hero CTA, 999 row, EscapeRail, Deck).

**What is wrong:**
- Vertical stack is **admin console, not single-task instrument**: progress bar + three timer chips + eyebrow + 30px hero + support + optional drug panel + optional child bands + giant Done + 999 + mute/mic + EscapeRail + deck handle/tabs. On a short phone (SE / Dynamic Type), the **action is below the fold** or the deck steals thumb zone.
- **Two elapsed clocks** (header + TimerStrip chip) waste space and imply two systems.
- EscapeRail (full red banner) + Call 999 (red outline) + optional switch-target primary (red fill) = **three red life-threat affordances** in one footer. Colour language collapses; glance fails.
- Hero is strong in isolation (~30px/800) but support text, drug adult dose (29px), and warnings fight it. Decision buttons are good (large, one-tap) — the rest of the chrome undercuts them.

**Failure scenario:** Operator props the phone during anaphylaxis. They see “Elapsed / 999 not logged / Adrenaline dose 2” chips and a progress bar before they parse the next imperative. They tap Done to “get past screens” rather than execute.

**Minimal direction:** One elapsed source; collapse TimerStrip to a single row or chips only when state exists (hide “not logged” noise); pin **one** red escalation (Escape **or** 999 primary, not both equal); reserve lower third for **one** primary CTA; put Deck fully collapsed by default with a single “999 script / log” affordance, not three always-visible tabs eating height.

---

### UX3 · Workflow still feels like a linear questionnaire, not a console (P2 → clinical adjacency)

**Where:** Protocol graph + runner pacing; triage; home entry model.

**What is wrong:**
- Despite “console with a guided thread,” most paths remain **tap Done, next card, tap Done** with recognition/positioning monologues first (anaphylaxis tile still opens on recognition essay; adrenal opens on suspect-text). Design doc demoted “info-first”; implementation only half-applied via `recognition` skip on some protocols.
- **Triage** is still up to eight yes/no screens plus a result confirmation before a protocol starts (and F3 means the arrest fast-path is broken). That is the opposite of emergency UX.
- **Deck** is the right idea (script mid-emergency) but implemented as a **third UI system** (sheet + tabs) that operators must discover under stress; CPRMode drops it entirely (F10).
- Ward ↔ Theatre theme switch is clever for engineers, jarring for users: light “admin app” home → sudden dark “theatre” with no orientation cue beyond colour. Feels like two products glued together, not one instrument powering up.
- Desktop 430px phone chrome (`index.css` ≥720px) looks like a **mockup in a frame**, not a clinical tool on a surgery PC — fine for demos, weak if a practice wants tablet/desktop use.

**Failure scenario:** Dentist starts chest pain from the tile, still hits recognition-ish content (if not skipped) then multi-step GTN/aspirin/oxygen gates, while the team wanted “999 + aspirin + sit up” on one dense card. They stop following the app.

**Minimal direction:** Action-first first screen per protocol (999 / drug / position); recognition as dismissible banner; triage max 2–3 branching questions with hard exits; one persistent “reference” surface (script/log) that survives CPR; optional single “power on” transition, not a full light/dark product split that confuses first-time users.

---

### UX4 · Visual system is correct tokens, weak craft (P3–P2)

**Where:** `design-system/tokens/*`, inline styles across components, Inter + mono doses.

**What is wrong:**
- Token system (4-meaning colour, Ward/Theatre, tabular doses) is **disciplined**. Execution is **generic SaaS medical**: white cards, 12px radii, hairline borders, small shadows — indistinguishable from a dozen health startups. Nothing feels “printed on a syringe driver” or “laminated wall chart.”
- Inconsistent craft: magic numbers everywhere (`fontSize: 10.5`, `11`, `12.5`, `14.5`, `29`, `30`) instead of a short type scale; labels like `9px` uppercase chips fail WCAG-ish glance sizes and glove use.
- Condition colours on home icons are subtle rainbow on grey — **reintroduces the step-type rainbow the redesign banned**, just quieter.
- No strong empty/first-run state for practice address (placeholders in 999 script are easy to miss until mid-call).
- Motion is almost absent except `active:scale` — the product never “ticks” like equipment; timers change digits but the UI does not feel live.

**Minimal direction:** Fewer type sizes; larger minimum UI type; life-threat tiles with solid/saturated treatment; reduce decorative condition hues; one hardware-like accent (thick keyline, high-contrast primary, mono everywhere for doses/times). Appearance pass should be **stress-tested on a real phone at arm’s length**, not desktop mockup.

---

### UX5 · End-to-end journeys feel unfinished (P2)

| Journey | Feel today |
|---------|------------|
| Know the condition | Small tile → dark wizard → Done loop → hope EscapeRail works (it doesn’t, F1) |
| Don’t know | Guided help questionnaire marathon → result → start |
| Hands busy | Mute/mic in runner; no obvious home voice path; voice can’t pick decisions (ok) but also doesn’t own the flow |
| Need 999 words | Discover Deck tabs mid-emergency, or leave mental model for CallScript screen when not in runner |
| Aftercare | SBAR / Reports are separate Ward screens with form-y inputs; no “emergency ended → handover” guided close |

The app is a **kit of parts** (runner, deck, triage, library, training, AI) without a single **default path** that feels inevitable under adrenaline.

---

### Appearance & workflow — summary judgment

| Item | Sev | One-liner |
|------|-----|-----------|
| UX1 Home density / hierarchy | P2 | Too small, too equal, tools underfoot |
| UX2 Runner chrome load | P2 | Too many reds and chips; instruction loses |
| UX3 Still a wizard | P2 | Console metaphor not felt in pacing |
| UX4 Token craft | P2/P3 | Correct system, generic execution |
| UX5 Journey seams | P2 | Parts > product |

**These are not P0 clinical bugs**, but they are enough that a practice owner can fairly say: *“I don’t trust this thing in a real emergency — it looks like a demo.”* Fix clinical P0s first; then a **hard appearance/workflow pass** (home hierarchy + runner chrome diet + action-first entries) before calling the Instrument redesign done.

---

## Bottom line

**There are P0 findings.** The worst are not “LLM clinical trivia”; they are **control-flow lies**:

1. “Straight to CPR” does not start CPR guidance.  
2. “Single dose midazolam” is not enforced at the confirm button.  
3. Triage’s cardiac-arrest shortcut never fires.

Together with false **999 called** logging and missing infant midazolam band, the instrument can **delay compressions, double a controlled drug, and mislead the team/dispatcher** under realistic panic use — despite 128 green tests and a clean typecheck.

**Separately, appearance and workflow are weak for an emergency instrument** (UX1–UX5): sparse home, chrome-heavy runner, questionnaire pacing, generic visual craft. That does not invent clinical severity, but it **undermines trust and slows correct action**.

**Do not treat the redesign as clinically shippable without fixing F1–F3 at minimum**, then F4–F6 before any live dental deployment claim. **Do not treat the Instrument redesign as product-complete without a home + runner workflow pass** that makes the next action obvious at arm’s length under stress.

# ResusIQ — Screen Detail

One section per screen. Companion to [`brief.md`](./brief.md). Describes *what each screen is and does* for handoff; does not propose visual designs.

Routing: `currentScreen` enum in `src/App.tsx`. An active emergency (`isEmergencyActive && activeProtocol`) overrides routing and forces the Protocol Runner — see brief §4.

---

## Emergency Dashboard — `EmergencyDashboard.tsx`
**Role:** Home / launchpad. The first screen and the one teams return to.

**Layout (top → bottom):**
- Header: ResusIQ logo + mode label ("Emergency Protocols" / "Training Mode"), mute toggle, settings.
- Two hero actions: **Call 999** (`tel:999`) and **Voice AI** (→ AI Assistant).
- Optional practice-address badge (shown only if practice setup has an address).
- "Select Emergency" grid: 10 condition tiles, 2-up, priority-ordered (cardiac arrest #1 … adrenal crisis #10). Each tile has title, subtitle, condition icon, condition gradient. Tap → `startEmergency(id)`.
- Floating bottom tab bar (5-up): Triage, Library, SBAR, Reports, Training.
- Footer disclaimer: "Supports trained teams · Resuscitation Council UK · SDCEP".

**States:** training vs emergency label; address badge present/absent; muted/unmuted.
**Notes:** Call 999 is a native `tel:` link, not in-app. Tile colours are per-condition and largely decorative (not the §4 step-type semantics).

---

## Protocol Runner — `ProtocolRunner.tsx`
**Role:** The core of the app — drives one emergency step by step. This is the screen the emergency-override contract protects (brief §4).

**Layout:**
- Header: **End (X)**, protocol title, "Step N of M", mute toggle, voice-command mic toggle.
- **Segmented progress bar** (one segment per step: done = green, current = white, upcoming = zinc).
- Persistent **Call 999** strip (with practice postcode if set); logs `999_called`.
- Main: optional step-type badge; **step content card** (~17px instruction, the primary element); then type-specific blocks:
  - *roles* → "Assign Roles" list (blue).
  - *decision* → radio-style options; Next disabled until one chosen; branches via `answer.next`.
  - *drug* → drug summary button → opens **Drug Card** modal.
  - *timer_block* → countdown (`TimerDisplay`, cyan) with pause/resume, auto-advances on complete.
  - *require_confirm* → amber "Confirm when completed" → green CONFIRM DONE.
- Footer: 3-up **Back / Repeat / Next**. Next is the green primary; Repeat re-speaks the step.

**Voice:** speaks each step on change (unless muted); voice commands: next/continue, back/previous, repeat, confirm/yes/given, mute/quiet, 999.
**States:** step type; confirmation-required; decision-unanswered; listening; muted; first/last step (Back disabled at 0).
**Special case:** a `cpr_mode` step renders **CPR Mode** instead of the standard runner body.

---

## CPR Mode — `CPRMode.tsx`
**Role:** Dedicated full-screen CPR coaching with audible metronome. Reached as a step within the cardiac-arrest protocol.

**Layout:**
- Header: **End (X)**, "CPR IN PROGRESS" (red), elapsed stopwatch, mute.
- Call 999 strip.
- Centrepiece: large pulsing-ring **compression counter** ("N of 30") beating at `metronome_bpm` (default 110); cycle counter below; **"2 RESCUE BREATHS"** warning when count ≥ 27.
- Stats bar: **30:2** ratio · **100–120** rate/min · **5–6 cm** depth.
- Metronome start/pause toggle.
- Footer: **AED Ready** (→ shock modal) and **Signs of Life?** (→ ROSC, advances + recovery-position prompt). Running shock count shown.

**AED modal:** "AED READY / Stand clear" → **SHOCK DELIVERED** (logs `shock_delivered`, resumes CPR) or **No Shock Advised**.
**Events logged:** CPR started, shock delivered, ROSC.
**States:** metronome playing/paused; breath-warning zone; AED modal open; shock count > 0.

---

## Drug Card — `DrugCard.tsx`
**Role:** Full clinical reference for one drug. Modal, bottom-sheet on phone (`items-end`), centred on larger screens. Opens over the Runner or from the Library.

**Sections (in order):** sticky purple header (name + close) → Indication → **Adult Dose** (large green) → Child Dose (blue, if present) → Route (+ site) → How to Give → Repeat Interval (amber, if present; shows max doses) → **Warnings** (red) → **Contraindications** (red, escalated styling, if present) → References (chips) → sticky Close footer.

**States:** child-dose present/absent; repeat-interval present/absent; warnings list; contraindications present (higher-emphasis red).
**Constraint:** all text is clinical data from `drugs.ts` — restyle only, never reword (brief §6).

---

## Triage Wizard — `TriageWizard.tsx`
**Role:** When the emergency is unclear, narrow it to a protocol via Yes/No questions.

**Layout:** one boolean question at a time with Yes/No, Back, exit (X); ends on a result screen recommending a protocol.
**Logic:** unconscious + not-breathing **short-circuits straight to cardiac arrest** (`startEmergency`); choking and other answers route to their protocols.
**States:** question index; result vs in-progress; immediate-route short-circuit.

---

## AI Voice Assistant — `AIAssistant.tsx`
**Role:** Hands-free, voice-first emergency mode. Gemini Live diagnoses from spoken description and displays a protocol panel; user can escalate into the full Runner.

**Layout (the only explicitly wide / `md:flex-row` screen):**
- Header: back, "AI Voice Assistant", API-key settings.
- Call 999 bar.
- Left: large **Activate / Stop** mic button with volume-reactive rings; status text ("System Ready" → "Connecting…" → "Listening — describe the emergency" → "Protocol: …").
- Right (animated in): **protocol panel** — title, numbered immediate actions, emergency drugs list, CPR sub-panel (110 BPM beating dot) for cardiac arrest, and **"Open Full Protocol Guide →"** which escalates to `startEmergency` (the canonical Runner).
- **API-key modal:** required first-run; key stored in `localStorage` (`resusiq-gemini-key`); link to obtain a key; remove-key option.

**States:** no-key (modal) / connecting / active-listening / protocol-shown / CPR sub-panel / error.
**Constraint:** escalation must land in the same protected Runner; this screen is a co-primary guidance surface (brief §7.5).

---

## Protocol Library — `ProtocolLibrary.tsx`
**Role:** Off-emergency reference. Browse all protocols and drugs; can launch an emergency from a detail view.

**Layout:** header + **Protocols / Drugs** toggle; search box; list of cards. Protocol detail shows steps + a start-emergency action; drug detail mirrors the Drug Card content.
**States:** list vs protocol-detail vs drug-detail; search empty/filtered.

---

## Call 999 Script — `CallScript.tsx`
**Role:** Tells the caller exactly what to say to the 999 operator, tailored to the active protocol.

**Layout:** structured lines — Service (AMBULANCE), Location (practice name/address/postcode), Phone, Emergency type, Patient, **State** (protocol-specific, e.g. cardiac arrest → "Unconscious and not breathing. CPR in progress."). Copy button; live **call timer**; back.
**States:** practice details set vs unset (`[Practice address not set]` placeholders); script text varies by `activeProtocol`.

---

## SBAR Handover — `SBARHandover.tsx`
**Role:** Build a structured Situation-Background-Assessment-Recommendation handover for arriving paramedics.

**Layout:** editable patient fields (name, age, gender, history, meds, allergies, additional info); auto-assembled SBAR text incorporating practice details, emergency type, and the **event-log timeline**; copy + share.
**States:** fields empty/filled; event timeline present/absent (pulls from `activeEvent` or last `eventHistory`).

---

## Event Reports — `EventReports.tsx`
**Role:** Post-event record — what happened, in what order, how long it took.

**Layout:** list of past events (date, protocol, duration); detail view with the logged timeline; download/share.
**States:** empty history vs populated list; report detail open.

---

## Training Mode — `TrainingMode.tsx`
**Role:** Practise emergency scenarios against a clock, deliberately *not* a live event.

**Layout:** scenario cards (title, description, difficulty badge, time target, key actions); start launches the scenario with a stopwatch. Difficulty: beginner / intermediate / advanced; shuffle.
**States:** scenario list vs in-scenario; difficulty.
**Constraint (brief §7.8):** must be unmistakably distinct from a real emergency.

---

## Practice Setup — `PracticeSetup.tsx`
**Role:** Configure the practice: identity, equipment, drugs, staff roles. Feeds Call 999 / SBAR / dashboard badge. Reached via dashboard settings.

**Layout:** multi-step wizard. Practice identity (name/address/postcode/phone) → equipment checklist (AED, oxygen, BVM, suction, spacer, monitors, glucometer…) → drugs checklist (adrenaline, aspirin, glucagon, glucose, GTN, midazolam, salbutamol) → staff roles (Team Leader, Nurses, Receptionist with default tasks) → Save.
**States:** step index; per-item present toggles; staff-role list.

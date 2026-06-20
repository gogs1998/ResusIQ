# ResusIQ — Redesign Brief

> Handoff brief for an external design tool / human designer.
> This document briefs the work; it does **not** propose visual designs.
> Companion file: [`screens.md`](./screens.md) (one section per screen).

---

## 1. Context

**What it is.** ResusIQ is a client-side PWA that supports **UK dental teams during medical emergencies**. It is **decision-support, not a clinical authority** — it guides a trained team through an emergency, it does not replace their judgement or a 999 call.

**Who uses it.**
- Dentists, dental nurses, hygienists, receptionists — a small team (typically 2–4 people) in a dental practice.
- They are **trained in emergency response** but use any given protocol rarely, so recall is low and stress is high.
- One person usually holds the phone and reads/relays steps while others act on the patient.

**Where and under what stress.**
- A real medical emergency in a treatment room or waiting room. Adrenaline is high, hands may be busy or gloved, the patient is on the floor or in a chair.
- The operator may be doing chest compressions, drawing up a drug, or on a 999 call **while** glancing at the screen.
- Lighting is clinical/bright; the phone may be propped, not held.

**On what device.**
- Primarily a **phone held in one hand** (or propped), iOS Safari / installed PWA being the priority target. Portrait orientation.
- Secondary: tablet. The AI Assistant screen is the only one with an explicit desktop/wide (`md:flex-row`) layout.

**Primary design tension.** Every decision trades against the worst case: a stressed, gloved, distracted user who needs the single right next action in under a second.

---

## 2. Screen inventory

Top-level routing is driven by a `currentScreen` enum in `src/App.tsx`, **except** that an active emergency (`isEmergencyActive && activeProtocol`) overrides everything and renders `ProtocolRunner`. See [§4 Non-negotiables](#4-non-negotiables).

| Screen | Component | Purpose | Primary action | Secondary actions | Key states |
|---|---|---|---|---|---|
| Emergency Dashboard (home) | `EmergencyDashboard.tsx` | Launchpad: pick an emergency or escalate | Tap an emergency tile → start protocol | Call 999, Voice AI, mute, settings, bottom-tab nav (Triage / Library / SBAR / Reports / Training) | Training-mode label vs Emergency; practice-address badge present/absent; muted/unmuted |
| Protocol Runner | `ProtocolRunner.tsx` | Step-by-step guidance through the active emergency | Next step | Back, Repeat (re-speak), End emergency (X), mute, voice commands, Call 999 strip, open drug card, answer decision, confirm step, timer pause/resume | Step type (instruction / drug / decision / timer / roles); confirmation-required; decision-unanswered (Next disabled); listening; muted |
| CPR Mode | `CPRMode.tsx` | Full-screen CPR metronome + compression/cycle counters | Follow metronome (passive) | AED Ready → shock flow, Signs of Life (ROSC), pause metronome, mute, End, Call 999 | Metronome playing/paused; breath-warning zone (≥27); AED modal open; shock count |
| Drug Card | `DrugCard.tsx` (modal over Runner/Library) | Full clinical detail for one drug | Read dose / how-to-give | Close | Child-dose present/absent; repeat-interval present; warnings; contraindications present (escalated styling) |
| Triage Wizard | `TriageWizard.tsx` | Narrow symptoms to a protocol when emergency is unclear | Answer Yes/No | Back, exit (X); auto-routes to cardiac arrest on unconscious+not-breathing | Question index; result screen; immediate-route short-circuit |
| AI Voice Assistant | `AIAssistant.tsx` | Hands-free voice diagnosis + on-screen protocol panel | Activate mic / describe emergency | Stop, Call 999, API-key settings, "Open Full Protocol Guide" (escalates to Runner), back | No-key (modal); connecting; listening (volume-reactive); protocol panel shown; CPR sub-panel; error |
| Protocol Library | `ProtocolLibrary.tsx` | Reference: browse protocols and drugs off-emergency | Open a protocol / drug detail | Search, toggle Protocols/Drugs, start emergency from detail, back | List vs protocol-detail vs drug-detail; search empty/filtered |
| Call 999 Script | `CallScript.tsx` | Structured what-to-say script for the 999 call | Read script aloud | Copy, dial, back; live call timer | Practice details set/unset (placeholders); script tailored by active protocol |
| SBAR Handover | `SBARHandover.tsx` | Build a structured handover for arriving paramedics | Fill patient fields → copy/share | Copy, share, back; pulls event-log timeline | Editable fields empty/filled; event timeline present/absent |
| Event Reports | `EventReports.tsx` | Post-event log of what happened and when | Open an event report | Download/share, back | Empty history vs list; report detail; duration/timeline |
| Training Mode | `TrainingMode.tsx` | Practise scenarios against a clock without it being "live" | Start a scenario | Pick difficulty, shuffle, back; stopwatch vs time-target | Scenario list; in-scenario; difficulty (beginner/intermediate/advanced) |
| Practice Setup | `PracticeSetup.tsx` | One-time-ish config: address, equipment, drugs, staff roles | Save setup | Multi-step wizard nav, toggle equipment/drugs present, back | Step index (multi-step); equipment/drug checklists; staff-role list |

---

## 3. Critical constraints

These are the conditions the redesign exists to serve. Treat them as acceptance criteria, not suggestions.

- **Readability under stress.** The current target step text renders at ~17px semibold on near-black. Any redesign must hold or increase legible size for the *primary instruction* and never let decorative chrome compete with it. Assume the reader is glancing, not studying.
- **Single-handed / propped use.** Primary actions (Next, Confirm, Call 999, End) must sit in comfortable thumb reach in portrait. The Runner already puts Back / Repeat / Next as a bottom 3-up row and Call 999 as a persistent strip near the top — preserve "primary action reachable without re-gripping."
- **Glove-friendly targets.** A `.touch-target` utility enforces 44×44px minimum; nav and control buttons are ~36px (`w-9 h-9`) today. The designer should treat **44px as the floor** for anything tappable mid-emergency and call out where current controls fall short.
- **Voice as a co-primary input.** The Runner accepts voice commands (next / back / repeat / confirm / mute / 999) and speaks each step (Gemini TTS or browser fallback). The UI must visibly reflect listening/muted state and must not assume the user is looking at the screen when a step changes. The AI Assistant screen is voice-*first*.
- **Safe-area aware.** iOS notch/home-indicator handled via `env(safe-area-inset-*)` and `.safe-area-top` / `.safe-area-bottom`. Any new full-bleed layout must keep controls clear of these insets. (Awaiting `ios-architect` confirmation — see §3a.)
- **Standalone PWA.** Designed for "Add to Home Screen": black background, white text, `display-mode: standalone` gets extra top padding. No browser chrome to rely on — the app provides all navigation, including Back.

### 3a. iOS constraints (pending `ios-architect`)
*Placeholder — to be filled from `ios-architect` reply: status-bar style, theme-color, Dynamic Island reserve, install/first-run surface. Until then assume: black status bar, white text, reserve top + bottom insets, no designed install prompt yet.*

---

## 4. Non-negotiables

Hard rules. A redesign that violates any of these is wrong, regardless of how it looks.

1. **`ProtocolRunner` must always be reachable during an active emergency.** While `isEmergencyActive && activeProtocol`, the app renders the Runner and nothing may navigate away from or hide it. Do **not** introduce nav, modals, ads, onboarding, or chrome that can occlude or escape the live protocol except the explicit **End emergency** control.
2. **The live emergency screen must never hide, below the fold or behind a tap, any of:**
   - the **current protocol step** (primary instruction),
   - the **timer / counter** when the step is timed or CPR is running,
   - the **"End emergency"** control,
   - the **Call 999** action.
   These four are always-visible, always-one-tap.
3. **Clinical content is not the designer's to reword.** Protocol step text, drug names, doses, routes, warnings, and contraindications come from `src/data/protocols.ts` / `src/data/drugs.ts` and are clinical artifacts. The redesign restyles their *presentation*; it must not paraphrase, abbreviate, or drop them. (Specific verbatim items pending `clinical-reviewer` — see §7.)
4. **Step-type semantics must survive.** Drug / decision / timed / roles steps are visually distinguished today (see §5). Whatever the new system, these four must remain *distinguishable at a glance* and their meaning must not be swapped.
5. **CPR metronome integrity.** The compression counter, 30:2 ratio, rate (100–120), depth (5–6 cm), cycle count, and the rescue-breath cue must remain unambiguous and not be subordinated to aesthetics.

---

## 5. Current tokens

Extracted from `src/index.css` and Tailwind utility usage across components. This is the *as-built* token set, for the designer to formalise — not a prescription to keep it.

**Foundations (`src/index.css`)**
- **Base background:** `#000000` (true black). App surfaces use `zinc-900/-950` on top.
- **Base text:** `white`, stepped down via `zinc-100 / -300 / -400 / -500 / -600 / -700` for hierarchy and de-emphasis.
- **Font family:** system stack — `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', Roboto, …`.
- **Smoothing:** antialiased; tap-highlight transparent; long-press callout disabled; inputs forced to 16px to prevent iOS zoom.

**Colour — semantic / category usage (as observed)**
- **Emergency red** (`red-600 → red-800`, rings `red-500/30`): Call 999, cardiac arrest, CPR, destructive/critical.
- **Voice / AI** purple→fuchsia gradient (`violet-600 / purple-600 / fuchsia-600`).
- **Step-type accents:** drug = **purple** (`purple-500`), decision = **amber** (`amber-500`), timer = **cyan** (`cyan-500`), roles = **blue** (`blue-500`). These carry meaning — see §4.4.
- **Confirm / success / progress-complete:** green (`green-500 / -600`).
- **Emergency-tile palette (dashboard):** per-condition gradients — anaphylaxis orange, choking amber, asthma blue, chest pain rose, hypo purple, seizure violet, faint slate, stroke cyan, adrenal amber.
- **Warnings/contraindications:** red tints, contraindications at higher opacity (`red-500/12`, `border-red-500/30`) than plain warnings (`red-500/8`).

**Spacing.** Tailwind 4-px scale. Screen gutters typically `px-4`/`px-5`; card padding `p-3.5`–`p-5`; grid gaps `gap-2`–`gap-2.5`. Headers `pt-3 pb-2`.

**Type ramp (observed, px equivalents).**
- Primary step instruction: ~17px / semibold.
- Screen H1: ~18px (`text-lg`) bold; modal/section titles ~20px (`text-xl`).
- Body / option labels: 15px.
- Secondary / meta: 13–14px (`text-sm`).
- Labels / eyebrows: 10–11px, uppercase, wide tracking (`tracking-wider` / `tracking-[0.2em]`).
- Big numerics (timer, compressions): `text-5xl`, `tabular-nums` / `font-mono` for stable digits.

**Radii.** Generous, iOS-like: controls `rounded-xl` (~12px), cards/buttons `rounded-2xl` (~16px), modals/hero `rounded-3xl` (~24px), pills/avatars `rounded-full`.

**Elevation / effect.** Coloured glow shadows tied to hue (e.g. `shadow-red-600/20`); subtle radial top-light overlay on gradient tiles; `backdrop-blur-xl` on the floating tab bar and modal scrims; `active:scale-[0.97]` press feedback.

**Motion (`src/index.css` + `motion`).** `pulse-cpr` (0.5s) for CPR; `fade-up` (0.25s) screen entry; ping rings on CPR and the AI mic; volume-reactive mic scaling on the AI screen.

**Iconography.** `lucide-react` throughout. Condition/step icons are data-driven via an `iconMap` (Heart, HeartPulse, Wind, Droplet, Brain, Zap, AlertTriangle, AlertOctagon, ShieldAlert, CircleOff).

---

## 6. Out of scope for redesign

The designer must **not** touch:
- **Clinical content wording** — step text, drug doses/routes/sites, warnings, contraindications, references, triage question phrasing. Sourced from `src/data/protocols.ts`, `src/data/drugs.ts`. Restyle, don't rewrite.
- **Protocol logic / flow** — step ordering, decision branching, the unconscious+not-breathing→cardiac-arrest short-circuit, drug repeat intervals, CPR ratio/rate/depth, the four built-in safety rules (no aspirin in stroke; oxygen only when indicated in MI; adrenaline q5min no fixed max; single buccal midazolam).
- **The emergency-override routing contract** (§4.1) — this is behaviour, not styling.
- **Voice command vocabulary and TTS behaviour** — what the app says/listens for is functional, not cosmetic.

---

## 7. Open design questions

Listed, not answered — for the design tool / team to resolve.

1. **Visual system for step types.** Four accent colours carry meaning today. Should the redesign keep colour as the carrier, add icon/shape redundancy (better for colour-blind + glare), or both? (Colour-blind safety is unverified.)
2. **One-handed reachability.** Should the *primary* action migrate to a single dominant bottom control, given Back/Repeat/Next currently share a 3-up row of equal weight?
3. **Control target sizes.** Mid-emergency controls are ~36px against a 44px floor. Which controls get enlarged, and does that cost layout density elsewhere?
4. **CPR screen hierarchy.** Compression counter vs cycle vs AED/ROSC actions vs metronome toggle — what is the single most important glanceable element, and should secondary stats (30:2 / rate / depth) ever yield space?
5. **AI Assistant ↔ Runner relationship.** Two parallel "guidance" surfaces exist (voice panel vs full Runner). Should they converge visually, or stay deliberately distinct modes?
6. **Dashboard tile density.** 10 condition tiles + 2 hero actions + a 5-up tab bar in one portrait view. Is triage-by-prominence (priority order) doing enough, or should rare conditions demote?
7. **Empty / unconfigured states.** Call 999 script and SBAR show `[Practice address not set]` placeholders. How should the design nudge setup without nagging mid-emergency?
8. **Training vs live differentiation.** Training Mode reuses live screens. How strongly should "this is a drill" be signalled so it's never mistaken for a real event (and vice-versa)?
9. **Contrast & glare in clinical light.** True-black + saturated gradients look good in demo; unverified under bright surgery lighting. Does a high-contrast / light variant belong in scope?
10. **Decision-step affordance.** Decision options are radio-style with a disabled Next until chosen. Is that the safest pattern under stress, or should selection advance immediately?

---

*Inputs pending: `clinical-reviewer` (verbatim content + colour semantics → §4.3, §7.1), `ios-architect` (§3a), `code-reviewer` (a11y findings → §3, §7.3). This brief will be revised when they land.*

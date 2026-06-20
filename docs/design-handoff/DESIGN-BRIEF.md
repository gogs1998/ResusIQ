# ResusIQ — Redesign Brief (for Claude design)

Paste this whole file to the designer. It contains everything needed to redesign the entire app. It does not prescribe a look — that's the designer's job. After designs land, implementation will follow this brief's non-negotiables exactly.

---

## 1. The product in one paragraph

ResusIQ is a phone-first PWA that guides a **UK dental team through a medical emergency** — someone collapses in the chair or waiting room and a trained-but-rusty team needs the single right next action, fast. It is **decision-support, not a clinical authority**: it walks the team step-by-step through a protocol, runs a CPR metronome, shows drug doses, scripts the 999 call, and builds the paramedic handover. It already works (React 19 + TypeScript + Tailwind 4, Zustand state, Gemini voice). Shipping plan is a **Capacitor native wrapper for iOS, with the PWA retained as the web/Android channel from the same codebase** — so **design for both** (most constraints carry over). **We are redesigning the entire visual + interaction layer, not the logic or the clinical content.**

## 2. Who's using it, and the moment that matters

- **User:** dentist, dental nurse, hygienist, or receptionist. Trained in emergencies but uses this rarely — low recall, high stress.
- **The moment:** a real emergency. Patient on the floor or reclined. The user may be doing chest compressions, drawing up adrenaline, or on a 999 call **while glancing at the screen**. Hands are gloved and possibly bloody. The phone is often **propped, not held**.
- **Device:** **portrait phone is the design target** (iOS first, via the native shell; Android/web via PWA). Tablet secondary. Only the voice screen needs a wide layout.
- **The whole design must optimise for the worst case:** a stressed, gloved, distracted person who has ~1 second to find the next action.

## 3. What to design (every screen)

The app has one home screen, a protected "live emergency" runner, and supporting tools. Redesign all of them.

| # | Screen | What it's for | Primary action | Also on screen |
|---|---|---|---|---|
| 1 | **Emergency Dashboard** (home) | Launchpad — pick the emergency or escalate | Tap one of 10 condition tiles → starts that protocol | Call 999, Voice AI, mute, settings, bottom tabs (Triage / Library / SBAR / Reports / Training), optional practice-address badge |
| 2 | **Protocol Runner** (the core) | Step-by-step guidance through the live emergency | **Next step** | End emergency, Back, Repeat (re-speak), Call 999, voice mic, mute, progress bar, plus per-step blocks (see §4) |
| 3 | **CPR Mode** | Full-screen CPR metronome + compression/cycle counter | Follow the beat (passive) | AED Ready→shock flow, "Signs of Life?"→ROSC, pause metronome, mute, End, Call 999, 30:2 / 100–120 rate / 5–6cm depth stats |
| 4 | **Drug Card** (modal) | Full clinical detail for one drug | Read dose & how-to-give | Indication, adult dose, **child dose (shown alongside adult — not behind a tap)**, route/site, repeat interval, warnings, contraindications, references, close |
| 5 | **Triage Wizard** | Narrow unclear symptoms to a protocol | Answer Yes / No | Back, exit; auto-jumps to cardiac arrest if unconscious + not breathing |
| 6 | **AI Voice Assistant** | Hands-free: describe emergency aloud, AI shows protocol | Activate mic | Stop, Call 999, status text, live protocol panel, "Open Full Protocol Guide" (→ Runner), API-key entry |
| 7 | **Protocol Library** | Off-emergency reference for all protocols + drugs | Open a protocol/drug | Search, Protocols/Drugs toggle, start emergency from detail |
| 8 | **Call 999 Script** | Exactly what to say to the operator, tailored to the emergency | Read it aloud | Copy, live call timer, back |
| 9 | **SBAR Handover** | Structured handover for arriving paramedics | Fill patient fields → copy/share | Auto-built S-B-A-R text, event timeline |
| 10 | **Event Reports** | Post-event timeline log | Open a report | Download/share; empty state when no history |
| 11 | **Training Mode** | Practise scenarios against a clock (not live) | Start a scenario | Difficulty badges, shuffle, stopwatch — must look unmistakably "drill, not real" |
| 12 | **Practice Setup** | One-time config: address, equipment, drugs, staff roles | Save | Multi-step wizard, equipment/drug checklists, staff roles |

**Two small onboarding/permission surfaces also need design (see §7):**
| 13 | **"Add to Home Screen" coach** | Web/Android channel has no native install prompt — teach the Share → Add to Home Screen gesture | Dismiss / "got it" | Illustrated share-sheet glyph + 1–2 step instruction |
| 14 | **Mic-permission pre-prompt** | One-line "why" shown *just before* the OS mic dialog, to lift grant rate | Continue (then OS dialog) | "So you can speak to the assistant hands-free during an emergency" + allow/not-now |

## 4. The Protocol Runner in detail (spend your best effort here)

This is where the emergency actually happens. A step is one of these types and the design needs a clear, glanceable treatment for each:

- **Instruction** — a single primary command. This text is the most important thing on screen.
- **Drug** — shows drug + dose; tapping opens the full Drug Card. A drug step must look unmistakably different from an instruction step (a clinician must never confuse "read this" with "give this drug"), and it carries a **prominent confirm gate** (you tick "done" before advancing). Keep that gate loud.
- **Decision** — a **question** with 2+ mutually-exclusive options; the user must choose before advancing (choosing branches the flow). It must read as a question, never as a passive info card.
- **Timed** — a reassess countdown; the **time remaining is the primary element** (these windows are clinical: e.g. 5 min for anaphylaxis, 10–15 min for hypoglycaemia). Legible at arm's length. Auto-advances at zero; pausable.
- **Roles** — "who does what" assignments for the team (e.g. Team Leader, Call 999, get AED).

The runner **speaks each step aloud** (TTS narration — always available; the design must work even when the user isn't looking, and muted state must be visible). It *also* accepts **voice commands** (next/back/repeat/confirm/mute/999), but **voice-command input (speech-to-text) is not available on all platforms** (see §7) — so it's gated behind a capability flag and the mic button is **hidden entirely when unavailable, not greyed out.** That means the Runner has **two layouts to design — "mic present" and "mic absent" — and the absent layout must reflow cleanly with no empty hole** where the mic was. Never design a flow that depends on voice commands to advance.

## 5. Non-negotiables (a design that breaks these is wrong)

**Layout / behaviour**
1. **The live emergency screen can never be hidden or escaped except by the explicit "End emergency" control.** When an emergency is active, the app force-renders the Runner; no nav, modal, banner, onboarding, or ad may cover or navigate away from it.
2. **These four must be visible and one-tap at all times during a live emergency:** the current protocol step, the timer/counter (when timed or in CPR), **End emergency**, and **Call 999**. None may be below the fold or behind a menu.

**Clinical content (signed off by clinical review — see §6 for the full list)**
3. **Don't reword clinical content.** Step text, drug names, doses, routes, warnings, contraindications come from data files and are clinical artifacts. Restyle their presentation; never paraphrase, abbreviate, or drop them.
4. **Dose + route + concentration is one atomic unit — never split or abbreviate it.** "Adrenaline 500 micrograms (0.5 ml of 1:1000) IM" stays whole; the **1:1000 concentration must always be visible** (confusing it with 1:10,000 is a known fatal error). If space is tight, **wrap or scroll — never truncate the dose**.
5. **Child/paediatric doses sit on the same card as the adult dose — never hidden behind a tap or an expander during an emergency.** Adrenaline now has **four** age bands (see §6) — all must fit on the card.
6. **Safety negations render as explicit, prominent prohibitions — never softened, never icon-only.** e.g. "Do NOT give aspirin in stroke", "Adrenaline IM ONLY — never IV", "Single midazolam dose only — do not repeat", "Nil by mouth if drowsy", "Do NOT restrain / nothing in mouth". An icon may accompany the words but can never replace them.

**Step semantics**
7. **Keep step types distinguishable at a glance** (instruction / drug / decision / timed / roles). You may redesign the colour system, but the *distinction* must survive and meanings must not be swapped — specifically **drug ≠ instruction**, decision reads as a **question**, timed shows **time as the hero**.
8. **Reserve red for the highest acuity** (cardiac arrest, chest pain / immediate life threat). Don't spend red as a generic accent.
9. **CPR integrity:** "30:2", "100–120/min", "5–6 cm depth", cycle count, and the rescue-breath cue stay exact and unambiguous — these are clinical values, not decoration.

## 6. Clinical content that must render verbatim (do not abbreviate, paraphrase, or drop)

Signed off by clinical review. Design the *presentation*; treat the wording as fixed.

**Doses — keep dose + route + concentration together, never truncate:**
- Adrenaline **500 micrograms (0.5 ml of 1:1000) IM, anterolateral thigh** — the **1:1000** must stay visible. Four age bands, all shown together: **>12y/Adult 500μg (0.5ml) · 6–12y 300μg (0.3ml) · 6mo–6y 150μg (0.15ml) · <6mo 100–150μg (0.1–0.15ml)**.
- Aspirin **300 mg — CHEW** (the "CHEW" instruction is load-bearing).
- Buccal **midazolam 10 mg (adult)**.
- **Glucagon 1 mg IM**.
- **GTN 400 micrograms/spray, 1–2 sprays, max 3, patient SEATED** (the "SEATED" is load-bearing — GTN drops BP; given standing it can cause collapse).
- Oxygen: **"15 L/min, non-rebreather" (high flow — anaphylaxis/arrest)** *vs* **"titrate to SpO₂ 94–98%" (MI / post-syncope / titrated)** — these are clinically **opposite**; never merge into one generic "give oxygen" chip.
- Paediatric weight/age bands appear **on the same card as the adult dose**.

**Safety negations — explicit prohibitions, never softened or icon-only:**
- "Do **NOT** give aspirin in stroke (possible bleed)."
- "Adrenaline — confirm **1:1000, NOT 1:10,000**." (concentration mix-up is a known fatal error)
- "**Single** midazolam dose only — do not repeat."
- "Adrenaline **IM ONLY** — never IV."
- "**Nil by mouth** if drowsy/unconscious" (hypoglycaemia).
- "Do **NOT** restrain / nothing in mouth" (seizure).

**CPR numerics — exact:** "30:2", "100–120/min", "5–6 cm depth".

## 7. Hard interaction constraints (treat as acceptance criteria)

- **Glove-friendly:** 44×44px minimum tap target for anything touched mid-emergency (current build has some ~36px controls — fix this).
- **One-handed / propped:** primary action reachable by thumb in portrait without re-gripping. Bottom of screen is prime real estate.
- **Legibility under stress & glare is a *safety* constraint, not aesthetics.** The palette must stay readable in a **bright surgery, through gloves, at poor viewing angles** — high contrast, large type, large targets. Current build is true-black with saturated gradients, *unverified under surgery lighting*, so a strong high-contrast story is wanted.
- **Voice is co-primary input**, not an afterthought — the AI Assistant screen is voice-first. (But heed the STT caveat below for *command* input.)
- **iOS native shell / PWA — design portrait-only and inside the safe areas:**
  - **Portrait-locked** (manifest orientation). Don't design landscape.
  - **Top — notch / Dynamic Island:** status bar is **black-translucent over a black theme**, so content draws **under** the Island. Reserve `env(safe-area-inset-top)` (~47–59px on notched iPhones). **No tap targets and no critical readouts** (emergency timer, step counter) in that top strip — the top ~59px centre "may be obscured", so keep it to **background / branding only**.
  - **Status-bar glyphs are light** (light text over the dark bg). **If the redesign puts any light/white full-bleed surface at the very top, the status-bar glyphs go invisible.** Either **keep the top region dark**, or explicitly flag it so we switch the status-bar style. (`theme-color` is black in dark mode, red `#dc2626` in light.)
  - **Bottom — home indicator:** reserve `env(safe-area-inset-bottom)` (~34px). The persistent Runner controls (Back / Next / End) are the most-tapped buttons in an emergency — keep them **above** the home indicator, not crowded by it.
  - **Sides:** ~0 inset in portrait.
  - No browser chrome to lean on; the app provides all its own navigation including Back.
- **Install / permission surfaces — all three mandatory (Capacitor for iOS + PWA for web/Android, one codebase):**
  - **Native splash / launch screen — required** for the Capacitor WKWebView shell (iOS). Design a launch asset: **branded logo centred on the solid black theme** (matches `theme-color #000000`, avoids status-bar contrast issues), plus the app icon.
  - **"Add to Home Screen" coach — required.** The web/Android channel has no native install prompt, so design the coach (Share → Add to Home Screen, with the share-sheet glyph) — small illustrated sheet, low friction. Mandatory regardless; it serves the web/Android channel.
  - **Mic-permission pre-prompt — required on both channels.** First voice use triggers the OS permission dialog (native iOS *and* web `getUserMedia` both benefit). Design a **one-line pre-prompt** explaining *why* ("so you can speak to the assistant hands-free during an emergency"), shown just before the OS dialog, to lift the grant rate.
- **Voice-command (STT) caveat — affects the Runner mic UI:** voice *commands* run on the web speech path, which **does not work in the installed iOS app**, so they're gated behind a capability flag and the **mic button is hidden when unavailable** (not greyed). **Do not design a UI that implies always-on voice commands.** Design the Runner for both **mic-present and mic-absent**, with the absent layout reflowing cleanly (no hole). Voice **narration (TTS) is always present** everywhere.

## 8. Accessibility (design these, don't leave them to implementation)

From a code review of the current build. These are design problems before they are code problems — specify the visual/interaction patterns so implementation is mechanical. The Protocol Runner is safety-critical; treat its a11y as load-bearing.

- **Visible focus states for everything interactive.** A clear, high-contrast focus ring that works on true-black *and* on coloured tiles/buttons. There is none today.
- **Announced "Step X of N" pattern.** Step changes drive the emergency but are silent to screen readers. Specify how a transition is announced (an `aria-live` region in code): the step's instruction text is the payload, plus how "Step X of N" reads.
- **Every icon-only control needs a name.** The Runner close, mute, mic, and footer **Back / Repeat / Next** buttons are icon-only with no label. Prefer pairing each icon with a visible text label (also better for stress-legibility). *(The mic button's aria-label/aria-pressed has already landed in code — match that pattern across the rest.)*
- **Decision options are one labelled choice group** (a radio group; the question is the label) — design unselected / selected / focused states.
- **Modals are real dialogs.** The API-key, Drug Card, and AED-shock modals need focus-in-on-open, focus trap, Escape-to-close, focus-return.
- **Never encode meaning in colour alone.** Pair colour with icon/shape/label. Note this reinforces §5.6: safety negations must carry their words, not just a colour or icon.

## 9. Real content samples (design around these, don't invent)

**10 emergencies (priority order):** Cardiac Arrest, Anaphylaxis, Choking, Asthma, Chest Pain (suspected MI), Hypoglycaemia, Seizure, Faint (syncope), Stroke, Adrenal Crisis.

**A drug card carries this much data — design for the dense case (and remember §5.4/§5.5):**
> **Adrenaline (Epinephrine) 1:1000** · Indication: Anaphylaxis · Adult: **500 micrograms (0.5 ml of 1:1000) IM**, anterolateral mid-thigh · Child *(all bands on the same card)*: **>12y/Adult 500μg (0.5ml) · 6–12y 300μg (0.3ml) · 6mo–6y 150μg (0.15ml) · <6mo 100–150μg (0.1–0.15ml)** · Repeat every 5 min, no upper limit · Warnings: "Confirm 1:1000 not 1:10,000", "IM only — never IV", "Auto-injectors deliver less than adult dose" · Refs: Scottish Government 2024, Resuscitation Council UK 2021, BNF.

Some drugs have contraindications (stronger emphasis than warnings). Some have a child dose, some don't. Some have a repeat interval, some don't. Design must degrade gracefully when fields are absent.

**A 999 script** is label→value lines: Service (AMBULANCE), Location (practice name/address/postcode), Phone, Emergency type, Patient, State (e.g. "Unconscious and not breathing. CPR in progress."). When practice setup is empty it shows placeholders like "[Practice address not set]" — design the unconfigured state.

## 10. Out of scope — do not touch

- Clinical wording, doses, drug data, protocol step text, triage questions.
- Protocol flow/logic, decision branching, CPR ratios, the built-in safety rules (no aspirin in stroke; oxygen high-flow vs titrate as above; adrenaline repeats with no fixed max; single buccal midazolam).
- Voice command vocabulary and what the app speaks.

## 11. Current design language (as-built — reference, not a requirement to keep)

You're free to replace this, but here's what exists so you can decide what to carry forward:

- **Surfaces:** true-black `#000` base; `zinc-900/-950` cards; white text stepped down through zinc greys for hierarchy.
- **Semantic colour:** emergency = red; AI/voice = violet→fuchsia; success/confirm/progress-done = green; drug=purple, decision=amber, timed=cyan, roles=blue; warnings/contraindications in red tints.
- **Type:** system font stack (SF Pro / system-ui). Big numerics use tabular/mono for stable digits. Primary instruction ~17px semibold; tiny uppercase wide-tracked eyebrow labels.
- **Shape:** iOS-like generous radii (controls ~12px, cards ~16px, modals ~24px, pills full-round). Coloured glow shadows tied to hue. Press feedback = slight scale-down. Floating blurred bottom tab bar.
- **Motion:** CPR pulse, screen fade-up, volume-reactive mic rings.
- **Icons:** lucide-react.

## 12. What I need back from the designer

For each of the 12 screens (with the Protocol Runner, CPR Mode, and Drug Card as the priorities), the two onboarding surfaces (§3 rows 13–14), and each Runner step type:
- High-fidelity **portrait-phone** screens (only orientation — app is portrait-locked), with key states called out (Runner: instruction / drug / decision / timed / confirm / listening / muted / **mic-present** / **mic-absent (reflowed)** / **focused**; CPR: beating / breath-warning / AED modal; Drug Card: with/without child dose, with/without contraindications; empty/unconfigured states). Show safe-area insets in the frames so nothing tappable or critical sits under the notch/Island or home indicator.
- A treatment for the **dense drug card** that keeps dose+route+concentration atomic and **all four adrenaline age bands** visible (§5.4/§5.5), and a treatment for **safety-negation banners** that reads as a prohibition (§5.6).
- A consolidated token set (colour, type ramp, spacing, radii, elevation, motion, **focus-ring**, **safe-area inset rules**) so implementation is mechanical. Flag any top surface that would force a status-bar-style change (§7).
- The accessibility patterns from §8 specified visually.
- Iconography for the 10 conditions and the step types (with the colour-blind-safe pairing from §8), plus the share-sheet glyph for the install coach.
- A **native launch / splash screen** asset on the black theme (Capacitor shell), plus the app icon.
- Redline notes where a choice protects a non-negotiable (e.g. how the four always-visible live elements fit at the smallest supported height, between the Island and the home indicator).

Deliver phone-portrait only; tablet/wide only where it genuinely adds value (notably the AI Assistant).

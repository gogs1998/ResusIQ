# ResusIQ "Instrument" — Console Redesign (Design Document)

**Date:** 2026-07-04 · **Status:** validated with Gordon (mockup: claude.ai artifact "Console & Modes") · **Author:** Fable (orchestrator)

## Product frame

The founding metaphor (Gordon's): **the defib that talks you through it + the laminated flowchart on the wall, fused into one object.** Long-term north star: pure voice ("Hey Siri, emergency" → on-device LLM co-pilot). Architectural law that follows: **the LLM/voice layer is the mouth and ears; the deterministic protocol graph is the brain.** Nothing in this redesign may move clinical decisions out of `protocols.ts` + the safety tests.

## The interaction model: console with a guided thread

The current app is a wizard: everything (state changes, escapes, timers, reference) is forced through a linear tap-next pipe. The 2026-07-04 adversarial review showed the failure mode: escape branches must be hand-wired per protocol and can be forgotten (anaphylaxis→CPR orphan). The redesign promotes the runner from wizard to **console**:

1. **The thread** — the current step, one dominant instruction, auto-spoken. Unchanged engine (`currentStepIndex`, one-tap decisions, drug confirm).
2. **Pinned timers (first-class)** — header strip: elapsed time (999 asks this first), drug-repeat countdown (derived from last `drug_given` event + `repeat_interval_min`), 999-called tick.
3. **Escape rail (architectural guarantee)** — persistent red "Unresponsive & not breathing → CPR" button on every runner/triage screen; switches to `cardiac_arrest` protocol via the existing `switch_protocol` path. Deterioration stops being per-protocol wiring. Hidden while already in cardiac_arrest.
4. **The deck** — slide-up sheet inside the runner, tabs: **999 script** (CallScript content, event-log-driven), **Drugs** (given so far + drug cards), **Log**. Dissolves the "CallScript/SBAR unreachable mid-emergency" P2 without adding navigation that hides the runner (CLAUDE.md rule intact — the deck is *inside* ProtocolRunner).

## Audience modes (one graph, three lenses — Phase 3, design-locked, not built yet)

- **Street/layman:** pure spoken wizard, giant type, no jargon/ml, drugs only as "their allergy pen", 999 pinned first.
- **Dental practice (default):** the console above.
- **Clinician/hospital:** full algorithm card (all steps visible, timestamps on done), dose-band tables, narration off.
Mode is a **render-layer** concept (a lens over the same graph + event log + gates). No mode may bypass a safety gate. Street mode needs lay-language content fields → clinical sign-off before build.

## Visual system: "Instrument"

Two surface worlds; the switch itself signals "emergency is live":

- **Ward (light)** — home, library, SBAR, reports, training, setup. Cool precise neutrals (NOT warm sand): canvas `#F4F6F9`, white cards, 1px `#E1E7EE` borders, ink `#101720`.
- **Theatre (dark)** — ProtocolRunner, CPRMode, TriageWizard. Ground `#0C1118`, panels `#151D29`, text `#F2F6FA`, borders `#2A3644`.

**Colour is a 4-word language** (decoration is banned): red `#E5484D`/dark-tint = life threat & 999 · amber `#FFB224` = safety gate/caution · green `#178A53` (fill) / `#3DD68C` (on dark) = confirmed done · blue `#54C1FF` = information & voice. The per-step-type violet/blue accent rainbow goes.

**Type:** Inter (self-hosted @fontsource, replaces Lexend) for UI; `ui-monospace` stack + `tabular-nums` for **every dose, timer, counter** ("like it's printed on a syringe driver"). Step hero ~28–31px/800. Copy rule: hero = bare imperative; support line must add information (render layer suppresses the say≈show duplicate).

**Implementation shape:** keep the existing semantic token names (`--bg`, `--surface-1`, `--text-1/2/3`, `--red`, `--green`, `--border`…) — retune their values in `:root` (Ward) and add a `.theatre` class scope redefining the same names to dark values. Components keep consuming semantic tokens; most restyle "for free". Per-screen work is then layout/density, not colour plumbing.

## What does NOT change

- `protocols.ts` / `drugs.ts` content (clinical, separately governed) — the renderer changes, the graph doesn't.
- The 4 safety non-negotiables + the 78-test suite (must stay green at every commit).
- One-tap decisions, auto-speak, entry-source skip, event log semantics.
- ProtocolRunner unconditional takeover in `App.tsx` while emergency active.

## Phasing

- **Phase 1 (this plan):** tokens/fonts → console runner (TimerStrip, EscapeRail, Deck) → CPR + Triage theatre → Ward home + secondary sweep → verify.
- **Phase 2:** voice loop default-on where supported; Capacitor/native STT per ios-plan.
- **Phase 3:** street + clinician modes (needs lay-content with clinical sign-off).

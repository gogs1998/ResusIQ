# ResusIQ — Usability Review (Emergency Flow)

**Reviewer:** usability-reviewer · **Branch:** resusiq-redesign · **Date:** 2026-06-20
**Lens:** a stressed, gloved operator doing compressions or on a 999 call, glancing at a propped phone. Hands are often busy. Eyes are intermittent. The operator already knows roughly what's wrong.

This review validates the user's four verbatim critiques against the *implemented* code and turns them into a concrete, prioritized change list. Clinical rulings below are signed off by the clinical-reviewer; the iOS STT path is confirmed by the ios-architect.

---

## 1. The end-to-end journey — how do you actually start and run an emergency?

There are **three** entry points into a protocol, plus a redundant "always there" 999 button on every screen.

| Entry | Path | Taps to first protocol step | Notes |
|---|---|---|---|
| **A. Tile tap** (`EmergencyDashboard`) | Home → tap condition tile → `startEmergency(id)` → `ProtocolRunner` | **1 tap** | Fastest. Decisive. The operator names the condition and is in the runner. |
| **B. Triage wizard** (`TriageWizard`) | Home → bottom tab "Triage" → up to 8 yes/no questions → result screen → "START PROTOCOL" | **2 (tab) + up to 8 + 1** | Slowest. For when you *don't* know the condition. Has a hard-coded fast-path: unconscious + not breathing → cardiac arrest mid-wizard. |
| **C. Voice AI** (`AIAssistant`) | Home → "VOICE AI" hero → "Activate" (mic) → speak → AI sets protocol → "Open Full Protocol Guide" | **1 + 1 + speak + 1** | Requires a saved Gemini API key (modal on first use). Needs network. Shows a *summary* panel, not the runner — you still tap through to the real runner. |

**Is having 3 entry points confusing? Partly yes.** The dashboard presents two equally-weighted purple/red hero buttons (CALL 999, VOICE AI) *above* the actual emergency tiles, plus a 5-item bottom tab bar (Triage, Library, SBAR, Reports, Training). For a panicking user this is a lot of competing affordances on the first screen. The three entry points are *individually* defensible (decisive tile / unsure-triage / hands-busy-voice) but they are not visually ranked, so the screen doesn't answer "what do I press RIGHT NOW."

**Recommendation (journey):**
- Keep all three but **rank them explicitly**. The condition grid is the fast path and should dominate. CALL 999 stays omnipresent (it already is — good). VOICE AI is the genuine differentiator for a gloved/compressing operator and should be promoted *as the hands-free path*, not sit as a co-equal tile.
- The bottom tab bar (Library/SBAR/Reports/Training) is **non-emergency** content competing for space on the emergency screen. Consider demoting it behind a single "More" affordance so the home screen is condition-tiles-first. (Owner: design-lead.)
- Triage's "If in doubt" footer (CARDIAC ARREST / CALL 999) is good and should stay.

---

## 2. Interaction-count table per step type — "2 clicks per screen is too much"

Measured against the *implemented* `ProtocolRunner.tsx` / `CPRMode.tsx`. This validates the user's complaint exactly.

| Step type | What the operator must do today | Taps | 1-tap / 0-tap target |
|---|---|---|---|
| **instruction** | Read, tap **Next step** (footer hero) | **1** | 0-tap via voice ("next"/"done"); auto-advance not appropriate (operator paces it) |
| **decision** | Tap an answer tile (sets `selectedAnswer`), **then** tap **Next step** (hero is *disabled* until an answer is picked — `ProtocolRunner.tsx:424`) | **2** | **1 tap** — tapping an answer should commit immediately (each answer already carries its own `next`). Remove the second press. |
| **drug** (`require_confirm: true`) | Tap **Next step** → handler intercepts, sets `confirmationRequired`, speaks "confirm when done" → a **separate** green "CONFIRM DONE" card appears → tap **CONFIRM DONE** (`ProtocolRunner.tsx:76–117, 384–398`) | **2** | **1 tap** — relabel the hero to **GIVEN / CONFIRM** on drug steps; one press logs `drug_given` + advances. Keep two-stage only as the voice path. |
| **drug** (`require_confirm: false`, e.g. oxygen) | Tap **Next step** | **1** | 0-tap via voice |
| **timer_block** | Auto-starts; auto-advances on completion (`on_timer_end_next`). Operator can Pause/Resume or tap Next to skip | **0** (or 1 to skip) | Already good. |
| **role_assignment** | Read roles, tap **Next step** | **1** | 0-tap via voice |
| **cpr_mode** (`CPRMode`) | Metronome auto-runs. "AED Ready" → opens sheet → "SHOCK DELIVERED" (2 taps). "Signs of Life?" → ROSC (1 tap) | 1–2 for branch actions | Acceptable — these are deliberate, low-frequency, high-consequence. |

**Verdict:** the user is right. The two highest-frequency interactive step types — **decision** and **require_confirm drug** — are both 2-tap, and they recur many times across a single protocol run. Both can be cut to 1 tap with no loss of safety (confirmed with code-reviewer; awaiting their final objection check, but the data model already supports it: decision `answers[].next` and drug `drug_id` are self-contained).

> **Why two-stage drug confirm exists:** it's an "are you sure you gave it" gate so the event log and the 999/SBAR scripts only assert a drug was given when actually confirmed (`CallScript.tsx:43` reads the log). That intent is preserved by making the *single* hero press on a drug step BE the confirmation (label it GIVEN/CONFIRM, styled as the deliberate action), rather than splitting it into press-then-confirm.

---

## 3. Info-first vs action-first audit — "it's just TELLING me"

The user's sharpest point. The operator has **already chosen the condition** (tile / triage / AI), yet many protocols open with a passive `RECOGNISE [X]` instruction step that is a bullet list of symptoms — reading load before any action. Per-protocol audit with the **clinical-reviewer's signed-off verdict**:

| Protocol | Opening step (id) | Today | Clinical verdict | Action |
|---|---|---|---|---|
| **chest_pain** | `recognise` → `call_999_chest` | symptom list first, *then* 999 | **FLIP + DEMOTE.** Time-to-PCI drives outcome — 999 must be step 1. Clinically endorsed. | Make `call_999_chest` the first step; demote `recognise` to a non-blocking banner. |
| **anaphylaxis** | `recognition` | symptom list first | **DEMOTE (banner).** The airway-swelling vs mild-rash distinction governs whether adrenaline is appropriate — keep visible, never block. | First action stays `stop_trigger`/`call_help`/adrenaline; recognition becomes a banner above it. |
| **asthma** | `recognise` | symptom list first | **COLLAPSE / delete.** Pure reading load; the load-bearing triage is the next step `assess_severity` (can they speak). | Collapse into a "confirm signs" expander. |
| **hypoglycaemia** | `recognise` | symptom list first | **COLLAPSE.** Reading load; real gate is `conscious_check` (can they swallow). Keep one tap away (confusion/aggression cue has value). | Collapse to expander. |
| **syncope** | `recognise` | symptom list first | **COLLAPSE / delete.** Lowest stakes; lie-flat-raise-legs is self-evidently safe. | Collapse or drop. |
| **adrenal_crisis** | `recognise` + `steroid_check` | recognition + steroid decision | **DO NOT TOUCH — real gate.** "Recognition" here is the steroid-dependency question that is the entire basis for hydrocortisone; most likely to be mis-triaged from a tile. | Leave blocking, as-is. |
| **stroke** | `fast` + face/arm/speech decisions | FAST assessment | **DO NOT TOUCH — real gate.** FAST *is* the diagnosis and drives time-of-onset (thrombolysis eligibility). | Leave fully. |
| **cardiac_arrest / choking / seizure** | open with action/assessment, **not** a passive recognise step | — | No change needed. | — |

**Rule for whoever implements (clinical caveat):** when you collapse/demote recognition content, it must stay **one tap away (expander), not deleted from the data** — a mis-triaged operator needs a path to realise it. "Never blocks the action, always reachable."

---

## 4. "Why the symbols" — reading load from glyphs

Validated. Step `show` strings in `protocols.ts` carry inline text glyphs (`•`, `✓`, `✗`, `⚠️`) as part of the displayed copy, rendered verbatim via `whitespace-pre-line` (`ProtocolRunner.tsx:285`). Two problems:

1. **Mojibake / encoding corruption.** Many strings contain `•` (a broken `•`) and `âš ï¸` (a broken `⚠️`) — e.g. `anaphylaxis` step `position_flat:219`, `aed_attach:110`, and most asthma/hypo/syncope/seizure/choking steps. These render as literal garbage characters on screen. **This is a real, shipping visual defect**, not just a preference. (The newer adrenal_crisis/stroke strings use correct `⚠️`/`✓`, so the corruption is in the older protocol blocks.)
2. **Glyphs add scan load.** Bullets and ✓/✗ in body text compete with the actual words. The app already has a clean lucide icon system (the step-type badge, role chips, drug pill). Body copy should lead with one short imperative and use real iconography, not inline text symbols.

**Owner:** the encoding fix is a data correctness bug (code-reviewer / clinical-reviewer to re-verify the strings after a clean re-encode of `protocols.ts` as UTF-8). The "lead-with-one-line, demote bullets, replace glyphs with lucide" layout is design-lead.

---

## 5. Proposed interaction model — voice-first, hands-free, minimal-tap

**Principle:** during an active emergency the *default* loop is hands-free. Tapping is the fallback, not the primary.

### 5.1 The hands-free loop (the headline change)
Today: TTS auto-speaks each step (`ProtocolRunner.tsx:66–70`, good), but listening is **opt-in** — the operator must tap the mic (`:220–230`), and STT is *silently dead in an installed iOS PWA* (correctly gated off in `platform.ts:18`). So on the primary install target (dentist adds to home screen on iPhone) there is **no hands-free capability at all today.**

Target loop, on by default while `isEmergencyActive`:
1. **Auto-speak** the step (already happens).
2. **Auto-listen** immediately after speaking finishes.
3. Advance on **"next" / "done"**, branch a decision on the **answer label** spoken, confirm a drug on **"given" / "confirm"**, go **"back"**, **"repeat"**.
4. Give a **visible + audible confirmation** of every voice action ("Next — adrenaline IM") so the operator trusts it without looking.
5. Mic button becomes a *mute/override*, not an opt-in.

**Hard dependency (ios-architect, confirmed):** Web Speech STT does not work in the installed iOS PWA. The fix is **Capacitor + `@capacitor-community/speech-recognition`** (thin bridge over native `SFSpeechRecognizer`), which slots straight behind the existing `voiceCommandsSupported` flag — *no change at the ProtocolRunner call site*. Effort ~1–2 weeks **after** the Capacitor shell exists (Phase 1), gated upstream by **Apple Developer enrolment (Phase 0)**. Coupled caveat: barge-in (listening while TTS speaks) needs the native `AVAudioSession` (`playAndRecord`/`voiceChat`) config — treat native STT + audio-session as **one** Phase-2 unit or the app's own TTS feeds back into the recogniser. Verify the plugin exposes on-device recognition (`requestsOnDeviceRecognition`) for **offline** voice when network drops mid-emergency; if not, that's the one reason to drop to native Swift.

> Until native STT lands, the voice-first loop works in a browser tab / Android but **not** in the installed iPhone app. That gap is the single biggest blocker to the user's "should be more voice-guided" ask.

### 5.2 Minimal-tap (works today, no native dependency)
- **Decision → 1 tap:** tap an answer tile commits immediately (drop the disabled Next gate). File: `ProtocolRunner.tsx` decision branch + footer.
- **Drug require_confirm → 1 tap:** hero relabels to **GIVEN / CONFIRM** on drug steps; one press logs + advances. Remove the separate CONFIRM DONE card. File: `ProtocolRunner.tsx:76–125, 384–398`.
- **One dominant primary action per screen:** today drug steps render *two* green CTAs (the mid-content CONFIRM DONE and the footer Next step) — they compete. Collapse to one. (design-lead + code-reviewer.)

### 5.3 Recognition steps → collapsed / demoted (clinical-gated, §3)
- Render a collapsed "confirm signs" expander for asthma/hypo/syncope; a non-blocking banner for anaphylaxis/chest_pain; **flip chest_pain so 999 is step 1**; leave adrenal_crisis & stroke fully blocking. Data stays in `protocols.ts` (never deleted), render logic in `ProtocolRunner.tsx`. (clinical-reviewer signs off final treatment; code-reviewer implements.)

### 5.4 Content / data
- **Re-encode `protocols.ts` as UTF-8** to kill the `•` / `âš ï¸` mojibake.
- Each step's `show` should lead with **one short imperative line**; demote supporting bullets; replace inline glyphs with lucide icons.

---

## Prioritized list (P0 → P2)

### P0 — safety / usability blockers
1. **Flip chest_pain so CALL 999 is step 1** (recognition demoted to banner). Clinically endorsed; time-critical. *Data: `protocols.ts` chest_pain. Owner: clinical-reviewer + code-reviewer.*
2. **Fix mojibake in `protocols.ts`** (`•`, `âš ï¸` rendering as garbage in live step text). Shipping visual defect. *Owner: code-reviewer (re-encode), clinical-reviewer (re-verify strings).*
3. **Voice-first hands-free loop as the emergency default** (auto-speak → auto-listen → advance on "next"/"done" with visible+audible confirm). The product's core promise for a gloved/compressing operator. *Owner: code-reviewer (loop wiring in `ProtocolRunner.tsx`), **blocked on** ios-architect native STT for the iPhone install target.*
4. **Native STT on iOS** via Capacitor + `@capacitor-community/speech-recognition` (so #3 works in the installed iPhone app). *Owner: ios-architect + code-reviewer. Upstream blocker: Apple Developer enrolment (Phase 0) → Capacitor shell (Phase 1) → STT + AVAudioSession as one Phase-2 unit.*

### P1 — high-value, no native dependency
5. **Decision steps → 1 tap** (tap answer commits immediately). *`ProtocolRunner.tsx`. Owner: code-reviewer.*
6. **Drug require_confirm → 1 tap** (hero = GIVEN/CONFIRM; remove second CTA). *`ProtocolRunner.tsx`. Owner: code-reviewer + design-lead.*
7. **Collapse/demote recognition steps** per §3 clinical verdict (asthma/hypo/syncope collapse; anaphylaxis banner; keep adrenal_crisis + stroke). *Render in `ProtocolRunner.tsx`, data untouched. Owner: code-reviewer; clinical sign-off.*
8. **One dominant primary action per step** (kill the two-green-buttons-on-drug-steps competition). *Owner: design-lead.*

### P2 — polish / journey clarity
9. **Rank the three entry points on the dashboard** — condition grid dominant, VOICE AI promoted as the hands-free path, demote the non-emergency bottom tabs (Library/SBAR/Reports/Training) behind "More". *`EmergencyDashboard.tsx`. Owner: design-lead.*
10. **Lead each step's `show` with one short imperative line; replace inline glyphs with lucide icons.** *Data + render. Owner: design-lead + clinical-reviewer.*
11. **Visible + audible confirmation of every voice action** (trust without looking). *Owner: code-reviewer.*

---

## Open items / coordination
- **clinical-reviewer:** signed off the per-protocol recognition treatment (§3) and the chest_pain 999-first flip. Will sign off final string copy after the UTF-8 re-encode.
- **code-reviewer:** asked to confirm no state-machine reason blocks the two single-tap changes (P1 #5, #6); awaiting reply, but data model supports both.
- **ios-architect:** confirmed Capacitor + community STT plugin; effort, blockers, and the AVAudioSession barge-in coupling captured in P0 #4 / §5.1.
- **design-lead:** owns dashboard ranking, one-primary-action layout, lead-line + lucide glyph replacement, recognition expander styling.

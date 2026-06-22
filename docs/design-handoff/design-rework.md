# ResusIQ — Design Rework (post-implementation review)

Author: design-lead. After the Clear Signal restyle landed (branch `resusiq-redesign`, all
13 screens), the user reviewed the live app: *"this needs a lot of work."* The **look** is
right; the **interaction + content hierarchy** is not. This is the prioritized design-rework
list. Each item: what's wrong → the fix → severity → owner → file.

Ownership boundaries:
- **design-lead (me):** layout, visual hierarchy, what's hero vs demoted, noise cull.
- **usability-reviewer:** the interaction model (tap economy, voice-first loop, collapse behaviour).
- **clinical-reviewer-2:** any change to *which words* appear / whether a step may collapse.
- **code/team-lead:** the data-encoding fix and the markup changes.

The root cause of the user's anger is **two problems colliding in one place** — a content/data
problem (passive `RECOGNISE X` + symptom lists + broken glyphs in the `show` strings) rendered
through a layout that gives every line equal hero weight. Fixing either alone won't satisfy;
they must be fixed together.

---

## P0 — SEV-CRITICAL (the things the user reacted to)

### R1. The step card has NO internal hierarchy — heading, action, and symptom list all render at 26px
**Wrong:** `ProtocolRunner.tsx:283-288` dumps the entire multi-line `currentStep.show` into one
`.cs-instruction whitespace-pre-line` paragraph. So `chest_pain` step `recognise`
(`protocols.ts:761`) renders "RECOGNISE CARDIAC PAIN" + six symptom bullets **all at the same
26px hero weight**. The user's *"why is it just telling me?"* is correct: the screen makes a
passive symptom list look like the primary instruction.

**Fix (mine):** split `show` into a **hero line** (the first line) and **demoted detail** (the
rest), and style them as a hierarchy, not a blob:
- **Hero:** first line of `show` → `.cs-instruction` (26px/600). This is the ONE thing that reads
  at a glance.
- **Detail:** remaining lines → `--fs-meta` (13px) `--text-2`, as a proper list (see R2), visually
  subordinate — same card, clear size/weight/colour step-down.
- The split key already exists in the data: `show` is `HEADING\n\n<detail lines>`. Split on the
  first blank line; if there's no blank line, the whole thing is the hero (single-line steps like
  "SHOUT FOR HELP" stay clean).
- **For recognition steps specifically**, the detail should be **collapsed behind a tap** (R4) —
  but that's gated on clinical-reviewer-2 + usability-reviewer (see there).

**Severity:** CRITICAL. **Owner:** design-lead (layout) + team-lead (markup). **File:**
`ProtocolRunner.tsx:283-288`. **Depends on:** clinical-reviewer-2 confirming the first line is
always the safe "hero" (it is today, but they own that ruling).

### R2. Literal symbols + mojibake in step text — *"why the symbols"*
**Wrong:** `show` strings contain literal `•`, `⚠️`, and **mojibake** — `â€¢` (a UTF-8 `•`
decoded as Latin-1), `âš ï¸` (a mangled `⚠️`). 29 occurrences across `protocols.ts`. These
render as garbage glyphs in the hero-weight text. This is a **data-encoding bug**, not styling.

**Fix:**
- **(code/team-lead, SEV-HIGH):** repair the encoding in `src/data/protocols.ts` — replace the
  mojibake sequences with clean characters, then **strip the inline list glyphs from the data
  entirely** (`•`, `⚠️`). The bullet character is a *presentation* concern; it should not live in
  the content string. Lines should be plain text; the UI draws the list affordance.
- **(design-lead):** the demoted detail list (R1) renders each line as a real list item with a
  small **lucide** marker in `--text-3` (a 4px dot or `chevron-right`, not a typographic `•`), or
  just hanging indents. Warnings inside `show` (the `⚠️ Do NOT sit up…` at `protocols.ts:219`)
  should NOT be an inline glyph — promote them to the existing **`Callout tone="warn"`** component
  so a contraindication never hides as a bullet. Coordinate the warn-extraction with
  clinical-reviewer-2 (they confirm which lines are warnings).

**Severity:** CRITICAL (visible garbage + safety glyphs buried). **Owner:** code (encoding) +
design (list rendering). **File:** `src/data/protocols.ts` (29 spots), `ProtocolRunner.tsx`.

### R3. Two competing green primaries on drug steps
**Wrong:** the footer hero "Next step" is green; on a `require_confirm` drug step the mid-content
"CONFIRM DONE" button (`ProtocolRunner.tsx` confirm block) is ALSO green. Two green CTAs = no
single dominant action at a glance (usability-reviewer's finding #1, and it's a design call).

**Fix (mine):** there must be **one green at a time.**
- When a confirm is pending, the footer "Next step" hero is already gated/disabled — so **demote
  it visually while the confirm is pending** (secondary/ghost, not green) and let the in-content
  "Confirm when completed" be the single green primary. When confirm is satisfied, the footer hero
  returns to green. i.e. green moves to whichever is the true next action, never both at once.
- Alternative (cleaner, coordinate w/ usability-reviewer): **drop the separate CONFIRM button** and
  make the footer hero itself the confirm gate — it reads "Confirm given" (green) on a drug step
  and only then advances. One button, one place (the footer thumb-zone), fewer taps. I lean toward
  this — it also fixes tap economy (R6).

**Severity:** CRITICAL. **Owner:** design-lead + usability-reviewer. **File:** `ProtocolRunner.tsx`
(confirm block + footer).

---

## P1 — SEV-HIGH (hierarchy & noise)

### R4. Recognition/symptom steps should be COLLAPSED, not full blocking cards
**Wrong:** passive "RECOGNISE X" steps are full-screen cards the user must read and tap past, even
when they already know what they're looking at. They're reference, not action.

**Fix (design + usability + clinical):** render recognition detail **collapsed by default** — hero
line visible ("Recognise anaphylaxis"), symptoms behind a *"Signs to look for"* expander (chevron).
The step stops being a blocking wall; the operator advances immediately or expands if unsure.
**This is gated:** clinical-reviewer-2 must rule that collapsing symptom detail is clinically safe
(it's recognition, not a dose), and usability-reviewer owns the expander interaction. I own the
collapsed/expanded visual. **Severity:** HIGH. **File:** `ProtocolRunner.tsx`.

### R5. Per-screen visual-noise cull
**Wrong:** beyond the Runner, icon/colour density adds reading load. Audit each screen for "what
can be removed so the one thing that matters is unmissable."
**Fix (mine), per screen:**
- **Runner:** the step-type badge + 4px accent + Call 999 strip + progress + footer is a lot of
  chrome around the step. Keep the badge (it's load-bearing — colour+icon+label step semantics) but
  ensure NOTHING competes with the hero line's weight. The progress-segment glow (R8) and the badge
  should sit clearly below the instruction in the visual stack.
- **Dashboard:** fine post-restyle — the tile hue-wash is decorative-light (verify ~0.16 opacity).
- **Drug Card / CPR:** clean. No cull needed.
- **Old-palette screens:** once migrated, avoid re-introducing the old multi-colour density.
**Severity:** HIGH (Runner), LOW (others). **Owner:** design-lead.

### R6. Tap economy + voice-first affordance (the Runner loop)
**Wrong:** the user wants fewer taps and voice-first. Today the dominant manual action is "Next
step"; the listening state is a small header mic chip (easy to miss); voice isn't the visual
default.
**Fix (design, w/ usability-reviewer who owns the model):** propose a **voice-first Runner layout**:
- **Hero step text** stays the visual centre (R1).
- **Listening state becomes prominent**, not a header afterthought: when voice is active, a clear
  full-width listening indicator (the DS `ping`/`blink` motif, mirroring the AI mic) sits where the
  eye already is — so a gloved operator knows the app is hearing "next"/"repeat" without hunting for
  a 44px chip. When voice is unavailable (iOS PWA — the gate stays), fall back to the manual footer.
- **Manual nav demoted** but never removed: Back/Repeat shrink to a quiet secondary row; the single
  green primary (R3) stays as the thumb-reach fallback. Repeat is the most-used voice command, so
  keep a visible Repeat.
This is a layout proposal; usability-reviewer ratifies the interaction. I'll mock the stack:
`[step-type badge] → [HERO step] → [collapsed detail] → [prominent listening state] → [quiet Back/Repeat] → [one green primary]`.
**Severity:** HIGH. **Owner:** design-lead + usability-reviewer. **File:** `ProtocolRunner.tsx`.

---

## P2 — SEV-MEDIUM (polish flagged earlier, still open)

### R7. AI Assistant mic still uses `animate-pulse`, not the DS `ping`/`blink`
Swap the AI mic orb to `resus-ping` (listening) + `resus-blink` (recording) — it's the centrepiece
and the DS reference is built on those motifs. Runner mic stays on `animate-pulse` (small chip).
This also feeds R6's listening indicator. **Severity:** MEDIUM. **Owner:** design + team-lead.
**File:** `AIAssistant.tsx`, and the new Runner listening state.

### R8. CPR ring pulse period — verify 0.545s not 0.5s
The ring uses `animate-pulse-cpr`; confirm it's the DS **0.545s** (110 BPM) so the visual pulse
locks to the audible metronome. If it's still the foundation-era 0.5s it drifts against the beat —
the exact cue users entrain to. **Severity:** MEDIUM. **Owner:** team-lead (verify). **File:**
`src/index.css` keyframe / `CPRMode.tsx`.

### R9. Green-hero text contrast
On-device check: dark `--text-on-light` (#0A0C10) on the green hero (#2FD27A), not white.
**Severity:** MEDIUM (device-QA item). **Owner:** team-lead on the device pass.

---

## What I own next
- R1 (step hierarchy split) + R2-list-rendering + R5 (Runner cull) + R6 (voice-first stack) — I'll
  produce the exact layout spec once **clinical-reviewer-2 rules on R1/R4** (is the first `show`
  line always the safe hero; may symptom detail collapse) and **usability-reviewer ratifies the R6
  interaction model**. These two rulings gate my detailed spec; I've designed around them above.
- The encoding fix (R2-data) is code's, not mine — flagged to team-lead as SEV-HIGH.

## Dependency summary
- R1 detailed spec **blocked on** clinical-reviewer-2 (first-line-is-hero ruling).
- R4 **blocked on** clinical-reviewer-2 (collapse-safe ruling) + usability-reviewer (expander).
- R3, R6 **co-owned with** usability-reviewer (one-primary + voice loop).
- R2-data, R8, R9 are code/QA, not design.

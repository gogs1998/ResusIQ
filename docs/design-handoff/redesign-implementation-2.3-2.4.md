# Clear Signal Redesign — §2.3 CPR Mode + §2.4 Drug Card

Companion to `redesign-implementation.md`. These two specs live here only because the
main doc became large; they are part of the same per-screen series and the same rules
apply (tokens for appearance, Tailwind for layout, never reword clinical content).

---

### 2.3 CPR MODE — `src/components/CPRMode.tsx`  *(the metronome / compression centrepiece)*

Reference: DS screenshot `05-cpr-mode`; UI-kit `ui_kits/resusiq-app/CPRScreen.jsx`; DS components
`Stat`, `Button`, `IconButton`, `Sheet`, `Callout`. **CPR integrity is a non-negotiable:** 30:2,
100–120/min, 5–6 cm, the live compression count, the cycle count, and the rescue-breath cue must
stay unambiguous. This is a recolour + a couple of structural upgrades (the AED modal becomes a
real dialog) — **never touch the metronome timing logic, the beat→breath announce, the shock/ROSC
handlers, or the spoken strings.**

#### Layout map (top → bottom)

**1. Root** (`line 87`): `min-h-screen bg-black …`
- Replace with the CPR mode-wash: `background: radial-gradient(120% 60% at 50% 30%, #160a0c,
  var(--bg))` (the restrained red top-wash that signals "CPR mode" — DS uses this; one of the two
  allowed mood washes). Drop `bg-black`/`text-white`. Keep flex + `safe-area-top`.

**2. Header** (`lines 89–110`)
- **End button** (`X`, lines 91–96): DS `IconButton variant="critical"` — DS uses a **red** End in
  CPR (mode emphasis), unlike the Runner's neutral End: `background: var(--red-tint)`, border
  red-40%, icon `var(--red)`. **Bump 36→44px.** **Add `aria-label="End emergency"`** (currently
  missing on this button).
- **Title** (lines 97–100): centre it (DS centres the CPR title). "CPR IN PROGRESS" → mono,
  `letter-spacing:.16em`, `var(--red)`, 600, with a **blinking live dot** before it (`resus-blink`,
  `var(--red)`). The elapsed line `{formattedTime} elapsed` → mono `--text-2` via `.cs-numeric`;
  DS shows just `MM:SS` — keep or drop the "elapsed" word (non-clinical).
- **Mute** (lines 102–109): 44px chip, `aria-pressed`, mute-on → red-tint (keep). **Add `aria-label`.**

**3. Call 999** (`lines 113–125`) — same DS critical strip as the Runner (§2.1.4): `--red-tint` +
red-40% border, `--red` icon/label, `radius-md`, ≥44px. Keep `<a href="tel:999">` + event log +
postcode verbatim. Always-visible during the arrest.

**4. Compression centrepiece** (`lines 130–152`) — the heart of the screen.
- Ring: 220px, `border: 3px solid color-mix(in srgb, var(--red) 50%, transparent)`, inner fill
  `inset 10px` of `var(--red-tint)`. When playing, ring pulses with **`resus-pulse-cpr` at 0.545s**
  (110 BPM) `var(--ease-in-out)` — **migrate from the app's `pulse-cpr`/`animate-ping` to the DS
  keyframe so the beat is the canonical 110 BPM.** Static under reduced-motion (global). Drop the
  red gradient fill + ad-hoc ping rings.
- Count: render `compressionNumber` via DS `Stat` at **`--fs-numeric-xl` (92px)** mono tabular,
  `tone="critical"` (`var(--red)`), label **"OF 30"** (`.cs-eyebrow`). Current `text-5xl` (~48px) —
  **bump to 92px**; biggest number in the app, must read across the room. `of 30` verbatim. The
  `Heart` glyph may be dropped (DS drops it) for clarity at 92px.
- **Cycle counter** (`line 155`): mono `CYCLE {cycleNumber}` (`--text-2`, `.08em`). **Fold the shock
  count in** like DS: `CYCLE 2 · 1 SHOCK` (uppercase mono). This replaces the separate `shockCount`
  footer line (lines 217–221) — cleaner and always visible.

**5. Breath cue** (`lines 158–162`) — the safety-critical "shout". "2 RESCUE BREATHS" **verbatim**.
- DS: `color: var(--decision)` (amber), 700, `.04em`, leading **`wind` icon**. The app currently
  uses BLUE; DS uses AMBER. **Flag this colour change** (blue is the roles hue — reusing it here is
  a minor collision; amber = attention/transition is correct). Keep the `>= 27` trigger; flatten
  pulse under reduced-motion.

**6. Stats bar** (`lines 165–181`) — CPR-integrity numbers. **Do not alter the values.** Container
`.cs-card`; three `Stat size="sm"`: `30:2`/RATIO, `100–120` unit `/min`/RATE, `5–6` unit `cm`/DEPTH.
Values mono tabular `--text-1`; labels `.cs-eyebrow` `--text-3`.

**7. Metronome toggle** (`lines 184–194`) — DS `Button variant="secondary" size="lg"` full-width,
`play`/`pause` icon, "Pause metronome"/"Resume metronome", surface-2 + border. Keep
`toggleMetronome`. (Neutral secondary — the app's green/amber here competes with GO/decision
semantics; neutral is correct.)

**8. AED + ROSC actions** (`lines 199–215`)
- **AED Ready**: DS `Button variant="critical"` (red), `zap` icon (replace yellow→amber gradient).
  Keep `setShowAEDPrompt(true)`.
- **Signs of Life?**: DS `Button variant="primary"` (green), `heart-pulse` icon (replace
  green→emerald gradient). Keep `handleROSC`. "Signs of Life?" verbatim.
- Both ≥56px, side by side, inside `safe-area-bottom` (present).

**9. AED Shock modal** (`lines 224–249`) — **upgrade to a real dialog** (DS `Sheet`). Also closes
open task #16.
- `Sheet` pattern: focus-in, trap, Escape, focus-return to the AED trigger, scroll-lock, backdrop
  dismiss. Scrim `var(--scrim)` + blur.
- Header: title "AED Ready", accent `var(--red)`, `zap` headerIcon.
- Body: **"Stand clear" → `Callout tone="contra"`** (escalated red, `role="alert"`); render "Stand
  clear before delivering shock" verbatim (safety cue, do not reword).
- Footer (sticky): `secondary` "No Shock Advised" (keep `setShowAEDPrompt(false)`) + `critical`
  "SHOCK DELIVERED" (keep `handleShockDelivered`). **Remove the `⚡` emoji** (the `zap` icon carries
  it). The shock event-log + spoken "Shock delivered. Resume CPR immediately." stay verbatim.

#### Must NOT change (CPR)
- The metronome (`useMetronome` bpm, the `beat % 30` breath announce), `useStopwatch`, the
  `compressionNumber`/`cycleNumber` source, the `>= 27` breath-warning trigger.
- Spoken strings: "Starting CPR…", "Two breaths", "Shock delivered. Resume CPR immediately.",
  "ROSC detected…". `handleShockDelivered`, `handleROSC`, `addEventLog` calls, the `tel:999` href.
- Integrity values `30:2`, `100–120`, `5–6cm`, `of 30`, "2 RESCUE BREATHS", "Stand clear",
  "Signs of Life?" — all verbatim.

#### Touch targets
- End/Mute 36→**44px**. Metronome toggle ≥56px. AED/ROSC ≥56px. Sheet footer buttons ≥44px.

#### Flags (CPR)
- Breath cue colour blue → **amber** (`--decision`) per DS — confirm (added to open questions §5).
- AED modal → `Sheet` overlaps task #16 — coordinate so it's done once.

---

### 2.4 DRUG CARD — `src/components/DrugCard.tsx`  *(clinical detail modal)*

Reference: DS screenshot `07-drug-card`; UI-kit `ui_kits/resusiq-app/DrugCardContent.jsx`; DS
components `Sheet`, `Callout`, `Badge`. **Every value here is verbatim clinical content** (doses,
ratios, routes, sites, warnings, contraindications, references) — restyle only, never reword,
abbreviate, or reorder. The structural upgrade is making the modal a real `Sheet` dialog (task #16).

#### Structure

**1. Modal shell** (`lines 12–13`) → DS `Sheet`: bottom-sheet on phone (centres on wide), full
dialog pattern (focus-in, trap, Escape, focus-return, scroll-lock, backdrop dismiss). Scrim
`var(--scrim)` + blur. Container `--surface-1`, `radius-2xl` top corners, `max-h-[92vh]` scroll,
`safe-area-bottom` (keep). Header accent `var(--drug)`, headerIcon `pill`.

**2. Header** (`lines 14–23`) — `drug.name` is the title. DS uses a **subtle** drug-tinted header
(NOT a saturated purple gradient): title `--text-1`/600 with the `pill` icon in `var(--drug)`; a
second line for the dose ratio if the name carries one (DS: `Adrenaline (Epinephrine)` / `1:1000`).
`drug.name` verbatim. Close (X) → `IconButton` in the Sheet header, `aria-label`.

**3. Indication** (`lines 26–30`) — inline: **Indication:** `{drug.indication}` — bold label
`--text-1`, value `--text-2`, ~15px. Verbatim.

**4. Adult dose** (`lines 32–37`) — the most important value. Block `background: var(--green-tint)`,
border green-40%. Label "ADULT DOSE" mono uppercase `var(--green)`. Value `drug.adult_dose` →
**mono 700, 22px, `var(--green)`** (DS renders doses in MONO/tabular so `500 micrograms (0.5 ml)`
and `1:1000` stay unambiguous). `adult_dose_text` below → `--text-2`. **Both verbatim** — the
`micrograms`/`1:1000` spelling is a clinical safety choice.

**5. Child dose** (`lines 40–48`) — when `child_dose_bands` exist, render `<ChildDoseBands>` (§2.5).
Else free-text `child_dose`: same dose-block but **blue** (`background: var(--roles-tint)`, border
roles-40%, label + value `var(--roles)`). Value mono ~17px. Verbatim. (DS = blue child dose,
distinct from green adult.)

**6. Route & site** (`lines 51–55`) — row: mono label "ROUTE & SITE" `--text-3`; value `drug.route`
(+ `Site: {drug.site}` when present) `--text-1`. Verbatim — keep "IM only — never IV"-type phrasing
exactly if present.

**7. How to give** (`lines 57–61`) — row: label "HOW TO GIVE", value `drug.how_to_give` `--text-1`,
`whitespace-pre-line`, `--lh-relaxed`. Verbatim.

**8. Repeat interval** (`lines 63–72`) — amber block: `background: var(--decision-tint)`, border
decision-40%, label "REPEAT INTERVAL" `var(--decision)`. Keep the composed "Every {n} minutes ·
max {n} doses". **Clinical non-negotiable:** anaphylaxis adrenaline repeats every 5 min with **no
fixed in-flow maximum** — if `max_doses` is absent, do NOT invent one; render exactly what the data
provides.

**9. Warnings** (`lines 74–89`) → DS `Callout tone="warn"` `items={drug.warnings}` (amber,
`triangle-alert`, title "Warning", `role="alert"`, bulleted). Verbatim, do not reorder.

**10. Contraindications** (`lines 91–104`) → DS `Callout tone="contra"` `items={drug.contraindications}`
— **escalated red** (higher opacity + thicker border than warn), title "Contraindication",
`role="alert"`. **Remove the `⛔` emoji**. Verbatim — stroke/aspirin-type contraindications live
here; never weaken or drop them.

**11. References** (`lines 106–120`) → mono pill chips: `background: var(--surface-2)`, `border`,
`radius-pill`, `--text-3`, optional external-link glyph. `drug.references` verbatim (RCUK/SDCEP/BNF).

**12. Footer** (`lines 123–131`) — sticky `Close`, DS `secondary` full-width, ≥44px. Keep `onClose`.

#### Must NOT change (Drug Card)
- ANY clinical value: `name`, `indication`, `adult_dose(_text)`, `child_dose(_text)`, `route`,
  `site`, `how_to_give`, `repeat_interval_min`, `max_doses`, every `warnings[]`/`contraindications[]`
  string, `references[]`. No rewording, reordering, or abbreviation. Unit spellings (`micrograms`,
  `1:1000`) are deliberate.
- The `child_dose_bands` vs free-text branch. The warn-vs-contra emphasis hierarchy (contra stronger).

#### Flags (Drug Card)
- Sheet conversion overlaps open task #16 — coordinate.
- Mono dose rendering is a real legibility win for `1:1000`/`micrograms`; keep it.

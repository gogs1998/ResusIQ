# ResusIQ "Clear Signal" Redesign — Implementation Spec

Design authority: `design-lead`. Implementation: `team-lead`.
This document is the single source of truth for wiring the **Clear Signal** design
system (`src/design-system/`) into the live app. Section 1 (Foundation) is
implement-first. Per-screen specs (Section 2+) follow.

Per-screen specs are split across three files to stay readable:
- This file — §1 Foundation, §2.1 Protocol Runner, §2.2 Emergency Dashboard, open questions.
- `redesign-implementation-2.3-2.4.md` — §2.3 CPR Mode, §2.4 Drug Card.
- `redesign-implementation-2.5-2.13.md` — §2.5–§2.13 (the remaining nine screens).

---

## 1. FOUNDATION WIRING SPEC  *(implemented — commit 7f70585, branch resusiq-redesign)*

### 1.0 Goal
Make every existing screen render on the Clear Signal foundation **without touching
component markup yet**: the dark base (`--bg #08090B`, not `#000`), IBM Plex type,
DS tokens as CSS custom properties, and the global base/motion behaviour (focus ring,
safe areas, `prefers-reduced-motion`). After this step the app should already look
"darker, Plex-typed, token-driven" — per-screen work then refines each surface.

### 1.1 Self-host the fonts — replace the Google Fonts `@import`  ✅
`@fontsource/ibm-plex-sans` + `ibm-plex-mono` weights 400/500/600/700, replacing the
cross-origin Google Fonts `@import` in `src/design-system/tokens/fonts.css`. Emitted
woff2 are precached offline by the existing PWA `globPatterns`.

### 1.2 Import the DS into the app — BEFORE Tailwind utilities  ✅
team-lead imported the 8 token CSS files directly (fonts→colors→typography→spacing→
radii→elevation→motion→base) before `@import "tailwindcss"`, rather than
`design-system/styles.css`, because Vite 8/rolldown postcss-import does not rebase the
nested relative `@import`s inside `styles.css`. Same cascade result — **approved, no
need to patch styles.css.**

### 1.3 Reconcile the existing `:root` / `body` block  ✅
Removed the competing `-apple-system` font-stack and `body { background:#000; color:white }`.
Legacy `--sat/--sab/--sal/--sar` kept as aliases of the DS `--safe-*`. App `pulse-cpr`/
`fade-up` keyframes kept (CPR Mode migrates to DS 110-BPM timing in §2.3).

### 1.4 theme-color → `#08090B`  ✅ (index.html + vite manifest).

### 1.5 Tailwind ↔ token strategy (governs every per-screen spec)
> **Tokens are the source of truth for APPEARANCE; per-screen we replace ad-hoc Tailwind
> color/radius utilities with token-driven `var(--token)` styles. Tailwind stays for
> LAYOUT (flex/grid/gap/padding) — the 4px grids already align.**

Known DoD note: post-foundation the app looks ~unchanged because every screen still
hardcodes `bg-black`/`bg-zinc-900`/`text-white`, which override the new base. That is
expected — the visible Clear Signal change lands as each screen in §2 is restyled.

### 1.6 Shared `.cs-*` primitives added to `src/index.css`  ✅
`.cs-card` (surface-1 + border + radius-lg + elev-1), `.cs-eyebrow` (mono uppercase
tracked `--text-3`), `.cs-instruction` (`var(--text-instruction)` = 26/600), `.cs-numeric`
(mono tabular), `.cs-step-card` (4px left accent from `--step-accent`).
Accent values (fixed, never swap): instruction `--instruction`, drug `--drug`, decision
`--decision`, timed `--timed`, roles `--roles`, confirm `--green`.

---

## 2. PER-SCREEN RESTYLE SPECS

Priority order: Protocol Runner → Emergency Dashboard → CPR Mode → Drug Card → the
remaining 8. Each spec maps DS tokens/components to the existing markup, gives the
exact treatment, and lists what must NOT change. Implement one screen, report the
rendered result (or screenshot), ping me to diff against the DS reference.

### 2.1 PROTOCOL RUNNER  — `src/components/ProtocolRunner.tsx`  *(top priority, the core screen)*

Reference: DS screenshots `02-runner-instruction`, `03-runner-roles`, `04-runner-decision`,
`06-runner-drug`; DS components `StepTypeBadge`, `ProgressSegments`, `DecisionGroup`, `Button`.
The current component's structure is sound — this is a **recolour + relayout of the footer**,
not a rewrite. Preserve every handler, the `aria-live` announcer, the `radiogroup`, the
`require_confirm` gate, the CPR-mode branch, and the iOS-PWA mic gate.

#### Layout map (top → bottom), with token treatment

**1. Root** (`line 176`): `min-h-screen bg-black … safe-area-top`
- Replace `bg-black` → `style={{ background: 'var(--bg)' }}` (drop `bg-black`, keep flex/`safe-area-top`).
- Remove `text-white`; DS body sets `--text-1`.

**2. Header** (`lines 178–221`) — sits below the notch; nothing tappable in top ~56px (the
`safe-area-top` on root handles this — verify the End/Mute/Mic buttons clear the Dynamic Island).
- **End-emergency button** (`X`, lines 180–186): one of the 4 always-visible controls. Keep
  top-left. Restyle to a chip: `background: var(--surface-2)`, `border: 1px solid var(--border)`,
  `border-radius: var(--radius-md)`. **Bump 36→44px** (`w-9 h-9` → `w-11 h-11`) — HARD constraint,
  current 36px fails the touch floor. Icon `color: var(--text-2)`. Keep `aria-label="End emergency"`.
- **Title block** (lines 187–192): `activeProtocol.title` → `var(--font-sans)` 600 `--text-1`,
  ~`--fs-meta`/15px. The "Step X of Y" line → `.cs-eyebrow` (renders `STEP 1 OF 7`). Text verbatim.
- **Mute + Mic buttons** (lines 195–219): same 44px chip. Off = `surface-2`/`border`. On-states:
  - Mute active → `background: var(--red-tint)`, border red-30%, icon `var(--red)`.
  - Mic listening → **teal** (DS toggle-on = teal): `background: var(--brand-tint)`, border
    teal-30%, icon `var(--brand)`. Replace `animate-pulse` with the DS `ping` ring or a subtle
    pulse — must flatten under reduced-motion (global).
  - Keep the `voiceCommandsSupported` gate exactly — never show the mic where STT is dead.

**3. Progress segments** (`lines 224–233`) — map 1:1 to DS `ProgressSegments`:
- `upcoming` → `var(--surface-3)`; height 3px → **5px** for glanceability.
- `i < current` (done) → `var(--green)`.
- `i === current` → `var(--text-1)` **plus** `box-shadow: 0 0 8px rgba(247,248,250,0.5)` (the
  current-glows cue). Replace the Tailwind colours. Keep `gap-1` (4px).

**4. Call 999 strip** (`lines 236–248`) — always-visible, one-tap. Keep the `<a href="tel:999">`
and `addEventLog('999_called', …)` exactly.
- Restyle: `background: var(--red-tint)`, `border: 1px solid color-mix(in srgb, var(--red) 25%,
  transparent)`, `radius-md`, full width, ≥44px. Icon + label `var(--red)`. Label "CALL 999" verbatim.
- Postcode suffix `practiceSetup?.postcode` → keep, `color: color-mix(in srgb, var(--red) 60%,
  transparent)`; render `· {postcode}` (DS: `CALL 999 · EH3 9QA`). Do not invent a postcode.

**5. Step-type badge** (`lines 257–263`) — replace the per-type Tailwind config (`stepTypeConfig`,
lines 167–172) with DS step-type tokens. Map app `step.type` → DS type — meanings FIXED, never swap:

| app `step.type`   | DS type       | accent var      | tint var          | lucide icon          | label      |
|-------------------|---------------|-----------------|-------------------|----------------------|------------|
| (default/none)    | `instruction` | `--instruction` | `--surface-2`     | `circle-arrow-right` | `ACTION`   |
| `drug`            | `drug`        | `--drug`        | `--drug-tint`     | `pill`               | `DRUG`     |
| `decision`        | `decision`    | `--decision`    | `--decision-tint` | `git-branch`         | `DECISION` |
| `timer_block`     | `timed`       | `--timed`       | `--timed-tint`    | `timer`              | `TIMED`    |
| `role_assignment` | `roles`       | `--roles`       | `--roles-tint`    | `users`              | `ROLES`    |
| (confirm gate)    | `confirm`     | `--green`       | `--green-tint`    | `check-check`        | `CONFIRM`  |

- Pill: `radius-pill`, mono uppercase `.cs-eyebrow` sizing, `color: var(--accent)`,
  `background: var(--tint)`, `border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent)`,
  icon 16px in accent. **Always render the badge** — add an `instruction` case so plain steps show
  `ACTION` (currently undefined → badge vanishes; DS always shows a type). Decision icon CHANGES
  `AlertTriangle` → `GitBranch` to match DS semantics (amber stays). **Flag the icon swap to me.**

**6. Step content card** (`lines 266–270`) — the most important element on screen.
- `.cs-card` + `.cs-step-card` with `--step-accent` set to the current step's accent var (4px left
  accent border — present in all four reference screenshots). Padding `p-5` (20px) — keep.
- Instruction text → **`.cs-instruction`** (26px / 600 / `--lh-snug`, `--text-1`). Top of the type
  ramp; nothing out-sizes it. Current 17px — **bump to 26px**. Keep `whitespace-pre-line`; render
  `currentStep.show` **verbatim** (never reword).

**7. Roles block** (`lines 273–287`) — only when `step.roles` present (ref `03-runner-roles`).
- Container `.cs-card`, accent `--roles`. Heading "Assign Roles" → `.cs-eyebrow` in `--roles`.
- Each role row: name pill `background: var(--roles-tint)`, border roles-30%, text `var(--roles)`,
  `radius-md`; task text `var(--text-2)`. `role.role` / `role.task` verbatim.

**8. Decision options** (`lines 289–319`) — map to DS `DecisionGroup` (ref `04-runner-decision`).
**Keep `role="radiogroup"` + `role="radio"` + `aria-checked` + no-auto-advance** (selection sets
state; Next is gated). Visual only:
- Question: show `currentStep.question` visibly above the options at `--fs-lead`/600 `--text-1`
  (still also the `aria-label`).
- Each option ≥56px (`--touch-comfort`), `surface-2` + `1.5px var(--border)`, `radius-md`, label
  `--fs-body`/500.
- **Selected → amber (`--decision`), NOT green:** `border-color: var(--decision)`, `background:
  var(--decision-tint)`, dot `var(--decision)`. Deliberate change — green is reserved for
  advance/confirm/GO; using it for "selected" muddies the GO signal. Reference confirms amber.
  **Flag this green→amber change to me before shipping** — it's the one colour-meaning the current
  build and DS disagree on, and it's safety-relevant signalling.
- Optional leading icon per answer (DS shows X / check) only if data supports — do not fabricate.
  Dot scale-in uses `--ease-snap`. Focus → `--focus-ring` (global).

**9. Drug button** (`lines 322–338`) — ref `06-runner-drug`; opens the Drug Card modal (handler
unchanged).
- Card `surface-2` / `border` / `radius-lg`; icon chip `background: var(--drug-tint)`, icon `var(--drug)`.
- `drug.name` → `--text-1`/600. `drug.adult_dose_text` → **`.cs-numeric`** at `--fs-meta`,
  `var(--text-2)`; render **verbatim** (do not edit the dose string). Add trailing `chevron-right`
  in `--text-3` as the affordance; the "Tap for full drug card →" copy may be dropped in favour of
  the chevron (non-clinical copy).

**10. Child dose bands** (`lines 342–346`) — `<ChildDoseBands drug={drug} />`, own spec in §2.5.
No change here beyond spacing; it inherits tokens.

**11. Timer display** (`TimerDisplay`, `lines 411–432`) — `timer_block` steps.
- Container `.cs-card`, accent `--timed`. Eyebrow "REASSESS TIMER" via `.cs-eyebrow` in `--timed` —
  **remove the `⏱` emoji**, use a lucide `timer` icon (DS = no emoji).
- `formattedTime` → `.cs-numeric` at `--fs-numeric` (64px) tabular, `color: var(--timed)`.
- Pause/Resume → DS secondary button, `radius-md`, ≥44px, timed-tint surface.

**12. Confirmation block** (`lines 357–370`) — the `require_confirm` gate (keep the logic).
- Container `.cs-card`, accent `--green`. Eyebrow "CONFIRM WHEN COMPLETED" via `.cs-eyebrow`;
  swap `CircleDot` → `check-check`. Copy verbatim.
- CONFIRM button → DS `primary` hero: `background: var(--green)`, text `--text-on-light` (`#0A0C10`),
  `radius-md`, ≥56px, optional `--glow-green`. Keep `handleConfirm`.

**13. Footer / nav** (`lines 374–400`) — **relayout required** (all four screenshots). Current = 3
equal columns. DS = **secondary Back/Repeat row ABOVE a full-width hero Next**:
```
[  ‹ Back   |   ↻ Repeat  ]   ← two secondary buttons, each ≥44px, gap --control-gap
[      Next step  ›        ]   ← full-width hero, 64px (--touch-hero), green primary
```
- Wrap in `safe-area-bottom` (present) so the hero sits **above the home-indicator inset** —
  non-negotiable. Keep `pb-3` plus the inset.
- Back: `secondary` (surface-2 / border), `disabled:opacity-40` (align DS 40%, current 30%), keep
  `disabled={currentStepIndex === 0}`.
- Repeat: `secondary`, `handleRepeat`, icon `rotate-ccw`.
- **Next step: full-width hero**, `background: var(--green)`, text `--text-on-light`/600, `radius-md`,
  `min-height: var(--touch-hero)` (64px), `chevron-right` right icon. Keep `disabled={…decision &&
  !selectedAnswer}` and `handleNext`. Label → "Next step" (DS) preferred (non-clinical). Replace
  `shadow-green-600/20` with `--glow-green` (reserved for this dominant action).

**14. Drug Card modal** (`lines 403–405`) — `<DrugCard … />`, restyled in §2.4.

#### Must NOT change (Runner)
- Any clinical string: `currentStep.show`, `.say`, `.question`, answer `label`s, `role`/`task`,
  `drug.adult_dose_text`, dose ratios. Restyle only.
- The `aria-live="assertive"` announcer (`lines 253–255`), `radiogroup`/`radio` roles, `aria-pressed`
  toggles, icon-button `aria-label`s.
- The `require_confirm` gating, the decision-branch routing (`goToStep`/`next`), no-auto-advance.
- The CPR-mode early return (`lines 153–161`) → CPRMode owns that screen (§2.3).
- The iOS-PWA mic gate. The force-render — never add nav that can cover the Runner.

#### Touch-target audit (fix during this pass)
- Header chips 36→**44px**. Decision options ≥56px. Footer Back/Repeat ≥44px, Next ≥64px. Call 999
  ≥44px. Progress segments are display-only. All hard constraints.

When implemented, report instruction/roles/decision/drug rendered states; I'll diff against DS reference.

---

### 2.2 EMERGENCY DASHBOARD — `src/components/EmergencyDashboard.tsx`  *(home / launchpad)*

Reference: DS screenshot `01-dashboard`; DS components `ConditionTile`, `IconButton`, `Button`;
UI-kit `ui_kits/resusiq-app/Dashboard.jsx`. **The biggest visual change in the whole app is here:**
the current dashboard uses fully-saturated gradient condition tiles; Clear Signal makes condition
tiles **dark `surface-1` cards with a subtle corner hue-wash + a tinted icon chip + a mono rank
number** (hue is decorative; the title + icon carry meaning). Only Call 999 (red) and Voice AI
(violet→fuchsia) stay saturated heroes.

#### Layout map (top → bottom)

**1. Root** (`line 63`): `min-h-screen bg-black text-white … safe-area-top`
- Drop `bg-black`/`text-white` → `style={{ background: 'var(--bg)' }}`. Keep flex + `safe-area-top`.

**2. App-bar / header** (`lines 65–93`) — below the notch (top ~56px clear).
- **Brand lockup** (lines 66–69): replace the red-gradient HeartPulse chip with the DS brand mark
  `src/design-system/assets/logo-mark.svg` (32px). Wordmark "ResusIQ" → render `Resus` in
  `--text-1`/500 + `IQ` in `--brand`/700 (DS lockup), `--fs-h3`-ish, `letter-spacing: -.02em`. The
  mode line ("Emergency Protocols" / "Training Mode") → `.cs-eyebrow` (`--text-3`). Keep both
  strings verbatim, including the training-mode swap.
- **Mute + Settings** (lines 78–91): DS `IconButton` treatment — 44px chip (**bump from 36px**),
  `surface-2` / `border` / `radius-md`, icon `--text-2`. Mute-on → `aria-pressed` teal
  (`--brand-tint` fill, `--brand` icon) — currently it only swaps the icon; add the pressed fill.
  Settings = ghost variant (no fill). Keep `aria-label`s and the `setScreen('setup')` handler.

**3. Hero row — Call 999 + Voice AI** (`lines 96–116`) — 2-col grid, gap 10px.
- **Call 999** (lines 99–106): keep `<a href="tel:999">`. Make it the DS critical hero:
  `background: var(--red-strong)` (#E11D2E, a SOLID fill, not a gradient), `box-shadow:
  var(--glow-red)`, `radius-lg`, min-height 92px, text/icon `#fff`. Left-aligned column: phone
  icon 26px, then "Call 999" (17px/700) + subtitle "Ambulance" (12px, 85% opacity). The red glow
  is one of the two reserved glows — appropriate here. Keep `active:scale-[0.97]`. Drop the inner
  radial-white overlay (DS uses a flat solid + glow).
- **Voice AI** (lines 108–115): keep `onClick={() => setScreen('ai_assistant')}`. `background:
  linear-gradient(140deg, var(--ai-from), var(--ai-to))` (violet→fuchsia — the only content
  gradient allowed, it signals AI mode), `radius-lg`, same 92px column. Mic icon + "Voice AI"
  (17px/700) + subtitle "Hands-free" (the current build has no subtitle — add "Hands-free" to
  match DS; non-clinical copy). Drop the inner radial overlay.
- Note: DS labels are "Call 999" / "Voice AI" in the kit; the current build uses uppercase. Either
  is acceptable (non-clinical) — **recommend keeping the app's uppercase** for stress-legibility
  consistency with the Runner's `CALL 999`.

**4. Practice address badge** (`lines 119–126`) — keep the conditional + the `name/address/postcode`
composition verbatim.
- Restyle: `background: var(--surface-1)`, `border: 1px solid var(--border)`, `radius-md`, ~10–14px
  padding. Map-pin icon `--brand` (DS uses `map-pin`; the app uses `Stethoscope` — **swap to
  `MapPin`**, it reads as "location" not "clinic"). Text `--text-2` at `--fs-meta`. Keep truncation.

**5. "Select Emergency" section label** (`lines 131–133`) — `.cs-eyebrow` (mono, `.14em`,
`--text-3`). Keep the text. (Current uses `.2em`/`zinc-600`; align to the eyebrow token.)

**6. Condition tiles grid** (`lines 134–160`) — the headline change. Map each tile to DS
`ConditionTile`. **Drop the `from-*/to-*/ring-*` gradient classes** from `emergencyTiles`
(lines 50–59) and replace `color`/`ring` with a single `--cond-*` hue token per condition:

| tile id          | current gradient    | DS hue token        |
|------------------|---------------------|---------------------|
| `cardiac_arrest` | red-600→800         | `--cond-cardiac`    |
| `anaphylaxis`    | orange-500→700      | `--cond-anaphyl`    |
| `choking`        | amber-500→700       | `--cond-choking`    |
| `asthma`         | blue-500→700        | `--cond-asthma`     |
| `chest_pain`     | rose-600→800        | `--cond-chest`      |
| `hypoglycaemia`  | purple-500→700      | `--cond-hypo`       |
| `seizure`        | violet-500→700      | `--cond-seizure`    |
| `syncope`        | slate-500→700       | `--cond-faint`      |
| `stroke`         | cyan-600→800        | `--cond-stroke`     |
| `adrenal_crisis` | amber-600→800       | `--cond-adrenal`    |

Per-tile structure (per `ConditionTile`):
- Card: `surface-1`, `1px var(--border)`, `radius-lg`, **min-height 116px**, `--card-pad` (16px),
  `active:scale(var(--press-scale))`, hover → `border-strong`, focus → `--focus-ring`.
- **Corner hue-wash:** absolutely-positioned layer, `opacity: 0.16`, `background:
  radial-gradient(120% 90% at 0% 0%, var(--cond-X), transparent 70%)`, `pointer-events:none`,
  `aria-hidden`. This is the only decorative colour on the tile.
- **Icon chip** (top-left, 40px, `radius-md`): `background: color-mix(in srgb, var(--cond-X) 22%,
  transparent)`, icon 24px in `var(--cond-X)`. Keep the existing `iconMap`/`protocol.icon` lookup.
- **Rank** (top-right): the `priority` number in mono `.cs-eyebrow`-ish, `--text-3`. (New element —
  DS shows the priority rank; the app already has `priority` in the data, just surface it.)
- **Title + subtitle** (bottom): title `--fs-lead`/600 `--text-1`; subtitle `--fs-meta` `--text-2`.
  Keep `tile.title` / `tile.subtitle` verbatim. Titles stay as the app has them (`HYPO`, `FAINT`,
  etc.) — condition labels border on clinical; **do NOT rename without the clinical reviewer**.
- Keep `onClick={() => startEmergency(tile.id)}` exactly.

**7. Bottom tab bar** (`lines 164–183`) — glass floating bar (DS).
- Container: floating with `left/right ~14px`, sit above the home-indicator (`safe-area-bottom`
  present — keep + ~8px), `background: var(--glass-bg)`, `backdrop-filter: var(--blur-bar)`,
  `border: 1px solid var(--border)`, `radius-xl`, `box-shadow: var(--elev-2)`. (App currently uses
  `bg-zinc-900/90 backdrop-blur-xl` — swap to the glass tokens.)
- Tabs: each ≥56px wide, icon 22px + label 10px. Inactive `--text-3`. **Active tab → `--brand`**
  (icon + label teal) when its screen is showing. On the dashboard none is active. Keep all 5
  `setScreen` handlers and labels (Triage/Library/SBAR/Reports/Training).
- Icon note: keep the app's existing tab icons (low stakes); the important change is the
  active-teal + glass treatment.

**8. Disclaimer** (`lines 186–190`) — keep verbatim ("Supports trained teams · Resuscitation
Council UK · SDCEP"). Style `--text-3` at ~11px, centered; fold into the end of the scroll area.

#### Must NOT change (Dashboard)
- `startEmergency(tile.id)`, `setScreen(...)`, `toggleMute`, the `tel:999` href, the training-mode
  conditional, the practice-address conditional + composition.
- Condition titles/subtitles — clinical-adjacent; verbatim unless the clinical reviewer signs off.
- The disclaimer text. The 10-condition set and their priority order.

#### Touch targets
- Mute/Settings 36→**44px**. Tiles ≥116px. Heroes ≥92px. Tab buttons ≥44px tall within the bar.

---

### 2.3 CPR MODE · 2.4 DRUG CARD
Full specs are in the companion file **`docs/design-handoff/redesign-implementation-2.3-2.4.md`**
(split out only to keep this file manageable; same rules apply). Headlines:
- **§2.3 CPR Mode** — red mode-wash background; 220px ring pulsing on the DS `resus-pulse-cpr`
  0.545s (110 BPM); compression count at **92px** mono `tone="critical"`; cycle+shock folded into
  one mono line; breath cue "2 RESCUE BREATHS" → **amber** + `wind` icon (was blue — flagged);
  integrity stats (30:2 / 100–120 / 5–6cm) untouched; AED modal → real `Sheet` dialog with a
  `Callout tone="contra"` for "Stand clear" (closes task #16). Never touch metronome/handlers/
  spoken strings.
- **§2.4 Drug Card** — modal → real `Sheet` dialog (task #16); subtle drug-tinted header (not the
  saturated purple gradient); adult dose green / child dose blue, **doses rendered in mono** so
  `1:1000`/`micrograms` stay unambiguous; warnings → `Callout tone="warn"`, contraindications →
  `Callout tone="contra"` (escalated red, emoji removed). Every clinical value verbatim.

### 2.5–2.13 — THE REMAINING NINE SCREENS
Full specs are in the companion file **`docs/design-handoff/redesign-implementation-2.5-2.13.md`**.
Covers: §2.5 Child Dose Bands, §2.6 Triage Wizard, §2.7 AI Voice Assistant, §2.8 Protocol Library,
§2.9 Call 999 Script, §2.10 SBAR Handover, §2.11 Event Reports, §2.12 Training Mode, §2.13 Practice
Setup — plus a shared **"Common patterns"** preamble (C1–C7) since most of these screens still use
the older `gray/blue-800/purple-700` palette and need full token migration, DS app-bar headers, and
token form inputs. Headlines:
- **Child Dose Bands** — keep the dose-with-concentration framing; mono doses; blue (`--roles`).
- **Triage / Call 999 / SBAR** — emergency-path utilities; YES/NO big binary fills, the verbatim
  999 script + SBAR template, postcode emphasis. Three more `Sheet` dialogs land in this group
  (AI settings, etc.) — all roll up under task #16.
- **AI Assistant** — violet→fuchsia mic + AI mood-wash + `ping` listening rings; teal "Open full
  protocol guide" hero; the system-instruction CLINICAL RULES block is safety content (verbatim).
- **Library / Reports / Training / Setup** — token migration; Training carries a persistent amber
  "TRAINING MODE" marker so a drill is never mistaken for a live emergency.

---

## Open questions for design-lead ↔ team-lead
1. **Decision selected-state colour:** current build uses green, DS uses amber (`--decision`).
   Recommend amber (keeps GREEN exclusively = GO/advance). Confirm before shipping §2.1.8.
2. **Decision step-type icon:** `AlertTriangle` → `GitBranch` (DS). Semantic improvement; confirm.
3. **"Next" → "Next step" label:** non-clinical; DS prefers "Next step". Confirm preference.
4. **Dashboard tile saturation (§2.2.6):** vivid gradients → dark hue-wash tiles. Correct Clear
   Signal direction; worth a user gut-check since it's the first screen seen.
5. **CPR breath-cue colour (§2.3.5):** current blue → DS amber (`--decision`). Recommend amber
   (blue is the roles hue; amber = attention/transition is correct and avoids a hue collision).
   It's a safety "shout" — confirm before shipping.
6. **AED modal + Drug Card + AI settings → `Sheet` (§2.3.9, §2.4.1, §2.7):** overlaps open task #16
   (dialog a11y). Coordinate so the dialog-trap work is done once with one shared `Sheet`.

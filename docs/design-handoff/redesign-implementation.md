# ResusIQ "Clear Signal" Redesign — Implementation Spec

Design authority: `design-lead`. Implementation: `team-lead`.
This document is the single source of truth for wiring the **Clear Signal** design
system (`src/design-system/`) into the live app. Section 1 (Foundation) is
implement-first. Per-screen specs (Section 2+) follow.

---

## 1. FOUNDATION WIRING SPEC  *(implement this first)*

### 1.0 Goal
Make every existing screen render on the Clear Signal foundation **without touching
component markup yet**: the dark base (`--bg #08090B`, not `#000`), IBM Plex type,
DS tokens as CSS custom properties, and the global base/motion behaviour (focus ring,
safe areas, `prefers-reduced-motion`). After this step the app should already look
"darker, Plex-typed, token-driven" — per-screen work then refines each surface.

### 1.1 Self-host the fonts — replace the Google Fonts `@import`
`@fontsource/ibm-plex-sans@5.2.8` and `@fontsource/ibm-plex-mono@5.2.7` are installed.
The DS copy at `src/design-system/tokens/fonts.css` still contains the cross-origin
Google Fonts `@import` (the DS caveat). **Replace that file's body** so it pulls the
self-hosted faces instead. Overwrite `src/design-system/tokens/fonts.css` with:

```css
/* ResusIQ webfonts — self-hosted via @fontsource (offline-safe, no cross-origin).
   Weights 400/500/600/700 cover the Clear Signal ramp (regular→bold). */
@import '@fontsource/ibm-plex-sans/400.css';
@import '@fontsource/ibm-plex-sans/500.css';
@import '@fontsource/ibm-plex-sans/600.css';
@import '@fontsource/ibm-plex-sans/700.css';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';
@import '@fontsource/ibm-plex-mono/600.css';
@import '@fontsource/ibm-plex-mono/700.css';
```

Notes:
- These `@fontsource/*/<weight>.css` entry points ship all subsets (latin, latin-ext,
  greek, cyrillic, vietnamese). For a UK app you may later switch to
  `@fontsource/ibm-plex-sans/latin-400.css` etc. to shave a few KB — **not required
  now**, do not block the restyle on it. Flag as an open perf item for `resusiq-perf-bundle`.
- Bare specifiers (`@fontsource/...`) resolve through Vite/node_modules; the emitted
  `.woff2` land in `assets/` and are precached by the existing PWA `globPatterns`
  (`**/*.{...,woff2}`) — so fonts work fully offline. No vite change needed for this.
- **Dead rule to remove later:** once the `@import` is gone, the
  `fonts.googleapis.com` `runtimeCaching` block in `vite.config.ts` (lines ~80–93)
  is dead. Leave it for now (harmless); note it for the perf agent to delete so we
  don't expand scope mid-restyle.

### 1.2 Import the DS into the app — single entry, BEFORE Tailwind utilities
The DS `styles.css` is `@import`-only and already lists fonts→colors→typography→
spacing→radii→elevation→motion→base in the right order.

In `src/index.css`, make the **first lines**:

```css
@import "./design-system/styles.css";
@import "tailwindcss";
```

Order matters: DS first establishes `:root` tokens + base element defaults; then
Tailwind's preflight + utilities layer on top. Because Tailwind 4's preflight is in a
`@layer`, app utility classes still win specificity where used — the DS base only
sets unlayered element defaults (`body`, focus-visible, safe-area helpers), which is
what we want as the floor.

### 1.3 Reconcile the existing `:root` / `body` block in `src/index.css`
The current `src/index.css` hard-codes a competing foundation that will fight the DS.
Apply these edits (remove/replace — do **not** keep both):

- **`:root` font-family (lines 5–6):** delete the `-apple-system … sans-serif` stack.
  The DS `base.css` already sets `body { font-family: var(--font-sans) }`. Leaving the
  old stack overrides Plex.
- **Legacy safe-area vars `--sat/--sab/--sal/--sar` (lines 11–14):** keep for now —
  components may reference them. The DS adds `--safe-top/-bottom/-left/-right` (same
  `env()` values). **Do not rename component usages in this pass.** Treat the two sets
  as aliases; we converge them in cleanup.
- **`body { background-color: #000000 }` (line 29):** **remove** this rule. The DS sets
  `background: var(--bg)` = `#08090B`. Pure black is explicitly rejected by Clear Signal
  (halation under clinical light). Same for any other `#000`/`bg-black` you control at
  the root — but **leave Tailwind `bg-black` classes inside components alone for now**;
  they get swapped per-screen in Section 2.
- **`color: white` (line 30):** remove; DS sets `color: var(--text-1)` (`#F7F8FA`).
- **Keep:** `overscroll-behavior`, `-webkit-overflow-scrolling`, the
  `input/select/textarea/button { font-size:16px }` rule (matches DS anti-zoom),
  `touch-action: manipulation`, the desktop scrollbar block, and the
  `display-mode: standalone` padding.
- **Animations (`pulse-cpr`, `fade-up`):** the app defines `pulse-cpr` (0.5s) and
  `fade-up` (0.25s); the DS defines `resus-pulse-cpr` (0.545s, tied to 110 BPM) and
  `resus-fade-up` (260ms). **Keep the app's existing classes for now** so nothing
  breaks; CPR Mode (Section 2.3) will migrate to the DS 110-BPM timing as part of its
  restyle. Do not delete the app keyframes in this pass.
- **`.touch-target` / `.tabular-nums` / `.no-select`:** keep. They coexist with the DS
  `.resus-tnum` / `.resus-no-select`. No change.

### 1.4 Update the meta theme-color to the new base
Two places still say `#000000`:
- `index.html` `<meta name="theme-color">` (verify/insert) → set to `#08090B`.
- `vite.config.ts` manifest `theme_color` and `background_color` → `#08090B`.

This keeps the iOS status bar / splash from flashing pure black against the
`--bg #08090B` app. **Low risk, do it in the foundation pass.** (Manifest change =
new SW precache; acceptable.)

### 1.5 Tailwind ↔ token strategy (READ — this governs every per-screen spec)
We are **not** rewriting Tailwind config to remap its palette. Tailwind 4 here is
CSS-first (`@import "tailwindcss"`, no JS theme). The chosen approach:

> **Tokens are the source of truth; per-screen we replace ad-hoc Tailwind color/
> radius/spacing utilities with token-driven inline styles or small utility classes.**

Concretely, for each screen in Section 2:
- **Surfaces/borders/text/semantic colours →** use the DS tokens via `style={{…}}` or
  `var(--token)` (e.g. `style={{ background: 'var(--surface-1)', border: '1px solid
  var(--border)' }}`). Replace `bg-zinc-900`, `bg-black`, `border-white/10`,
  `text-white`, `text-zinc-400`, `bg-red-600`, etc.
- **Layout utilities (flex, grid, gap, padding, w/h, rounded) →** **keep Tailwind**
  where the value already matches a token (e.g. `rounded-2xl` ≈ `--radius-2xl 24px`,
  `p-4` = 16px = `--card-pad`, `p-5` = 20px = `--card-pad-lg`, `gap-3` = 12px =
  `--stack-gap`). The 4px grids align, so most spacing utilities are already on-token.
- **Do NOT** introduce a parallel hand-rolled spacing scale. Use Tailwind for box
  layout, tokens for *appearance*. This keeps diffs small and reviewable.
- A handful of repeated appearance patterns (DS card, step-card left accent, eyebrow
  label, hero button) should become **named utility classes** added once to
  `index.css` so screens stay terse. Provide these now (Section 1.6) so per-screen
  specs can reference them by name.

### 1.6 Shared utility classes to add to `src/index.css` (after the imports)
Add these once; per-screen specs reference them. (Class names are new; they do not
collide with Tailwind.)

```css
/* ── Clear Signal shared primitives ─────────────────────────── */
.cs-card {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--elev-1);
}
.cs-eyebrow {                 /* STEP 4 OF 9 · ADULT DOSE · CYCLE 2 */
  font-family: var(--font-mono);
  font-size: var(--fs-eyebrow);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-3);
}
.cs-instruction {             /* the primary protocol step — largest body element */
  font: var(--text-instruction);
  color: var(--text-1);
}
.cs-numeric { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
/* Step-type left accent: set --step-accent per type, then add .cs-step-card */
.cs-step-card { border-left: 4px solid var(--step-accent, var(--instruction)); }
```

Step-accent values (fixed meaning — never swap): instruction `var(--instruction)`,
drug `var(--drug)`, decision `var(--decision)`, timed `var(--timed)`, roles
`var(--roles)`, confirm `var(--green)`.

### 1.7 Definition of done for the foundation pass
- App boots; background is `#08090B`; all text renders in IBM Plex Sans (verify in
  devtools computed `font-family`); numerics/eyebrows can opt into Plex Mono.
- Keyboard `Tab` shows the DS double focus ring (`--focus-ring`) on buttons/links.
- `prefers-reduced-motion: reduce` flattens animations (DS `motion.css` handles globally).
- Safe-area helpers still pad the notch/home-indicator (unchanged behaviour).
- No screen is broken/unreadable — only recoloured to the dark base. Per-screen
  refinement happens next.

**Send me a screenshot of the Dashboard + Runner after the foundation pass and I'll
confirm before we start Section 2.**

---

## 2. PER-SCREEN RESTYLE SPECS

Priority order: Protocol Runner → Emergency Dashboard → CPR Mode → Drug Card → the
remaining 8. Each spec maps DS tokens/components to the existing markup, gives the
exact treatment, and lists what must NOT change. Implement one screen, screenshot it,
ping me to diff against the DS reference.

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

When implemented, send me instruction/roles/decision/drug screenshots; I'll diff against DS reference.

---

### 2.2 EMERGENCY DASHBOARD — _spec pending (next)._
### 2.3 CPR MODE — _spec pending._
### 2.4 DRUG CARD — _spec pending._
### 2.5 CHILD DOSE BANDS · 2.6 TRIAGE WIZARD · 2.7 AI ASSISTANT · 2.8 PROTOCOL LIBRARY · 2.9 CALL 999 SCRIPT · 2.10 SBAR HANDOVER · 2.11 EVENT REPORTS · 2.12 TRAINING MODE · 2.13 PRACTICE SETUP — _specs pending._

---

## Open questions for design-lead ↔ team-lead
1. **Decision selected-state colour:** current build uses green, DS uses amber (`--decision`).
   Recommend amber (keeps GREEN exclusively = GO/advance). Confirm before shipping §2.1.8.
2. **Decision step-type icon:** `AlertTriangle` → `GitBranch` (DS). Semantic improvement; confirm.
3. **"Next" → "Next step" label:** non-clinical; DS prefers "Next step". Confirm preference.

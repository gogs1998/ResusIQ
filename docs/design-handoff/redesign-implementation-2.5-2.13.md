# Clear Signal Redesign — §2.5 through §2.13 (remaining screens)

Companion to `redesign-implementation.md`. Same rules: tokens for appearance, Tailwind
for layout, **never reword clinical/operational content** (drug doses, SBAR/999 script
text, contraindications, reference citations). Several of these screens predate the
zinc/black polish and still use an **older `gray-900 / gray-800 / blue-800 / purple-700`
Tailwind palette** — they need the most colour migration.

## Common patterns (apply to every non-emergency screen here)

These are utility screens reached via the tab bar / settings, not live-emergency surfaces
(except Triage and the two handover screens, which sit on the emergency path). Apply
consistently so the whole app reads as one system:

**C1 — Root:** `bg-gray-900`/`bg-black` → `style={{ background: 'var(--bg)' }}`; drop
`text-white` (DS body sets `--text-1`). Keep `safe-area-top`/`safe-area-bottom`.

**C2 — App-bar header:** the coloured header bars (`bg-gray-800`, `bg-red-700`,
`bg-blue-800`, `bg-purple-700`, `style={{backgroundColor: protocol.color}}`) → a flat
`var(--bg)` or `var(--surface-1)` bar below the notch, `--appbar-h` (52px), with a 44px
back `IconButton` (surface-2 chip, `aria-label`), an `--fs-h3`/600 `--text-1` title, and an
optional `.cs-eyebrow` subtitle. **No saturated coloured header bars** — Clear Signal puts
colour on semantic elements, not chrome. Back chips **must be ≥44px** (several are currently
`p-2` ~32–36px).

**C3 — Cards/sections:** `bg-gray-800`/`bg-gray-800/50` → `.cs-card` (surface-1 + border +
radius-lg). Section labels → `.cs-eyebrow`.

**C4 — Form inputs** (SBAR, Practice Setup, Library search): `bg-gray-800/700 border-gray-700`
→ `background: var(--surface-2)`, `border: 1px solid var(--border)`, `radius-md`, text
`--text-1`, placeholder `--text-3`. **Keep `font-size:16px`** (anti-iOS-zoom — DS base already
enforces). Focus → DS `--focus-ring` via `:focus-visible` (replace `focus:border-blue-500`).
Min-height 44px.

**C5 — Buttons:** map to DS variants — primary/advance = `--green` + `--text-on-light`;
critical/999 = `--red-strong`; secondary = surface-2 + border; brand/teal = `--brand`.
Replace `active:scale-95/98` with the DS `active:scale(var(--press-scale))` (0.97). All ≥44px;
primary bottom actions ≥56px.

**C6 — Tab bar:** screens reachable from the dashboard tabs should, when shown, light their
tab `--brand` (see §2.2.7). If these screens don't render the tab bar themselves, no-op.

**C7 — Emoji removal:** strip `⏱️`, `⛔`, and any pictographs (Library drug detail, etc.) —
replace with lucide icons (`timer`, `triangle-alert`). Clinical tone = no emoji (DS rule).

---

### 2.5 CHILD DOSE BANDS — `src/components/ChildDoseBands.tsx`  *(shared by Runner + Drug Card)*

Small, high-stakes table. **The whole point of this component is that the volume is never read
without its concentration** (the `drug.name` carries `1:1000`) — preserve that framing exactly.

- Container: blue dose-block to match the Drug Card child-dose colour — `background:
  var(--roles-tint)`, `border: 1px solid color-mix(in srgb, var(--roles) 20%, transparent)`,
  `radius-lg`, `--card-pad`.
- Label "CHILD DOSE — BY AGE" → `.cs-eyebrow` in `var(--roles)`. The `{drug.name}` line
  (carries the concentration) → `--fs-meta`/600, `color: color-mix(in srgb, var(--roles) 90%,
  white)` — **keep it prominent and verbatim**; it is a safety anchor.
- Each band row: `band.label` (age) → `--text-2`; `band.dose` → **`.cs-numeric`** (mono tabular)
  700 in a light blue (`color-mix(--roles + white)`); `band.volume_ml` suffix → `--text-3`,
  rendered as `· {volume_ml}` (keep the mid-dot). Dividers → `border-color: color-mix(in srgb,
  var(--roles) 15%, transparent)`.
- **Must NOT change:** the by-age band data, the dose/volume pairing, the name-with-concentration
  line, the `null` guard. No value edits.

---

### 2.6 TRIAGE WIZARD — `src/components/TriageWizard.tsx`  *(emergency-path; routes to a protocol)*

Old palette → tokens. This screen **routes into an emergency** so it must stay fast and
unambiguous. Keep ALL routing logic (`handleAnswer`, `determineProtocol`, the conscious+not-
breathing → cardiac_arrest shortcut, `startEmergency`).

- Root + header → C1/C2. Title "Quick Triage" / "Triage Result"; subtitle "Question X of N"
  → `.cs-eyebrow`.
- **Progress bar** (lines 182–187): track `var(--surface-3)`, fill `var(--brand)` (teal — this is
  navigation progress, not step-done; reserve green for GO). Keep the width calc.
- **Question** (line 192): `--fs-instruction` (26px)/600 `--text-1`, centred — it's the primary
  read.
- **YES / NO buttons** (lines 197–210): these are the critical choice. Keep them large (≥`--touch-
  hero` tall feels right given the 2-col full-height layout). **YES = `--green`** fill +
  `--text-on-light`, check icon; **NO = `--red`/`--red-strong`** fill + `--text-on-color`, X icon.
  Labels "YES"/"NO" verbatim. `active:scale-95` → 0.97. These are the one place big saturated
  fills are right (binary life-safety choice).
- **Result view** (lines 117–160): the recommended-protocol card. Replace the inline
  `style={{backgroundColor: recommendedProtocol.color}}` saturated block with a `.cs-card` carrying
  the matching `--cond-*` hue as a **corner wash + tinted title** (consistent with the dashboard
  tiles), not a full fill. `AlertTriangle` warning glyph → keep amber `--decision`. "START PROTOCOL"
  → green hero ≥56px (`--glow-green` ok). "Choose different protocol" → secondary.
- **Emergency shortcut footer** (lines 216–236): "If in doubt…" — keep both shortcuts. CARDIAC
  ARREST + CALL 999 → `--red`/`--red-strong` criticals, ≥44px, inside `safe-area-bottom`. Wrapper
  `bg-red-900/50` → `var(--red-tint)`.
- **Must NOT change:** all triage routing, the recommended-protocol determination, the
  cardiac-arrest fast path, question text (clinical), `startEmergency` calls.

---

### 2.7 AI VOICE ASSISTANT — `src/components/AIAssistant.tsx`  *(violet→fuchsia "AI mode")*

Reference: DS screenshots `09-voice-assistant`, `10-voice-listening`; UI-kit
`ui_kits/resusiq-app/AIAssistant.jsx`. This screen owns the **AI hue (violet→fuchsia gradient)**
and the listening-mic motif. It already uses `motion/react` — keep all animation behaviour but
ensure it degrades under `prefers-reduced-motion`.

- Root → C1, with the AI mood-wash: `background: radial-gradient(120% 60% at 50% 35%,
  rgba(139,92,246,0.18), var(--bg))` (the violet tint that signals AI mode — one of the two
  allowed mood washes; mirrors the CPR red wash).
- Header (back, "AI Voice Assistant", settings) → C2. Keep the API-key/settings entry; if it opens
  a modal, use the DS `Sheet` (and that's the third task-#16 dialog — coordinate).
- **Call 999 strip** at top → same DS critical strip as the Runner (§2.1.4). Keep it; the AI screen
  is reachable mid-emergency.
- **Mic orb** (centrepiece): circular, `background: linear-gradient(140deg, var(--ai-from),
  var(--ai-to))`, `--glow-ai` shadow. **Idle** = static. **Listening** = DS `ping` rings
  (`resus-ping`) radiating + a subtle scale pulse; **recording** = a `resus-blink` live dot.
  Map the existing motion states to these. Status text below ("System ready" / "Listening…" /
  errors) → `--text-1`/600 + `--text-3` helper. Keep the exact status strings.
- **"Open full protocol guide"** bottom button → DS **brand** hero (`--brand` teal fill,
  `--text-on-light`), ≥56px, `arrow-right` icon, inside `safe-area-bottom`. (DS screenshot shows
  teal here — the one prominent teal action in the app.)
- Error/permission callouts → DS `Callout` (`warn`/`info`).
- **Must NOT change:** the Gemini Live session logic, `buildSystemInstruction` (its CLINICAL RULES
  block is safety content — no stroke aspirin, anaphylaxis no upper limit, midazolam single dose,
  MI oxygen only if SpO2<94%, aspirin chew — **verbatim**), `PROTOCOL_MAP`, the dynamic import,
  the audio streamer, tool-calling.

---

### 2.8 PROTOCOL LIBRARY — `src/components/ProtocolLibrary.tsx`  *(reference browser)*

Three views (list, protocol detail, drug detail). Old palette → tokens throughout.

- All roots/headers → C1/C2. The two coloured detail headers
  (`style={{backgroundColor: protocol.color}}`, `bg-purple-700`) → flat app-bar; carry the hue as a
  small tinted icon chip + accent, not a full bar.
- **Search** (lines 255–266) → C4 input with a leading `search` icon in `--text-3`.
- **View-mode toggle** (Protocols / Drugs, lines 269–288): a segmented control — track
  `var(--surface-2)`, active segment `var(--brand-tint)` + `--brand` text (Protocols) ... but
  **keep the drug segment association with `--drug` purple** to stay consistent (active Drugs
  segment = `--drug-tint` + `--drug`). Replace `bg-blue-600`/`bg-purple-600`.
- **List rows** (protocols + drugs): `.cs-card` rows; protocol icon chip uses the `--cond-*` hue
  (tinted, like the dashboard tiles); drug rows use a `--drug`-tinted chip showing `drug.route`.
  Title `--text-1`/600; meta `--text-2`; the green `drug.adult_dose` line → keep green, mono.
  Chevron `--text-3`.
- **Protocol detail**: "START THIS PROTOCOL" → green hero ≥56px (it launches a live emergency —
  keep `startEmergency`). Steps overview → `.cs-card`; per-step type label uses the matching
  step-type accent (reuse the §2.1.5 mapping). References → mono pill chips (`--surface-2`).
- **Drug detail** (lines 124–235): this is a **second drug renderer** that duplicates the Drug
  Card. Apply the SAME treatment as §2.4 (green adult / blue child / mono doses / `Callout`
  warn+contra / mono ref chips). **Strip the `⏱️` and `⛔` emoji.** Every clinical value verbatim.
  *Flag:* consider (later, not now) refactoring this to reuse the `DrugCard` body so the two can't
  drift — note for team-lead, out of scope for the restyle.
- Footer note "Based on Resuscitation Council UK 2025 & SDCEP guidance" → `--text-3`, verbatim.
- **Must NOT change:** protocol/drug data, references, step text, `startEmergency`, search logic.

---

### 2.9 CALL 999 SCRIPT — `src/components/CallScript.tsx`  *(operational, read aloud to dispatcher)*

Old palette (`gray-900`, `red-700`, `yellow-600`) → tokens. **Every script line is read verbatim
to a 999 operator — do not reword any of it** (AMBULANCE, the location/postcode, the per-protocol
patient-state strings, the reminders).

- Root + header → C1/C2; header was `bg-red-700` → flat bar, but keep a `phone` icon in `--red`
  and the elapsed timer (mono, `.cs-numeric`, `--text-2`) top-right. Title "999 Call Script".
- **TAP TO CALL 999** (lines 114–121) → the DS critical hero: `--red-strong` solid + `--glow-red`,
  `--text-on-color`, `--fs-h2`-ish, `radius-lg`, ≥`--touch-hero`. Keep `<a href="tel:999">`. Label
  verbatim.
- **Practice address block** (lines 124–139) — currently the loud yellow box. Keep it PROMINENT
  but on-system: `.cs-card` with a `--decision`(amber) accent (left border + tinted), `map-pin` in
  `--decision`. Practice name `--text-1`/700; address `--text-2`; **postcode emphasised** mono
  `--decision`/700 (it's the single most important field for the ambulance). Render
  `practiceName/address/postcode/phone` and the `[… not set]` fallbacks verbatim.
- **Script steps** (`ScriptStep`, lines 207–221 + 154–179): each → `.cs-card` with a numbered
  chip (`--brand`-tinted circle, mono number). Instruction line `--text-3`; the spoken lines in
  quotes → `--text-1`, with the existing emphasis kept (AMBULANCE red, postcode amber, emergency
  orange→`--cond-anaphyl`/keep). **All quoted text verbatim.** The "Copy" button → secondary, with
  the existing copied-state check.
- **Remember list** (lines 182–191) → `.cs-card`, `--text-2` bullets. Verbatim (SPEAKER MODE, don't
  hang up, meet ambulance, etc.).
- **Back to Protocol** (lines 194–202) → secondary, ≥44px, `safe-area-bottom`. Keep
  `setScreen('protocol')`.
- **Must NOT change:** `scriptLines`, `getPatientState()` and ALL its per-protocol strings, the
  `drugGiven()` event-log logic (it correctly avoids asserting un-given drugs — preserve exactly),
  the copy/clipboard behaviour, the timer.

---

### 2.10 SBAR HANDOVER — `src/components/SBARHandover.tsx`  *(paramedic handover builder)*

Old palette (`gray-900`, `blue-800`) → tokens. Form-heavy. **The generated `sbarText` and its
structure are operational content — do not reword the SBAR template, the auto-filled assessment,
or the action-log entries.**

- Root + header → C1/C2; `bg-blue-800` header → flat bar with a `clipboard-list` icon in `--brand`.
  Title "SBAR Handover".
- **"What is SBAR" explainer** (lines 116–121) → DS `Callout tone="info"` (brand/teal-tinted).
  Verbatim.
- **Form sections** (Patient Details, Background, Additional) → C3 section labels + C4 inputs/
  textareas/select. Selects/inputs all `surface-2` + border + 16px + focus-ring. Placeholders
  verbatim (incl. "NKDA if none known").
- **Auto-filled Assessment** (lines 184–210) → `.cs-card`; "Emergency:" value keep emphasised
  (→ `--cond-anaphyl` or `--decision`); the action log → mono timestamps (`--text-3`) + labels
  (`--text-2`). "No logged actions yet" italic `--text-3`.
- **Handover preview** (lines 224–230) → the `<pre>` block: `background: var(--surface-inset)`
  (recessed well), `border`, mono `--text-2`, `radius-lg`. Keep `whitespace-pre-wrap`. **The SBAR
  text is generated content — verbatim.**
- **Action buttons** (lines 233–249): Copy → secondary; Share → `--brand` primary. Both ≥44px,
  `safe-area-bottom`. Keep `handleCopy`/`handleShare`.
- **Must NOT change:** `buildSBAR()` and the entire SBAR template/format, the event-log timeline,
  the editable-field state, share/copy logic.

---

### 2.11 EVENT REPORTS — `src/components/EventReports.tsx`  *(post-event log history)*

(Not separately read in full — apply the common patterns; key points below. team-lead: if the
structure differs, ping me and I'll spec specifics.)
- Root + header → C1/C2. Lists of past events → `.cs-card` rows; timestamps mono `--text-3`; event
  type labels carry the matching semantic colour (drug_given → `--drug`, 999_called → `--red`,
  shock_delivered → `--decision`, step_completed → `--green`, rosc → `--brand`) as a small dot +
  label (colour+label, never colour alone). Export/share buttons → secondary/`--brand`.
- Empty state → `--text-3`, centered, calm.
- **Must NOT change:** the event-log data, timestamps, exported report content.

---

### 2.12 TRAINING MODE — `src/components/TrainingMode.tsx`  *(practice/sim, non-live)*

(Apply common patterns; key points below.)
- Root + header → C1/C2. **Training must be visually distinct from a live emergency** so users
  never confuse a drill with the real thing: carry a persistent **`--decision` (amber) "TRAINING
  MODE" banner/eyebrow** at the top (mono, `.cs-eyebrow`, amber) — the dashboard already swaps its
  mode line to "Training Mode"; echo that here. Do NOT use red chrome (reserved for real
  criticals).
- Scenario cards / start buttons → `.cs-card` + DS buttons (start = `--brand` or `--green`).
- **Must NOT change:** the training scenarios, any embedded protocol content, the `isTrainingMode`
  store flag behaviour.

---

### 2.13 PRACTICE SETUP — `src/components/PracticeSetup.tsx`  *(multi-step settings wizard)*

Old palette → tokens. Form + checklist wizard (equipment, drugs, staff roles, address).
- Root + header → C1/C2. Step indicator → `.cs-eyebrow` "STEP X OF N" + a teal `--brand` progress
  bar (navigation progress, not GO-green).
- Form fields (name/address/postcode/phone) → C4 inputs. Address `map-pin` `--brand`.
- **Equipment / drugs checklist** (`defaultEquipment`, `defaultDrugs`): each toggle → DS `Switch`
  pattern (teal `--brand` on-state via `aria-pressed`/checked) or a `.cs-card` row with a check;
  present = `--green` check, absent = `--text-3`. **Keep the item names verbatim** — they include
  clinical specifics ("Adrenaline 1:1000", "Aspirin 300mg", "Midazolam Buccal", "Non-rebreather
  Mask") that must not be abbreviated.
- **Staff roles** (`defaultStaffRoles`): role pills in `--roles` blue (consistent with the Runner's
  roles step); task lists `--text-2`. Verbatim.
- Save button → `--green`/`--brand` primary ≥56px, `safe-area-bottom`. Keep `setPracticeSetup`.
- **Must NOT change:** the equipment/drug/role default lists and their names, the saved
  `PracticeSetup` shape, `crypto.randomUUID` id handling, the wizard step logic.

---

## Cross-screen notes
- **Old-palette screens** (Triage, CallScript, SBAR, Library, Reports, Training, Setup) carry the
  largest diffs — they were never migrated to the zinc/black polish, let alone Clear Signal. Budget
  accordingly; these are lower-risk than the emergency core but higher line-count.
- **Three more `Sheet` dialogs** surface here (AI settings/API-key, and the Library could reuse the
  DrugCard Sheet) on top of the Drug Card + AED modals — all roll up under open task #16's dialog
  a11y pattern. Do them with one shared `Sheet`.
- **Consistency anchors to enforce everywhere:** Call 999 = red strip/hero; child dose = blue
  (`--roles`); adult dose = green; drug = purple; decision/attention = amber; brand actions = teal;
  AI = violet→fuchsia. Never colour-only — always icon + label.

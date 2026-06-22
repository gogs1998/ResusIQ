# design-handoff / design-lead — outbox

## 2026-06-20 — Foundation wiring spec delivered

Wrote `docs/design-handoff/redesign-implementation.md` Section 1 (Foundation). Key:
self-host @fontsource Plex; import DS tokens before tailwindcss; remove competing
#000/white/-apple-system; theme-color #08090B; tokens=appearance / Tailwind=layout;
6 `.cs-*` primitives.

## 2026-06-20 — Foundation IMPLEMENTED + §2.1/§2.2 specs delivered

team-lead implemented §1 (commit 7f70585, branch resusiq-redesign), build-green.
Approved the direct-token-import workaround (Vite 8/rolldown doesn't rebase styles.css
nested @imports). Proceeding without the screenshot gate (user drives the browser);
team-lead reports renders back.
- §2.1 PROTOCOL RUNNER — header chips→44px, DS segmented progress, Call 999 strip,
  step-type badge table (6 fixed types), `.cs-instruction` 26px + 4px accent, footer
  relayout (Back/Repeat over full-width 64px hero Next). a11y preserved.
- §2.2 EMERGENCY DASHBOARD — brand lockup, Call 999 solid red+glow / Voice AI gradient,
  condition tiles gradient→dark surface-1 + hue-wash + icon chip + mono rank, glass tab bar.

## 2026-06-20 — §2.3 CPR + §2.4 Drug Card delivered (companion -2.3-2.4.md)

- §2.3 CPR — red mode-wash; 220px ring on resus-pulse-cpr 0.545s (110 BPM); count 92px
  mono critical; cycle+shock one mono line; breath cue blue→amber + wind; integrity stats
  untouched; AED modal → Sheet + contra Callout (task #16); added 2 missing aria-labels.
- §2.4 DRUG CARD — modal → Sheet (task #16); drug-tinted header; adult green / child blue;
  doses in MONO; warnings→Callout warn, contra→Callout contra; emoji removed; verbatim.

## 2026-06-20 — §2.5–§2.13 delivered (companion -2.5-2.13.md) — ALL 13 SCREENS DONE

Remaining nine + a shared "Common patterns" (C1–C7) preamble. Big finding: Triage,
CallScript, SBAR, Library, Reports, Training, Setup still use the OLD gray/blue-800/
purple-700 palette → largest diffs (full token migration, DS app-bar headers, token form
inputs, emoji removal). Notes: AI system-instruction CLINICAL RULES verbatim; Library
drug-detail is a 2nd DrugCard renderer (flagged future refactor to share body); 999
script + getPatientState + buildSBAR verbatim; Training carries a persistent amber
"TRAINING MODE" marker; task #16 now covers 3+ dialogs (DrugCard, AED, AI settings) →
one shared Sheet.

Open questions (6, main-doc footer): decision selected green→amber; decision icon
AlertTriangle→GitBranch; "Next"→"Next step"; dashboard tile saturation; CPR breath-cue
blue→amber; Sheet/task-#16 overlap. Recommended resolving Q1+Q2 before shipping Runner.

STATUS: full per-screen series complete. team-lead can implement straight through in
priority order. Now in review mode — diffing each rendered screen against the DS
reference as team-lead reports, answering open questions as they arise.

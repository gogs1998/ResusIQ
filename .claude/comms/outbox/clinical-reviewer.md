# Clinical reviewer — outbox

## 2026-08-13 · Rulings on the six Grok-fix flow designs (persisted by team-lead; reviewer's Write disabled)

Condensed version in memory/clinical-decisions.md ("GROK-FIX RULINGS — 2026-08-13"). This file records the operative details implementers must follow verbatim.

### R1 — Deterioration landing (F1/F3): APPROVE WITH MODIFICATION (blocking)
Land on `cardiac_arrest.start_cpr` for ALL deterioration entries (escape rail, switch_protocol actions, triage unconscious+not-breathing fast-path). Fresh entries keep the full sequence. BLOCKING wording change — protocols.ts `start_cpr` must become:
- say: `Start CPR now. Give 30 chest compressions, then 2 rescue breaths. Send someone for the defibrillator and make sure 999 is on the line.`
- show: `Start CPR now.\n\n30 compressions, then 2 breaths.\nSend someone for the defibrillator and 999 — do not stop compressions to wait.`
Rationale: shout_help is the only send-for-AED link; skipping it silently would be a NEW safety defect (early defibrillation = survival). RCUK/ERC 2025: delegate AED retrieval while compressions run. Copy stays entry-agnostic. EscapeRail sub-label → `Tap to start CPR now`. RECOMMENDED (non-blocking): answer-level actions so arrest-check "Yes" reaches compressions in one tap; existing bridge acceptable otherwise.

### R2 — 999 logging (F4): OPTION (b) MODIFIED (blocking)
Remove `log:999_called` from anaphylaxis call_help / chest_pain call_999_chest / stroke time_call / adrenal call_999_adrenal (keep `suggest:call_999`). Primary CTA `999 called — continue` (logs + advances) + MANDATORY secondary `Not yet — continue anyway` (advances, no log) — treatment must never gate behind asserting a phone call (delegated-call workflow is guideline-concordant: SDCEP/RCUK role model). Keep tel:999 pill logging; dedupe pill-tap vs confirm on the same event. F17 (hypo/asthma/seizure same treatment) recommended later, non-blocking.

### R3 — max_doses (F2/F11): APPROVE WITH MODIFICATION
Hard block (confirm refused): midazolam_buccal 1 (BUCCOLAM SmPC §4.2), glucagon_im 1 (SDCEP stock constraint — wording must not claim pharmacology). Escalation state (confirm STAYS LIVE, warning primary; GTN's confirm behind the warning): oral glucose 3, GTN 3 (escalation thresholds — a hard block would create UNRECORDED doses). NO long-press override (hidden gesture → 2nd dose of a Schedule 3 CD: rejected). Block the affordance, never the record.
Prescribed state wording (HH:MM = time of prior dose from the log):
- midazolam: `Midazolam already given at HH:MM` / `Single dose only — do not repeat. Keep their airway clear and have suction ready. If the seizure has not stopped 10 minutes after the dose, tell the 999 call handler.`
- glucagon: `Glucagon already given at HH:MM` / `One dose is all the practice kit holds. It takes 10 to 15 minutes to work. Keep them in the recovery position, wait for the ambulance, and give oral glucose as soon as they can swallow safely.`
- glucose: `3 doses given — this is not responding` / `Call 999 now. Check they are fully awake and can swallow safely before giving any more.`
- GTN: `3 sprays given — treat this as a heart attack` / `Call 999 now. Do not give more GTN if they are light-headed or their systolic BP is below 100.`

### R4 — Seizure clock (F9): APPROVE + MANDATORY GUARD (blocking)
Monotonic wall-clock anchored at first time_seizure entry; loop never resets it; ≥5 min auto-routes to `prolonged_seizure` (the still-seizing check) — NEVER directly toward call_999_seizure/give_midazolam (a stopped seizure must not be walked toward midazolam; drugs.ts warning + SmPC). Manual early "Yes — longer than 5 minutes" stays available; the clock is a backstop. time_seizure show gains: `If it was already going before you opened this, count from when it actually started.`

### R5 — CPR end-guard (F10): APPROVE
Dialog: title `End the emergency?` body `CPR guidance will stop and the event log will close.` buttons `Keep going` (primary, large, default) / `End emergency` (secondary). Metronome keeps running audibly under the dialog. Deck/999 script in CPRMode approved (two-rescuer pattern) but must never overlay the metronome/compression pacing. Not a ROSC route.

### R6 — Infant midazolam (F6): CONFIRMED + two extra defects
Bands (BUCCOLAM SmPC emc/2768): 3–6 mo 2.5 mg (hospital setting); >6 mo–<1 y 2.5; 1–<5 y 5; 5–<10 y 7.5; 10–<18 y + adult 10 mg. Defect A: age-5 boundary ambiguity in current text (5 y matches two bands; SmPC → 7.5 mg). Defect B: missing ml volumes — Scottish dental boxes stock midazolam 10 mg/2 ml (5 mg/ml) ampoules for buccal use (Deputy CDO letter 18 Mar 2022); mg-only display invites volume error. Prescribed replacements:
- drugs.ts midazolam_buccal `child_dose`: `5 to <10 y: 7.5 mg · 1 to <5 y: 5 mg · under 1 y: 2.5 mg`
- `child_dose_text`: `Child 10 years and over: 10 mg (2 ml)` / `Child 5 to under 10 years: 7.5 mg (1.5 ml)` / `Child 1 to under 5 years: 5 mg (1 ml)` / `Child 6 months to under 1 year: 2.5 mg (0.5 ml)` / `Infant 3 to 6 months: 2.5 mg (0.5 ml) — licensed for hospital use only. Call 999 first and give only on the call handler or paramedic advice.` / `Volumes are for midazolam 10 mg in 2 ml (5 mg/ml) as stocked in UK emergency dental kits.`
- ADD warning: `Under 6 months: 999 first — the licence expects a hospital setting with monitoring, and respiratory depression can be delayed in this age group.`
- protocols.ts give_midazolam show: `Give buccal midazolam — one dose only.\n\nAdult and 10 years+: 10 mg (2 ml). 5 to under 10: 7.5 mg (1.5 ml). 1 to under 5: 5 mg (1 ml). 6 months to under 1 year: 2.5 mg (0.5 ml).\nPlace between the gum and cheek, half each side. Single dose — do not repeat.` (say unchanged.)
CONTESTED: the 3–6 month row (hospital-only licence vs withholding harm) — either the prescribed text OR a drop-row variant is acceptable; flag prominently for the outstanding human clinician sign-off.

Sources: BUCCOLAM SmPC emc/2768 · NICE NG217 §7 · RCUK Adult BLS 2025 · SDCEP PSM medical emergency drugs · Scottish CDO 18-3-2022 midazolam ampoule letter · NES Turas 60377.

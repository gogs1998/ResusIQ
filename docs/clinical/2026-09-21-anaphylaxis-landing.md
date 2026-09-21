# Anaphylaxis: the tile lands on the dose card (2026-09-21)

## Decision — Option A

Tapping the Anaphylaxis tile now opens directly on the `adrenaline` dose card.
Adrenaline IM is the whole treatment for anaphylaxis and delay is what kills, so
the first screen is the dose, not a description of what the team has already
decided by choosing the tile.

The steps array is now 12 steps in this order:

`adrenaline, call_help, position, position_sit, position_flat, oxygen,
monitor_response, reassess, repeat_adrenaline, continue_monitor,
cardiac_arrest_check, start_cpr`

No store change was needed. `startEmergency` lands tile entry on the first step
that is not flagged `recognition: true` (anaphylaxis flags none) and triage
entry on index 0 — so after the reorder both land on `adrenaline`.

## Removed ids, and where their content went

- **`recognition`** — deleted. Its clinical content (sudden onset plus an
  airway, breathing or circulation problem is anaphylaxis, rash or no rash; if
  in doubt, give the adrenaline) is now the last line of the `adrenaline` step's
  detail, where it reassures the person holding the syringe instead of delaying
  them.
- **`stop_trigger`** — deleted. "Stop the trigger" now appears twice as a
  parallel task rather than a sequential gate: in the `adrenaline` detail
  ("While you draw it up: stop the trigger, send someone to call 999, and get
  the emergency kit and oxygen") and as Person 2's role on `call_help`.
- **Positioning** — `position`, `position_sit` and `position_flat` survive as a
  real decision after the dose, and a one-line summary of the default (flat,
  legs raised; never stand or walk; sit up only if breathing is the main
  problem) rides in the `adrenaline` detail. Both positioning branches now
  rejoin at `oxygen`; before the reorder they pointed back at `adrenaline`,
  which from the new order would have looped the team onto the dose card again.

`call_help` keeps `actions: ['suggest:call_999']` and is still the anaphylaxis
entry in `CALL_999_CONFIRM_STEPS`.

## Hard rule: no 999 confirm on a drug step

The `adrenaline` step must **not** be added to `CALL_999_CONFIRM_STEPS` in
`src/lib/call999.ts`. The 999 confirm footer *replaces* the "Confirm given"
control rather than sitting beside it, so a drug step listed there would advance
past the dose without ever writing a `drug_given` entry to the record — a dose
given and never logged. This is pinned by a data-integrity assertion and by a
render test in `ProtocolRunner.call999.test.tsx`.

## Triage question tightened

`rash_swelling_wheeze` was "Any rash, swelling, or wheeze?" and is now:

> Sudden rash, swelling or wheeze — with trouble breathing, throat tightness, or
> feeling faint?

**Basis:** Resuscitation Council UK, *Emergency treatment of anaphylaxis* (May
2021). Anaphylaxis requires sudden onset **plus** an Airway, Breathing or
Circulation problem. Skin and mucosal changes alone are **not** anaphylaxis —
they are present in the majority of cases but are not sufficient, and skin or
mucosal changes are absent in a significant minority of reactions and can be
subtle, so their absence does not exclude anaphylaxis — and their presence alone
does not establish it (RCUK, Emergency treatment of anaphylaxis, May 2021,
diagnostic criteria). The old wording routed an isolated
urticarial rash, or a wheeze in a known asthmatic, straight into an adrenaline
protocol. The new wording names the A/B/C limb explicitly while staying
answerable by a dental nurse under pressure.

## References updated

The anaphylaxis `references` array now reads:

- Resuscitation Council UK — Emergency treatment of anaphylaxis (May 2021,
  current)
- Resuscitation Council UK Guidelines 2025 (First Aid; Special Circumstances)
- SDCEP
- BNF

## Follow-ups

- Back from `call_help` onto the confirmed dose step re-offers a live "Confirm
  given", so a second tap writes a second `drug_given` entry for a dose that was
  given once — a double-log risk. The class is pre-existing (any Back into a
  spent drug step), but this landing puts it one tap from the busiest screen in
  the app. Ticket for the Phase 3 step-screen work.

## Caveat

This change was prescribed by an AI clinical review (2026-09-21). It has **not**
been signed off by a named clinician, and must be before release.

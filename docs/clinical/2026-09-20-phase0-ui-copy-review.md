# Clinical wording review — Phase 0 UI copy (20 September 2026)

Phase 0 of the PWA rebuild introduced four pieces of new user-facing and
event-record copy. None of it is protocol or drug data, but all of it is read by
a team during an emergency or by somebody reading the record afterwards, so it
was reviewed as clinical content. The rulings below are applied in the codebase;
the sign-off paragraph at the foot is the review itself.

## The four rulings

1. **Holding-step line** — `src/lib/terminalSteps.ts`, `TERMINAL_LINES.holding`:
   `Stay with them until the crew take over — keep watching for any change.`
   Amended from "check them again regularly". No interval, and no "regularly":
   both license looking away between checks. RCUK's ABCDE approach says to
   re-assess regularly, and on a patient unstable enough to be held on one of
   these three screens (chest pain, anaphylaxis, stroke) that means continuous
   observation, not a schedule of glances. The button follows the line:
   `Check them again`, not `Check again` — it names the patient, not the screen.

2. **Voice "done" on a holding or terminal screen** — `ProtocolRunner`:
   ratified as written for holding (it checks again, and logs nothing), amended
   for a true terminal step, which now re-speaks the step instead of doing
   nothing. Hands-free, with nobody looking at the screen, a command that
   produces no sound at all reads as a dead app; a team that believes the app
   has died stops using it mid-emergency. The refusal to advance is correct and
   unchanged — it is the silence that was wrong.

3. **Unresumable close entry** — `closeUnresumableEvent` in
   `src/store/appStore.ts`. Label: `Record closed — the app restarted and the
   guide could not be resumed`. Details: `Entries above this line are unchanged
   and their times are as recorded. Nothing between the last entry and this one
   was captured. This does not record how the emergency ended.` The entry is a
   boundary statement for a medico-legal reader — a defence union, a coroner, a
   practice review — and it has to be explicit about all three things: what is
   still trustworthy, what was never captured, and what the entry does not
   claim. The record also carries `outcome: 'unresumable'`, and Reports shows it
   as an amber `Record closed` rather than a green `Completed`: the team did not
   complete this one, the app went away underneath them, and the archive must
   not claim otherwise.

4. **Resume banner** — `ProtocolRunner`: `Resumed — record started HH:MM`, and
   `Training drill — resumed, record started HH:MM` in training mode. "record
   started" rather than a bare "started" because on these screens "started"
   already means something else and something clinical — stroke onset, the
   seizure clock, the onset of chest pain — and a time labelled only "started"
   will be read as one of those. The drill variant exists because a resumed
   drill must never read as a real record; the 999 dial guard being re-armed is
   correct but invisible, and the banner is where the screen can say which of
   the two this is. The banner's non-blocking nature is ratified as written.

## Sign-off

Clinical wording review — ResusIQ Phase 0 (PWA rebuild), 20 September 2026. Four
pieces of new user-facing and event-record copy introduced by Phase 0 were
reviewed against Resuscitation Council UK guidance (ABCDE approach, reviewed May
2021 / updated July 2024; Emergency Treatment of Anaphylaxis, May 2021), the
SDCEP Practice Support Manual medical-emergencies register, and the project's own
ratified clinical decisions of 22 June 2026 and 13 August 2026. No protocol or
drug data was changed by Phase 0 and none was changed by this review;
src/data/protocols.ts and src/data/drugs.ts were read only, and the four
CLAUDE.md safety non-negotiables are untouched. Two items are ratified as written
(the voice-command behaviour change on holding and terminal screens; the
non-blocking nature of the resume banner) and three are ratified subject to the
amendments recorded above. The decision to log a single step_completed per
holding lap, carrying the deterioration answer rather than the holding
instruction, is endorsed as the more honest record. One pre-existing data gap —
the anaphylaxis holding loop offering no route back to repeat adrenaline on
recurrence short of cardiac arrest — is recorded for the Phase 1 clinical data
work and does not block Phase 0. This is an AI-assisted clinical content review,
not sign-off by a registered clinician. It carries no clinical indemnity and does
not discharge the outstanding requirement for review and sign-off by a named
GDC-registered clinician (and, for paediatric drug bands, a human BNF/BNFc
spot-check) before release. ResusIQ is decision-support and does not replace
clinical judgement.

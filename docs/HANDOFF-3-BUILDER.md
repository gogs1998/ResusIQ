# HANDOFF #3 - back to the builder

**From:** Claude Fable (orchestrator), 2026-08-15.
**For:** the original implementing-agent chat (your last state: ADVERSARIAL-HANDOFF.md at `89888be`, 2026-07).
**HEAD now:** `19626e4` on `main` - LIVE at https://resusiq.app (demo: https://resusiq.app/demo).

## What happened since your handoff, compressed

**July 4 - your handoff was adversarially executed.** Hostile clinical + code passes: 0 P0s in your work; your hydrocortisone change CONFIRMED against BSPED; your "text-only rewrite" claim verified structurally. Two P2s found and fixed same-day (anaphylaxis deterioration->CPR orphan; stroke FAST soft gate). Then the wizard became a **console**: step-`actions` were discovered to be DEAD DATA (nothing executed them - your switch_protocol/log: strings never ran) and a real execution engine was built (`appStore.runStepActions`, fires on step COMPLETION only); EscapeRail (persistent deterioration->CPR on every screen); TimerStrip (elapsed/999/dose-repeat); Deck (999 script finally reachable mid-emergency); Ward/Theatre token system; 42 -> 128 tests.

**August 7-13 - external Grok review + full remediation.** Grok found 3 P0 "control-flow lies": EscapeRail landed on cardiac step 0 not CPR (fixed: DETERIORATION_LANDING -> start_cpr, with clinically-prescribed send-for-defib wording folded into the step); max_doses was metadata not enforcement (fixed: hard block for ceilings midazolam/glucagon, ESCALATION states with live confirm for glucose/GTN - per clinical ruling, block the affordance never the record); triage arrest fast-path was dead code (fixed + tested). Plus: honest 999 logging (two-control confirm, no fabricated log entries), end-confirm guards (metronome keeps running), deck dose honesty, monotonic seizure wall-clock (loop can't reset the 5-minute count; auto-route lands on the still-seizing check so a stopped seizure never walks toward midazolam), 14 terminal steps got honest end-states (the array-fallthrough meant a mis-tap could assert "seizure stopped"), double-submit guards (and the Back-dead-button regression they caused, caught by review, fixed), training-mode dial guard (drills can't ring 999). **Fourteen clinical rulings/ratifications** govern every flow change - full record in `.claude/comms/outbox/clinical-reviewer.md`. UX pass: instrument type register, cardiac-arrest hero bar + tiered home, red discipline (one filled red per screen, three binding 999 invariants held BY TEST), OS-level theatre. Tests -> 250.

**August 15 - shipped.** All-dark (Ward retired at the token layer - :root now carries the theatre values; light raws remain for the deck's printed 999-script card). Public demo mode (`/demo` path, `?demo`, or VITE_DEMO=1): DEMO ribbon, dial guard forced on, seeded demo practice, sessionStorage-only. resusiq.app DNS (Cloudflare) + Pages custom domain + CNAME + workflow base '/'. Merged `19626e4`, tags `pre-instrument-main` (rollback point) and `instrument-v1`. ROLLBACK = `git revert -m 1 19626e4` - but understand it reverts the safety work too; emergency brake only.

## Where truth lives now

- Clinical rulings ledger: `.claude/comms/outbox/clinical-reviewer.md` (14 entries, 2026-08-13). Treat DOSE_LIMIT_NOTICES in `src/lib/doseLimits.ts` and all prescribed wordings as CLINICAL TEXT.
- External review + recon: `docs/review/grok-findings.md`, `docs/review/cursor-recon.md`.
- Design + verification: `docs/plans/2026-07-04-instrument-console-*.md`, `docs/ADVERSARIAL-HANDOFF-2.md`.
- Key new modules: `src/lib/{doseLimits,call999,triage,demoMode,monotonicTimers,emergencyTimers,stepCopy,ids}.ts`, `src/components/console/{TimerStrip,EscapeRail,Deck,EndConfirmBar}.tsx`, `src/components/TrainingDialGuard.tsx`.

## Open work (priority order)

1. **Human clinician sign-off** - still ZERO human clinical review of anything. Headline item: the contested 3-6-month midazolam row (see outbox R6).
2. **Suite re-run**: the final two commits (`feaa008` dark flip, `85fbf48` demo) shipped on tsc+build only - the UNC share failed mid-session and vitest workers would not start. Expect 250+; verify counts, not the summary line (the forks pool silently drops files under load).
3. **Share working copy is STALE + DIRTY**: `D:\VSCode\ResusIQ` has uncommitted duplicates of what shipped (committed from a local clone at scratchpad/ship). When the share recovers: `git fetch origin && git reset --hard origin/main` (discards the duplicate working-tree changes - their content is already in the pushed commits) and delete `push-demo.sh`.
4. Gordon's phone checklist (nothing jsdom can answer): gloved double-tap, CPR + deck on an SE-class phone, metronome audibility under the end-confirm, 999 pill visible with an escalation footer expanded at 320x667, real tel:999, the seizure clock over a real five minutes.
5. Grok re-run on the shipped state (branch pushed for it), then tickets: per-visit-token double-tap feedback; guided end->SBAR close; serial/cluster-seizure branch (clinical); F7 CallScript hardcoded FAST-positive/on-steroids lines; MHRA Class-I / DCB0129 assessment (unassessed - largest non-code risk).

## Traps that bit us (do not rediscover)

`tsc --noEmit` checks NOTHING here - use `tsc -b`. Tailwind must stay >=4.3.2 (4.2.x scanner breaks Windows builds only; Linux CI stays green and will hide it). Windows PowerShell 5.1: double quotes inside commit messages break native arg quoting; Set-Content writes BOMs that kill JSON.parse (use UTF8Encoding($false)). The UNC share intermittently fails fsync (Write tools, git objects, vitest workers) - small batches, local clones, and file/test COUNTS over summary lines. Agent SendMessage can arrive out of order or very late: the queue-echo protocol (agent restates its queue before implementing) and file-based inboxes (.claude/comms/inbox/<name>.md) are the mitigations. One writer per tree, always; a resumed agent is a writer again.
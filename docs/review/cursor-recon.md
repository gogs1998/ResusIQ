# Cursor-branch reconnaissance — `origin/cursor/overall-ui-redesign-2635`

**Date:** 2026-08-07 · **By:** cursor-miner (read-only; nothing checked out or merged) · **For:** the UX/appearance pass + fix batches B/F4.
**Headline:** the branch is behind us mechanically (no action engine, no dose enforcement, broken triage fast-path, fuzzy drug matching) but beats us on home ranking, radii/type register, and red discipline — the three things Grok's appearance critique names. Its `src/data/*` and tests are **radioactive** (based on 89888be, pre-FAST-hard-gate, stale adrenaline bands, no safety-test hardening): copy design patterns only, never a protocol, drug, or test file.

## UX steals (ranked)

1. **Three-tier home ranking** (`src/lib/conditions.ts` `tone` field + `EmergencyDashboard.tsx`): cardiac arrest = full-width solid-red hero bar (76px min, white text, 48px icon plate, 20px/800 label + 13px cue, chevron); "Life threat" kicker → 2-col grid (anaphylaxis/choking/chest pain/stroke); "Other emergencies" kicker → remaining five, fainting last; triage below grids; tools as a 4-up 11px icon row at the bottom. Ordering locked by test (stroke before syncope). **Top priority — answers UX1 directly.**
2. **Radii tightened**: xs 8 / sm 10 / md 12 / lg 16 / xl 20 / 2xl 24 ("reads as an instrument, not a wellness app"). Ours is 10/14/18/24/32/40 — the loudest consumer-app tell in the build. One-file change.
3. **Type scale — hierarchy by ratio**: caption 13 / label 12 / body 18 / lead 20 / step 34 / display 56; `--ls-eyebrow .08em`, `--ls-display -.03em`; instruction weight 700. Fix is to SHRINK our small end (label 16→12, caption 14→13) and tighten display tracking, not grow the hero.
4. **IBM Plex Mono on all numerals** — the dependency is ALREADY in our package.json, never imported; point `--font-mono` at it ("so 1:1000 never looks like 1:10,000"). Free.
5. **Per-condition 4px left spine** on tiles + 32px icon plate tinted with the condition mark. Identity, not semantics. If copied: mix against `var(--surface)` (their `color-mix(...white)` breaks in theatre).
6. **"One filled red per screen"**: in their runner, red is ONLY ever tint+border (End, 999 strip, escape rail); solid red is reserved for home's arrest hero and CPR "AED ready". Ours shows three competing reds in one footer — adopt their rule.
7. **DrugCard `variant="inline"`** (bordered, maxHeight 40vh, in-flow) for runner + deck so the drug detail NEVER covers End/999; modal form reserved for Library. Ours opens the covering modal from the runner — change regardless of appearance pass. Same principle: Deck maxHeight 36vh, "expanding shrinks the step body, not the chrome".
8. **Theatre as document-level mode**: toggle `theatre-root` class on `<html>` + rewrite `<meta name="theme-color">` (`#0C1210` live / light default after) + `apple-mobile-web-app-status-bar-style: black-translucent` → installed-PWA status bar goes dark when an emergency starts (~12 lines). Also: theatre zeroes ALL shadows — "panels are bordered, not floating".
9. Smaller: segmented per-step progress bar (CONSIDER — better short protocols, worse long); collapsible recognition detail with `step.id === 'fast'` explicitly exempt (CONSIDER — Grok's collapse-recognition P1 with the safety exception baked in); inline end-confirm swapping the header row for "End this emergency? [Keep going] [End now]" in BOTH runner and CPR (belongs with F10); CPR 3-up spec strip (30:2 / 100–120 / 5–6 cm) permanently visible; home A2HS prompt + "Add practice address — 999 will need it" nag (quasi-safety); Lexend-vs-Inter (CONSIDER, judge on device — real dep swap).

## Behaviour worth taking

- **`src/lib/callScript.ts` evidence-gated patient state** — tested implementation of exactly our F4/F7 honesty property (asserts a drug only when a `drug_given` event exists; shared line-builder for screen + deck). Use as the template.
- **FAST excluded from tile fast-forward**: their skip predicate exempts `steps[i].id !== 'fast'`. Our `fast` intro card IS skipped on tile entry (it's `recognition: true`) — consistent with the 2026-06-21 clinical ruling ("lead with face_check"), so not a bug, but our appStore comment overstates ("FAST gates carry no recognition flag" is true of the DECISION gates only). Tidy the comment; optionally revisit with clinical if the FAST framing screen should survive tile entry.

## Do NOT import

`nextDoseCountdown` label-substring fallback (wrong-drug risk) · unbounded TimerStrip chips · absent max-dose enforcement · unguarded speak effect (voiceschanged re-speak bug live there) · no runStepActions at all · order-dependent triage fast-path that defaults to syncope · ALL of `src/data/` and `src/__tests__/` (pre-90ba8ff: old soft FAST gate, adjacency-surviving anaphylaxis arrest check, stale 2-band adrenaline text, none of the 78→128 safety hardening).

## Suggested appearance-pass order

Radii + type tokens (one commit, zero behaviour risk) → home three-tier rebuild → red-discipline sweep in the runner → theme-color/status-bar toggle. Inline DrugCard + inline end-confirm ship with fix batch B/F10, not the appearance pass.

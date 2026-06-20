# CLAUDE.md — ResusIQ

ResusIQ is a React 19 + TypeScript PWA that supports UK dental teams during medical emergencies. It is **decision-support**, not a clinical authority. Every contributor — including Claude Code teammates — reads this file at session start.

## Non-negotiables
- Never weaken or remove the built-in safety rules without the clinical reviewer signing off:
  - Stroke flow: no aspirin.
  - MI / chest pain: oxygen only when indicated.
  - Anaphylaxis: adrenaline repeat every 5 min, no fixed in-flow maximum.
  - Seizure: single buccal midazolam for prolonged seizures.
- During an active emergency, `ProtocolRunner` must always be reachable. Do not add navigation that can hide it.
- Protocol/drug data lives in `src/data/protocols.ts` and `src/data/drugs.ts`. Changes there are clinical changes, not code changes.

## Project layout
- App routing: `src/App.tsx` (currentScreen enum, emergency override).
- Global store: `src/store/appStore.ts` (Zustand, persisted).
- Types: `src/types/index.ts`.
- Speech: `src/hooks/useSpeech.ts` + `src/lib/geminiTTS.ts`.
- AI assistant: `src/components/AIAssistant.tsx`.
- PWA + iOS: `vite.config.ts`, `index.html`, `src/index.css`, `src/main.tsx`.

## Specialist roster (.claude/agents/)
- `resusiq-code-reviewer` — React/TS, store, routing, HANDOFF risks, a11y.
- `resusiq-clinical-reviewer` — Protocols, drugs, triage, vs RCUK/SDCEP/BNF.
- `resusiq-design-handoff` — Brief + screen inventory for external design tool.
- `resusiq-ios-architect` — iOS strategy (PWA vs Capacitor vs RN vs Swift).
- `resusiq-perf-bundle` — Bundle size, code splitting, wake-lock dep.

Each one declares the scope it owns and the scope it defers. Respect those boundaries.

## Shared memory
Durable cross-session memory lives in `C:\Users\gordo\.claude\projects\D--VSCode-ResusIQ\memory\`. Read `MEMORY.md` first. Write findings back to the relevant per-topic file (clinical-decisions, ios-plan, perf-state, known_risks).

## Agent team comms (when running as a team)
Drop messages in `.claude/comms/inbox/<name>.md` and `.claude/comms/outbox/<name>.md`. Append events to `.claude/comms/bus.md`. Use the built-in shared task list and `SendMessage` for direct comms.

## Commands
- `npm run dev` — local dev (`npx vite --host` for LAN/phone testing).
- `npm run build` — production build (also runs `tsc -b`).
- `npx tsc --noEmit` — type-check only.
- `node scripts/generate-icons.mjs` — regenerate iOS/PWA PNG icons.

## Out of scope here
- Anything covered in `HANDOFF.md` is the deeper technical brief. This file is the rules; that file is the state.

# ResusIQ Handoff (for Claude Code)

## Project Snapshot
ResusIQ is a client-side PWA for UK dental emergency response, built with React + TypeScript + Vite.
It provides:
- Guided emergency protocols (step-based, voice-assisted)
- CPR mode with metronome + counters
- Drug cards with clinically verified doses
- Triage wizard
- 999 call script
- SBAR handover builder
- Event reports and training drills
- Gemini Live AI voice assistant mode
- Gemini-backed TTS for existing protocol narration (with browser TTS fallback)

## Current Runtime Status
- Type check: passing (`npx tsc -b` — the real gate; `tsc --noEmit` checks zero files here)
- Production build: passing (`npx vite build`)
- Dev server command: `npx vite --host`
- Latest LAN URL seen: `http://192.168.50.85:5173/` (varies by machine/network)

## Stack
- React 19
- TypeScript 5.9
- Vite 8 beta
- Tailwind CSS 4
- Zustand (persisted app state)
- vite-plugin-pwa (generateSW)
- @google/genai (Gemini Live)
- motion (animations)
- date-fns, idb

## Key Files to Know
- App routes: [src/App.tsx](src/App.tsx)
- Global state/store: [src/store/appStore.ts](src/store/appStore.ts)
- Types: [src/types/index.ts](src/types/index.ts)
- Protocol data: [src/data/protocols.ts](src/data/protocols.ts)
- Drug data: [src/data/drugs.ts](src/data/drugs.ts)
- Speech hook (Gemini TTS + fallback): [src/hooks/useSpeech.ts](src/hooks/useSpeech.ts)
- Gemini TTS service: [src/lib/geminiTTS.ts](src/lib/geminiTTS.ts)
- Gemini conversational assistant: [src/components/AIAssistant.tsx](src/components/AIAssistant.tsx)
- Audio streamer utility: [src/lib/audio.ts](src/lib/audio.ts)
- iOS/PWA entry/wake lock: [src/main.tsx](src/main.tsx)
- PWA config: [vite.config.ts](vite.config.ts)
- iOS/PWA meta tags: [index.html](index.html)
- iOS icon generation script: [scripts/generate-icons.mjs](scripts/generate-icons.mjs)

## Navigation Model
`currentScreen` drives top-level routing in [src/App.tsx](src/App.tsx), except during active emergencies:
- If `isEmergencyActive && activeProtocol`, app always renders `ProtocolRunner`
- `AIAssistant` can trigger `startEmergency(protocolId)` to jump into full protocol runner

## Voice Architecture
### 1) Conversational AI emergency mode
In [src/components/AIAssistant.tsx](src/components/AIAssistant.tsx):
- Uses Gemini Live API (`ai.live.connect`)
- Audio in/out via `AudioStreamer`
- Tool call `setEmergencyProtocol` updates on-screen protocol panel
- "Open Full Protocol Guide" escalates into canonical `startEmergency`
- API key is stored in localStorage key: `resusiq-gemini-key`

### 2) Existing app narration (step-by-step TTS)
In [src/hooks/useSpeech.ts](src/hooks/useSpeech.ts):
- Prefers Gemini TTS via [src/lib/geminiTTS.ts](src/lib/geminiTTS.ts) when key exists
- Falls back to browser `speechSynthesis` if key missing
- Voice commands (STT) still use Web Speech API

## iOS/PWA State
Implemented:
- PNG icons generated into `public/`:
  - `apple-touch-icon-180x180.png`
  - `pwa-192x192.png`
  - `pwa-512x512.png`
- Updated manifest icons and includeAssets in [vite.config.ts](vite.config.ts)
- Apple mobile web app meta tags in [index.html](index.html)
- `viewport-fit=cover` + safe-area CSS in [src/index.css](src/index.css)
- Wake lock request helper in [src/main.tsx](src/main.tsx)
- Wake lock acquire/release integrated in emergency lifecycle in [src/store/appStore.ts](src/store/appStore.ts)

Notes:
- iOS microphone permissions are stricter on insecure origins. For best behavior, use HTTPS/tunnel for mobile testing.

## Clinical Content Notes
The protocol and drug content was tuned for UK dental context with Resus Council UK/SDCEP intent.
Important built-in rules include:
- Stroke flow: do not give aspirin
- MI/chest pain: oxygen only when indicated
- Anaphylaxis adrenaline repeats every 5 mins (no fixed max doses in protocol flow)
- Seizure: single buccal midazolam dose for prolonged seizures

## Known Technical Risks / Follow-ups
1. Circular dependency risk:
- [src/store/appStore.ts](src/store/appStore.ts) imports `requestWakeLock` from [src/main.tsx](src/main.tsx)
- Prefer moving wake lock logic to a dedicated utility file (e.g. `src/lib/wakeLock.ts`) to avoid store↔entry coupling.

2. Bundle size:
- Build warns chunk >500 KB.
- Candidate fix: lazy-load heavy routes (`AIAssistant`, `TrainingMode`, `ProtocolLibrary`) and possibly split Gemini deps.

3. API key handling:
- Key is in localStorage by design for this client-only app.
- If moving server-side later, migrate key usage to backend/token broker.

4. Speech model naming:
- Both AI assistant and TTS use a live preview model string in code.
- Revalidate model name against current @google/genai API before production release.

5. Generated docs drift:
- Several historical diffs in chat reference earlier file versions.
- Trust current workspace files over old conversation snippets.

## Suggested First Tasks for Claude Code
1. Refactor wake lock to `src/lib/wakeLock.ts` and remove import from `main.tsx` in store.
2. Add route-level code splitting in [src/App.tsx](src/App.tsx).
3. Add small integration tests/smoke tests for:
   - `startEmergency` routing behavior
   - AI Assistant protocol mapping
   - useSpeech Gemini fallback behavior
4. Verify iOS install + mic flow using HTTPS URL and document final procedure.

## Runbook
### Local dev
```bash
npm install
npm run dev
```

### Type-check and build
```bash
npx tsc -b   # NOT `tsc --noEmit` — root tsconfig is files:[]+references, so --noEmit checks zero files
npm run build
```

### Preview build
```bash
npm run preview
```

### Regenerate iOS PNG icons
```bash
node scripts/generate-icons.mjs
```

## Handoff Summary
The app is in a usable state with modernized UI, iOS/PWA groundwork, and Gemini voice capability integrated into both conversational mode and existing protocol narration. Primary next work is hardening: dependency decoupling, bundle optimization, and mobile HTTPS voice validation.

# ResusIQ

Voice-guided medical emergency protocol assistant for UK dental practices.

ResusIQ is a React + TypeScript PWA designed for high-stress chairside incidents. It includes guided protocols, CPR support, emergency drug guidance, triage, incident reporting, training scenarios, and Gemini-powered voice features.

## Features

- Emergency dashboard with one-tap protocol launch
- Step-by-step protocol runner with voice narration
- CPR mode with metronome, compression/cycle tracking, AED prompts
- Triage wizard to route to likely protocol
- Drug cards with dosing and warnings
- 999 call script screen
- SBAR handover builder
- Event reports and export
- Training mode and drills
- AI Voice Assistant (Gemini Live) that can suggest and launch protocols
- Gemini TTS support for existing guided steps (with browser TTS fallback)
- PWA + iOS add-to-home-screen support

## Tech Stack

- React 19
- TypeScript 5.9
- Vite 8 beta
- Tailwind CSS 4
- Zustand (persist)
- vite-plugin-pwa
- @google/genai
- motion

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Run dev server

```bash
npm run dev
```

### 3) Run on LAN (phone/tablet)

```bash
npx vite --host
```

Open the `Network` URL printed by Vite on your mobile device.

## Build and Validate

### Type-check

```bash
npx tsc --noEmit
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Gemini Voice Setup

No `.env` is required for runtime voice in this client build.

API key entry flow:
- Open AI Assistant screen in the app
- Use settings/API key modal
- Paste Gemini API key
- Key is stored in `localStorage` as `resusiq-gemini-key`

Used for:
- Conversational emergency assistant ([src/components/AIAssistant.tsx](src/components/AIAssistant.tsx))
- Gemini TTS for existing protocol narration ([src/lib/geminiTTS.ts](src/lib/geminiTTS.ts))

Fallback:
- If no key is present, app uses browser `speechSynthesis`

## iOS / PWA Notes

Implemented:
- Apple touch icon + PNG manifest icons
- Safe-area support (`env(safe-area-inset-*)`)
- Standalone display mode configuration
- Wake lock request helper for emergency flow

Generate/refresh icons:

```bash
node scripts/generate-icons.mjs
```

Install on iPhone:
1. Open app URL in Safari
2. Share
3. Add to Home Screen

Important:
- Microphone and some voice features are more reliable on HTTPS origins on iOS.

## Project Structure

- App routing: [src/App.tsx](src/App.tsx)
- State/store: [src/store/appStore.ts](src/store/appStore.ts)
- Types: [src/types/index.ts](src/types/index.ts)
- Protocol data: [src/data/protocols.ts](src/data/protocols.ts)
- Drug data: [src/data/drugs.ts](src/data/drugs.ts)
- Speech hooks: [src/hooks/useSpeech.ts](src/hooks/useSpeech.ts)
- AI Assistant: [src/components/AIAssistant.tsx](src/components/AIAssistant.tsx)
- Audio utility: [src/lib/audio.ts](src/lib/audio.ts)

## Clinical/Safety Position

This app is a decision-support and workflow aid for trained dental teams.

- It does not replace clinical judgment, local policy, or current national guidance.
- Protocol content should be periodically reviewed against latest Resuscitation Council UK/SDCEP/BNF updates.

## Claude Handoff

For a full technical handoff (architecture, current status, known risks, next priorities), see:

- [HANDOFF.md](HANDOFF.md)

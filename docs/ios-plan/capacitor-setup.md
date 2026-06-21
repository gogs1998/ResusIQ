# ResusIQ — Capacitor / iOS build setup (Track B)

This is the step-by-step to take ResusIQ from PWA → native iPhone app (App Store +
true hands-free voice). The JS/config groundwork is already done on the repo; the
native iOS project is generated and built **on a Mac with Xcode**.

---

## Phase 0 — Apple Developer enrolment (DO THIS FIRST — it has lead time)

You can't build to a device or TestFlight without this, and org enrolment can take
days–weeks, so start it today.

1. Go to <https://developer.apple.com/programme/> and click **Enrol**.
2. **Individual vs Organization:**
   - *Individual* — fastest (often same day), app lists under your personal name. Fine to start.
   - *Organization* — lists under the practice/company name (more trustworthy for a clinical
     tool), but **requires a D-U-N-S number** for your business (free, request at
     <https://developer.apple.com/enroll/duns-lookup/>; can take 1–2 weeks if you don't have one).
3. Pay the **£79/year** membership.
4. Once active, in **App Store Connect** (<https://appstoreconnect.apple.com>) create the app
   record and reserve the **bundle identifier** (e.g. `com.yourpractice.resusiq`).
5. Put that bundle id into `capacitor.config.ts` → `appId` (currently the placeholder
   `com.resusiq.app`).

**Regulatory note:** ResusIQ is positioned as *decision-support / training*, not a
diagnostic medical device. Keep that framing in the App Store description + the in-app
disclaimer (App Store Guideline 1.4.1 gives medical apps extra scrutiny). If you ever
pursue MHRA/EU-MDR registration, revisit the native-vs-PWA decision in `strategy.md`.

---

## Phase 1 — Add the iOS project (on the Mac)

Prereqs on the Mac: Xcode (App Store), Xcode command-line tools, CocoaPods
(`sudo gem install cocoapods`), Node 20+.

```bash
git clone https://github.com/gogs1998/ResusIQ.git   # or pull resusiq-ux-rework
cd ResusIQ
git checkout resusiq-ux-rework
npm install
npm run build            # produces dist/
npx cap add ios          # generates the ios/ native project (Mac only)
npx cap sync ios         # copies web build + installs native pods
npx cap open ios         # opens Xcode
```

In Xcode: select your Team (the Apple Developer account), set the bundle id to match
`capacitor.config.ts`, then Run on a connected iPhone.

After any web change: `npm run build && npx cap sync ios`.

---

## Phase 2 — Native swaps (the reason for going native)

These replace the three web APIs that don't work in an installed iOS PWA. Plugins are
already in `package.json`:

1. **Native speech-to-text** — `@capacitor-community/speech-recognition` (SFSpeechRecognizer).
   Wired behind the existing `useVoiceCommands` interface so the React voice loop is unchanged;
   the engine swaps based on `Capacitor.isNativePlatform()`. iOS needs Info.plist strings:
   - `NSSpeechRecognitionUsageDescription` — "ResusIQ uses speech recognition so you can advance
     emergency steps hands-free."
   - `NSMicrophoneUsageDescription` — "ResusIQ uses the microphone to hear your spoken commands
     during an emergency."
   Use on-device recognition (`requiresOnDeviceRecognition`) for offline + privacy.
2. **Keep-awake** — `@capacitor-community/keep-awake` replaces the web Wake Lock (which only
   works on iOS 18.4+ standalone). `KeepAwake.keepAwake()` on emergency start,
   `allowSleep()` on end — drops in behind `src/lib/wakeLock.ts`'s enable/disable.
3. **Audio session** — configure `AVAudioSession` `.playAndRecord` with voice-processing IO so
   TTS playback + mic capture coexist and a live 999 call doesn't kill the session. **This is the
   main native risk — spike it before committing.**

**Half-duplex rule (web + native):** pause STT while the app is speaking (`useSpeech` exposes
`isSpeaking`) so the app never hears its own narration. Native echo-cancellation (voice-processing
IO) is the belt-and-braces on top.

---

## Phase 3 — Store readiness

- In-app + App Store listing disclaimer ("Decision-support, not a clinical authority").
- Privacy nutrition label: microphone + speech, **on-device, transcribe-and-discard, never persisted**.
- App icons / splash already exist (`public/`), regenerate native assets with
  `@capacitor/assets` if desired.

## Phase 4 — TestFlight QA

Test the hands-free loop on a **real device, production build**, in a simulated emergency
**including an active phone call and CPR-rate background noise**. (React StrictMode's
double-mount makes the dev mic loop look broken when it isn't — test the release build.)
The loop MUST tolerate STT dropping (e.g. a 999 call seizing the audio route) and fall back
to the big "Next" button — never block the Protocol Runner.

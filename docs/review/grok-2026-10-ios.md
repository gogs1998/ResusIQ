# ResusIQ — iOS assessment

**From:** Grok · **Date:** 2026-10-08
**Tree:** `main` @ `43eed3d`, branch `grok/2026-10-review`. The `ios/` project on this branch was generated here and is not on `main`.
**Scope:** Track B of `docs/HANDOFF-4-GROK.md`. Answers B1–B8. The native swaps were not started. The shell was.

## Verdict

Stay with Capacitor. Do not rewrite in React Native or Swift. The reason to go native is narrower than the June strategy, because the browser Gemini Live path that strategy was written around is gone, and the home-screen wake lock has worked since iOS 18.4.

What a native shell still buys, that the installed PWA does not, is a short list: a Siri intent, an audio session the app owns, on-device recognition that is not the Web Speech API, and an App Store binary. Those are a shell and a few plugins. They are not a new UI.

The shell already exists on this branch. It compiles with Xcode 27 and launches on the iOS 18.4 simulator. The speech-recognition plugin did not link. Apple enrolment is the long pole, and it is not started by anything in this repo.

---

## What the first native build actually did

Generated with `npx cap add ios` against Capacitor 8.4.1, after `npm run build`, on this Mac (Xcode 27.0, build 27A266a, CocoaPods 1.16.2 present and unused).

`xcodebuild` of `ios/App/App.xcodeproj`, scheme App, destination the already-booted iPhone 16 Plus simulator (iOS 18.4), **succeeded**. The app was installed and launched as `com.resusiq.app`.

What I saw on that simulator, and nothing beyond it:

- The home screen painted. Cardiac arrest hero, the life-threat grid, the other emergencies, "Not sure?", Call 999, Library / SBAR / Reports / Training.
- The status-bar clock sits above the "ResusIQ" title. The home indicator sits below the tool row. `contentInset: 'never'` plus the web safe-area padding is doing that job on this device. I did not try an SE, an iPad, or landscape.
- The shell is not portrait-locked. `ios/App/App/Info.plist` lines 35–39 allow portrait, landscape left and landscape right on iPhone. I did not rotate it.
- There is no status-bar style key. Appearance is the web app's. The simulator was in dark mode and the ward home followed it.
- The build log says `No AppShortcuts found` and `Metadata extraction skipped, no AppIntents.framework dependency found`. This binary cannot answer "Hey Siri".
- `Info.plist` has no `NSMicrophoneUsageDescription` and no `NSSpeechRecognitionUsageDescription`. Correct for today, because the speech plugin is not actually in the binary. Adding the plugin without those strings will crash on the permission prompt.
- Deployment target is iOS 15.0 (`project.pbxproj`). The web floor is iOS 16 (`package.json` browserslist, and `cssTarget` in `vite.config.ts`). The native project is willing to run on an OS the CSS floor has already abandoned.
- Bundle id is the placeholder `com.resusiq.app`.
- At install, `iconservicesagent` logged that it could not find icon resources for `com.resusiq.app` and created a placeholder. The imageset contains one 1024×1024 PNG, declared as the universal iOS icon. I did not go back to the SpringBoard home screen to see what it drew.
- The first screenshot also caught a system dialog, "Open in AircraftIQ?". A relaunch did not show the dialog. The status bar on the second launch showed the system "back to AircraftIQ" chevron, which is iOS pointing at whichever app was foregrounded before this one. I am not attributing that dialog to ResusIQ. AircraftIQ is another app on this simulator.

What I could not do, and did not pretend to:

- Hear narration or the metronome. The simulator is not an ear.
- Background the app for ten seconds and come back. I did not run that trial.
- Place a 999 call. The simulator has no cellular call, and I was not going to dial one.
- Run on a physical iPhone. No device was connected, and no Apple Development team is selected. A device build will fail signing until the owner has a team.

Capacitor 8 generated an SPM project, not a CocoaPods one. There is no `Podfile`. `ios/App/CapApp-SPM/Package.swift` depends on `capacitor-swift-pm` 8.4.1 and on `@capacitor-community/keep-awake` 8.0.1. The June setup notes that say `npx cap sync ios` installs pods are stale.

### The speech plugin is declared and not compiled

`npx cap add ios` printed:

```
[warn] @capacitor-community/speech-recognition does not have a Package.swift
[warn] Some installed Capacitor plugins are not compatible with SPM
```

`Package.swift` does not mention it. `ios/App/App/capacitor.config.json` still lists `SpeechRecognition` in `packageClassList`. The JS calls it whenever `isNative` is true (`useSpeech.ts` lines 304–327) and catches the failure as "Native speech recognition unavailable". So a native build today has keep-awake and does not have speech-to-text, and the failure is a swallowed error rather than a missing button. `voiceCommandsSupported` is true whenever `isNative` is true (`platform.ts` lines 27–30), so the mic button will show and do nothing useful until this is fixed.

`@capacitor-community/speech-recognition` is at 7.0.1 in `package.json`, next to Capacitor 8.4.1. The version skew and the missing `Package.swift` are the same problem. Do not paper over it by hand-editing `Package.swift`; that file says it is managed by the CLI. Either move to a release of the plugin that ships a Swift package, or drop the dependency until one exists. Shipping a mic that cannot listen is worse than hiding it.

Keep-awake did link. `enableWakeLock` already takes the native branch (`wakeLock.ts` lines 50–56). That part of the shell is real.

---

## B1. Is Capacitor still the right vehicle?

Yes.

The clinical product is a protocol graph, a persisted event log, and a step screen, with 381 tests on the web code. React Native or Swift means re-implementing `ProtocolRunner`, the store, and those tests. That is months, and the owner is waiting on the look of the web app, which a rewrite does not improve.

I tried to talk myself out of this. The case that would change the answer is the one the June strategy already named: the product becomes a classified device whose behaviour has to be auditable outside a WebView, or narration and the metronome have to keep running with the screen locked through a phone call and WKWebView has been shown, on a device, not to be able to do it. Neither has been shown. The June driver's specific fear, a backgrounded `AudioContext` killing Gemini Live, is gone. Narration is browser speech with a pinned British voice. The web layer already re-arms that context when the app comes back, including WebKit's `interrupted` state.

Capacitor 8, as generated here, runs that web app inside a WebView with one native plugin actually linked. That is the right size of native.

## B2. What does a native shell buy today that the PWA cannot do?

Less than the June document claims. Item by item.

**1. "Hey Siri, emergency." The PWA cannot do this.** A home-screen web app cannot register an App Intent. This binary does not register one either; the build log says no App Intents dependency and no App Shortcuts. This is the product reason to have a shell, and it is unbuilt. Detail in B4.

**2. Hands-free recognition in the installed app. Still a native win, with a caveat on how sure I am.** `platform.ts` lines 22–30 hide the mic when `isIOS && isStandalone`, on the claim that `webkitSpeechRecognition` exists on the window and silently hears nothing. The source of that claim in WebKit's bug tracker is bug 225298, comment 3, 4 May 2021: recognition was not available in web apps added to the Home Screen. I did not find a later WebKit note that this shipped, and I did not test a home-screen install on a device. Separately, WebKit bug 326069, filed 2 October 2026 against iOS 27.0 and 27.0.1, says recognition in a Safari tab works once and then receives silence for the rest of the life of the tab, and that iOS 26 did not do this. So even the Safari-tab path, which the app does enable, is fragile on the newest OS. Native on-device recognition is the reliable fix. The plugin that was supposed to provide it is the one that failed to link, above.

**3. Wake lock on a current iPhone is no longer a native-only win.** WebKit bug 254545 was fixed for Home Screen web apps in iOS 18.4. Jen Simmons, 31 March 2025, on that bug: the Screen Wake Lock API works in Home Screen web apps on iOS and iPadOS 18.4. A later commenter thought iOS 26.1 had regressed it and then withdrew the comment (their browser-detection library). The web code already requests the lock and re-acquires it on `visibilitychange` (`wakeLock.ts`). Native keep-awake still matters for an installed PWA on iOS 16.4 through 18.3, which this project's web floor still includes. It does not, by itself, justify a shell for a phone on iOS 18.4 or newer.

**4. An audio session the app owns, around a live 999 call.** This is the real unfinished native reason, and it is not implemented. The web layer can re-arm after the app becomes visible again. It cannot set `AVAudioSession` category, it cannot mix or duck against the Phone app, and it cannot observe an interruption as a first-class event. Whether a speakerphone 999 call on the same iPhone suspends the metronome for the duration is exactly the device test nobody has run. I am not claiming the outcome. I am claiming the web app has no API with which to choose the outcome.

**5. On-device Foundation Models, iOS 26 and later, on Apple Intelligence devices.** Not available to the PWA. Only worth it under the constraint in B3.

**6. App Store distribution.** A trust and update channel, not a capability. It also brings review rules the PWA does not face (B7). Service-worker updates remain the web app's mechanism and they remain invisible, which is F15 in the August review and still true.

Things that are not on this list, because the web app already does them or the premise changed: Gemini Live in the background (removed), wake-lock re-acquire on foreground (shipped), narration with a deterministic voice (shipped, unverified on device).

## B3. Does a Foundation Model make the Ask tab worth building natively?

Only as a router onto the verified record. Not as a writer of the answer.

The design's rule is the right one and it survives the framework. Guided generation (`@Generable`) constrains the shape of a Swift value. It does not constrain that value to be the dose in `drugs.ts`. A string field named `dose` can be wrong and still type-check. iOS 27 adds a per-request tool-calling mode so the model can be required to call a tool rather than answer from its weights (Foundation Models, as documented for iOS 27). Use that, and use it narrowly:

- The tool's only output is a drug id or a protocol id, chosen from the ids the app already has.
- The card, and every word that is spoken, is the record's own `adult_dose_text` / `child_dose_text` / `show`. The model does not paraphrase a dose.
- If `SystemLanguageModel` is unavailable, the same search runs with no model. The web Ask tab from Phase 4 is that fallback, and it should exist first. A native model in front of a lookup that has not been built yet is how the Gemini assistant happened.

Under that rule the model earns its place on messy questions ("the green syringe for a five year old", "they've got chest pain and they take a blue pill"). It does not earn a second clinical authority. I would not start the native Ask until the web lookup is in, and I would not block the shell on it.

## B4. "Hey Siri, emergency"

Feasible, and it is the most valuable item on this list if the landing is honest.

An App Shortcut can take parameters. Two of them map onto a landing the store already has: collapsed and not breathing should open the app onto the same step `switchProtocol('cardiac_arrest')` uses, which today is `start_cpr` and which A1 of the improvement review argues should be `cpr_mode`. An utterance that has not asserted both ("there's an emergency") should open the collapse door, not CPR. Skipping the breathing check because Siri was invoked is the failure mode. The intent is a front door, not a diagnosis.

I will not quote a latency. I did not measure one, and a made-up millisecond figure would be the least useful sentence in this document. The chain is: end of the user's speech, intent dispatch, process launch if the app is not running, WKWebView, hydration of about 92 kB gzip of JS, then whatever clinical question is still required. The questions dominate. A warm app already in the foreground is the fast case. A cold launch on an older phone is the slow case, and it is still shorter than the seven taps the cardiac tile takes today (safety, response, shout, airway, breathing check, the breathing decision, then `start_cpr`, and the metronome is the screen after that).

The binary on this branch has the metadata processor and zero intents. The work is a small Swift App Intent that opens the Capacitor app with a URL or a notification the web layer already understands. It is a good first native feature after the shell signs. It is a bad thing to promise in an App Store subtitle before it has been timed on one device, from a locked phone, with Siri.

## B5. SpeechAnalyzer, half-duplex, and a 999 call

SpeechAnalyzer (iOS 26, WWDC 2025 session 277) is the right recogniser when the plugin work happens. It is on-device, it is built for longer audio than `SFSpeechRecognizer`'s roughly one-minute requests, and the legacy API remains for older systems. The community plugin wraps the legacy API and, today, does not link. A replacement should target SpeechAnalyzer on iOS 26 and later, and should not pretend the web Speech API covers the rest. Below iOS 26 the mic stays hidden and the buttons are the product. That matches a deployment target of iOS 16 for the shell: recognition is an upgrade on new phones, not a hole on old ones.

Half-duplex stays. SpeechAnalyzer does not stop the phone's speaker being in the room. The runner already drops the mic while `isSpeaking` is true (`ProtocolRunner.tsx` lines 501–513). Keep that when the engine changes. Echo cancellation is extra, not a replacement: the metronome plus a room full of people will still produce a transcript, and "given" / "confirm" still logs a dose (`ProtocolRunner.tsx` lines 478–481). Do not let a better recogniser widen what voice is allowed to do. Decisions stay tap-only. A drug confirm by voice stays the risk F19 already named.

A live 999 call on the same phone takes the audio route. I have not watched it. The behaviour to build, when someone does, is: on interruption, stop recognition, leave the primary button where it is, and do not block the runner waiting for the mic to come back. The web re-arm on `visibilitychange` is the fallback for narration and the metronome. Native code's job is to notice the interruption sooner and to avoid a state where the app thinks it is listening.

## B6. Pre-recorded clips or AVSpeechSynthesizer?

Clips, for anything that states a dose or a count. The synthesizer is the fallback, and on a native build it should be `AVSpeechSynthesizer` rather than `speechSynthesis`.

Phase 5's rule is the clinical one: the clip is keyed by a hash of the phrase, and a phrase with no clip falls back to synthesis, so a text change cannot keep playing last year's audio. A native voice, however good the iOS 26 premium voices are, will speak whatever string it is given, confidently, including a string that drifted. That is the failure the hash exists to prevent. Native does not change Phase 5's order (after the wording is frozen) and does not replace the clips.

What native changes is the fallback quality. `voiceChoice.ts` already exists because iOS's voice list is an unreliable place to find a British voice. A known `AVSpeechSynthesisVoice` identifier, downloaded, is a better fallback than that list. It is still a fallback.

## B7. App Review 1.4.1, and the MHRA line

I am not classifying this product. A disclaimer in the listing does not decide it. What follows is what the listing and the app have to be able to say, and where a person who is allowed to classify it has to be involved before a public store page exists.

**App Review.** The guidelines page was last updated 8 June 2026. Two sections land on this app.

- **1.4.1.** Medical apps that could provide inaccurate data, or that could be used for diagnosing or treating, are reviewed with greater scrutiny. Apps should remind users to check with a doctor in addition to using the app and before making medical decisions. If there is regulatory clearance, the submission includes a link to it.
- **1.4.2.** Drug dosage calculators must come from the drug manufacturer, a hospital, a university, a health insurer, a pharmacy, or another approved entity, or have approval from the FDA or a counterpart. ResusIQ tells a person, about a patient in front of them, to give a named dose. A reviewer can read the runner as that calculator. The doses are attributed in `drugs.ts` to RCUK, SDCEP, BNF and specific SmPCs. That attribution has to be visible in the listing and on the dose the user sees, not only in a source file. "Approved entity" is Apple's phrase, and I cannot tell you they will accept RCUK under it. This is the sharpest review risk in the project.

Also 5.1.1(ix): apps in highly regulated areas such as healthcare should be submitted by the legal entity, not a personal hobby account, once the listing is public. An individual account is still the right way to get the first TestFlight (B8). It is the wrong long-term seller name for a tool practices will rely on.

What has to be true of the listing and the app, regardless of the MHRA outcome:

- The subtitle and the description say the app walks a dental team through published Resuscitation Council UK and SDCEP steps. They do not say the app diagnoses, and they do not say "AI doctor".
- The first screen a reviewer sees, and every emergency screen, can show the decision-support line that `CLAUDE.md` already states and that the UI does not. One line, not a wall. The Phase 0 copy review's tone is the model.
- Screenshots show the runner in use, with a real step, not the marketing title. Apple's current screenshot guidance is unhappy with title cards.
- The privacy label matches the binary. Today that is: no account, no tracking, data stays on device. The moment SpeechAnalyzer or a model is on, the label says speech is recognised on device and not stored. Do not add the mic usage string until the mic works, or the label and the prompt will claim a feature the shell does not have.
- Do not write "not a medical device" in the App Store description as a way through 1.4.1. If the functionality is patient-specific treatment guidance, that sentence is the thing a regulator and a reviewer are both trained to ignore, and it reads as an attempt to dodge the scrutiny.

**MHRA.** The test the agency uses is intended purpose, read from what the product does, not from a footer. This app takes answers about a specific person (breathing, FAST, age band, drugs already given) and tells the team the next act, including a dose, during an emergency. That is the fact pattern for "is this software a medical device", and it is the reason a disclaimer is not the analysis. I could not find a current MHRA page that rules on a dental emergency-protocol app in particular, and I am not going to invent one.

Consequences if a qualified person says it is a device: UKCA or the accepted CE route, a classification (patient-specific decision support for a time-critical, immediately serious condition is not where Class I self-certification usually lands), a technical file, clinical evaluation, and the post-market surveillance duties that came into force for Great Britain on 16 June 2025, including shorter serious-incident reporting. Those duties apply to devices placed on the market. They are a reason to get the opinion before the public listing, not after the first practice has it.

Consequences if they say it is not a device: the App Review obligations above do not go away, the in-app decision-support line does not go away, and the opinion should be in the review notes so 1.4.1 is answered with a document rather than a slogan.

DCB0129 is a separate regime. It applies when an NHS organisation deploys this as health IT. A private dental practice installing an App Store app is not automatically inside it. It is also not a substitute for the MHRA question. The August review was right that this is the largest non-code risk. Nothing in the last two months of code has retired it.

## B8. Effort to a build one practice can hold

The engineering is no longer the long pole. Enrolment is.

**What the owner should start this week, so it runs alongside any further work:**

1. Enrol in the Apple Developer Program. Use an individual enrolment to unblock TestFlight. It is often days, sometimes same day. Start an organisation enrolment in parallel only if the public seller name has to be the practice or a company; that needs a D-U-N-S number and can take weeks. The fee is the annual Apple Developer Program fee. Confirm the sterling amount on the enrolment page. The June plan's figure was £79.
2. Reserve a bundle id that is not `com.resusiq.app`. Put it in `capacitor.config.ts` before the first upload. Changing it after TestFlight means a new app record.
3. Create the App Store Connect record. Leave it unlisted or TestFlight-only until the regulatory question in B7 has an answer the owner is willing to stand behind.
4. Decide, in writing, the regulatory intent: stay decision-support and take a qualified opinion before any public listing, or plan for device registration. The shell does not depend on that decision. The listing does.
5. Name one physical iPhone and one person for the audio checklist. No simulator result can close it.

**What I would ship to that one practice, and what I would cut.**

Ship the shell that already launches: today's web app, keep-awake (already linked), the existing web audio unlock, a visible decision-support line, a real icon, the reserved bundle id, and a development team. Cut, from the first TestFlight: SpeechAnalyzer, the speech plugin until it links and the usage strings exist, Foundation Models, App Intents, pre-recorded clips, and any native change to how a dose is confirmed. The practice gets the same clinical behaviour as the website, installed, with a screen that stays awake on iOS versions where the PWA lock is still unreliable, and a binary the owner can hand someone without a Safari share sheet.

After the account can sign, that TestFlight is about a week of engineering, not a quarter. The unknown is Apple's enrolment queue, not the Xcode project. I have not uploaded an archive. "The simulator build succeeded" is not "TestFlight accepted it".

The Siri intent is the right second build, behind a phrase that has been timed on one locked phone. The audio-session spike is the right third, and it wants the 999-call test on a real device before it is trusted. Neither should delay the first install.

## What I could not verify

- Narration, metronome, backgrounding, and a live phone call, on any iPhone. The shell launched. It did not speak, as far as I know.
- Home-screen Web Speech on iOS 26 or 27. B2 item 2 rests on the code, on a 2021 WebKit comment, and on a bug filed this month about Safari tabs. A device test could retire it.
- Wake lock on an installed PWA on iOS 18.4 and on iOS 26. The WebKit bug says 18.4 fixed it. I did not reproduce the fix or the later false alarm.
- Signing, archiving, and TestFlight. No team.
- Whether `com.resusiq.app` is already taken.
- A regulatory classification. B7 says what must be true of the listing either way, and where the owner needs a person who is allowed to decide.
- App Intent latency. Not built, not timed.

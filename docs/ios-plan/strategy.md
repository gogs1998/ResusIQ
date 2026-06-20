# ResusIQ — iOS Strategy

_Author: resusiq-ios-architect · Date: 2026-06-20_

## 1. Recommendation

**Wrap the existing React PWA with Capacitor and ship to the App Store.** No rewrite. The
entire TypeScript codebase is retained; only three fragile web APIs are swapped for native
plugins. App Store distribution is itself a trust signal for a clinical decision-support tool.

## 2. Options compared

| Option | Effort | Risk | Distribution | Fidelity | Time to first build |
|--------|--------|------|--------------|----------|---------------------|
| **PWA only** (today) | none | High — 4 iOS blockers below | Add-to-Home-Screen only | Web | shipped |
| **Capacitor wrap** ✅ | Medium | Medium (native audio session vs Gemini Live needs validation) | App Store + web/Android | Native shell, web UI | ~1–2 weeks to TestFlight |
| **React Native rewrite** | High | High | App Store | Native | months |
| **Native Swift** | Very high | High | App Store | Native | months |

## 3. The four iOS PWA blockers

1. **Web Speech STT is blocked in installed standalone PWAs on iOS** — voice *commands*
   (`useVoiceCommands`) silently die once added to the home screen.
   **FIXED in the PWA path:** `src/lib/platform.ts` exposes `voiceCommandsSupported`; the mic
   affordance is hidden where STT can't run, so users never trust a dead button. Capacitor
   replaces this with a native STT plugin.
2. **Wake Lock only reliable on iOS 18.4+ standalone** (broken 16.4–18.3) — native-only win
   (`@capacitor/keep-awake`).
3. **Backgrounded AudioContext is suspended** → Gemini Live audio cuts out; `src/lib/audio.ts`
   uses the deprecated `ScriptProcessorNode` (AudioWorklet is the target) — native-only win.
4. **Wake lock auto-released on backgrounding with no re-acquire.**
   **FIXED in the PWA path:** `src/lib/wakeLock.ts` re-acquires on `visibilitychange` while an
   emergency is active (`wanted` flag as single source of truth, soft-failure on rejection,
   try/catch-swallowed re-request). The store→main circular dep (HANDOFF #1) is resolved.

Blockers #1 and #4 are now mitigated in the PWA path; **#2 and #3 remain genuine native-only
wins** that justify Capacitor.

## 4. Decision triggers to reverse

- → **PWA-only** if voice *commands* are deemed non-essential AND there is no App Store need.
- → **RN / native Swift** if ResusIQ becomes a classified medical device (MHRA / EU MDR)
  needing auditable native behaviour, OR continuous screen-off background Gemini audio becomes
  a hard requirement.

## 5. Capacitor phase plan

- **Phase 0 — Prereqs.** Apple Developer enrolment (org enrolment needs a D-U-N-S number, can
  take weeks). Decide distribution (public vs unlisted) and regulatory intent.
- **Phase 1 — Shell.** Add Capacitor, wrap the existing Vite `dist`, get the PWA running in the
  native WebView; portrait lock; splash + icons.
- **Phase 2 — Native swaps.** Native STT plugin; `@capacitor/keep-awake` (the
  `enableWakeLock`/`disableWakeLock` util is the seam — native body drops in behind the same
  signatures, the `visibilitychange` branch falls away); native `AVAudioSession` for background
  Gemini Live audio.
- **Phase 3 — Store readiness.** Guideline 1.4.1 (medical apps get extra scrutiny): in-app +
  listing disclaimer, mic usage string; privacy nutrition labels.
- **Phase 4 — TestFlight → release.** Device QA of the mic flow against a PRODUCTION build
  (React 19 StrictMode double-mount makes dev mic flow look broken when it isn't).

## 6. Open questions for the product owner

1. Apple Developer enrolment state? (D-U-N-S lead time)
2. Regulatory intent — stay "decision-support / training", or pursue MHRA / EU MDR registration?
3. Distribution — public App Store vs private/unlisted to known practices?
4. Priority — spoken **commands** (STT) vs spoken **narration** (TTS)? Biggest lever on whether
   PWA-only could stay viable.

## References

- Apple App Store Review Guideline 1.4.1 (Physical Harm / medical apps) — accessed 2026-06-20.
- MDN: Screen Wake Lock API (release-on-visibility-loss behaviour) — accessed 2026-06-20.
- MDN / WebKit: Web Speech API availability in standalone PWAs — accessed 2026-06-20.
- MHRA: "Medical device stand-alone software including apps" — accessed 2026-06-20.

> The decision summary also lives in durable memory (`ios-plan.md`). This document is the
> long-form companion; keep both in sync when the strategy changes.

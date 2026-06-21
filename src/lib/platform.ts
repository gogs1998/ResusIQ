// Platform / capability detection shared across the app.
// Single source of truth so UI and entry code agree on the environment.
import { Capacitor } from '@capacitor/core';

// Running inside the Capacitor native shell (iOS/Android app) vs a browser.
export const isNative = Capacitor.isNativePlatform();

// Installed PWA (added to home screen) vs a normal browser tab.
export const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as { standalone?: boolean }).standalone === true;

// iOS / iPadOS. iPadOS 13+ reports as "MacIntel"; disambiguate via touch.
export const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Voice commands work when: (a) we're in the Capacitor native shell (native
// SFSpeechRecognizer via the plugin), OR (b) the browser has Web Speech AND we
// are NOT an installed iOS PWA (where webkitSpeechRecognition exists on `window`
// but is silently non-functional — a dead mic that captures nothing). The
// native case is exactly what makes hands-free voice possible on the iPhone.
export const voiceCommandsSupported =
  isNative ||
  (('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
    !(isIOS && isStandalone));

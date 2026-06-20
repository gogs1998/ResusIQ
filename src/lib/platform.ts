// Platform / capability detection shared across the app.
// Single source of truth so UI and entry code agree on the environment.

// Installed PWA (added to home screen) vs a normal browser tab.
export const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as { standalone?: boolean }).standalone === true;

// iOS / iPadOS. iPadOS 13+ reports as "MacIntel"; disambiguate via touch.
export const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// `webkitSpeechRecognition` exists on `window` even where it does not work:
// inside an installed standalone PWA on iOS it is silently non-functional.
// Treat that combination as unsupported so we never render a dead mic button
// that animates "Listening" but captures nothing during an emergency.
export const voiceCommandsSupported =
  ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
  !(isIOS && isStandalone);

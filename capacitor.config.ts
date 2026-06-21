import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the existing Vite PWA (webDir: dist) for the App Store build.
// NOTE: change `appId` to your registered Apple bundle identifier before the
// first TestFlight upload.
const config: CapacitorConfig = {
  appId: 'com.resusiq.app',
  appName: 'ResusIQ',
  webDir: 'dist',
  ios: {
    // Let the web layout own the safe areas (we already handle env(safe-area-*)).
    contentInset: 'never',
  },
  plugins: {
    SpeechRecognition: {
      // on-device recognition where available (offline + privacy)
    },
  },
};

export default config;

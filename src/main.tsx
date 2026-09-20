import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isStandalone } from './lib/platform'
import { installAudioUnlock } from './lib/audioUnlock'

// ── iOS PWA enhancements ─────────────────────────────────
if (isStandalone) {
  document.documentElement.classList.add('pwa-standalone');
  // Prevent pull-to-refresh in standalone PWA on iOS
  document.body.style.overscrollBehavior = 'none';
}

// iOS only plays audio that was first started inside a user gesture. Arm the
// one-time primer before React mounts so the very first tap counts.
installAudioUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ── iOS PWA enhancements ─────────────────────────────────
// Detect standalone mode
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone === true;

if (isStandalone) {
  document.documentElement.classList.add('pwa-standalone');
}

// Prevent pull-to-refresh in standalone PWA on iOS
if (isStandalone) {
  document.body.style.overscrollBehavior = 'none';
}

// Keep screen awake during emergencies via Wake Lock API
export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      const lock = await (navigator as any).wakeLock.request('screen');
      return lock;
    }
  } catch (err) {
    // Wake Lock not available or denied — no-op
  }
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

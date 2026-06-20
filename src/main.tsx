import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isStandalone } from './lib/platform'

// ── iOS PWA enhancements ─────────────────────────────────
if (isStandalone) {
  document.documentElement.classList.add('pwa-standalone');
  // Prevent pull-to-refresh in standalone PWA on iOS
  document.body.style.overscrollBehavior = 'none';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

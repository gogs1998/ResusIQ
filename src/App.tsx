import { lazy, Suspense, useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { EmergencyDashboard } from './components/EmergencyDashboard';
import { ProtocolRunner } from './components/ProtocolRunner';
import { TriageWizard } from './components/TriageWizard';
import { CallScript } from './components/CallScript';
import { SBARHandover } from './components/SBARHandover';
import './index.css';

const PracticeSetupWizard = lazy(() =>
  import('./components/PracticeSetup').then((m) => ({ default: m.PracticeSetupWizard }))
);
const EventReports = lazy(() =>
  import('./components/EventReports').then((m) => ({ default: m.EventReports }))
);
const TrainingMode = lazy(() =>
  import('./components/TrainingMode').then((m) => ({ default: m.TrainingMode }))
);
const ProtocolLibrary = lazy(() =>
  import('./components/ProtocolLibrary').then((m) => ({ default: m.ProtocolLibrary }))
);
const AIAssistant = lazy(() =>
  import('./components/AIAssistant').then((m) => ({ default: m.AIAssistant }))
);

function ScreenLoading() {
  return (
    <div className="riq-screen items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loading…</p>
    </div>
  );
}

function renderScreen(currentScreen: ReturnType<typeof useAppStore.getState>['currentScreen']) {
  switch (currentScreen) {
    case 'home':
    case 'emergency':
      return <EmergencyDashboard />;
    case 'triage':
      return <TriageWizard />;
    case 'setup':
      return <PracticeSetupWizard />;
    case 'reports':
      return <EventReports />;
    case 'training':
      return <TrainingMode />;
    case 'protocol_library':
      return <ProtocolLibrary />;
    case 'call_999':
      return <CallScript />;
    case 'sbar':
      return <SBARHandover />;
    case 'ai_assistant':
      return <AIAssistant />;
    case 'protocol':
      return <EmergencyDashboard />;
    default:
      return <EmergencyDashboard />;
  }
}

function App() {
  const { currentScreen, isEmergencyActive, activeProtocol } = useAppStore();
  const theatre = Boolean(isEmergencyActive && activeProtocol);

  useEffect(() => {
    document.documentElement.classList.toggle('theatre-root', theatre);
    const theme = theatre ? '#0C1210' : '#E8EDE9';
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      if (!el.getAttribute('media')) el.setAttribute('content', theme);
    });
    const status = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    status?.setAttribute('content', theatre ? 'black-translucent' : 'default');
  }, [theatre]);

  return (
    <div className={`riq-desk${theatre ? ' theatre' : ''}`}>
      <div className="riq-device">
        {theatre ? (
          <ProtocolRunner />
        ) : (
          <Suspense fallback={<ScreenLoading />}>{renderScreen(currentScreen)}</Suspense>
        )}
      </div>
    </div>
  );
}

export default App

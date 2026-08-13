import { lazy, Suspense } from 'react';
import { useAppStore } from './store/appStore';
import { EmergencyDashboard } from './components/EmergencyDashboard';
import { ProtocolRunner } from './components/ProtocolRunner';
import { TriageWizard } from './components/TriageWizard';
import { CallScript } from './components/CallScript';
import { SBARHandover } from './components/SBARHandover';
import { TrainingDialGuard } from './components/TrainingDialGuard';
import './index.css';

// Non-emergency routes are code-split so they (and heavy deps like `motion`)
// stay out of the initial/emergency bundle. Emergency-path screens — dashboard,
// runner, triage, 999 call script, SBAR handover — stay EAGER so they never
// show a loading state mid-emergency.
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
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

  // Mounted above every screen, including the runner, because the 999 controls
  // it guards are on all of them. Renders and registers NOTHING unless training
  // mode is on, so the real-emergency path is untouched.
  const guard = <TrainingDialGuard />;

  // If emergency is active and we have a protocol, show the protocol runner.
  if (isEmergencyActive && activeProtocol) {
    return (
      <>
        <ProtocolRunner />
        {guard}
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<ScreenLoading />}>{renderScreen(currentScreen)}</Suspense>
      {guard}
    </>
  );
}

export default App

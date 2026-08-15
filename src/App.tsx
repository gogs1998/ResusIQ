import { lazy, Suspense, useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { EmergencyDashboard } from './components/EmergencyDashboard';
import { ProtocolRunner } from './components/ProtocolRunner';
import { TriageWizard } from './components/TriageWizard';
import { CallScript } from './components/CallScript';
import { SBARHandover } from './components/SBARHandover';
import { TrainingDialGuard } from './components/TrainingDialGuard';
import { isDemoMode, DEMO_PRACTICE } from './lib/demoMode';
import './index.css';

// Non-emergency routes are code-split so they (and heavy deps like `motion`)
// stay out of the initial/emergency bundle. Emergency-path screens â€” dashboard,
// runner, triage, 999 call script, SBAR handover â€” stay EAGER so they never
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
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>Loadingâ€¦</p>
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

// Public-demo ribbon (resusiq.app/demo). pointer-events:none so it can never
// intercept a tap; it overlays the top 22px, which every screen's header
// padding clears. role=note so screen readers announce the demo status once.
function DemoRibbon() {
  return (
    <div
      role="note"
      aria-label="Demo - not for clinical use"
      className="fixed top-0 left-0 right-0 flex items-center justify-center"
      style={{ height: 22, zIndex: 80, pointerEvents: 'none', background: 'rgba(255, 178, 36, 0.14)', borderBottom: '1px solid rgba(255, 178, 36, 0.35)', color: '#FFB224', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em' }}
    >
      DEMO - NOT FOR CLINICAL USE
    </div>
  );
}

function App() {
  const { currentScreen, isEmergencyActive, activeProtocol } = useAppStore();

  // Demo boot: seed a complete practice so the 999 script reads properly for
  // visitors. Only when nothing is set - a real setup is never overwritten.
  useEffect(() => {
    if (isDemoMode && !useAppStore.getState().practiceSetup) {
      useAppStore.getState().setPracticeSetup(DEMO_PRACTICE);
    }
  }, []);

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
        {isDemoMode && <DemoRibbon />}
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<ScreenLoading />}>{renderScreen(currentScreen)}</Suspense>
      {guard}
      {isDemoMode && <DemoRibbon />}
    </>
  );
}

export default App

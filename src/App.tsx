import { useAppStore } from './store/appStore';
import { EmergencyDashboard } from './components/EmergencyDashboard';
import { ProtocolRunner } from './components/ProtocolRunner';
import { TriageWizard } from './components/TriageWizard';
import { PracticeSetupWizard } from './components/PracticeSetup';
import { EventReports } from './components/EventReports';
import { TrainingMode } from './components/TrainingMode';
import { ProtocolLibrary } from './components/ProtocolLibrary';
import { CallScript } from './components/CallScript';
import { SBARHandover } from './components/SBARHandover';
import { AIAssistant } from './components/AIAssistant';
import './index.css';

function App() {
  const { currentScreen, isEmergencyActive, activeProtocol } = useAppStore();

  // If emergency is active and we have a protocol, show the protocol runner
  if (isEmergencyActive && activeProtocol) {
    return <ProtocolRunner />;
  }

  // Route based on current screen
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

export default App

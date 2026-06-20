import { useState } from 'react';
import { 
  ChevronLeft, 
  Play, 
  Trophy,
  Clock,
  Target,
  Shuffle,
  GraduationCap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useStopwatch } from '../hooks/useTimer';

interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  protocol_id: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  time_target_seconds: number;
  key_actions: string[];
}

const trainingScenarios: TrainingScenario[] = [
  {
    id: 'cpr_basic',
    title: 'Cardiac Arrest - Basic Response',
    description: 'Patient found unresponsive in the waiting room',
    protocol_id: 'cardiac_arrest',
    difficulty: 'beginner',
    time_target_seconds: 300,
    key_actions: ['Check danger', 'Check response', 'Call 999', 'Open airway', 'Start CPR', 'Attach AED']
  },
  {
    id: 'anaphylaxis_dental',
    title: 'Anaphylaxis - During Treatment',
    description: 'Patient develops sudden swelling and wheeze after local anaesthetic',
    protocol_id: 'anaphylaxis',
    difficulty: 'intermediate',
    time_target_seconds: 240,
    key_actions: ['Stop trigger', 'Call 999', 'Position patient', 'Give adrenaline', 'Give oxygen', 'Reassess']
  },
  {
    id: 'hypoglycaemia_episode',
    title: 'Hypoglycaemia - Diabetic Patient',
    description: 'Known diabetic patient becomes confused and sweaty',
    protocol_id: 'hypoglycaemia',
    difficulty: 'beginner',
    time_target_seconds: 180,
    key_actions: ['Recognise hypo', 'Check consciousness', 'Give glucose', 'Reassess', 'Follow-up carbs']
  },
  {
    id: 'asthma_severe',
    title: 'Severe Asthma Attack',
    description: 'Patient with known asthma cannot complete sentences',
    protocol_id: 'asthma',
    difficulty: 'intermediate',
    time_target_seconds: 180,
    key_actions: ['Recognise severity', 'Call 999', 'Salbutamol via spacer', 'Oxygen', 'Monitor']
  },
  {
    id: 'choking_adult',
    title: 'Choking - Adult Patient',
    description: 'Patient suddenly unable to speak or cough during treatment',
    protocol_id: 'choking',
    difficulty: 'intermediate',
    time_target_seconds: 120,
    key_actions: ['Assess severity', 'Back blows', 'Abdominal thrusts', 'Call 999', 'CPR if unconscious']
  },
  {
    id: 'chest_pain',
    title: 'Chest Pain - Suspected MI',
    description: 'Patient complains of crushing chest pain and sweating',
    protocol_id: 'chest_pain',
    difficulty: 'intermediate',
    time_target_seconds: 180,
    key_actions: ['Call 999', 'Position patient', 'Aspirin', 'Monitor', 'Prepare for deterioration']
  }
];

export function TrainingMode() {
  const { setScreen, setTrainingMode, startEmergency } = useAppStore();
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [drillComplete, setDrillComplete] = useState(false);
  const [checkedActions, setCheckedActions] = useState<string[]>([]);
  
  const { formattedTime, start, pause, reset, seconds } = useStopwatch();

  const handleStartDrill = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setTrainingMode(true);
    setDrillComplete(false);
    setCheckedActions([]);
    reset();
  };

  const handleRunProtocol = () => {
    if (selectedScenario) {
      start();
      startEmergency(selectedScenario.protocol_id);
    }
  };

  const handleEndDrill = () => {
    pause();
    setDrillComplete(true);
  };

  const handleRandomScenario = () => {
    const randomIndex = Math.floor(Math.random() * trainingScenarios.length);
    handleStartDrill(trainingScenarios[randomIndex]);
  };

  const toggleAction = (action: string) => {
    setCheckedActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const getScore = () => {
    if (!selectedScenario) return 0;
    const actionScore = (checkedActions.length / selectedScenario.key_actions.length) * 70;
    const timeBonus = seconds <= selectedScenario.time_target_seconds ? 30 : Math.max(0, 30 - ((seconds - selectedScenario.time_target_seconds) / 10));
    return Math.round(actionScore + timeBonus);
  };

  const handleBackToList = () => {
    setSelectedScenario(null);
    setTrainingMode(false);
    setDrillComplete(false);
    setCheckedActions([]);
    reset();
  };

  // Drill Complete Screen
  if (drillComplete && selectedScenario) {
    const score = getScore();
    
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gray-800 p-4">
          <h1 className="text-xl font-bold text-center">Drill Complete</h1>
        </header>

        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md text-center">
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${
              score >= 80 ? 'text-yellow-400' :
              score >= 60 ? 'text-gray-400' :
              'text-amber-700'
            }`} />
            
            <h2 className="text-4xl font-bold mb-2">{score}%</h2>
            <p className="text-gray-400 mb-6">
              {score >= 80 ? 'Excellent!' :
               score >= 60 ? 'Good effort!' :
               'Keep practising!'}
            </p>

            <div className="bg-gray-700 rounded-xl p-4 mb-4 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Time taken:</span>
                <span className="font-mono">{formattedTime}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Target time:</span>
                <span className="font-mono">
                  {Math.floor(selectedScenario.time_target_seconds / 60)}:{(selectedScenario.time_target_seconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Key actions:</span>
                <span>{checkedActions.length} / {selectedScenario.key_actions.length}</span>
              </div>
            </div>

            {/* Actions checklist */}
            <div className="text-left mb-4">
              <p className="text-sm text-gray-400 mb-2">Key actions review:</p>
              {selectedScenario.key_actions.map((action, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded ${
                    checkedActions.includes(action) ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {checkedActions.includes(action) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="bg-gray-800 p-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStartDrill(selectedScenario)}
              className="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToList}
              className="bg-gray-700 hover:bg-gray-600 p-3 rounded-xl font-bold"
            >
              Back to Drills
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // Active Drill Screen
  if (selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-amber-900/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="font-bold">Training Drill</h1>
              <p className="text-sm text-amber-300">{selectedScenario.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">{formattedTime}</p>
            <p className="text-xs text-amber-300">
              Target: {Math.floor(selectedScenario.time_target_seconds / 60)}m
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* Scenario */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <h2 className="font-bold mb-2">📋 Scenario</h2>
            <p className="text-gray-300">{selectedScenario.description}</p>
          </div>

          {/* Key Actions Checklist */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4">
            <h2 className="font-bold mb-3">✓ Key Actions (check as completed)</h2>
            <div className="space-y-2">
              {selectedScenario.key_actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleAction(action)}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors ${
                    checkedActions.includes(action)
                      ? 'bg-green-900/30 border border-green-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    checkedActions.includes(action)
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-500'
                  }`}>
                    {checkedActions.includes(action) && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                  <span>{action}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{checkedActions.length} / {selectedScenario.key_actions.length}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(checkedActions.length / selectedScenario.key_actions.length) * 100}%` }}
              />
            </div>
          </div>
        </main>

        <footer className="bg-gray-800 p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={handleRunProtocol}
              className="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Run Protocol
            </button>
            <button
              onClick={handleEndDrill}
              className="bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold"
            >
              End Drill
            </button>
          </div>
          <button
            onClick={handleBackToList}
            className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded-xl text-sm"
          >
            Cancel Drill
          </button>
        </footer>
      </div>
    );
  }

  // Drill Selection Screen
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 p-4 flex items-center gap-3">
        <button
          onClick={() => setScreen('home')}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Training Drills</h1>
          <p className="text-sm text-gray-400">Practice emergency scenarios</p>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Random Drill Button */}
        <button
          onClick={handleRandomScenario}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 p-4 rounded-xl mb-4 flex items-center justify-center gap-3"
        >
          <Shuffle className="w-6 h-6" />
          <span className="font-bold text-lg">Random Scenario</span>
        </button>

        {/* Scenario List */}
        <div className="space-y-3">
          {trainingScenarios.map((scenario) => {
            return (
              <button
                key={scenario.id}
                onClick={() => handleStartDrill(scenario)}
                className="w-full bg-gray-800 hover:bg-gray-750 rounded-xl p-4 text-left transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{scenario.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    scenario.difficulty === 'beginner' ? 'bg-green-900 text-green-400' :
                    scenario.difficulty === 'intermediate' ? 'bg-amber-900 text-amber-400' :
                    'bg-red-900 text-red-400'
                  }`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{scenario.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    {scenario.key_actions.length} key actions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Target: {Math.floor(scenario.time_target_seconds / 60)}m
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Training info */}
      <div className="bg-gray-800 p-4 text-center text-sm text-gray-400">
        <p>Training drills help maintain emergency readiness.</p>
        <p>GDC expects ongoing capability maintenance.</p>
      </div>
    </div>
  );
}

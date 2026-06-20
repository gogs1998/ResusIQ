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
      <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <header className="px-4 flex flex-col items-center justify-center" style={{ height: 'var(--appbar-h)' }}>
          <p className="cs-eyebrow" style={{ color: 'var(--decision)' }}>Training Mode</p>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Drill Complete</h1>
        </header>

        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="cs-card p-6 w-full max-w-md text-center">
            <Trophy className="w-20 h-20 mx-auto mb-4" style={{ color: score >= 80 ? 'var(--decision)' : score >= 60 ? 'var(--text-2)' : 'var(--text-3)' }} />

            <h2 className="cs-numeric text-4xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>{score}%</h2>
            <p className="mb-6" style={{ color: 'var(--text-3)' }}>
              {score >= 80 ? 'Excellent!' :
               score >= 60 ? 'Good effort!' :
               'Keep practising!'}
            </p>

            <div className="rounded-xl p-4 mb-4 text-left" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-3)' }}>Time taken:</span>
                <span className="cs-numeric" style={{ color: 'var(--text-1)' }}>{formattedTime}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--text-3)' }}>Target time:</span>
                <span className="cs-numeric" style={{ color: 'var(--text-1)' }}>
                  {Math.floor(selectedScenario.time_target_seconds / 60)}:{(selectedScenario.time_target_seconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Key actions:</span>
                <span style={{ color: 'var(--text-1)' }}>{checkedActions.length} / {selectedScenario.key_actions.length}</span>
              </div>
            </div>

            {/* Actions checklist */}
            <div className="text-left mb-4">
              <p className="cs-eyebrow mb-2">Key actions review:</p>
              {selectedScenario.key_actions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded"
                  style={{ color: checkedActions.includes(action) ? 'var(--green)' : 'var(--red)' }}
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

        <footer className="p-4 safe-area-bottom">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStartDrill(selectedScenario)}
              className="p-3 rounded-xl font-bold active:opacity-90 transition-opacity"
              style={{ background: 'var(--brand)', color: 'var(--text-on-light)', minHeight: 'var(--touch-min)' }}
            >
              Try Again
            </button>
            <button
              onClick={handleBackToList}
              className="p-3 rounded-xl font-bold active:opacity-80 transition-opacity"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
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
      <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
        <header className="p-4 flex items-center justify-between" style={{ background: 'var(--decision-tint)', borderBottom: '1px solid color-mix(in srgb, var(--decision) 30%, transparent)' }}>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" style={{ color: 'var(--decision)' }} />
            <div>
              <p className="cs-eyebrow" style={{ color: 'var(--decision)' }}>Training Drill</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{selectedScenario.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="cs-numeric text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{formattedTime}</p>
            <p className="cs-eyebrow" style={{ color: 'var(--decision)' }}>
              Target: {Math.floor(selectedScenario.time_target_seconds / 60)}m
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          {/* Scenario */}
          <div className="cs-card p-4 mb-4">
            <h2 className="cs-eyebrow mb-2">Scenario</h2>
            <p style={{ color: 'var(--text-2)' }}>{selectedScenario.description}</p>
          </div>

          {/* Key Actions Checklist */}
          <div className="cs-card p-4 mb-4">
            <h2 className="cs-eyebrow mb-3">Key Actions (check as completed)</h2>
            <div className="space-y-2">
              {selectedScenario.key_actions.map((action, idx) => {
                const done = checkedActions.includes(action);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleAction(action)}
                    className="w-full p-3 rounded-lg flex items-center gap-3 text-left transition-opacity active:opacity-90"
                    style={{ background: done ? 'var(--green-tint)' : 'var(--surface-2)', border: `1px solid ${done ? 'color-mix(in srgb, var(--green) 40%, transparent)' : 'var(--border)'}` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ border: `2px solid ${done ? 'var(--green)' : 'var(--text-3)'}`, background: done ? 'var(--green)' : 'transparent' }}
                    >
                      {done && <CheckCircle className="w-4 h-4" style={{ color: 'var(--text-on-light)' }} />}
                    </div>
                    <span style={{ color: 'var(--text-1)' }}>{action}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress */}
          <div className="cs-card p-4">
            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-2)' }}>
              <span>Progress</span>
              <span className="cs-numeric">{checkedActions.length} / {selectedScenario.key_actions.length}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--surface-3)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(checkedActions.length / selectedScenario.key_actions.length) * 100}%`, background: 'var(--green)' }}
              />
            </div>
          </div>
        </main>

        <footer className="p-4 safe-area-bottom">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={handleRunProtocol}
              className="p-3 rounded-xl font-bold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
              style={{ background: 'var(--brand)', color: 'var(--text-on-light)', minHeight: 'var(--touch-min)' }}
            >
              <Play className="w-5 h-5" />
              Run Protocol
            </button>
            <button
              onClick={handleEndDrill}
              className="p-3 rounded-xl font-bold active:opacity-90 transition-opacity"
              style={{ background: 'var(--green)', color: 'var(--text-on-light)', minHeight: 'var(--touch-min)' }}
            >
              End Drill
            </button>
          </div>
          <button
            onClick={handleBackToList}
            className="w-full p-2 rounded-xl text-sm active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
          >
            Cancel Drill
          </button>
        </footer>
      </div>
    );
  }

  // Drill Selection Screen
  return (
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
      <header className="flex items-center gap-3 px-4" style={{ height: 'var(--appbar-h)' }}>
        <button
          onClick={() => setScreen('home')}
          aria-label="Back"
          className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
        </button>
        <div>
          <p className="cs-eyebrow" style={{ color: 'var(--decision)' }}>Training Mode</p>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Training Drills</h1>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {/* Random Drill Button */}
        <button
          onClick={handleRandomScenario}
          className="w-full p-4 rounded-xl mb-4 flex items-center justify-center gap-3 active:opacity-90 transition-opacity"
          style={{ background: 'var(--brand)', color: 'var(--text-on-light)', minHeight: 'var(--touch-comfort)' }}
        >
          <Shuffle className="w-6 h-6" />
          <span className="font-bold text-lg">Random Scenario</span>
        </button>

        {/* Scenario List */}
        <div className="space-y-3">
          {trainingScenarios.map((scenario) => {
            const diff = scenario.difficulty === 'beginner' ? 'var(--green)' : scenario.difficulty === 'intermediate' ? 'var(--decision)' : 'var(--red)';
            return (
              <button
                key={scenario.id}
                onClick={() => handleStartDrill(scenario)}
                className="w-full cs-card p-4 text-left active:opacity-90 transition-opacity"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold" style={{ color: 'var(--text-1)' }}>{scenario.title}</h3>
                  <span className="text-xs px-2 py-1 rounded flex-shrink-0" style={{ background: `color-mix(in srgb, ${diff} 15%, transparent)`, color: diff }}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>{scenario.description}</p>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
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
      <div className="p-4 text-center text-sm safe-area-bottom" style={{ color: 'var(--text-3)' }}>
        <p>Training drills help maintain emergency readiness.</p>
        <p>GDC expects ongoing capability maintenance.</p>
      </div>
    </div>
  );
}

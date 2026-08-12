import { useState } from 'react';
import {
  ArrowLeft,
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
      <div className="riq-screen safe-area-top">
        <header className="flex flex-col items-center justify-center" style={{ height: 'var(--appbar-h)', paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}>
          <p style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--brand-strong)' }}>Training mode</p>
          <h1 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>Drill complete</h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center" style={{ padding: 'var(--gutter)' }}>
          <div
            className="w-full max-w-md text-center"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-xl)', padding: '32px' }}
          >
            <Trophy className="w-20 h-20 mx-auto mb-4" style={{ color: score >= 80 ? 'var(--green-600)' : score >= 60 ? 'var(--brand)' : 'var(--text-3)' }} />

            <h2 className="cs-numeric font-bold mb-2" style={{ fontSize: 'var(--fs-title)', color: 'var(--text-1)' }}>{score}%</h2>
            <p className="mb-6" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-3)' }}>
              {score >= 80 ? 'Excellent!' :
               score >= 60 ? 'Good effort!' :
               'Keep practising!'}
            </p>

            <div className="text-left" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
              <div className="flex justify-between mb-2" style={{ fontSize: 'var(--fs-body-sm)' }}>
                <span style={{ color: 'var(--text-3)' }}>Time taken</span>
                <span className="cs-numeric" style={{ color: 'var(--text-1)' }}>{formattedTime}</span>
              </div>
              <div className="flex justify-between mb-2" style={{ fontSize: 'var(--fs-body-sm)' }}>
                <span style={{ color: 'var(--text-3)' }}>Target time</span>
                <span className="cs-numeric" style={{ color: 'var(--text-1)' }}>
                  {Math.floor(selectedScenario.time_target_seconds / 60)}:{(selectedScenario.time_target_seconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between" style={{ fontSize: 'var(--fs-body-sm)' }}>
                <span style={{ color: 'var(--text-3)' }}>Key actions</span>
                <span style={{ color: 'var(--text-1)' }}>{checkedActions.length} / {selectedScenario.key_actions.length}</span>
              </div>
            </div>

            {/* Actions checklist */}
            <div className="text-left">
              <p style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>Key actions review</p>
              {selectedScenario.key_actions.map((action, idx) => {
                const ok = checkedActions.includes(action);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3"
                    style={{ padding: '8px 4px', color: ok ? 'var(--green-700)' : 'var(--red-700)' }}
                  >
                    {ok ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span style={{ fontSize: 'var(--fs-body-sm)' }}>{action}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="safe-area-bottom" style={{ padding: 'var(--gutter)' }}>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStartDrill(selectedScenario)}
              className="font-bold active:opacity-90 transition-opacity"
              style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-btn)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body)' }}
            >
              Try again
            </button>
            <button
              onClick={handleBackToList}
              className="font-bold active:opacity-80 transition-opacity"
              style={{ background: 'var(--surface)', border: '2px solid var(--brand)', color: 'var(--brand-strong)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body)' }}
            >
              Back to drills
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // Active Drill Screen
  if (selectedScenario) {
    const pct = (checkedActions.length / selectedScenario.key_actions.length) * 100;
    return (
      <div className="riq-screen safe-area-top">
        <header className="flex items-center justify-between" style={{ background: 'var(--amber-50)', borderBottom: '2px solid var(--amber-600)', padding: 'var(--gutter)' }}>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--amber-700)' }} />
            <div>
              <p style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--brand-strong)' }}>Training drill</p>
              <p className="font-semibold" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-1)' }}>{selectedScenario.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="cs-numeric font-bold" style={{ fontSize: 'var(--fs-subtitle)', color: 'var(--text-1)' }}>{formattedTime}</p>
            <p style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--brand-strong)' }}>
              Target {Math.floor(selectedScenario.time_target_seconds / 60)}m
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ padding: 'var(--gutter)' }}>
          {/* Scenario */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Scenario</h2>
            <p style={{ fontSize: 'var(--fs-body)', color: 'var(--text-2)' }}>{selectedScenario.description}</p>
          </div>

          {/* Key Actions Checklist */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>Key actions (check as completed)</h2>
            <div className="space-y-3">
              {selectedScenario.key_actions.map((action, idx) => {
                const done = checkedActions.includes(action);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleAction(action)}
                    className="w-full flex items-center gap-3 text-left transition-opacity active:opacity-90"
                    style={{ background: 'var(--surface)', border: `2px solid ${done ? 'var(--green-600)' : 'var(--border)'}`, borderRadius: 'var(--radius-xl)', padding: '16px', minHeight: 'var(--touch-min)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ border: `2px solid ${done ? 'var(--green-600)' : 'var(--text-3)'}`, background: done ? 'var(--green-600)' : 'transparent' }}
                    >
                      {done && <CheckCircle className="w-5 h-5" style={{ color: '#fff' }} />}
                    </div>
                    <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>{action}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress */}
          <div style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div className="flex justify-between mb-3" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-2)' }}>
              <span>Progress</span>
              <span className="cs-numeric">{checkedActions.length} / {selectedScenario.key_actions.length}</span>
            </div>
            <div className="rounded-full" style={{ height: '10px', background: 'var(--surface-inset)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: 'var(--green-600)' }}
              />
            </div>
          </div>
        </main>

        <footer className="safe-area-bottom" style={{ padding: 'var(--gutter)' }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={handleRunProtocol}
              className="font-bold flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
              style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-btn)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body)' }}
            >
              <Play className="w-5 h-5" />
              Run protocol
            </button>
            <button
              onClick={handleEndDrill}
              className="font-bold active:opacity-90 transition-opacity"
              style={{ background: 'var(--green-600)', color: '#fff', boxShadow: 'var(--shadow-btn)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-comfort)', fontSize: 'var(--fs-body)' }}
            >
              End drill
            </button>
          </div>
          <button
            onClick={handleBackToList}
            className="w-full active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--text-2)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-min)', fontSize: 'var(--fs-body-sm)' }}
          >
            Cancel drill
          </button>
        </footer>
      </div>
    );
  }

  // Drill Selection Screen
  return (
    <div className="riq-screen safe-area-top">
      <div className="riq-training">Training — not a real emergency</div>
      <header className="flex items-center gap-3" style={{ height: 'var(--appbar-h)', paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}>
        <button
          onClick={() => setScreen('home')}
          aria-label="Back"
          className="flex items-center justify-center active:opacity-80 transition-opacity flex-shrink-0"
          style={{ width: '56px', height: '56px', marginLeft: '-12px', background: 'transparent' }}
        >
          <ArrowLeft className="w-7 h-7" style={{ color: 'var(--text-2)' }} />
        </button>
        <div>
          <p style={{ fontSize: 'var(--fs-label)', fontWeight: 700, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--brand-strong)' }}>Training mode</p>
          <h1 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>Training drills</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ padding: 'var(--gutter)' }}>
        {/* Random Drill Button */}
        <button
          onClick={handleRandomScenario}
          className="w-full flex items-center justify-center gap-3 active:opacity-90 transition-opacity"
          style={{ background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-btn)', borderRadius: 'var(--radius-xl)', minHeight: 'var(--touch-comfort)', marginBottom: '24px' }}
        >
          <Shuffle className="w-6 h-6" />
          <span className="font-bold" style={{ fontSize: 'var(--fs-lead)' }}>Random scenario</span>
        </button>

        {/* Scenario List */}
        <div className="space-y-4">
          {trainingScenarios.map((scenario) => {
            const diff = scenario.difficulty === 'beginner' ? 'var(--green-700)' : scenario.difficulty === 'intermediate' ? 'var(--amber-700)' : 'var(--red-700)';
            const diffBg = scenario.difficulty === 'beginner' ? 'var(--green-50)' : scenario.difficulty === 'intermediate' ? 'var(--amber-50)' : 'var(--red-50)';
            return (
              <button
                key={scenario.id}
                onClick={() => handleStartDrill(scenario)}
                className="w-full text-left active:opacity-90 transition-opacity"
                style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '20px' }}
              >
                <div className="flex justify-between items-start mb-2 gap-3">
                  <h3 className="font-bold" style={{ fontSize: 'var(--fs-body)', color: 'var(--text-1)' }}>{scenario.title}</h3>
                  <span className="flex-shrink-0" style={{ fontSize: 'var(--fs-caption)', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-pill)', background: diffBg, color: diff }}>
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="mb-3" style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-3)' }}>{scenario.description}</p>
                <div className="flex items-center gap-4" style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {scenario.key_actions.length} key actions
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Target {Math.floor(scenario.time_target_seconds / 60)}m
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Training info */}
      <div className="text-center safe-area-bottom" style={{ padding: 'var(--gutter)', fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>
        <p>Training drills help maintain emergency readiness.</p>
        <p>GDC expects ongoing capability maintenance.</p>
      </div>
    </div>
  );
}

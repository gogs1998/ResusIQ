import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { AudioStreamer } from '../lib/audio';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import {
  Mic,
  Square,
  Activity,
  AlertTriangle,
  HeartPulse,
  Pill,
  Info,
  ArrowLeft,
  Phone,
  X,
  Key,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Build system instruction with our FULL clinical data ──────────────
function buildSystemInstruction(practiceAddress?: string, practicePostcode?: string): string {
  // Build a condensed protocol & drug reference for the AI
  const protocolSummary = protocols.map(p => {
    const stepList = p.steps
      .filter(s => s.type !== 'decision')
      .map(s => s.show.split('\n')[0])
      .join(' → ');
    return `${p.title}: ${stepList}`;
  }).join('\n');

  const drugSummary = drugs.map(d =>
    `${d.name}: ${d.indication}. Adult: ${d.adult_dose} ${d.route}. ${d.child_dose ? `Child: ${d.child_dose}.` : ''} ${d.warnings[0]}`
  ).join('\n');

  return `You are ResusIQ, a calm, authoritative medical emergency voice assistant for UK dental practices.
You follow Resuscitation Council UK 2021 and SDCEP guidelines precisely.

CRITICAL RULES:
- In an emergency, IMMEDIATELY call the setEmergencyProtocol tool to display the protocol on screen.
- Keep verbal responses extremely concise — short sentences, clear commands.
- Guide step-by-step. Do NOT read the entire protocol at once.
- Use the ABCDE approach for assessment.
- Always tell them to call 999 for serious emergencies.
- For cardiac arrest, tell them to follow the visual CPR metronome on screen.
- If they describe symptoms, diagnose the most likely emergency and set the protocol.
- Drug doses must match EXACTLY what is listed below.
- For MI/chest pain: oxygen ONLY if SpO2 < 94% (not routine).
- For stroke: do NOT give aspirin (could be haemorrhagic).
- Adrenaline in anaphylaxis: NO upper limit on doses, repeat every 5 minutes.
- Midazolam: SINGLE dose only, only if seizure > 5 minutes.
- Aspirin: patient must CHEW the tablet.
${practiceAddress ? `\nPractice location: ${practiceAddress}, ${practicePostcode || ''}` : ''}

PROTOCOLS AVAILABLE:
${protocolSummary}

EMERGENCY DRUGS (Scottish Government mandatory list):
${drugSummary}

When the emergency is over or resolved, call setEmergencyProtocol with protocol "NONE" to clear the screen.
If the user asks a non-emergency question about dental emergencies, equipment, or training, answer helpfully.`;
}

// ── Map our protocol IDs to the tool's enum values ────────────────────
const PROTOCOL_MAP: Record<string, string> = {
  ANAPHYLAXIS: 'anaphylaxis',
  ASTHMA: 'asthma',
  CARDIAC_ARREST: 'cardiac_arrest',
  HYPOGLYCEMIA: 'hypoglycaemia',
  MYOCARDIAL_INFARCTION: 'chest_pain',
  SEIZURES: 'seizure',
  SYNCOPE: 'syncope',
  CHOKING: 'choking',
  STROKE: 'stroke',
  ADRENAL_CRISIS: 'adrenal_crisis',
};

// ── Protocol display data (enriched from our protocols.ts) ────────────
function getProtocolDisplay(protocolKey: string) {
  const localId = PROTOCOL_MAP[protocolKey];
  if (!localId) return null;

  const protocol = protocols.find(p => p.id === localId);
  if (!protocol) return null;

  // Extract key steps and drugs
  const steps = protocol.steps
    .filter(s => s.type === 'instruction' || s.type === 'drug' || s.type === 'cpr_mode')
    .slice(0, 8)
    .map(s => s.show.split('\n')[0]);

  const protocolDrugs = protocol.steps
    .filter(s => s.drug_id)
    .map(s => {
      const drug = drugs.find(d => d.id === s.drug_id);
      return drug ? `${drug.name} — ${drug.adult_dose} ${drug.route}` : null;
    })
    .filter(Boolean) as string[];

  return {
    id: localId,
    title: protocol.title,
    steps,
    drugs: protocolDrugs.length > 0 ? protocolDrugs : undefined,
    color: protocol.color,
    isCPR: localId === 'cardiac_arrest',
  };
}

// ── Component ─────────────────────────────────────────────────────────
export function AIAssistant() {
  const { setScreen, practiceSetup, startEmergency } = useAppStore();

  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [statusText, setStatusText] = useState('System Ready');

  const streamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);

  // Load API key from localStorage
  const getApiKey = (): string | null => {
    return localStorage.getItem('resusiq-gemini-key');
  };

  const saveApiKey = (key: string) => {
    localStorage.setItem('resusiq-gemini-key', key);
    setShowApiKeyInput(false);
    setApiKeyInput('');
    setError(null);
  };

  // Launch our full protocol runner for a given protocol
  const launchFullProtocol = useCallback((protocolId: string) => {
    stopSession();
    startEmergency(protocolId);
  }, [startEmergency]);

  const startSession = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    setError(null);
    setIsConnecting(true);
    setActiveProtocol(null);
    setStatusText('Connecting...');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const streamer = new AudioStreamer();
      streamerRef.current = streamer;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-preview-native-audio-dialog',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            setStatusText('Listening — describe the emergency');

            streamer.onAudioData = (base64Data) => {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
                });
              });
            };

            streamer.onVolumeChange = (vol) => {
              setVolume(Math.min(vol * 5, 1));
            };

            streamer.startRecording().catch((err) => {
              console.error('Mic error:', err);
              setError('Could not access microphone. Check permissions.');
              stopSession();
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Play audio response from Gemini
            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              streamer.playAudio(base64Audio);
            }

            if (message.serverContent?.interrupted) {
              streamer.stopPlayback();
            }

            // Handle tool calls
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                const responses = functionCalls.map((call: any) => {
                  if (call.name === 'setEmergencyProtocol') {
                    const args = call.args as any;
                    if (args?.protocol && args.protocol !== 'NONE') {
                      setActiveProtocol(args.protocol);
                      setStatusText(`Protocol: ${args.protocol.replace(/_/g, ' ')}`);
                    } else {
                      setActiveProtocol(null);
                      setStatusText('Listening — describe the emergency');
                    }
                    return {
                      id: call.id,
                      name: call.name,
                      response: { result: 'Protocol displayed on screen. Guide the user through it step by step.' },
                    };
                  }
                  return {
                    id: call.id,
                    name: call.name,
                    response: { error: 'Unknown function' },
                  };
                });

                sessionPromise.then((session: any) => {
                  session.sendToolResponse({ functionResponses: responses });
                });
              }
            }
          },
          onerror: (err) => {
            console.error('Live API error:', err);
            setError('Connection lost. Try again.');
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: buildSystemInstruction(
            practiceSetup?.address,
            practiceSetup?.postcode
          ),
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'setEmergencyProtocol',
                  description:
                    'Display the specific medical emergency protocol on screen and guide the user through it.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      protocol: {
                        type: Type.STRING,
                        description: 'The diagnosed emergency protocol to display.',
                        enum: [
                          'ANAPHYLAXIS',
                          'ASTHMA',
                          'CARDIAC_ARREST',
                          'HYPOGLYCEMIA',
                          'MYOCARDIAL_INFARCTION',
                          'SEIZURES',
                          'SYNCOPE',
                          'CHOKING',
                          'STROKE',
                          'ADRENAL_CRISIS',
                          'NONE',
                        ],
                      },
                    },
                    required: ['protocol'],
                  },
                },
              ],
            },
          ],
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error('Session start failed:', err);
      if (err.message?.includes('API key') || err.message?.includes('401') || err.message?.includes('403')) {
        setError('Invalid API key. Please check and try again.');
        localStorage.removeItem('resusiq-gemini-key');
        setShowApiKeyInput(true);
      } else {
        setError(err.message || 'Failed to connect to AI assistant.');
      }
      setIsConnecting(false);
      setStatusText('System Ready');
    }
  };

  const stopSession = () => {
    if (streamerRef.current) {
      streamerRef.current.stopRecording();
      streamerRef.current.stopPlayback();
      streamerRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        try { session.close(); } catch { /* ignore */ }
      });
      sessionRef.current = null;
    }

    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
    setStatusText('System Ready');
  };

  useEffect(() => {
    return () => { stopSession(); };
  }, []);

  const protocolDisplay = activeProtocol ? getProtocolDisplay(activeProtocol) : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 p-4 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopSession(); setScreen('home'); }}
            className="p-2 rounded-lg hover:bg-zinc-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-red-500" />
              AI Voice Assistant
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="p-2 rounded-lg hover:bg-zinc-800"
            title="API Key Settings"
          >
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Call 999 bar */}
      <div className="p-2 bg-red-900/40">
        <a
          href="tel:999"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 block text-center"
        >
          <Phone className="w-5 h-5" />
          CALL 999
        </a>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-8 overflow-y-auto">
        {/* Left: Activate button */}
        <div className="flex flex-col items-center space-y-8">
          {!isActive && !isConnecting && (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Voice Emergency Mode</h2>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                Describe the emergency. The AI will diagnose, display protocols, and guide you step-by-step.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl w-full max-w-sm text-center text-sm">
              {error}
            </div>
          )}

          {/* Animated mic button */}
          <div className="relative flex items-center justify-center w-56 h-56">
            {isActive && (
              <>
                <motion.div
                  animate={{ scale: 1 + volume * 1.5, opacity: 0.5 + volume * 0.5 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                  className="absolute inset-0 bg-red-500/20 rounded-full"
                />
                <motion.div
                  animate={{ scale: 1 + volume * 0.8, opacity: 0.8 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                  className="absolute inset-4 bg-red-500/20 rounded-full"
                />
              </>
            )}

            <button
              onClick={isActive ? stopSession : startSession}
              disabled={isConnecting}
              className={`relative z-10 flex flex-col items-center justify-center w-44 h-44 rounded-full shadow-2xl transition-all duration-300 ${
                isActive
                  ? 'bg-zinc-900 border-4 border-red-500 hover:bg-zinc-800'
                  : 'bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95'
              } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isConnecting ? (
                <Activity className="w-14 h-14 animate-pulse text-white" />
              ) : isActive ? (
                <>
                  <Square className="w-10 h-10 text-red-500 mb-2" fill="currentColor" />
                  <span className="text-red-500 font-bold tracking-widest uppercase text-xs">
                    Stop
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-14 h-14 text-white mb-2" />
                  <span className="text-white font-bold tracking-widest uppercase text-xs">
                    Activate
                  </span>
                </>
              )}
            </button>
          </div>

          <p
            className={`text-sm font-medium uppercase tracking-widest transition-colors duration-300 ${
              isActive ? 'text-red-500 animate-pulse' : 'text-zinc-600'
            }`}
          >
            {statusText}
          </p>
        </div>

        {/* Right: Protocol display panel */}
        <AnimatePresence>
          {protocolDisplay && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${protocolDisplay.color}30` }}>
                    <HeartPulse className="w-5 h-5" style={{ color: protocolDisplay.color }} />
                  </div>
                  <h2 className="text-xl font-bold text-white">{protocolDisplay.title}</h2>
                </div>
                <button
                  onClick={() => setActiveProtocol(null)}
                  className="p-1 hover:bg-zinc-800 rounded"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Steps */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Immediate Actions
                  </h3>
                  <ul className="space-y-2">
                    {protocolDisplay.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Drugs */}
                {protocolDisplay.drugs && (
                  <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-2">
                      <Pill className="w-3 h-3" /> Emergency Drugs
                    </h3>
                    <ul className="space-y-1">
                      {protocolDisplay.drugs.map((drug, idx) => (
                        <li key={idx} className="text-red-400 font-medium text-sm">
                          • {drug}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CPR Metronome */}
                {protocolDisplay.isCPR && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col items-center">
                    <h3 className="text-red-400 font-bold mb-3 uppercase tracking-widest text-xs">
                      CPR Metronome (110 BPM)
                    </h3>
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 60 / 110, repeat: Infinity, ease: 'linear' }}
                      className="w-14 h-14 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center justify-center"
                    >
                      <HeartPulse className="w-7 h-7 text-white" />
                    </motion.div>
                  </div>
                )}

                {/* Switch to full protocol button */}
                {protocolDisplay.id && (
                  <button
                    onClick={() => launchFullProtocol(protocolDisplay.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors"
                  >
                    Open Full Protocol Guide →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* API Key Modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-zinc-700">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-bold">Gemini API Key</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              The AI voice assistant requires a Google Gemini API key. Get one free at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                aistudio.google.com
              </a>
            </p>
            <input
              type="password"
              placeholder="Paste your API key here"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 mb-4 font-mono text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowApiKeyInput(false); setApiKeyInput(''); }}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-2.5 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (apiKeyInput.trim()) {
                    saveApiKey(apiKeyInput.trim());
                  }
                }}
                disabled={!apiKeyInput.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2.5 rounded-lg font-medium text-sm"
              >
                Save & Connect
              </button>
            </div>
            {getApiKey() && (
              <button
                onClick={() => {
                  localStorage.removeItem('resusiq-gemini-key');
                  setApiKeyInput('');
                }}
                className="w-full text-xs text-red-400 mt-3 hover:text-red-300"
              >
                Remove saved key
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

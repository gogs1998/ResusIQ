import { useState, useRef, useEffect, useCallback } from 'react';
// @google/genai is imported dynamically inside startSession() to keep it out
// of the initial bundle; the type-only import is erased at build time.
import type { LiveServerMessage } from '@google/genai';
import { AudioStreamer } from '../lib/audio';
import { useAppStore } from '../store/appStore';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import {
  Mic,
  Square,
  Activity,
  HeartPulse,
  Pill,
  Info,
  ArrowLeft,
  Phone,
  X,
  Key,
  Settings,
} from 'lucide-react';
import { Sheet } from './Sheet';
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
export const PROTOCOL_MAP: Record<string, string> = {
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

  // Dialog a11y (focus trap, Escape, scroll-lock) is handled by the shared Sheet.
  const closeApiKeyInput = useCallback(() => {
    setShowApiKeyInput(false);
    setApiKeyInput('');
  }, []);

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
      const { GoogleGenAI, Modality, Type } = await import('@google/genai');
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
    <div className="min-h-screen flex flex-col safe-area-top" style={{ background: 'radial-gradient(120% 60% at 50% 35%, rgba(139,92,246,0.18), var(--bg))', color: 'var(--text-1)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4" style={{ height: 'var(--appbar-h)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopSession(); setScreen('home'); }}
            aria-label="Back"
            className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
          </button>
          <h1 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-1)' }}>
            <Mic className="w-5 h-5" style={{ color: 'var(--ai-from)' }} />
            AI Voice Assistant
          </h1>
        </div>
        <button
          onClick={() => setShowApiKeyInput(true)}
          aria-label="API key settings"
          className="w-11 h-11 rounded-xl flex items-center justify-center active:opacity-80 transition-opacity"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <Settings className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
        </button>
      </header>

      {/* Call 999 bar */}
      <div className="px-4 pb-2">
        <a
          href="tel:999"
          className="w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-center active:opacity-90 transition-opacity"
          style={{ background: 'var(--red-strong)', color: 'var(--text-on-color)', boxShadow: 'var(--glow-red)', minHeight: 'var(--touch-min)' }}
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
              <div className="inline-flex items-center justify-center p-4 rounded-full" style={{ background: 'var(--ai-tint)' }}>
                <Mic className="w-10 h-10" style={{ color: 'var(--ai-from)' }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Voice Emergency Mode</h2>
              <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-3)' }}>
                Describe the emergency. The AI will diagnose, display protocols, and guide you step-by-step.
              </p>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl w-full max-w-sm text-center text-sm" style={{ background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)', color: 'var(--red)' }}>
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
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--ai-tint)' }}
                />
                <motion.div
                  animate={{ scale: 1 + volume * 0.8, opacity: 0.8 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
                  className="absolute inset-4 rounded-full"
                  style={{ background: 'var(--ai-tint)' }}
                />
              </>
            )}

            <button
              onClick={isActive ? stopSession : startSession}
              disabled={isConnecting}
              className={`relative z-10 flex flex-col items-center justify-center w-44 h-44 rounded-full transition-all duration-300 ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              style={isActive
                ? { background: 'var(--surface-1)', border: '4px solid var(--ai-from)' }
                : { background: 'linear-gradient(140deg, var(--ai-from), var(--ai-to))', boxShadow: 'var(--glow-ai)' }}
            >
              {isConnecting ? (
                <Activity className="w-14 h-14 animate-pulse" style={{ color: 'var(--ai-from)' }} />
              ) : isActive ? (
                <>
                  <Square className="w-10 h-10 mb-2" style={{ color: 'var(--ai-from)' }} fill="currentColor" />
                  <span className="font-bold tracking-widest uppercase text-xs" style={{ color: 'var(--ai-from)' }}>
                    Stop
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-14 h-14 mb-2" style={{ color: 'var(--text-on-color)' }} />
                  <span className="font-bold tracking-widest uppercase text-xs" style={{ color: 'var(--text-on-color)' }}>
                    Activate
                  </span>
                </>
              )}
            </button>
          </div>

          <p
            className={`text-sm font-medium uppercase tracking-widest transition-colors duration-300 ${isActive ? 'animate-pulse' : ''}`}
            style={{ color: isActive ? 'var(--ai-from)' : 'var(--text-3)' }}
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
              className="max-w-md w-full cs-card p-5"
            >
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `color-mix(in srgb, ${protocolDisplay.color} 18%, transparent)` }}>
                    <HeartPulse className="w-5 h-5" style={{ color: protocolDisplay.color }} />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{protocolDisplay.title}</h2>
                </div>
                <button
                  onClick={() => setActiveProtocol(null)}
                  aria-label="Dismiss protocol"
                  className="p-1 rounded active:opacity-70"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Steps */}
                <div>
                  <h3 className="cs-eyebrow mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Immediate Actions
                  </h3>
                  <ul className="space-y-2">
                    {protocolDisplay.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                        <span className="cs-numeric flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Drugs */}
                {protocolDisplay.drugs && (
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface-inset)', border: '1px solid var(--border)' }}>
                    <h3 className="cs-eyebrow mb-2 flex items-center gap-2" style={{ color: 'var(--drug)' }}>
                      <Pill className="w-3 h-3" /> Emergency Drugs
                    </h3>
                    <ul className="space-y-1">
                      {protocolDisplay.drugs.map((drug, idx) => (
                        <li key={idx} className="font-medium text-sm" style={{ color: 'var(--drug)' }}>
                          • {drug}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CPR Metronome */}
                {protocolDisplay.isCPR && (
                  <div className="p-4 rounded-xl flex flex-col items-center" style={{ background: 'var(--red-tint)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)' }}>
                    <h3 className="cs-eyebrow mb-3" style={{ color: 'var(--red)' }}>
                      CPR Metronome (110 BPM)
                    </h3>
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 60 / 110, repeat: Infinity, ease: 'linear' }}
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--red)', boxShadow: 'var(--glow-red)' }}
                    >
                      <HeartPulse className="w-7 h-7" style={{ color: 'var(--text-on-color)' }} />
                    </motion.div>
                  </div>
                )}

                {/* Switch to full protocol button */}
                {protocolDisplay.id && (
                  <button
                    onClick={() => launchFullProtocol(protocolDisplay.id)}
                    className="w-full font-bold py-3 px-4 rounded-xl text-sm active:opacity-90 transition-opacity"
                    style={{ background: 'var(--brand)', color: 'var(--text-on-light)', minHeight: 'var(--touch-min)' }}
                  >
                    Open Full Protocol Guide →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* API Key dialog */}
      <Sheet
        open={showApiKeyInput}
        onClose={closeApiKeyInput}
        title="Gemini API Key"
        accent="var(--decision)"
        icon={<Key className="w-6 h-6" />}
        footer={
          <div className="flex gap-2">
            <button
              onClick={closeApiKeyInput}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm active:opacity-80 transition-opacity"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', minHeight: 'var(--touch-min)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { if (apiKeyInput.trim()) saveApiKey(apiKeyInput.trim()); }}
              disabled={!apiKeyInput.trim()}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 active:opacity-90 transition-opacity"
              style={{ background: 'var(--brand)', color: 'var(--text-on-light)', minHeight: 'var(--touch-min)' }}
            >
              Save &amp; Connect
            </button>
          </div>
        }
      >
        <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
          The AI voice assistant requires a Google Gemini API key. Get one free at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--roles)' }}>
            aistudio.google.com
          </a>
        </p>
        <input
          type="password"
          placeholder="Paste your API key here"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          className="cs-input font-mono text-sm"
          autoFocus
        />
        {getApiKey() && (
          <button
            onClick={() => { localStorage.removeItem('resusiq-gemini-key'); setApiKeyInput(''); }}
            className="w-full text-xs mt-3 active:opacity-70"
            style={{ color: 'var(--red)' }}
          >
            Remove saved key
          </button>
        )}
      </Sheet>
    </div>
  );
}

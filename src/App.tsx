import { useState, useRef, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { AudioStreamer } from "./lib/audio";
import { Mic, Square, Activity, AlertTriangle, HeartPulse, Pill, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const SYSTEM_INSTRUCTION = `You are a calm, authoritative medical emergency assistant for dental practices.
Your primary job is to listen to the user's plain language description of the emergency, diagnose it, and IMMEDIATELY call the 'setEmergencyProtocol' tool.
This will display the official SDCEP and Resuscitation Council (UK) protocols on their screen.
After calling the tool, verbally guide them through the ABCDE approach and the specific protocol steps.
Keep verbal responses extremely concise. Do not read the entire protocol aloud at once; guide them step-by-step based on their responses.
If Cardiac Arrest, tell them to follow the visual metronome for CPR.`;

type Protocol = {
  id: string;
  title: string;
  steps: string[];
  drugs?: string[];
};

const PROTOCOLS: Record<string, Protocol> = {
  ANAPHYLAXIS: {
    id: 'ANAPHYLAXIS',
    title: 'Anaphylaxis',
    steps: [
      '1. Call 999 immediately.',
      '2. Lie patient flat, raise legs (if breathing allows).',
      '3. Administer Adrenaline IM.',
      '4. Administer High-flow Oxygen (15L/min).',
      '5. Repeat Adrenaline every 5 mins if no improvement.'
    ],
    drugs: ['Adrenaline 1:1000 IM (0.5ml / 0.5mg adult)']
  },
  ASTHMA: {
    id: 'ASTHMA',
    title: 'Asthma Attack',
    steps: [
      '1. Sit patient upright.',
      '2. Administer Salbutamol inhaler (2 puffs, then 1 puff every 30-60 secs up to 10 puffs).',
      '3. Administer High-flow Oxygen (15L/min).',
      '4. If severe or no improvement, call 999.'
    ],
    drugs: ['Salbutamol Inhaler (100mcg/actuation)']
  },
  CARDIAC_ARREST: {
    id: 'CARDIAC_ARREST',
    title: 'Cardiac Arrest',
    steps: [
      '1. Call 999 immediately. Request ambulance and AED.',
      '2. Start CPR 30:2 (Chest compressions 100-120/min).',
      '3. Attach AED as soon as available and follow prompts.',
      '4. Administer High-flow Oxygen (15L/min) if possible.'
    ]
  },
  HYPOGLYCEMIA: {
    id: 'HYPOGLYCEMIA',
    title: 'Hypoglycemia',
    steps: [
      '1. If conscious: Give 15-20g fast-acting oral glucose.',
      '2. If unconscious/uncooperative: Administer Glucagon IM.',
      '3. Recheck blood glucose after 10-15 mins.',
      '4. Call 999 if no recovery.'
    ],
    drugs: ['Oral Glucose (e.g., Glucogel)', 'Glucagon 1mg IM']
  },
  MYOCARDIAL_INFARCTION: {
    id: 'MYOCARDIAL_INFARCTION',
    title: 'Myocardial Infarction / Angina',
    steps: [
      '1. Call 999 immediately.',
      '2. Sit patient comfortably.',
      '3. Administer GTN spray sublingually.',
      '4. Administer Aspirin (crushed or chewed).',
      '5. Oxygen (15L/min) ONLY if SpO2 < 94% or breathless.'
    ],
    drugs: ['GTN Spray (400mcg/dose - 2 puffs)', 'Aspirin 300mg']
  },
  SEIZURES: {
    id: 'SEIZURES',
    title: 'Seizures / Epilepsy',
    steps: [
      '1. Protect from injury (do not restrain).',
      '2. Administer High-flow Oxygen (15L/min).',
      '3. If seizure > 5 mins: Administer Midazolam buccal.',
      '4. Call 999 if first seizure, >5 mins, or repeated.'
    ],
    drugs: ['Midazolam 10mg Buccal']
  },
  SYNCOPE: {
    id: 'SYNCOPE',
    title: 'Syncope (Fainting)',
    steps: [
      '1. Lay flat, raise legs.',
      '2. Loosen tight clothing.',
      '3. Administer Oxygen 15L/min if recovery is slow.'
    ]
  },
  CHOKING: {
    id: 'CHOKING',
    title: 'Choking',
    steps: [
      '1. Encourage coughing.',
      '2. If ineffective: Give up to 5 back blows.',
      '3. If ineffective: Give up to 5 abdominal thrusts.',
      '4. Call 999 if obstruction not cleared.',
      '5. If patient becomes unconscious, start CPR.'
    ]
  }
};

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);

  const streamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);

  const startSession = async () => {
    setError(null);
    setIsConnecting(true);
    setActiveProtocol(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const streamer = new AudioStreamer();
      streamerRef.current = streamer;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);

            streamer.onAudioData = (base64Data) => {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                });
              });
            };

            streamer.onVolumeChange = (vol) => {
              setVolume(Math.min(vol * 5, 1)); // Amplify visually
            };

            streamer.startRecording().catch((err) => {
              console.error("Microphone error:", err);
              setError(
                "Could not access microphone. Please ensure permissions are granted.",
              );
              stopSession();
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              streamer.playAudio(base64Audio);
            }

            if (message.serverContent?.interrupted) {
              streamer.stopPlayback();
            }

            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                const responses = functionCalls.map((call: any) => {
                  if (call.name === "setEmergencyProtocol") {
                    const args = call.args as any;
                    if (args && args.protocol && args.protocol !== "NONE") {
                      setActiveProtocol(args.protocol);
                    } else {
                      setActiveProtocol(null);
                    }
                    return {
                      id: call.id,
                      name: call.name,
                      response: { result: "Protocol updated on screen." }
                    };
                  }
                  return {
                    id: call.id,
                    name: call.name,
                    response: { error: "Unknown function" }
                  };
                });

                sessionPromise.then((session: any) => {
                  session.sendToolResponse({ functionResponses: responses });
                });
              }
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{
            functionDeclarations: [{
              name: "setEmergencyProtocol",
              description: "Sets the visual UI to display the specific medical emergency protocol steps.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  protocol: {
                    type: Type.STRING,
                    description: "The diagnosed emergency protocol.",
                    enum: ["ANAPHYLAXIS", "ASTHMA", "CARDIAC_ARREST", "HYPOGLYCEMIA", "MYOCARDIAL_INFARCTION", "SEIZURES", "SYNCOPE", "CHOKING", "NONE"]
                  }
                },
                required: ["protocol"]
              }
            }]
          }]
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Failed to start session:", err);
      setError(err.message || "Failed to start emergency assistant.");
      setIsConnecting(false);
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
        try {
          session.close();
        } catch (e) {
          // Ignore close errors
        }
      });
      sessionRef.current = null;
    }

    setIsActive(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col md:flex-row items-center justify-center p-6 font-sans gap-8">
      <div className="max-w-md w-full flex flex-col items-center space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Dental Emergency
          </h1>
          <p className="text-zinc-400 text-lg">
            Voice-guided medical assistant
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl w-full text-center text-sm">
            {error}
          </div>
        )}

        <div className="relative flex items-center justify-center w-64 h-64">
          {isActive && (
            <>
              <motion.div
                animate={{ scale: 1 + volume * 1.5, opacity: 0.5 + volume * 0.5 }}
                transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                className="absolute inset-0 bg-red-500/20 rounded-full"
              />
              <motion.div
                animate={{ scale: 1 + volume * 0.8, opacity: 0.8 }}
                transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                className="absolute inset-4 bg-red-500/20 rounded-full"
              />
            </>
          )}

          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`relative z-10 flex flex-col items-center justify-center w-48 h-48 rounded-full shadow-2xl transition-all duration-300 ${
              isActive
                ? "bg-zinc-900 border-4 border-red-500 hover:bg-zinc-800"
                : "bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95"
            } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isConnecting ? (
              <Activity className="w-16 h-16 animate-pulse text-white" />
            ) : isActive ? (
              <>
                <Square
                  className="w-12 h-12 text-red-500 mb-2"
                  fill="currentColor"
                />
                <span className="text-red-500 font-bold tracking-widest uppercase text-sm">
                  Stop
                </span>
              </>
            ) : (
              <>
                <Mic className="w-16 h-16 text-white mb-2" />
                <span className="text-white font-bold tracking-widest uppercase text-sm">
                  Activate
                </span>
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p
            className={`text-sm font-medium uppercase tracking-widest transition-colors duration-300 ${isActive ? "text-red-500 animate-pulse" : "text-zinc-600"}`}
          >
            {isConnecting
              ? "Connecting..."
              : isActive
                ? "Assistant Active"
                : "System Ready"}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {activeProtocol && PROTOCOLS[activeProtocol] && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <HeartPulse className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {PROTOCOLS[activeProtocol].title}
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Immediate Actions
                </h3>
                <ul className="space-y-3">
                  {PROTOCOLS[activeProtocol].steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-zinc-300">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {PROTOCOLS[activeProtocol].drugs && (
                <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                    <Pill className="w-4 h-4" /> Emergency Drugs
                  </h3>
                  <ul className="space-y-2">
                    {PROTOCOLS[activeProtocol].drugs.map((drug, idx) => (
                      <li key={idx} className="text-red-400 font-medium">
                        • {drug}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeProtocol === 'CARDIAC_ARREST' && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex flex-col items-center justify-center">
                  <h3 className="text-red-400 font-bold mb-4 uppercase tracking-widest text-sm">CPR Metronome (110 BPM)</h3>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 60 / 110, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center justify-center"
                  >
                    <HeartPulse className="w-8 h-8 text-white" />
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

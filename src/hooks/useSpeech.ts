import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { isNative } from '../lib/platform';

// Web Speech API types for browsers
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface;
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}

interface UseSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const { rate = 0.9, pitch = 1, volume = 1 } = options;
  const { isVoiceEnabled, isMuted } = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Read-aloud uses the browser's built-in SpeechSynthesis only: it works
  // offline, needs no API key, and never opens a websocket — so step narration
  // can NEVER fail to start mid-emergency. (The realtime Gemini Live voice was
  // removed from the web app; it returns in the native iOS build, where audio
  // capture/playback is reliable. See docs/ios-plan.)
  useEffect(() => {
    const loadVoices = () => {
      setVoices(speechSynthesis.getVoices());
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const getPreferredVoice = useCallback(() => {
    // Prefer UK English voices
    const ukVoice = voices.find(v => 
      v.lang === 'en-GB' && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    );
    const anyUkVoice = voices.find(v => v.lang === 'en-GB');
    const anyEnglishVoice = voices.find(v => v.lang.startsWith('en'));
    return ukVoice || anyUkVoice || anyEnglishVoice || voices[0];
  }, [voices]);

  const speak = useCallback((text: string, interrupt = true) => {
    if (!isVoiceEnabled || isMuted || !text) return;
    if (typeof speechSynthesis === 'undefined') return;

    if (interrupt) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const voice = getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isVoiceEnabled, isMuted, rate, pitch, volume, getPreferredVoice]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    speechSynthesis.resume();
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    voices,
  };
}

// Voice commands hook for speech recognition
export function useVoiceCommands(onCommand: (command: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  // Always invoke the latest command handler without rebuilding the
  // recognition instance. The handler closes over step/answer state that
  // changes often; rebinding via a ref avoids tearing down (and aborting)
  // active recognition every render, while never calling a stale closure.
  const onCommandRef = useRef(onCommand);
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    // Native (Capacitor iOS/Android) uses the plugin path in start/stopListening.
    if (isNative) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      onCommandRef.current(transcript);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const startListening = useCallback(async () => {
    // ── Native (Capacitor) — SFSpeechRecognizer via plugin. Dynamically
    //    imported so it never enters the web bundle. Needs on-device QA. ──
    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }
        await SpeechRecognition.removeAllListeners();
        await SpeechRecognition.addListener('partialResults', (data: { matches?: string[] }) => {
          const phrase = data.matches?.[0];
          if (phrase) onCommandRef.current(phrase.toLowerCase().trim());
        });
        await SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
          setIsListening(data.status === 'started');
        });
        await SpeechRecognition.start({ language: 'en-GB', maxResults: 1, partialResults: true, popup: false });
      } catch {
        setError('Native speech recognition unavailable');
        setIsListening(false);
      }
      return;
    }

    // ── Web Speech ──
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already started
      }
    }
  }, [isListening]);

  const stopListening = useCallback(async () => {
    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    error
  };
}

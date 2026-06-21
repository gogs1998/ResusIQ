import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { geminiTTS } from '../lib/geminiTTS';
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
  const useGemini = geminiTTS.isAvailable;

  // Register speaking state callback for Gemini TTS
  useEffect(() => {
    if (useGemini) {
      geminiTTS.setSpeakingCallback(setIsSpeaking);
      // Pre-connect so first speak() is fast
      geminiTTS.connect();
    }
    return () => {
      geminiTTS.setSpeakingCallback(() => {});
    };
  }, [useGemini]);

  // Browser SpeechSynthesis voices (fallback)
  useEffect(() => {
    if (useGemini) return; // Skip loading browser voices if using Gemini
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [useGemini]);

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

    // ── Gemini TTS path (high-quality voice) ──
    if (useGemini) {
      if (interrupt) {
        geminiTTS.stop();
      }
      geminiTTS.speak(text);
      return;
    }

    // ── Browser SpeechSynthesis fallback ──
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
  }, [isVoiceEnabled, isMuted, rate, pitch, volume, getPreferredVoice, useGemini]);

  const stop = useCallback(() => {
    if (useGemini) {
      geminiTTS.stop();
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [useGemini]);

  const pause = useCallback(() => {
    // Gemini TTS doesn't support pause — stop instead
    if (useGemini) {
      geminiTTS.stop();
      setIsSpeaking(false);
      return;
    }
    speechSynthesis.pause();
  }, [useGemini]);

  const resume = useCallback(() => {
    if (!useGemini) {
      speechSynthesis.resume();
    }
  }, [useGemini]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    voices,
    isGeminiTTS: useGemini,
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

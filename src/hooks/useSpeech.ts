import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { isNative } from '../lib/platform';
import { pickVoice } from '../lib/voiceChoice';

/**
 * How long the very first line waits for iOS to publish its voice list.
 * `getVoices()` is empty until `voiceschanged` fires, which on a cold launch is
 * tens of milliseconds — but it is never guaranteed to fire at all. After this
 * the line is spoken anyway, voiceless: a late line is a bug, a dropped one is
 * a safety failure.
 */
export const VOICE_LIST_WAIT_MS = 1000;

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

/** The identity of a voice, as opposed to the (replaceable) object holding it. */
type VoiceKey = { name: string; lang: string };

const toVoiceKey = (voice: SpeechSynthesisVoice | null): VoiceKey | null =>
  voice ? { name: voice.name, lang: voice.lang } : null;

export function useSpeech(options: UseSpeechOptions = {}) {
  const { rate = 0.9, pitch = 1, volume = 1 } = options;
  const { isVoiceEnabled, isMuted } = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Kept in state, and kept in the return, although nothing currently reads it:
  // it is part of the hook's published surface. Note the cost if that changes —
  // `voiceschanged` fires repeatedly on iOS, and each one re-renders every
  // consumer of this hook (ProtocolRunner, CPRMode) whether or not they care.
  // The voice DECISION deliberately does not go through it; see below.
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // The narrator, chosen once and held — as a NAME + LANG, never as the voice
  // object itself.
  //
  // Two different things have to be true at once. WHICH voice is decided once
  // and held: re-picking per utterance is what made the narrator change between
  // lines on a real iPhone. But the OBJECT that carries it is not stable —
  // iOS republishes `getVoices()` with fresh instances, and an utterance
  // assigned a voice from a superseded list is one the platform may decline to
  // honour, which is silence in the middle of an emergency. So the key is held
  // and the live object is looked up from the CURRENT list at every emit.
  const chosenVoiceKeyRef = useRef<{ name: string; lang: string } | null>(null);
  // Bumped by every interrupting speak(). A line still waiting for the voice
  // list when this moves has been superseded and must not be spoken.
  const interruptSeqRef = useRef(0);
  // Teardown for any in-flight wait, so an unmount cannot speak.
  const pendingWaitsRef = useRef<Array<() => void>>([]);

  // Read-aloud uses the browser's built-in SpeechSynthesis only: it works
  // offline, needs no API key, and never opens a websocket — so step narration
  // can NEVER fail to start mid-emergency. (The realtime Gemini Live voice was
  // removed from the web app; it returns in the native iOS build, where audio
  // capture/playback is reliable. See docs/ios-plan.)
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return;

    const loadVoices = () => {
      const list = speechSynthesis.getVoices();
      setVoices(list);
      if (list.length === 0) return;

      const held = chosenVoiceKeyRef.current;
      // Hold the first valid choice for the life of the hook. `voiceschanged`
      // fires repeatedly on iOS (and re-orders the list each time); re-picking
      // on every one of those is exactly the drift being fixed. Only a voice
      // that has actually gone — iOS drops voices after a language change —
      // earns a fresh choice.
      const stillInstalled =
        held !== null && list.some((v) => v.name === held.name && v.lang === held.lang);
      if (!stillInstalled) {
        chosenVoiceKeyRef.current = toVoiceKey(pickVoice(list));
      }
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Any wait still in flight when the hook unmounts must not fire.
  useEffect(() => () => {
    pendingWaitsRef.current.forEach((abort) => abort());
    pendingWaitsRef.current = [];
  }, []);

  // The live voice object for the held choice, resolved against the list as it
  // stands RIGHT NOW.
  //
  // `voiceschanged` is the only signal the subscription above gets, and iOS does
  // not promise to fire it — `getVoices()` can simply start returning a list.
  // Deciding only in that handler therefore leaves devices where the choice is
  // null forever and every line of the emergency is read by the system default.
  // So this also picks lazily the first time it sees a non-empty list.
  const resolveVoice = useCallback((): SpeechSynthesisVoice | null => {
    const list = speechSynthesis.getVoices();
    // Nothing to resolve against, and NOT a reason to discard the held choice:
    // the list can be momentarily empty while iOS reloads it.
    if (list.length === 0) return null;

    const held = chosenVoiceKeyRef.current;
    if (held) {
      const live = list.find((v) => v.name === held.name && v.lang === held.lang);
      if (live) return live;
      // Held but no longer installed — the same "it has actually gone" case the
      // subscription handles, reached here when no event announced it.
    }

    const picked = pickVoice(list);
    chosenVoiceKeyRef.current = toVoiceKey(picked);
    return picked;
  }, []);

  const speak = useCallback((text: string, interrupt = true) => {
    if (!isVoiceEnabled || isMuted || !text) return;
    if (typeof speechSynthesis === 'undefined') return;

    if (interrupt) {
      speechSynthesis.cancel();
      interruptSeqRef.current += 1;
    }
    const seq = interruptSeqRef.current;

    const emit = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      // Always set, even when a voice object is: with no voice this is the
      // only steer iOS gets, and it keeps the fallback consistent.
      utterance.lang = 'en-GB';

      const voice = resolveVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    };

    // The first line of an emergency arrives before iOS has published its
    // voices, so it used to be read by the system default while every later
    // line used the chosen voice. Hold it — briefly — for the list.
    if (!chosenVoiceKeyRef.current && speechSynthesis.getVoices().length === 0) {
      let settled = false;

      const release = () => {
        if (settled) return false;
        settled = true;
        clearTimeout(timer);
        speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        pendingWaitsRef.current = pendingWaitsRef.current.filter((a) => a !== release);
        return true;
      };

      const finish = () => {
        if (!release()) return;
        // A newer interrupting speak() has already cancelled this one.
        if (interruptSeqRef.current !== seq) return;
        // Mute is checked when speak() is CALLED, and the hold puts up to a
        // second between that and the speaking. A mute or a voice-off that
        // lands inside that window is the team saying "stop talking" — and it
        // used to be ignored, so the line came out anyway. Read the current
        // value, from the store rather than the closure, so this does not have
        // to become a dependency of speak() (which would rebuild the callback
        // on every mute toggle, for nothing).
        const { isVoiceEnabled: enabled, isMuted: muted } = useAppStore.getState();
        if (!enabled || muted) return;
        emit();
      };

      const onVoicesChanged = () => finish();
      const timer = setTimeout(finish, VOICE_LIST_WAIT_MS);
      speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      pendingWaitsRef.current.push(release);
      return;
    }

    emit();
  }, [isVoiceEnabled, isMuted, rate, pitch, volume, resolveVoice]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    // cancel() only reaches what is already speaking. A line still WAITING for
    // the voice list has not been handed to the platform yet, so it would
    // survive the stop and speak up to a second later — over whatever the team
    // moved on to. Stop means stop.
    pendingWaitsRef.current.forEach((abort) => abort());
    pendingWaitsRef.current = [];
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

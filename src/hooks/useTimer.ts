import { useState, useEffect, useCallback, useRef } from 'react';
import { getAudioContext } from '../lib/audioUnlock';

interface UseTimerOptions {
  initialSeconds?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { initialSeconds = 0, onComplete, autoStart = false } = options;
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const secondsRef = useRef(seconds);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  // Only (re)create the interval when the running state flips — NOT every
  // tick. The functional setSeconds already sees the latest value, so seconds
  // must stay out of the deps or the interval is rebuilt once per second.
  useEffect(() => {
    if (!isRunning || secondsRef.current <= 0) return;

    intervalRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);
  const restart = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    restart,
    formatTime: () => formatTime(seconds),
    formattedTime: formatTime(seconds)
  };
}

// Stopwatch (counts up)
export function useStopwatch() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setSeconds(0);
    setIsRunning(false);
  }, []);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    formattedTime: formatTime(seconds)
  };
}

// CPR Metronome
interface UseMetronomeOptions {
  bpm?: number;
  onBeat?: (beatNumber: number) => void;
}

export function useMetronome(options: UseMetronomeOptions = {}) {
  const { bpm = 110, onBeat } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatCount, setBeatCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const onBeatRef = useRef(onBeat);

  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  const playClick = useCallback((isAccent = false) => {
    // Shared, gesture-unlocked context. Building one here (inside a timer
    // callback) left it suspended forever on iOS — the metronome was silent.
    const ctx = getAudioContext();
    if (!ctx) return;
    // Don't start nodes into a context that is not running. After the 999 call
    // the shared context comes back suspended — or, on WebKit, interrupted —
    // and getAudioContext() has just asked it to resume, but that is
    // asynchronous. A node started meanwhile is never heard and never
    // collected, so a 110bpm metronome would leak two per beat for as long as
    // the context stays down. Skip this beat; the next tick clicks.
    if (ctx.state !== 'running') return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = isAccent ? 1000 : 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  const start = useCallback(() => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    setBeatCount(0);
    
    const interval = (60 / bpm) * 1000;
    let count = 0;
    
    // Play first beat immediately
    playClick(true);
    if (onBeatRef.current) onBeatRef.current(1);
    count = 1;
    setBeatCount(1);
    
    intervalRef.current = window.setInterval(() => {
      count++;
      const isAccent = count % 30 === 1 || count % 30 === 0; // Accent every 30 for CPR
      playClick(isAccent);
      setBeatCount(count);
      if (onBeatRef.current) onBeatRef.current(count);
    }, interval);
  }, [isPlaying, bpm, playClick]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Deliberately NOT closing an AudioContext here. The metronome no longer
      // owns one — it borrows the shared, gesture-unlocked context from
      // lib/audioUnlock. Closing that on unmount would silence the whole app
      // for the rest of the session the first time CPR mode goes away.
    };
  }, []);

  return {
    isPlaying,
    beatCount,
    start,
    stop,
    toggle,
    compressionNumber: beatCount % 30 || 30, // Current compression in cycle
    cycleNumber: Math.ceil(beatCount / 30) // Current 30-compression cycle
  };
}

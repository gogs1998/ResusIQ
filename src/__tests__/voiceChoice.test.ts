import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { pickVoice } from '../lib/voiceChoice';
import { useSpeech } from '../hooks/useSpeech';
import { useAppStore } from '../store/appStore';

// On a real iPhone the narration changed voice between lines and between
// launches. Two causes, both pinned here:
//
//  1. `speechSynthesis.getVoices()` is EMPTY until iOS fires `voiceschanged`,
//     so the first line of a protocol was spoken with no voice object at all —
//     the system default — and every later line with the chosen one.
//  2. The choice itself was "the first en-GB voice in the list", and iOS
//     orders that list differently between launches, so the voice drifted.
//
// The fix is a pure, order-independent `pickVoice`, a voice held in a ref for
// the life of the hook, and a <=1s hold on the very first line so it waits for
// the list instead of being read by whoever answers first. A held line is
// never dropped — at worst it is spoken voiceless after 1s, which is what the
// old code did for EVERY first line.

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

/** A voice object shaped like the real one; only name/lang are ever read. */
const v = (name: string, lang: string): SpeechSynthesisVoice =>
  ({ name, lang, default: false, localService: true, voiceURI: name }) as SpeechSynthesisVoice;

// ───────────────────────── pickVoice (pure) ─────────────────────────

describe('pickVoice', () => {
  it('(a) picks Daniel out of an iOS-like list — and the same one however it is ordered', () => {
    const samantha = v('Samantha', 'en-US');
    const daniel = v('Daniel', 'en-GB');
    const kate = v('Kate', 'en-GB');

    expect(pickVoice([samantha, daniel, kate])?.name).toBe('Daniel');
    // iOS hands the list back in a different order between launches. The
    // answer must not move. (Revert pickVoice to "first en-GB in list order"
    // and these shuffles fail.)
    expect(pickVoice([kate, daniel, samantha])?.name).toBe('Daniel');
    expect(pickVoice([daniel, kate, samantha])?.name).toBe('Daniel');
    expect(pickVoice([kate, samantha, daniel])?.name).toBe('Daniel');
  });

  it('(b) prefers the Enhanced variant of the same name over the compact one', () => {
    const compact = v('Daniel', 'en-GB');
    const enhanced = v('Daniel (Enhanced)', 'en-GB');
    expect(pickVoice([compact, enhanced])?.name).toBe('Daniel (Enhanced)');
    expect(pickVoice([enhanced, compact])?.name).toBe('Daniel (Enhanced)');
    expect(pickVoice([v('Kate', 'en-GB'), v('Daniel (Premium)', 'en-GB'), compact])?.name)
      .toBe('Daniel (Premium)');
  });

  it('(c) takes the named en-GB voice and never the foreign one', () => {
    const serena = v('Serena', 'en-GB');
    expect(pickVoice([serena, v('Zosia', 'pl-PL')])?.name).toBe('Serena');
    expect(pickVoice([v('Zosia', 'pl-PL'), serena])?.name).toBe('Serena');
  });

  it('accepts en_GB (underscore) and odd casing as British', () => {
    expect(pickVoice([v('Kate', 'en_GB'), v('Samantha', 'en-US')])?.name).toBe('Kate');
    expect(pickVoice([v('Arthur', 'EN-gb'), v('Samantha', 'en-US')])?.name).toBe('Arthur');
  });

  it('(d) falls back to the alphabetically first en-US when there is no en-GB', () => {
    const list = [v('Samantha', 'en-US'), v('Fred', 'en-US'), v('Alex', 'en-US')];
    expect(pickVoice(list)?.name).toBe('Alex');
    expect(pickVoice([...list].reverse())?.name).toBe('Alex');
  });

  it('never picks en-US while any en-GB exists', () => {
    // No preferred name present at all — still British, still deterministic.
    const list = [v('Samantha', 'en-US'), v('Zephyr', 'en-GB'), v('Brenda', 'en-GB')];
    expect(pickVoice(list)?.name).toBe('Brenda');
    expect(pickVoice([...list].reverse())?.name).toBe('Brenda');
  });

  it('(e) returns null rather than a non-English voice', () => {
    expect(pickVoice([v('Zosia', 'pl-PL'), v('Anna', 'de-DE'), v('Amelie', 'fr-CA')])).toBeNull();
  });

  it('(f) returns null for an empty list', () => {
    expect(pickVoice([])).toBeNull();
  });

  it('(g) picks Google UK English Female off a Chrome desktop list', () => {
    const list = [
      v('Google US English', 'en-US'),
      v('Google UK English Male', 'en-GB'),
      v('Google UK English Female', 'en-GB'),
    ];
    expect(pickVoice(list)?.name).toBe('Google UK English Female');
    expect(pickVoice([...list].reverse())?.name).toBe('Google UK English Female');
  });
});

// ───────────────────────── useSpeech (the hold) ─────────────────────────

type SpokenUtterance = {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
};

let voiceList: SpeechSynthesisVoice[] = [];
let listeners: Array<() => void> = [];
let spoken: SpokenUtterance[] = [];

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voiceList,
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'voiceschanged') listeners.push(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === 'voiceschanged') listeners = listeners.filter((l) => l !== fn);
    },
    speak: (u: SpokenUtterance) => { spoken.push(u); },
    cancel: () => {},
    pause: () => {},
    resume: () => {},
  });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    rate = 1; pitch = 1; volume = 1;
    lang = '';
    voice: SpeechSynthesisVoice | null = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  });
});
afterAll(() => vi.unstubAllGlobals());

/** Replace the voice list the way iOS does, then fire `voiceschanged`. */
const publishVoices = (list: SpeechSynthesisVoice[]) => {
  voiceList = list;
  act(() => { [...listeners].forEach((fn) => fn()); });
};

let container: HTMLDivElement;
let root: Root | null = null;
let api: ReturnType<typeof useSpeech> | null = null;

function Harness() {
  api = useSpeech();
  return null;
}

const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(createElement(Harness)); });
};

const unmount = () => {
  if (!root) return;
  const mounted = root;
  root = null;
  act(() => mounted.unmount());
  container.remove();
  api = null;
};

const say = (text: string, interrupt?: boolean) =>
  act(() => { api!.speak(text, interrupt); });

describe('useSpeech holds the first line for the voice list', () => {
  beforeEach(() => {
    voiceList = [];
    listeners = [];
    spoken = [];
    useAppStore.setState({ isVoiceEnabled: true, isMuted: false });
  });

  afterEach(() => {
    unmount();
    vi.useRealTimers();
  });

  it('(h) speaks the first line in the chosen voice when the list arrives late', () => {
    vi.useFakeTimers();
    mount();
    // iOS at launch: nothing in the list yet.
    expect(speechSynthesis.getVoices()).toHaveLength(0);

    say('Check for danger');
    // Held — NOT read by the system default.
    expect(spoken).toHaveLength(0);

    act(() => { vi.advanceTimersByTime(200); });
    publishVoices([v('Samantha', 'en-US'), v('Daniel', 'en-GB'), v('Kate', 'en-GB')]);

    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe('Check for danger');
    expect(spoken[0].voice?.name).toBe('Daniel');
  });

  it('(i) never drops the line: speaks it voiceless after at most 1000 ms', () => {
    vi.useFakeTimers();
    mount();

    say('Call 999');
    act(() => { vi.advanceTimersByTime(999); });
    expect(spoken).toHaveLength(0);

    act(() => { vi.advanceTimersByTime(1); });
    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe('Call 999');
    expect(spoken[0].voice).toBeNull();
    // With no voice object, `lang` is the only steer iOS gets.
    expect(spoken[0].lang).toBe('en-GB');
  });

  it('(j) discards a held line when a newer interrupting speak arrives', () => {
    vi.useFakeTimers();
    mount();

    say('Step one');
    say('Step two');
    expect(spoken).toHaveLength(0);

    publishVoices([v('Daniel', 'en-GB')]);

    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe('Step two');
    expect(spoken[0].voice?.name).toBe('Daniel');
  });

  it('(k) holds the chosen voice across a reorder, and re-picks only when it is gone', () => {
    const samantha = v('Samantha', 'en-US');
    const daniel = v('Daniel', 'en-GB');
    const kate = v('Kate', 'en-GB');
    voiceList = [samantha, daniel, kate];
    mount();

    say('First');
    expect(spoken[0].voice?.name).toBe('Daniel');
    expect(spoken[0].lang).toBe('en-GB');

    // A reorder (iOS does this between `voiceschanged` events) must not move it.
    publishVoices([kate, samantha, daniel]);
    say('Second');
    expect(spoken[1].voice?.name).toBe('Daniel');

    // Daniel dropped after a language change — now, and only now, re-pick.
    publishVoices([kate, samantha]);
    say('Third');
    expect(spoken[2].voice?.name).toBe('Kate');
  });

  it('stays silent when muted', () => {
    useAppStore.setState({ isMuted: true });
    voiceList = [v('Daniel', 'en-GB')];
    mount();
    say('Nothing');
    expect(spoken).toHaveLength(0);
  });
});

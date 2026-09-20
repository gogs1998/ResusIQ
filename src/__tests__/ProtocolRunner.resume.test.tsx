import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { TrainingDialGuard } from '../components/TrainingDialGuard';
import { useAppStore } from '../store/appStore';
import { hhmm } from '../lib/emergencyTimers';

// Task 0.6 — what the team sees and can do the moment a reload puts them back
// in the runner. Both halves need a REAL rehydrate (not a setState that fakes
// the end state), because both are decided inside `merge`:
//
//   1. the 999 dial guard. Training mode used not to persist, so a reload
//      turned it off silently — and a resumed drill landed in the runner with
//      nothing between a tap on a 999 control and a real ambulance.
//   2. the resume banner. Without it the reload drops the team mid-protocol
//      with no signal that anything happened, while the elapsed clock jumps.
//
// This lives in its own file rather than in appStore.test.ts (a .ts, no JSX) or
// in a runner file (none of them seed storage): it is the one concern that
// needs both the persist middleware and a rendered component.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
  });
});

afterAll(() => vi.unstubAllGlobals());

const STORAGE_KEY = useAppStore.persist.getOptions().name!;
const VERSION = useAppStore.persist.getOptions().version!;

const EVENT_STARTED_AT = '2026-09-20T09:07:00.000Z';

const anEvent = () => ({
  id: 'evt-resumed',
  timestamp: EVENT_STARTED_AT,
  protocol_id: 'anaphylaxis',
  protocol_version: '2026.1',
  practice_id: 'p1',
  events: [
    {
      id: 'log-1',
      timestamp: EVENT_STARTED_AT,
      type: 'protocol_started',
      label: 'Started: Anaphylaxis',
    },
  ],
  completed: false,
});

const seedResumable = (extra: Record<string, unknown> = {}) =>
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: {
        practiceSetup: null,
        eventHistory: [],
        isVoiceEnabled: true,
        isEmergencyActive: true,
        activeProtocolId: 'anaphylaxis',
        currentStepIndex: 2,
        activeEvent: anEvent(),
        timerAnchors: {},
        ...extra,
      },
      version: VERSION,
    })
  );

let container: HTMLDivElement;
let root: Root | null = null;

const render = (node: React.ReactNode) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(node);
  });
};

const unmount = () => {
  if (!root) return;
  const mounted = root;
  root = null;
  act(() => mounted.unmount());
  container.remove();
};

beforeEach(() => {
  useAppStore.setState({
    isEmergencyActive: false,
    activeProtocol: null,
    currentStepIndex: 0,
    activeEvent: null,
    eventHistory: [],
    currentScreen: 'home',
    isTrainingMode: false,
    resumedAt: null,
    isMuted: true,
    timerAnchors: {},
  });
  document.getElementById('riq-theme-color-emergency')?.remove();
  // After the resets — setState itself writes through the persist middleware.
  localStorage.clear();
});

afterEach(() => {
  unmount();
  document.getElementById('riq-theme-color-emergency')?.remove();
});

describe('a drill that survives a reload keeps its 999 guard', () => {
  it('still intercepts a tel:999 tap after rehydrating into a resumed emergency', async () => {
    seedResumable({ isTrainingMode: true });

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });

    // The emergency really did come back — otherwise this would assert the
    // guard on a store that is simply idle.
    expect(useAppStore.getState().isEmergencyActive).toBe(true);

    render(<TrainingDialGuard />);

    const link = document.createElement('a');
    link.href = 'tel:999';
    document.body.appendChild(link);

    // The event object is inspected directly: the guard stops propagation, so a
    // listener on the link could not tell "not intercepted" from "never
    // reached".
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      link.dispatchEvent(ev);
    });

    expect(ev.defaultPrevented).toBe(true);
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    link.remove();
  });
});

describe('resume banner', () => {
  const bannerText = () => {
    const el = [...container.querySelectorAll('[role="status"]')].find((n) =>
      n.textContent?.includes('Resumed')
    );
    return el?.textContent ?? null;
  };

  it('tells the team they have come back, and when this started', async () => {
    seedResumable();

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<ProtocolRunner />);

    const text = bannerText();
    expect(text).not.toBeNull();
    expect(text).toContain('Resumed');
    expect(text).toContain('started');
    // The START of the emergency, not the moment of the reload — that is the
    // number the elapsed clock is counting from.
    expect(text).toContain(hhmm(EVENT_STARTED_AT));
  });

  it('goes as soon as the team moves on', async () => {
    seedResumable();

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<ProtocolRunner />);
    expect(bannerText()).not.toBeNull();

    act(() => useAppStore.getState().goToStep(3));
    expect(bannerText()).toBeNull();
  });

  it('never appears on a fresh emergency', () => {
    act(() => useAppStore.getState().startEmergency('anaphylaxis', 'tile'));
    render(<ProtocolRunner />);
    expect(bannerText()).toBeNull();
  });

  it('does not displace the step or its controls', async () => {
    seedResumable();

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<ProtocolRunner />);

    // The banner is one quiet line, not a gate: everything the runner offered
    // before it is still there and still reachable.
    expect(bannerText()).not.toBeNull();
    const withBanner = [...container.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent);

    act(() => useAppStore.setState({ resumedAt: null }));
    expect(bannerText()).toBeNull();
    const withoutBanner = [...container.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent);

    expect(withBanner).toEqual(withoutBanner);
  });
});

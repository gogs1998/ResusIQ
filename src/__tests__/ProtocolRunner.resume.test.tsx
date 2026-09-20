import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { TrainingDialGuard } from '../components/TrainingDialGuard';
import { EventReports } from '../components/EventReports';
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

// The same blob with the one thing that makes a resume impossible: a protocol
// id that is gone from the data. The record itself is perfectly good, so merge
// closes it into the archive rather than losing it.
const seedUnresumable = () => seedResumable({ activeProtocolId: 'no_such_protocol' });

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

// The other outcome of the same reload: the emergency could NOT be resumed, so
// merge closed it into history. What that archived record then says about
// itself is a medico-legal question, not a cosmetic one — "Completed" would
// claim the team finished, when in fact the app restarted and the guide could
// not be picked up.
describe('the record of a restart that could not resume', () => {
  it('reads as closed, not completed', async () => {
    seedUnresumable();

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    expect(useAppStore.getState().eventHistory).toHaveLength(1);

    render(<EventReports />);

    expect(container.textContent).toContain('Record closed');
    expect(container.textContent).not.toContain('Completed');
  });
});

// I1 + the addendum. Two audiences read this archive: the practice reviewing
// its own emergencies, and, one day, someone from outside. Neither may be left
// to guess whether a record is a real resuscitation or a Tuesday-afternoon
// drill — and neither should be shown the machine token we happen to store.
describe('what the archive says about a record', () => {
  // The real drill path, end to end: Training → run → end.
  const runDrill = () =>
    act(() => {
      useAppStore.getState().setTrainingMode(true);
      useAppStore.getState().startEmergency('anaphylaxis', 'tile');
      useAppStore.getState().endEmergency();
    });

  const runRealEmergency = () =>
    act(() => {
      useAppStore.getState().startEmergency('anaphylaxis', 'tile');
      useAppStore.getState().endEmergency();
    });

  // The archive row for the one and only record on screen. Identified as the
  // one button that is not the labelled Back control, so it does not depend on
  // the row's wording — which is the thing under test.
  const openTheRecord = () => {
    const row = [...container.querySelectorAll('button')].find(
      (b) => !b.getAttribute('aria-label')
    );
    expect(row, 'no archive row to open').toBeDefined();
    act(() => {
      row!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  // What Export actually writes. The report leaves the building — it is the
  // artefact a defence union or a coroner reads — so it is asserted on the
  // real Blob the export path builds, not on a re-derived string.
  const exportTheRecord = async () => {
    const blobs: Blob[] = [];
    const urlApi = URL as unknown as {
      createObjectURL?: (b: Blob) => string;
      revokeObjectURL?: (u: string) => void;
    };
    const originalCreate = urlApi.createObjectURL;
    const originalRevoke = urlApi.revokeObjectURL;
    urlApi.createObjectURL = (b: Blob) => {
      blobs.push(b);
      return 'blob:report';
    };
    urlApi.revokeObjectURL = () => {};
    try {
      const button = [...container.querySelectorAll('button')].find(
        (b) => (b.textContent ?? '').trim() === 'Export'
      );
      expect(button, 'no Export button on the record').toBeDefined();
      act(() => {
        button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    } finally {
      urlApi.createObjectURL = originalCreate;
      urlApi.revokeObjectURL = originalRevoke;
    }
    expect(blobs).toHaveLength(1);
    return blobs[0].text();
  };

  it('labels a drill as a drill, and never as a completion', () => {
    runDrill();
    render(<EventReports />);

    expect(container.textContent).toContain('Training drill');
    expect(container.textContent).not.toContain('Completed');
  });

  it('leaves a real emergency unlabelled — it reads as completed', () => {
    runRealEmergency();
    render(<EventReports />);

    expect(container.textContent).toContain('Completed');
    expect(container.textContent).not.toContain('Training drill');
  });

  it('exports a drill saying so, in words', async () => {
    runDrill();
    render(<EventReports />);
    openTheRecord();

    // The detail view first: it printed the raw token before this.
    expect(container.textContent).toContain('Training drill');
    expect(container.textContent).not.toContain('training_drill');

    const report = await exportTheRecord();
    expect(report).toContain('Training drill');
    expect(report).not.toContain('training_drill');
  });

  it('exports a closed record in words, not in the token we store', async () => {
    seedUnresumable();
    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<EventReports />);
    openTheRecord();

    expect(container.textContent).not.toContain('unresumable');

    const report = await exportTheRecord();
    // The whole point: 'Outcome: unresumable' in an exported incident report is
    // an internal enum handed to someone who has no way to read it.
    expect(report).not.toContain('unresumable');
    expect(report).toContain('Record closed');
  });

  // M1. A salvaged stub can reach the archive with no protocol_id of its own.
  // Reports titles every row off that field, so the worst record in the system
  // is the one most likely to render as a blank heading.
  it('gives a record with no protocol something readable to be called', async () => {
    act(() => {
      useAppStore.setState({
        eventHistory: [
          {
            id: 'evt-salvaged',
            timestamp: EVENT_STARTED_AT,
            protocol_id: 'unknown',
            protocol_version: '2026.1',
            practice_id: 'p1',
            events: [],
            completed: true,
          },
        ],
      });
    });
    render(<EventReports />);

    expect(container.textContent).toContain('Emergency — record incomplete');
  });
});

describe('resume banner', () => {
  const bannerText = () => {
    // Case-insensitive: the drill variant leads with "Training drill —", so the
    // word is lower-case there.
    const el = [...container.querySelectorAll('[role="status"]')].find((n) =>
      /resumed/i.test(n.textContent ?? '')
    );
    return el?.textContent ?? null;
  };

  // Every interactive control on the screen, identified by what it IS and where
  // it goes — not just the buttons.
  const controls = () =>
    [...container.querySelectorAll('button, a[href]')].map(
      (el) =>
        `${el.tagName}:${el.getAttribute('aria-label') ?? ''}:${el.getAttribute('href') ?? ''}:${el.textContent}`
    );

  it('tells the team they have come back, and when the record started', async () => {
    seedResumable();

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<ProtocolRunner />);

    const text = bannerText();
    expect(text).not.toBeNull();
    // "record started", not a bare "started". Clinical review 2026-09-20: on
    // these screens "started" already means something else and something
    // clinical — stroke onset, the seizure clock, the onset of chest pain —
    // and a time labelled only "started" is read as that.
    expect(text).toContain('Resumed — record started');
    expect(text).toContain(hhmm(EVENT_STARTED_AT));
  });

  it('says so when the resumed emergency is a drill', async () => {
    // A drill that survives a reload must not read as a real record. The dial
    // guard is back (tested above); the screen has to say why.
    seedResumable({ isTrainingMode: true });

    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<ProtocolRunner />);

    const text = bannerText();
    expect(text).toContain('Training drill — resumed, record started');
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
    //
    // Anchors as well as buttons. The single most important control on this
    // screen — the 999 pill — is an `<a href="tel:999">`, so a diff of
    // `<button>` alone would have watched the banner hide the dialler and
    // called it a pass.
    expect(bannerText()).not.toBeNull();
    const withBanner = controls();
    expect(withBanner.some((c) => c.includes('tel:999'))).toBe(true);

    act(() => useAppStore.setState({ resumedAt: null }));
    expect(bannerText()).toBeNull();

    expect(withBanner).toEqual(controls());
  });
});

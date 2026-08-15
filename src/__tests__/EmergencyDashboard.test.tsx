import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EmergencyDashboard } from '../components/EmergencyDashboard';
import { useAppStore } from '../store/appStore';
import { TILES } from '../lib/conditions';
import { TrainingDialGuard } from '../components/TrainingDialGuard';

// Clinical invariants on the 999 control (ratified 2026-08-13 alongside the
// home screen's demotion of it from solid red to tint + keyline):
//   1. never more than ONE tap, never unpinned, never scrolled out of reach
//   2. the demotion is licensed ONLY by a solid-red life-threat action
//      outranking it — here, the cardiac arrest hero
//   3. outranked only by a life-threat action, never by tools, triage or
//      navigation
//
// The first is structural and directly assertable: the control must live
// OUTSIDE the scrolling region, so no amount of content above it can push it
// off screen.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root | null = null;

const render = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<EmergencyDashboard />);
  });
};

const unmount = () => {
  if (!root) return;
  const mounted = root;
  root = null;
  act(() => mounted.unmount());
  container.remove();
};

afterEach(unmount);
afterAll(() => vi.unstubAllGlobals());

const dial999 = () =>
  [...container.querySelectorAll('a')].find((a) => a.getAttribute('href') === 'tel:999');

describe('home 999 control', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentScreen: 'home',
      isEmergencyActive: false,
      activeProtocol: null,
      activeEvent: null,
      isTrainingMode: false,
      practiceSetup: null,
    });
  });

  it('is present and reaches the dialler in one tap', () => {
    render();
    const link = dial999();
    expect(link).toBeDefined();
    expect(link!.getAttribute('href')).toBe('tel:999');
    // No intermediate screen, no confirm: the anchor IS the action.
    expect(link!.textContent).toContain('Call 999');
  });

  it('is pinned OUTSIDE the scrolling region', () => {
    // The conditions list scrolls on short screens. If 999 lived inside it, a
    // long enough list — or iOS text zoom — would push the ambulance off the
    // bottom of the screen.
    render();
    const link = dial999()!;
    const main = container.querySelector('main')!;
    expect(main.contains(link), '999 is inside the scrolling region').toBe(false);
  });

  it('is outranked by exactly one thing: the cardiac arrest action', () => {
    // Invariant 2/3. The only control allowed to be louder is a life-threat
    // action — never a tool, triage, or navigation.
    render();
    const solidRed = [...container.querySelectorAll('button')].filter((b) =>
      b.getAttribute('style')?.includes('background: var(--red)')
    );
    expect(solidRed).toHaveLength(1);
    expect(solidRed[0].getAttribute('aria-label')).toContain('Cardiac arrest');

    // Triage and the tools row carry no red at all.
    const triage = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Not sure?')
    )!;
    expect(triage.getAttribute('style')).not.toContain('var(--red)');
  });

  it('offers every protocol, with the ranked order the tiles declare', () => {
    render();
    const labels = [...container.querySelectorAll('button[aria-label]')]
      .map((b) => b.getAttribute('aria-label')!)
      .filter((l) => TILES.some((t) => l.startsWith(t.label)));
    expect(labels).toHaveLength(TILES.length);
    expect(labels[0]).toContain('Cardiac arrest');
    expect(labels[labels.length - 1]).toContain('Fainting');
  });
});

// Grok F12: training drills dialled a real ambulance through the same controls.
// The guard must cost the real path nothing, so it is asserted from both sides.
describe('training-mode dial guard', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentScreen: 'home',
      isEmergencyActive: false,
      activeProtocol: null,
      activeEvent: null,
      isTrainingMode: false,
      practiceSetup: null,
    });
  });

  const renderApp = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<TrainingDialGuard />);
    });
  };

  const guardDialog = () => document.querySelector('[role="alertdialog"]');

  it('registers nothing when training mode is off', () => {
    renderApp();
    const link = document.createElement('a');
    link.href = 'tel:999';
    document.body.appendChild(link);

    // The event object is inspected directly: the guard stops propagation, so a
    // listener on the link itself would never run and could not tell
    // "not intercepted" from "never reached".
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => { link.dispatchEvent(ev); });

    // The real-emergency path is untouched: nothing intercepted, nothing shown.
    expect(ev.defaultPrevented).toBe(false);
    expect(guardDialog()).toBeNull();
    link.remove();
  });

  it('intercepts the dial in training mode and asks first', () => {
    useAppStore.setState({ isTrainingMode: true });
    renderApp();
    const link = document.createElement('a');
    link.href = 'tel:999';
    document.body.appendChild(link);

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => { link.dispatchEvent(ev); });

    expect(ev.defaultPrevented).toBe(true);
    const dialog = guardDialog();
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('This dials a real ambulance');
    link.remove();
  });

  it('leaving training mode clears the question', () => {
    useAppStore.setState({ isTrainingMode: true });
    renderApp();
    const link = document.createElement('a');
    link.href = 'tel:999';
    document.body.appendChild(link);
    act(() => link.click());
    expect(guardDialog()).not.toBeNull();

    act(() => { useAppStore.setState({ isTrainingMode: false }); });
    expect(guardDialog()).toBeNull();

    // ...and does not come back when training mode does.
    act(() => { useAppStore.setState({ isTrainingMode: true }); });
    expect(guardDialog()).toBeNull();
    link.remove();
  });
});

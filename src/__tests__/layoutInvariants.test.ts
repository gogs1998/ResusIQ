import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProtocolRunner } from '../components/ProtocolRunner';
import { useAppStore } from '../store/appStore';

// A real-device audit on an iPhone 17 found content clipped top and bottom. The
// root cause — body safe-area padding double-counted against `height: 100dvh`
// shells — is fixed in index.css: `#root` is now the sized box and every shell
// fills it. These are the residual invariants, and they are the kind that no
// unit test would otherwise notice: they live in style strings and class names,
// and they only misbehave on hardware nobody runs CI on. So they are pinned by
// reading the source.

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const src = (p: string) => readFileSync(resolve(repo, p), 'utf8');

const COMPONENT_FILES = [
  'src/components/AIAssistant.tsx',
  'src/components/CPRMode.tsx',
  'src/components/EmergencyDashboard.tsx',
  'src/components/ProtocolLibrary.tsx',
  'src/components/ProtocolRunner.tsx',
  'src/components/TriageWizard.tsx',
  'src/components/console/Deck.tsx',
];

describe('layout invariants — viewport units', () => {
  it('no component shell sizes itself against the viewport', () => {
    // `#root` already is the viewport minus nothing; a shell that re-measures
    // the viewport double-counts the safe-area inset the body applies, which is
    // precisely the clipping the audit found. Shells fill their parent: 100%.
    const offenders: string[] = [];
    for (const file of COMPONENT_FILES) {
      src(file)
        .split('\n')
        .forEach((line, i) => {
          if (line.includes("100dvh") || line.includes('100vh')) {
            offenders.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders, `viewport-sized shells:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the Deck panel cap is dynamic-viewport aware', () => {
    // 40vh against the iOS static viewport is taller than the visible area once
    // the browser chrome is out, so the panel pushed the console off-screen.
    const deck = src('src/components/console/Deck.tsx');
    expect(deck).toContain('40dvh');
    expect(deck).not.toContain('40vh');
  });
});

describe('layout invariants — safe areas', () => {
  // Every screen whose bottom-most element can sit against the home indicator
  // has to pad for it. `safe-area-bottom` (index.css) is that padding.
  const cases: Array<[string, number]> = [
    ['src/components/TriageWizard.tsx', 2], // question footer + result screen
    ['src/components/AIAssistant.tsx', 1], // the scrolling content column
    ['src/components/ProtocolLibrary.tsx', 3], // two detail <main>s + list footer
  ];

  for (const [file, atLeast] of cases) {
    it(`${file} pads the home indicator in at least ${atLeast} place(s)`, () => {
      const count = src(file).split('safe-area-bottom').length - 1;
      expect(count, `${file} has ${count} safe-area-bottom, expected >= ${atLeast}`)
        .toBeGreaterThanOrEqual(atLeast);
    });
  }

  it('AIAssistant fills #root rather than the screen', () => {
    // It lives inside #root, which is already sized; min-h-screen made it grow
    // past the bottom of its own parent.
    const ai = src('src/components/AIAssistant.tsx');
    expect(ai).not.toContain('min-h-screen');
    expect(ai).toContain('h-full');
  });
});

describe('layout invariants — short viewports', () => {
  it('TriageWizard centres safely, never clipping the top of tall content', () => {
    // Tailwind's `justify-center` on an overflowing flex column pushes the first
    // child above the scroll origin, where it cannot be reached. `safe center`
    // degrades to flex-start instead.
    const triage = src('src/components/TriageWizard.tsx');
    const mainLines = triage
      .split('\n')
      .filter((l) => l.includes('<main'))
      .filter((l) => /\bjustify-center\b/.test(l));
    expect(mainLines, `<main> still uses justify-center:\n${mainLines.join('\n')}`)
      .toEqual([]);
    expect(triage.split("'safe center'").length - 1).toBeGreaterThanOrEqual(2);
  });

  it('the CPR pacing region yields rather than clipping in landscape', () => {
    // A 375x667 phone in landscape is ~375 tall; a hard 300px floor under the
    // ring left nothing for the header and deck, so the ring was cut off.
    expect(src('src/components/CPRMode.tsx')).toContain('min(300px, 100%)');
  });
});

describe('layout invariants — chrome colour', () => {
  it('the manifest, the meta tag and --bg are one colour', () => {
    // Three places declare the app background to the OS. Drift shows as a hard
    // seam behind the status bar on an installed PWA.
    const bg = /--bg:\s*(#[0-9A-Fa-f]{3,8});/.exec(src('src/design-system/tokens/colors.css'))?.[1];
    expect(bg, '--bg not found in colors.css').toBeTruthy();

    const vite = src('vite.config.ts');
    expect(new RegExp(`theme_color:\\s*'${bg}'`).test(vite), `vite theme_color != ${bg}`).toBe(true);
    expect(new RegExp(`background_color:\\s*'${bg}'`).test(vite), `vite background_color != ${bg}`).toBe(true);

    const meta = /<meta name="theme-color" content="(#[0-9A-Fa-f]{3,8})"/.exec(src('index.html'))?.[1];
    expect(meta).toBe(bg);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Behavioural: the scroll position is part of the layout contract too.

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

afterAll(() => {
  vi.unstubAllGlobals();
});

let container: HTMLDivElement;
let root: Root | null = null;

const render = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ProtocolRunner));
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

describe('ProtocolRunner scroll reset', () => {
  beforeEach(() => {
    useAppStore.setState({
      isEmergencyActive: false,
      activeProtocol: null,
      currentStepIndex: 0,
      activeEvent: null,
      eventHistory: [],
      currentScreen: 'home',
      isMuted: true,
    });
  });

  it('returns the step pane to the top when the step changes', () => {
    // A long step scrolled down, followed by a short one, opened mid-instruction
    // with the first line already off-screen — and nothing on screen said so.
    useAppStore.getState().startEmergency('cardiac_arrest');
    render();

    const main = container.querySelector('main');
    expect(main).toBeTruthy();

    const scrollTo = vi.fn();
    main!.scrollTo = scrollTo;
    main!.scrollTop = 200;

    const done = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Done — next step')
    );
    expect(done, 'no advancing control on the first step').toBeDefined();

    act(() => {
      done!.click();
    });

    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    unmount();
  });
});

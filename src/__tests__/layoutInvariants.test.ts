import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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

// Every component, discovered rather than listed: a hand-kept list silently
// stops covering the file someone adds next, which is how `30vh` on the CPR
// deck and `92vh` on the Sheet both survived a sweep that named its files.
const walk = (dir: string): string[] =>
  readdirSync(resolve(repo, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(`${dir}/${e.name}`)
      : e.name.endsWith('.tsx')
        ? [`${dir}/${e.name}`]
        : []
  );

const COMPONENT_FILES = walk('src/components');

// A line that is only a comment can say "100dvh" while describing the bug that
// is fixed; the sweeps below are about live declarations.
const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);

const sweep = (test: (line: string) => boolean) => {
  const hits: string[] = [];
  for (const file of COMPONENT_FILES) {
    src(file)
      .split('\n')
      .forEach((line, i) => {
        if (isComment(line)) return;
        if (test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }
  return hits;
};

describe('layout invariants — viewport units', () => {
  it('no component shell sizes itself against the viewport', () => {
    // `#root` already is the viewport minus nothing; a shell that re-measures
    // the viewport double-counts the safe-area inset the body applies, which is
    // precisely the clipping the audit found. Shells fill their parent: 100%.
    const hits = sweep((l) => l.includes('100dvh') || l.includes('100vh'));
    expect(hits, `viewport-sized shells:\n${hits.join('\n')}`).toEqual([]);
  });

  it('no component uses a STATIC vh unit anywhere', () => {
    // `vh` measures the viewport with the browser chrome retracted, so on iOS a
    // 30vh cap is taller than the 30% of the screen actually visible and the
    // panel pushes the console off the bottom. Every cap is `dvh`. This catches
    // any size, not just 100 — `30vh` on the CPR deck survived the first pass.
    const cssValue = /(height|Height|maxHeight|minHeight)\s*[:=]\s*['"{]?\s*(min|max|calc)?\(?\s*\d+vh\b/;
    const quotedProp = /["']\d+vh["']/;
    // Tailwind arbitrary values — `max-h-[92vh]` is the same bug wearing a
    // class name, and neither pattern above sees it.
    const tailwindArbitrary = /-\[\d+vh\]/;
    const hits = sweep((l) => cssValue.test(l) || quotedProp.test(l) || tailwindArbitrary.test(l));
    expect(hits, `static vh units:\n${hits.join('\n')}`).toEqual([]);
  });

  it('the Deck panel caps are dynamic-viewport aware', () => {
    const deck = src('src/components/console/Deck.tsx');
    expect(deck).toContain('40dvh');
    // ...and so is the shorter cap CPR passes in, which is the one that sits
    // above a compression counter that must not be pushed off-screen.
    expect(src('src/components/CPRMode.tsx')).toContain('30dvh');
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

describe('layout invariants — centring a scroller', () => {
  // Three ways to centre a flex column, two of them broken:
  //   justify-content: center      — overflowing content is pushed ABOVE the
  //                                  scroll origin, unreachable at any scroll.
  //   justify-content: safe center — correct, but iOS Safari 17.6+. Practices
  //                                  on an iPhone 8 or X are on iOS 16, where
  //                                  the whole declaration is dropped and the
  //                                  centring silently disappears.
  //   auto margins on the end children — works everywhere back to Flexbox 1,
  //                                  and collapses to 0 when content overflows.
  // `.stack-center` is the third. These assertions keep the first two out.

  it('the .stack-center utility exists and works on both ends', () => {
    const css = src('src/index.css');
    expect(css).toMatch(/\.stack-center\s*>\s*:first-child\s*\{[^}]*margin-top:\s*auto/);
    expect(css).toMatch(/\.stack-center\s*>\s*:last-child\s*\{[^}]*margin-bottom:\s*auto/);
  });

  const centred: Array<[string, number]> = [
    ['src/components/TriageWizard.tsx', 2], // result screen + question screen
    ['src/components/CPRMode.tsx', 1], // the pacing region
    ['src/components/AIAssistant.tsx', 1], // the content column
  ];

  for (const [file, atLeast] of centred) {
    it(`${file} centres with stack-center in at least ${atLeast} place(s)`, () => {
      const count = src(file).split('stack-center').length - 1;
      expect(count, `${file} has ${count} stack-center, expected >= ${atLeast}`)
        .toBeGreaterThanOrEqual(atLeast);
    });
  }

  it('no component relies on `safe center`', () => {
    const hits = sweep((l) => l.includes('safe center'));
    expect(hits, `'safe center' needs iOS 17.6:\n${hits.join('\n')}`).toEqual([]);
  });

  it('no scrolling container centres with Tailwind justify-center', () => {
    // The two that regressed: TriageWizard's <main>s, and AIAssistant's column
    // once it became a real scroller (h-full shell + min-h-0). A scroller is
    // identified by overflow-y-auto; on a <main> here that is always the case.
    const hits: string[] = [];
    for (const file of ['src/components/TriageWizard.tsx', 'src/components/AIAssistant.tsx']) {
      src(file)
        .split('\n')
        .forEach((line, i) => {
          if (isComment(line)) return;
          const isScroller = line.includes('<main') || line.includes('overflow-y-auto');
          if (isScroller && /\bjustify-center\b/.test(line)) {
            hits.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(hits, `scrollers centring with justify-center:\n${hits.join('\n')}`).toEqual([]);
  });
});

describe('layout invariants — short viewports', () => {
  it('the CPR pacing floor yields on a short viewport', () => {
    // A 375x667 phone in landscape is ~375 tall. `min(300px, 100%)` was a
    // no-op: the percentage resolves against a definite shell height, so it
    // always came out 300 and the footer and Deck were still clipped under
    // overflow:hidden. A media query is the only thing that actually lifts it.
    const cpr = src('src/components/CPRMode.tsx');
    expect(cpr).toContain('cpr-pacing');
    expect(cpr).not.toContain('minHeight: 300');
    expect(cpr).not.toContain('min(300px');

    const css = src('src/index.css');
    expect(css, 'no .cpr-pacing base floor').toMatch(/\.cpr-pacing\s*\{[^}]*min-height:\s*300px/);
    expect(
      css,
      'no max-height media query releasing the .cpr-pacing floor'
    ).toMatch(/@media\s*\(max-height:[^)]*\)\s*\{\s*\.cpr-pacing\s*\{[^}]*min-height:\s*0/);
  });
});

describe('layout invariants — chrome colour', () => {
  it('the manifest, the meta tag, osChrome and --bg are one colour', () => {
    // Four places declare the app background to the OS. Drift shows as a hard
    // seam behind the status bar on an installed PWA.
    const colors = src('src/design-system/tokens/colors.css');

    // Scope to the :root block — colors.css declares --bg again inside
    // `.theatre`, and a first-match regex over the whole file only agrees with
    // the manifest by luck.
    const rootStart = colors.indexOf(':root {');
    expect(rootStart, ':root block not found in colors.css').toBeGreaterThan(-1);
    const rootBlock = colors.slice(rootStart, colors.indexOf('\n}', rootStart));
    const bg = /--bg:\s*(#[0-9A-Fa-f]{3,8});/.exec(rootBlock)?.[1];
    expect(bg, '--bg not found in the :root block').toBeTruthy();

    const vite = src('vite.config.ts');
    expect(new RegExp(`theme_color:\\s*'${bg}'`).test(vite), `vite theme_color != ${bg}`).toBe(true);
    expect(new RegExp(`background_color:\\s*'${bg}'`).test(vite), `vite background_color != ${bg}`).toBe(true);

    const meta = /<meta name="theme-color" content="(#[0-9A-Fa-f]{3,8})"/.exec(src('index.html'))?.[1];
    expect(meta, 'index.html theme-color meta').toBe(bg);

    // osChrome swaps the meta tag to the emergency chrome at runtime; it is
    // pinned to .theatre's --bg, which is the palette the runner renders in.
    const theatreStart = colors.indexOf('.theatre {');
    expect(theatreStart, '.theatre block not found in colors.css').toBeGreaterThan(-1);
    const theatreBlock = colors.slice(theatreStart, colors.indexOf('\n}', theatreStart));
    const theatreBg = /--bg:\s*(#[0-9A-Fa-f]{3,8});/.exec(theatreBlock)?.[1];
    expect(theatreBg, '--bg not found in the .theatre block').toBeTruthy();

    const chrome = /EMERGENCY_CHROME\s*=\s*'(#[0-9A-Fa-f]{3,8})'/.exec(src('src/lib/osChrome.ts'))?.[1];
    expect(chrome, `EMERGENCY_CHROME != .theatre --bg (${theatreBg})`).toBe(theatreBg);
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
    // Asserting the real scrollTop, not a spy: jsdom round-trips the property,
    // so this fails if the reset is removed and passes only if it lands.
    useAppStore.getState().startEmergency('cardiac_arrest');
    render();

    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    main!.scrollTop = 200;
    expect(main!.scrollTop, 'jsdom did not record the scroll offset').toBe(200);

    const done = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Done — next step')
    );
    expect(done, 'no advancing control on the first step').toBeDefined();

    act(() => {
      done!.click();
    });

    expect(main!.scrollTop).toBe(0);
    unmount();
  });
});

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Deck } from '../components/console/Deck';
import { useAppStore } from '../store/appStore';
import { loggedDoseText, DOSE_NOT_RECORDED_LINE } from '../lib/drugLog';
import { getDrugById } from '../data/drugs';
import type { EmergencyEvent } from '../types';

// F8: the deck printed the drug's ADULT dose text against every logged
// administration. A child given 150 micrograms of adrenaline was listed as
// "500 micrograms IM" — and that panel is what gets read to the paramedic at
// handover. The row may now only state a dose that was actually recorded.

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

const render = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<Deck />);
  });
};

const unmount = () => {
  act(() => root.unmount());
  container.remove();
};

const buttonWithText = (text: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text));

/** An emergency whose log holds one adrenaline dose, with or without dose text. */
const eventWithDose = (details?: string): EmergencyEvent => ({
  id: 'evt',
  timestamp: '2026-08-13T10:00:00.000Z',
  protocol_id: 'anaphylaxis',
  protocol_version: '2026.1',
  practice_id: 'test',
  completed: false,
  events: [
    {
      id: 'e1',
      timestamp: '2026-08-13T10:02:00.000Z',
      type: 'drug_given',
      label: 'Drug: adrenaline_im_adult',
      details,
      drug_id: 'adrenaline_im_adult',
    },
  ],
});

describe('loggedDoseText', () => {
  it('uses the recorded dose when there is one', () => {
    expect(loggedDoseText('150 micrograms (0.15 ml) IM')).toBe('150 micrograms (0.15 ml) IM');
  });

  it('says the dose was not recorded when it was not', () => {
    expect(loggedDoseText(undefined)).toBe(DOSE_NOT_RECORDED_LINE);
    expect(loggedDoseText('')).toBe(DOSE_NOT_RECORDED_LINE);
    expect(loggedDoseText('   ')).toBe(DOSE_NOT_RECORDED_LINE);
  });
});

describe('Deck drugs given', () => {
  beforeEach(() => {
    useAppStore.setState({ activeEvent: null });
  });

  const openDrugsTab = () => {
    render();
    act(() => buttonWithText('Drugs')!.click());
  };

  it('names the drug and the time, and states the recorded dose', () => {
    useAppStore.setState({ activeEvent: eventWithDose('150 micrograms (0.15 ml) IM') });
    openDrugsTab();

    const panel = container.querySelector('#console-deck-panel')!;
    expect(panel.textContent).toContain('Adrenaline (Epinephrine) 1:1000');
    expect(panel.textContent).toContain('150 micrograms (0.15 ml) IM');
    expect(panel.textContent).toMatch(/\d{2}:\d{2}/);

    unmount();
  });

  it('never asserts the adult dose for an entry that recorded none', () => {
    useAppStore.setState({ activeEvent: eventWithDose(undefined) });
    openDrugsTab();

    const panel = container.querySelector('#console-deck-panel')!;
    const adultText = getDrugById('adrenaline_im_adult')!.adult_dose_text;
    expect(panel.textContent).not.toContain(adultText);
    expect(panel.textContent).not.toContain('500 micrograms');
    expect(panel.textContent).toContain(DOSE_NOT_RECORDED_LINE);
    // The administration itself is still on the record — only the invented dose
    // is gone.
    expect(panel.textContent).toContain('Adrenaline (Epinephrine) 1:1000');

    unmount();
  });

  it('says so plainly when nothing has been given', () => {
    useAppStore.setState({ activeEvent: { ...eventWithDose(), events: [] } });
    openDrugsTab();

    expect(container.querySelector('#console-deck-panel')!.textContent).toContain(
      'No drugs given yet'
    );

    unmount();
  });
});

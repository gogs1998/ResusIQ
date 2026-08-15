import { describe, it, expect } from 'vitest';
import {
  splitHero,
  isDuplicateSupport,
  switchTargetId,
  switchButtonLabel,
} from '../lib/stepCopy';

describe('splitHero', () => {
  it('splits HERO\\n\\nsupport into the two parts', () => {
    const { hero, support } = splitHero('Repeat the adrenaline\n\nSame dose, outer thigh.');
    expect(hero).toBe('Repeat the adrenaline');
    expect(support).toBe('Same dose, outer thigh.');
  });

  it('returns empty support when there is no blank-line detail', () => {
    const { hero, support } = splitHero('Start CPR now');
    expect(hero).toBe('Start CPR now');
    expect(support).toBe('');
  });

  it('keeps later paragraph breaks inside the support', () => {
    const { support } = splitHero('Hero\n\nOne.\n\nTwo.');
    expect(support).toBe('One.\n\nTwo.');
  });
});

describe('isDuplicateSupport', () => {
  it('is true for empty support', () => {
    expect(isDuplicateSupport('Start CPR now', '')).toBe(true);
  });

  it('is true when support equals the hero ignoring case and punctuation', () => {
    expect(isDuplicateSupport('Start CPR now', 'start cpr now.')).toBe(true);
  });

  it('is true when the hero is a leading echo of the support', () => {
    expect(isDuplicateSupport('Repeat adrenaline', 'Repeat adrenaline — every 5 minutes')).toBe(true);
  });

  it('is false when support adds new information up front', () => {
    expect(
      isDuplicateSupport('Start CPR now', 'Switching you to the cardiac arrest guide.'),
    ).toBe(false);
  });

  it('is false when a hero word only appears mid-sentence in the support', () => {
    expect(
      isDuplicateSupport('Repeat the adrenaline', 'Same dose, then repeat the adrenaline every 5 minutes.'),
    ).toBe(false);
  });
});

describe('switchTargetId', () => {
  it('extracts the target protocol id from a switch_protocol action', () => {
    expect(switchTargetId({ actions: ['switch_protocol:cardiac_arrest'] })).toBe('cardiac_arrest');
  });

  it('ignores non-switch actions', () => {
    expect(switchTargetId({ actions: ['log:999_called', 'suggest:call_999'] })).toBeNull();
  });

  it('is null when there are no actions', () => {
    expect(switchTargetId({})).toBeNull();
  });
});

describe('switchButtonLabel', () => {
  it('names CPR for the cardiac_arrest target', () => {
    expect(switchButtonLabel('cardiac_arrest')).toBe('Start CPR now');
  });
});

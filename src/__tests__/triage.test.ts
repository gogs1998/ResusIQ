import { describe, it, expect } from 'vitest';
import { shouldFastPathToArrest } from '../lib/triage';
import { triageQuestions } from '../data/protocols';

// F3: the cardiac-arrest fast-path used to be gated on the question just
// answered being 'conscious', which made it unreachable — on conscious = No
// breathing had not been asked yet, and on breathing = No the gate did not
// match. These pin the predicate that replaced it.

describe('shouldFastPathToArrest', () => {
  it('fires when conscious = No is answered before breathing = No', () => {
    expect(shouldFastPathToArrest({ conscious: false, breathing_normally: false })).toBe(true);
  });

  it('fires regardless of which of the two was answered second', () => {
    // Same answer set built in the opposite order — the predicate reads the set,
    // not the question just answered, so ordering cannot hide an arrest.
    const breathingFirst = { breathing_normally: false, conscious: false };
    expect(shouldFastPathToArrest(breathingFirst)).toBe(true);
  });

  it('does not fire on a partial answer set', () => {
    expect(shouldFastPathToArrest({})).toBe(false);
    expect(shouldFastPathToArrest({ conscious: false })).toBe(false);
    expect(shouldFastPathToArrest({ breathing_normally: false })).toBe(false);
  });

  it('does not fire when either answer is Yes', () => {
    expect(shouldFastPathToArrest({ conscious: true, breathing_normally: false })).toBe(false);
    expect(shouldFastPathToArrest({ conscious: false, breathing_normally: true })).toBe(false);
    expect(shouldFastPathToArrest({ conscious: true, breathing_normally: true })).toBe(false);
  });

  it('ignores string answers — only a recorded boolean No asserts arrest', () => {
    expect(shouldFastPathToArrest({ conscious: 'no', breathing_normally: 'no' })).toBe(false);
    expect(shouldFastPathToArrest({ conscious: 'false', breathing_normally: false })).toBe(false);
    expect(shouldFastPathToArrest({ conscious: '', breathing_normally: '' })).toBe(false);
  });

  it('is unaffected by the other triage answers', () => {
    const answers = {
      conscious: false,
      breathing_normally: false,
      chest_pain: true,
      seizure: true,
      choking: false,
    };
    expect(shouldFastPathToArrest(answers)).toBe(true);
  });

  it('reads the question ids that actually exist in the triage data', () => {
    // A rename in protocols.ts would otherwise silently disable the fast-path.
    const ids = new Set(triageQuestions.map((q) => q.id));
    expect(ids).toContain('conscious');
    expect(ids).toContain('breathing_normally');
  });
});

import { describe, it, expect } from 'vitest';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import { PROTOCOL_MAP } from '../components/AIAssistant';
import { TILES } from '../components/EmergencyDashboard';
import { DETERIORATION_LANDING } from '../store/appStore';
import { DOSE_LIMIT_NOTICES, doseLimitClass } from '../lib/doseLimits';

// Structural integrity of the protocol/drug data. A broken `next` pointer or a
// dangling drug_id would strand a user mid-emergency, so these are guarded.

describe('protocol step graph integrity', () => {
  for (const protocol of protocols) {
    const stepIds = new Set(protocol.steps.map((s) => s.id));

    it(`${protocol.id}: every step.next resolves to a real step`, () => {
      for (const step of protocol.steps) {
        if (step.next) {
          expect(stepIds, `${protocol.id}.${step.id} -> ${step.next}`).toContain(step.next);
        }
      }
    });

    it(`${protocol.id}: every decision answer.next resolves to a real step`, () => {
      for (const step of protocol.steps) {
        for (const answer of step.answers ?? []) {
          expect(stepIds, `${protocol.id}.${step.id} -> ${answer.next}`).toContain(answer.next);
        }
      }
    });

    it(`${protocol.id}: every drug_id resolves to a real drug`, () => {
      const drugIds = new Set(drugs.map((d) => d.id));
      for (const step of protocol.steps) {
        if (step.drug_id) {
          expect(drugIds, `${protocol.id}.${step.id} -> ${step.drug_id}`).toContain(step.drug_id);
        }
      }
    });

    it(`${protocol.id}: every on_timer_end_next resolves to a real step`, () => {
      for (const step of protocol.steps) {
        if (step.on_timer_end_next) {
          expect(stepIds, `${protocol.id}.${step.id} -> ${step.on_timer_end_next}`).toContain(
            step.on_timer_end_next
          );
        }
      }
    });

    it(`${protocol.id}: every timer_block's auto-advance target matches on_timer_end_next`, () => {
      // When a timer_block's countdown ends, the runner runs advance(), which
      // navigates via `next` when set, otherwise the next sequential step. Pin
      // that this EFFECTIVE target equals the declared on_timer_end_next so the
      // two can't silently drift — a `next` that disagrees, OR a reorder that
      // moves a next-less step's sequential neighbour, would strand the timer.
      protocol.steps.forEach((step, i) => {
        if (step.type !== 'timer_block') return;
        expect(step.on_timer_end_next, `${protocol.id}.${step.id}: timer_block has no on_timer_end_next`).toBeDefined();
        const effectiveTarget = step.next ?? protocol.steps[i + 1]?.id;
        expect(effectiveTarget, `${protocol.id}.${step.id} timer target`).toBe(step.on_timer_end_next);
      });
    });

    it(`${protocol.id}: every step is reachable from the first step (no orphans)`, () => {
      // An orphaned step is dead clinical content: it renders in no flow, so a
      // user can never reach it mid-emergency even though it looks implemented.
      const reachable = new Set<string>([protocol.steps[0].id]);
      const queue = [protocol.steps[0].id];
      const byId = new Map(protocol.steps.map((s) => [s.id, s]));
      while (queue.length) {
        const step = byId.get(queue.shift()!)!;
        const targets = [
          step.next,
          step.on_timer_end_next,
          ...(step.answers ?? []).map((a) => a.next),
        ];
        for (const t of targets) {
          if (t && !reachable.has(t)) {
            reachable.add(t);
            queue.push(t);
          }
        }
      }
      for (const step of protocol.steps) {
        expect(reachable, `${protocol.id}.${step.id} is orphaned`).toContain(step.id);
      }
    });

    it(`${protocol.id}: every switch_protocol action targets a real protocol`, () => {
      const protocolIds = new Set(protocols.map((p) => p.id));
      for (const step of protocol.steps) {
        for (const action of step.actions ?? []) {
          if (action.startsWith('switch_protocol:')) {
            const target = action.split(':')[1];
            expect(protocolIds, `${protocol.id}.${step.id} -> ${action}`).toContain(target);
          }
        }
      }
    });
  }
});

describe('home tile <-> protocol integrity', () => {
  // The home grid must offer exactly one tile per protocol and no more: a tile
  // whose id has no protocol is a dead button (tap strands the user); a protocol
  // with no tile is unreachable from the home screen. Guard both directions.
  it('TILES id set equals the protocols[] id set exactly', () => {
    const tileIds = new Set(TILES.map((t) => t.id));
    const protocolIds = new Set(protocols.map((p) => p.id));
    for (const id of tileIds) {
      expect(protocolIds, `home tile "${id}" has no matching protocol`).toContain(id);
    }
    for (const id of protocolIds) {
      expect(tileIds, `protocol "${id}" has no home tile`).toContain(id);
    }
  });
});

describe('deterioration landing integrity', () => {
  // DETERIORATION_LANDING short-circuits a mid-emergency protocol switch onto a
  // named step. A stale key or step id would silently fall back to the full
  // recognition sequence — reintroducing the exact delay the map removes — so
  // both ends are pinned here rather than discovered in a resus.
  it('every key is a real protocol and every value a real step in it', () => {
    for (const [protocolId, stepId] of Object.entries(DETERIORATION_LANDING)) {
      const protocol = protocols.find((p) => p.id === protocolId);
      expect(protocol, `DETERIORATION_LANDING key "${protocolId}" is not a protocol`).toBeDefined();
      const step = protocol!.steps.find((s) => s.id === stepId);
      expect(step, `${protocolId} has no step "${stepId}"`).toBeDefined();
    }
  });

  it('no landing step is recognition-flagged (landing must be an action)', () => {
    for (const [protocolId, stepId] of Object.entries(DETERIORATION_LANDING)) {
      const step = protocols.find((p) => p.id === protocolId)!.steps.find((s) => s.id === stepId)!;
      expect(step.recognition, `${protocolId}.${stepId} is a recognition step`).toBeFalsy();
    }
  });
});

describe('dose limit notice integrity', () => {
  // The runner shows these words at the moment a dose is refused or an
  // escalation is reached. A capped drug with no entry would render a generic
  // fallback in place of clinician-written instructions, so coverage is pinned
  // in both directions.
  const cappedDrugs = drugs.filter((d) => d.max_doses !== undefined);

  it('every drug with max_doses has notice wording', () => {
    expect(cappedDrugs.length).toBeGreaterThan(0);
    for (const drug of cappedDrugs) {
      expect(DOSE_LIMIT_NOTICES, `${drug.id} has max_doses but no notice`).toHaveProperty(drug.id);
      expect(DOSE_LIMIT_NOTICES[drug.id].hero.length).toBeGreaterThan(0);
      expect(DOSE_LIMIT_NOTICES[drug.id].detail.length).toBeGreaterThan(0);
    }
  });

  it('every notice belongs to a drug that actually declares a cap', () => {
    const cappedIds = new Set(cappedDrugs.map((d) => d.id));
    for (const id of Object.keys(DOSE_LIMIT_NOTICES)) {
      expect(cappedIds, `notice "${id}" has no capped drug`).toContain(id);
    }
  });

  it('hard-block notices carry the {time} placeholder; escalation notices do not', () => {
    // The time of the dose already on the record is the thing that decides what
    // the operator does next on a single-dose drug ("has 10 minutes passed?").
    // On an escalation it is the count that matters, not the clock.
    for (const drug of cappedDrugs) {
      const notice = DOSE_LIMIT_NOTICES[drug.id];
      if (doseLimitClass(drug) === 'hard_block') {
        expect(notice.hero, `${drug.id} hero`).toContain('{time}');
      } else {
        expect(notice.hero, `${drug.id} hero`).not.toContain('{time}');
      }
    }
  });
});

describe('AIAssistant PROTOCOL_MAP integrity', () => {
  it('every mapped value resolves to a real protocol id', () => {
    const protocolIds = new Set(protocols.map((p) => p.id));
    for (const localId of Object.values(PROTOCOL_MAP)) {
      expect(protocolIds, localId).toContain(localId);
    }
  });
});

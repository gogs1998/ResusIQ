import { describe, it, expect } from 'vitest';
import { protocols } from '../data/protocols';
import { drugs } from '../data/drugs';
import { PROTOCOL_MAP } from '../components/AIAssistant';

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

describe('AIAssistant PROTOCOL_MAP integrity', () => {
  it('every mapped value resolves to a real protocol id', () => {
    const protocolIds = new Set(protocols.map((p) => p.id));
    for (const localId of Object.values(PROTOCOL_MAP)) {
      expect(protocolIds, localId).toContain(localId);
    }
  });
});

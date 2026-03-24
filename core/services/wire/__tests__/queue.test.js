'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { createPriorityQueue } = require('../queue.cjs');
const { URGENCY_LEVELS, createEnvelope } = require('../protocol.cjs');
const { unwrap } = require('../../../../lib/index.cjs');

/**
 * Helper: create a valid envelope with specified urgency.
 */
function makeEnvelope(urgency, label) {
  return unwrap(createEnvelope({
    from: 'test-sender',
    to: 'test-receiver',
    type: 'directive',
    urgency,
    payload: { label: label || urgency },
  }));
}

describe('PriorityQueue', () => {
  let queue;

  beforeEach(() => {
    queue = createPriorityQueue();
  });

  describe('createPriorityQueue', () => {
    it('returns a queue object with enqueue, dequeue, getDepth, isEmpty, flush methods', () => {
      expect(typeof queue.enqueue).toBe('function');
      expect(typeof queue.dequeue).toBe('function');
      expect(typeof queue.getDepth).toBe('function');
      expect(typeof queue.isEmpty).toBe('function');
      expect(typeof queue.flush).toBe('function');
    });

    it('accepts custom depth configuration', () => {
      const q = createPriorityQueue({
        backgroundQueueDepth: 5,
        activeQueueDepth: 10,
        directiveQueueDepth: 10,
      });
      expect(typeof q.enqueue).toBe('function');
    });
  });

  describe('enqueue and dequeue', () => {
    it('enqueue adds an envelope and dequeue retrieves it', () => {
      const env = makeEnvelope('active', 'first');
      queue.enqueue(env);
      const result = queue.dequeue();
      expect(result).toBe(env);
    });

    it('dequeue returns null on empty queue', () => {
      expect(queue.dequeue()).toBeNull();
    });

    it('dequeues urgent messages before directive before active before background', () => {
      const bg = makeEnvelope('background', 'bg');
      const dir = makeEnvelope('directive', 'dir');
      const urg = makeEnvelope('urgent', 'urg');

      queue.enqueue(bg);
      queue.enqueue(dir);
      queue.enqueue(urg);

      expect(queue.dequeue().payload.label).toBe('urg');
      expect(queue.dequeue().payload.label).toBe('dir');
      expect(queue.dequeue().payload.label).toBe('bg');
    });

    it('preserves FIFO order within the same urgency level', () => {
      const a1 = makeEnvelope('active', 'first');
      const a2 = makeEnvelope('active', 'second');
      const a3 = makeEnvelope('active', 'third');

      queue.enqueue(a1);
      queue.enqueue(a2);
      queue.enqueue(a3);

      expect(queue.dequeue().payload.label).toBe('first');
      expect(queue.dequeue().payload.label).toBe('second');
      expect(queue.dequeue().payload.label).toBe('third');
    });

    it('interleaves correctly across urgency levels', () => {
      const bg1 = makeEnvelope('background', 'bg1');
      const act1 = makeEnvelope('active', 'act1');
      const urg1 = makeEnvelope('urgent', 'urg1');
      const dir1 = makeEnvelope('directive', 'dir1');
      const act2 = makeEnvelope('active', 'act2');

      queue.enqueue(bg1);
      queue.enqueue(act1);
      queue.enqueue(urg1);
      queue.enqueue(dir1);
      queue.enqueue(act2);

      expect(queue.dequeue().payload.label).toBe('urg1');
      expect(queue.dequeue().payload.label).toBe('dir1');
      expect(queue.dequeue().payload.label).toBe('act1');
      expect(queue.dequeue().payload.label).toBe('act2');
      expect(queue.dequeue().payload.label).toBe('bg1');
      expect(queue.dequeue()).toBeNull();
    });
  });

  describe('depth limits and backpressure', () => {
    it('background queue drops oldest when depth limit exceeded', () => {
      const q = createPriorityQueue({ backgroundQueueDepth: 5 });
      const envelopes = [];
      for (let i = 0; i < 6; i++) {
        const env = makeEnvelope('background', `bg-${i}`);
        envelopes.push(env);
        q.enqueue(env);
      }
      // Queue should have 5 items (dropped oldest = bg-0)
      const depth = q.getDepth();
      expect(depth[URGENCY_LEVELS.BACKGROUND]).toBe(5);
      // First dequeue should be bg-1, not bg-0
      expect(q.dequeue().payload.label).toBe('bg-1');
    });

    it('urgent queue has no depth limit', () => {
      const q = createPriorityQueue();
      // Enqueue 500 urgent messages -- should all be accepted
      for (let i = 0; i < 500; i++) {
        q.enqueue(makeEnvelope('urgent', `urg-${i}`));
      }
      expect(q.getDepth()[URGENCY_LEVELS.URGENT]).toBe(500);
    });

    it('directive queue depth is configurable with default 100', () => {
      const q = createPriorityQueue(); // default
      for (let i = 0; i < 105; i++) {
        q.enqueue(makeEnvelope('directive', `dir-${i}`));
      }
      expect(q.getDepth()[URGENCY_LEVELS.DIRECTIVE]).toBe(100);
      // First should be dir-5 (oldest 5 dropped)
      expect(q.dequeue().payload.label).toBe('dir-5');
    });

    it('active queue depth is configurable with default 200', () => {
      const q = createPriorityQueue(); // default
      for (let i = 0; i < 205; i++) {
        q.enqueue(makeEnvelope('active', `act-${i}`));
      }
      expect(q.getDepth()[URGENCY_LEVELS.ACTIVE]).toBe(200);
      // First should be act-5 (oldest 5 dropped)
      expect(q.dequeue().payload.label).toBe('act-5');
    });

    it('background queue depth is configurable with default 50', () => {
      const q = createPriorityQueue(); // default
      for (let i = 0; i < 55; i++) {
        q.enqueue(makeEnvelope('background', `bg-${i}`));
      }
      expect(q.getDepth()[URGENCY_LEVELS.BACKGROUND]).toBe(50);
      // First should be bg-5
      expect(q.dequeue().payload.label).toBe('bg-5');
    });

    it('respects custom directive queue depth', () => {
      const q = createPriorityQueue({ directiveQueueDepth: 3 });
      for (let i = 0; i < 5; i++) {
        q.enqueue(makeEnvelope('directive', `dir-${i}`));
      }
      expect(q.getDepth()[URGENCY_LEVELS.DIRECTIVE]).toBe(3);
      expect(q.dequeue().payload.label).toBe('dir-2');
    });

    it('respects custom active queue depth', () => {
      const q = createPriorityQueue({ activeQueueDepth: 2 });
      for (let i = 0; i < 4; i++) {
        q.enqueue(makeEnvelope('active', `act-${i}`));
      }
      expect(q.getDepth()[URGENCY_LEVELS.ACTIVE]).toBe(2);
      expect(q.dequeue().payload.label).toBe('act-2');
    });
  });

  describe('getDepth', () => {
    it('returns object with count per urgency level and total', () => {
      queue.enqueue(makeEnvelope('urgent', 'u'));
      queue.enqueue(makeEnvelope('directive', 'd'));
      queue.enqueue(makeEnvelope('active', 'a1'));
      queue.enqueue(makeEnvelope('active', 'a2'));
      queue.enqueue(makeEnvelope('background', 'b'));

      const depth = queue.getDepth();
      expect(depth[URGENCY_LEVELS.URGENT]).toBe(1);
      expect(depth[URGENCY_LEVELS.DIRECTIVE]).toBe(1);
      expect(depth[URGENCY_LEVELS.ACTIVE]).toBe(2);
      expect(depth[URGENCY_LEVELS.BACKGROUND]).toBe(1);
      expect(depth.total).toBe(5);
    });

    it('returns all zeros and total 0 for empty queue', () => {
      const depth = queue.getDepth();
      expect(depth[URGENCY_LEVELS.URGENT]).toBe(0);
      expect(depth[URGENCY_LEVELS.DIRECTIVE]).toBe(0);
      expect(depth[URGENCY_LEVELS.ACTIVE]).toBe(0);
      expect(depth[URGENCY_LEVELS.BACKGROUND]).toBe(0);
      expect(depth.total).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('returns true when all queues are empty', () => {
      expect(queue.isEmpty()).toBe(true);
    });

    it('returns false when any queue has items', () => {
      queue.enqueue(makeEnvelope('background', 'bg'));
      expect(queue.isEmpty()).toBe(false);
    });

    it('returns true after all items dequeued', () => {
      queue.enqueue(makeEnvelope('active', 'a'));
      queue.dequeue();
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('flush', () => {
    it('empties all queues and returns array in priority order', () => {
      const bg = makeEnvelope('background', 'bg');
      const act = makeEnvelope('active', 'act');
      const urg = makeEnvelope('urgent', 'urg');
      const dir = makeEnvelope('directive', 'dir');

      queue.enqueue(bg);
      queue.enqueue(act);
      queue.enqueue(urg);
      queue.enqueue(dir);

      const flushed = queue.flush();
      expect(flushed).toHaveLength(4);
      expect(flushed[0].payload.label).toBe('urg');
      expect(flushed[1].payload.label).toBe('dir');
      expect(flushed[2].payload.label).toBe('act');
      expect(flushed[3].payload.label).toBe('bg');
    });

    it('leaves all queues empty after flush', () => {
      queue.enqueue(makeEnvelope('urgent', 'u'));
      queue.enqueue(makeEnvelope('active', 'a'));
      queue.flush();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.getDepth().total).toBe(0);
    });

    it('returns empty array when queue is already empty', () => {
      expect(queue.flush()).toEqual([]);
    });
  });
});

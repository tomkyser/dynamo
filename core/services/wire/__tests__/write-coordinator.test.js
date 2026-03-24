'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const { createWriteCoordinator } = require('../write-coordinator.cjs');
const { MESSAGE_TYPES, URGENCY_LEVELS, createEnvelope } = require('../protocol.cjs');
const { ok, err } = require('../../../../lib/result.cjs');

/**
 * Creates a mock ledger with a write method that tracks calls.
 */
function createMockLedger() {
  const calls = [];
  return {
    calls,
    write(table, data) {
      calls.push({ table, data });
      return ok({ id: 'test-' + calls.length });
    },
  };
}

/**
 * Creates a mock ledger that fails on write.
 */
function createFailingLedger() {
  const calls = [];
  return {
    calls,
    write(table, data) {
      calls.push({ table, data });
      return err('WRITE_FAILED', 'Mock ledger write failure');
    },
  };
}

/**
 * Helper to create a write-intent envelope.
 */
function makeWriteIntent(opts = {}) {
  const result = createEnvelope({
    from: opts.from || 'sess-1',
    to: opts.to || 'ledger',
    type: MESSAGE_TYPES.WRITE_INTENT,
    urgency: opts.urgency || URGENCY_LEVELS.ACTIVE,
    payload: {
      table: opts.table || 'memories',
      data: opts.data || [{ key: 'test', value: 'data' }],
    },
  });
  return result.value;
}

describe('WriteCoordinator', () => {
  let coordinator;
  let mockLedger;

  beforeEach(() => {
    mockLedger = createMockLedger();
    coordinator = createWriteCoordinator({ ledger: mockLedger });
  });

  afterEach(() => {
    coordinator.stop();
  });

  describe('createWriteCoordinator', () => {
    it('returns a coordinator object', () => {
      expect(coordinator).toBeDefined();
      expect(typeof coordinator.queueWrite).toBe('function');
      expect(typeof coordinator.processNext).toBe('function');
      expect(typeof coordinator.start).toBe('function');
      expect(typeof coordinator.stop).toBe('function');
      expect(typeof coordinator.getQueueDepth).toBe('function');
      expect(typeof coordinator.flush).toBe('function');
      expect(typeof coordinator.on).toBe('function');
      expect(typeof coordinator.off).toBe('function');
    });
  });

  describe('queueWrite', () => {
    it('adds write-intent to queue and returns ok with position', () => {
      const envelope = makeWriteIntent();
      const result = coordinator.queueWrite(envelope);

      expect(result.ok).toBe(true);
      expect(typeof result.value).toBe('number');
      expect(result.value).toBe(1); // queue depth after enqueue
    });

    it('returns err for non-write-intent type', () => {
      const envelope = createEnvelope({
        from: 'sess-1',
        to: 'other',
        type: MESSAGE_TYPES.DIRECTIVE,
        urgency: URGENCY_LEVELS.ACTIVE,
        payload: {},
      }).value;

      const result = coordinator.queueWrite(envelope);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_WRITE_INTENT');
    });
  });

  describe('processNext', () => {
    it('takes next write from queue and executes via ledger.write()', () => {
      const envelope = makeWriteIntent({ table: 'memories', data: [{ x: 1 }] });
      coordinator.queueWrite(envelope);

      const result = coordinator.processNext();

      expect(result.ok).toBe(true);
      expect(mockLedger.calls.length).toBe(1);
      expect(mockLedger.calls[0].table).toBe('memories');
    });

    it('returns ok(null) on empty queue', () => {
      const result = coordinator.processNext();

      expect(result.ok).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('urgency ordering', () => {
    it('processes urgent write-intents before directive before active before background', () => {
      // Enqueue in reverse priority order
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.BACKGROUND, table: 'bg' }));
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.ACTIVE, table: 'active' }));
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.DIRECTIVE, table: 'dir' }));
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.URGENT, table: 'urgent' }));

      // Process all -- should come out in urgency order
      coordinator.processNext(); // urgent
      coordinator.processNext(); // directive
      coordinator.processNext(); // active
      coordinator.processNext(); // background

      expect(mockLedger.calls.length).toBe(4);
      expect(mockLedger.calls[0].table).toBe('urgent');
      expect(mockLedger.calls[1].table).toBe('dir');
      expect(mockLedger.calls[2].table).toBe('active');
      expect(mockLedger.calls[3].table).toBe('bg');
    });

    it('within same urgency, FIFO order preserved', () => {
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.ACTIVE, table: 'first' }));
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.ACTIVE, table: 'second' }));
      coordinator.queueWrite(makeWriteIntent({ urgency: URGENCY_LEVELS.ACTIVE, table: 'third' }));

      coordinator.processNext();
      coordinator.processNext();
      coordinator.processNext();

      expect(mockLedger.calls[0].table).toBe('first');
      expect(mockLedger.calls[1].table).toBe('second');
      expect(mockLedger.calls[2].table).toBe('third');
    });
  });

  describe('start and stop', () => {
    it('start begins processing loop', async () => {
      coordinator.queueWrite(makeWriteIntent({ table: 'memories' }));

      coordinator.start();

      // Wait for processing loop to drain
      await new Promise((r) => setTimeout(r, 50));

      expect(mockLedger.calls.length).toBe(1);

      coordinator.stop();
    });

    it('stop returns ok with count of remaining queued writes', () => {
      coordinator.queueWrite(makeWriteIntent({ table: 'a' }));
      coordinator.queueWrite(makeWriteIntent({ table: 'b' }));

      const result = coordinator.stop();

      expect(result.ok).toBe(true);
      expect(typeof result.value).toBe('number');
    });
  });

  describe('getQueueDepth', () => {
    it('returns current queue depth', () => {
      expect(coordinator.getQueueDepth()).toBe(0);

      coordinator.queueWrite(makeWriteIntent());
      expect(coordinator.getQueueDepth()).toBe(1);

      coordinator.queueWrite(makeWriteIntent());
      expect(coordinator.getQueueDepth()).toBe(2);
    });
  });

  describe('flush', () => {
    it('processes all queued writes immediately and returns ok with count', () => {
      coordinator.queueWrite(makeWriteIntent({ table: 'a' }));
      coordinator.queueWrite(makeWriteIntent({ table: 'b' }));
      coordinator.queueWrite(makeWriteIntent({ table: 'c' }));

      const result = coordinator.flush();

      expect(result.ok).toBe(true);
      expect(result.value).toBe(3);
      expect(coordinator.getQueueDepth()).toBe(0);
      expect(mockLedger.calls.length).toBe(3);
    });
  });

  describe('batching', () => {
    it('batches consecutive write-intents with same payload.table into single ledger.write()', () => {
      coordinator.queueWrite(makeWriteIntent({
        urgency: URGENCY_LEVELS.ACTIVE,
        table: 'memories',
        data: [{ key: 'a' }],
      }));
      coordinator.queueWrite(makeWriteIntent({
        urgency: URGENCY_LEVELS.ACTIVE,
        table: 'memories',
        data: [{ key: 'b' }],
      }));

      coordinator.flush();

      // Should be batched into a single write with combined data
      expect(mockLedger.calls.length).toBe(1);
      expect(mockLedger.calls[0].table).toBe('memories');
      expect(mockLedger.calls[0].data).toEqual([{ key: 'a' }, { key: 'b' }]);
    });

    it('does NOT batch write-intents with different payload.table values', () => {
      coordinator.queueWrite(makeWriteIntent({
        urgency: URGENCY_LEVELS.ACTIVE,
        table: 'memories',
        data: [{ key: 'a' }],
      }));
      coordinator.queueWrite(makeWriteIntent({
        urgency: URGENCY_LEVELS.ACTIVE,
        table: 'associations',
        data: [{ key: 'b' }],
      }));

      coordinator.flush();

      expect(mockLedger.calls.length).toBe(2);
      expect(mockLedger.calls[0].table).toBe('memories');
      expect(mockLedger.calls[1].table).toBe('associations');
    });
  });

  describe('events', () => {
    it('emits write:completed on successful ledger.write()', () => {
      const events = [];
      coordinator.on('write:completed', (data) => events.push(data));

      coordinator.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));
      coordinator.processNext();

      expect(events.length).toBe(1);
      expect(events[0].sessionId).toBe('sess-1');
      expect(events[0].table).toBe('memories');
    });

    it('emits write:failed on ledger.write() failure and continues', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger });

      const failEvents = [];
      coord.on('write:failed', (data) => failEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-2', table: 'memories' }));
      coord.processNext();

      expect(failEvents.length).toBe(1);
      expect(failEvents[0].sessionId).toBe('sess-2');
      expect(failEvents[0].table).toBe('memories');
      expect(failEvents[0].error).toBeDefined();

      coord.stop();
    });
  });

  describe('retry with exponential backoff', () => {
    it('re-enqueues failed write with incremented retryCount', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, maxRetries: 3, baseBackoff: 50 });

      const retryEvents = [];
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));
      coord.processNext();

      // After failure, item should be re-enqueued (queue depth should be 1)
      expect(coord.getQueueDepth()).toBe(1);
      expect(retryEvents.length).toBe(1);
      expect(retryEvents[0].retryCount).toBe(1);

      coord.stop();
    });

    it('uses exponential backoff delay: 50ms * 2^retryCount', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, maxRetries: 3, baseBackoff: 50 });

      const retryEvents = [];
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));

      // First failure -> retryCount 1, delay = 50 * 2^1 = 100ms
      coord.processNext();
      expect(retryEvents.length).toBe(1);
      expect(retryEvents[0].retryCount).toBe(1);

      coord.stop();
    });

    it('emits write:fatal after maxRetries exceeded and does NOT re-enqueue', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, maxRetries: 3, baseBackoff: 0 });

      const fatalEvents = [];
      const retryEvents = [];
      coord.on('write:fatal', (data) => fatalEvents.push(data));
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));

      // Process 3 retries (retryCount 1, 2, 3) + 1 initial = 4 processNext calls
      // With baseBackoff 0, items are immediately processable
      coord.processNext(); // fail -> retry 1
      coord.processNext(); // fail -> retry 2
      coord.processNext(); // fail -> retry 3
      coord.processNext(); // fail -> fatal (retryCount >= maxRetries)

      expect(retryEvents.length).toBe(3);
      expect(fatalEvents.length).toBe(1);
      expect(fatalEvents[0].sessionId).toBe('sess-1');
      expect(fatalEvents[0].table).toBe('memories');
      expect(fatalEvents[0].retryCount).toBe(3);
      expect(fatalEvents[0].error).toBeDefined();
      expect(coord.getQueueDepth()).toBe(0); // NOT re-enqueued

      coord.stop();
    });

    it('emits write:completed after successful retry', () => {
      let callCount = 0;
      const sometimesFailLedger = {
        calls: [],
        write(table, data) {
          callCount++;
          sometimesFailLedger.calls.push({ table, data });
          if (callCount <= 2) {
            return err('WRITE_FAILED', 'Temporary failure');
          }
          return ok({ id: 'success-' + callCount });
        },
      };
      const coord = createWriteCoordinator({ ledger: sometimesFailLedger, maxRetries: 3, baseBackoff: 0 });

      const completedEvents = [];
      const retryEvents = [];
      coord.on('write:completed', (data) => completedEvents.push(data));
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));

      coord.processNext(); // fail -> retry 1
      coord.processNext(); // fail -> retry 2
      coord.processNext(); // success!

      expect(retryEvents.length).toBe(2);
      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].sessionId).toBe('sess-1');

      coord.stop();
    });

    it('tracks retryCount per-envelope independently', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, maxRetries: 3, baseBackoff: 0 });

      const retryEvents = [];
      coord.on('write:retry', (data) => retryEvents.push(data));

      // Queue two separate writes to different tables
      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));
      coord.queueWrite(makeWriteIntent({ from: 'sess-2', table: 'associations' }));

      // Process first (memories) -> fails, retry 1
      coord.processNext();
      // Process second (associations) -> fails, retry 1
      coord.processNext();

      // Both should have retryCount 1 independently
      expect(retryEvents.length).toBe(2);
      expect(retryEvents[0].retryCount).toBe(1);
      expect(retryEvents[1].retryCount).toBe(1);

      coord.stop();
    });

    it('maxRetries defaults to 3 when not provided', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, baseBackoff: 0 });

      const fatalEvents = [];
      const retryEvents = [];
      coord.on('write:fatal', (data) => fatalEvents.push(data));
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));

      coord.processNext(); // retry 1
      coord.processNext(); // retry 2
      coord.processNext(); // retry 3
      coord.processNext(); // fatal

      expect(retryEvents.length).toBe(3);
      expect(fatalEvents.length).toBe(1);

      coord.stop();
    });

    it('baseBackoff defaults to 50 when not provided', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, maxRetries: 3 });

      const retryEvents = [];
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));
      coord.processNext(); // fail -> retry, should have delay based on 50ms base

      expect(retryEvents.length).toBe(1);
      // The nextRetryAt should be in the future (baseBackoff * 2^1 = 100ms from now)
      expect(retryEvents[0].nextRetryAt).toBeDefined();
      expect(typeof retryEvents[0].nextRetryAt).toBe('number');

      coord.stop();
    });

    it('maxRetries is configurable via options', () => {
      const failLedger = createFailingLedger();
      const coord = createWriteCoordinator({ ledger: failLedger, maxRetries: 1, baseBackoff: 0 });

      const fatalEvents = [];
      const retryEvents = [];
      coord.on('write:fatal', (data) => fatalEvents.push(data));
      coord.on('write:retry', (data) => retryEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));

      coord.processNext(); // retry 1
      coord.processNext(); // fatal (only 1 retry allowed)

      expect(retryEvents.length).toBe(1);
      expect(fatalEvents.length).toBe(1);

      coord.stop();
    });

    it('existing behavior unchanged -- successful writes still emit write:completed', () => {
      const coord = createWriteCoordinator({ ledger: mockLedger, maxRetries: 3, baseBackoff: 50 });

      const completedEvents = [];
      coord.on('write:completed', (data) => completedEvents.push(data));

      coord.queueWrite(makeWriteIntent({ from: 'sess-1', table: 'memories' }));
      coord.processNext();

      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].sessionId).toBe('sess-1');
      expect(completedEvents[0].table).toBe('memories');
      expect(coord.getQueueDepth()).toBe(0);

      coord.stop();
    });
  });
});

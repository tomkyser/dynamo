'use strict';

const EventEmitter = require('node:events');
const { ok, err } = require('../../../lib/result.cjs');
const { MESSAGE_TYPES } = require('./protocol.cjs');
const { createPriorityQueue } = require('./queue.cjs');

/**
 * Creates a write coordinator for Ledger write serialization.
 *
 * The write coordinator serializes Ledger writes through a priority queue.
 * Write-intent messages are validated, queued by urgency, and processed
 * sequentially. Compatible writes (same table) are batched into single
 * transactions for efficiency.
 *
 * Per D-11: Wire owns Ledger write coordination. All writes go through Wire.
 * Per D-12: Priority FIFO with batching. Last-writer-wins with version check.
 *
 * @param {Object} [options]
 * @param {Object} options.ledger - Injected Ledger provider with write(table, data) method
 * @param {Object} [options.queueConfig] - Configuration for the internal priority queue
 * @returns {Object} Write coordinator instance
 */
function createWriteCoordinator(options = {}) {
  const _ledger = options.ledger;
  const _queue = createPriorityQueue(options.queueConfig || {});
  const _emitter = new EventEmitter();
  let _processing = false;
  let _timer = null;

  /**
   * Validates and queues a write-intent envelope.
   *
   * @param {Object} envelope - Message envelope with type: write-intent
   * @returns {import('../../../lib/result.cjs').Result<number>} Ok with queue depth, or Err if invalid
   */
  function queueWrite(envelope) {
    if (!envelope || envelope.type !== MESSAGE_TYPES.WRITE_INTENT) {
      return err('INVALID_WRITE_INTENT', 'Envelope must have type write-intent', {
        receivedType: envelope ? envelope.type : undefined,
      });
    }

    _queue.enqueue(envelope);
    return ok(_queue.getDepth().total);
  }

  /**
   * Processes the next write from the queue. Performs greedy batching:
   * if the next item in the queue targets the same table, it is dequeued
   * and merged into a single write with combined data arrays.
   *
   * @returns {import('../../../lib/result.cjs').Result<Object|null>} Ok with write result, ok(null) if empty, or the ledger result
   */
  function processNext() {
    const item = _queue.dequeue();
    if (!item) {
      return ok(null);
    }

    // Greedy batching: merge consecutive items targeting the same table
    const table = item.payload.table;
    let batchedData = [...(item.payload.data || [])];
    const batchedFrom = item.from;

    while (!_queue.isEmpty()) {
      const next = _queue.peek();
      if (next && next.payload && next.payload.table === table) {
        const merged = _queue.dequeue();
        batchedData = batchedData.concat(merged.payload.data || []);
      } else {
        break;
      }
    }

    // Execute the write
    const result = _ledger.write(table, batchedData);

    if (result.ok) {
      _emitter.emit('write:completed', {
        sessionId: batchedFrom,
        table,
        result: result.value,
      });
    } else {
      _emitter.emit('write:failed', {
        sessionId: batchedFrom,
        table,
        error: result.error,
      });
    }

    return result;
  }

  /**
   * Starts the processing loop, draining the queue continuously.
   */
  function start() {
    _processing = true;

    function loop() {
      if (!_processing) return;

      if (!_queue.isEmpty()) {
        processNext();
      }

      if (_processing) {
        _timer = setTimeout(loop, 10);
      }
    }

    loop();
  }

  /**
   * Stops the processing loop.
   *
   * @returns {import('../../../lib/result.cjs').Result<number>} Ok with count of remaining queued writes
   */
  function stop() {
    _processing = false;
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
    return ok(_queue.getDepth().total);
  }

  /**
   * Returns the current queue depth.
   *
   * @returns {number}
   */
  function getQueueDepth() {
    return _queue.getDepth().total;
  }

  /**
   * Processes all queued writes immediately (synchronous drain).
   *
   * @returns {import('../../../lib/result.cjs').Result<number>} Ok with count of writes processed
   */
  function flush() {
    let count = 0;
    while (!_queue.isEmpty()) {
      processNext();
      count++;
    }
    return ok(count);
  }

  return {
    queueWrite,
    processNext,
    start,
    stop,
    getQueueDepth,
    flush,
    on: _emitter.on.bind(_emitter),
    off: _emitter.off.bind(_emitter),
  };
}

module.exports = { createWriteCoordinator };

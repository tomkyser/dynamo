'use strict';

const EventEmitter = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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
 * Retry logic: On write failure, items are re-enqueued with exponential
 * backoff (baseBackoff * 2^retryCount). After maxRetries failures,
 * write:fatal is emitted and the item is dropped.
 *
 * Write-ahead journal (WAJ): When wajPath is provided, every write is
 * journaled before execution (pending) and after completion (completed).
 * On init(), pending entries are replayed and the journal is compacted.
 *
 * Per D-11: Wire owns Ledger write coordination. All writes go through Wire.
 * Per D-12: Priority FIFO with batching. Last-writer-wins with version check.
 *
 * @param {Object} [options]
 * @param {Object} options.ledger - Injected Ledger provider with write(table, data) method
 * @param {Object} [options.queueConfig] - Configuration for the internal priority queue
 * @param {number} [options.maxRetries=3] - Maximum retry attempts before emitting write:fatal
 * @param {number} [options.baseBackoff=50] - Base backoff delay in ms (actual delay: baseBackoff * 2^retryCount)
 * @param {string} [options.wajPath] - Path to write-ahead journal file (JSONL). If not provided, WAJ is disabled.
 * @returns {Object} Write coordinator instance
 */
function createWriteCoordinator(options = {}) {
  const _ledger = options.ledger;
  const _queue = createPriorityQueue(options.queueConfig || {});
  const _emitter = new EventEmitter();
  const _maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
  const _baseBackoff = options.baseBackoff !== undefined ? options.baseBackoff : 50;
  const _wajPath = options.wajPath || null;
  let _processing = false;
  let _timer = null;

  // --- Write-Ahead Journal (WAJ) internals ---

  /**
   * Appends a WAJ entry to the journal file (JSON-lines format).
   * Creates the file lazily on first write.
   *
   * @param {Object} entry - WAJ entry { id, table?, data?, timestamp, status, retries? }
   */
  function _appendWaj(entry) {
    if (!_wajPath) return;

    const line = JSON.stringify(entry) + '\n';

    // Ensure parent directory exists
    const dir = path.dirname(_wajPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append atomically
    fs.appendFileSync(_wajPath, line);

    // Compaction check: if file exceeds 1000 lines, compact
    try {
      const content = fs.readFileSync(_wajPath, 'utf8');
      const lineCount = content.split('\n').filter(Boolean).length;
      if (lineCount > 1000) {
        _compactWaj();
      }
    } catch (_e) {
      // Ignore read errors during compaction check
    }
  }

  /**
   * Replays pending WAJ entries as new write-intent envelopes.
   * Called during init(). Finds entries with status 'pending' that have
   * no corresponding 'completed' entry with the same id.
   */
  function _replayWaj() {
    if (!_wajPath || !fs.existsSync(_wajPath)) return;

    const content = fs.readFileSync(_wajPath, 'utf8').trim();
    if (!content) return;

    const lines = content.split('\n');
    const entries = [];
    const completedIds = new Set();
    const failedIds = new Set();

    // Parse all entries
    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        entries.push(entry);
        if (entry.status === 'completed') {
          completedIds.add(entry.id);
        }
        if (entry.status === 'failed') {
          failedIds.add(entry.id);
        }
      } catch (_e) {
        // Skip malformed lines
      }
    }

    // Find pending entries without a completed/failed counterpart
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status === 'pending' && !completedIds.has(entry.id) && !failedIds.has(entry.id)) {
        // Replay as a write-intent envelope
        const { createEnvelope } = require('./protocol.cjs');
        const envelope = createEnvelope({
          from: 'waj-replay',
          to: 'ledger',
          type: MESSAGE_TYPES.WRITE_INTENT,
          payload: {
            table: entry.table,
            data: entry.data,
          },
        });
        if (envelope.ok) {
          _queue.enqueue(envelope.value);
        }
      }
    }
  }

  /**
   * Compacts the WAJ file by removing completed entries.
   * Keeps only pending entries that have no completed counterpart.
   * If all entries are resolved, truncates to empty.
   */
  function _compactWaj() {
    if (!_wajPath || !fs.existsSync(_wajPath)) return;

    const content = fs.readFileSync(_wajPath, 'utf8').trim();
    if (!content) return;

    const lines = content.split('\n');
    const entries = [];
    const completedIds = new Set();
    const failedIds = new Set();

    // Parse all entries
    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        entries.push(entry);
        if (entry.status === 'completed') {
          completedIds.add(entry.id);
        }
        if (entry.status === 'failed') {
          failedIds.add(entry.id);
        }
      } catch (_e) {
        // Skip malformed lines
      }
    }

    // Keep only unresolved pending entries
    const remaining = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status === 'pending' && !completedIds.has(entry.id) && !failedIds.has(entry.id)) {
        remaining.push(JSON.stringify(entry));
      }
    }

    // Write compacted file
    if (remaining.length > 0) {
      fs.writeFileSync(_wajPath, remaining.join('\n') + '\n');
    } else {
      fs.writeFileSync(_wajPath, '');
    }
  }

  // --- Core coordinator API ---

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
   * Retry logic: On write failure, items are re-enqueued with exponential
   * backoff (baseBackoff * 2^retryCount). After maxRetries failures,
   * write:fatal is emitted and the item is dropped.
   *
   * WAJ integration: Before write, appends pending entry. After success,
   * appends completed entry. After fatal failure, appends failed entry.
   *
   * @returns {import('../../../lib/result.cjs').Result<Object|null>} Ok with write result, ok(null) if empty, or the ledger result
   */
  function processNext() {
    const item = _queue.dequeue();
    if (!item) {
      return ok(null);
    }

    // Skip items awaiting retry delay -- re-enqueue and try the next item
    if (item._nextRetryAt && item._nextRetryAt > Date.now()) {
      _queue.enqueue(item);
      return ok(null);
    }

    // Greedy batching: merge consecutive items targeting the same table
    // Only batch items that are NOT awaiting retry delay
    const table = item.payload.table;
    let batchedData = [...(item.payload.data || [])];
    const batchedFrom = item.from;

    while (!_queue.isEmpty()) {
      const next = _queue.peek();
      if (next && next.payload && next.payload.table === table && !next._nextRetryAt) {
        const merged = _queue.dequeue();
        batchedData = batchedData.concat(merged.payload.data || []);
      } else {
        break;
      }
    }

    // WAJ: append pending entry before write execution
    const wajId = _wajPath ? crypto.randomUUID() : null;
    if (_wajPath) {
      _appendWaj({
        id: wajId,
        table,
        data: batchedData,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retries: item._retryCount || 0,
      });
    }

    // Execute the write
    const result = _ledger.write(table, batchedData);

    if (result.ok) {
      // WAJ: append completed entry
      if (_wajPath) {
        _appendWaj({
          id: wajId,
          status: 'completed',
          timestamp: new Date().toISOString(),
        });
      }

      _emitter.emit('write:completed', {
        sessionId: batchedFrom,
        table,
        result: result.value,
      });
    } else {
      // Emit write:failed for the immediate failure (preserves existing event listeners)
      _emitter.emit('write:failed', {
        sessionId: batchedFrom,
        table,
        error: result.error,
      });

      // Retry logic: _retryCount tracks how many retries have been attempted.
      // Starts at 0 (not yet retried). Retry if _retryCount < _maxRetries.
      const currentRetryCount = item._retryCount || 0;

      if (currentRetryCount < _maxRetries) {
        // Re-enqueue with incremented retry count and backoff delay
        const nextRetryCount = currentRetryCount + 1;
        item._retryCount = nextRetryCount;
        item._nextRetryAt = Date.now() + (_baseBackoff * Math.pow(2, nextRetryCount));
        // Restore original data for retry (use batchedData since we may have merged)
        item.payload.data = batchedData;
        _queue.enqueue(item);

        _emitter.emit('write:retry', {
          sessionId: batchedFrom,
          table,
          retryCount: nextRetryCount,
          nextRetryAt: item._nextRetryAt,
          error: result.error,
        });
      } else {
        // Max retries exceeded -- emit fatal, do NOT re-enqueue
        // WAJ: append failed entry
        if (_wajPath) {
          _appendWaj({
            id: wajId,
            status: 'failed',
            timestamp: new Date().toISOString(),
          });
        }

        _emitter.emit('write:fatal', {
          sessionId: batchedFrom,
          table,
          retryCount: currentRetryCount,
          error: result.error,
        });
      }
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

  /**
   * Initializes the write coordinator. If WAJ is enabled, replays
   * pending entries and compacts the journal.
   *
   * @returns {Promise<void>}
   */
  async function init() {
    if (_wajPath) {
      _replayWaj();
      _compactWaj();
    }
  }

  return {
    queueWrite,
    processNext,
    start,
    stop,
    getQueueDepth,
    flush,
    init,
    on: _emitter.on.bind(_emitter),
    off: _emitter.off.bind(_emitter),
  };
}

module.exports = { createWriteCoordinator };

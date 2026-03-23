'use strict';

const { URGENCY_LEVELS, URGENCY_PRIORITY } = require('./protocol.cjs');

/**
 * Creates an urgency-based priority queue with configurable depth limits.
 * Per D-09: Separate queues per urgency level. Urgent bypasses all queues
 * (no depth limit). Background has bounded depth -- oldest dropped when full.
 * Per D-12: Priority FIFO. Within same priority, FIFO order.
 *
 * @param {Object} [config={}]
 * @param {number} [config.backgroundQueueDepth=50] - Max background queue depth
 * @param {number} [config.activeQueueDepth=200] - Max active queue depth
 * @param {number} [config.directiveQueueDepth=100] - Max directive queue depth
 * @returns {Object} Priority queue instance
 */
function createPriorityQueue(config = {}) {
  /** @type {Record<string, Array>} */
  const _queues = {
    [URGENCY_LEVELS.URGENT]: [],
    [URGENCY_LEVELS.DIRECTIVE]: [],
    [URGENCY_LEVELS.ACTIVE]: [],
    [URGENCY_LEVELS.BACKGROUND]: [],
  };

  /** @type {Record<string, number>} */
  const _limits = {
    [URGENCY_LEVELS.URGENT]: Infinity,
    [URGENCY_LEVELS.DIRECTIVE]: config.directiveQueueDepth || 100,
    [URGENCY_LEVELS.ACTIVE]: config.activeQueueDepth || 200,
    [URGENCY_LEVELS.BACKGROUND]: config.backgroundQueueDepth || 50,
  };

  /** @type {string[]} Dequeue order: highest priority first */
  const _dequeueOrder = [
    URGENCY_LEVELS.URGENT,
    URGENCY_LEVELS.DIRECTIVE,
    URGENCY_LEVELS.ACTIVE,
    URGENCY_LEVELS.BACKGROUND,
  ];

  /**
   * Enqueues an envelope into the appropriate urgency queue.
   * If queue is at depth limit, drops the oldest message (shift).
   *
   * @param {Object} envelope - Wire message envelope
   */
  function enqueue(envelope) {
    const urgency = envelope.urgency || URGENCY_LEVELS.ACTIVE;
    const queue = _queues[urgency];
    const limit = _limits[urgency];

    if (queue.length >= limit) {
      queue.shift(); // Drop oldest
    }

    queue.push(envelope);
  }

  /**
   * Dequeues the highest-priority envelope.
   * Iterates urgency levels in priority order; returns first available.
   *
   * @returns {Object|null} The next envelope, or null if all queues empty
   */
  function dequeue() {
    for (let i = 0; i < _dequeueOrder.length; i++) {
      const queue = _queues[_dequeueOrder[i]];
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }

  /**
   * Returns the current depth of each urgency queue plus total.
   *
   * @returns {Object} Depth counts keyed by urgency level, plus 'total'
   */
  function getDepth() {
    let total = 0;
    const depth = {};
    for (let i = 0; i < _dequeueOrder.length; i++) {
      const urgency = _dequeueOrder[i];
      const count = _queues[urgency].length;
      depth[urgency] = count;
      total += count;
    }
    depth.total = total;
    return depth;
  }

  /**
   * Returns true if all urgency queues are empty.
   *
   * @returns {boolean}
   */
  function isEmpty() {
    return _dequeueOrder.every(function (u) {
      return _queues[u].length === 0;
    });
  }

  /**
   * Flushes all queues, returning all envelopes in priority order.
   * Queues are emptied.
   *
   * @returns {Array} All envelopes in priority order
   */
  function flush() {
    const result = [];
    for (let i = 0; i < _dequeueOrder.length; i++) {
      const queue = _queues[_dequeueOrder[i]];
      if (queue.length > 0) {
        result.push.apply(result, queue.splice(0));
      }
    }
    return result;
  }

  /**
   * Peeks at the highest-priority envelope without removing it.
   *
   * @returns {Object|null} The next envelope, or null if all queues empty
   */
  function peek() {
    for (let i = 0; i < _dequeueOrder.length; i++) {
      const queue = _queues[_dequeueOrder[i]];
      if (queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }

  return { enqueue, dequeue, peek, getDepth, isEmpty, flush };
}

module.exports = { createPriorityQueue };

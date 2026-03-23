'use strict';

/**
 * Stub queue.cjs — provides priority queue for Plan 02.
 * Will be replaced by Plan 01's real implementation when worktrees merge.
 */

const { URGENCY_PRIORITY } = require('./protocol.cjs');

/**
 * Creates a priority queue that orders items by urgency level.
 * Within the same urgency, FIFO order is preserved.
 *
 * @param {Object} [config]
 * @returns {{ enqueue: Function, dequeue: Function, peek: Function, getDepth: Function, isEmpty: Function, flush: Function }}
 */
function createPriorityQueue(config = {}) {
  // Use separate arrays per urgency level for natural FIFO within each level
  const _queues = {
    0: [], // urgent
    1: [], // directive
    2: [], // active
    3: [], // background
  };

  function enqueue(item) {
    const priority = typeof item.urgency === 'string'
      ? (URGENCY_PRIORITY[item.urgency] !== undefined ? URGENCY_PRIORITY[item.urgency] : 3)
      : 3;
    _queues[priority].push(item);
  }

  function dequeue() {
    for (let p = 0; p <= 3; p++) {
      if (_queues[p].length > 0) {
        return _queues[p].shift();
      }
    }
    return null;
  }

  function peek() {
    for (let p = 0; p <= 3; p++) {
      if (_queues[p].length > 0) {
        return _queues[p][0];
      }
    }
    return null;
  }

  function getDepth() {
    return _queues[0].length + _queues[1].length + _queues[2].length + _queues[3].length;
  }

  function isEmpty() {
    return getDepth() === 0;
  }

  function flush() {
    const all = [];
    for (let p = 0; p <= 3; p++) {
      all.push(..._queues[p].splice(0));
    }
    return all;
  }

  return { enqueue, dequeue, peek, getDepth, isEmpty, flush };
}

module.exports = { createPriorityQueue };

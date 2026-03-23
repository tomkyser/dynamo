'use strict';

/**
 * Stub protocol.cjs — provides message types and urgency enums for Plan 02.
 * Will be replaced by Plan 01's real implementation when worktrees merge.
 */

const MESSAGE_TYPES = Object.freeze({
  CONTEXT_INJECTION: 'context-injection',
  DIRECTIVE: 'directive',
  RECALL_PRODUCT: 'recall-product',
  SUBLIMATION: 'sublimation',
  WRITE_INTENT: 'write-intent',
  SNAPSHOT: 'snapshot',
});

const URGENCY_LEVELS = Object.freeze({
  BACKGROUND: 'background',
  ACTIVE: 'active',
  DIRECTIVE: 'directive',
  URGENT: 'urgent',
});

const URGENCY_PRIORITY = Object.freeze({
  [URGENCY_LEVELS.URGENT]: 0,
  [URGENCY_LEVELS.DIRECTIVE]: 1,
  [URGENCY_LEVELS.ACTIVE]: 2,
  [URGENCY_LEVELS.BACKGROUND]: 3,
});

/**
 * Creates a message envelope.
 * @param {Object} fields
 * @returns {Object} envelope
 */
function createEnvelope(fields) {
  const crypto = require('node:crypto');
  return {
    id: crypto.randomUUID(),
    from: fields.from || null,
    to: fields.to || null,
    type: fields.type || MESSAGE_TYPES.DIRECTIVE,
    urgency: fields.urgency || URGENCY_LEVELS.ACTIVE,
    payload: fields.payload || {},
    timestamp: fields.timestamp || Date.now(),
    correlationId: fields.correlationId || null,
  };
}

/**
 * Validates an envelope structure.
 * @param {Object} envelope
 * @returns {import('../../../lib/result.cjs').Result<Object>}
 */
function validateEnvelope(envelope) {
  const { ok, err } = require('../../../lib/result.cjs');
  if (!envelope || typeof envelope !== 'object') {
    return err('INVALID_ENVELOPE', 'Envelope must be an object');
  }
  if (!envelope.type || !Object.values(MESSAGE_TYPES).includes(envelope.type)) {
    return err('INVALID_ENVELOPE', 'Envelope must have a valid type');
  }
  return ok(envelope);
}

module.exports = { MESSAGE_TYPES, URGENCY_LEVELS, URGENCY_PRIORITY, createEnvelope, validateEnvelope };

'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const crypto = require('node:crypto');

/**
 * Wire message types — the envelope type field.
 * Per D-04: Typed message envelope with type enum.
 */
const MESSAGE_TYPES = Object.freeze({
  CONTEXT_INJECTION: 'context-injection',
  DIRECTIVE: 'directive',
  RECALL_PRODUCT: 'recall-product',
  SUBLIMATION: 'sublimation',
  WRITE_INTENT: 'write-intent',
  SNAPSHOT: 'snapshot',
  HEARTBEAT: 'heartbeat',
  ACK: 'ack',
});

/**
 * Wire urgency levels — the envelope urgency field.
 * Per D-04: Urgency enum (background, active, directive, urgent) per Reverie spec.
 */
const URGENCY_LEVELS = Object.freeze({
  BACKGROUND: 'background',
  ACTIVE: 'active',
  DIRECTIVE: 'directive',
  URGENT: 'urgent',
});

/**
 * Numeric priority ordering — lower number = higher priority.
 * Per D-09: Urgent bypasses all queues. Background has bounded depth.
 */
const URGENCY_PRIORITY = Object.freeze({
  [URGENCY_LEVELS.URGENT]: 0,
  [URGENCY_LEVELS.DIRECTIVE]: 1,
  [URGENCY_LEVELS.ACTIVE]: 2,
  [URGENCY_LEVELS.BACKGROUND]: 3,
});

/** @type {Set<string>} */
const _VALID_TYPES = new Set(Object.values(MESSAGE_TYPES));

/** @type {Set<string>} */
const _VALID_URGENCIES = new Set(Object.values(URGENCY_LEVELS));

/**
 * Creates a message envelope with auto-generated id and timestamp.
 * Per D-04: Typed message envelope { from, to, type, urgency, payload, timestamp, correlationId }.
 * Per D-05: Wire inspects envelope for routing — payload remains opaque.
 *
 * @param {Object} opts
 * @param {string} opts.from - Sender session identifier
 * @param {string} opts.to - Recipient session identifier
 * @param {string} opts.type - Message type (must be a MESSAGE_TYPES value)
 * @param {string} [opts.urgency] - Urgency level (defaults to ACTIVE)
 * @param {*} opts.payload - Opaque message payload
 * @param {string|null} [opts.correlationId] - Optional correlation ID for request/reply
 * @returns {import('../../../lib/result.cjs').Result<Object>}
 */
function createEnvelope({ from, to, type, urgency, payload, correlationId } = {}) {
  if (!from) {
    return err('INVALID_ENVELOPE', 'Missing required field: from');
  }
  if (!to) {
    return err('INVALID_ENVELOPE', 'Missing required field: to');
  }
  if (!type) {
    return err('INVALID_ENVELOPE', 'Missing required field: type');
  }
  if (!_VALID_TYPES.has(type)) {
    return err('INVALID_ENVELOPE', `Invalid message type: ${type}`, { validTypes: [..._VALID_TYPES] });
  }

  const resolvedUrgency = urgency || URGENCY_LEVELS.ACTIVE;
  if (!_VALID_URGENCIES.has(resolvedUrgency)) {
    return err('INVALID_ENVELOPE', `Invalid urgency level: ${urgency}`, { validUrgencies: [..._VALID_URGENCIES] });
  }

  return ok({
    id: crypto.randomUUID(),
    from,
    to,
    type,
    urgency: resolvedUrgency,
    payload,
    timestamp: new Date().toISOString(),
    correlationId: correlationId || null,
  });
}

/**
 * Validates a pre-built envelope object.
 * Used at transport boundaries to verify incoming envelopes.
 *
 * @param {Object} envelope - The envelope to validate
 * @returns {import('../../../lib/result.cjs').Result<Object>}
 */
function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return err('INVALID_ENVELOPE', 'Envelope must be a non-null object');
  }
  if (!envelope.id) {
    return err('INVALID_ENVELOPE', 'Missing required field: id');
  }
  if (!envelope.from) {
    return err('INVALID_ENVELOPE', 'Missing required field: from');
  }
  if (!envelope.to) {
    return err('INVALID_ENVELOPE', 'Missing required field: to');
  }
  if (!envelope.type || !_VALID_TYPES.has(envelope.type)) {
    return err('INVALID_ENVELOPE', `Invalid or missing message type: ${envelope.type}`, { validTypes: [..._VALID_TYPES] });
  }
  if (!envelope.urgency || !_VALID_URGENCIES.has(envelope.urgency)) {
    return err('INVALID_ENVELOPE', `Invalid or missing urgency level: ${envelope.urgency}`, { validUrgencies: [..._VALID_URGENCIES] });
  }
  if (!envelope.timestamp) {
    return err('INVALID_ENVELOPE', 'Missing required field: timestamp');
  }

  return ok(envelope);
}

module.exports = { MESSAGE_TYPES, URGENCY_LEVELS, URGENCY_PRIORITY, createEnvelope, validateEnvelope };

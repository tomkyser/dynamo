'use strict';

/**
 * Linotype Type Definitions
 *
 * Frozen type constructors for the Linotype template system.
 * Matrix = parsed template, Slug = resolved template, Forme = composed output.
 *
 * @module lib/linotype/types
 */

/**
 * Creates a frozen Matrix (parsed template) object.
 *
 * A Matrix represents a parsed template file: frontmatter metadata,
 * slot definitions, and the unresolved template body.
 *
 * @param {Object} opts
 * @param {string} opts.name - Template name (required)
 * @param {string} opts.version - Template version (required)
 * @param {Object} opts.slots - Slot definitions object (required)
 * @param {string} [opts.description=''] - Template description
 * @param {string[]} [opts.tags=[]] - Classification tags
 * @param {number} [opts.token_estimate=0] - Estimated token count
 * @param {string[]} [opts.includes=[]] - Partial template names referenced
 * @param {string} [opts.body=''] - Unresolved template body
 * @param {Object} [opts.raw_frontmatter={}] - Original parsed frontmatter JSON
 * @returns {Readonly<Object>} Frozen Matrix object
 * @throws {TypeError} If required fields are missing
 */
function createMatrix(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('createMatrix requires an options object');
  }
  if (typeof opts.name !== 'string' || opts.name.length === 0) {
    throw new TypeError('createMatrix: "name" is required and must be a non-empty string');
  }
  if (typeof opts.version !== 'string' || opts.version.length === 0) {
    throw new TypeError('createMatrix: "version" is required and must be a non-empty string');
  }
  if (!opts.slots || typeof opts.slots !== 'object' || Array.isArray(opts.slots)) {
    throw new TypeError('createMatrix: "slots" is required and must be an object');
  }

  return Object.freeze({
    name: opts.name,
    version: opts.version,
    description: typeof opts.description === 'string' ? opts.description : '',
    tags: Array.isArray(opts.tags) ? Object.freeze([...opts.tags]) : Object.freeze([]),
    token_estimate: typeof opts.token_estimate === 'number' ? opts.token_estimate : 0,
    slots: Object.freeze({ ...opts.slots }),
    includes: Array.isArray(opts.includes) ? Object.freeze([...opts.includes]) : Object.freeze([]),
    body: typeof opts.body === 'string' ? opts.body : '',
    raw_frontmatter: opts.raw_frontmatter && typeof opts.raw_frontmatter === 'object'
      ? Object.freeze({ ...opts.raw_frontmatter })
      : Object.freeze({})
  });
}

/**
 * Creates a frozen Slug (resolved template) object.
 *
 * A Slug is a single resolved template with all slots filled.
 * Token estimate is computed as Math.ceil(content.length / 4) per D-17.
 *
 * @param {Object} opts
 * @param {string} opts.name - Template name (required)
 * @param {string} opts.content - Resolved content (required)
 * @param {string[]} [opts.resolved_slots=[]] - Names of slots that were resolved
 * @returns {Readonly<Object>} Frozen Slug object
 * @throws {TypeError} If required fields are missing
 */
function createSlug(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('createSlug requires an options object');
  }
  if (typeof opts.name !== 'string' || opts.name.length === 0) {
    throw new TypeError('createSlug: "name" is required and must be a non-empty string');
  }
  if (typeof opts.content !== 'string') {
    throw new TypeError('createSlug: "content" is required and must be a string');
  }

  const content = opts.content;
  const token_estimate = Math.ceil(content.length / 4);

  return Object.freeze({
    name: opts.name,
    content,
    resolved_slots: Array.isArray(opts.resolved_slots)
      ? Object.freeze([...opts.resolved_slots])
      : Object.freeze([]),
    token_estimate
  });
}

/**
 * Creates a frozen Forme (composed output) object.
 *
 * A Forme is the final composed output: multiple slugs arranged together.
 * This is what gets delivered to Exciter for injection.
 *
 * @param {Object} opts
 * @param {string} opts.content - Final composed content (required)
 * @param {number} opts.total_tokens - Total token count (required)
 * @param {Array<{name: string, tokens: number}>} [opts.sections=[]] - Section breakdown
 * @param {number|null} [opts.budget=null] - Token budget limit
 * @param {number|null} [opts.budget_remaining=null] - Remaining budget after composition
 * @returns {Readonly<Object>} Frozen Forme object
 * @throws {TypeError} If required fields are missing
 */
function createForme(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('createForme requires an options object');
  }
  if (typeof opts.content !== 'string') {
    throw new TypeError('createForme: "content" is required and must be a string');
  }
  if (typeof opts.total_tokens !== 'number') {
    throw new TypeError('createForme: "total_tokens" is required and must be a number');
  }

  return Object.freeze({
    content: opts.content,
    total_tokens: opts.total_tokens,
    sections: Array.isArray(opts.sections)
      ? Object.freeze(opts.sections.map(s => Object.freeze({ ...s })))
      : Object.freeze([]),
    budget: typeof opts.budget === 'number' ? opts.budget : null,
    budget_remaining: typeof opts.budget_remaining === 'number' ? opts.budget_remaining : null
  });
}

module.exports = { createMatrix, createSlug, createForme };

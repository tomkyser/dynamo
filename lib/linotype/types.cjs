'use strict';

/**
 * Linotype type constructors.
 * All return Object.freeze'd instances per project convention.
 */

/**
 * Creates a frozen Matrix object from parsed template frontmatter + body.
 * @param {Object} opts
 * @returns {Object} Frozen Matrix
 */
function createMatrix(opts) {
  if (!opts || typeof opts.name !== 'string' || !opts.name) {
    throw new TypeError('createMatrix: "name" is required and must be a non-empty string');
  }
  if (typeof opts.version !== 'string' || !opts.version) {
    throw new TypeError('createMatrix: "version" is required and must be a non-empty string');
  }
  if (!opts.slots || typeof opts.slots !== 'object' || Array.isArray(opts.slots)) {
    throw new TypeError('createMatrix: "slots" is required and must be an object');
  }

  return Object.freeze({
    name: opts.name,
    version: opts.version,
    description: opts.description || '',
    tags: Array.isArray(opts.tags) ? Object.freeze([...opts.tags]) : Object.freeze([]),
    token_estimate: typeof opts.token_estimate === 'number' ? opts.token_estimate : 0,
    slots: Object.freeze(Object.assign({}, opts.slots)),
    includes: Array.isArray(opts.includes) ? Object.freeze([...opts.includes]) : Object.freeze([]),
    body: typeof opts.body === 'string' ? opts.body : '',
    raw_frontmatter: opts.raw_frontmatter ? Object.freeze(Object.assign({}, opts.raw_frontmatter)) : Object.freeze({})
  });
}

/**
 * Creates a frozen Slug object from resolved template output.
 * Token estimate computed as Math.ceil(content.length / 4) per D-17.
 * @param {Object} opts
 * @returns {Object} Frozen Slug
 */
function createSlug(opts) {
  if (!opts || typeof opts.name !== 'string' || !opts.name) {
    throw new TypeError('createSlug: "name" is required and must be a non-empty string');
  }
  if (typeof opts.content !== 'string') {
    throw new TypeError('createSlug: "content" is required and must be a string');
  }

  const content = opts.content;
  return Object.freeze({
    name: opts.name,
    content: content,
    resolved_slots: Array.isArray(opts.resolved_slots) ? Object.freeze([...opts.resolved_slots]) : Object.freeze([]),
    token_estimate: typeof opts.token_estimate === 'number' ? opts.token_estimate : Math.ceil(content.length / 4)
  });
}

/**
 * Creates a frozen Forme object from composed Slugs.
 * @param {Object} opts
 * @returns {Object} Frozen Forme
 */
function createForme(opts) {
  if (!opts || typeof opts.content !== 'string') {
    throw new TypeError('createForme: "content" is required and must be a string');
  }

  return Object.freeze({
    content: opts.content,
    total_tokens: typeof opts.total_tokens === 'number' ? opts.total_tokens : 0,
    sections: Array.isArray(opts.sections) ? Object.freeze(opts.sections.map(s => Object.freeze(Object.assign({}, s)))) : Object.freeze([]),
    budget: typeof opts.budget === 'number' ? opts.budget : null,
    budget_remaining: typeof opts.budget_remaining === 'number' ? opts.budget_remaining : null
  });
}

module.exports = { createMatrix, createSlug, createForme };

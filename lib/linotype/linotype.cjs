'use strict';

/**
 * Linotype public API barrel.
 *
 * Prompt template library for Dynamo. Parses markdown templates with JSON
 * frontmatter, resolves template syntax against context, composes multiple
 * resolved templates into a single Forme with token budgeting.
 *
 * Public API: parse, parseString, cast, compose, validate, inspect.
 */

const { parse: _parse, parseString: _parseString } = require('./parser.cjs');
const { resolve } = require('./engine.cjs');
const { createSlug } = require('./types.cjs');
const { compose: _compose, inspect: _inspect } = require('./composer.cjs');
const { validate: _validate } = require('./validator.cjs');

/**
 * Parse a template file into a Matrix.
 * @param {string} filePath - Absolute path to template file.
 * @returns {Promise<Object>} Matrix object.
 */
async function parse(filePath) {
  return _parse(filePath);
}

/**
 * Parse a template string into a Matrix.
 * @param {string} content - Template content with JSON frontmatter.
 * @param {string} [sourceName] - Source identifier for error messages.
 * @returns {Object} Matrix object.
 */
function parseString(content, sourceName) {
  return _parseString(content, sourceName);
}

/**
 * Cast a Matrix against a context to produce a Slug.
 *
 * Resolves the Matrix body through the template engine with the given
 * context values, producing a frozen Slug with resolved content and
 * token estimate.
 *
 * @param {Object} matrix - Matrix object (from parse/parseString).
 * @param {Object} context - Slot values object.
 * @param {Object} [options] - Cast options.
 * @param {Map} [options.partials] - Map of partial name -> body for includes.
 * @returns {Object} Frozen Slug object.
 */
function cast(matrix, context, options) {
  options = options || {};
  context = context || {};

  // Resolve the template body against context
  const resolvedBody = resolve(matrix.body, context, {
    slots: matrix.slots,
    partials: options.partials || new Map(),
    strict: true
  });

  // Compute resolved_slots: slot names from matrix.slots that have values in context
  const resolvedSlots = [];
  if (matrix.slots && typeof matrix.slots === 'object') {
    for (const slotName of Object.keys(matrix.slots)) {
      if (context[slotName] !== undefined) {
        resolvedSlots.push(slotName);
      }
    }
  }

  // Token estimate per D-17: Math.ceil(chars/4)
  const tokenEstimate = Math.ceil(resolvedBody.length / 4);

  return createSlug({
    name: matrix.name,
    content: resolvedBody,
    resolved_slots: resolvedSlots,
    token_estimate: tokenEstimate
  });
}

/**
 * Compose multiple Slugs into a Forme with optional token budgeting.
 * @param {Array<Object>} slugs - Array of Slug objects.
 * @param {Object} [options] - { separator, token_budget }.
 * @returns {Object} Frozen Forme object.
 */
function compose(slugs, options) {
  return _compose(slugs, options);
}

/**
 * Validate a Matrix for structural issues.
 * @param {Object} matrix - Matrix object.
 * @param {Object} [options] - { registry }.
 * @returns {Array<{field: string, issue: string}>} Array of issue objects.
 */
function validate(matrix, options) {
  return _validate(matrix, options);
}

/**
 * Inspect a Forme's bill of materials (BOM).
 * Returns unfrozen debug output per D-15.
 * @param {Object} forme - Forme object.
 * @returns {Object} Plain debug object.
 */
function inspect(forme) {
  return _inspect(forme);
}

module.exports = { parse, parseString, cast, compose, validate, inspect };

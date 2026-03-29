'use strict';

/**
 * Linotype Template Engine
 *
 * Resolves template syntax against a context object.
 * Supports: variables, conditionals, iteration, includes (partials),
 * comments, and raw blocks.
 *
 * Template syntax is Mustache-inspired but intentionally constrained
 * for readability in raw markdown.
 *
 * @module lib/linotype/engine
 */

/**
 * Checks if a value is truthy in Linotype template semantics.
 * Truthy = non-empty string, non-null, non-false, non-undefined, non-empty array.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isTruthy(value) {
  if (value === null || value === undefined || value === false || value === '') {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return true;
}

/**
 * Resolves a dot-notation path against a context object.
 *
 * @param {string} path - Dot-separated path (e.g., "user.name")
 * @param {Object} context - Context object to resolve against
 * @returns {*} The resolved value, or undefined if path not found
 */
function resolvePath(path, context) {
  const parts = path.split('.');
  let current = context;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Strips comments from template text.
 * Comments: {{! ... }} (can be multiline: {{! to }})
 *
 * @param {string} text
 * @returns {string}
 */
function stripComments(text) {
  return text.replace(/\{\{![\s\S]*?\}\}/g, '');
}

/**
 * Extracts and protects raw blocks, returning placeholder tokens.
 * Raw blocks: {{{raw}}}...{{{/raw}}} preserve inner content as-is.
 *
 * @param {string} text
 * @returns {{ text: string, rawBlocks: string[] }}
 */
function extractRawBlocks(text) {
  const rawBlocks = [];
  const result = text.replace(/\{\{\{raw\}\}\}([\s\S]*?)\{\{\{\/raw\}\}\}/g, (match, content) => {
    const index = rawBlocks.length;
    rawBlocks.push(content);
    return `\x00RAW_BLOCK_${index}\x00`;
  });
  return { text: result, rawBlocks };
}

/**
 * Restores raw block placeholders with their original content.
 *
 * @param {string} text
 * @param {string[]} rawBlocks
 * @returns {string}
 */
function restoreRawBlocks(text, rawBlocks) {
  return text.replace(/\x00RAW_BLOCK_(\d+)\x00/g, (match, index) => {
    return rawBlocks[parseInt(index, 10)];
  });
}

/**
 * Processes conditional blocks: {{#if slot}}...{{/if}} and {{#if slot}}...{{else}}...{{/if}}.
 * Handles nested conditionals by processing innermost first.
 *
 * @param {string} text
 * @param {Object} context
 * @returns {string}
 */
function processConditionals(text, context) {
  // Process innermost conditionals first (no nesting inside the match)
  // Regex matches {{#if name}}...{{/if}} with optional {{else}},
  // where the content does NOT contain another {{#if (innermost matching).
  const IF_REGEX = /\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if\s)[\s\S])*?)\{\{\/if\}\}/g;

  let result = text;
  let prevResult;

  // Iterate until no more conditionals remain (handles nesting by layers)
  do {
    prevResult = result;
    result = result.replace(IF_REGEX, (match, slotName, body) => {
      const value = resolvePath(slotName, context);
      const truthy = isTruthy(value);

      // Check for {{else}}
      const elseParts = body.split('{{else}}');
      if (elseParts.length > 1) {
        return truthy ? elseParts[0] : elseParts[1];
      }
      return truthy ? body : '';
    });
  } while (result !== prevResult);

  return result;
}

/**
 * Processes iteration blocks: {{#each collection}}...{{/each}}.
 * Inside blocks: {{.}} = current item, {{.field}} = object property, {{@index}} = 0-based index.
 *
 * @param {string} text
 * @param {Object} context
 * @returns {string}
 */
function processIteration(text, context) {
  const EACH_REGEX = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return text.replace(EACH_REGEX, (match, slotName, body) => {
    const collection = resolvePath(slotName, context);

    if (!Array.isArray(collection) || collection.length === 0) {
      return '';
    }

    return collection.map((item, index) => {
      let itemBody = body;

      // Replace {{@index}} with the current index
      itemBody = itemBody.replace(/\{\{@index\}\}/g, String(index));

      // Replace {{.fieldname}} with item property (for objects)
      itemBody = itemBody.replace(/\{\{\.([\w]+)\}\}/g, (m, field) => {
        if (item !== null && item !== undefined && typeof item === 'object') {
          const val = item[field];
          return val !== undefined && val !== null ? String(val) : '';
        }
        return '';
      });

      // Replace {{.}} with the item itself (for primitives)
      itemBody = itemBody.replace(/\{\{\.\}\}/g, String(item));

      return itemBody;
    }).join('');
  });
}

/**
 * Processes include directives: {{> partial_name}}.
 * Replaces with the partial body from options.partials, resolved against context.
 *
 * @param {string} text
 * @param {Object} context
 * @param {Object} options
 * @returns {string}
 */
function processIncludes(text, context, options) {
  const INCLUDE_REGEX = /\{\{>\s*([\w-]+)\s*\}\}/g;
  const strict = options.strict !== false;
  const partials = options.partials || new Map();

  return text.replace(INCLUDE_REGEX, (match, name) => {
    if (!partials.has(name)) {
      if (strict) {
        throw new Error(`Linotype resolve error: partial "${name}" not found`);
      }
      return '';
    }

    const partialBody = partials.get(name);
    // Resolve the partial body against the same context (recursive)
    return resolveInternal(partialBody, context, options);
  });
}

/**
 * Processes variable substitution: {{slot_name}} or {{slot.sub}}.
 *
 * @param {string} text
 * @param {Object} context
 * @param {Object} options
 * @returns {string}
 */
function processVariables(text, context, options) {
  const VAR_REGEX = /\{\{([\w.]+)\}\}/g;
  const slots = options.slots || {};
  const strict = options.strict !== false;

  return text.replace(VAR_REGEX, (match, path) => {
    const value = resolvePath(path, context);

    if (value !== undefined && value !== null) {
      return String(value);
    }

    // Check slot definitions for required/optional/default
    // Use the top-level slot name (first segment before dot)
    const topLevelSlot = path.split('.')[0];
    const slotDef = slots[path] || slots[topLevelSlot];

    if (slotDef) {
      if (slotDef.required) {
        throw new Error(`Linotype cast error: required slot "${path}" missing`);
      }
      // Optional slot: use default or empty string
      if (slotDef.default !== undefined && slotDef.default !== null) {
        return String(slotDef.default);
      }
      return '';
    }

    // No slot definition: if strict and the slot looks undefined, throw
    // Otherwise just use empty string for undefined variables
    return '';
  });
}

/**
 * Internal resolve function (used recursively for partials).
 *
 * @param {string} body - Template body text
 * @param {Object} context - Variable context
 * @param {Object} options - Resolution options
 * @returns {string}
 */
function resolveInternal(body, context, options) {
  let text = body;

  // 1. Strip comments
  text = stripComments(text);

  // 2. Extract raw blocks (protect from processing)
  const { text: withoutRaw, rawBlocks } = extractRawBlocks(text);
  text = withoutRaw;

  // 3. Process conditionals
  text = processConditionals(text, context);

  // 4. Process iteration
  text = processIteration(text, context);

  // 5. Process includes (partials)
  text = processIncludes(text, context, options);

  // 6. Process variables
  text = processVariables(text, context, options);

  // 7. Restore raw blocks
  text = restoreRawBlocks(text, rawBlocks);

  return text;
}

/**
 * Resolves a template body against a context object.
 *
 * Resolution order:
 * 1. Strip comments ({{! ... }})
 * 2. Extract raw blocks ({{{raw}}}...{{{/raw}}})
 * 3. Process conditionals ({{#if}}...{{/if}})
 * 4. Process iteration ({{#each}}...{{/each}})
 * 5. Process includes ({{> partial}})
 * 6. Process variables ({{slot_name}})
 * 7. Restore raw blocks
 *
 * @param {string} body - Template body text
 * @param {Object} context - Variable context for slot resolution
 * @param {Object} [options={}] - Resolution options
 * @param {Object} [options.slots={}] - Slot definitions (required/optional/defaults)
 * @param {Map<string, string>} [options.partials] - Partial templates by name
 * @param {boolean} [options.strict=true] - Throw on missing required slots/partials
 * @returns {string} Resolved template text
 * @throws {Error} If required slot is missing (when strict=true)
 * @throws {Error} If partial not found (when strict=true)
 */
function resolve(body, context, options) {
  const opts = options || {};
  if (!opts.slots) opts.slots = {};
  return resolveInternal(body, context, opts);
}

module.exports = { resolve };

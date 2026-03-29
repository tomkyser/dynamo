'use strict';

/**
 * Linotype template engine.
 * Resolves template syntax: variables, conditionals, iteration, includes, comments, raw blocks.
 */

/**
 * Check if a value is truthy for template conditionals.
 * Truthy = non-empty string, non-null, non-false, non-undefined, non-empty-array.
 */
function isTruthy(val) {
  if (val === null || val === undefined || val === false || val === '') return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

/**
 * Resolve a dotted path against a context object.
 * e.g., resolve 'user.name' against { user: { name: 'Claude' } }
 */
function resolvePath(path, context) {
  const parts = path.split('.');
  let current = context;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Strip comments: {{! ... }} blocks (can be multiline).
 */
function stripComments(body) {
  // Multiline comments: {{! to }}
  return body.replace(/\{\{![\s\S]*?\}\}/g, '');
}

/**
 * Process raw blocks: {{{raw}}}...{{{/raw}}} preserves inner content.
 * Returns [processed body, raw block map].
 */
function extractRawBlocks(body) {
  const rawMap = new Map();
  let counter = 0;

  const processed = body.replace(/\{\{\{raw\}\}\}([\s\S]*?)\{\{\{\/raw\}\}\}/g, (_, content) => {
    const placeholder = `__RAW_BLOCK_${counter++}__`;
    rawMap.set(placeholder, content);
    return placeholder;
  });

  return [processed, rawMap];
}

/**
 * Restore raw blocks back into body.
 */
function restoreRawBlocks(body, rawMap) {
  let result = body;
  for (const [placeholder, content] of rawMap) {
    result = result.replace(placeholder, content);
  }
  return result;
}

/**
 * Process conditionals: {{#if slot}}...{{/if}} and {{#if slot}}...{{else}}...{{/if}}.
 * Handles nesting by processing innermost first.
 */
function processConditionals(body, context) {
  // Process innermost conditionals first (no nested #if inside)
  const ifElseRegex = /\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if\b)[\s\S])*?)\{\{else\}\}((?:(?!\{\{#if\b)[\s\S])*?)\{\{\/if\}\}/;
  const ifRegex = /\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if\b)[\s\S])*?)\{\{\/if\}\}/;

  let result = body;
  let changed = true;

  while (changed) {
    changed = false;

    // Try if/else first
    let match = ifElseRegex.exec(result);
    if (match) {
      const slotName = match[1];
      const trueBlock = match[2];
      const falseBlock = match[3];
      const val = resolvePath(slotName, context);
      const replacement = isTruthy(val) ? trueBlock : falseBlock;
      result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
      changed = true;
      continue;
    }

    // Try plain if
    match = ifRegex.exec(result);
    if (match) {
      const slotName = match[1];
      const trueBlock = match[2];
      const val = resolvePath(slotName, context);
      const replacement = isTruthy(val) ? trueBlock : '';
      result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
      changed = true;
      continue;
    }
  }

  return result;
}

/**
 * Process iteration: {{#each collection}}...{{/each}}.
 * Inside: {{.}} = current item, {{.field}} = property, {{@index}} = 0-based index.
 */
function processIteration(body, context) {
  const eachRegex = /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/;

  let result = body;
  let match;

  while ((match = eachRegex.exec(result)) !== null) {
    const collectionName = match[1];
    const blockBody = match[2];
    const collection = resolvePath(collectionName, context);

    if (!Array.isArray(collection)) {
      result = result.slice(0, match.index) + '' + result.slice(match.index + match[0].length);
      continue;
    }

    let output = '';
    for (let i = 0; i < collection.length; i++) {
      const item = collection[i];
      let iterBody = blockBody;

      // Replace {{@index}}
      iterBody = iterBody.replace(/\{\{@index\}\}/g, String(i));

      // Replace {{.fieldname}} for object properties
      if (item !== null && typeof item === 'object') {
        iterBody = iterBody.replace(/\{\{\.([\w]+)\}\}/g, (_, field) => {
          return item[field] !== undefined ? String(item[field]) : '';
        });
      }

      // Replace {{.}} for plain values
      iterBody = iterBody.replace(/\{\{\.\}\}/g, String(item));

      output += iterBody;
    }

    result = result.slice(0, match.index) + output + result.slice(match.index + match[0].length);
  }

  return result;
}

/**
 * Process includes: {{> partial_name}} replaced with partial body from map.
 */
function processIncludes(body, context, options) {
  const includeRegex = /\{\{>\s*([\w.-]+)\s*\}\}/g;

  return body.replace(includeRegex, (_, partialName) => {
    const partials = options.partials || new Map();
    if (partials.has(partialName)) {
      const partialBody = partials.get(partialName);
      // Recursively resolve the included partial
      return resolve(partialBody, context, options);
    }
    if (options.strict !== false) {
      throw new Error(`Linotype resolve error: unresolved partial "${partialName}"`);
    }
    return '';
  });
}

/**
 * Process variables: {{slot_name}} replaced with context values.
 */
function processVariables(body, context, options) {
  const slots = options.slots || {};
  const varRegex = /\{\{([\w.]+)\}\}/g;

  return body.replace(varRegex, (full, slotName) => {
    const val = resolvePath(slotName, context);

    if (val !== undefined && val !== null) {
      return String(val);
    }

    // Check slot definition
    const slotDef = slots[slotName];
    if (slotDef) {
      if (slotDef.required) {
        throw new Error(`Linotype cast error: required slot "${slotName}" missing`);
      }
      // Optional slot with default
      if (slotDef.default !== undefined) {
        return String(slotDef.default);
      }
    }

    return '';
  });
}

/**
 * Resolve a template body against a context object.
 * @param {string} body - Template body string
 * @param {Object} context - Slot values
 * @param {Object} options - { slots, partials, strict }
 * @returns {string} Resolved string
 */
function resolve(body, context, options) {
  options = options || {};
  context = context || {};

  // Validate required slots that are in the slots definition
  const slots = options.slots || {};
  if (options.strict !== false) {
    for (const [name, def] of Object.entries(slots)) {
      if (def && def.required && context[name] === undefined) {
        throw new Error(`Linotype cast error: required slot "${name}" missing`);
      }
    }
  }

  // 1. Strip comments
  let result = stripComments(body);

  // 2. Extract raw blocks
  const [withoutRaw, rawMap] = extractRawBlocks(result);
  result = withoutRaw;

  // 3. Process conditionals
  result = processConditionals(result, context);

  // 4. Process iteration
  result = processIteration(result, context);

  // 5. Process includes
  result = processIncludes(result, context, options);

  // 6. Process variables
  result = processVariables(result, context, options);

  // 7. Restore raw blocks
  result = restoreRawBlocks(result, rawMap);

  return result;
}

module.exports = { resolve };

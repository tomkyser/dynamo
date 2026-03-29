'use strict';

/**
 * Linotype template validator.
 * Checks a Matrix for structural issues and returns an array of problems.
 * Empty array = no issues.
 */

/** Valid slot type strings */
const VALID_SLOT_TYPES = Object.freeze(['string', 'array', 'number', 'boolean']);

/**
 * Validate a Matrix for structural correctness.
 *
 * @param {Object} matrix - A Matrix object (from parse/parseString).
 * @param {Object} [options] - Validation options.
 * @param {Map|null} [options.registry=null] - Registry of known template names for partial validation.
 * @returns {Array<{field: string, issue: string}>} Array of issue objects. Empty = no issues.
 */
function validate(matrix, options) {
  options = options || {};
  const registry = options.registry || null;
  const issues = [];

  // a. name is non-empty string
  if (!matrix.name || typeof matrix.name !== 'string') {
    issues.push({ field: 'name', issue: 'missing or empty' });
  }

  // b. version is non-empty string
  if (!matrix.version || typeof matrix.version !== 'string') {
    issues.push({ field: 'version', issue: 'missing or empty' });
  }

  // c. Every slot has a required boolean field
  if (matrix.slots && typeof matrix.slots === 'object') {
    for (const [slotName, slotDef] of Object.entries(matrix.slots)) {
      if (slotDef === null || typeof slotDef !== 'object') {
        issues.push({ field: `slots.${slotName}`, issue: 'slot definition must be an object' });
        continue;
      }

      if (typeof slotDef.required !== 'boolean') {
        issues.push({ field: `slots.${slotName}`, issue: 'missing "required" field' });
      }

      // d. If slot has type, it must be valid
      if (slotDef.type !== undefined) {
        if (!VALID_SLOT_TYPES.includes(slotDef.type)) {
          issues.push({ field: `slots.${slotName}.type`, issue: `invalid type "${slotDef.type}"` });
        }
      }
    }
  }

  // e. Includes partial reference checking
  if (Array.isArray(matrix.includes) && matrix.includes.length > 0 && registry) {
    for (const includeName of matrix.includes) {
      if (!registry.has(includeName)) {
        issues.push({ field: 'includes', issue: `unresolved partial "${includeName}"` });
      }
    }
  }

  // f. Body syntax well-formedness: balanced block directives
  if (matrix.body && typeof matrix.body === 'string') {
    const body = matrix.body;

    // Count {{#if}} and {{/if}}
    const ifOpens = (body.match(/\{\{#if\s+/g) || []).length;
    const ifCloses = (body.match(/\{\{\/if\}\}/g) || []).length;
    if (ifOpens > ifCloses) {
      issues.push({ field: 'body', issue: 'unmatched {{#if}} block' });
    } else if (ifCloses > ifOpens) {
      issues.push({ field: 'body', issue: 'unmatched {{/if}} block' });
    }

    // Count {{#each}} and {{/each}}
    const eachOpens = (body.match(/\{\{#each\s+/g) || []).length;
    const eachCloses = (body.match(/\{\{\/each\}\}/g) || []).length;
    if (eachOpens > eachCloses) {
      issues.push({ field: 'body', issue: 'unmatched {{#each}} block' });
    } else if (eachCloses > eachOpens) {
      issues.push({ field: 'body', issue: 'unmatched {{/each}} block' });
    }
  }

  return issues;
}

module.exports = { validate };

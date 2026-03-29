'use strict';

/**
 * Armature template contracts.
 *
 * Defines the validation contract for Linotype template frontmatter at the
 * framework level. These contracts ensure templates registered by modules
 * conform to platform requirements before entering the Circuit template
 * registry.
 *
 * Layer: Framework (Armature) -- consumed by SDK (Circuit template registry).
 *
 * @module core/armature/template-contracts
 */

/**
 * Valid slot type strings for template frontmatter.
 * Mirrors lib/linotype/validator.cjs VALID_SLOT_TYPES for contract parity.
 * @type {Readonly<string[]>}
 */
const TEMPLATE_SLOT_TYPES = Object.freeze(['string', 'array', 'number', 'boolean']);

/**
 * Contract shape for template frontmatter.
 * Defines which fields are required vs optional in template frontmatter JSON.
 * @type {Readonly<{required: string[], optional: string[]}>}
 */
const TEMPLATE_CONTRACT_SHAPE = Object.freeze({
  required: ['name', 'version', 'slots'],
  optional: ['description', 'tags', 'token_estimate', 'includes'],
});

/**
 * Validates template frontmatter against the Armature contract.
 *
 * Checks that all required fields exist and conform to expected types.
 * For each slot definition, validates that `required` is a boolean and
 * that `type` (if present) is one of TEMPLATE_SLOT_TYPES.
 *
 * @param {Object} frontmatter - Raw parsed frontmatter object from a template.
 * @returns {{ valid: boolean, errors: string[] }} Validation result.
 */
function validateTemplateFrontmatter(frontmatter) {
  const errors = [];

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return { valid: false, errors: ['frontmatter: must be a non-null object'] };
  }

  // name: required non-empty string
  if (typeof frontmatter.name !== 'string' || frontmatter.name.length === 0) {
    errors.push('name: must be non-empty string');
  }

  // version: required non-empty string
  if (typeof frontmatter.version !== 'string' || frontmatter.version.length === 0) {
    errors.push('version: must be non-empty string');
  }

  // slots: required object
  if (!frontmatter.slots || typeof frontmatter.slots !== 'object' || Array.isArray(frontmatter.slots)) {
    errors.push('slots: must be an object');
  } else {
    // Validate each slot definition
    for (const [slotName, slotDef] of Object.entries(frontmatter.slots)) {
      if (slotDef === null || typeof slotDef !== 'object' || Array.isArray(slotDef)) {
        errors.push(`slots.${slotName}: must be an object`);
        continue;
      }

      if (typeof slotDef.required !== 'boolean') {
        errors.push(`slots.${slotName}.required: must be a boolean`);
      }

      if (slotDef.type !== undefined && !TEMPLATE_SLOT_TYPES.includes(slotDef.type)) {
        errors.push(`slots.${slotName}.type: invalid type "${slotDef.type}", must be one of: ${TEMPLATE_SLOT_TYPES.join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { validateTemplateFrontmatter, TEMPLATE_SLOT_TYPES, TEMPLATE_CONTRACT_SHAPE };

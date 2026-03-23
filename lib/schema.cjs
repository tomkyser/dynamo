'use strict';

const { ok, err } = require('./result.cjs');

/**
 * @typedef {Object} SchemaField
 * @property {'string'|'number'|'boolean'|'object'|'array'} type - Expected type of the field
 * @property {boolean} [required] - Whether the field must be present (defaults to false)
 * @property {*} [default] - Default value applied when the field is missing
 * @property {Object<string, SchemaField>} [properties] - Nested schema for object-type fields
 * @property {Array<*>} [enum] - Allowed values list (validated after type check)
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} key - The field key (dot-separated for nested paths, e.g. 'db.host')
 * @property {string} code - Error code: 'REQUIRED', 'TYPE_MISMATCH', or 'ENUM_INVALID'
 * @property {string} message - Human-readable description of the validation error
 */

/**
 * Validates a value against a schema definition.
 *
 * Checks each field for presence (required), type correctness, and nested object
 * structure. Applies default values for missing optional fields. Strips keys not
 * defined in the schema. Accumulates all errors (does not fail on first error).
 *
 * @param {*} value - The value to validate (must be a non-null object)
 * @param {Object<string, SchemaField>} schema - Schema definition mapping field names to rules
 * @param {string} [prefix] - Internal: key prefix for nested error paths
 * @returns {import('./result.cjs').Result<Object>} Validated object with only schema-defined keys, or error with all validation failures
 */
function validate(value, schema, prefix) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return err('SCHEMA_INVALID_ROOT', 'Value must be a non-null object');
  }

  const result = {};
  const errors = [];

  for (const [key, field] of Object.entries(schema)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = value[key];

    // Handle missing values
    if (val === undefined) {
      if (field.required) {
        errors.push({ key: fullKey, code: 'REQUIRED', message: `"${fullKey}" is required` });
        continue;
      }
      if (field.default !== undefined) {
        result[key] = field.default;
        continue;
      }
      continue;
    }

    // Type checking
    if (field.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push({
          key: fullKey,
          code: 'TYPE_MISMATCH',
          message: `"${fullKey}" must be an array, got ${typeof val}`,
        });
        continue;
      }
    } else if (typeof val !== field.type) {
      errors.push({
        key: fullKey,
        code: 'TYPE_MISMATCH',
        message: `"${fullKey}" must be ${field.type}, got ${typeof val}`,
      });
      continue;
    }

    // Nested object validation
    if (field.type === 'object' && field.properties) {
      const nested = validate(val, field.properties, fullKey);
      if (!nested.ok) {
        // Collect nested errors (they already have prefixed keys from recursion)
        errors.push(...nested.error.context.errors);
        continue;
      }
      result[key] = nested.value;
      continue;
    }

    // Enum validation (FWK-06, per D-14)
    if (field.enum) {
      if (!field.enum.includes(val)) {
        errors.push({
          key: fullKey,
          code: 'ENUM_INVALID',
          message: `"${fullKey}" must be one of [${field.enum.join(', ')}], got "${val}"`,
        });
        continue;
      }
    }

    result[key] = val;
  }

  if (errors.length > 0) {
    return err('SCHEMA_VALIDATION_FAILED', 'Validation failed', { errors });
  }

  return ok(result);
}

module.exports = { validate };

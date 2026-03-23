'use strict';

const { validate } = require('../../../lib/schema.cjs');

/**
 * Schema definition for module manifests.
 *
 * Mirrors PLUGIN_MANIFEST_SCHEMA from core/armature/plugin.cjs but adds
 * a `hooks` field for module-specific hook wiring. Validated using
 * lib/schema.cjs validate() to enforce required fields, types, and defaults.
 *
 * @type {Object<string, import('../../../lib/schema.cjs').SchemaField>}
 */
const MODULE_MANIFEST_SCHEMA = {
  name: { type: 'string', required: true },
  version: { type: 'string', required: true },
  description: { type: 'string', required: false, default: '' },
  main: { type: 'string', required: true },
  enabled: { type: 'boolean', required: false, default: true },
  dependencies: {
    type: 'object',
    required: false,
    default: { services: [], providers: [] },
    properties: {
      services: { type: 'array', required: false, default: [] },
      providers: { type: 'array', required: false, default: [] },
    },
  },
  hooks: { type: 'object', required: false, default: {} },
};

/**
 * Validates a module manifest against MODULE_MANIFEST_SCHEMA.
 *
 * @param {Object} manifest - The raw manifest object
 * @returns {import('../../../lib/result.cjs').Result<Object>} Validated manifest with defaults applied, or Err
 */
function validateModuleManifest(manifest) {
  return validate(manifest, MODULE_MANIFEST_SCHEMA);
}

module.exports = { MODULE_MANIFEST_SCHEMA, validateModuleManifest };

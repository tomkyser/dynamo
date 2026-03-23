'use strict';

const fs = require('node:fs');
const { ok, err } = require('./result.cjs');
const { validate } = require('./schema.cjs');

/**
 * Performs a deep merge of two objects. Creates a new object without
 * mutating either input. Arrays are replaced (not concatenated) per D-07.
 * Null values are preserved as-is (not recursed into).
 *
 * @param {Object} target - The base object
 * @param {Object} source - The override object (takes precedence)
 * @returns {Object} A new merged object
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = result[key];

    if (
      srcVal !== null &&
      !Array.isArray(srcVal) &&
      typeof srcVal === 'object' &&
      tgtVal !== null &&
      !Array.isArray(tgtVal) &&
      typeof tgtVal === 'object'
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }

  return result;
}

/**
 * Coerces a string environment variable value to the appropriate JS type.
 * - 'true' / 'false' -> boolean
 * - 'null' -> null
 * - Numeric strings -> number
 * - All other strings preserved as-is
 *
 * @param {string} value - Raw env var string value
 * @returns {*} Coerced value
 */
function coerceValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/**
 * Converts DYNAMO_* environment variables into a nested configuration object.
 * Non-DYNAMO_ variables are ignored. Underscores after the DYNAMO_ prefix
 * indicate nesting levels (DYNAMO_DB_HOST -> { db: { host: value } }).
 * Values are coerced from strings to appropriate types.
 *
 * @param {Object<string, string>} env - Environment variables object (e.g. process.env)
 * @returns {Object} Nested configuration object derived from DYNAMO_* vars
 */
function envToConfig(env) {
  const prefix = 'DYNAMO_';
  const config = {};

  for (const [key, rawValue] of Object.entries(env)) {
    if (!key.startsWith(prefix)) continue;

    const stripped = key.slice(prefix.length).toLowerCase();
    const segments = stripped.split('_');
    const value = coerceValue(rawValue);

    let current = config;
    for (let i = 0; i < segments.length - 1; i++) {
      if (current[segments[i]] === undefined || typeof current[segments[i]] !== 'object' || current[segments[i]] === null) {
        current[segments[i]] = {};
      }
      current = current[segments[i]];
    }
    current[segments[segments.length - 1]] = value;
  }

  return config;
}

/**
 * @typedef {Object} LoadConfigOptions
 * @property {Object} [defaults] - Level 1: built-in defaults
 * @property {Object} [schema] - Schema for validation (passed to validate())
 * @property {string} [globalConfigPath] - Level 2: path to global config.json
 * @property {string} [projectConfigPath] - Level 3: path to project .dynamo/config.json
 * @property {Object} [env] - Level 4: env vars object (defaults to process.env)
 * @property {Object} [runtimeOverrides] - Level 5: runtime overrides
 */

/**
 * Loads configuration with 5-level hierarchical precedence:
 *   1. Built-in defaults (lowest)
 *   2. Global config.json
 *   3. Project .dynamo/config.json
 *   4. DYNAMO_* environment variables
 *   5. Runtime overrides (highest)
 *
 * Each level is deep-merged over the previous. The final merged result is
 * validated against the provided schema (if any). Returns a Result type --
 * Ok with the validated config, or Err with schema validation errors.
 *
 * @param {LoadConfigOptions} options - Configuration loading options
 * @returns {import('./result.cjs').Result<Object>} Validated config or validation error
 */
function loadConfig(options) {
  let merged = options.defaults || {};

  // Level 2: Global config file
  if (options.globalConfigPath && fs.existsSync(options.globalConfigPath)) {
    try {
      const raw = fs.readFileSync(options.globalConfigPath, 'utf8');
      const globalConfig = JSON.parse(raw);
      merged = deepMerge(merged, globalConfig);
    } catch (_) {
      // Graceful: if file is unreadable or invalid JSON, skip it
    }
  }

  // Level 3: Project config file
  if (options.projectConfigPath && fs.existsSync(options.projectConfigPath)) {
    try {
      const raw = fs.readFileSync(options.projectConfigPath, 'utf8');
      const projectConfig = JSON.parse(raw);
      merged = deepMerge(merged, projectConfig);
    } catch (_) {
      // Graceful: if file is unreadable or invalid JSON, skip it
    }
  }

  // Level 4: Environment variables
  const envConfig = envToConfig(options.env !== undefined ? options.env : process.env);
  merged = deepMerge(merged, envConfig);

  // Level 5: Runtime overrides
  if (options.runtimeOverrides) {
    merged = deepMerge(merged, options.runtimeOverrides);
  }

  // Validate against schema if provided
  if (options.schema) {
    return validate(merged, options.schema);
  }

  return ok(merged);
}

module.exports = { loadConfig, deepMerge, envToConfig };

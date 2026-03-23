'use strict';

/**
 * Formats command handler output in one of three modes.
 *
 * Result objects can provide { human, json, raw } fields.
 * Each mode picks its field with graceful fallbacks:
 * - human: result.human || JSON.stringify(result) || String(result)
 * - json: JSON.stringify(result.json || result, null, 2)
 * - raw: result.raw || JSON.stringify(result)
 *
 * @param {*} result - Handler return value (object with human/json/raw fields, or any value)
 * @param {'human'|'json'|'raw'} mode - Output mode
 * @returns {string} Formatted output string
 */
function formatOutput(result, mode) {
  if (mode === 'json') {
    const value = result && result.json !== undefined ? result.json : result;
    return JSON.stringify(value, null, 2);
  }

  if (mode === 'raw') {
    if (result && result.raw !== undefined) {
      return String(result.raw);
    }
    return JSON.stringify(result);
  }

  // Default: human mode
  if (result && result.human !== undefined) {
    return String(result.human);
  }
  if (typeof result === 'object' && result !== null) {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

module.exports = { formatOutput };

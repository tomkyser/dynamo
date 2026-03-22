'use strict';

/**
 * @template T
 * @typedef {{ ok: true, value: T }} Ok
 */

/**
 * @typedef {{ ok: false, error: DynamoError }} Err
 */

/**
 * @typedef {Object} DynamoError
 * @property {string} code - Machine-readable error code for switching (never parse message strings)
 * @property {string} message - Human-readable error description
 * @property {Record<string, unknown>} [context] - Additional structured context for debugging
 */

/**
 * @template T
 * @typedef {Ok<T> | Err} Result
 */

/**
 * Creates a successful Result containing the given value.
 * @template T
 * @param {T} value - The success value (null and undefined are valid values)
 * @returns {Ok<T>}
 */
function ok(value) {
  return { ok: true, value };
}

/**
 * Creates a failed Result containing a typed error.
 * @param {string} code - Machine-readable error code (UPPER_SNAKE_CASE convention)
 * @param {string} message - Human-readable error description
 * @param {Record<string, unknown>} [context] - Additional structured context for debugging
 * @returns {Err}
 */
function err(code, message, context) {
  return { ok: false, error: { code, message, context } };
}

/**
 * Type guard: returns true if the Result is Ok.
 * @template T
 * @param {Result<T>} result
 * @returns {boolean}
 */
function isOk(result) {
  return result.ok === true;
}

/**
 * Type guard: returns true if the Result is Err.
 * @template T
 * @param {Result<T>} result
 * @returns {boolean}
 */
function isErr(result) {
  return result.ok === false;
}

/**
 * Extracts the value from an Ok Result, or throws if the Result is Err.
 * @template T
 * @param {Result<T>} result
 * @returns {T}
 * @throws {Error} If the result is Err, throws with the error code in the message
 */
function unwrap(result) {
  if (result.ok === true) {
    return result.value;
  }
  throw new Error(`Unwrap failed: ${result.error.code} - ${result.error.message}`);
}

module.exports = { ok, err, isOk, isErr, unwrap };

'use strict';

const { ok, err } = require('./result.cjs');

/**
 * @typedef {Object} ContractShape
 * @property {string[]} required - Required method names that must be present as functions
 * @property {string[]} [optional] - Optional method names (not validated, but documented)
 */

/**
 * Creates a validated, frozen contract instance.
 *
 * Validates that the implementation object contains all required methods as functions,
 * then returns a frozen shallow copy. Optional methods are not validated but are
 * included in the frozen instance if present.
 *
 * @param {string} name - Contract name for error messages and debugging
 * @param {ContractShape} shape - Contract shape defining required and optional methods
 * @param {Object} implementation - The object to validate against the contract shape
 * @returns {import('./result.cjs').Result<Object>} Frozen contract instance on success, typed error on failure
 */
function createContract(name, shape, implementation) {
  for (const method of shape.required) {
    if (typeof implementation[method] !== 'function') {
      return err(
        'CONTRACT_MISSING_METHOD',
        `Contract "${name}" requires method "${method}"`,
        { contract: name, method }
      );
    }
  }

  return ok(Object.freeze({ ...implementation }));
}

module.exports = { createContract };

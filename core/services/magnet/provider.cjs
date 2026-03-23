'use strict';

const { createContract } = require('../../../lib/index.cjs');

/**
 * Shape definition for state providers.
 *
 * State providers implement a load/save contract for persisting Magnet state.
 * - load() -> async, returns Ok({ global: {}, session: {}, module: {} }) or Err
 * - save(state, options?) -> async, receives full state tree, returns Ok(undefined) or Err
 * - clear(scope) -> async, optional, clears a specific scope
 *
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const STATE_PROVIDER_SHAPE = {
  required: ['load', 'save'],
  optional: ['clear']
};

/**
 * Validates that a provider implementation conforms to the STATE_PROVIDER_SHAPE contract.
 *
 * @param {string} name - Provider name for error messages
 * @param {Object} impl - The provider implementation to validate
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success, typed error on failure
 */
function validateProvider(name, impl) {
  return createContract(name, STATE_PROVIDER_SHAPE, impl);
}

module.exports = { STATE_PROVIDER_SHAPE, validateProvider };

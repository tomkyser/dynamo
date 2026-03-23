'use strict';

const { createContract } = require('../../lib/index.cjs');

/**
 * Shared data provider contract shape.
 *
 * All data providers (Ledger, Journal) must implement these methods.
 * This contract is the uniform interface that Assay and other consumers
 * use to interact with any data provider without knowing its implementation.
 *
 * @type {{ required: string[], optional: string[] }}
 */
const DATA_PROVIDER_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'read', 'write', 'query', 'delete'],
  optional: []
};

/**
 * Validates that an implementation satisfies the DATA_PROVIDER_SHAPE contract.
 *
 * @param {string} name - Provider name for error messages
 * @param {Object} impl - The implementation to validate
 * @returns {import('../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function validateDataProvider(name, impl) {
  return createContract(name, DATA_PROVIDER_SHAPE, impl);
}

module.exports = { DATA_PROVIDER_SHAPE, validateDataProvider };

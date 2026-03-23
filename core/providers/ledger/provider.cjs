'use strict';

const { createContract } = require('../../../lib/index.cjs');

/**
 * Shape definition for data providers.
 *
 * Data providers implement a full CRUD lifecycle for structured data.
 * This is intentionally separate from STATE_PROVIDER_SHAPE (load/save)
 * per decision D-01: data provider contract is distinct from state provider contract.
 *
 * Required methods:
 * - init(options) -> async, initializes backend connection
 * - start() -> activates the provider for health reporting
 * - stop() -> async, closes backend connection
 * - healthCheck() -> returns { healthy, name }
 * - read(id) -> async, returns Ok({ id, data, created_at, updated_at }) or Err('NOT_FOUND')
 * - write(id, data) -> async, upserts a record, returns Ok(undefined)
 * - query(criteria) -> async, returns Ok([records]) matching criteria
 * - delete(id) -> async, removes a record, returns Ok(undefined) or Err('NOT_FOUND')
 *
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const DATA_PROVIDER_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'read', 'write', 'query', 'delete'],
  optional: []
};

/**
 * Validates that a provider implementation conforms to the DATA_PROVIDER_SHAPE contract.
 *
 * @param {string} name - Provider name for error messages
 * @param {Object} impl - The provider implementation to validate
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success, typed error on failure
 */
function validateDataProvider(name, impl) {
  return createContract(name, DATA_PROVIDER_SHAPE, impl);
}

module.exports = { DATA_PROVIDER_SHAPE, validateDataProvider };

'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const { validateProvider } = require('./provider.cjs');

/**
 * Record ID used to store Magnet state in Ledger.
 * Single record containing the full state tree.
 * @type {string}
 */
const RECORD_ID = 'magnet-state';

/**
 * Default empty state tree structure.
 * @returns {{ global: Object, session: Object, module: Object }}
 */
function emptyState() {
  return { global: {}, session: {}, module: {} };
}

/**
 * Creates a Ledger-backed persistence provider for Magnet state.
 *
 * Unlike the JSON file provider, this provider writes immediately on every
 * save() call -- no delayed batching. DuckDB writes are fast and process
 * exit cannot lose data that was "pending" in a deferred write timer.
 *
 * Per D-01/D-05/D-06: All platform state persists through Magnet to Ledger
 * (DuckDB), not JSON files.
 *
 * @param {Object} options
 * @param {Object} options.ledger - Ledger provider instance (CRUD API: read/write/query/delete)
 * @returns {import('../../../lib/result.cjs').Result<Object>} Validated provider instance
 */
function createLedgerProvider(options) {
  const { ledger } = options || {};

  if (!ledger) {
    return err('MISSING_DEPENDENCY', 'Ledger provider required for ledger-provider', { option: 'ledger' });
  }

  /**
   * Loads state from Ledger.
   * Returns empty state on first boot (NOT_FOUND).
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
   */
  async function load() {
    const result = await ledger.read(RECORD_ID);

    if (!result.ok) {
      if (result.error.code === 'NOT_FOUND') {
        return ok(emptyState());
      }
      return result;
    }

    return ok(result.value.data);
  }

  /**
   * Saves state to Ledger immediately. No delayed batching.
   *
   * The saveOptions parameter is accepted for interface compatibility with
   * the JSON provider but ignored -- every call writes immediately.
   * DuckDB writes are fast; deferred writes risk data loss on process exit.
   *
   * @param {{ global: Object, session: Object, module: Object }} state - Full state tree
   * @param {{ flush?: boolean }} [saveOptions={}] - Accepted for interface compat, ignored
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function save(state, saveOptions = {}) {
    return ledger.write(RECORD_ID, state);
  }

  /**
   * Clears a specific scope from state and persists immediately.
   *
   * @param {string} scope - Scope to clear ('global', 'session', or 'module')
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function clear(scope) {
    const loadResult = await load();
    if (!loadResult.ok) {
      return loadResult;
    }

    const state = loadResult.value;
    state[scope] = {};
    return save(state);
  }

  return validateProvider('ledger-provider', { load, save, clear });
}

module.exports = { createLedgerProvider };

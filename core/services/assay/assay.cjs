'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');

/**
 * Contract shape for the Assay federated search service.
 * Defines required and optional methods for contract validation.
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const ASSAY_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'search', 'searchProvider', 'registerProvider'],
  optional: ['getProviders'],
};

/**
 * Creates an Assay federated search service instance.
 *
 * Assay is the unified search entry point that dispatches queries across all
 * registered data providers (Ledger and Journal), merges results with provider
 * metadata (_provider: { name, type }) on each result, and returns a flat
 * result array with per-provider summary diagnostics.
 *
 * Consumers (Reverie's recall pipeline FRG-04, sublimation scanning SES-03)
 * search across heterogeneous data sources without knowing provider internals,
 * while still supporting provider-specific optimization (SQL to Ledger,
 * frontmatter scans to Journal).
 *
 * Decisions implemented:
 * - D-01: Options-based DI at init(). Providers injected via options object.
 * - D-02: Provider pool extensible via registerProvider() after init.
 * - D-03: Dual query API: search() (federated) and searchProvider() (targeted).
 * - D-04: Query object shape: { criteria, providers?, options? }.
 * - D-05/D-06: Capability-based routing (SQL hints, criteria matching).
 * - D-07: Provider metadata on every result via _provider: { name, type }.
 * - D-08: Provider-grouped result structure: { results, providers }.
 * - D-10: Switchboard events for search lifecycle observability.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen Assay contract instance
 */
function createAssay() {
  /** @type {boolean} */
  let _started = false;

  /** @type {Object|null} */
  let _switchboard = null;

  /**
   * Provider pool: Map<string, { provider: Object, capabilities: Object }>
   * - provider: object with query(criteria) method
   * - capabilities: { name: string, type: string, supports: { sql: boolean, criteria: boolean } }
   * @type {Map<string, { provider: Object, capabilities: Object }>}
   */
  const _providers = new Map();

  const impl = {
    /**
     * Initializes Assay with injected dependencies via options-based DI.
     *
     * @param {Object} [options] - Initialization options
     * @param {Object} [options.ledger] - Ledger data provider (SQL-capable)
     * @param {Object} [options.journal] - Journal data provider (frontmatter-capable)
     * @param {Object} [options.switchboard] - Switchboard service for event emission
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    init(options) {
      if (!options) {
        return err('INIT_FAILED', 'Assay init requires options object');
      }

      _switchboard = options.switchboard || null;

      if (options.ledger) {
        _providers.set('ledger', {
          provider: options.ledger,
          capabilities: { name: 'ledger', type: 'sql', supports: { sql: true, criteria: true } },
        });
      }

      if (options.journal) {
        _providers.set('journal', {
          provider: options.journal,
          capabilities: { name: 'journal', type: 'frontmatter', supports: { sql: false, criteria: true } },
        });
      }

      return ok(undefined);
    },

    /**
     * Starts the Assay service.
     *
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    start() {
      _started = true;
      return ok(undefined);
    },

    /**
     * Stops the Assay service.
     *
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    stop() {
      _started = false;
      return ok(undefined);
    },

    /**
     * Returns Assay service health status.
     *
     * @returns {import('../../../lib/result.cjs').Result<{ started: boolean, providers: number }>}
     */
    healthCheck() {
      return ok({ started: _started, providers: _providers.size });
    },

    /**
     * Registers a new provider to the pool after init.
     * Enables plugin extensibility without modifying core (D-02).
     *
     * @param {string} name - Unique provider name
     * @param {Object} registration - Provider registration object
     * @param {Object} registration.provider - Provider instance with query(criteria) method
     * @param {Object} registration.capabilities - Capability declaration { name, type, supports }
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    registerProvider(name, registration) {
      if (_providers.has(name)) {
        return err('PROVIDER_EXISTS', `Provider "${name}" is already registered`, { name });
      }

      if (!registration || !registration.provider || typeof registration.provider.query !== 'function') {
        return err('INVALID_PROVIDER', 'Provider must implement query(criteria)', { name });
      }

      if (!registration.capabilities || !registration.capabilities.name || !registration.capabilities.supports) {
        return err('INVALID_PROVIDER', 'Provider capabilities must include name and supports fields', { name });
      }

      _providers.set(name, {
        provider: registration.provider,
        capabilities: registration.capabilities,
      });

      return ok(undefined);
    },

    /**
     * Federated search across all registered providers (D-03, D-04, D-06, D-07, D-08, D-10).
     *
     * Dispatches queries in parallel via Promise.allSettled, tags every result with
     * _provider metadata, and returns a flat result array with per-provider summary.
     *
     * @param {Object} query - Search query
     * @param {Object} [query.criteria] - Plain criteria object for provider query()
     * @param {string[]} [query.providers] - Optional array of provider names to restrict search
     * @param {Object} [query.options] - Provider-specific hints (e.g., { sql, limit })
     * @returns {Promise<import('../../../lib/result.cjs').Result<{ results: Array, providers: Object }>>}
     */
    async search(query) {
      if (!_started) {
        return err('NOT_STARTED', 'Assay is not started');
      }

      const startTime = performance.now();
      const criteria = (query && query.criteria) || {};
      const options = (query && query.options) || null;

      // Determine target providers (D-04: providers array restriction)
      let targetEntries;
      if (query && Array.isArray(query.providers)) {
        targetEntries = [];
        for (const name of query.providers) {
          if (_providers.has(name)) {
            targetEntries.push([name, _providers.get(name)]);
          }
        }
      } else {
        targetEntries = [..._providers.entries()];
      }

      // Emit search:started (D-10)
      if (_switchboard) {
        _switchboard.emit('search:started', {
          criteria,
          providers: targetEntries.map(function ([name]) { return name; }),
        });
      }

      // Dispatch to each provider in parallel (D-06: capability routing)
      const promises = targetEntries.map(function ([name, entry]) {
        return (async function () {
          const providerStart = performance.now();

          // Capability routing (D-06)
          if (options && options.sql) {
            if (entry.capabilities.supports.sql) {
              // SQL-capable provider: pass SQL directly
              const sqlCriteria = { _raw_sql: options.sql };
              if (options.limit) {
                sqlCriteria._limit = options.limit;
              }
              const result = await entry.provider.query(sqlCriteria);
              const timing = performance.now() - providerStart;

              if (!result.ok) {
                return { name, results: [], timing, count: 0, error: result.error };
              }

              // Tag results with provider metadata (D-07)
              const tagged = result.value.map(function (item) {
                return { ...item, _provider: { name, type: entry.capabilities.type } };
              });
              return { name, results: tagged, timing, count: tagged.length };
            }
            // Non-SQL provider: skip when SQL query is specified
            const timing = performance.now() - providerStart;
            return { name, results: [], timing, count: 0, skipped: true };
          }

          // Standard criteria-based query
          if (entry.capabilities.supports.criteria) {
            const result = await entry.provider.query(criteria);
            const timing = performance.now() - providerStart;

            if (!result.ok) {
              return { name, results: [], timing, count: 0, error: result.error };
            }

            // Tag results with provider metadata (D-07)
            const tagged = result.value.map(function (item) {
              return { ...item, _provider: { name, type: entry.capabilities.type } };
            });
            return { name, results: tagged, timing, count: tagged.length };
          }

          // Provider doesn't support query type: skip
          const timing = performance.now() - providerStart;
          return { name, results: [], timing, count: 0, skipped: true };
        })();
      });

      const settled = await Promise.allSettled(promises);

      // Process settled results (D-08: provider-grouped result structure)
      const allResults = [];
      const providersSummary = {};
      let allFailed = true;

      for (let i = 0; i < settled.length; i++) {
        const outcome = settled[i];

        if (outcome.status === 'fulfilled') {
          const provResult = outcome.value;

          // Add results to flat array
          for (let j = 0; j < provResult.results.length; j++) {
            allResults.push(provResult.results[j]);
          }

          // Build provider summary
          const summary = { count: provResult.count, timing: provResult.timing };
          if (provResult.error) {
            summary.error = provResult.error;
          }
          if (provResult.skipped) {
            summary.skipped = true;
          }
          providersSummary[provResult.name] = summary;

          // Track whether at least one provider succeeded with results or was skipped
          if (!provResult.error) {
            allFailed = false;
          }
        } else {
          // Promise itself rejected (unexpected)
          const name = targetEntries[i][0];
          providersSummary[name] = {
            count: 0,
            timing: 0,
            error: { code: 'PROMISE_REJECTED', message: String(outcome.reason) },
          };
        }
      }

      const totalTiming = performance.now() - startTime;

      // Emit events (D-10)
      if (_switchboard) {
        if (allFailed && targetEntries.length > 0) {
          _switchboard.emit('search:error', {
            criteria,
            error: 'All providers failed',
          });
        } else {
          _switchboard.emit('search:completed', {
            criteria,
            resultCount: allResults.length,
            timing: totalTiming,
            providers: Object.keys(providersSummary),
          });
        }
      }

      return ok({ results: allResults, providers: providersSummary });
    },

    /**
     * Queries a specific named provider only (D-03).
     *
     * @param {string} name - Provider name to query
     * @param {Object} query - Search query
     * @param {Object} [query.criteria] - Plain criteria object for provider query()
     * @returns {Promise<import('../../../lib/result.cjs').Result<{ results: Array, providers: Object }>>}
     */
    async searchProvider(name, query) {
      if (!_started) {
        return err('NOT_STARTED', 'Assay is not started');
      }

      if (!_providers.has(name)) {
        return err('PROVIDER_NOT_FOUND', `Provider "${name}" is not registered`, { name });
      }

      const entry = _providers.get(name);
      const criteria = (query && query.criteria) || {};
      const providerStart = performance.now();

      const result = await entry.provider.query(criteria);
      const timing = performance.now() - providerStart;

      if (!result.ok) {
        return result;
      }

      // Tag results with provider metadata (D-07)
      const tagged = result.value.map(function (item) {
        return { ...item, _provider: { name, type: entry.capabilities.type } };
      });

      return ok({
        results: tagged,
        providers: { [name]: { count: tagged.length, timing } },
      });
    },

    /**
     * Returns list of registered provider names.
     *
     * @returns {import('../../../lib/result.cjs').Result<string[]>}
     */
    getProviders() {
      return ok([..._providers.keys()]);
    },
  };

  return createContract('assay', ASSAY_SHAPE, impl);
}

module.exports = { createAssay, ASSAY_SHAPE };

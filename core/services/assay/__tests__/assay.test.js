'use strict';

const { describe, it, expect, beforeEach, mock } = require('bun:test');
const { ok, err, isOk, isErr, unwrap } = require('../../../../lib/index.cjs');

// Will be created in Task 2
const { createAssay, ASSAY_SHAPE } = require('../assay.cjs');

/**
 * Creates mock dependencies for Assay service initialization.
 * Follows established pattern from wire.test.js / switchboard.test.js.
 */
function createMockDeps() {
  const emitted = [];
  return {
    switchboard: {
      emit: mock(function (event, payload) {
        emitted.push({ event, payload });
      }),
    },
    ledger: {
      query: mock(async function (criteria) {
        return ok([
          { id: 'led-1', data: { type: 'association', domain: 'engineering' } },
          { id: 'led-2', data: { type: 'association', domain: 'interpersonal' } },
        ]);
      }),
    },
    journal: {
      query: mock(async function (criteria) {
        return ok([
          { id: 'frag-001', data: { type: 'experiential' }, body: 'Fuzzy impression...' },
        ]);
      }),
    },
    emitted,
  };
}

describe('Assay Service', () => {
  let assay;
  let deps;

  beforeEach(() => {
    const result = createAssay();
    expect(isOk(result)).toBe(true);
    assay = unwrap(result);
    deps = createMockDeps();
  });

  describe('contract validation', () => {
    it('createAssay() returns Ok with frozen object containing all required methods', () => {
      const result = createAssay();
      expect(isOk(result)).toBe(true);
      const instance = unwrap(result);
      expect(Object.isFrozen(instance)).toBe(true);

      for (const method of ASSAY_SHAPE.required) {
        expect(typeof instance[method]).toBe('function');
      }
    });

    it('ASSAY_SHAPE has all required and optional methods', () => {
      expect(ASSAY_SHAPE.required).toContain('init');
      expect(ASSAY_SHAPE.required).toContain('start');
      expect(ASSAY_SHAPE.required).toContain('stop');
      expect(ASSAY_SHAPE.required).toContain('healthCheck');
      expect(ASSAY_SHAPE.required).toContain('search');
      expect(ASSAY_SHAPE.required).toContain('searchProvider');
      expect(ASSAY_SHAPE.required).toContain('registerProvider');
      expect(ASSAY_SHAPE.optional).toContain('getProviders');
    });

    it('createAssay() returns Ok with optional getProviders method', () => {
      const result = createAssay();
      const instance = unwrap(result);
      expect(typeof instance.getProviders).toBe('function');
    });
  });

  describe('init', () => {
    it('init({ ledger, journal, switchboard }) returns ok and registers both providers', () => {
      const result = assay.init({
        ledger: deps.ledger,
        journal: deps.journal,
        switchboard: deps.switchboard,
      });
      expect(isOk(result)).toBe(true);
    });

    it('init() with no options returns err with code INIT_FAILED', () => {
      const result = assay.init();
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INIT_FAILED');
    });

    it('init({ switchboard }) with no providers returns ok', () => {
      const result = assay.init({ switchboard: deps.switchboard });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('lifecycle', () => {
    it('start() sets started state', () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      const result = assay.start();
      expect(isOk(result)).toBe(true);

      const health = unwrap(assay.healthCheck());
      expect(health.started).toBe(true);
    });

    it('stop() clears started state', () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();
      const result = assay.stop();
      expect(isOk(result)).toBe(true);

      const health = unwrap(assay.healthCheck());
      expect(health.started).toBe(false);
    });

    it('healthCheck() returns status object with started flag and provider count', () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();
      const result = assay.healthCheck();
      expect(isOk(result)).toBe(true);

      const health = unwrap(result);
      expect(health.started).toBe(true);
      expect(health.providers).toBe(2);
    });

    it('healthCheck() after stop returns { started: false }', () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();
      assay.stop();

      const health = unwrap(assay.healthCheck());
      expect(health.started).toBe(false);
    });
  });

  describe('search - federated', () => {
    it('returns flat result array with _provider metadata on each result', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const result = await assay.search({ criteria: {} });
      expect(isOk(result)).toBe(true);

      const { results, providers } = unwrap(result);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3); // 2 from ledger + 1 from journal
    });

    it('each result has _provider: { name, type } metadata', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const { results } = unwrap(await assay.search({ criteria: {} }));

      const ledgerResults = results.filter(r => r._provider.name === 'ledger');
      const journalResults = results.filter(r => r._provider.name === 'journal');

      expect(ledgerResults.length).toBe(2);
      expect(journalResults.length).toBe(1);

      // Verify type metadata
      for (const r of ledgerResults) {
        expect(r._provider).toEqual({ name: 'ledger', type: 'sql' });
      }
      for (const r of journalResults) {
        expect(r._provider).toEqual({ name: 'journal', type: 'frontmatter' });
      }
    });

    it('return shape has results array and providers summary with count and timing', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const { results, providers } = unwrap(await assay.search({ criteria: {} }));

      expect(Array.isArray(results)).toBe(true);
      expect(typeof providers).toBe('object');
      expect(typeof providers.ledger).toBe('object');
      expect(typeof providers.journal).toBe('object');
      expect(providers.ledger.count).toBe(2);
      expect(providers.journal.count).toBe(1);
      expect(typeof providers.ledger.timing).toBe('number');
      expect(typeof providers.journal.timing).toBe('number');
    });
  });

  describe('search - provider restriction', () => {
    it('queries only named providers when providers array is specified', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const result = await assay.search({ criteria: {}, providers: ['ledger'] });
      expect(isOk(result)).toBe(true);

      const { results, providers } = unwrap(result);

      // Only ledger results
      expect(results.length).toBe(2);
      expect(results.every(r => r._provider.name === 'ledger')).toBe(true);

      // Only ledger in providers summary
      expect(providers.ledger).toBeDefined();
      expect(providers.journal).toBeUndefined();
    });
  });

  describe('search - capability routing', () => {
    it('routes SQL directly via _raw_sql when provider supports SQL', async () => {
      const sqlLedger = {
        query: mock(async function (criteria) {
          return ok([{ id: 'sql-1', data: { match: true } }]);
        }),
      };

      assay.init({ ledger: sqlLedger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      await assay.search({ criteria: {}, options: { sql: 'SELECT * FROM records' } });

      // Ledger should receive _raw_sql
      expect(sqlLedger.query).toHaveBeenCalled();
      const callArgs = sqlLedger.query.mock.calls[0][0];
      expect(callArgs._raw_sql).toBe('SELECT * FROM records');
    });

    it('skips non-SQL provider (journal) when query has sql option', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const result = await assay.search({ criteria: {}, options: { sql: 'SELECT * FROM records' } });
      expect(isOk(result)).toBe(true);

      // Journal should not have been queried
      expect(deps.journal.query).not.toHaveBeenCalled();
    });
  });

  describe('search - not started', () => {
    it('returns err with code NOT_STARTED when service not started', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      // NOT calling start()

      const result = await assay.search({ criteria: {} });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('NOT_STARTED');
    });
  });

  describe('searchProvider', () => {
    it('queries specific named provider only and returns tagged results', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const result = await assay.searchProvider('journal', { criteria: {} });
      expect(isOk(result)).toBe(true);

      const { results } = unwrap(result);
      expect(results.length).toBe(1);
      expect(results[0]._provider).toEqual({ name: 'journal', type: 'frontmatter' });

      // Ledger should not have been called
      expect(deps.ledger.query).not.toHaveBeenCalled();
    });

    it('returns err with PROVIDER_NOT_FOUND for unknown provider name', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const result = await assay.searchProvider('unknown', { criteria: {} });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('PROVIDER_NOT_FOUND');
    });

    it('returns err with NOT_STARTED when service not started', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      // NOT calling start()

      const result = await assay.searchProvider('ledger', { criteria: {} });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('NOT_STARTED');
    });
  });

  describe('registerProvider', () => {
    it('adds new provider after init and subsequent search includes it', async () => {
      assay.init({ ledger: deps.ledger, switchboard: deps.switchboard });
      assay.start();

      const customProvider = {
        query: mock(async function (criteria) {
          return ok([{ id: 'custom-1', data: { custom: true } }]);
        }),
      };

      const regResult = assay.registerProvider('custom', {
        provider: customProvider,
        capabilities: { name: 'custom', type: 'custom', supports: { sql: false, criteria: true } },
      });
      expect(isOk(regResult)).toBe(true);

      const searchResult = await assay.search({ criteria: {} });
      expect(isOk(searchResult)).toBe(true);

      const { results } = unwrap(searchResult);
      const customResults = results.filter(r => r._provider.name === 'custom');
      expect(customResults.length).toBe(1);
    });

    it('returns err with PROVIDER_EXISTS for duplicate name', () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });

      const regResult = assay.registerProvider('ledger', {
        provider: { query: async () => ok([]) },
        capabilities: { name: 'ledger', type: 'sql', supports: { sql: true, criteria: true } },
      });
      expect(isErr(regResult)).toBe(true);
      expect(regResult.error.code).toBe('PROVIDER_EXISTS');
    });
  });

  describe('partial failure', () => {
    it('one provider error does not prevent other providers from returning results', async () => {
      const failingLedger = {
        query: mock(async function () {
          return err('QUERY_FAILED', 'DuckDB connection lost');
        }),
      };

      assay.init({ ledger: failingLedger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      const result = await assay.search({ criteria: {} });
      expect(isOk(result)).toBe(true);

      const { results, providers } = unwrap(result);

      // Journal results still returned
      expect(results.length).toBe(1);
      expect(results[0]._provider).toEqual({ name: 'journal', type: 'frontmatter' });

      // Ledger provider summary shows error
      expect(providers.ledger.error).toBeDefined();
      expect(providers.ledger.count).toBe(0);

      // Journal provider summary shows success
      expect(providers.journal.count).toBe(1);
    });
  });

  describe('Switchboard events', () => {
    it('emits search:started with criteria and provider list before dispatch', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      await assay.search({ criteria: { type: 'association' } });

      const startedEvents = deps.emitted.filter(e => e.event === 'search:started');
      expect(startedEvents.length).toBe(1);
      expect(startedEvents[0].payload.criteria).toEqual({ type: 'association' });
      expect(Array.isArray(startedEvents[0].payload.providers)).toBe(true);
      expect(startedEvents[0].payload.providers).toContain('ledger');
      expect(startedEvents[0].payload.providers).toContain('journal');
    });

    it('emits search:completed with result counts and timing after success', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal, switchboard: deps.switchboard });
      assay.start();

      await assay.search({ criteria: {} });

      const completedEvents = deps.emitted.filter(e => e.event === 'search:completed');
      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].payload.resultCount).toBe(3);
      expect(typeof completedEvents[0].payload.timing).toBe('number');
      expect(Array.isArray(completedEvents[0].payload.providers)).toBe(true);
    });

    it('emits search:error when all providers fail', async () => {
      const failingLedger = {
        query: mock(async function () {
          return err('QUERY_FAILED', 'DuckDB error');
        }),
      };
      const failingJournal = {
        query: mock(async function () {
          return err('QUERY_FAILED', 'Journal error');
        }),
      };

      assay.init({ ledger: failingLedger, journal: failingJournal, switchboard: deps.switchboard });
      assay.start();

      await assay.search({ criteria: {} });

      const errorEvents = deps.emitted.filter(e => e.event === 'search:error');
      expect(errorEvents.length).toBe(1);
    });

    it('no events emitted when switchboard is null', async () => {
      assay.init({ ledger: deps.ledger, journal: deps.journal });
      assay.start();

      // Should not throw even without switchboard
      const result = await assay.search({ criteria: {} });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('result immutability', () => {
    it('_provider metadata added via spread (new object), not mutation of provider results', async () => {
      const originalResult = { id: 'orig-1', data: { preserved: true } };
      const immutableLedger = {
        query: mock(async function () {
          return ok([originalResult]);
        }),
      };

      assay.init({ ledger: immutableLedger, switchboard: deps.switchboard });
      assay.start();

      const { results } = unwrap(await assay.search({ criteria: {} }));

      // Original object should NOT have _provider
      expect(originalResult._provider).toBeUndefined();

      // Returned result should have _provider
      expect(results[0]._provider).toEqual({ name: 'ledger', type: 'sql' });
    });
  });
});

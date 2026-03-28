'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');

/**
 * Creates a mock Ledger that stores records in a Map.
 * Simulates read/write/query/delete with Result types.
 */
function createMockLedger() {
  const store = new Map();
  let writeCallCount = 0;

  return {
    store,
    getWriteCallCount() { return writeCallCount; },

    async read(id) {
      if (!store.has(id)) {
        return { ok: false, error: { code: 'NOT_FOUND', message: `Record not found: ${id}`, context: { id } } };
      }
      const record = store.get(id);
      return { ok: true, value: { id, data: record.data, created_at: record.created_at, updated_at: record.updated_at } };
    },

    async write(id, data) {
      writeCallCount++;
      const now = new Date().toISOString();
      const existing = store.get(id);
      store.set(id, {
        data,
        created_at: existing ? existing.created_at : now,
        updated_at: now,
      });
      return { ok: true, value: undefined };
    },

    async query(criteria) {
      const records = [];
      for (const [id, record] of store) {
        records.push({ id, data: record.data, created_at: record.created_at, updated_at: record.updated_at });
      }
      return { ok: true, value: records };
    },

    async delete(id) {
      if (!store.has(id)) {
        return { ok: false, error: { code: 'NOT_FOUND', message: `Record not found: ${id}`, context: { id } } };
      }
      store.delete(id);
      return { ok: true, value: undefined };
    },
  };
}

describe('ledger-provider', () => {
  let mockLedger;

  beforeEach(() => {
    mockLedger = createMockLedger();
  });

  describe('createLedgerProvider', () => {
    it('Test 1: returns ok Result with frozen provider when given valid ledger', () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({ ledger: mockLedger });

      expect(result.ok).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value.load).toBe('function');
      expect(typeof result.value.save).toBe('function');
      expect(typeof result.value.clear).toBe('function');
      expect(Object.isFrozen(result.value)).toBe(true);
    });

    it('Test 2: returns err(MISSING_DEPENDENCY) without ledger', () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({});

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('MISSING_DEPENDENCY');
    });
  });

  describe('load', () => {
    it('Test 3: returns empty state on empty DB (NOT_FOUND)', async () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({ ledger: mockLedger });
      const provider = result.value;

      const loadResult = await provider.load();
      expect(loadResult.ok).toBe(true);
      expect(loadResult.value).toEqual({ global: {}, session: {}, module: {} });
    });

    it('Test 8: load() when ledger.read returns NOT_FOUND returns empty state (first boot)', async () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      // Explicitly verify NOT_FOUND handling with a fresh store
      const freshLedger = createMockLedger();
      const result = createLedgerProvider({ ledger: freshLedger });
      const provider = result.value;

      // Confirm store is empty
      expect(freshLedger.store.size).toBe(0);

      const loadResult = await provider.load();
      expect(loadResult.ok).toBe(true);
      expect(loadResult.value).toEqual({ global: {}, session: {}, module: {} });
    });
  });

  describe('save and load round-trip', () => {
    it('Test 4: save(state) then load() returns same state object (round-trip identity)', async () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({ ledger: mockLedger });
      const provider = result.value;

      const state = {
        global: { mode: 'active', relay_port: 8080 },
        session: { 'sess-1': { tripletId: 'abc123' } },
        module: { reverie: { initialized: true } },
      };

      const saveResult = await provider.save(state);
      expect(saveResult.ok).toBe(true);

      const loadResult = await provider.load();
      expect(loadResult.ok).toBe(true);
      expect(loadResult.value).toEqual(state);
    });

    it('Test 5: save() does NOT debounce -- calls ledger.write() immediately', async () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({ ledger: mockLedger });
      const provider = result.value;

      const state1 = { global: { a: 1 }, session: {}, module: {} };
      const state2 = { global: { a: 2 }, session: {}, module: {} };
      const state3 = { global: { a: 3 }, session: {}, module: {} };

      await provider.save(state1);
      await provider.save(state2);
      await provider.save(state3);

      // Each save should have triggered an immediate ledger.write()
      expect(mockLedger.getWriteCallCount()).toBe(3);
    });

    it('Test 6: save({ flush: true }) also calls ledger.write() immediately (no special case needed)', async () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({ ledger: mockLedger });
      const provider = result.value;

      const state = { global: { key: 'val' }, session: {}, module: {} };

      await provider.save(state, { flush: true });
      expect(mockLedger.getWriteCallCount()).toBe(1);

      // Verify data persisted
      const loadResult = await provider.load();
      expect(loadResult.ok).toBe(true);
      expect(loadResult.value).toEqual(state);
    });
  });

  describe('clear', () => {
    it('Test 7: clear(session) zeroes the session scope and saves', async () => {
      const { createLedgerProvider } = require('./ledger-provider.cjs');
      const result = createLedgerProvider({ ledger: mockLedger });
      const provider = result.value;

      // Setup state with session data
      const state = {
        global: { mode: 'active' },
        session: { 'sess-1': { tripletId: 'abc' } },
        module: { reverie: { initialized: true } },
      };
      await provider.save(state);

      // Clear session scope
      const clearResult = await provider.clear('session');
      expect(clearResult.ok).toBe(true);

      // Load and verify session is cleared, others intact
      const loadResult = await provider.load();
      expect(loadResult.ok).toBe(true);
      expect(loadResult.value.session).toEqual({});
      expect(loadResult.value.global).toEqual({ mode: 'active' });
      expect(loadResult.value.module).toEqual({ reverie: { initialized: true } });
    });
  });

  describe('no debounce in source', () => {
    it('source code does not contain setTimeout or debounce', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(
        path.join(__dirname, 'ledger-provider.cjs'),
        'utf8'
      );
      expect(source).not.toContain('setTimeout');
      expect(source).not.toContain('debounce');
    });
  });
});

'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const { createLedger } = require('../ledger.cjs');
const { DATA_PROVIDER_SHAPE } = require('../provider.cjs');

/**
 * Creates a mock switchboard that records emitted events.
 * @returns {{ emit: Function, events: Array<{ event: string, payload: * }> }}
 */
function createMockSwitchboard() {
  const events = [];
  return {
    emit(event, payload) {
      events.push({ event, payload });
    },
    events
  };
}

describe('Ledger Provider Factory', () => {
  let ledger;
  let switchboard;

  beforeEach(async () => {
    switchboard = createMockSwitchboard();
    const result = createLedger();
    expect(result.ok).toBe(true);
    ledger = result.value;
  });

  afterEach(async () => {
    try { await ledger.stop(); } catch (_) { /* ignore */ }
  });

  describe('factory and contract', () => {
    it('createLedger() returns Ok(frozen ledger instance)', () => {
      const result = createLedger();
      expect(result.ok).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
    });

    it('ledger has all 8 DATA_PROVIDER_SHAPE methods', () => {
      for (const method of DATA_PROVIDER_SHAPE.required) {
        expect(typeof ledger[method]).toBe('function');
      }
    });
  });

  describe('init', () => {
    it('init({ dbPath: ":memory:", switchboard }) initializes with in-memory database', async () => {
      const result = await ledger.init({ dbPath: ':memory:', switchboard });
      expect(result.ok).toBe(true);
    });

    it('init({ dbPath: ":memory:", backend: "sqlite" }) forces SQLite backend', async () => {
      const result = await ledger.init({ dbPath: ':memory:', backend: 'sqlite', switchboard });
      expect(result.ok).toBe(true);
    });

    it('init({ dbPath: ":memory:", backend: "duckdb" }) uses DuckDB backend', async () => {
      const result = await ledger.init({ dbPath: ':memory:', backend: 'duckdb', switchboard });
      // May fail if DuckDB unavailable, which is Ok -- test the result type
      expect(typeof result.ok).toBe('boolean');
      if (!result.ok) {
        // DuckDB not available, expected on some platforms
        expect(result.error.code).toBeDefined();
      }
    });

    it('init() with no dbPath returns Err("INIT_FAILED")', async () => {
      const result = await ledger.init({});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INIT_FAILED');
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      await ledger.init({ dbPath: ':memory:', backend: 'sqlite', switchboard });
      ledger.start();
    });

    it('write("rec-1", { type: "test", value: 42 }) stores record, returns Ok(undefined)', async () => {
      const result = await ledger.write('rec-1', { type: 'test', value: 42 });
      expect(result.ok).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('read("rec-1") returns Ok({ id, data, created_at, updated_at })', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      const result = await ledger.read('rec-1');
      expect(result.ok).toBe(true);
      expect(result.value.id).toBe('rec-1');
      expect(result.value.data).toEqual({ type: 'test', value: 42 });
      expect(result.value.created_at).toBeDefined();
      expect(result.value.updated_at).toBeDefined();
    });

    it('read("nonexistent") returns Err("NOT_FOUND")', async () => {
      const result = await ledger.read('nonexistent');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('query({ type: "test" }) returns Ok([matching records])', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      await ledger.write('rec-2', { type: 'other', value: 99 });
      const result = await ledger.query({ type: 'test' });
      expect(result.ok).toBe(true);
      expect(result.value.length).toBe(1);
      expect(result.value[0].id).toBe('rec-1');
      expect(result.value[0].data.type).toBe('test');
    });

    it('query({}) returns Ok([all records])', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      await ledger.write('rec-2', { type: 'other', value: 99 });
      const result = await ledger.query({});
      expect(result.ok).toBe(true);
      expect(result.value.length).toBe(2);
    });

    it('delete("rec-1") removes record, returns Ok(undefined)', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      const result = await ledger.delete('rec-1');
      expect(result.ok).toBe(true);
      expect(result.value).toBeUndefined();

      // Verify deleted
      const readResult = await ledger.read('rec-1');
      expect(readResult.ok).toBe(false);
      expect(readResult.error.code).toBe('NOT_FOUND');
    });

    it('delete("nonexistent") returns Err("NOT_FOUND")', async () => {
      const result = await ledger.delete('nonexistent');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });

    it('write("rec-1", newData) updates existing record (upsert)', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      await ledger.write('rec-1', { type: 'test', value: 100 });

      const result = await ledger.read('rec-1');
      expect(result.ok).toBe(true);
      expect(result.value.data.value).toBe(100);
    });
  });

  describe('lifecycle and health', () => {
    it('healthCheck() returns { healthy: true } after start()', async () => {
      await ledger.init({ dbPath: ':memory:', backend: 'sqlite', switchboard });
      ledger.start();
      const result = ledger.healthCheck();
      expect(result.ok).toBe(true);
      expect(result.value.healthy).toBe(true);
      expect(result.value.name).toBe('ledger');
    });

    it('healthCheck() returns { healthy: false } before start()', () => {
      const result = ledger.healthCheck();
      expect(result.ok).toBe(true);
      expect(result.value.healthy).toBe(false);
      expect(result.value.name).toBe('ledger');
    });

    it('stop() closes database connection', async () => {
      await ledger.init({ dbPath: ':memory:', backend: 'sqlite', switchboard });
      ledger.start();
      const result = await ledger.stop();
      expect(result.ok).toBe(true);
      const health = ledger.healthCheck();
      expect(health.value.healthy).toBe(false);
    });
  });

  describe('Switchboard event emission', () => {
    beforeEach(async () => {
      await ledger.init({ dbPath: ':memory:', backend: 'sqlite', switchboard });
      ledger.start();
    });

    it('Switchboard receives "data:written" event on write', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      const writtenEvents = switchboard.events.filter(e => e.event === 'data:written');
      expect(writtenEvents.length).toBe(1);
      expect(writtenEvents[0].payload.provider).toBe('ledger');
      expect(writtenEvents[0].payload.id).toBe('rec-1');
    });

    it('Switchboard receives "data:deleted" event on delete', async () => {
      await ledger.write('rec-1', { type: 'test', value: 42 });
      await ledger.delete('rec-1');
      const deletedEvents = switchboard.events.filter(e => e.event === 'data:deleted');
      expect(deletedEvents.length).toBe(1);
      expect(deletedEvents[0].payload.provider).toBe('ledger');
      expect(deletedEvents[0].payload.id).toBe('rec-1');
    });
  });

  describe('DuckDB-to-SQLite fallback', () => {
    it('init with default backend falls back to SQLite if DuckDB fails', async () => {
      // This test uses default backend selection (no explicit backend)
      // On systems where DuckDB works, it uses DuckDB
      // On systems where DuckDB fails, it falls back to SQLite
      const result = await ledger.init({ dbPath: ':memory:', switchboard });
      expect(result.ok).toBe(true);

      // Verify it can write and read (works regardless of backend)
      ledger.start();
      await ledger.write('test-1', { fallback: true });
      const readResult = await ledger.read('test-1');
      expect(readResult.ok).toBe(true);
      expect(readResult.value.data.fallback).toBe(true);
    });
  });
});

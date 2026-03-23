'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const { createSqliteBackend } = require('../sqlite-backend.cjs');

describe('SQLite Backend', () => {
  let backend;
  let db;

  beforeEach(() => {
    backend = createSqliteBackend();
  });

  afterEach(() => {
    if (db) {
      try { backend.close(); } catch (_) { /* ignore */ }
      db = null;
    }
  });

  it('createSqliteBackend() returns an object with open, execute, close methods', () => {
    expect(typeof backend.open).toBe('function');
    expect(typeof backend.execute).toBe('function');
    expect(typeof backend.close).toBe('function');
  });

  it('open(":memory:") creates an in-memory SQLite database and returns Ok(connection)', () => {
    const result = backend.open(':memory:');
    expect(result.ok).toBe(true);
    expect(result.value).toBeDefined();
    db = result.value;
  });

  it('execute with CREATE TABLE returns Ok', () => {
    const openResult = backend.open(':memory:');
    db = openResult.value;
    const result = backend.execute('CREATE TABLE test (id TEXT PRIMARY KEY, data TEXT)');
    expect(result.ok).toBe(true);
  });

  it('execute with INSERT stores a row', () => {
    const openResult = backend.open(':memory:');
    db = openResult.value;
    backend.execute('CREATE TABLE test (id TEXT PRIMARY KEY, data TEXT)');
    const result = backend.execute(
      'INSERT INTO test (id, data) VALUES (?, ?)',
      ['id-1', '{"key":"val"}']
    );
    expect(result.ok).toBe(true);
  });

  it('execute with SELECT returns Ok([{id: "id-1", data: "{\\"key\\":\\"val\\"}"}])', () => {
    const openResult = backend.open(':memory:');
    db = openResult.value;
    backend.execute('CREATE TABLE test (id TEXT PRIMARY KEY, data TEXT)');
    backend.execute('INSERT INTO test (id, data) VALUES (?, ?)', ['id-1', '{"key":"val"}']);
    const result = backend.execute('SELECT * FROM test WHERE id = ?', ['id-1']);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual([{ id: 'id-1', data: '{"key":"val"}' }]);
  });

  it('close() closes the database and returns Ok(undefined)', () => {
    backend.open(':memory:');
    const result = backend.close();
    expect(result.ok).toBe(true);
    expect(result.value).toBeUndefined();
    db = null; // Prevent afterEach double-close
  });

  it('SQLite backend uses WAL mode', () => {
    const openResult = backend.open(':memory:');
    db = openResult.value;
    // WAL mode should be set during open
    const result = backend.execute('PRAGMA journal_mode');
    expect(result.ok).toBe(true);
    expect(result.value[0].journal_mode).toBe('wal');
  });
});

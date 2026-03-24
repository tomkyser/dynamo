'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const { Database } = require('bun:sqlite');

/**
 * Creates a SQLite backend for the Ledger provider.
 *
 * Uses bun:sqlite (built-in, synchronous API) as a fallback when DuckDB
 * native bindings are unavailable. Implements the same open/execute/close
 * interface as the DuckDB backend for uniform backend switching.
 *
 * All methods return Result types (Ok/Err) for consistency.
 * Methods are synchronous (bun:sqlite is sync), but wrapped in ok() for
 * the uniform interface. The Ledger facade handles async/sync differences.
 *
 * @returns {{ open: Function, execute: Function, close: Function }}
 */
function createSqliteBackend() {
  /** @type {import('bun:sqlite').Database|null} */
  let _db = null;

  /**
   * Opens a SQLite database at the given path.
   * Sets WAL mode and foreign keys, then creates the records table.
   *
   * @param {string} dbPath - Path to SQLite database file, or ':memory:' for in-memory
   * @returns {import('../../../lib/result.cjs').Result<import('bun:sqlite').Database>}
   */
  function open(dbPath) {
    try {
      _db = new Database(dbPath, { create: true });
      _db.exec('PRAGMA journal_mode = WAL');
      _db.exec('PRAGMA foreign_keys = ON');
      _db.exec(`
        CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      return ok(_db);
    } catch (e) {
      return err('SQLITE_ERROR', `Failed to open SQLite database: ${e.message}`, { dbPath });
    }
  }

  /**
   * Executes a SQL statement against the open database.
   *
   * SELECT queries return Ok([rows]) as an array of objects.
   * Non-SELECT queries return Ok(undefined).
   *
   * @param {string} sql - SQL statement to execute
   * @param {Array} [params=[]] - Bind parameters
   * @returns {import('../../../lib/result.cjs').Result<Array<Object>|undefined>}
   */
  function execute(sql, params = []) {
    try {
      if (!_db) {
        return err('SQLITE_ERROR', 'Database not open');
      }

      const trimmed = sql.trimStart();
      if (/^SELECT\b/i.test(trimmed) || /^PRAGMA\b/i.test(trimmed)) {
        const rows = _db.prepare(sql).all(...params);
        return ok(rows);
      }

      _db.prepare(sql).run(...params);
      return ok(undefined);
    } catch (e) {
      return err('SQLITE_ERROR', `SQLite execute failed: ${e.message}`, { sql });
    }
  }

  /**
   * Closes the database connection.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function close() {
    try {
      if (_db) {
        _db.close();
        _db = null;
      }
      return ok(undefined);
    } catch (e) {
      return err('SQLITE_ERROR', `Failed to close SQLite database: ${e.message}`);
    }
  }

  return { open, execute, close };
}

module.exports = { createSqliteBackend };

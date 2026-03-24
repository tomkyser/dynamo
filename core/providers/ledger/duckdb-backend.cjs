'use strict';

const { ok, err } = require('../../../lib/index.cjs');

// Attempt to load DuckDB at module level.
// If N-API bindings fail (crash, missing native module), export a stub
// that returns Err('DUCKDB_UNAVAILABLE') from open().
let duckdb;
let _duckdbLoadError = null;

try {
  duckdb = require('@duckdb/node-api');
} catch (e) {
  _duckdbLoadError = e.message;
}

/**
 * Creates a DuckDB backend for the Ledger provider.
 *
 * Uses @duckdb/node-api for embedded DuckDB access. If the native module
 * failed to load, open() returns Err('DUCKDB_UNAVAILABLE') so the Ledger
 * factory can fall back to SQLite.
 *
 * All methods are async (DuckDB N-API is async) and return Result types.
 *
 * @returns {{ open: Function, execute: Function, close: Function }}
 */
function createDuckDBBackend() {
  /** @type {Object|null} */
  let _instance = null;

  /** @type {Object|null} */
  let _connection = null;

  /**
   * Opens a DuckDB instance at the given path.
   * Creates the records table if it does not exist.
   *
   * @param {string} dbPath - Path to DuckDB database file, or ':memory:' for in-memory
   * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
   */
  async function open(dbPath) {
    if (_duckdbLoadError) {
      return err('DUCKDB_UNAVAILABLE', `DuckDB native module failed to load: ${_duckdbLoadError}`);
    }

    try {
      _instance = await duckdb.DuckDBInstance.create(dbPath);
      _connection = await _instance.connect();

      // Create records table
      await _connection.run(`
        CREATE TABLE IF NOT EXISTS records (
          id VARCHAR PRIMARY KEY,
          data JSON NOT NULL,
          created_at TIMESTAMP DEFAULT current_timestamp,
          updated_at TIMESTAMP DEFAULT current_timestamp
        )
      `);

      return ok({ instance: _instance, connection: _connection });
    } catch (e) {
      return err('DUCKDB_ERROR', `Failed to open DuckDB: ${e.message}`, { dbPath });
    }
  }

  /**
   * Executes a SQL statement against the open DuckDB connection.
   *
   * SELECT queries return Ok([rows]) as an array of row objects.
   * Non-SELECT queries return Ok(undefined).
   *
   * Uses prepared statements with parameter binding for safety.
   *
   * @param {string} sql - SQL statement to execute
   * @param {Array} [params=[]] - Bind parameters (positional: $1, $2, ...)
   * @returns {Promise<import('../../../lib/result.cjs').Result<Array<Object>|undefined>>}
   */
  async function execute(sql, params = []) {
    try {
      if (!_connection) {
        return err('DUCKDB_ERROR', 'Connection not open');
      }

      const trimmed = sql.trimStart();
      const isSelect = /^SELECT\b/i.test(trimmed);

      if (params.length > 0) {
        const prepared = await _connection.prepare(sql);

        for (let i = 0; i < params.length; i++) {
          prepared.bindVarchar(i + 1, String(params[i]));
        }

        if (isSelect) {
          const result = await prepared.runAndReadAll();
          return ok(result.getRowObjects());
        }

        await prepared.run();
        return ok(undefined);
      }

      // No params path
      if (isSelect) {
        const result = await _connection.runAndReadAll(sql);
        return ok(result.getRowObjects());
      }

      await _connection.run(sql);
      return ok(undefined);
    } catch (e) {
      return err('DUCKDB_ERROR', `DuckDB execute failed: ${e.message}`, { sql });
    }
  }

  /**
   * Closes the DuckDB connection and instance.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function close() {
    try {
      if (_connection) {
        _connection.closeSync();
        _connection = null;
      }
      if (_instance) {
        _instance.closeSync();
        _instance = null;
      }
      return ok(undefined);
    } catch (e) {
      return err('DUCKDB_ERROR', `Failed to close DuckDB: ${e.message}`);
    }
  }

  return { open, execute, close };
}

module.exports = { createDuckDBBackend };

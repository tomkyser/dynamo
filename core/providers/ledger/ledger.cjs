'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const { validateDataProvider } = require('./provider.cjs');
const { createDuckDBBackend } = require('./duckdb-backend.cjs');
const { createSqliteBackend } = require('./sqlite-backend.cjs');

/**
 * Creates a Ledger data provider instance.
 *
 * Ledger is the SQL data layer for the Dynamo platform. It implements the
 * DATA_PROVIDER_SHAPE contract with a uniform read/write/query/delete
 * interface backed by either DuckDB or bun:sqlite.
 *
 * Backend selection (per D-04/D-05):
 * 1. If `backend: 'sqlite'` specified, use bun:sqlite directly
 * 2. If `backend: 'duckdb'` specified, use DuckDB directly
 * 3. Default: try DuckDB first, fall back to SQLite on failure
 *
 * Every write and delete emits events to Switchboard if provided:
 * - 'data:written' on successful write/upsert
 * - 'data:deleted' on successful delete
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createLedger() {
  /** @type {boolean} */
  let _started = false;

  /** @type {{ open: Function, execute: Function, close: Function }|null} */
  let _backend = null;

  /** @type {Object|null} */
  let _switchboard = null;

  /** @type {string|null} */
  let _dbPath = null;

  /** @type {'sqlite'|'duckdb'} */
  let _backendType = 'sqlite';

  /**
   * Initialize the Ledger with a database backend.
   *
   * @param {Object} options
   * @param {string} options.dbPath - Database file path or ':memory:'
   * @param {string} [options.backend] - 'sqlite' or 'duckdb' (default: auto with DuckDB preference)
   * @param {Object} [options.switchboard] - Switchboard service for event emission
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function init(options) {
    if (!options || !options.dbPath) {
      return err('INIT_FAILED', 'Ledger init requires dbPath');
    }

    _switchboard = options.switchboard || null;
    _dbPath = options.dbPath;

    // Backend selection per D-04/D-05
    if (options.backend === 'sqlite') {
      _backend = createSqliteBackend();
      _backendType = 'sqlite';
      const openResult = _backend.open(_dbPath);
      if (!openResult.ok) return openResult;
      return ok(undefined);
    }

    if (options.backend === 'duckdb') {
      _backend = createDuckDBBackend();
      _backendType = 'duckdb';
      const openResult = await _backend.open(_dbPath);
      if (!openResult.ok) return openResult;
      return ok(undefined);
    }

    // Default: try DuckDB first, fall back to SQLite
    const duckBackend = createDuckDBBackend();
    const duckResult = await duckBackend.open(_dbPath);
    if (duckResult.ok) {
      _backend = duckBackend;
      _backendType = 'duckdb';
      return ok(undefined);
    }

    // DuckDB failed -- fall back to SQLite
    _backend = createSqliteBackend();
    _backendType = 'sqlite';
    const sqliteResult = _backend.open(_dbPath);
    if (!sqliteResult.ok) return sqliteResult;
    return ok(undefined);
  }

  /**
   * Start the Ledger service, enabling health reporting.
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Ledger service and close the database connection.
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function stop() {
    if (_backend) {
      const result = await _backend.close();
      if (!result.ok) return result;
      _backend = null;
    }
    _started = false;
    return ok(undefined);
  }

  /**
   * Check whether the Ledger service is healthy (started).
   * @returns {import('../../../lib/result.cjs').Result<{ healthy: boolean, name: string }>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'ledger' });
  }

  /**
   * Read a single record by ID.
   *
   * @param {string} id - Record identifier
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ id: string, data: Object, created_at: string, updated_at: string }>>}
   */
  async function read(id) {
    const sql = 'SELECT id, data, created_at, updated_at FROM records WHERE id = ?';
    const params = _backendType === 'duckdb' ? [id] : [id];
    const sqlStr = _backendType === 'duckdb'
      ? 'SELECT id, data, created_at, updated_at FROM records WHERE id = $1'
      : sql;

    const result = await _backend.execute(sqlStr, params);
    if (!result.ok) return result;

    const rows = result.value;
    if (!rows || rows.length === 0) {
      return err('NOT_FOUND', `Record not found: ${id}`, { id });
    }

    const row = rows[0];
    let parsedData;
    try {
      parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    } catch (e) {
      parsedData = row.data;
    }

    return ok({
      id: row.id,
      data: parsedData,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  /**
   * Write (upsert) a record.
   *
   * @param {string} id - Record identifier
   * @param {Object} data - The data object to store
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function write(id, data) {
    const jsonStr = JSON.stringify(data);

    let sql;
    let params;
    if (_backendType === 'duckdb') {
      sql = 'INSERT OR REPLACE INTO records (id, data, updated_at) VALUES ($1, $2, current_timestamp)';
      params = [id, jsonStr];
    } else {
      sql = "INSERT INTO records (id, data, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at";
      params = [id, jsonStr];
    }

    const result = await _backend.execute(sql, params);
    if (!result.ok) return result;

    // Emit data:written event
    if (_switchboard) {
      _switchboard.emit('data:written', { provider: 'ledger', id, data });
    }

    return ok(undefined);
  }

  /**
   * Query records by criteria.
   *
   * Criteria is a plain object whose keys map to JSON fields in the data column.
   * Empty criteria ({} or null) returns all records.
   * Special key `_limit` controls result count.
   *
   * @param {Object} criteria - Query criteria (per D-03)
   * @returns {Promise<import('../../../lib/result.cjs').Result<Array<{ id: string, data: Object, created_at: string, updated_at: string }>>>}
   */
  async function query(criteria) {
    let sql = 'SELECT id, data, created_at, updated_at FROM records';
    const params = [];
    const conditions = [];

    if (criteria && typeof criteria === 'object') {
      const keys = Object.keys(criteria).filter(k => k !== '_limit');

      for (const key of keys) {
        if (_backendType === 'duckdb') {
          conditions.push(`json_extract_string(data, '$.${key}') = $${params.length + 1}`);
        } else {
          conditions.push(`json_extract(data, '$.${key}') = ?`);
        }
        // json_extract returns raw values (strings unquoted, numbers as-is)
        // json_extract_string (DuckDB) returns strings directly
        const val = criteria[key];
        params.push(String(val));
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (criteria && criteria._limit) {
      sql += ` LIMIT ${Number(criteria._limit)}`;
    }

    const result = await _backend.execute(sql, params);
    if (!result.ok) return result;

    const records = result.value.map(row => {
      let parsedData;
      try {
        parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      } catch (e) {
        parsedData = row.data;
      }
      return {
        id: row.id,
        data: parsedData,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return ok(records);
  }

  /**
   * Delete a record by ID.
   *
   * @param {string} id - Record identifier
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function del(id) {
    // Check existence first
    const checkSql = _backendType === 'duckdb'
      ? 'SELECT id FROM records WHERE id = $1'
      : 'SELECT id FROM records WHERE id = ?';

    const checkResult = await _backend.execute(checkSql, [id]);
    if (!checkResult.ok) return checkResult;

    if (!checkResult.value || checkResult.value.length === 0) {
      return err('NOT_FOUND', `Record not found: ${id}`, { id });
    }

    const deleteSql = _backendType === 'duckdb'
      ? 'DELETE FROM records WHERE id = $1'
      : 'DELETE FROM records WHERE id = ?';

    const deleteResult = await _backend.execute(deleteSql, [id]);
    if (!deleteResult.ok) return deleteResult;

    // Emit data:deleted event
    if (_switchboard) {
      _switchboard.emit('data:deleted', { provider: 'ledger', id });
    }

    return ok(undefined);
  }

  return validateDataProvider('ledger', {
    init,
    start,
    stop,
    healthCheck,
    read,
    write,
    query,
    delete: del
  });
}

module.exports = { createLedger };

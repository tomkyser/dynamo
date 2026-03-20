// Dynamo > Terminus > session-store.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const resolve = require('../../lib/resolve.cjs');
const { logError } = require(resolve('lib', 'core.cjs'));

const DEFAULT_DB_PATH = path.join(os.homedir(), '.claude', 'graphiti', 'sessions.db');

// --- Availability detection ---

let _sqliteAvailable = null;

/**
 * Check if node:sqlite is available on this Node.js runtime.
 * Lazy-evaluated once on first call. Logs a warning on first failure.
 * @returns {boolean}
 */
function isAvailable() {
  if (_sqliteAvailable === null) {
    try {
      require('node:sqlite');
      _sqliteAvailable = true;
    } catch (e) {
      _sqliteAvailable = false;
      logError('session-store', 'node:sqlite not available, falling back to JSON: ' + e.message);
    }
  }
  return _sqliteAvailable;
}

// --- Connection management ---

const _connections = new Map();

/**
 * Get or create a DatabaseSync connection for the given dbPath.
 * Creates the sessions table and project index on first call per dbPath.
 * Enables WAL mode and PRAGMA synchronous=NORMAL.
 * @param {string} [dbPath] - Path to SQLite database file (defaults to DEFAULT_DB_PATH)
 * @returns {DatabaseSync}
 */
function getDb(dbPath) {
  dbPath = dbPath || DEFAULT_DB_PATH;
  if (_connections.has(dbPath)) {
    const existing = _connections.get(dbPath);
    if (existing.isOpen) return existing;
    _connections.delete(dbPath);
  }
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA synchronous=NORMAL');
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    timestamp TEXT PRIMARY KEY,
    project TEXT,
    label TEXT,
    labeled_by TEXT,
    named_phase TEXT
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project)');
  _connections.set(dbPath, db);
  return db;
}

/**
 * Close a database connection and remove it from the connection map.
 * @param {string} [dbPath] - Path to SQLite database file (defaults to DEFAULT_DB_PATH)
 */
function closeDb(dbPath) {
  dbPath = dbPath || DEFAULT_DB_PATH;
  const db = _connections.get(dbPath);
  if (db && db.isOpen) db.close();
  _connections.delete(dbPath);
}

// --- CRUD operations ---

/**
 * Insert or replace a session row (upsert semantics).
 * @param {string} timestamp - Session timestamp (ISO-8601, primary key)
 * @param {string} project - Project name
 * @param {string} label - Session label
 * @param {string} labeledBy - 'auto' or 'user'
 * @param {string|null} namedPhase - Named phase or null
 * @param {object} [options] - { dbPath }
 */
function upsertSession(timestamp, project, label, labeledBy, namedPhase, options) {
  options = options || {};
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const db = getDb(dbPath);
  db.prepare(
    'INSERT OR REPLACE INTO sessions (timestamp, project, label, labeled_by, named_phase) VALUES (?, ?, ?, ?, ?)'
  ).run(timestamp, project || '', label || '', labeledBy || '', namedPhase || null);
}

/**
 * Get a single session by timestamp.
 * Returns null (not undefined) when row is not found.
 * @param {string} timestamp - Session timestamp to look up
 * @param {object} [options] - { dbPath }
 * @returns {object|null}
 */
function getSession(timestamp, options) {
  options = options || {};
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const db = getDb(dbPath);
  const row = db.prepare('SELECT * FROM sessions WHERE timestamp = ?').get(timestamp);
  return row ? { ...row } : null;
}

/**
 * Get all sessions, optionally filtered by project and/or limited.
 * Results are sorted by timestamp DESC.
 * @param {object} [options] - { dbPath, project, limit }
 * @returns {Array<object>}
 */
function getAllSessions(options) {
  options = options || {};
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const db = getDb(dbPath);

  let query = 'SELECT * FROM sessions';
  const params = [];

  if (options.project) {
    query += ' WHERE project = ?';
    params.push(options.project);
  }

  query += ' ORDER BY timestamp DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({ ...r }));
}

/**
 * Delete a session by timestamp.
 * @param {string} timestamp - Session timestamp to delete
 * @param {object} [options] - { dbPath }
 * @returns {boolean} true if a row was deleted, false otherwise
 */
function deleteSession(timestamp, options) {
  options = options || {};
  const dbPath = options.dbPath || DEFAULT_DB_PATH;
  const db = getDb(dbPath);
  const result = db.prepare('DELETE FROM sessions WHERE timestamp = ?').run(timestamp);
  return result.changes > 0;
}

// --- Migration ---

/**
 * Migrate sessions from a JSON file into SQLite.
 * Uses INSERT OR IGNORE for idempotency (does not overwrite existing SQLite data).
 * Invalid entries (missing/non-string timestamp) are skipped with a log warning.
 * The entire migration runs in a single transaction with rollback on error.
 * @param {string} jsonPath - Path to sessions.json file
 * @param {string} [dbPath] - Path to SQLite database file
 * @param {object} [options] - Reserved for future use
 * @returns {{ migrated: number, skipped: number, status: string }}
 */
function migrateFromJson(jsonPath, dbPath, options) {
  options = options || {};
  if (!isAvailable()) return { migrated: 0, skipped: 0, status: 'no-sqlite' };

  const db = getDb(dbPath);
  let sessions;
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    sessions = JSON.parse(content);
    if (!Array.isArray(sessions)) {
      return { migrated: 0, skipped: 0, status: 'invalid-format' };
    }
  } catch (e) {
    if (e.code === 'ENOENT') return { migrated: 0, skipped: 0, status: 'no-file' };
    return { migrated: 0, skipped: 0, status: 'parse-error', error: e.message };
  }

  const ins = db.prepare(
    'INSERT OR IGNORE INTO sessions (timestamp, project, label, labeled_by, named_phase) VALUES (?, ?, ?, ?, ?)'
  );

  let migrated = 0;
  let skipped = 0;
  db.exec('BEGIN');
  try {
    for (const entry of sessions) {
      if (!entry || typeof entry.timestamp !== 'string') {
        skipped++;
        logError('session-migration', 'Skipping invalid entry: ' + JSON.stringify(entry));
        continue;
      }
      ins.run(
        entry.timestamp,
        entry.project || '',
        entry.label || '',
        entry.labeled_by || '',
        entry.named_phase || null
      );
      migrated++;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  return { migrated, skipped, status: 'ok' };
}

// --- Exports ---

module.exports = {
  isAvailable,
  getDb,
  closeDb,
  upsertSession,
  getSession,
  getAllSessions,
  deleteSession,
  migrateFromJson,
  DEFAULT_DB_PATH
};

// Dynamo > Ledger > sessions.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const resolve = require('../../lib/resolve.cjs');
const { logError } = require(resolve('lib', 'core.cjs'));
const sessionStore = require(resolve('terminus', 'session-store.cjs'));

// --- Constants ---

const SESSIONS_FILE = path.join(os.homedir(), '.claude', 'graphiti', 'sessions.json');

// --- Helpers ---

/**
 * Derive SQLite DB path from filePath option for test isolation.
 * When filePath is provided (tests), use sibling .db file.
 * When filePath is not provided, use session-store's default.
 * @param {string} [filePath]
 * @returns {string|undefined}
 */
function dbPathFrom(filePath) {
  if (!filePath) return undefined; // session-store uses DEFAULT_DB_PATH
  return filePath.replace(/\.json$/, '.db');
}

// --- Core I/O ---

/**
 * Load sessions from storage.
 * When SQLite is available, delegates to session-store.getAllSessions.
 * Falls back to JSON file if SQLite is unavailable.
 * Returns empty array if file is missing, corrupt, or non-array.
 * @param {string} [filePath] - Path to sessions.json (defaults to SESSIONS_FILE)
 * @returns {Array}
 */
function loadSessions(filePath) {
  // loadSessions always reads from JSON file.
  // Since saveSessions/indexSession/labelSession/backfillSessions all dual-write to JSON,
  // the JSON file stays in sync with SQLite. Reading from JSON preserves insertion order
  // which existing tests rely on. Higher-level functions (listSessions, viewSession, etc.)
  // delegate directly to SQLite for sorted/filtered queries.
  filePath = filePath || SESSIONS_FILE;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

/**
 * Save sessions to storage.
 * When SQLite is available, syncs full array to SQLite.
 * ALWAYS writes JSON file for backward compatibility and test compatibility.
 * @param {Array} sessions - Array of session entries
 * @param {string} [filePath] - Path to sessions.json (defaults to SESSIONS_FILE)
 */
function saveSessions(sessions, filePath) {
  if (sessionStore.isAvailable()) {
    const dbPath = dbPathFrom(filePath);
    const db = sessionStore.getDb(dbPath);
    if (db) {
      db.exec('DELETE FROM sessions');
      const ins = db.prepare(
        'INSERT INTO sessions (timestamp, project, label, labeled_by, named_phase) VALUES (?, ?, ?, ?, ?)'
      );
      for (const s of sessions) {
        ins.run(s.timestamp, s.project || '', s.label || '', s.labeled_by || '', s.named_phase || null);
      }
    }
  }
  // ALWAYS write JSON (backward compatibility + test compatibility)
  filePath = filePath || SESSIONS_FILE;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

// --- Session CRUD ---

/**
 * Add or update a session entry.
 * Never overwrites entries where labeled_by is 'user'.
 * Does not overwrite existing label with empty string.
 * @param {string} timestamp - Session timestamp (ISO-8601)
 * @param {string} project - Project name
 * @param {string} label - Session label
 * @param {string} labeledBy - 'auto' or 'user'
 * @param {object} [options] - { filePath, namedPhase }
 */
function indexSession(timestamp, project, label, labeledBy, options) {
  options = options || {};
  if (sessionStore.isAvailable()) {
    const dbPath = dbPathFrom(options.filePath);
    const filePath = options.filePath || SESSIONS_FILE;
    // Check existing entry for protection rules
    const existing = sessionStore.getSession(timestamp, { dbPath });
    if (existing) {
      // Never overwrite user labels
      if (existing.labeled_by === 'user') return;
      // Don't replace existing label with empty string
      if (!label && existing.label) return;
      // Update fields (preserve project if new is empty/'unknown')
      const newProject = (project && project !== 'unknown') ? project : existing.project;
      const newNamedPhase = options.namedPhase || existing.named_phase;
      sessionStore.upsertSession(timestamp, newProject, label, labeledBy, newNamedPhase, { dbPath });
      // Update JSON copy in-place (preserve ordering)
      const jsonSessions = _readJson(filePath);
      const jsonEntry = jsonSessions.find(s => s.timestamp === timestamp);
      if (jsonEntry) {
        jsonEntry.label = label;
        jsonEntry.labeled_by = labeledBy;
        if (options.namedPhase) jsonEntry.named_phase = options.namedPhase;
        if (project && project !== 'unknown') jsonEntry.project = newProject;
      }
      _writeJson(jsonSessions, filePath);
    } else {
      // Create new entry
      sessionStore.upsertSession(timestamp, project, label, labeledBy, options.namedPhase || null, { dbPath });
      // Append to JSON copy (preserve ordering)
      const jsonSessions = _readJson(filePath);
      const entry = { timestamp, project, label, labeled_by: labeledBy };
      if (options.namedPhase) entry.named_phase = options.namedPhase;
      jsonSessions.push(entry);
      _writeJson(jsonSessions, filePath);
    }
    return;
  }
  // JSON fallback (unchanged)
  const filePath = options.filePath || SESSIONS_FILE;
  const sessions = loadSessions(filePath);
  const existingJson = sessions.find(s => s.timestamp === timestamp);

  if (existingJson) {
    // Never overwrite user labels (regression test 12 contract)
    if (existingJson.labeled_by === 'user') return;
    // Don't replace existing label with empty string
    if (!label && existingJson.label) return;
    // Update fields
    existingJson.label = label;
    existingJson.labeled_by = labeledBy;
    // Update named_phase if provided (regression test 11 contract)
    if (options.namedPhase) {
      existingJson.named_phase = options.namedPhase;
    }
    // Update project if non-empty and not 'unknown'
    if (project && project !== 'unknown') {
      existingJson.project = project;
    }
  } else {
    // Create new entry
    const entry = {
      timestamp,
      project,
      label,
      labeled_by: labeledBy
    };
    // Add named_phase if provided
    if (options.namedPhase) {
      entry.named_phase = options.namedPhase;
    }
    sessions.push(entry);
  }

  saveSessions(sessions, filePath);
}

/**
 * List sessions, optionally filtered and limited.
 * Returns entries sorted by timestamp descending.
 * @param {object} [options] - { filePath, project, limit }
 * @returns {Array}
 */
function listSessions(options) {
  options = options || {};
  if (sessionStore.isAvailable()) {
    return sessionStore.getAllSessions({
      dbPath: dbPathFrom(options.filePath),
      project: options.project,
      limit: options.limit
    });
  }
  // JSON fallback
  const filePath = options.filePath || SESSIONS_FILE;
  let sessions = loadSessions(filePath);
  if (options.project) sessions = sessions.filter(s => s.project === options.project);
  sessions.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  if (options.limit) sessions = sessions.slice(0, options.limit);
  return sessions;
}

/**
 * View a single session entry by timestamp.
 * @param {string} timestamp - Session timestamp to find
 * @param {object} [options] - { filePath }
 * @returns {object|null}
 */
function viewSession(timestamp, options) {
  options = options || {};
  if (sessionStore.isAvailable()) {
    return sessionStore.getSession(timestamp, { dbPath: dbPathFrom(options.filePath) });
  }
  // JSON fallback
  const filePath = options.filePath || SESSIONS_FILE;
  const sessions = loadSessions(filePath);
  const entry = sessions.find(s => s.timestamp === timestamp);
  return entry || null;
}

/**
 * Set a user label on a session entry.
 * @param {string} timestamp - Session timestamp to label
 * @param {string} label - Label text
 * @param {object} [options] - { filePath }
 * @returns {boolean} - true if found and labeled, false if not found
 */
function labelSession(timestamp, label, options) {
  options = options || {};
  if (sessionStore.isAvailable()) {
    const dbPath = dbPathFrom(options.filePath);
    const filePath = options.filePath || SESSIONS_FILE;
    const existing = sessionStore.getSession(timestamp, { dbPath });
    if (!existing) return false;
    sessionStore.upsertSession(timestamp, existing.project, label, 'user', existing.named_phase, { dbPath });
    // Update JSON copy in-place (preserve ordering)
    const jsonSessions = _readJson(filePath);
    const jsonEntry = jsonSessions.find(s => s.timestamp === timestamp);
    if (jsonEntry) {
      jsonEntry.label = label;
      jsonEntry.labeled_by = 'user';
    }
    _writeJson(jsonSessions, filePath);
    return true;
  }
  // JSON fallback
  const filePath = options.filePath || SESSIONS_FILE;
  const sessions = loadSessions(filePath);
  const entry = sessions.find(s => s.timestamp === timestamp);
  if (!entry) return false;
  entry.label = label;
  entry.labeled_by = 'user';
  saveSessions(sessions, filePath);
  return true;
}

/**
 * Backfill sessions with empty labels using a name generator function.
 * Skips entries where labeled_by is 'user'.
 * @param {Function} nameGenerator - async (entry) => string
 * @param {object} [options] - { filePath }
 * @returns {Promise<number>} - Count of backfilled entries
 */
async function backfillSessions(nameGenerator, options) {
  options = options || {};
  if (sessionStore.isAvailable()) {
    const dbPath = dbPathFrom(options.filePath);
    const filePath = options.filePath || SESSIONS_FILE;
    // Load from JSON to preserve insertion order for dual-write
    const jsonSessions = _readJson(filePath);
    const sessions = sessionStore.getAllSessions({ dbPath });
    const candidates = sessions.filter(entry => !entry.label && entry.labeled_by !== 'user');
    let count = 0;
    for (const entry of candidates) {
      try {
        const name = await nameGenerator(entry);
        if (name) {
          sessionStore.upsertSession(entry.timestamp, entry.project, name, 'auto', entry.named_phase, { dbPath });
          // Also update the JSON copy
          const jsonEntry = jsonSessions.find(s => s.timestamp === entry.timestamp);
          if (jsonEntry) {
            jsonEntry.label = name;
            jsonEntry.labeled_by = 'auto';
          }
          count++;
        }
      } catch (e) {
        logError('backfillSessions', 'Name generation failed for ' + entry.timestamp + ': ' + e.message);
      }
    }
    if (count > 0) {
      _writeJson(jsonSessions, filePath);
    }
    return count;
  }
  // JSON fallback
  const filePath = options.filePath || SESSIONS_FILE;
  const sessions = loadSessions(filePath);
  const candidates = sessions.filter(entry =>
    !entry.label && entry.labeled_by !== 'user'
  );
  let count = 0;
  for (const entry of candidates) {
    try {
      const name = await nameGenerator(entry);
      if (name) {
        entry.label = name;
        entry.labeled_by = 'auto';
        count++;
      }
    } catch (e) {
      logError('backfillSessions', 'Name generation failed for ' + entry.timestamp + ': ' + e.message);
    }
  }
  if (count > 0) {
    saveSessions(sessions, filePath);
  }
  return count;
}

/**
 * Generate a name for a session and apply it via indexSession.
 * @param {string} timestamp - Session timestamp
 * @param {string} project - Project name
 * @param {Function} nameGenerator - async () => string
 * @param {string} namedPhase - 'preliminary' or 'refined'
 * @param {object} [options] - { filePath }
 * @returns {Promise<string>} - Generated name or empty string
 */
async function generateAndApplyName(timestamp, project, nameGenerator, namedPhase, options) {
  options = options || {};
  try {
    const name = await nameGenerator();
    if (name) {
      indexSession(timestamp, project, name, 'auto', { ...options, namedPhase });
      return name;
    }
  } catch (e) {
    logError('generateAndApplyName', 'Name generation failed: ' + e.message);
  }
  return '';
}

// --- Internal helpers ---

/**
 * Read sessions from JSON file (raw read helper for dual-write sync).
 * @param {string} filePath
 * @returns {Array}
 */
function _readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

/**
 * Write sessions array to JSON file (backward compatibility helper).
 * Used when SQLite is the primary store but JSON must stay in sync.
 * @param {Array} sessions
 * @param {string} filePath
 */
function _writeJson(sessions, filePath) {
  filePath = filePath || SESSIONS_FILE;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

// --- Exports ---

module.exports = {
  SESSIONS_FILE,
  loadSessions,
  saveSessions,
  indexSession,
  listSessions,
  viewSession,
  labelSession,
  backfillSessions,
  generateAndApplyName
};

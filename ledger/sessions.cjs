// Dynamo > Ledger > sessions.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const resolve = require('../lib/resolve.cjs');
const { logError } = require(resolve('dynamo', 'core.cjs'));

// --- Constants ---

const SESSIONS_FILE = path.join(os.homedir(), '.claude', 'graphiti', 'sessions.json');

// --- Core I/O ---

/**
 * Load sessions from JSON file.
 * Returns empty array if file is missing, corrupt, or non-array.
 * @param {string} [filePath] - Path to sessions.json (defaults to SESSIONS_FILE)
 * @returns {Array}
 */
function loadSessions(filePath) {
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
 * Save sessions to JSON file atomically (tmp + rename).
 * Creates parent directory if needed.
 * @param {Array} sessions - Array of session entries
 * @param {string} [filePath] - Path to sessions.json (defaults to SESSIONS_FILE)
 */
function saveSessions(sessions, filePath) {
  filePath = filePath || SESSIONS_FILE;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

// --- Session CRUD ---

/**
 * Add or update a session entry in sessions.json.
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
  const filePath = options.filePath || SESSIONS_FILE;
  const sessions = loadSessions(filePath);

  // Find existing entry by timestamp
  const existing = sessions.find(s => s.timestamp === timestamp);

  if (existing) {
    // Never overwrite user labels (regression test 12 contract)
    if (existing.labeled_by === 'user') return;

    // Don't replace existing label with empty string
    if (!label && existing.label) return;

    // Update fields
    existing.label = label;
    existing.labeled_by = labeledBy;

    // Update named_phase if provided (regression test 11 contract)
    if (options.namedPhase) {
      existing.named_phase = options.namedPhase;
    }

    // Update project if non-empty and not 'unknown'
    if (project && project !== 'unknown') {
      existing.project = project;
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
  const filePath = options.filePath || SESSIONS_FILE;
  let sessions = loadSessions(filePath);

  // Filter by project
  if (options.project) {
    sessions = sessions.filter(s => s.project === options.project);
  }

  // Sort by timestamp descending (newest first)
  sessions.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  // Apply limit
  if (options.limit) {
    sessions = sessions.slice(0, options.limit);
  }

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
  const filePath = options.filePath || SESSIONS_FILE;
  const sessions = loadSessions(filePath);

  // Find entries that need backfilling
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

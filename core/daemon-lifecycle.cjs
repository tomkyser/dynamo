'use strict';

const path = require('node:path');
const fs = require('node:fs');

/**
 * Daemon lifecycle utilities for PID management, stale detection,
 * daemon spawning, health polling, and structured logging.
 *
 * Used by both the thin client (bin/dynamo.cjs) and the daemon entry
 * point (core/daemon.cjs). The thin client uses spawnDaemon + waitForHealth.
 * The daemon uses writeDaemonFile + createDaemonLogger + removeDaemonFile.
 *
 * Per D-01, D-16: .dynamo/ directory contains runtime-only state.
 */

/** Maximum log file size in bytes before truncation (10MB) */
const MAX_LOG_BYTES = 10 * 1024 * 1024;

/** Bytes to keep when truncating from tail (5MB) */
const KEEP_LOG_BYTES = 5 * 1024 * 1024;

/** Default daemon port */
const DEFAULT_PORT = 9876;

/** Default daemon entry point */
const DEFAULT_DAEMON_ENTRY = 'core/daemon.cjs';

/** Health poll interval in ms */
const HEALTH_POLL_INTERVAL_MS = 200;

/**
 * Returns the path to the .dynamo/ runtime directory for the given project root.
 * Creates the directory if it does not exist.
 *
 * @param {string} projectRoot - Absolute path to the Dynamo project root
 * @returns {string} Absolute path to .dynamo/ directory
 */
function getDynamoDir(projectRoot) {
  const dir = path.join(projectRoot, '.dynamo');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Reads the daemon PID file (.dynamo/daemon.json).
 *
 * @param {string} projectRoot - Absolute path to the Dynamo project root
 * @returns {{ pid: number, port: number, started: string, version: string } | null}
 *   Parsed daemon file data, or null if file missing or corrupt.
 */
function readDaemonFile(projectRoot) {
  const filePath = path.join(projectRoot, '.dynamo', 'daemon.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

/**
 * Writes the daemon PID file (.dynamo/daemon.json) using atomic write pattern.
 * Writes to .tmp first, then renames to ensure no partial reads.
 *
 * @param {string} projectRoot - Absolute path to the Dynamo project root
 * @param {{ pid: number, port: number, started: string, version: string }} data
 */
function writeDaemonFile(projectRoot, data) {
  const dir = getDynamoDir(projectRoot);
  const filePath = path.join(dir, 'daemon.json');
  const tmpPath = path.join(dir, 'daemon.json.tmp');
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Removes the daemon PID file and any leftover .tmp file.
 * Silently ignores ENOENT (file already removed).
 *
 * @param {string} projectRoot - Absolute path to the Dynamo project root
 */
function removeDaemonFile(projectRoot) {
  const dir = path.join(projectRoot, '.dynamo');
  const filePath = path.join(dir, 'daemon.json');
  const tmpPath = path.join(dir, 'daemon.json.tmp');

  try { fs.unlinkSync(filePath); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  try { fs.unlinkSync(tmpPath); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

/**
 * Checks whether the daemon is currently running by reading the PID file
 * and verifying the process is alive via process.kill(pid, 0).
 *
 * On stale PID detection (process dead but file exists), removes the
 * daemon file and returns reason: 'stale_pid'.
 *
 * @param {string} projectRoot - Absolute path to the Dynamo project root
 * @returns {{ running: boolean, reason?: string, pid?: number, port?: number }}
 */
function isDaemonRunning(projectRoot) {
  const data = readDaemonFile(projectRoot);
  if (!data) {
    return { running: false, reason: 'no_pid_file' };
  }

  const { pid, port } = data;

  try {
    process.kill(pid, 0);
    return { running: true, pid, port };
  } catch (e) {
    // ESRCH = no such process. EPERM = process exists but no permission (still alive).
    if (e.code === 'ESRCH') {
      removeDaemonFile(projectRoot);
      return { running: false, reason: 'stale_pid', pid };
    }
    // EPERM means the process exists but we don't own it -- treat as running
    return { running: true, pid, port };
  }
}

/**
 * Spawns the daemon as a detached child process via nohup.
 *
 * The daemon process receives DYNAMO_DAEMON_MODE=1, DYNAMO_PORT, and
 * DYNAMO_PROJECT_ROOT via environment variables.
 *
 * @param {string} projectRoot - Absolute path to the Dynamo project root
 * @param {Object} [options={}]
 * @param {number} [options.port=9876] - Port for daemon HTTP server
 * @param {string} [options.daemonEntry='core/daemon.cjs'] - Entry point relative to projectRoot
 * @returns {{ proc: Object, logPath: string }}
 */
function spawnDaemon(projectRoot, options = {}) {
  const port = options.port || DEFAULT_PORT;
  const daemonEntry = options.daemonEntry || DEFAULT_DAEMON_ENTRY;
  const dir = getDynamoDir(projectRoot);
  const logPath = path.join(dir, 'dynamo.log');
  const entryPath = path.join(projectRoot, daemonEntry);

  const proc = Bun.spawn(['nohup', 'bun', entryPath], {
    env: {
      ...process.env,
      DYNAMO_DAEMON_MODE: '1',
      DYNAMO_PORT: String(port),
      DYNAMO_PROJECT_ROOT: projectRoot,
    },
    stdout: Bun.file(logPath),
    stderr: Bun.file(logPath),
    stdin: null,
  });

  proc.unref();

  return { proc, logPath };
}

/**
 * Polls GET /health on the given port until a 200 response with valid JSON
 * is received, or the timeout is exceeded.
 *
 * @param {number} port - Port to poll
 * @param {number} timeoutMs - Maximum time to wait in milliseconds
 * @returns {Promise<{ ok: boolean, data?: Object, error?: string }>}
 */
async function waitForHealth(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const url = `http://localhost:${port}/health`;

  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url);
      if (resp.status === 200) {
        const data = await resp.json();
        return { ok: true, data };
      }
    } catch (_e) {
      // Connection refused or other network error -- retry
    }
    await new Promise(resolve => setTimeout(resolve, HEALTH_POLL_INTERVAL_MS));
  }

  return { ok: false, error: 'timeout' };
}

/**
 * Creates a structured logger that appends to the given log file.
 *
 * Log format: [ISO-TIMESTAMP] [LEVEL] [source] message
 *
 * Implements a 10MB cap: when the log file reaches 10MB, the oldest
 * entries are removed (keep last 5MB).
 *
 * @param {string} logPath - Absolute path to the log file
 * @returns {{ info: Function, warn: Function, error: Function }}
 */
function createDaemonLogger(logPath) {
  function _write(level, source, msg) {
    const line = `[${new Date().toISOString()}] [${level}] [${source}] ${msg}\n`;

    // Check file size and truncate if needed
    try {
      const stat = fs.statSync(logPath);
      if (stat.size >= MAX_LOG_BYTES) {
        const buf = Buffer.alloc(KEEP_LOG_BYTES);
        const fd = fs.openSync(logPath, 'r');
        fs.readSync(fd, buf, 0, KEEP_LOG_BYTES, stat.size - KEEP_LOG_BYTES);
        fs.closeSync(fd);
        fs.writeFileSync(logPath, buf);
      }
    } catch (_e) {
      // File may not exist yet -- that's fine, appendFileSync will create it
    }

    fs.appendFileSync(logPath, line, 'utf-8');
  }

  return {
    info(source, msg) { _write('INFO', source, msg); },
    warn(source, msg) { _write('WARN', source, msg); },
    error(source, msg) { _write('ERROR', source, msg); },
  };
}

module.exports = {
  getDynamoDir,
  readDaemonFile,
  writeDaemonFile,
  removeDaemonFile,
  isDaemonRunning,
  spawnDaemon,
  waitForHealth,
  createDaemonLogger,
  // Constants exported for test access
  MAX_LOG_BYTES,
  KEEP_LOG_BYTES,
  DEFAULT_PORT,
  DEFAULT_DAEMON_ENTRY,
  HEALTH_POLL_INTERVAL_MS,
};

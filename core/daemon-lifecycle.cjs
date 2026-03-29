'use strict';

const path = require('node:path');
const fs = require('node:fs');

/**
 * Daemon lifecycle utilities -- PID file management, stale detection,
 * daemon spawning, health polling, and structured logging.
 *
 * Per D-01, D-16: daemon process management and PID/port persistence.
 */

const DEFAULT_PORT = 9876;
const LOG_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const LOG_KEEP_BYTES = 5 * 1024 * 1024; // Keep last 5MB on rotation

/**
 * Returns the .dynamo/ directory path. Creates it if it doesn't exist.
 *
 * @param {string} projectRoot
 * @returns {string}
 */
function getDynamoDir(projectRoot) {
  const dir = path.join(projectRoot, '.dynamo');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Reads .dynamo/daemon.json. Returns parsed JSON or null if missing.
 *
 * @param {string} projectRoot
 * @returns {{ pid: number, port: number, started: string, version: string } | null}
 */
function readDaemonFile(projectRoot) {
  try {
    const filePath = path.join(projectRoot, '.dynamo', 'daemon.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

/**
 * Writes { pid, port, started, version } to .dynamo/daemon.json.
 * Uses atomic write pattern: write to .tmp then rename.
 *
 * @param {string} projectRoot
 * @param {{ pid: number, port: number, started: string, version: string }} data
 */
function writeDaemonFile(projectRoot, data) {
  const dir = getDynamoDir(projectRoot);
  const filePath = path.join(dir, 'daemon.json');
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/**
 * Removes .dynamo/daemon.json and .dynamo/daemon.json.tmp (if exists).
 *
 * @param {string} projectRoot
 */
function removeDaemonFile(projectRoot) {
  const dir = path.join(projectRoot, '.dynamo');
  try { fs.unlinkSync(path.join(dir, 'daemon.json')); } catch (_e) { /* ENOENT ok */ }
  try { fs.unlinkSync(path.join(dir, 'daemon.json.tmp')); } catch (_e) { /* ENOENT ok */ }
}

/**
 * Checks if daemon is running by reading PID file and verifying liveness.
 *
 * @param {string} projectRoot
 * @returns {{ running: boolean, reason?: string, pid?: number, port?: number }}
 */
function isDaemonRunning(projectRoot) {
  const data = readDaemonFile(projectRoot);
  if (!data) {
    return { running: false, reason: 'no_pid_file' };
  }

  try {
    process.kill(data.pid, 0);
    return { running: true, pid: data.pid, port: data.port };
  } catch (_e) {
    // Process not found -- stale PID
    removeDaemonFile(projectRoot);
    return { running: false, reason: 'stale_pid', pid: data.pid };
  }
}

/**
 * Spawns the daemon as a detached child via nohup.
 *
 * @param {string} projectRoot
 * @param {Object} [options]
 * @param {number} [options.port]
 * @param {string} [options.daemonEntry]
 * @returns {{ proc: Object, logPath: string }}
 */
function spawnDaemon(projectRoot, options = {}) {
  const port = options.port || DEFAULT_PORT;
  const daemonEntry = options.daemonEntry || 'core/daemon.cjs';
  const dir = getDynamoDir(projectRoot);
  const logPath = path.join(dir, 'dynamo.log');

  const proc = Bun.spawn(['nohup', 'bun', path.join(projectRoot, daemonEntry)], {
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
 * Polls GET /health until success or timeout.
 *
 * @param {number} port
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<{ ok: boolean, data?: Object, error?: string }>}
 */
async function waitForHealth(port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.status === 200) {
        const data = await res.json();
        return { ok: true, data };
      }
    } catch (_e) {
      // Connection refused -- retry
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return { ok: false, error: 'timeout' };
}

/**
 * Creates a structured daemon logger.
 *
 * @param {string} logPath
 * @returns {{ info: Function, warn: Function, error: Function }}
 */
function createDaemonLogger(logPath) {
  function _write(level, source, msg) {
    const line = `[${new Date().toISOString()}] [${level}] [${source}] ${msg}\n`;

    // Log rotation: cap at 10MB
    try {
      const stat = fs.statSync(logPath);
      if (stat.size >= LOG_MAX_BYTES) {
        const buf = fs.readFileSync(logPath);
        const keep = buf.subarray(buf.length - LOG_KEEP_BYTES);
        fs.writeFileSync(logPath, keep);
      }
    } catch (_e) {
      // File may not exist yet -- that's fine
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
};

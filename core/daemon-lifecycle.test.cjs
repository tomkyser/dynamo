'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const {
  getDynamoDir,
  readDaemonFile,
  writeDaemonFile,
  removeDaemonFile,
  isDaemonRunning,
  createDaemonLogger,
} = require('./daemon-lifecycle.cjs');

/**
 * Creates a temporary directory for test isolation.
 * Each test gets its own tmpdir to avoid cross-test contamination.
 */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-lifecycle-test-'));
}

/**
 * Recursively removes a directory and its contents.
 */
function rmDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_e) {
    // Best-effort cleanup
  }
}

// ---------------------------------------------------------------------------
// getDynamoDir
// ---------------------------------------------------------------------------
describe('getDynamoDir', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpDir(); });
  afterEach(() => { rmDir(tmpRoot); });

  it('creates .dynamo/ directory if missing', () => {
    const dir = getDynamoDir(tmpRoot);
    expect(dir).toBe(path.join(tmpRoot, '.dynamo'));
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.statSync(dir).isDirectory()).toBe(true);
  });

  it('returns existing .dynamo/ directory without error', () => {
    fs.mkdirSync(path.join(tmpRoot, '.dynamo'), { recursive: true });
    const dir = getDynamoDir(tmpRoot);
    expect(dir).toBe(path.join(tmpRoot, '.dynamo'));
    expect(fs.existsSync(dir)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readDaemonFile / writeDaemonFile round-trip
// ---------------------------------------------------------------------------
describe('readDaemonFile / writeDaemonFile', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpDir(); });
  afterEach(() => { rmDir(tmpRoot); });

  it('returns null when .dynamo/daemon.json does not exist', () => {
    const result = readDaemonFile(tmpRoot);
    expect(result).toBeNull();
  });

  it('round-trips { pid, port, started, version }', () => {
    const data = {
      pid: 12345,
      port: 9876,
      started: '2026-03-28T22:00:00.000Z',
      version: '0.1.0',
    };
    writeDaemonFile(tmpRoot, data);
    const result = readDaemonFile(tmpRoot);
    expect(result).toEqual(data);
  });

  it('uses atomic write pattern (tmp then rename)', () => {
    const data = { pid: 1, port: 2, started: 'x', version: '0' };
    writeDaemonFile(tmpRoot, data);

    // After write, the .tmp file should NOT exist (renamed away)
    const tmpPath = path.join(tmpRoot, '.dynamo', 'daemon.json.tmp');
    expect(fs.existsSync(tmpPath)).toBe(false);

    // The final file should exist
    const filePath = path.join(tmpRoot, '.dynamo', 'daemon.json');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('returns null for corrupt JSON', () => {
    getDynamoDir(tmpRoot);
    const filePath = path.join(tmpRoot, '.dynamo', 'daemon.json');
    fs.writeFileSync(filePath, '{broken json!!!', 'utf-8');
    const result = readDaemonFile(tmpRoot);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// removeDaemonFile
// ---------------------------------------------------------------------------
describe('removeDaemonFile', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpDir(); });
  afterEach(() => { rmDir(tmpRoot); });

  it('removes daemon.json', () => {
    writeDaemonFile(tmpRoot, { pid: 1, port: 2, started: 'x', version: '0' });
    const filePath = path.join(tmpRoot, '.dynamo', 'daemon.json');
    expect(fs.existsSync(filePath)).toBe(true);
    removeDaemonFile(tmpRoot);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('handles ENOENT gracefully (no file to remove)', () => {
    // Should not throw
    expect(() => removeDaemonFile(tmpRoot)).not.toThrow();
  });

  it('also removes leftover .tmp file', () => {
    getDynamoDir(tmpRoot);
    const tmpPath = path.join(tmpRoot, '.dynamo', 'daemon.json.tmp');
    fs.writeFileSync(tmpPath, '{}', 'utf-8');
    removeDaemonFile(tmpRoot);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDaemonRunning
// ---------------------------------------------------------------------------
describe('isDaemonRunning', () => {
  let tmpRoot;

  beforeEach(() => { tmpRoot = makeTmpDir(); });
  afterEach(() => { rmDir(tmpRoot); });

  it('returns { running: false, reason: "no_pid_file" } when no file', () => {
    const result = isDaemonRunning(tmpRoot);
    expect(result).toEqual({ running: false, reason: 'no_pid_file' });
  });

  it('returns { running: false, reason: "stale_pid" } when PID is dead', () => {
    // Use a PID that almost certainly doesn't exist (very high number)
    const deadPid = 2147483647;
    writeDaemonFile(tmpRoot, {
      pid: deadPid,
      port: 9876,
      started: new Date().toISOString(),
      version: '0.1.0',
    });

    const result = isDaemonRunning(tmpRoot);
    expect(result.running).toBe(false);
    expect(result.reason).toBe('stale_pid');
    expect(result.pid).toBe(deadPid);

    // Should have cleaned up the stale file
    expect(readDaemonFile(tmpRoot)).toBeNull();
  });

  it('returns { running: true } for current process PID', () => {
    writeDaemonFile(tmpRoot, {
      pid: process.pid,
      port: 9876,
      started: new Date().toISOString(),
      version: '0.1.0',
    });

    const result = isDaemonRunning(tmpRoot);
    expect(result.running).toBe(true);
    expect(result.pid).toBe(process.pid);
    expect(result.port).toBe(9876);
  });
});

// ---------------------------------------------------------------------------
// createDaemonLogger
// ---------------------------------------------------------------------------
describe('createDaemonLogger', () => {
  let tmpRoot;
  let logPath;

  beforeEach(() => {
    tmpRoot = makeTmpDir();
    logPath = path.join(tmpRoot, 'test.log');
  });
  afterEach(() => { rmDir(tmpRoot); });

  it('writes lines matching [ISO] [LEVEL] [SOURCE] format', () => {
    const logger = createDaemonLogger(logPath);
    logger.info('daemon', 'Hello world');
    logger.warn('bootstrap', 'Something iffy');
    logger.error('wire', 'Connection failed');

    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(3);

    // ISO timestamp pattern: [2026-03-28T22:00:01.234Z]
    const pattern = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[(INFO|WARN|ERROR)\] \[\w+\] .+$/;

    expect(lines[0]).toMatch(pattern);
    expect(lines[0]).toContain('[INFO]');
    expect(lines[0]).toContain('[daemon]');
    expect(lines[0]).toContain('Hello world');

    expect(lines[1]).toMatch(pattern);
    expect(lines[1]).toContain('[WARN]');
    expect(lines[1]).toContain('[bootstrap]');

    expect(lines[2]).toMatch(pattern);
    expect(lines[2]).toContain('[ERROR]');
    expect(lines[2]).toContain('[wire]');
  });

  it('creates log file if it does not exist', () => {
    expect(fs.existsSync(logPath)).toBe(false);
    const logger = createDaemonLogger(logPath);
    logger.info('test', 'first entry');
    expect(fs.existsSync(logPath)).toBe(true);
  });

  it('appends to existing log file', () => {
    const logger = createDaemonLogger(logPath);
    logger.info('a', 'line 1');
    logger.info('b', 'line 2');
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });
});

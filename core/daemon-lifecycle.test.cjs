'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
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
 * Tests for daemon lifecycle utilities.
 * Uses os.tmpdir() for test isolation.
 */

describe('daemon-lifecycle', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-lifecycle-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getDynamoDir', () => {
    it('creates .dynamo directory if missing', () => {
      const dir = getDynamoDir(tmpDir);
      expect(dir).toBe(path.join(tmpDir, '.dynamo'));
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('returns existing .dynamo directory', () => {
      fs.mkdirSync(path.join(tmpDir, '.dynamo'));
      const dir = getDynamoDir(tmpDir);
      expect(fs.existsSync(dir)).toBe(true);
    });
  });

  describe('readDaemonFile/writeDaemonFile', () => {
    it('round-trips daemon file data', () => {
      const data = {
        pid: 12345,
        port: 9876,
        started: '2026-03-28T22:00:00.000Z',
        version: '0.1.0',
      };

      writeDaemonFile(tmpDir, data);
      const result = readDaemonFile(tmpDir);

      expect(result).toEqual(data);
    });

    it('returns null when daemon file does not exist', () => {
      const result = readDaemonFile(tmpDir);
      expect(result).toBeNull();
    });

    it('uses atomic write pattern (tmp then rename)', () => {
      writeDaemonFile(tmpDir, { pid: 1, port: 2, started: 'x', version: 'y' });

      // After successful write, .tmp should not remain
      const tmpPath = path.join(tmpDir, '.dynamo', 'daemon.json.tmp');
      expect(fs.existsSync(tmpPath)).toBe(false);

      // Final file should exist
      const finalPath = path.join(tmpDir, '.dynamo', 'daemon.json');
      expect(fs.existsSync(finalPath)).toBe(true);
    });
  });

  describe('removeDaemonFile', () => {
    it('removes daemon.json', () => {
      writeDaemonFile(tmpDir, { pid: 1, port: 2, started: 'x', version: 'y' });
      removeDaemonFile(tmpDir);

      const result = readDaemonFile(tmpDir);
      expect(result).toBeNull();
    });

    it('handles ENOENT gracefully (no file to remove)', () => {
      // Should not throw
      expect(() => removeDaemonFile(tmpDir)).not.toThrow();
    });
  });

  describe('isDaemonRunning', () => {
    it('returns { running: false, reason: no_pid_file } when no file', () => {
      const result = isDaemonRunning(tmpDir);
      expect(result.running).toBe(false);
      expect(result.reason).toBe('no_pid_file');
    });

    it('returns { running: true } for current process PID', () => {
      writeDaemonFile(tmpDir, {
        pid: process.pid,
        port: 9876,
        started: new Date().toISOString(),
        version: '0.1.0',
      });

      const result = isDaemonRunning(tmpDir);
      expect(result.running).toBe(true);
      expect(result.pid).toBe(process.pid);
      expect(result.port).toBe(9876);
    });

    it('returns { running: false, reason: stale_pid } for dead PID', () => {
      // Use a PID that is very likely not running
      writeDaemonFile(tmpDir, {
        pid: 999999,
        port: 9876,
        started: new Date().toISOString(),
        version: '0.1.0',
      });

      const result = isDaemonRunning(tmpDir);
      expect(result.running).toBe(false);
      expect(result.reason).toBe('stale_pid');
      expect(result.pid).toBe(999999);

      // Should have cleaned up the stale file
      expect(readDaemonFile(tmpDir)).toBeNull();
    });
  });

  describe('createDaemonLogger', () => {
    it('writes correctly formatted lines', () => {
      const logPath = path.join(tmpDir, 'test.log');
      const logger = createDaemonLogger(logPath);

      logger.info('daemon', 'Server started');
      logger.warn('wire', 'Connection timeout');
      logger.error('daemon', 'Fatal error occurred');

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);
      expect(lines[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[INFO\] \[daemon\] Server started/);
      expect(lines[1]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[WARN\] \[wire\] Connection timeout/);
      expect(lines[2]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[ERROR\] \[daemon\] Fatal error occurred/);
    });

    it('creates log file if it does not exist', () => {
      const logPath = path.join(tmpDir, 'new.log');
      const logger = createDaemonLogger(logPath);

      expect(fs.existsSync(logPath)).toBe(false);
      logger.info('test', 'hello');
      expect(fs.existsSync(logPath)).toBe(true);
    });
  });
});

'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isOk, isErr, unwrap } = require('../../../../lib/index.cjs');
const { createLathe } = require('../lathe.cjs');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-lathe-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Lathe', () => {
  describe('contract validation', () => {
    it('createLathe() returns Ok with frozen object', () => {
      const result = createLathe();
      expect(isOk(result)).toBe(true);
      expect(Object.isFrozen(unwrap(result))).toBe(true);
    });

    it('result contains all required methods', () => {
      const lathe = unwrap(createLathe());
      const required = [
        'init', 'start', 'stop', 'healthCheck',
        'readFile', 'writeFile', 'deleteFile',
        'listDir', 'exists', 'mkdir', 'writeFileAtomic'
      ];
      for (const method of required) {
        expect(typeof lathe[method]).toBe('function');
      }
    });
  });

  describe('file operations', () => {
    it('readFile returns Ok(string) for existing file content', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'hello world');

      const lathe = unwrap(createLathe());
      const result = await lathe.readFile(filePath);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe('hello world');
    });

    it('readFile returns Err(FILE_NOT_FOUND) for missing file', async () => {
      const lathe = unwrap(createLathe());
      const result = await lathe.readFile(path.join(tmpDir, 'nonexistent.txt'));
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('FILE_NOT_FOUND');
    });

    it('writeFile writes content to disk and returns Ok(undefined)', async () => {
      const filePath = path.join(tmpDir, 'out.txt');
      const lathe = unwrap(createLathe());
      const result = await lathe.writeFile(filePath, 'written content');
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
      expect(fs.readFileSync(filePath, 'utf8')).toBe('written content');
    });

    it('writeFile creates parent directories if they do not exist', async () => {
      const filePath = path.join(tmpDir, 'sub', 'deep', 'file.txt');
      const lathe = unwrap(createLathe());
      const result = await lathe.writeFile(filePath, 'nested content');
      expect(isOk(result)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('nested content');
    });

    it('deleteFile removes file from disk and returns Ok(undefined)', async () => {
      const filePath = path.join(tmpDir, 'delete-me.txt');
      fs.writeFileSync(filePath, 'temp');

      const lathe = unwrap(createLathe());
      const result = lathe.deleteFile(filePath);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('deleteFile returns Err(FILE_NOT_FOUND) for missing file', () => {
      const lathe = unwrap(createLathe());
      const result = lathe.deleteFile(path.join(tmpDir, 'nope.txt'));
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('directory operations', () => {
    it('listDir returns Ok(array) of entries with type info', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a');
      fs.mkdirSync(path.join(tmpDir, 'subdir'));

      const lathe = unwrap(createLathe());
      const result = lathe.listDir(tmpDir);
      expect(isOk(result)).toBe(true);

      const entries = unwrap(result);
      expect(Array.isArray(entries)).toBe(true);

      const fileEntry = entries.find(e => e.name === 'a.txt');
      expect(fileEntry).toBeDefined();
      expect(fileEntry.isFile).toBe(true);
      expect(fileEntry.isDirectory).toBe(false);

      const dirEntry = entries.find(e => e.name === 'subdir');
      expect(dirEntry).toBeDefined();
      expect(dirEntry.isFile).toBe(false);
      expect(dirEntry.isDirectory).toBe(true);
    });

    it('listDir returns Err(DIR_NOT_FOUND) for missing directory', () => {
      const lathe = unwrap(createLathe());
      const result = lathe.listDir(path.join(tmpDir, 'no-such-dir'));
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('DIR_NOT_FOUND');
    });

    it('exists returns Ok(true) for existing file', async () => {
      const filePath = path.join(tmpDir, 'here.txt');
      fs.writeFileSync(filePath, 'present');

      const lathe = unwrap(createLathe());
      const result = await lathe.exists(filePath);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(true);
    });

    it('exists returns Ok(false) for missing file', async () => {
      const lathe = unwrap(createLathe());
      const result = await lathe.exists(path.join(tmpDir, 'missing.txt'));
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(false);
    });

    it('mkdir creates directory recursively and returns Ok(undefined)', () => {
      const dirPath = path.join(tmpDir, 'a', 'b', 'c');
      const lathe = unwrap(createLathe());
      const result = lathe.mkdir(dirPath);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });

    it('mkdir returns Ok(undefined) for already-existing directory (idempotent)', () => {
      const dirPath = path.join(tmpDir, 'existing');
      fs.mkdirSync(dirPath);

      const lathe = unwrap(createLathe());
      const result = lathe.mkdir(dirPath);
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
    });
  });

  describe('atomic write', () => {
    it('writeFileAtomic writes via tmp+rename and final file has correct content', async () => {
      const filePath = path.join(tmpDir, 'atomic.txt');
      const lathe = unwrap(createLathe());
      const result = await lathe.writeFileAtomic(filePath, 'atomic content');
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
      expect(fs.readFileSync(filePath, 'utf8')).toBe('atomic content');
    });

    it('writeFileAtomic leaves no .tmp leftover files', async () => {
      const filePath = path.join(tmpDir, 'clean.txt');
      const lathe = unwrap(createLathe());
      await lathe.writeFileAtomic(filePath, 'clean content');

      const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.tmp'));
      expect(tmpFiles.length).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('healthCheck returns Ok({ healthy: false }) before start()', async () => {
      const lathe = unwrap(createLathe());
      const result = lathe.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(false);
      expect(health.name).toBe('lathe');
    });

    it('healthCheck returns Ok({ healthy: true }) after start()', async () => {
      const lathe = unwrap(createLathe());
      lathe.start();
      const result = lathe.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('lathe');
    });

    it('init() returns Ok(undefined)', () => {
      const lathe = unwrap(createLathe());
      const result = lathe.init();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
    });

    it('stop() returns Ok(undefined)', () => {
      const lathe = unwrap(createLathe());
      lathe.start();
      const result = lathe.stop();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
    });
  });
});

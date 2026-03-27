'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ok, err, createContract } = require('../../../lib/index.cjs');

/**
 * Contract shape defining all required methods for the Lathe service.
 * @type {{ required: string[], optional: string[] }}
 */
const LATHE_SHAPE = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'readFile', 'writeFile', 'deleteFile',
    'listDir', 'exists', 'mkdir', 'writeFileAtomic'
  ],
  optional: ['readJson', 'writeJson']
};

/**
 * Creates a new Lathe filesystem facade service instance.
 *
 * Lathe wraps Bun.file, Bun.write, and node:fs into a single facade
 * that all other services and future code use for filesystem access.
 * It is the lowest-level service in the dependency chain with zero
 * service dependencies.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createLathe() {
  let _started = false;

  /**
   * Initialize the Lathe service. No dependencies required.
   * @param {Object} [_options] - Options object (unused -- Lathe has no dependencies)
   * @returns {import('../../../lib/result.cjs').Ok<undefined>}
   */
  function init(_options) {
    return ok(undefined);
  }

  /**
   * Start the Lathe service, enabling health check reporting.
   * @returns {import('../../../lib/result.cjs').Ok<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Lathe service.
   * @returns {import('../../../lib/result.cjs').Ok<undefined>}
   */
  function stop() {
    _started = false;
    return ok(undefined);
  }

  /**
   * Check whether the Lathe service is healthy (started).
   * @returns {import('../../../lib/result.cjs').Ok<{ healthy: boolean, name: string }>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'lathe' });
  }

  /**
   * Read the text content of a file.
   * @param {string} filePath - Absolute path to the file
   * @returns {Promise<import('../../../lib/result.cjs').Result<string>>}
   */
  async function readFile(filePath) {
    try {
      const file = Bun.file(filePath);
      const fileExists = await file.exists();
      if (!fileExists) {
        return err('FILE_NOT_FOUND', `File not found: ${filePath}`, { path: filePath });
      }
      const content = await file.text();
      return ok(content);
    } catch (e) {
      return err('READ_FAILED', `Failed to read file: ${e.message}`, { path: filePath });
    }
  }

  /**
   * Write text content to a file, creating parent directories as needed.
   * @param {string} filePath - Absolute path to the file
   * @param {string} content - Text content to write
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function writeFile(filePath, content) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      await Bun.write(filePath, content);
      return ok(undefined);
    } catch (e) {
      return err('WRITE_FAILED', `Failed to write file: ${e.message}`, { path: filePath });
    }
  }

  /**
   * Delete a file from disk.
   * @param {string} filePath - Absolute path to the file
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function deleteFile(filePath) {
    try {
      fs.unlinkSync(filePath);
      return ok(undefined);
    } catch (e) {
      if (e.code === 'ENOENT') {
        return err('FILE_NOT_FOUND', `File not found: ${filePath}`, { path: filePath });
      }
      return err('DELETE_FAILED', `Failed to delete file: ${e.message}`, { path: filePath });
    }
  }

  /**
   * List directory entries with file/directory type information.
   * @param {string} dirPath - Absolute path to the directory
   * @returns {import('../../../lib/result.cjs').Result<Array<{ name: string, isFile: boolean, isDirectory: boolean }>>}
   */
  function listDir(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return ok(entries.map(e => ({
        name: e.name,
        isFile: e.isFile(),
        isDirectory: e.isDirectory()
      })));
    } catch (e) {
      if (e.code === 'ENOENT') {
        return err('DIR_NOT_FOUND', `Directory not found: ${dirPath}`, { path: dirPath });
      }
      return err('LIST_FAILED', `Failed to list directory: ${e.message}`, { path: dirPath });
    }
  }

  /**
   * Check whether a file or directory exists.
   * @param {string} filePath - Absolute path to check
   * @returns {Promise<import('../../../lib/result.cjs').Ok<boolean>>}
   */
  async function exists(filePath) {
    try {
      const fileExists = await Bun.file(filePath).exists();
      return ok(fileExists);
    } catch (e) {
      return ok(false);
    }
  }

  /**
   * Create a directory recursively (idempotent).
   * @param {string} dirPath - Absolute path to the directory
   * @returns {import('../../../lib/result.cjs').Ok<undefined>}
   */
  function mkdir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
    return ok(undefined);
  }

  /**
   * Write file content atomically via tmp+rename pattern.
   * Writes to a `.tmp` sibling file first, then renames to the target path.
   * @param {string} filePath - Absolute path to the target file
   * @param {string} content - Text content to write
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function writeFileAtomic(filePath, content) {
    const tmpPath = filePath + '.tmp';
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      await Bun.write(tmpPath, content);
      fs.renameSync(tmpPath, filePath);
      return ok(undefined);
    } catch (e) {
      // Clean up tmp file on failure
      try { fs.unlinkSync(tmpPath); } catch (_) { /* ignore cleanup errors */ }
      return err('WRITE_FAILED', `Atomic write failed: ${e.message}`, { path: filePath });
    }
  }

  /**
   * Read and parse a JSON file synchronously.
   * Returns an Err if the file does not exist or contains invalid JSON.
   * @param {string} filePath - Absolute path to the JSON file
   * @returns {import('../../../lib/result.cjs').Result<Object>}
   */
  function readJson(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return ok(JSON.parse(content));
    } catch (e) {
      if (e.code === 'ENOENT') {
        return err('FILE_NOT_FOUND', `File not found: ${filePath}`, { path: filePath });
      }
      return err('READ_FAILED', `Failed to read JSON: ${e.message}`, { path: filePath });
    }
  }

  /**
   * Write an object to a file as formatted JSON, creating parent directories as needed.
   * @param {string} filePath - Absolute path to the JSON file
   * @param {Object} data - Object to serialize
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function writeJson(filePath, data) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return ok(undefined);
    } catch (e) {
      return err('WRITE_FAILED', `Failed to write JSON: ${e.message}`, { path: filePath });
    }
  }

  const impl = {
    init,
    start,
    stop,
    healthCheck,
    readFile,
    writeFile,
    deleteFile,
    listDir,
    exists,
    mkdir,
    writeFileAtomic,
    readJson,
    writeJson,
  };

  return createContract('lathe', LATHE_SHAPE, impl);
}

module.exports = { createLathe };

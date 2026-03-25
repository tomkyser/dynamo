'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { discoverModules, loadModule } = require('./module-discovery.cjs');

/**
 * Creates a temporary directory for test isolation.
 * @returns {string} Absolute path to the temp directory
 */
function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'module-discovery-test-'));
}

/**
 * Creates a mock module directory with a manifest.cjs file.
 * @param {string} parentDir - Parent directory to create the module in
 * @param {string} name - Module directory name
 * @param {Object} manifestExport - What manifest.cjs exports
 * @param {Object} [options] - Additional options
 * @param {string} [options.entryContent] - Content for the entry point file
 * @returns {string} Absolute path to the created module directory
 */
function createMockModule(parentDir, name, manifestExport, options = {}) {
  const moduleDir = path.join(parentDir, name);
  fs.mkdirSync(moduleDir, { recursive: true });

  // Write manifest.cjs
  const manifestContent = `'use strict';\nmodule.exports = ${JSON.stringify(manifestExport)};`;
  fs.writeFileSync(path.join(moduleDir, 'manifest.cjs'), manifestContent);

  // Write entry point if manifest has main field
  if (manifestExport.main || (manifestExport.SOME_MANIFEST && manifestExport.SOME_MANIFEST.main)) {
    const main = manifestExport.main || manifestExport.SOME_MANIFEST.main;
    const entryPath = path.join(moduleDir, main);
    const entryContent = options.entryContent || `'use strict';\nmodule.exports = { register: function() { return { ok: true, value: { name: '${name}' } }; } };`;
    fs.writeFileSync(entryPath, entryContent);
  }

  return moduleDir;
}

describe('module-discovery', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('discoverModules', () => {
    it('returns [] when directory does not exist', () => {
      const result = discoverModules(path.join(tmpDir, 'nonexistent'));
      expect(result).toEqual([]);
    });

    it('returns [] when directory is empty', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);
      const result = discoverModules(modulesDir);
      expect(result).toEqual([]);
    });

    it('finds subdirectories containing manifest.cjs', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      createMockModule(modulesDir, 'test-mod', {
        name: 'test-mod',
        version: '1.0.0',
        main: './index.cjs',
        enabled: true,
      });

      const result = discoverModules(modulesDir);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(path.join(modulesDir, 'test-mod'));
    });

    it('skips files (non-directories)', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      // Create a file (not a directory)
      fs.writeFileSync(path.join(modulesDir, 'not-a-module.txt'), 'just a file');

      // Create a valid module
      createMockModule(modulesDir, 'real-mod', {
        name: 'real-mod',
        version: '1.0.0',
        main: './index.cjs',
        enabled: true,
      });

      const result = discoverModules(modulesDir);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(path.join(modulesDir, 'real-mod'));
    });

    it('skips directories without manifest.cjs', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      // Create a directory without manifest.cjs
      fs.mkdirSync(path.join(modulesDir, 'no-manifest'));
      fs.writeFileSync(path.join(modulesDir, 'no-manifest', 'readme.md'), 'no manifest');

      // Create a valid module
      createMockModule(modulesDir, 'valid-mod', {
        name: 'valid-mod',
        version: '1.0.0',
        main: './index.cjs',
        enabled: true,
      });

      const result = discoverModules(modulesDir);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(path.join(modulesDir, 'valid-mod'));
    });
  });

  describe('loadModule', () => {
    it('returns Ok({name, manifest, entryPath}) for valid module', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      const moduleDir = createMockModule(modulesDir, 'good-mod', {
        name: 'good-mod',
        version: '1.0.0',
        main: './index.cjs',
        enabled: true,
      });

      const result = loadModule(moduleDir);
      expect(result.ok).toBe(true);
      expect(result.value.name).toBe('good-mod');
      expect(result.value.manifest.name).toBe('good-mod');
      expect(result.value.manifest.version).toBe('1.0.0');
      expect(result.value.entryPath).toBe(path.join(moduleDir, './index.cjs'));
    });

    it('returns Err for missing manifest.cjs', () => {
      const moduleDir = path.join(tmpDir, 'no-manifest-mod');
      fs.mkdirSync(moduleDir);

      const result = loadModule(moduleDir);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('MODULE_LOAD_FAILED');
    });

    it('returns Err for module with enabled: false', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      const moduleDir = createMockModule(modulesDir, 'disabled-mod', {
        name: 'disabled-mod',
        version: '1.0.0',
        main: './index.cjs',
        enabled: false,
      });

      const result = loadModule(moduleDir);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('MODULE_DISABLED');
      expect(result.error.context.name).toBe('disabled-mod');
    });

    it('returns Err for invalid manifest (missing required fields)', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      const moduleDir = path.join(modulesDir, 'bad-manifest');
      fs.mkdirSync(moduleDir);
      // Write a manifest missing required 'name' and 'main' fields
      fs.writeFileSync(
        path.join(moduleDir, 'manifest.cjs'),
        `'use strict';\nmodule.exports = { version: '1.0.0' };`
      );

      const result = loadModule(moduleDir);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('MODULE_INVALID_MANIFEST');
    });

    it('resolves named exports (e.g., REVERIE_MANIFEST pattern)', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      const moduleDir = path.join(modulesDir, 'named-export-mod');
      fs.mkdirSync(moduleDir);

      // Write manifest with named export pattern
      fs.writeFileSync(
        path.join(moduleDir, 'manifest.cjs'),
        `'use strict';
const SOME_MANIFEST = {
  name: 'named-export-mod',
  version: '2.0.0',
  main: './entry.cjs',
  enabled: true,
};
module.exports = { SOME_MANIFEST };`
      );

      // Write entry point
      fs.writeFileSync(
        path.join(moduleDir, 'entry.cjs'),
        `'use strict';\nmodule.exports = { register: function() {} };`
      );

      const result = loadModule(moduleDir);
      expect(result.ok).toBe(true);
      expect(result.value.name).toBe('named-export-mod');
      expect(result.value.manifest.version).toBe('2.0.0');
    });

    it('returns Err when entry point file does not exist', () => {
      const modulesDir = path.join(tmpDir, 'modules');
      fs.mkdirSync(modulesDir);

      const moduleDir = path.join(modulesDir, 'missing-entry');
      fs.mkdirSync(moduleDir);

      // Write manifest pointing to non-existent entry
      fs.writeFileSync(
        path.join(moduleDir, 'manifest.cjs'),
        `'use strict';\nmodule.exports = { name: 'missing-entry', version: '1.0.0', main: './nonexistent.cjs', enabled: true };`
      );

      const result = loadModule(moduleDir);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('MODULE_ENTRY_NOT_FOUND');
    });
  });
});

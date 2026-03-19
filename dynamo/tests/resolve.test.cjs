// Dynamo > Tests > resolve.test.cjs
'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.join(__dirname, '..', '..');
const resolve = require(path.join(REPO_ROOT, 'lib', 'resolve.cjs'));

describe('lib/resolve.cjs', () => {
  beforeEach(() => {
    resolve._reset();
  });

  describe('layout detection', () => {
    it('detects repo layout when core.cjs is not at root level', () => {
      // In the repo, core.cjs lives at dynamo/core.cjs, not at root
      // So detectLayout should return 'repo'
      const layout = resolve._detectLayout();
      assert.equal(layout, 'repo');
    });
  });

  describe('resolve repo paths', () => {
    it('resolves ledger/search.cjs to absolute path ending in ledger/search.cjs', () => {
      const result = resolve('ledger', 'search.cjs');
      assert.ok(path.isAbsolute(result), 'should be absolute path');
      assert.ok(result.endsWith(path.join('ledger', 'search.cjs')), `path should end with ledger/search.cjs, got: ${result}`);
      assert.ok(fs.existsSync(result), 'resolved path should exist');
    });

    it('resolves dynamo/core.cjs to absolute path ending in dynamo/core.cjs', () => {
      const result = resolve('dynamo', 'core.cjs');
      assert.ok(path.isAbsolute(result), 'should be absolute path');
      assert.ok(result.endsWith(path.join('dynamo', 'core.cjs')), `path should end with dynamo/core.cjs, got: ${result}`);
      assert.ok(fs.existsSync(result), 'resolved path should exist');
    });

    it('resolves switchboard/sync.cjs to absolute path ending in switchboard/sync.cjs', () => {
      const result = resolve('switchboard', 'sync.cjs');
      assert.ok(path.isAbsolute(result), 'should be absolute path');
      assert.ok(result.endsWith(path.join('switchboard', 'sync.cjs')), `path should end with switchboard/sync.cjs, got: ${result}`);
      assert.ok(fs.existsSync(result), 'resolved path should exist');
    });

    it('resolves lib/resolve.cjs to absolute path ending in lib/resolve.cjs', () => {
      const result = resolve('lib', 'resolve.cjs');
      assert.ok(path.isAbsolute(result), 'should be absolute path');
      assert.ok(result.endsWith(path.join('lib', 'resolve.cjs')), `path should end with lib/resolve.cjs, got: ${result}`);
      assert.ok(fs.existsSync(result), 'resolved path should exist');
    });
  });

  describe('error handling', () => {
    it('throws for unknown subsystem with descriptive message', () => {
      assert.throws(
        () => resolve('bogus', 'file.cjs'),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes("unknown subsystem 'bogus'"), `message should contain "unknown subsystem 'bogus'", got: ${err.message}`);
          assert.ok(err.message.includes('Known:'), `message should contain "Known:", got: ${err.message}`);
          return true;
        }
      );
    });

    it('throws for missing file with checked path in message', () => {
      assert.throws(
        () => resolve('ledger', 'nonexistent-file.cjs'),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('not found'), `message should contain "not found", got: ${err.message}`);
          assert.ok(err.message.includes('nonexistent-file.cjs'), `message should contain the file name, got: ${err.message}`);
          return true;
        }
      );
    });
  });

  describe('cache reset', () => {
    it('re-detects layout after _reset()', () => {
      // Call resolve to populate cache
      resolve('dynamo', 'core.cjs');
      const layout1 = resolve._detectLayout();
      assert.equal(layout1, 'repo');

      // Reset and verify layout is re-detected (not stale)
      resolve._reset();
      const layout2 = resolve._detectLayout();
      assert.equal(layout2, 'repo');
    });
  });

  describe('future subsystem names', () => {
    it('throws not-found (not unknown-subsystem) for known future subsystem assay', () => {
      // 'assay' is a known subsystem name, but the directory does not exist yet
      // Should throw "not found" (because file doesn't exist), NOT "unknown subsystem"
      assert.throws(
        () => resolve('assay', 'foo.cjs'),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('not found'), `should say "not found", got: ${err.message}`);
          assert.ok(!err.message.includes('unknown subsystem'), `should NOT say "unknown subsystem", got: ${err.message}`);
          return true;
        }
      );
    });
  });

  describe('directory resolution', () => {
    it('resolves ledger/hooks directory path when directory exists', () => {
      // fs.existsSync works for directories too
      const hooksDir = path.join(REPO_ROOT, 'ledger', 'hooks');
      if (!fs.existsSync(hooksDir)) {
        // Skip if hooks dir doesn't exist in this repo layout
        return;
      }
      const result = resolve('ledger', 'hooks');
      assert.ok(path.isAbsolute(result), 'should be absolute path');
      assert.ok(result.endsWith(path.join('ledger', 'hooks')), `path should end with ledger/hooks, got: ${result}`);
      assert.ok(fs.existsSync(result), 'resolved path should exist');
    });
  });
});

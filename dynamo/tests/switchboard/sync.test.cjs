// Dynamo > Tests > sync.test.cjs
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const sync = require(path.join(__dirname, '..', '..', '..', 'subsystems', 'switchboard', 'sync.cjs'));

// --- Test helpers ---

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-sync-test-' + label + '-'));
}

function writeFile(dir, relPath, content) {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

// --- walkDir tests ---

describe('walkDir', () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTempDir('walk');
    writeFile(tmpDir, 'a.txt', 'hello');
    writeFile(tmpDir, 'sub/b.txt', 'world');
    writeFile(tmpDir, 'sub/deep/c.txt', 'deep');
    writeFile(tmpDir, '.DS_Store', 'junk');
    writeFile(tmpDir, 'node_modules/pkg/index.js', 'module');
    writeFile(tmpDir, 'foo.pyc', 'compiled');
    writeFile(tmpDir, '__pycache__/cache.pyc', 'cache');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('recursively walks and returns relative paths', () => {
    const files = sync.walkDir(tmpDir, [], []);
    assert.ok('a.txt' in files);
    assert.ok('sub/b.txt' in files);
    assert.ok('sub/deep/c.txt' in files);
  });

  it('respects name-based excludes', () => {
    const excludes = ['.DS_Store', 'node_modules', '__pycache__'];
    const files = sync.walkDir(tmpDir, excludes, []);
    assert.ok(!('.DS_Store' in files), '.DS_Store should be excluded');
    assert.ok(!('node_modules/pkg/index.js' in files), 'node_modules should be excluded');
    assert.ok(!('__pycache__/cache.pyc' in files), '__pycache__ should be excluded');
    assert.ok('a.txt' in files, 'non-excluded files should remain');
  });

  it('respects glob-pattern excludes (*.pyc)', () => {
    const files = sync.walkDir(tmpDir, [], ['*.pyc']);
    assert.ok(!('foo.pyc' in files), '*.pyc should be excluded');
    assert.ok('a.txt' in files, 'non-matching files should remain');
  });

  it('returns mtime and size for each file', () => {
    const files = sync.walkDir(tmpDir, [], []);
    const entry = files['a.txt'];
    assert.ok(entry, 'a.txt should exist in results');
    assert.strictEqual(typeof entry.mtime, 'number');
    assert.strictEqual(typeof entry.size, 'number');
    assert.ok(entry.mtime > 0);
    assert.ok(entry.size > 0);
  });

  it('filesOnly mode skips subdirectories', () => {
    const files = sync.walkDir(tmpDir, [], [], undefined, true);
    assert.ok('a.txt' in files, 'root file should be included');
    assert.ok(!('sub/b.txt' in files), 'nested file should be excluded');
    assert.ok(!('sub/deep/c.txt' in files), 'deeply nested file should be excluded');
  });

  it('filesOnly=false or undefined recurses into subdirectories', () => {
    const files = sync.walkDir(tmpDir, [], [], undefined, false);
    assert.ok('a.txt' in files, 'root file should be included');
    assert.ok('sub/b.txt' in files, 'nested file should be included');
    assert.ok('sub/deep/c.txt' in files, 'deeply nested file should be included');
  });
});

// --- diffTrees tests ---

describe('diffTrees', () => {
  it('identifies files to copy (missing in dst)', () => {
    const src = { 'a.txt': { mtime: 100, size: 5 }, 'b.txt': { mtime: 200, size: 10 } };
    const dst = { 'a.txt': { mtime: 100, size: 5 } };
    const diff = sync.diffTrees(src, dst);
    assert.ok(diff.toCopy.includes('b.txt'), 'b.txt missing in dst should be in toCopy');
    assert.ok(!diff.toCopy.includes('a.txt'), 'a.txt exists in both with same stats');
  });

  it('identifies files to copy (different size)', () => {
    const src = { 'a.txt': { mtime: 100, size: 50 } };
    const dst = { 'a.txt': { mtime: 100, size: 10 } };
    const diff = sync.diffTrees(src, dst);
    assert.ok(diff.toCopy.includes('a.txt'), 'a.txt with different size should be in toCopy');
  });

  it('identifies files to copy (newer mtime)', () => {
    const src = { 'a.txt': { mtime: 200, size: 5 } };
    const dst = { 'a.txt': { mtime: 100, size: 5 } };
    const diff = sync.diffTrees(src, dst);
    assert.ok(diff.toCopy.includes('a.txt'), 'a.txt with newer mtime should be in toCopy');
  });

  it('identifies files to delete (extra in dst)', () => {
    const src = { 'a.txt': { mtime: 100, size: 5 } };
    const dst = { 'a.txt': { mtime: 100, size: 5 }, 'extra.txt': { mtime: 100, size: 3 } };
    const diff = sync.diffTrees(src, dst);
    assert.ok(diff.toDelete.includes('extra.txt'), 'extra.txt not in src should be in toDelete');
    assert.ok(!diff.toDelete.includes('a.txt'));
  });

  it('returns empty arrays when trees are identical', () => {
    const src = { 'a.txt': { mtime: 100, size: 5 } };
    const dst = { 'a.txt': { mtime: 100, size: 5 } };
    const diff = sync.diffTrees(src, dst);
    assert.strictEqual(diff.toCopy.length, 0);
    assert.strictEqual(diff.toDelete.length, 0);
  });
});

// --- detectConflicts tests ---

describe('detectConflicts', () => {
  let srcDir, dstDir;

  before(() => {
    srcDir = makeTempDir('conflict-src');
    dstDir = makeTempDir('conflict-dst');
  });

  after(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('detects conflict when both sides differ', () => {
    writeFile(srcDir, 'shared.txt', 'source version content here');
    writeFile(dstDir, 'shared.txt', 'dest version different');
    const conflicts = sync.detectConflicts(srcDir, dstDir,
      { 'shared.txt': { mtime: 100, size: 28 } },
      { 'shared.txt': { mtime: 200, size: 22 } });
    assert.ok(conflicts.includes('shared.txt'), 'shared.txt should be a conflict');
  });

  it('returns empty when files are identical', () => {
    writeFile(srcDir, 'same.txt', 'identical');
    writeFile(dstDir, 'same.txt', 'identical');
    const conflicts = sync.detectConflicts(srcDir, dstDir,
      { 'same.txt': { mtime: 100, size: 9 } },
      { 'same.txt': { mtime: 200, size: 9 } });
    assert.ok(!conflicts.includes('same.txt'), 'identical files should not conflict');
  });
});

// --- copyFiles tests ---

describe('copyFiles', () => {
  let srcDir, dstDir;

  before(() => {
    srcDir = makeTempDir('copy-src');
    dstDir = makeTempDir('copy-dst');
    writeFile(srcDir, 'root.txt', 'root');
    writeFile(srcDir, 'nested/deep/file.txt', 'deep');
  });

  after(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('copies files and creates parent directories', () => {
    sync.copyFiles(srcDir, dstDir, ['root.txt', 'nested/deep/file.txt']);
    assert.ok(fs.existsSync(path.join(dstDir, 'root.txt')));
    assert.ok(fs.existsSync(path.join(dstDir, 'nested', 'deep', 'file.txt')));
    assert.strictEqual(fs.readFileSync(path.join(dstDir, 'root.txt'), 'utf8'), 'root');
    assert.strictEqual(fs.readFileSync(path.join(dstDir, 'nested', 'deep', 'file.txt'), 'utf8'), 'deep');
  });
});

// --- deleteFiles tests ---

describe('deleteFiles', () => {
  let dstDir;

  before(() => {
    dstDir = makeTempDir('delete-dst');
    writeFile(dstDir, 'to-delete.txt', 'gone');
    writeFile(dstDir, 'keep.txt', 'stays');
  });

  after(() => {
    fs.rmSync(dstDir, { recursive: true, force: true });
  });

  it('deletes specified files', () => {
    sync.deleteFiles(dstDir, ['to-delete.txt']);
    assert.ok(!fs.existsSync(path.join(dstDir, 'to-delete.txt')), 'should be deleted');
    assert.ok(fs.existsSync(path.join(dstDir, 'keep.txt')), 'should still exist');
  });

  it('handles non-existent files gracefully', () => {
    // Should not throw
    sync.deleteFiles(dstDir, ['nonexistent.txt']);
  });
});

// --- Module exports tests ---

describe('sync module exports', () => {
  it('exports run as a function', () => {
    assert.strictEqual(typeof sync.run, 'function');
  });

  it('exports walkDir as a function', () => {
    assert.strictEqual(typeof sync.walkDir, 'function');
  });

  it('exports diffTrees as a function', () => {
    assert.strictEqual(typeof sync.diffTrees, 'function');
  });

  it('exports detectConflicts as a function', () => {
    assert.strictEqual(typeof sync.detectConflicts, 'function');
  });

  it('exports copyFiles as a function', () => {
    assert.strictEqual(typeof sync.copyFiles, 'function');
  });

  it('exports deleteFiles as a function', () => {
    assert.strictEqual(typeof sync.deleteFiles, 'function');
  });

  it('exports SYNC_PAIRS with 8 directory pairs (six-subsystem layout)', () => {
    assert.ok(Array.isArray(sync.SYNC_PAIRS), 'SYNC_PAIRS should be an array');
    assert.strictEqual(sync.SYNC_PAIRS.length, 8, 'should have 8 sync pairs');
    const labels = sync.SYNC_PAIRS.map(p => p.label);
    assert.ok(labels.includes('root'), 'should have root pair');
    assert.ok(labels.includes('dynamo-meta'), 'should have dynamo-meta pair');
    assert.ok(labels.includes('switchboard'), 'should have switchboard pair');
    assert.ok(labels.includes('assay'), 'should have assay pair');
    assert.ok(labels.includes('ledger'), 'should have ledger pair');
    assert.ok(labels.includes('terminus'), 'should have terminus pair');
    assert.ok(labels.includes('cc'), 'should have cc pair');
    assert.ok(labels.includes('lib'), 'should have lib pair');
  });
});

// --- Six-subsystem layout tests ---

describe('sync six-subsystem layout', () => {
  it('uses REPO_ROOT constant', () => {
    const syncPath = path.join(__dirname, '..', '..', '..', 'subsystems', 'switchboard', 'sync.cjs');
    const content = fs.readFileSync(syncPath, 'utf8');
    assert.ok(content.includes('REPO_ROOT'), 'should use REPO_ROOT constant');
    assert.ok(!content.includes('REPO_DIR'), 'should not use old REPO_DIR constant');
  });

  it('SYNC_PAIRS have correct structure (repo, live, label, excludes)', () => {
    for (const pair of sync.SYNC_PAIRS) {
      assert.ok(typeof pair.repo === 'string', 'pair should have repo path');
      assert.ok(typeof pair.live === 'string', 'pair should have live path');
      assert.ok(typeof pair.label === 'string', 'pair should have label');
      assert.ok(Array.isArray(pair.excludes), 'pair should have excludes array');
    }
  });

  it('dynamo-meta pair excludes tests directory', () => {
    const dynamoPair = sync.SYNC_PAIRS.find(p => p.label === 'dynamo-meta');
    assert.ok(dynamoPair.excludes.includes('tests'), 'dynamo-meta pair should exclude tests');
  });

  it('root pair has filesOnly flag set to true', () => {
    const rootPair = sync.SYNC_PAIRS.find(p => p.label === 'root');
    assert.ok(rootPair, 'should have root pair');
    assert.strictEqual(rootPair.filesOnly, true, 'root pair should have filesOnly=true');
  });

  it('non-root pairs do not have filesOnly flag', () => {
    const nonRootPairs = sync.SYNC_PAIRS.filter(p => p.label !== 'root');
    for (const pair of nonRootPairs) {
      assert.ok(!pair.filesOnly, `${pair.label} pair should not have filesOnly=true`);
    }
  });
});

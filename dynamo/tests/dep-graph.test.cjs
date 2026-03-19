// Dynamo > Tests > dep-graph.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const REPO_ROOT = path.join(__dirname, '..', '..');
const { extractRequires, buildGraph, detectCycles } = require(path.join(REPO_ROOT, 'lib', 'dep-graph.cjs'));

describe('lib/dep-graph.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-graph-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractRequires', () => {
    it('extracts string literal require targets', () => {
      const filePath = path.join(tmpDir, 'a.cjs');
      const bPath = path.join(tmpDir, 'foo.cjs');
      // Create the target file so require.resolve can find it
      fs.writeFileSync(bPath, '// target', 'utf8');
      const source = `const x = require('./foo.cjs');`;
      const result = extractRequires(filePath, source);
      assert.equal(result.length, 1);
      assert.ok(result[0].endsWith('foo.cjs'), `should resolve to foo.cjs, got: ${result[0]}`);
    });

    it('skips node: builtins', () => {
      const filePath = path.join(tmpDir, 'a.cjs');
      const source = `const fs = require('node:fs');`;
      const result = extractRequires(filePath, source);
      assert.equal(result.length, 0);
    });

    it('skips npm packages (no ./ or / prefix)', () => {
      const filePath = path.join(tmpDir, 'a.cjs');
      const source = `const pkg = require('some-package');`;
      const result = extractRequires(filePath, source);
      assert.equal(result.length, 0);
    });

    it('extracts path.join(__dirname, ...) require patterns', () => {
      const filePath = path.join(tmpDir, 'a.cjs');
      const barPath = path.join(tmpDir, 'bar.cjs');
      fs.writeFileSync(barPath, '// target', 'utf8');
      const source = `const bar = require(path.join(__dirname, 'bar.cjs'));`;
      const result = extractRequires(filePath, source);
      assert.equal(result.length, 1);
      assert.ok(result[0].endsWith('bar.cjs'), `should resolve to bar.cjs, got: ${result[0]}`);
    });
  });

  describe('buildGraph', () => {
    it('scans directory and builds graph from .cjs files', () => {
      // Create two files that require each other
      const aPath = path.join(tmpDir, 'a.cjs');
      const bPath = path.join(tmpDir, 'b.cjs');
      fs.writeFileSync(aPath, `const b = require('./b.cjs');`, 'utf8');
      fs.writeFileSync(bPath, `const a = require('./a.cjs');`, 'utf8');

      const graph = buildGraph([tmpDir]);
      assert.equal(graph.size, 2, `graph should have 2 entries, got: ${graph.size}`);
      assert.ok(graph.has(aPath), 'graph should contain a.cjs');
      assert.ok(graph.has(bPath), 'graph should contain b.cjs');
    });

    it('excludes test files from graph', () => {
      const prodPath = path.join(tmpDir, 'prod.cjs');
      const testPath = path.join(tmpDir, 'prod.test.cjs');
      fs.writeFileSync(prodPath, `// production code`, 'utf8');
      fs.writeFileSync(testPath, `// test code`, 'utf8');

      const graph = buildGraph([tmpDir]);
      assert.equal(graph.size, 1, `graph should have 1 entry (excluding test), got: ${graph.size}`);
      assert.ok(graph.has(prodPath), 'graph should contain prod.cjs');
      assert.ok(!graph.has(testPath), 'graph should NOT contain prod.test.cjs');
    });
  });

  describe('detectCycles', () => {
    it('finds cycle in graph A->B->A', () => {
      const graph = new Map();
      graph.set('A', ['B']);
      graph.set('B', ['A']);
      const cycles = detectCycles(graph);
      assert.ok(cycles.length > 0, 'should detect at least one cycle');
    });

    it('returns empty for acyclic graph A->B->C', () => {
      const graph = new Map();
      graph.set('A', ['B']);
      graph.set('B', ['C']);
      graph.set('C', []);
      const cycles = detectCycles(graph);
      assert.equal(cycles.length, 0, `should find no cycles, got: ${cycles.length}`);
    });

    it('suppresses allowlisted cycles', () => {
      const graph = new Map();
      graph.set('A', ['B']);
      graph.set('B', ['A']);
      const allowlist = [['A', 'B']];
      const cycles = detectCycles(graph, allowlist);
      assert.equal(cycles.length, 0, `allowlisted cycle should be suppressed, got: ${cycles.length}`);
    });

    it('finds multi-node cycle A->B->C->A', () => {
      const graph = new Map();
      graph.set('A', ['B']);
      graph.set('B', ['C']);
      graph.set('C', ['A']);
      const cycles = detectCycles(graph);
      assert.ok(cycles.length > 0, 'should detect at least one cycle');
      // The cycle should contain all three nodes
      const cycle = cycles[0];
      assert.ok(cycle.includes('A'), 'cycle should include A');
      assert.ok(cycle.includes('B'), 'cycle should include B');
      assert.ok(cycle.includes('C'), 'cycle should include C');
    });
  });
});

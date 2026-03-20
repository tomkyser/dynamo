// Dynamo > Tests > boundary.test.cjs -- Import boundary enforcement
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Discover repo root: from dynamo/tests/ go up 2 levels
const REPO_ROOT = path.join(__dirname, '..', '..');

function getAllCjsFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'tests') {
      files.push(...getAllCjsFiles(full));
    } else if (entry.name.endsWith('.cjs') && !entry.name.endsWith('.test.cjs')) {
      files.push(full);
    }
  }
  return files;
}

function extractRequires(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const requires = [];
  // Match require('...') and require(path.join(...)) patterns
  // Look for string literals containing component names
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('require(') || line.includes('require.resolve(')) {
      requires.push({ line: i + 1, text: line.trim() });
    }
  }
  return requires;
}

describe('Import boundary enforcement (six-subsystem layout)', () => {
  const ledgerDir = path.join(REPO_ROOT, 'subsystems', 'ledger');
  const switchboardDir = path.join(REPO_ROOT, 'subsystems', 'switchboard');

  it('ledger files never import directly from switchboard directory', () => {
    const files = getAllCjsFiles(ledgerDir);
    assert.ok(files.length > 0, 'Should find ledger .cjs files');
    for (const file of files) {
      const requires = extractRequires(file);
      for (const req of requires) {
        // Allowed: resolve('switchboard', ...) calls via resolver are OK (cross-subsystem via resolver)
        // Forbidden: direct path references like path.join(__dirname, '..', 'switchboard', ...)
        assert.ok(
          !req.text.includes("path.join(__dirname") || !req.text.includes("switchboard"),
          `${path.relative(REPO_ROOT, file)}:${req.line} directly imports from switchboard: ${req.text}`
        );
      }
    }
  });

  it('switchboard files never import directly from ledger directory', () => {
    const files = getAllCjsFiles(switchboardDir);
    assert.ok(files.length > 0, 'Should find switchboard .cjs files');
    for (const file of files) {
      const requires = extractRequires(file);
      for (const req of requires) {
        assert.ok(
          !req.text.includes("path.join(__dirname") || !req.text.includes("ledger"),
          `${path.relative(REPO_ROOT, file)}:${req.line} directly imports from ledger: ${req.text}`
        );
      }
    }
  });

  it('lib/core.cjs is allowed to import from subsystems (orchestrator privilege)', () => {
    const corePath = path.join(REPO_ROOT, 'lib', 'core.cjs');
    assert.ok(fs.existsSync(corePath), 'lib/core.cjs must exist');
    const content = fs.readFileSync(corePath, 'utf8');
    assert.ok(content.includes('MCPClient'), 'core.cjs should re-export MCPClient');
    // SCOPE, parseSSE, sanitize, SCOPE_PATTERN, loadSessions, listSessions removed --
    // consumers now import directly from scope.cjs and sessions.cjs
    assert.ok(!content.includes('parseSSE'), 'core.cjs should not re-export parseSSE (unused)');
    assert.ok(!content.includes('loadSessions'), 'core.cjs should not re-export loadSessions (direct import)');
  });

  it('six-subsystem directory structure exists', () => {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'subsystems', 'switchboard')), 'subsystems/switchboard/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'subsystems', 'assay')), 'subsystems/assay/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'subsystems', 'ledger')), 'subsystems/ledger/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'subsystems', 'terminus')), 'subsystems/terminus/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'subsystems', 'reverie')), 'subsystems/reverie/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'cc')), 'cc/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'lib')), 'lib/ must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'dynamo.cjs')), 'dynamo.cjs must exist at root');
  });

  it('graphiti Docker infra is under subsystems/terminus/graphiti/', () => {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'subsystems', 'terminus', 'graphiti', 'docker-compose.yml')),
      'subsystems/terminus/graphiti/docker-compose.yml must exist');
  });

  it('old directories no longer exist', () => {
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'ledger')), 'old ledger/ must not exist');
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'switchboard')), 'old switchboard/ must not exist');
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'claude-config')), 'old claude-config/ must not exist');
  });

  it('lib/ shared substrate directory exists at repo root', () => {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'lib')),
      'lib/ must exist at repo root');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'lib', 'resolve.cjs')),
      'lib/resolve.cjs must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'lib', 'layout.cjs')),
      'lib/layout.cjs must exist');
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'lib', 'core.cjs')),
      'lib/core.cjs must exist');
  });

  it('reverie/ is a stub directory', () => {
    const reverieDir = path.join(REPO_ROOT, 'subsystems', 'reverie');
    assert.ok(fs.existsSync(reverieDir), 'subsystems/reverie/ must exist');
    assert.ok(fs.existsSync(path.join(reverieDir, '.gitkeep')), 'subsystems/reverie/.gitkeep must exist');
    const cjsFiles = fs.readdirSync(reverieDir).filter(f => f.endsWith('.cjs'));
    assert.strictEqual(cjsFiles.length, 0, 'reverie/ should contain no .cjs files (stub only)');
  });

  it('no production file contains ad-hoc resolveCore/resolveSibling/resolveHandlers functions', () => {
    const dirs = [
      path.join(REPO_ROOT, 'subsystems', 'switchboard'),
      path.join(REPO_ROOT, 'subsystems', 'assay'),
      path.join(REPO_ROOT, 'subsystems', 'ledger'),
      path.join(REPO_ROOT, 'subsystems', 'terminus'),
      path.join(REPO_ROOT, 'cc'),
      path.join(REPO_ROOT, 'lib'),
    ];
    const files = [];
    for (const dir of dirs) files.push(...getAllCjsFiles(dir));
    // Also check repo-root dynamo.cjs
    const dynamoCjs = path.join(REPO_ROOT, 'dynamo.cjs');
    if (fs.existsSync(dynamoCjs)) files.push(dynamoCjs);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const rel = path.relative(REPO_ROOT, file);
      assert.ok(!content.includes('function resolveCore('),
        `${rel} still contains resolveCore function`);
      assert.ok(!content.includes('function resolveSibling('),
        `${rel} still contains resolveSibling function`);
      assert.ok(!content.includes('function resolveHandlers('),
        `${rel} still contains resolveHandlers function`);
      assert.ok(!content.includes('function resolveLedger('),
        `${rel} still contains resolveLedger function`);
    }
  });
});

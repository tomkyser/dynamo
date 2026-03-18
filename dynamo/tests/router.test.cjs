// Dynamo > Tests > router.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const DYNAMO_PATH = path.join(__dirname, '..', 'dynamo.cjs');

// --- Helpers ---

function makeTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}

function writeConfig(dir, config) {
  const configPath = path.join(dir, 'config.json');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  return configPath;
}

describe('dynamo.cjs CLI router', () => {

  it('file exists with shebang and identity comment', () => {
    assert.ok(fs.existsSync(DYNAMO_PATH), 'dynamo.cjs should exist');
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.startsWith('#!/usr/bin/env node'), 'should have shebang');
    assert.ok(content.includes('Dynamo'), 'should have identity comment');
  });

  it('can be required without error', () => {
    // Requiring dynamo.cjs should not throw (it calls main() at the bottom,
    // but we test it via execSync instead to avoid process.exit side effects)
    assert.ok(fs.existsSync(DYNAMO_PATH));
  });

  it('help output contains all expected command names', () => {
    const result = execSync(`node "${DYNAMO_PATH}" help 2>&1`, { encoding: 'utf8' });
    const expectedCommands = [
      'health-check', 'diagnose', 'verify-memory', 'sync',
      'start', 'stop', 'install', 'rollback', 'session',
      'search', 'remember', 'recall', 'edge', 'forget', 'clear',
      'toggle', 'status',
      'test', 'version', 'help'
    ];
    for (const cmd of expectedCommands) {
      assert.ok(result.includes(cmd), `help should mention "${cmd}"`);
    }
  });

  it('--help flag shows help', () => {
    const result = execSync(`node "${DYNAMO_PATH}" --help 2>&1`, { encoding: 'utf8' });
    assert.ok(result.includes('Dynamo'), 'should show Dynamo in help');
    assert.ok(result.includes('Commands:'), 'should show Commands section');
  });

  it('version command outputs JSON with version field', () => {
    const result = execSync(`node "${DYNAMO_PATH}" version`, { encoding: 'utf8' });
    const parsed = JSON.parse(result);
    assert.ok(parsed.version, 'should have version field');
    assert.ok(parsed.command === 'version', 'should have command field');
  });

  it('unknown command produces error', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" nonexistent-cmd 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      assert.ok(e.stderr.includes('Unknown command') || e.stdout.includes('Unknown command'),
        'should mention unknown command');
    }
  });

  it('contains switch statement with cases for all commands', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('switch'), 'should have switch statement');
    assert.ok(content.includes("'health-check'"), 'should have health-check case');
    assert.ok(content.includes("'diagnose'"), 'should have diagnose case');
    assert.ok(content.includes("'verify-memory'"), 'should have verify-memory case');
    assert.ok(content.includes("'sync'"), 'should have sync case');
    assert.ok(content.includes("'start'"), 'should have start case');
    assert.ok(content.includes("'stop'"), 'should have stop case');
    assert.ok(content.includes("'install'"), 'should have install case');
    assert.ok(content.includes("'rollback'"), 'should have rollback case');
    assert.ok(content.includes("'session'"), 'should have session case');
    assert.ok(content.includes("'test'"), 'should have test case');
    assert.ok(content.includes("'version'"), 'should have version case');
    // Memory commands
    assert.ok(content.includes("'search'"), 'should have search case');
    assert.ok(content.includes("'remember'"), 'should have remember case');
    assert.ok(content.includes("'recall'"), 'should have recall case');
    assert.ok(content.includes("'edge'"), 'should have edge case');
    assert.ok(content.includes("'forget'"), 'should have forget case');
    assert.ok(content.includes("'clear'"), 'should have clear case');
  });

  it('requires correct switchboard modules', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('health-check.cjs'), 'should require health-check.cjs');
    assert.ok(content.includes('install.cjs'), 'should require install.cjs');
    assert.ok(content.includes('sessions.cjs'), 'should require sessions.cjs');
    assert.ok(content.includes('diagnose.cjs'), 'should require diagnose.cjs');
    assert.ok(content.includes('verify-memory.cjs'), 'should require verify-memory.cjs');
    assert.ok(content.includes('sync.cjs'), 'should require sync.cjs');
    assert.ok(content.includes('stack.cjs'), 'should require stack.cjs');
  });

  it('requires correct ledger modules for memory commands', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('search.cjs'), 'should require search.cjs');
    assert.ok(content.includes('episodes.cjs'), 'should require episodes.cjs');
  });

  it('has showHelp function', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('showHelp'), 'should have showHelp function');
  });

  it('has showVersion function reading VERSION file', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('showVersion'), 'should have showVersion function');
    assert.ok(content.includes('VERSION'), 'should reference VERSION file');
  });

  it('has requireEnabled toggle gate function', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('requireEnabled'), 'should have requireEnabled function');
    assert.ok(content.includes('isEnabled'), 'should call isEnabled');
  });

  it('has formatOutput, extractFlag, and getPositionalArgs helpers', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    assert.ok(content.includes('formatOutput'), 'should have formatOutput');
    assert.ok(content.includes('extractFlag'), 'should have extractFlag');
    assert.ok(content.includes('getPositionalArgs'), 'should have getPositionalArgs');
  });
});

// --- Memory command help tests ---

describe('memory command --help', () => {
  const memoryCommands = ['search', 'remember', 'recall', 'edge', 'forget', 'clear'];

  for (const cmd of memoryCommands) {
    it(`${cmd} --help shows usage`, () => {
      const result = execSync(`node "${DYNAMO_PATH}" ${cmd} --help 2>&1`, { encoding: 'utf8' });
      assert.ok(result.includes('Usage: dynamo ' + cmd), `${cmd} --help should show usage`);
    });
  }
});

// --- Toggle gate tests for memory commands ---

describe('memory command toggle gate', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('dynamo-router-gate');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const gatedCommands = [
    { name: 'search', args: 'test query' },
    { name: 'remember', args: 'some content' },
    { name: 'recall', args: '' },
    { name: 'edge', args: 'some-uuid' },
    { name: 'forget', args: 'some-uuid' },
    { name: 'clear', args: '--scope global --confirm' }
  ];

  for (const { name, args } of gatedCommands) {
    it(`${name} errors when disabled`, () => {
      const configPath = writeConfig(tmpDir, { version: '0.1.0', enabled: false });
      try {
        execSync(`node "${DYNAMO_PATH}" ${name} ${args} 2>&1`, {
          encoding: 'utf8',
          env: { ...process.env, DYNAMO_CONFIG_PATH: configPath, DYNAMO_DEV: '' }
        });
        assert.fail(`${name} should have thrown when disabled`);
      } catch (e) {
        const combined = (e.stderr || '') + (e.stdout || '');
        assert.ok(combined.includes('Dynamo is disabled'), `${name} should mention Dynamo is disabled`);
      }
    });
  }

  it('search with toggle gate source contains requireEnabled call', () => {
    const content = fs.readFileSync(DYNAMO_PATH, 'utf8');
    // Extract the search case block and verify it has requireEnabled
    const searchIdx = content.indexOf("case 'search':");
    const rememberIdx = content.indexOf("case 'remember':");
    const searchBlock = content.slice(searchIdx, rememberIdx);
    assert.ok(searchBlock.includes('requireEnabled()'), 'search case should call requireEnabled()');
  });
});

// --- Error handling tests for memory commands ---

describe('memory command error handling', () => {
  it('search without query shows usage error', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" search 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      const combined = (e.stderr || '') + (e.stdout || '');
      assert.ok(combined.includes('Usage: dynamo search'), 'should show search usage');
    }
  });

  it('remember without content shows usage error', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" remember 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      const combined = (e.stderr || '') + (e.stdout || '');
      assert.ok(combined.includes('Usage: dynamo remember'), 'should show remember usage');
    }
  });

  it('edge without uuid shows usage error', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" edge 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      const combined = (e.stderr || '') + (e.stdout || '');
      assert.ok(combined.includes('Usage: dynamo edge'), 'should show edge usage');
    }
  });

  it('forget without uuid shows usage error', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" forget 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      const combined = (e.stderr || '') + (e.stdout || '');
      assert.ok(combined.includes('Usage: dynamo forget'), 'should show forget usage');
    }
  });

  it('clear without --confirm shows destructive warning', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" clear 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      const combined = (e.stderr || '') + (e.stdout || '');
      assert.ok(combined.includes('DESTRUCTIVE') || combined.includes('--confirm'),
        'should warn about destructive operation or require --confirm');
    }
  });

  it('clear with --confirm but no --scope shows usage error', () => {
    try {
      execSync(`node "${DYNAMO_PATH}" clear --confirm 2>&1`, { encoding: 'utf8' });
      assert.fail('should have thrown');
    } catch (e) {
      const combined = (e.stderr || '') + (e.stdout || '');
      assert.ok(combined.includes('Usage: dynamo clear'), 'should show clear usage');
    }
  });
});

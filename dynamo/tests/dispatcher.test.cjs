// Dynamo > Tests > dispatcher.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DYNAMO_DIR = path.join(os.homedir(), '.claude', 'dynamo');
const DISPATCHER = path.join(DYNAMO_DIR, 'hooks', 'dynamo-hooks.cjs');
const HANDLERS_DIR = path.join(DYNAMO_DIR, 'lib', 'ledger', 'hooks');

describe('Dispatcher structure', () => {
  it('dispatcher file exists', () => {
    assert.ok(fs.existsSync(DISPATCHER), 'dynamo-hooks.cjs must exist');
  });

  it('dispatcher starts with Dynamo branding', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.startsWith('// Dynamo >'), 'Must start with "// Dynamo >" identity block');
  });

  it('dispatcher contains switch cases for all 5 events', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    for (const evt of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop']) {
      assert.ok(src.includes(`case '${evt}'`), `Missing case for ${evt}`);
    }
  });

  it('dispatcher calls loadEnv before routing', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    const loadEnvIdx = src.indexOf('loadEnv()');
    const switchIdx = src.indexOf('switch');
    assert.ok(loadEnvIdx !== -1, 'Must call loadEnv()');
    assert.ok(switchIdx !== -1, 'Must have switch statement');
    assert.ok(loadEnvIdx < switchIdx, 'loadEnv must be called before switch routing');
  });

  it('dispatcher has stdin timeout guard at 5000ms', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('setTimeout'), 'Must have stdin timeout');
    assert.ok(src.includes('5000'), 'Timeout should be 5000ms');
  });

  it('dispatcher always exits with code 0', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('process.exit(0)'), 'Must exit 0');
  });

  it('dispatcher uses __dirname-based paths (no bare relative requires)', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    // Dispatcher must use __dirname (directly or via HANDLERS variable derived from __dirname)
    assert.ok(src.includes('__dirname'), 'Must reference __dirname for path resolution');
    // Must NOT have bare relative requires like require('./foo') or require('../foo')
    const bareRelatives = src.match(/require\(\s*['"][.\/]/g) || [];
    assert.strictEqual(bareRelatives.length, 0,
      'Must not use bare relative requires without __dirname: ' + bareRelatives.join(', '));
  });
});

describe('Handler exports', () => {
  const handlers = ['session-start', 'prompt-augment', 'capture-change', 'preserve-knowledge', 'session-summary'];

  for (const name of handlers) {
    it(`${name}.cjs exists and exports an async function`, () => {
      const handlerPath = path.join(HANDLERS_DIR, name + '.cjs');
      assert.ok(fs.existsSync(handlerPath), `${name}.cjs must exist`);
      const handler = require(handlerPath);
      assert.strictEqual(typeof handler, 'function', `${name}.cjs must export a function`);
    });
  }

  for (const name of handlers) {
    it(`${name}.cjs starts with "// Dynamo >" branding`, () => {
      const src = fs.readFileSync(path.join(HANDLERS_DIR, name + '.cjs'), 'utf8');
      assert.ok(src.startsWith('// Dynamo >'), `${name}.cjs must start with "// Dynamo >" identity block`);
    });
  }

  it('no handler has bare .catch(() => {})', () => {
    const violations = [];
    for (const name of handlers) {
      const src = fs.readFileSync(path.join(HANDLERS_DIR, name + '.cjs'), 'utf8');
      if (/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(src)) {
        violations.push(name + '.cjs');
      }
    }
    assert.strictEqual(violations.length, 0,
      'Bare .catch(() => {}) found in: ' + violations.join(', '));
  });
});

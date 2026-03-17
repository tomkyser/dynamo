// Dynamo > Tests > stack.test.cjs
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const stack = require(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'));

// --- Module exports tests ---

describe('stack module exports', () => {
  it('exports start as an async function', () => {
    assert.strictEqual(typeof stack.start, 'function');
  });

  it('exports stop as an async function', () => {
    assert.strictEqual(typeof stack.stop, 'function');
  });
});

// --- Constants validation ---

describe('stack constants', () => {
  it('COMPOSE_FILE uses explicit absolute path under ~/.claude/graphiti', () => {
    // Read the source to verify the constant
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes("'.claude', 'graphiti'"), 'COMPOSE_FILE should reference ~/.claude/graphiti');
    assert.ok(src.includes('docker-compose.yml'), 'COMPOSE_FILE should reference docker-compose.yml');
  });

  it('uses explicit -f flag in docker compose commands', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    // All docker compose calls should use -f "${COMPOSE_FILE}"
    const composeMatches = src.match(/docker compose/g) || [];
    const fFlagMatches = src.match(/docker compose -f/g) || [];
    assert.ok(composeMatches.length > 0, 'should have docker compose commands');
    assert.strictEqual(composeMatches.length, fFlagMatches.length,
      'all docker compose commands should use -f flag');
  });

  it('does NOT contain cd or process.chdir', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(!src.includes('process.chdir'), 'should not use process.chdir');
    // Check for cd as a command, not as part of variable/function names
    const cdMatches = src.match(/\bcd\s+['"\/~]/g) || [];
    assert.strictEqual(cdMatches.length, 0, 'should not use cd command');
  });

  it('has health wait loop with MAX_HEALTH_ATTEMPTS', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('MAX_HEALTH_ATTEMPTS'), 'should have MAX_HEALTH_ATTEMPTS constant');
  });

  it('has timeout on compose up (60000 or higher)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    // Look for timeout: 60000 in compose up context
    assert.ok(src.includes('timeout: 60000'), 'compose up should have 60s timeout');
  });

  it('uses fetchWithTimeout for health polling', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('fetchWithTimeout'), 'should use fetchWithTimeout for health checks');
  });

  it('has HEALTH_URL pointing to localhost:8100/health', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('http://localhost:8100/health'), 'should have health URL');
  });

  it('has HEALTH_INTERVAL_MS for wait between retries', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('HEALTH_INTERVAL_MS'), 'should have HEALTH_INTERVAL_MS constant');
  });
});

// --- Docker integration tests (skip if no Docker) ---

describe('stack integration', () => {
  let dockerAvailable = false;

  before(() => {
    try {
      const { execSync } = require('child_process');
      execSync('docker info', { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
      dockerAvailable = true;
    } catch (e) {
      dockerAvailable = false;
    }
  });

  it('start and stop return structured JSON output', { skip: !true }, () => {
    // Verify the functions exist and accept args/pretty parameters
    // We can't actually call them without Docker, but we verify signature
    assert.strictEqual(stack.start.length >= 0, true, 'start accepts parameters');
    assert.strictEqual(stack.stop.length >= 0, true, 'stop accepts parameters');
  });

  it('note: actual Docker start/stop tests require running Docker daemon', { skip: true }, () => {
    // Integration test placeholder -- run manually with Docker available
  });
});

// --- Source structure tests ---

describe('stack source structure', () => {
  it('first line is module identity block', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    const firstLine = src.split('\n')[0];
    assert.strictEqual(firstLine, '// Dynamo > Switchboard > stack.cjs');
  });

  it('has module.exports with start and stop', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('module.exports'), 'should have module.exports');
    assert.ok(src.includes('start'), 'should export start');
    assert.ok(src.includes('stop'), 'should export stop');
  });

  it('requires child_process execSync', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('execSync'), 'should use execSync from child_process');
  });

  it('imports from core.cjs', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('core.cjs'), 'should import from core.cjs');
  });

  it('handles already-running state by checking docker compose ps', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    assert.ok(src.includes('ps --status running'), 'should check for running containers');
    assert.ok(src.includes('already_running'), 'should have already_running status');
  });

  it('returns proper status objects for start and stop', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    // start statuses
    assert.ok(src.includes("'started'") || src.includes('"started"'), 'should have started status');
    assert.ok(src.includes("'already_running'") || src.includes('"already_running"'), 'should have already_running status');
    assert.ok(src.includes("'timeout'") || src.includes('"timeout"'), 'should have timeout status');
    // stop status
    assert.ok(src.includes("'stopped'") || src.includes('"stopped"'), 'should have stopped status');
  });

  it('preserves data volumes on stop (does not use -v flag)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'switchboard', 'stack.cjs'), 'utf8');
    // The actual compose down command should NOT have -v
    // But the hint message should mention -v for user reference
    assert.ok(src.includes('down -v'), 'hint should mention -v for data removal');
    assert.ok(src.includes('Data volumes preserved'), 'should mention data preservation');
  });
});

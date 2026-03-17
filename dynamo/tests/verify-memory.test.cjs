// Dynamo > Tests > verify-memory.test.cjs
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const verifyMemoryPath = path.join(__dirname, '..', 'lib', 'switchboard', 'verify-memory.cjs');

describe('verify-memory module', () => {
  let verifyMemory;

  before(() => {
    verifyMemory = require(verifyMemoryPath);
  });

  describe('module exports', () => {
    it('exports a run function', () => {
      assert.strictEqual(typeof verifyMemory.run, 'function');
    });
  });

  describe('result shape', () => {
    it('returns { command, timestamp, checks, summary } with 6 checks', async () => {
      // Run with no services -- all network checks will fail gracefully
      const result = await verifyMemory.run([], false, true);
      assert.strictEqual(result.command, 'verify-memory');
      assert.strictEqual(typeof result.timestamp, 'string');
      assert.ok(Array.isArray(result.checks));
      assert.strictEqual(result.checks.length, 6);
      assert.ok(result.summary);
      assert.strictEqual(typeof result.summary.passed, 'number');
      assert.strictEqual(typeof result.summary.total, 'number');
      assert.strictEqual(typeof result.summary.ok, 'boolean');
    });

    it('each check has name, status, detail keys', async () => {
      const result = await verifyMemory.run([], false, true);
      for (const check of result.checks) {
        assert.strictEqual(typeof check.name, 'string', `Check should have name, got: ${JSON.stringify(check)}`);
        assert.ok(['OK', 'FAIL', 'WARN', 'SKIP'].includes(check.status),
          `Check status should be OK|FAIL|WARN|SKIP, got: ${check.status}`);
        assert.strictEqual(typeof check.detail, 'string', `Check should have detail string`);
      }
    });
  });

  describe('summary fields', () => {
    it('summary has passed, total, ok fields', async () => {
      const result = await verifyMemory.run([], false, true);
      assert.strictEqual(typeof result.summary.passed, 'number');
      assert.strictEqual(typeof result.summary.total, 'number');
      assert.strictEqual(typeof result.summary.ok, 'boolean');
      assert.strictEqual(result.summary.total, 6);
    });
  });

  describe('local-only checks (session index and list)', () => {
    it('session index check works with valid sessions file', async () => {
      const result = await verifyMemory.run([], false, true);
      // Checks 5 and 6 are session-based, local-only. They should return OK or FAIL
      // depending on whether sessions.json exists. They should not throw.
      const sessionIndexCheck = result.checks[4]; // Check 5
      const sessionListCheck = result.checks[5]; // Check 6
      assert.ok(['OK', 'FAIL'].includes(sessionIndexCheck.status),
        `Session Index check status should be OK or FAIL, got: ${sessionIndexCheck.status}`);
      assert.ok(['OK', 'FAIL'].includes(sessionListCheck.status),
        `Session List check status should be OK or FAIL, got: ${sessionListCheck.status}`);
    });
  });

  describe('graceful failure when MCP unavailable', () => {
    it('checks 1-4 return FAIL gracefully when services are down (no throws)', async () => {
      const result = await verifyMemory.run([], false, true);
      // With no services running, checks 1-4 should be FAIL but NOT throw
      for (let i = 0; i < 4; i++) {
        const check = result.checks[i];
        assert.ok(['FAIL', 'SKIP'].includes(check.status),
          `Check ${i + 1} (${check.name}) should FAIL or SKIP gracefully, got: ${check.status}`);
      }
    });
  });

  describe('check names', () => {
    it('has the expected 6 check names', async () => {
      const result = await verifyMemory.run([], false, true);
      const names = result.checks.map(c => c.name);
      assert.ok(names.includes('Health Endpoint'), `Missing 'Health Endpoint', got: ${names}`);
      assert.ok(names.includes('Write Episode'), `Missing 'Write Episode', got: ${names}`);
      assert.ok(names.includes('Read Back'), `Missing 'Read Back', got: ${names}`);
      assert.ok(names.includes('Scope Isolation'), `Missing 'Scope Isolation', got: ${names}`);
      assert.ok(names.includes('Session Index'), `Missing 'Session Index', got: ${names}`);
      assert.ok(names.includes('Session List'), `Missing 'Session List', got: ${names}`);
    });
  });
});

// Dynamo > Tests > diagnose.test.cjs
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const diagnosePath = path.join(__dirname, '..', 'lib', 'switchboard', 'diagnose.cjs');

// Helper: create mock stage results
function okResult(detail) { return { status: 'OK', detail: detail || 'ok', raw: '' }; }
function failResult(detail) { return { status: 'FAIL', detail: detail || 'failed', raw: '' }; }

describe('diagnose module', () => {
  let diagnose;
  let stagesModule;

  before(() => {
    const stagesPath = path.join(__dirname, '..', 'lib', 'switchboard', 'stages.cjs');
    stagesModule = require(stagesPath);
    diagnose = require(diagnosePath);
  });

  describe('module exports', () => {
    it('exports a run function', () => {
      assert.strictEqual(typeof diagnose.run, 'function');
    });
  });

  describe('result shape', () => {
    it('returns { command, timestamp, stages, summary } with all 13 stage entries', async () => {
      // Mock all 13 stages to return OK
      const originals = {};
      const stageKeys = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];

      for (const key of stageKeys) {
        originals[key] = stagesModule[key];
        stagesModule[key] = async () => okResult(key);
      }

      try {
        const result = await diagnose.run([], false, true);
        assert.strictEqual(result.command, 'diagnose');
        assert.strictEqual(typeof result.timestamp, 'string');
        assert.ok(Array.isArray(result.stages));
        assert.strictEqual(result.stages.length, 13);
        assert.ok(result.summary);
        assert.strictEqual(typeof result.summary.passed, 'number');
        assert.strictEqual(typeof result.summary.failed, 'number');
        assert.strictEqual(typeof result.summary.skipped, 'number');
        assert.strictEqual(typeof result.summary.total, 'number');
        assert.strictEqual(typeof result.summary.ok, 'boolean');
      } finally {
        for (const key of stageKeys) {
          stagesModule[key] = originals[key];
        }
      }
    });
  });

  describe('dependency-based skip logic', () => {
    it('Docker failure skips stages with Docker dependency', async () => {
      const originals = {};
      const stageKeys = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];

      for (const key of stageKeys) {
        originals[key] = stagesModule[key];
        stagesModule[key] = async () => okResult(key);
      }
      // Override Docker to fail
      stagesModule.stageDocker = async () => failResult('Docker not running');

      try {
        const result = await diagnose.run([], false, true);

        // Docker: FAIL
        assert.strictEqual(result.stages[0].status, 'FAIL');
        assert.strictEqual(result.stages[0].name, 'Docker');

        // Neo4j depends on Docker: SKIP
        assert.strictEqual(result.stages[1].status, 'SKIP');

        // Graphiti API depends on Docker, Neo4j: SKIP
        assert.strictEqual(result.stages[2].status, 'SKIP');

        // MCP Session depends on Docker, Graphiti API: SKIP
        assert.strictEqual(result.stages[3].status, 'SKIP');

        // Env Vars (no deps): OK
        assert.strictEqual(result.stages[4].status, 'OK');

        // .env File (no deps): OK
        assert.strictEqual(result.stages[5].status, 'OK');

        // Hook Registrations (no deps): OK
        assert.strictEqual(result.stages[6].status, 'OK');

        // Hook Files (no deps): OK
        assert.strictEqual(result.stages[7].status, 'OK');

        // CJS Modules (no deps): OK
        assert.strictEqual(result.stages[8].status, 'OK');

        // MCP Tool Call depends on MCP Session: SKIP (MCP Session was skipped -> treated as failed dependency)
        assert.strictEqual(result.stages[9].status, 'SKIP');

        // Search Round-trip depends on MCP Session: SKIP
        assert.strictEqual(result.stages[10].status, 'SKIP');

        // Episode Write depends on MCP Session: SKIP
        assert.strictEqual(result.stages[11].status, 'SKIP');

        // Canary depends on MCP Session: SKIP
        assert.strictEqual(result.stages[12].status, 'SKIP');
      } finally {
        for (const key of stageKeys) {
          stagesModule[key] = originals[key];
        }
      }
    });

    it('stages 5-9 run independently even when Docker fails', async () => {
      const originals = {};
      const stageKeys = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];

      for (const key of stageKeys) {
        originals[key] = stagesModule[key];
        stagesModule[key] = async () => okResult(key);
      }
      stagesModule.stageDocker = async () => failResult('Docker down');

      try {
        const result = await diagnose.run([], false, true);

        // Stages 5-9 (indices 4-8) should all be OK (no Docker dependency)
        assert.strictEqual(result.stages[4].status, 'OK');  // Env Vars
        assert.strictEqual(result.stages[5].status, 'OK');  // .env File
        assert.strictEqual(result.stages[6].status, 'OK');  // Hook Registrations
        assert.strictEqual(result.stages[7].status, 'OK');  // Hook Files
        assert.strictEqual(result.stages[8].status, 'OK');  // CJS Modules
      } finally {
        for (const key of stageKeys) {
          stagesModule[key] = originals[key];
        }
      }
    });
  });

  describe('summary counts', () => {
    it('summary has correct counts when all pass', async () => {
      const originals = {};
      const stageKeys = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];

      for (const key of stageKeys) {
        originals[key] = stagesModule[key];
        stagesModule[key] = async () => okResult();
      }

      try {
        const result = await diagnose.run([], false, true);
        assert.strictEqual(result.summary.passed, 13);
        assert.strictEqual(result.summary.failed, 0);
        assert.strictEqual(result.summary.skipped, 0);
        assert.strictEqual(result.summary.total, 13);
        assert.strictEqual(result.summary.ok, true);
      } finally {
        for (const key of stageKeys) {
          stagesModule[key] = originals[key];
        }
      }
    });

    it('summary has correct counts with Docker failure', async () => {
      const originals = {};
      const stageKeys = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];

      for (const key of stageKeys) {
        originals[key] = stagesModule[key];
        stagesModule[key] = async () => okResult();
      }
      stagesModule.stageDocker = async () => failResult('down');

      try {
        const result = await diagnose.run([], false, true);
        // Docker FAIL, Neo4j SKIP, Graphiti SKIP, MCP SKIP, 5 independent OK,
        // MCP Tool Call SKIP, Search SKIP, Episode SKIP, Canary SKIP = 8 skipped
        // 1 failed (Docker) + 5 passed (Env, .env, Hooks, HookFiles, CJS) = 6 non-skip
        assert.strictEqual(result.summary.failed, 1);
        assert.strictEqual(result.summary.passed, 5);
        assert.strictEqual(result.summary.skipped, 7);
        assert.strictEqual(result.summary.ok, false);
      } finally {
        for (const key of stageKeys) {
          stagesModule[key] = originals[key];
        }
      }
    });
  });
});

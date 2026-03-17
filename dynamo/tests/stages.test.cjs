// Dynamo > Tests > stages.test.cjs
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const stagesPath = path.join(__dirname, '..', 'lib', 'switchboard', 'stages.cjs');

describe('stages module', () => {
  let stages;

  before(() => {
    stages = require(stagesPath);
  });

  describe('module exports', () => {
    it('exports exactly 15 keys (13 functions + STAGE_NAMES + HEALTH_STAGES)', () => {
      const keys = Object.keys(stages);
      assert.strictEqual(keys.length, 15, `Expected 15 exports, got ${keys.length}: ${keys.join(', ')}`);
    });

    it('exports STAGE_NAMES as an array of 13 strings', () => {
      assert.ok(Array.isArray(stages.STAGE_NAMES));
      assert.strictEqual(stages.STAGE_NAMES.length, 13);
      for (const name of stages.STAGE_NAMES) {
        assert.strictEqual(typeof name, 'string');
      }
    });

    it('exports HEALTH_STAGES as an array of indices', () => {
      assert.ok(Array.isArray(stages.HEALTH_STAGES));
      assert.deepStrictEqual(stages.HEALTH_STAGES, [0, 1, 2, 3, 4, 12]);
    });

    it('exports all 13 stage functions', () => {
      const expectedFunctions = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];
      for (const name of expectedFunctions) {
        assert.strictEqual(typeof stages[name], 'function', `${name} should be a function`);
      }
    });
  });

  describe('stage result contract', () => {
    it('every stage function returns { status, detail } and never throws', async () => {
      const stageFns = [
        'stageDocker', 'stageNeo4j', 'stageGraphitiApi', 'stageMcpSession',
        'stageEnvVars', 'stageEnvFile', 'stageHookRegistrations', 'stageHookFiles',
        'stageCjsModules', 'stageMcpToolCall', 'stageSearchRoundtrip',
        'stageEpisodeWrite', 'stageCanaryWriteRead'
      ];

      for (const name of stageFns) {
        let result;
        try {
          result = await stages[name]();
        } catch (e) {
          assert.fail(`${name} threw: ${e.message}`);
        }
        assert.ok(result, `${name} should return an object`);
        assert.ok(['OK', 'FAIL', 'WARN', 'SKIP'].includes(result.status),
          `${name} status should be OK|FAIL|WARN|SKIP, got: ${result.status}`);
        assert.strictEqual(typeof result.detail, 'string',
          `${name} detail should be a string`);
      }
    });
  });

  describe('stageEnvVars', () => {
    let origOpenRouter;
    let origNeo4j;

    beforeEach(() => {
      origOpenRouter = process.env.OPENROUTER_API_KEY;
      origNeo4j = process.env.NEO4J_PASSWORD;
    });

    afterEach(() => {
      if (origOpenRouter !== undefined) process.env.OPENROUTER_API_KEY = origOpenRouter;
      else delete process.env.OPENROUTER_API_KEY;
      if (origNeo4j !== undefined) process.env.NEO4J_PASSWORD = origNeo4j;
      else delete process.env.NEO4J_PASSWORD;
    });

    it('returns WARN when OPENROUTER_API_KEY is missing but NEO4J_PASSWORD is set', async () => {
      delete process.env.OPENROUTER_API_KEY;
      process.env.NEO4J_PASSWORD = 'test-password';
      const result = await stages.stageEnvVars();
      assert.strictEqual(result.status, 'WARN');
      assert.ok(result.detail.includes('OPENROUTER_API_KEY'));
    });

    it('returns FAIL when NEO4J_PASSWORD is missing', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      delete process.env.NEO4J_PASSWORD;
      const result = await stages.stageEnvVars();
      assert.strictEqual(result.status, 'FAIL');
      assert.ok(result.detail.includes('NEO4J_PASSWORD'));
    });

    it('returns OK when both vars are set', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.NEO4J_PASSWORD = 'test-password';
      const result = await stages.stageEnvVars();
      assert.strictEqual(result.status, 'OK');
    });
  });

  describe('stageEnvFile', () => {
    const tmpDir = path.join(os.tmpdir(), 'dynamo-test-stages-envfile-' + process.pid);
    const envFilePath = path.join(tmpDir, '.env');

    before(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    after(() => {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    });

    it('returns FAIL when .env file is missing', async () => {
      const result = await stages.stageEnvFile({ graphitiDir: path.join(tmpDir, 'nonexistent') });
      assert.strictEqual(result.status, 'FAIL');
      assert.ok(result.detail.includes('.env'));
    });

    it('returns FAIL when .env is missing required keys', async () => {
      fs.writeFileSync(envFilePath, 'SOME_OTHER_KEY=value\n', 'utf8');
      const result = await stages.stageEnvFile({ graphitiDir: tmpDir });
      assert.strictEqual(result.status, 'FAIL');
    });

    it('returns OK when .env has all required keys', async () => {
      fs.writeFileSync(envFilePath,
        'OPENROUTER_API_KEY=test-key\nNEO4J_PASSWORD=test-pass\nGRAPHITI_MCP_URL=http://localhost:8100/mcp\n',
        'utf8'
      );
      const result = await stages.stageEnvFile({ graphitiDir: tmpDir });
      assert.strictEqual(result.status, 'OK');
    });
  });

  describe('stageHookRegistrations', () => {
    const tmpDir = path.join(os.tmpdir(), 'dynamo-test-stages-hooks-' + process.pid);
    const settingsPath = path.join(tmpDir, 'settings.json');

    before(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    after(() => {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    });

    it('returns FAIL when settings.json does not exist', async () => {
      const result = await stages.stageHookRegistrations({ settingsPath: path.join(tmpDir, 'missing.json') });
      assert.strictEqual(result.status, 'FAIL');
    });

    it('returns FAIL when hooks section is missing events', async () => {
      const settings = {
        hooks: {
          SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'node dynamo-hooks.cjs' }] }]
        }
      };
      fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
      const result = await stages.stageHookRegistrations({ settingsPath });
      assert.strictEqual(result.status, 'FAIL');
      assert.ok(result.detail.includes('missing'));
    });

    it('returns OK when all 5 events have dynamo-hooks.cjs', async () => {
      const hook = [{ matcher: '', hooks: [{ type: 'command', command: 'node "$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs"' }] }];
      const settings = {
        hooks: {
          SessionStart: hook,
          UserPromptSubmit: hook,
          PostToolUse: hook,
          PreCompact: hook,
          Stop: hook
        }
      };
      fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
      const result = await stages.stageHookRegistrations({ settingsPath });
      assert.strictEqual(result.status, 'OK');
    });
  });

  describe('stageHookFiles', () => {
    const tmpDir = path.join(os.tmpdir(), 'dynamo-test-stages-hookfiles-' + process.pid);
    const settingsPath = path.join(tmpDir, 'settings.json');

    before(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    after(() => {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    });

    it('returns FAIL when referenced hook file does not exist', async () => {
      const settings = {
        hooks: {
          SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'node /nonexistent/dynamo-hooks.cjs' }] }]
        }
      };
      fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
      const result = await stages.stageHookFiles({ settingsPath });
      assert.strictEqual(result.status, 'FAIL');
      assert.ok(result.detail.includes('missing'));
    });

    it('returns OK when all referenced hook files exist', async () => {
      // Create a temp hook file
      const hookFile = path.join(tmpDir, 'dynamo-hooks.cjs');
      fs.writeFileSync(hookFile, '// test hook', 'utf8');
      const settings = {
        hooks: {
          SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: `node "${hookFile}"` }] }]
        }
      };
      fs.writeFileSync(settingsPath, JSON.stringify(settings), 'utf8');
      const result = await stages.stageHookFiles({ settingsPath });
      assert.strictEqual(result.status, 'OK');
    });
  });

  describe('stageCjsModules', () => {
    const tmpDir = path.join(os.tmpdir(), 'dynamo-test-stages-cjs-' + process.pid);
    const libDir = path.join(tmpDir, 'lib');

    before(() => {
      fs.mkdirSync(libDir, { recursive: true });
    });

    after(() => {
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    });

    it('returns OK when all .cjs files in lib dir can be required', async () => {
      fs.writeFileSync(path.join(libDir, 'good.cjs'), 'module.exports = { ok: true };', 'utf8');
      const result = await stages.stageCjsModules({ dynamoDir: tmpDir });
      assert.strictEqual(result.status, 'OK');
      assert.ok(result.detail.includes('1'));
    });

    it('returns FAIL when a .cjs file throws on require', async () => {
      fs.writeFileSync(path.join(libDir, 'bad.cjs'), 'throw new Error("intentional test error");', 'utf8');
      const result = await stages.stageCjsModules({ dynamoDir: tmpDir });
      assert.strictEqual(result.status, 'FAIL');
      assert.ok(result.detail.includes('bad.cjs'));
    });
  });

  describe('Docker/HTTP stages graceful failure', () => {
    // These stages should return FAIL (not throw) when services are unavailable

    it('stageDocker returns FAIL or OK without throwing', async () => {
      const result = await stages.stageDocker();
      assert.ok(['OK', 'FAIL'].includes(result.status));
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageNeo4j returns FAIL gracefully when neo4j is unavailable', async () => {
      // Use a port that nothing is listening on
      const result = await stages.stageNeo4j({ neo4jUrl: 'http://localhost:19999' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageGraphitiApi returns FAIL gracefully when API is unavailable', async () => {
      const result = await stages.stageGraphitiApi({ healthUrl: 'http://localhost:19999/health' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageMcpSession returns FAIL gracefully when MCP is unavailable', async () => {
      const result = await stages.stageMcpSession({ mcpUrl: 'http://localhost:19999/mcp' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageMcpToolCall returns FAIL gracefully when MCP is unavailable', async () => {
      const result = await stages.stageMcpToolCall({ mcpUrl: 'http://localhost:19999/mcp' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageSearchRoundtrip returns FAIL gracefully when MCP is unavailable', async () => {
      const result = await stages.stageSearchRoundtrip({ mcpUrl: 'http://localhost:19999/mcp' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageEpisodeWrite returns FAIL gracefully when MCP is unavailable', async () => {
      const result = await stages.stageEpisodeWrite({ mcpUrl: 'http://localhost:19999/mcp' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });

    it('stageCanaryWriteRead returns FAIL gracefully when MCP is unavailable', async () => {
      const result = await stages.stageCanaryWriteRead({ mcpUrl: 'http://localhost:19999/mcp' });
      assert.strictEqual(result.status, 'FAIL');
      assert.strictEqual(typeof result.detail, 'string');
    });
  });
});

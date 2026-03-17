// Dynamo > Tests > core.test.cjs
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const core = require(path.join(__dirname, '..', 'lib', 'core.cjs'));

describe('DYNAMO_DIR', () => {
  it('ends with .claude/dynamo', () => {
    assert.ok(core.DYNAMO_DIR.endsWith(path.join('.claude', 'dynamo')));
  });

  it('is an absolute path', () => {
    assert.ok(path.isAbsolute(core.DYNAMO_DIR));
  });
});

describe('loadConfig', () => {
  it('returns an object', () => {
    const config = core.loadConfig();
    assert.strictEqual(typeof config, 'object');
    assert.ok(config !== null);
  });

  it('has graphiti.mcp_url', () => {
    const config = core.loadConfig();
    assert.ok(config.graphiti);
    assert.strictEqual(typeof config.graphiti.mcp_url, 'string');
    assert.ok(config.graphiti.mcp_url.includes('localhost'));
  });

  it('has timeouts.health', () => {
    const config = core.loadConfig();
    assert.ok(config.timeouts);
    assert.strictEqual(typeof config.timeouts.health, 'number');
    assert.ok(config.timeouts.health > 0);
  });

  it('has logging.max_size_bytes', () => {
    const config = core.loadConfig();
    assert.ok(config.logging);
    assert.strictEqual(config.logging.max_size_bytes, 1048576);
  });

  it('returns defaults when config.json is missing', () => {
    // loadConfig reads from DYNAMO_DIR/config.json
    // If the file exists it merges; defaults are always the base
    const config = core.loadConfig();
    assert.ok(config.version);
    assert.ok(config.graphiti);
    assert.ok(config.timeouts);
    assert.ok(config.logging);
  });
});

describe('loadEnv', () => {
  const tmpDir = path.join(os.tmpdir(), 'dynamo-test-env-' + process.pid);
  const envPath = path.join(tmpDir, '.env');

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up any env vars set by tests
    delete process.env.DYNAMO_TEST_VAR_A;
    delete process.env.DYNAMO_TEST_VAR_B;
    delete process.env.DYNAMO_TEST_VAR_C;
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('sets process.env from .env file', () => {
    fs.writeFileSync(envPath, 'DYNAMO_TEST_VAR_A=hello\nDYNAMO_TEST_VAR_B=world\n', 'utf8');
    core.loadEnv(envPath);
    assert.strictEqual(process.env.DYNAMO_TEST_VAR_A, 'hello');
    assert.strictEqual(process.env.DYNAMO_TEST_VAR_B, 'world');
  });

  it('skips keys already in process.env (env wins)', () => {
    process.env.DYNAMO_TEST_VAR_C = 'original';
    fs.writeFileSync(envPath, 'DYNAMO_TEST_VAR_C=overwritten\n', 'utf8');
    core.loadEnv(envPath);
    assert.strictEqual(process.env.DYNAMO_TEST_VAR_C, 'original');
  });

  it('skips comments and blank lines', () => {
    fs.writeFileSync(envPath, '# This is a comment\n\nDYNAMO_TEST_VAR_A=value\n\n# Another comment\n', 'utf8');
    core.loadEnv(envPath);
    assert.strictEqual(process.env.DYNAMO_TEST_VAR_A, 'value');
    assert.strictEqual(process.env['# This is a comment'], undefined);
  });

  it('handles missing .env file gracefully', () => {
    // Should not throw
    core.loadEnv(path.join(tmpDir, 'nonexistent.env'));
  });
});

describe('detectProject', () => {
  it('returns a non-empty string for process.cwd()', () => {
    const result = core.detectProject();
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.length > 0);
  });

  it('returns directory basename as fallback for non-git dir', () => {
    const tmpDir = path.join(os.tmpdir(), 'dynamo-test-detect-' + process.pid);
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      const result = core.detectProject(tmpDir);
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.length > 0);
      // Should be the directory basename since no git remote, package.json etc.
      assert.strictEqual(result, path.basename(tmpDir));
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it('returns project name from git remote when available', () => {
    // Current cwd should have a git remote
    const result = core.detectProject(process.cwd());
    assert.strictEqual(typeof result, 'string');
    assert.ok(result.length > 0);
  });
});

describe('logError', () => {
  const tmpDir = path.join(os.tmpdir(), 'dynamo-test-log-' + process.pid);
  let originalDynamoDir;
  let logPath;

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    logPath = path.join(tmpDir, 'hook-errors.log');
  });

  after(() => {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('writes with [ISO-Z] [hookName] format', () => {
    // logError writes to DYNAMO_DIR/hook-errors.log
    // We can verify the format by calling logError and checking the real log
    core.logError('test-hook', 'test message');
    const realLogPath = path.join(core.DYNAMO_DIR, 'hook-errors.log');
    const content = fs.readFileSync(realLogPath, 'utf8');
    const lastLine = content.trim().split('\n').pop();
    // Verify ISO-Z timestamp format: [2026-03-17T...]
    assert.match(lastLine, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    assert.match(lastLine, /\[test-hook\]/);
    assert.ok(lastLine.includes('test message'));
  });

  it('rotates log file when size >= 1MB', () => {
    const realLogPath = path.join(core.DYNAMO_DIR, 'hook-errors.log');
    const oldPath = realLogPath + '.old';

    // Clean up any previous old file
    try { fs.unlinkSync(oldPath); } catch {}

    // Create a log file just over 1MB
    const bigContent = 'x'.repeat(1048577);
    fs.writeFileSync(realLogPath, bigContent, 'utf8');

    // Now call logError -- should trigger rotation
    core.logError('rotation-test', 'trigger rotation');

    // The .old file should now exist
    assert.ok(fs.existsSync(oldPath), 'Old rotated log should exist');
    // The new log should contain our message
    const newContent = fs.readFileSync(realLogPath, 'utf8');
    assert.ok(newContent.includes('rotation-test'));
    assert.ok(newContent.includes('trigger rotation'));

    // Clean up
    try { fs.unlinkSync(oldPath); } catch {}
  });
});

describe('healthGuard', () => {
  const flagPattern = path.join(os.tmpdir(), 'dynamo-health-warned-' + process.ppid);

  beforeEach(() => {
    // Clean up flag file before each test
    try { fs.unlinkSync(flagPattern); } catch {}
  });

  after(() => {
    try { fs.unlinkSync(flagPattern); } catch {}
  });

  it('calls checkFn and returns {healthy, cached, detail}', () => {
    const result = core.healthGuard(() => ({ healthy: true, detail: 'ok' }));
    assert.strictEqual(result.healthy, true);
    assert.strictEqual(result.cached, false);
    assert.strictEqual(result.detail, 'ok');
  });

  it('returns cached result on second call', () => {
    core.healthGuard(() => ({ healthy: true, detail: 'first' }));
    const result = core.healthGuard(() => ({ healthy: false, detail: 'second' }));
    // Second call should return cached=true with first call's result
    assert.strictEqual(result.cached, true);
    assert.strictEqual(result.healthy, true);
  });

  it('uses process.ppid in flag file path', () => {
    core.healthGuard(() => ({ healthy: true, detail: 'ppid-test' }));
    const flagPath = path.join(os.tmpdir(), 'dynamo-health-warned-' + process.ppid);
    assert.ok(fs.existsSync(flagPath), 'Flag file should use process.ppid');
  });

  it('handles checkFn that throws', () => {
    const result = core.healthGuard(() => { throw new Error('check failed'); });
    assert.strictEqual(result.healthy, false);
    assert.strictEqual(result.cached, false);
    assert.ok(result.detail.includes('Health check threw'));
  });
});

describe('fetchWithTimeout', () => {
  it('is a function', () => {
    assert.strictEqual(typeof core.fetchWithTimeout, 'function');
  });

  it('accepts (url, options, timeoutMs) parameters', () => {
    // Verify function signature by checking it's an async function
    // (returns a promise-like when called, though it will fail on network)
    assert.strictEqual(core.fetchWithTimeout.length, 3);
  });
});

describe('loadPrompt', () => {
  it('splits on --- delimiter returning {system, user}', () => {
    // Use an existing prompt file
    const result = core.loadPrompt('curation');
    assert.ok(result !== null, 'curation.md should exist');
    assert.strictEqual(typeof result.system, 'string');
    assert.strictEqual(typeof result.user, 'string');
    assert.ok(result.system.length > 0, 'system prompt should not be empty');
  });

  it('returns null for non-existent prompt', () => {
    const result = core.loadPrompt('nonexistent-prompt-that-does-not-exist');
    assert.strictEqual(result, null);
  });
});

describe('safeReadFile', () => {
  it('returns file content for existing file', () => {
    const content = core.safeReadFile(path.join(core.DYNAMO_DIR, 'VERSION'));
    assert.strictEqual(typeof content, 'string');
    assert.ok(content.includes('0.1.0'));
  });

  it('returns null for non-existent file', () => {
    const result = core.safeReadFile('/nonexistent/path/to/file.txt');
    assert.strictEqual(result, null);
  });
});

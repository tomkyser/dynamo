'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { isOk, isErr, unwrap } = require('../../../lib/index.cjs');

const { spawnTerminalWindow } = require('./terminal-spawn.cjs');

/**
 * Creates mock deps for options-based DI testing of terminal-spawn.
 * Captures all calls to execSync and writeFileSync for assertion.
 */
function createMockDeps() {
  const execSyncCalls = [];
  const writeFileSyncCalls = [];

  return {
    deps: {
      execSync(...args) { execSyncCalls.push(args); return ''; },
      writeFileSync(...args) { writeFileSyncCalls.push(args); },
    },
    execSyncCalls,
    writeFileSyncCalls,
  };
}

describe('terminal-spawn', () => {
  let mocks;

  beforeEach(() => {
    mocks = createMockDeps();
  });

  describe('spawnTerminalWindow', () => {
    it('Test 1: writes a temp .sh file to /tmp/dynamo-session-{title}.sh', () => {
      const result = spawnTerminalWindow({
        command: 'claude --dangerously-load-development-channels server:/path/to/server.cjs',
        env: { SESSION_IDENTITY: 'secondary' },
        title: 'dynamo-secondary-abc12345',
        _deps: mocks.deps,
      });

      expect(isOk(result)).toBe(true);
      expect(mocks.writeFileSyncCalls.length).toBeGreaterThanOrEqual(1);

      const scriptPath = mocks.writeFileSyncCalls[0][0];
      expect(scriptPath).toMatch(/^\/tmp\/dynamo-session-/);
      expect(scriptPath).toContain('dynamo-secondary-abc12345');
      expect(scriptPath).toEndWith('.sh');
    });

    it('Test 2: temp script contains correct shebang (#!/bin/bash)', () => {
      spawnTerminalWindow({
        command: 'claude --dangerously-load-development-channels server:/path/to/server.cjs',
        env: {},
        title: 'test-shebang',
        _deps: mocks.deps,
      });

      const scriptContent = mocks.writeFileSyncCalls[0][1];
      expect(scriptContent.startsWith('#!/bin/bash')).toBe(true);
    });

    it('Test 3: temp script contains export lines for every env key-value pair', () => {
      spawnTerminalWindow({
        command: 'echo hello',
        env: {
          SESSION_IDENTITY: 'secondary',
          WIRE_RELAY_URL: 'http://127.0.0.1:9876',
          TRIPLET_ID: 'triplet-a1b2',
        },
        title: 'test-env',
        _deps: mocks.deps,
      });

      const scriptContent = mocks.writeFileSyncCalls[0][1];
      expect(scriptContent).toContain('export SESSION_IDENTITY=');
      expect(scriptContent).toContain('"secondary"');
      expect(scriptContent).toContain('export WIRE_RELAY_URL=');
      expect(scriptContent).toContain('"http://127.0.0.1:9876"');
      expect(scriptContent).toContain('export TRIPLET_ID=');
      expect(scriptContent).toContain('"triplet-a1b2"');
    });

    it('Test 4: temp script contains the command as last line with exec prefix', () => {
      spawnTerminalWindow({
        command: 'claude --dangerously-load-development-channels server:/path/to/server.cjs',
        env: {},
        title: 'test-exec',
        _deps: mocks.deps,
      });

      const scriptContent = mocks.writeFileSyncCalls[0][1];
      const lines = scriptContent.split('\n').filter(l => l.trim() !== '');
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toStartWith('exec ');
      expect(lastLine).toContain('claude --dangerously-load-development-channels');
    });

    it('Test 5: temp script has executable permissions (mode 0o755)', () => {
      spawnTerminalWindow({
        command: 'echo test',
        env: {},
        title: 'test-mode',
        _deps: mocks.deps,
      });

      const writeOptions = mocks.writeFileSyncCalls[0][2];
      expect(writeOptions).toBeDefined();
      expect(writeOptions.mode).toBe(0o755);
    });

    it('Test 6: execSync is called to open terminal window (osascript for Terminal.app, open for others)', () => {
      spawnTerminalWindow({
        command: 'echo test',
        env: {},
        title: 'test-osascript',
        _deps: mocks.deps,
      });

      expect(mocks.execSyncCalls.length).toBeGreaterThanOrEqual(1);
      const cmd = mocks.execSyncCalls[0][0];
      // Depending on TERM_PROGRAM, either osascript or open is called
      const isOsascript = cmd.includes('osascript');
      const isOpen = cmd.includes('open');
      expect(isOsascript || isOpen).toBe(true);
    });

    it('Test 7: returns ok({ scriptPath, title })', () => {
      const result = spawnTerminalWindow({
        command: 'echo test',
        env: {},
        title: 'test-return',
        _deps: mocks.deps,
      });

      expect(isOk(result)).toBe(true);
      const value = unwrap(result);
      expect(value.scriptPath).toBeDefined();
      expect(value.scriptPath).toContain('/tmp/dynamo-session-');
      expect(value.title).toBe('test-return');
    });

    it('Test 8: missing command parameter returns err(MISSING_PARAM)', () => {
      const result = spawnTerminalWindow({
        env: {},
        title: 'test-missing',
        _deps: mocks.deps,
      });

      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('MISSING_PARAM');
    });
  });
});

'use strict';

const { describe, it, expect, beforeEach, afterEach, mock } = require('bun:test');
const { isOk, isErr, unwrap, ok } = require('../../../../lib/index.cjs');

const { createSessionSpawner } = require('../session-spawner.cjs');

/**
 * Creates a mock Switchboard for capturing emit calls.
 */
function createMockSwitchboard() {
  const calls = [];
  return {
    emit(eventName, payload) { calls.push({ eventName, payload }); },
    getCalls() { return calls; },
  };
}

/**
 * Creates a mock process object mimicking Bun.spawn result.
 */
function createMockProc(pid) {
  return {
    pid: pid || 12345,
    killed: false,
    exitCode: null,
    kill() { this.killed = true; this.exitCode = 0; },
    stdin: { write() {}, end() {} },
    stdout: { text() { return Promise.resolve(''); } },
    stderr: { text() { return Promise.resolve(''); } },
  };
}

describe('session-spawner', () => {
  let spawner;
  let mockSwitchboard;
  let originalBunSpawn;
  let spawnCalls;

  beforeEach(() => {
    mockSwitchboard = createMockSwitchboard();
    spawnCalls = [];

    // Save and mock Bun.spawn
    originalBunSpawn = Bun.spawn;
    Bun.spawn = function mockSpawn(args, opts) {
      const proc = createMockProc(10000 + spawnCalls.length);
      spawnCalls.push({ args, opts, proc });
      return proc;
    };

    spawner = createSessionSpawner({
      channelServerPath: '/path/to/channel-server.cjs',
      switchboard: mockSwitchboard,
    });
  });

  afterEach(() => {
    Bun.spawn = originalBunSpawn;
  });

  describe('spawn', () => {
    it('calls Bun.spawn with claude and --dangerously-load-development-channels flag', () => {
      const result = spawner.spawn({ sessionId: 'sess-1', identity: 'primary' });
      expect(isOk(result)).toBe(true);

      expect(spawnCalls).toHaveLength(1);
      const call = spawnCalls[0];
      expect(call.args).toContain('claude');
      expect(call.args).toContain('--dangerously-load-development-channels');
    });

    it('passes environment variables WIRE_RELAY_URL, SESSION_ID, SESSION_IDENTITY', () => {
      spawner.spawn({
        sessionId: 'sess-2',
        identity: 'secondary',
        env: { relayUrl: 'http://localhost:3000' },
      });

      const call = spawnCalls[0];
      expect(call.opts.env.WIRE_RELAY_URL).toBe('http://localhost:3000');
      expect(call.opts.env.SESSION_ID).toBe('sess-2');
      expect(call.opts.env.SESSION_IDENTITY).toBe('secondary');
    });

    it('returns ok({ sessionId, pid, proc }) on success', () => {
      const result = spawner.spawn({ sessionId: 'sess-3', identity: 'tertiary' });
      expect(isOk(result)).toBe(true);

      const value = unwrap(result);
      expect(value.sessionId).toBe('sess-3');
      expect(typeof value.pid).toBe('number');
      expect(value.proc).toBeDefined();
    });

    it('emits infra:session-spawned via switchboard', () => {
      spawner.spawn({ sessionId: 'sess-4', identity: 'primary' });

      const calls = mockSwitchboard.getCalls();
      const spawnEvent = calls.find(c => c.eventName === 'infra:session-spawned');
      expect(spawnEvent).toBeDefined();
      expect(spawnEvent.payload.sessionId).toBe('sess-4');
      expect(spawnEvent.payload.identity).toBe('primary');
    });
  });

  describe('stop', () => {
    it('terminates the process and returns ok()', () => {
      spawner.spawn({ sessionId: 'sess-5', identity: 'primary' });
      const result = spawner.stop('sess-5');
      expect(isOk(result)).toBe(true);
      expect(unwrap(result).sessionId).toBe('sess-5');
    });

    it('on unknown sessionId returns err(SESSION_NOT_FOUND)', () => {
      const result = spawner.stop('nonexistent');
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('emits infra:session-stopped via switchboard', () => {
      spawner.spawn({ sessionId: 'sess-6', identity: 'secondary' });
      spawner.stop('sess-6');

      const calls = mockSwitchboard.getCalls();
      const stopEvent = calls.find(c => c.eventName === 'infra:session-stopped');
      expect(stopEvent).toBeDefined();
      expect(stopEvent.payload.sessionId).toBe('sess-6');
    });
  });

  describe('health', () => {
    it('returns { alive: true, pid, uptime } for a spawned session', () => {
      spawner.spawn({ sessionId: 'sess-7', identity: 'primary' });
      const result = spawner.health('sess-7');
      expect(isOk(result)).toBe(true);

      const value = unwrap(result);
      expect(value.sessionId).toBe('sess-7');
      expect(value.alive).toBe(true);
      expect(typeof value.pid).toBe('number');
      expect(typeof value.uptime).toBe('number');
      expect(value.uptime).toBeGreaterThanOrEqual(0);
    });

    it('returns { alive: false } for a killed session', () => {
      spawner.spawn({ sessionId: 'sess-8', identity: 'primary' });
      // Manually kill the proc
      const proc = spawnCalls[0].proc;
      proc.kill();

      const result = spawner.health('sess-8');
      expect(isOk(result)).toBe(true);
      expect(unwrap(result).alive).toBe(false);
    });

    it('returns err(SESSION_NOT_FOUND) for unknown sessionId', () => {
      const result = spawner.health('nonexistent');
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('list', () => {
    it('returns array of { sessionId, identity, alive } for all tracked sessions', () => {
      spawner.spawn({ sessionId: 'sess-a', identity: 'primary' });
      spawner.spawn({ sessionId: 'sess-b', identity: 'secondary' });

      const list = spawner.list();
      expect(list).toHaveLength(2);
      expect(list[0].sessionId).toBe('sess-a');
      expect(list[0].identity).toBe('primary');
      expect(list[0].alive).toBe(true);
      expect(list[1].sessionId).toBe('sess-b');
      expect(list[1].identity).toBe('secondary');
    });
  });
});

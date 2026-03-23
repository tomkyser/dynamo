'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { isOk, isErr, unwrap, ok } = require('../../../../lib/index.cjs');

/**
 * Creates a mock Switchboard that records emit calls.
 * @returns {Object} Mock switchboard with getCalls() for inspection
 */
function createMockSwitchboard() {
  const calls = [];
  return {
    emit(eventName, payload) { calls.push({ eventName, payload }); },
    on() { return () => {}; },
    off() {},
    filter() { return ok(undefined); },
    init() { return ok(undefined); },
    start() { return ok(undefined); },
    stop() { return ok(undefined); },
    healthCheck() { return ok({ healthy: true, name: 'switchboard' }); },
    getCalls() { return calls; }
  };
}

/**
 * Creates a mock provider that stores state in memory.
 * @returns {Object} Mock provider with getStored() for inspection
 */
function createMockProvider() {
  let stored = { global: {}, session: {}, module: {} };
  let saveCount = 0;
  return {
    load: async () => ok(structuredClone(stored)),
    save: async (state, _options) => { stored = structuredClone(state); saveCount++; return ok(undefined); },
    clear: async (scope) => { stored[scope] = {}; return ok(undefined); },
    getStored() { return stored; },
    getSaveCount() { return saveCount; }
  };
}

// Lazy-load createMagnet -- will fail until GREEN phase
const { createMagnet } = require('../magnet.cjs');

describe('Magnet', () => {
  let magnet;
  let mockSwitchboard;
  let mockProvider;

  beforeEach(async () => {
    mockSwitchboard = createMockSwitchboard();
    mockProvider = createMockProvider();

    const result = createMagnet();
    expect(isOk(result)).toBe(true);
    magnet = unwrap(result);

    await magnet.init({ switchboard: mockSwitchboard, provider: mockProvider });
    magnet.start();
  });

  describe('contract validation', () => {
    it('createMagnet() returns Ok with frozen object', () => {
      const result = createMagnet();
      expect(isOk(result)).toBe(true);
      expect(Object.isFrozen(unwrap(result))).toBe(true);
    });

    it('result contains all required methods', () => {
      const m = unwrap(createMagnet());
      const required = ['init', 'start', 'stop', 'healthCheck', 'get', 'set', 'delete', 'getScope', 'registerProvider'];
      for (const method of required) {
        expect(typeof m[method]).toBe('function');
      }
    });
  });

  describe('global scope', () => {
    it('set then get returns the stored value', async () => {
      await magnet.set('global', 'version', '1.0');
      const value = magnet.get('global', 'version');
      expect(value).toBe('1.0');
    });

    it('get returns undefined for missing keys', () => {
      const value = magnet.get('global', 'nonexistent');
      expect(value).toBeUndefined();
    });

    it('delete removes the key', async () => {
      await magnet.set('global', 'temp', 'data');
      expect(magnet.get('global', 'temp')).toBe('data');
      await magnet.delete('global', 'temp');
      expect(magnet.get('global', 'temp')).toBeUndefined();
    });

    it('getScope returns all key-value pairs in global scope', async () => {
      await magnet.set('global', 'a', 1);
      await magnet.set('global', 'b', 2);
      const scope = magnet.getScope('global');
      expect(scope).toEqual({ a: 1, b: 2 });
    });

    it('getScope returns a shallow copy (not a reference)', async () => {
      await magnet.set('global', 'key', 'value');
      const scope = magnet.getScope('global');
      scope.key = 'mutated';
      expect(magnet.get('global', 'key')).toBe('value');
    });
  });

  describe('session scope', () => {
    it('set then get with session ID returns the stored value', async () => {
      await magnet.set('session', 'sess-1', 'activeTab', 'chat');
      const value = magnet.get('session', 'sess-1', 'activeTab');
      expect(value).toBe('chat');
    });

    it('different session IDs are isolated', async () => {
      await magnet.set('session', 'sess-1', 'key', 'val1');
      await magnet.set('session', 'sess-2', 'key', 'val2');
      expect(magnet.get('session', 'sess-1', 'key')).toBe('val1');
      expect(magnet.get('session', 'sess-2', 'key')).toBe('val2');
    });

    it('get returns undefined for missing session or key', () => {
      expect(magnet.get('session', 'nonexistent', 'key')).toBeUndefined();
    });

    it('getScope with namespace returns all pairs for that session', async () => {
      await magnet.set('session', 'sess-1', 'tab', 'chat');
      await magnet.set('session', 'sess-1', 'theme', 'dark');
      const scope = magnet.getScope('session', 'sess-1');
      expect(scope).toEqual({ tab: 'chat', theme: 'dark' });
    });

    it('getScope with missing namespace returns empty object', () => {
      const scope = magnet.getScope('session', 'nonexistent');
      expect(scope).toEqual({});
    });

    it('delete removes a session-scoped key', async () => {
      await magnet.set('session', 'sess-1', 'key', 'value');
      await magnet.delete('session', 'sess-1', 'key');
      expect(magnet.get('session', 'sess-1', 'key')).toBeUndefined();
    });
  });

  describe('module scope', () => {
    it('set then get with module name returns the stored value', async () => {
      await magnet.set('module', 'reverie', 'active', true);
      const value = magnet.get('module', 'reverie', 'active');
      expect(value).toBe(true);
    });

    it('different module names are isolated', async () => {
      await magnet.set('module', 'reverie', 'key', 'r-val');
      await magnet.set('module', 'other', 'key', 'o-val');
      expect(magnet.get('module', 'reverie', 'key')).toBe('r-val');
      expect(magnet.get('module', 'other', 'key')).toBe('o-val');
    });

    it('getScope with module name returns all pairs for that module', async () => {
      await magnet.set('module', 'reverie', 'active', true);
      await magnet.set('module', 'reverie', 'mode', 'default');
      const scope = magnet.getScope('module', 'reverie');
      expect(scope).toEqual({ active: true, mode: 'default' });
    });

    it('delete removes a module-scoped key', async () => {
      await magnet.set('module', 'reverie', 'key', 'value');
      await magnet.delete('module', 'reverie', 'key');
      expect(magnet.get('module', 'reverie', 'key')).toBeUndefined();
    });
  });

  describe('state events', () => {
    it('set emits state:changed with scope, key, oldValue, newValue', async () => {
      await magnet.set('global', 'version', '1.0');
      const calls = mockSwitchboard.getCalls();
      expect(calls.length).toBeGreaterThanOrEqual(1);

      const event = calls.find(c => c.eventName === 'state:changed');
      expect(event).toBeDefined();
      expect(event.payload.scope).toBe('global');
      expect(event.payload.key).toBe('version');
      expect(event.payload.oldValue).toBeUndefined();
      expect(event.payload.newValue).toBe('1.0');
    });

    it('set emits state:changed with old value on overwrite', async () => {
      await magnet.set('global', 'version', '0.9');
      await magnet.set('global', 'version', '1.0');
      const calls = mockSwitchboard.getCalls().filter(c => c.eventName === 'state:changed');
      expect(calls.length).toBe(2);

      const secondEvent = calls[1];
      expect(secondEvent.payload.oldValue).toBe('0.9');
      expect(secondEvent.payload.newValue).toBe('1.0');
    });

    it('session set emits state:changed with namespaced key', async () => {
      await magnet.set('session', 'sess-1', 'activeTab', 'chat');
      const calls = mockSwitchboard.getCalls().filter(c => c.eventName === 'state:changed');
      expect(calls.length).toBe(1);
      expect(calls[0].payload.scope).toBe('session');
      expect(calls[0].payload.key).toBe('sess-1.activeTab');
      expect(calls[0].payload.newValue).toBe('chat');
    });

    it('module set emits state:changed with namespaced key', async () => {
      await magnet.set('module', 'reverie', 'active', true);
      const calls = mockSwitchboard.getCalls().filter(c => c.eventName === 'state:changed');
      expect(calls.length).toBe(1);
      expect(calls[0].payload.scope).toBe('module');
      expect(calls[0].payload.key).toBe('reverie.active');
      expect(calls[0].payload.newValue).toBe(true);
    });

    it('delete emits state:changed with newValue undefined', async () => {
      await magnet.set('global', 'temp', 'data');
      // Clear previous calls
      const callsBefore = mockSwitchboard.getCalls().length;
      await magnet.delete('global', 'temp');
      const calls = mockSwitchboard.getCalls().slice(callsBefore);
      expect(calls.length).toBe(1);
      expect(calls[0].payload.scope).toBe('global');
      expect(calls[0].payload.key).toBe('temp');
      expect(calls[0].payload.oldValue).toBe('data');
      expect(calls[0].payload.newValue).toBeUndefined();
    });
  });

  describe('provider integration', () => {
    it('init loads state from provider', async () => {
      const provider = createMockProvider();
      // Pre-seed the provider with state
      await provider.save({ global: { preloaded: true }, session: {}, module: {} });

      const m = unwrap(createMagnet());
      await m.init({ switchboard: mockSwitchboard, provider });
      m.start();

      expect(m.get('global', 'preloaded')).toBe(true);
    });

    it('stop flushes state to provider', async () => {
      await magnet.set('global', 'key', 'value');
      await magnet.stop();

      const stored = mockProvider.getStored();
      expect(stored.global.key).toBe('value');
    });

    it('registerProvider swaps the backing provider', async () => {
      const newProvider = createMockProvider();
      const result = magnet.registerProvider(newProvider);
      expect(isOk(result)).toBe(true);

      // Now set should save to the new provider
      await magnet.set('global', 'key', 'value');
      await magnet.stop();
      expect(newProvider.getStored().global.key).toBe('value');
    });

    it('state survives simulated restart (save, new instance, load)', async () => {
      // Write state with first instance
      await magnet.set('global', 'persistent', 'data');
      await magnet.set('session', 'sess-1', 'tab', 'chat');
      await magnet.set('module', 'reverie', 'mode', 'active');
      await magnet.stop();

      // Create new instance with same provider
      const m2 = unwrap(createMagnet());
      await m2.init({ switchboard: mockSwitchboard, provider: mockProvider });
      m2.start();

      expect(m2.get('global', 'persistent')).toBe('data');
      expect(m2.get('session', 'sess-1', 'tab')).toBe('chat');
      expect(m2.get('module', 'reverie', 'mode')).toBe('active');
    });
  });

  describe('lifecycle', () => {
    it('healthCheck returns healthy:true after start', () => {
      const result = magnet.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('magnet');
    });

    it('healthCheck returns healthy:false before start', () => {
      const m = unwrap(createMagnet());
      const result = m.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(false);
      expect(health.name).toBe('magnet');
    });

    it('stop sets healthy to false', async () => {
      await magnet.stop();
      const result = magnet.healthCheck();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result).healthy).toBe(false);
    });
  });
});

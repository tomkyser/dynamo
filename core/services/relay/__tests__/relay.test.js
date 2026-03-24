'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { ok, err, isOk, isErr, unwrap } = require('../../../../lib/index.cjs');
const { createRelay } = require('../relay.cjs');

/**
 * Creates a mock Forge service that records all method calls.
 * All methods return ok() by default. Individual methods can be overridden
 * to simulate failures.
 *
 * @returns {Object} Mock forge with calls array for inspection
 */
function createMockForge() {
  const calls = [];
  return {
    calls,
    tag: (name) => { calls.push({ method: 'tag', args: [name] }); return ok(name); },
    deleteTag: (name) => { calls.push({ method: 'deleteTag', args: [name] }); return ok(undefined); },
    commit: (msg) => { calls.push({ method: 'commit', args: [msg] }); return ok({ hash: 'abc123' }); },
    resetTo: (ref) => { calls.push({ method: 'resetTo', args: [ref] }); return ok(undefined); },
    stageAll: () => { calls.push({ method: 'stageAll' }); return ok(undefined); },
    sync: async (src, dest) => { calls.push({ method: 'sync', args: [src, dest] }); return ok({ filesCopied: 3 }); },
    submoduleAdd: (url, path) => { calls.push({ method: 'submoduleAdd', args: [url, path] }); return ok(undefined); },
    submoduleRemove: (path) => { calls.push({ method: 'submoduleRemove', args: [path] }); return ok(undefined); },
    submoduleUpdate: () => { calls.push({ method: 'submoduleUpdate' }); return ok(undefined); },
    status: () => ok({ clean: true, files: [] }),
    healthCheck: () => ok({ healthy: true, name: 'forge' }),
  };
}

/**
 * Creates a mock Lathe service for config file operations.
 * @returns {Object} Mock lathe with configData storage and writeCalls array
 */
function createMockLathe() {
  const writeCalls = [];
  let configData = null;
  return {
    writeCalls,
    setConfigData(data) { configData = data; },
    readFile: async (filePath) => {
      if (configData !== null) {
        return ok(typeof configData === 'string' ? configData : JSON.stringify(configData));
      }
      return err('NOT_FOUND', `File not found: ${filePath}`);
    },
    writeFile: async (filePath, content) => {
      writeCalls.push({ filePath, content });
      return ok(undefined);
    },
    writeFileAtomic: async (filePath, content) => {
      writeCalls.push({ filePath, content });
      return ok(undefined);
    },
    exists: async (filePath) => ok(configData !== null),
    mkdir: (dirPath) => ok(undefined),
  };
}

/**
 * Creates a mock Switchboard that records emit calls.
 * @returns {Object} Mock switchboard with getCalls() for inspection
 */
function createMockSwitchboard() {
  const calls = [];
  return {
    emit(eventName, payload) { calls.push({ eventName, payload }); },
    getCalls() { return calls; },
  };
}

describe('Relay', () => {
  let mockForge;
  let mockLathe;
  let mockSwitchboard;

  beforeEach(() => {
    mockForge = createMockForge();
    mockLathe = createMockLathe();
    mockSwitchboard = createMockSwitchboard();
  });

  describe('contract validation', () => {
    it('createRelay() returns Ok with frozen object', () => {
      const result = createRelay();
      expect(isOk(result)).toBe(true);
      expect(Object.isFrozen(unwrap(result))).toBe(true);
    });

    it('relay has all RELAY_SHAPE required methods', () => {
      const relay = unwrap(createRelay());
      const required = [
        'init', 'start', 'stop', 'healthCheck',
        'install', 'update', 'sync',
        'addPlugin', 'removePlugin', 'addModule', 'removeModule',
        'migrateConfig',
      ];
      for (const method of required) {
        expect(typeof relay[method]).toBe('function');
      }
    });
  });

  describe('lifecycle', () => {
    it('init({ forge, lathe, switchboard }) initializes successfully', () => {
      const relay = unwrap(createRelay());
      const result = relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      expect(isOk(result)).toBe(true);
    });

    it('init() without forge returns Err(INIT_FAILED)', () => {
      const relay = unwrap(createRelay());
      const result = relay.init({ lathe: mockLathe, switchboard: mockSwitchboard });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INIT_FAILED');
    });

    it('healthCheck() returns { healthy: true, name: relay } after start()', () => {
      const relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
      const result = relay.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('relay');
    });

    it('healthCheck() returns healthy:false before start()', () => {
      const relay = unwrap(createRelay());
      relay.init({ forge: mockForge });
      const result = relay.healthCheck();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result).healthy).toBe(false);
    });

    it('stop() returns Ok and sets healthy to false', () => {
      const relay = unwrap(createRelay());
      relay.init({ forge: mockForge });
      relay.start();
      const stopResult = relay.stop();
      expect(isOk(stopResult)).toBe(true);
      const health = unwrap(relay.healthCheck());
      expect(health.healthy).toBe(false);
    });
  });

  describe('install operation', () => {
    let relay;

    beforeEach(() => {
      relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
    });

    it('install(srcDir, destDir) creates backup tag via forge.tag', async () => {
      await relay.install('/src', '/dest');
      const tagCall = mockForge.calls.find(c => c.method === 'tag');
      expect(tagCall).toBeDefined();
      expect(tagCall.args[0]).toMatch(/^relay-backup-install-/);
    });

    it('install syncs files from src to dest via forge.sync', async () => {
      await relay.install('/src', '/dest');
      const syncCall = mockForge.calls.find(c => c.method === 'sync');
      expect(syncCall).toBeDefined();
      expect(syncCall.args).toEqual(['/src', '/dest']);
    });

    it('install commits changes via forge.commit', async () => {
      await relay.install('/src', '/dest');
      const commitCall = mockForge.calls.find(c => c.method === 'commit');
      expect(commitCall).toBeDefined();
      expect(commitCall.args[0]).toContain('relay: install');
    });

    it('install cleans up backup tag on success', async () => {
      await relay.install('/src', '/dest');
      const deleteTagCall = mockForge.calls.find(c => c.method === 'deleteTag');
      expect(deleteTagCall).toBeDefined();
      expect(deleteTagCall.args[0]).toMatch(/^relay-backup-install-/);
    });

    it('install rolls back on failure (forge.resetTo backup tag, forge.deleteTag)', async () => {
      // Make sync fail
      mockForge.sync = async () => err('SYNC_FAILED', 'Simulated failure');

      const result = await relay.install('/src', '/dest');
      expect(isErr(result)).toBe(true);

      // Verify rollback happened
      const resetCall = mockForge.calls.find(c => c.method === 'resetTo');
      expect(resetCall).toBeDefined();
      expect(resetCall.args[0]).toMatch(/^relay-backup-install-/);

      const deleteTagCall = mockForge.calls.find(c => c.method === 'deleteTag');
      expect(deleteTagCall).toBeDefined();
    });

    it('install emits relay:installed via Switchboard', async () => {
      await relay.install('/src', '/dest');
      const emitCalls = mockSwitchboard.getCalls();
      const installEvent = emitCalls.find(c => c.eventName === 'relay:installed');
      expect(installEvent).toBeDefined();
      expect(installEvent.payload.srcDir).toBe('/src');
      expect(installEvent.payload.destDir).toBe('/dest');
      expect(installEvent.payload.hash).toBe('abc123');
    });
  });

  describe('update operation', () => {
    let relay;

    beforeEach(() => {
      relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
    });

    it('update(srcDir, destDir) creates backup tag', async () => {
      await relay.update('/src', '/dest');
      const tagCall = mockForge.calls.find(c => c.method === 'tag');
      expect(tagCall).toBeDefined();
      expect(tagCall.args[0]).toMatch(/^relay-backup-update-/);
    });

    it('update syncs files, commits, cleans up tag on success', async () => {
      await relay.update('/src', '/dest');

      const syncCall = mockForge.calls.find(c => c.method === 'sync');
      expect(syncCall).toBeDefined();

      const commitCall = mockForge.calls.find(c => c.method === 'commit');
      expect(commitCall).toBeDefined();

      const deleteTagCall = mockForge.calls.find(c => c.method === 'deleteTag');
      expect(deleteTagCall).toBeDefined();
    });

    it('update rolls back on sync failure', async () => {
      mockForge.sync = async () => err('SYNC_FAILED', 'Simulated failure');

      const result = await relay.update('/src', '/dest');
      expect(isErr(result)).toBe(true);

      const resetCall = mockForge.calls.find(c => c.method === 'resetTo');
      expect(resetCall).toBeDefined();
    });

    it('update rolls back on commit failure', async () => {
      mockForge.commit = (msg) => {
        mockForge.calls.push({ method: 'commit', args: [msg] });
        return err('COMMIT_FAILED', 'Simulated commit failure');
      };

      const result = await relay.update('/src', '/dest');
      expect(isErr(result)).toBe(true);

      const resetCall = mockForge.calls.find(c => c.method === 'resetTo');
      expect(resetCall).toBeDefined();
    });

    it('update emits relay:updated via Switchboard', async () => {
      await relay.update('/src', '/dest');
      const emitCalls = mockSwitchboard.getCalls();
      const updateEvent = emitCalls.find(c => c.eventName === 'relay:updated');
      expect(updateEvent).toBeDefined();
      expect(updateEvent.payload.srcDir).toBe('/src');
      expect(updateEvent.payload.destDir).toBe('/dest');
    });
  });

  describe('sync operation', () => {
    let relay;

    beforeEach(() => {
      relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
    });

    it('sync(srcDir, destDir) copies files from source to destination', async () => {
      const result = await relay.sync('/src', '/dest');
      expect(isOk(result)).toBe(true);
      expect(unwrap(result).filesCopied).toBe(3);

      const syncCall = mockForge.calls.find(c => c.method === 'sync');
      expect(syncCall).toBeDefined();
      expect(syncCall.args).toEqual(['/src', '/dest']);
    });

    it('sync emits relay:synced via Switchboard', async () => {
      await relay.sync('/src', '/dest');
      const emitCalls = mockSwitchboard.getCalls();
      const syncEvent = emitCalls.find(c => c.eventName === 'relay:synced');
      expect(syncEvent).toBeDefined();
      expect(syncEvent.payload.srcDir).toBe('/src');
      expect(syncEvent.payload.destDir).toBe('/dest');
      expect(syncEvent.payload.filesCopied).toBe(3);
    });
  });

  describe('plugin management', () => {
    let relay;

    beforeEach(() => {
      relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
    });

    it('addPlugin(url, name) calls forge.submoduleAdd(url, plugins/name)', async () => {
      await relay.addPlugin('https://github.com/user/plugin.git', 'my-plugin');
      const addCall = mockForge.calls.find(c => c.method === 'submoduleAdd');
      expect(addCall).toBeDefined();
      expect(addCall.args).toEqual(['https://github.com/user/plugin.git', 'plugins/my-plugin']);
    });

    it('addPlugin follows backup-modify-verify-rollback pattern', async () => {
      await relay.addPlugin('https://github.com/user/plugin.git', 'my-plugin');

      // Should have: tag, submoduleAdd, commit, deleteTag (success path)
      const tagCall = mockForge.calls.find(c => c.method === 'tag');
      expect(tagCall).toBeDefined();
      expect(tagCall.args[0]).toMatch(/^relay-backup-add-plugin-/);

      const deleteTagCall = mockForge.calls.find(c => c.method === 'deleteTag');
      expect(deleteTagCall).toBeDefined();
    });

    it('removePlugin(name) calls forge.submoduleRemove(plugins/name)', async () => {
      await relay.removePlugin('my-plugin');
      const removeCall = mockForge.calls.find(c => c.method === 'submoduleRemove');
      expect(removeCall).toBeDefined();
      expect(removeCall.args).toEqual(['plugins/my-plugin']);
    });
  });

  describe('module management', () => {
    let relay;

    beforeEach(() => {
      relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
    });

    it('addModule(url, name) calls forge.submoduleAdd(url, modules/name)', async () => {
      await relay.addModule('https://github.com/user/module.git', 'reverie');
      const addCall = mockForge.calls.find(c => c.method === 'submoduleAdd');
      expect(addCall).toBeDefined();
      expect(addCall.args).toEqual(['https://github.com/user/module.git', 'modules/reverie']);
    });

    it('removeModule(name) calls forge.submoduleRemove(modules/name)', async () => {
      await relay.removeModule('reverie');
      const removeCall = mockForge.calls.find(c => c.method === 'submoduleRemove');
      expect(removeCall).toBeDefined();
      expect(removeCall.args).toEqual(['modules/reverie']);
    });
  });

  describe('config migration', () => {
    let relay;

    beforeEach(() => {
      relay = unwrap(createRelay());
      relay.init({ forge: mockForge, lathe: mockLathe, switchboard: mockSwitchboard });
      relay.start();
    });

    it('migrateConfig(currentConfig, targetVersion) adds new default keys', async () => {
      const result = await relay.migrateConfig({}, '2.0.0');
      expect(isOk(result)).toBe(true);
      const migrated = unwrap(result);
      // Should have default keys from the target version defaults
      expect(migrated.platform).toBeDefined();
      expect(migrated.services).toBeDefined();
      expect(migrated.providers).toBeDefined();
      expect(migrated.modules).toBeDefined();
      expect(migrated.plugins).toBeDefined();
    });

    it('migrateConfig preserves existing user values', async () => {
      const result = await relay.migrateConfig({ platform: { name: 'custom-name' }, myCustomKey: 'preserved' }, '2.0.0');
      expect(isOk(result)).toBe(true);
      const migrated = unwrap(result);
      expect(migrated.platform.name).toBe('custom-name');
      expect(migrated.myCustomKey).toBe('preserved');
    });

    it('migrateConfig stamps version in config', async () => {
      const result = await relay.migrateConfig({ platform: { name: 'dynamo' } }, '2.0.0');
      expect(isOk(result)).toBe(true);
      const migrated = unwrap(result);
      expect(migrated._version).toBe('2.0.0');
    });

    it('migrateConfig handles missing config gracefully', async () => {
      const result = await relay.migrateConfig(null, '1.0.0');
      expect(isOk(result)).toBe(true);
      const migrated = unwrap(result);
      expect(migrated._version).toBe('1.0.0');
      expect(migrated.platform).toBeDefined();
    });
  });
});

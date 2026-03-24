'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createSettingsManager } = require('../settings-manager.cjs');

/**
 * Creates a test-double lathe that operates on real filesystem via tmpDir.
 */
function createTestLathe(tmpDir) {
  return {
    readFile(p) {
      try { return { ok: true, value: fs.readFileSync(p, 'utf8') }; }
      catch (e) { return { ok: false, error: { code: 'FILE_NOT_FOUND', message: e.message } }; }
    },
    readJson(p) {
      try { return { ok: true, value: JSON.parse(fs.readFileSync(p, 'utf8')) }; }
      catch (e) { return { ok: false, error: { code: 'READ_FAILED', message: e.message } }; }
    },
    writeJson(p, data) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      return { ok: true, value: undefined };
    },
    async writeFileAtomic(p, content) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
      return { ok: true, value: undefined };
    },
    exists(p) { return { ok: true, value: fs.existsSync(p) }; },
    mkdir(p) { fs.mkdirSync(p, { recursive: true }); return { ok: true, value: undefined }; },
    listDir(p) {
      try { return { ok: true, value: fs.readdirSync(p) }; }
      catch (e) { return { ok: false, error: { code: 'DIR_NOT_FOUND', message: e.message } }; }
    },
  };
}

describe('settings-manager', () => {
  let tmpDir;
  let lathe;
  let manager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-settings-test-'));
    lathe = createTestLathe(tmpDir);
    manager = createSettingsManager({ lathe });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('createSettingsManager returns object with required methods', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.readSettings).toBe('function');
    expect(typeof manager.writeHookEntry).toBe('function');
    expect(typeof manager.removeHookEntry).toBe('function');
    expect(typeof manager.getScope).toBe('function');
  });

  it('readSettings returns parsed JSON from project scope', () => {
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo hello' }] }] },
      permissions: { allow: ['Read'] },
      env: { FOO: 'bar' },
    }));

    const result = manager.readSettings('project', tmpDir);
    expect(result.ok).toBe(true);
    expect(result.value.hooks.SessionStart).toHaveLength(1);
    expect(result.value.permissions.allow).toContain('Read');
    expect(result.value.env.FOO).toBe('bar');
  });

  it('readSettings returns empty structure if file does not exist', () => {
    const result = manager.readSettings('project', tmpDir);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ hooks: {}, permissions: {}, env: {} });
  });

  it('readSettings with user scope reads from ~/.claude/settings.json path', () => {
    // We verify getScope returns the correct path for user scope
    const scopePath = manager.getScope('user');
    expect(scopePath).toBe(path.join(os.homedir(), '.claude', 'settings.json'));
  });

  it('writeHookEntry adds entry to hooks array', () => {
    const entry = { hooks: [{ type: 'command', command: 'node hook.cjs' }] };
    const result = manager.writeHookEntry('project', 'SessionStart', entry, tmpDir);
    expect(result.ok).toBe(true);

    // Verify it was written
    const read = manager.readSettings('project', tmpDir);
    expect(read.ok).toBe(true);
    expect(read.value.hooks.SessionStart).toHaveLength(1);
    expect(read.value.hooks.SessionStart[0].hooks[0].command).toBe('node hook.cjs');
  });

  it('writeHookEntry deduplicates by command', () => {
    const entry = { hooks: [{ type: 'command', command: 'node hook.cjs' }] };
    manager.writeHookEntry('project', 'SessionStart', entry, tmpDir);
    manager.writeHookEntry('project', 'SessionStart', entry, tmpDir);

    const read = manager.readSettings('project', tmpDir);
    expect(read.ok).toBe(true);
    expect(read.value.hooks.SessionStart).toHaveLength(1);
  });

  it('writeHookEntry creates settings file if it does not exist', () => {
    const entry = { hooks: [{ type: 'command', command: 'node hook.cjs' }] };
    manager.writeHookEntry('project', 'SessionStart', entry, tmpDir);

    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
  });

  it('removeHookEntry removes matching entries', () => {
    const entry1 = { hooks: [{ type: 'command', command: 'node hook1.cjs' }] };
    const entry2 = { hooks: [{ type: 'command', command: 'node hook2.cjs' }] };
    manager.writeHookEntry('project', 'SessionStart', entry1, tmpDir);
    manager.writeHookEntry('project', 'SessionStart', entry2, tmpDir);

    const matchFn = (e) => e.hooks[0].command === 'node hook1.cjs';
    const result = manager.removeHookEntry('project', 'SessionStart', matchFn, tmpDir);
    expect(result.ok).toBe(true);

    const read = manager.readSettings('project', tmpDir);
    expect(read.value.hooks.SessionStart).toHaveLength(1);
    expect(read.value.hooks.SessionStart[0].hooks[0].command).toBe('node hook2.cjs');
  });

  it('getScope returns correct paths for all scopes', () => {
    const projectPath = manager.getScope('project', tmpDir);
    expect(projectPath).toBe(path.join(tmpDir, '.claude', 'settings.json'));

    const userPath = manager.getScope('user');
    expect(userPath).toBe(path.join(os.homedir(), '.claude', 'settings.json'));

    const localPath = manager.getScope('local', tmpDir);
    expect(localPath).toBe(path.join(tmpDir, '.claude', 'settings.local.json'));
  });

  it('writeHookEntry allows different hook types independently', () => {
    const entry1 = { hooks: [{ type: 'command', command: 'node start.cjs' }] };
    const entry2 = { hooks: [{ type: 'command', command: 'node stop.cjs' }] };
    manager.writeHookEntry('project', 'SessionStart', entry1, tmpDir);
    manager.writeHookEntry('project', 'Stop', entry2, tmpDir);

    const read = manager.readSettings('project', tmpDir);
    expect(read.value.hooks.SessionStart).toHaveLength(1);
    expect(read.value.hooks.Stop).toHaveLength(1);
  });
});

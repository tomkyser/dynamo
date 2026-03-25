'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createExciter, EXCITER_SHAPE } = require('../exciter.cjs');

/**
 * Creates a mock Switchboard for testing event wiring.
 */
function createMockSwitchboard() {
  const _handlers = new Map();
  return {
    on(event, handler) {
      if (!_handlers.has(event)) _handlers.set(event, []);
      _handlers.get(event).push(handler);
    },
    emit(event, payload) {
      const handlers = _handlers.get(event) || [];
      for (const h of handlers) h(payload);
    },
    getHandlers() { return _handlers; },
  };
}

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
    deleteFile(p) {
      try { fs.unlinkSync(p); return { ok: true, value: undefined }; }
      catch (e) { return { ok: false, error: { code: 'FILE_NOT_FOUND', message: e.message } }; }
    },
  };
}

describe('exciter', () => {
  let tmpDir;
  let switchboard;
  let lathe;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-exciter-test-'));
    switchboard = createMockSwitchboard();
    lathe = createTestLathe(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('EXCITER_SHAPE', () => {
    it('has exactly 14 required methods', () => {
      expect(EXCITER_SHAPE.required).toHaveLength(14);
      expect(EXCITER_SHAPE.required).toContain('init');
      expect(EXCITER_SHAPE.required).toContain('start');
      expect(EXCITER_SHAPE.required).toContain('stop');
      expect(EXCITER_SHAPE.required).toContain('healthCheck');
      expect(EXCITER_SHAPE.required).toContain('registerHooks');
      expect(EXCITER_SHAPE.required).toContain('getRegisteredHooks');
      expect(EXCITER_SHAPE.required).toContain('installAgent');
      expect(EXCITER_SHAPE.required).toContain('removeAgent');
      expect(EXCITER_SHAPE.required).toContain('listAgents');
      expect(EXCITER_SHAPE.required).toContain('updateSettings');
      expect(EXCITER_SHAPE.required).toContain('readSettings');
      expect(EXCITER_SHAPE.required).toContain('claimSection');
      expect(EXCITER_SHAPE.required).toContain('updateSection');
      expect(EXCITER_SHAPE.required).toContain('releaseSection');
    });
  });

  describe('createExciter', () => {
    it('returns ok result with frozen object containing all required methods', () => {
      const result = createExciter();
      expect(result.ok).toBe(true);
      const exciter = result.value;

      for (const method of EXCITER_SHAPE.required) {
        expect(typeof exciter[method]).toBe('function');
      }

      // Verify frozen
      expect(Object.isFrozen(exciter)).toBe(true);
    });
  });

  describe('lifecycle', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
    });

    it('init with switchboard and lathe returns ok', () => {
      const result = exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
      expect(result.ok).toBe(true);
    });

    it('init without switchboard returns err INIT_FAILED', () => {
      const result = exciter.init({ lathe });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INIT_FAILED');
    });

    it('init without lathe returns err INIT_FAILED', () => {
      const result = exciter.init({ switchboard });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INIT_FAILED');
    });

    it('init with empty object returns err INIT_FAILED', () => {
      const result = exciter.init({});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INIT_FAILED');
    });

    it('start calls wireToSwitchboard once, returns ok with wired count', () => {
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
      exciter.registerHooks('testmod', { SessionStart: () => {} });

      const result = exciter.start();
      expect(result.ok).toBe(true);
      expect(typeof result.value).toBe('number');
      expect(result.value).toBeGreaterThanOrEqual(1);
    });

    it('stop resets internal state and returns ok', () => {
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
      exciter.start();
      const result = exciter.stop();
      expect(result.ok).toBe(true);
    });

    it('healthCheck returns healthy after start, unhealthy before', () => {
      const beforeInit = exciter.healthCheck();
      expect(beforeInit.ok).toBe(true);
      expect(beforeInit.value.healthy).toBe(false);

      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
      exciter.start();

      const afterStart = exciter.healthCheck();
      expect(afterStart.ok).toBe(true);
      expect(afterStart.value.healthy).toBe(true);
    });
  });

  describe('registerHooks', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
    });

    it('registers hooks and returns count', () => {
      const result = exciter.registerHooks('reverie', {
        SessionStart: () => {},
        Stop: () => {},
      });
      expect(result.ok).toBe(true);
      expect(result.value).toBe(2);
    });

    it('returns err INVALID_HOOK_TYPE for unknown hook types', () => {
      const result = exciter.registerHooks('reverie', {
        FakeHookType: () => {},
      });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_HOOK_TYPE');
    });

    it('accumulates hooks from multiple modules', () => {
      exciter.registerHooks('reverie', { SessionStart: () => {} });
      exciter.registerHooks('other-module', { SessionStart: () => {}, Stop: () => {} });

      const hooksResult = exciter.getRegisteredHooks();
      expect(hooksResult.ok).toBe(true);
      expect(hooksResult.value.SessionStart).toHaveLength(2);
      expect(hooksResult.value.Stop).toHaveLength(1);
    });

    it('returns err NOT_INITIALIZED before init', () => {
      const freshResult = createExciter();
      const fresh = freshResult.value;
      const result = fresh.registerHooks('reverie', { SessionStart: () => {} });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_INITIALIZED');
    });
  });

  describe('getRegisteredHooks', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
    });

    it('returns map of hookType to listeners', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      exciter.registerHooks('reverie', { SessionStart: handler1 });
      exciter.registerHooks('other', { SessionStart: handler2 });

      const result = exciter.getRegisteredHooks();
      expect(result.ok).toBe(true);
      expect(result.value.SessionStart).toHaveLength(2);
    });
  });

  describe('switchboard wiring', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
    });

    it('after start, switchboard event triggers registered handler', () => {
      let called = false;
      exciter.registerHooks('reverie', {
        SessionStart: (payload) => { called = true; },
      });
      exciter.start();

      switchboard.emit('hook:session-start', { session_id: 'test-123' });
      expect(called).toBe(true);
    });

    it('multiple registerHooks before start wires ALL accumulated hooks', () => {
      let call1 = false;
      let call2 = false;
      exciter.registerHooks('mod-a', { SessionStart: () => { call1 = true; } });
      exciter.registerHooks('mod-b', { SessionStart: () => { call2 = true; } });
      exciter.start();

      switchboard.emit('hook:session-start', { session_id: 'test-456' });
      expect(call1).toBe(true);
      expect(call2).toBe(true);
    });
  });

  describe('settings delegation', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
    });

    it('updateSettings delegates to settings-manager writeHookEntry', () => {
      const entry = { hooks: [{ type: 'command', command: 'node hook.cjs' }] };
      const result = exciter.updateSettings('project', 'SessionStart', entry);
      expect(result.ok).toBe(true);

      // Verify settings were written
      const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
    });

    it('readSettings delegates to settings-manager readSettings', () => {
      const result = exciter.readSettings('project');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ hooks: {}, permissions: {}, env: {} });
    });
  });

  describe('CLAUDE.md delegation', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
    });

    it('claimSection delegates to claudemd-manager', async () => {
      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      const result = await exciter.claimSection('reverie', 'Test content', claudeMdPath);
      expect(result.ok).toBe(true);

      const content = fs.readFileSync(claudeMdPath, 'utf8');
      expect(content).toContain('<!-- dynamo:section:reverie:start -->');
    });

    it('updateSection delegates to claudemd-manager', async () => {
      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      await exciter.claimSection('reverie', 'Original', claudeMdPath);
      const result = await exciter.updateSection('reverie', 'Updated', claudeMdPath);
      expect(result.ok).toBe(true);
    });

    it('releaseSection delegates to claudemd-manager', async () => {
      const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
      await exciter.claimSection('reverie', 'Content', claudeMdPath);
      const result = await exciter.releaseSection('reverie', claudeMdPath);
      expect(result.ok).toBe(true);
    });
  });

  describe('agent delegation', () => {
    let exciter;

    beforeEach(() => {
      const result = createExciter();
      exciter = result.value;
      exciter.init({ switchboard, lathe, config: { projectRoot: tmpDir } });
    });

    it('installAgent delegates to agent-manager', async () => {
      const agentsDir = path.join(tmpDir, '.claude', 'agents');
      const definition = {
        frontmatter: { name: 'test-agent', model: 'sonnet' },
        body: '# Test Agent',
      };
      const result = await exciter.installAgent('test-agent', definition, agentsDir);
      expect(result.ok).toBe(true);
      expect(fs.existsSync(path.join(agentsDir, 'test-agent.md'))).toBe(true);
    });

    it('removeAgent delegates to agent-manager', async () => {
      const agentsDir = path.join(tmpDir, '.claude', 'agents');
      const definition = {
        frontmatter: { name: 'test-agent' },
        body: 'Body',
      };
      await exciter.installAgent('test-agent', definition, agentsDir);
      const result = exciter.removeAgent('test-agent', agentsDir);
      expect(result.ok).toBe(true);
    });

    it('listAgents delegates to agent-manager', async () => {
      const agentsDir = path.join(tmpDir, '.claude', 'agents');
      await exciter.installAgent('agent-1', { frontmatter: { name: 'agent-1' }, body: 'A' }, agentsDir);
      const result = exciter.listAgents(agentsDir);
      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
    });
  });
});

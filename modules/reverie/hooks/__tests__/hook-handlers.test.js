'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');

// ---------------------------------------------------------------------------
// Test helpers: mock factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock Context Manager with controllable return values.
 */
function createMockContextManager(overrides) {
  const defaults = {
    _injection: '## Identity Frame\nMock personality',
    _phase: 1,
    _nudge: null,
    _initResult: { ok: true, value: { source: 'warm-start' } },
    _composeResult: { ok: true, value: { phase: 1, path: '/tmp/face-prompt.md' } },
    _checkpointResult: { ok: true, value: { facePromptText: 'test', budgetPhase: 1, cumulativeBytes: 0, attentionDirectives: {}, entropyState: null, timestamp: '2026-01-01T00:00:00Z' } },
    _resetResult: { ok: true, value: { phase: 1 } },
    _warmStartResult: { ok: true, value: { path: '/tmp/face-prompt.md' } },
    _snapshot: { budgetPhase: 1, cumulativeBytes: 0, turnCount: 0, utilization: 0, contextWindowBytes: 800000, entropyState: null, facePromptPath: '/tmp/face-prompt.md' },
  };
  const opts = { ...defaults, ...overrides };

  const _calls = [];

  return {
    async init() { _calls.push('init'); return opts._initResult; },
    async compose() { _calls.push('compose'); return opts._composeResult; },
    getInjection() { return opts._injection; },
    trackBytes(bytes, source) {
      _calls.push({ trackBytes: { bytes, source } });
      return { changed: false, from: opts._phase, to: opts._phase };
    },
    getBudgetPhase() { return opts._phase; },
    getMicroNudge() { return opts._nudge; },
    async checkpoint() { _calls.push('checkpoint'); return opts._checkpointResult; },
    async resetAfterCompaction() { _calls.push('resetAfterCompaction'); return opts._resetResult; },
    getSessionSnapshot() { return opts._snapshot; },
    async persistWarmStart() { _calls.push('persistWarmStart'); return opts._warmStartResult; },
    incrementTurn() { _calls.push('incrementTurn'); },
    getCalls() { return _calls; },
  };
}

/**
 * Creates a mock Switchboard tracking emitted events.
 */
function createMockSwitchboard() {
  const _events = [];
  return {
    emit(name, payload) { _events.push({ name, payload }); },
    on(name, handler) {},
    getEvents() { return _events; },
  };
}

/**
 * Creates a mock Lathe tracking writes.
 */
function createMockLathe() {
  const _writes = [];
  return {
    async readFile(path) { return { ok: false, error: { code: 'FILE_NOT_FOUND' } }; },
    async writeFile(path, content) {
      _writes.push({ path, content });
      return { ok: true, value: { path } };
    },
    getWrites() { return _writes; },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Hook Handlers', () => {
  let createHookHandlers;

  beforeEach(() => {
    const mod = require('../hook-handlers.cjs');
    createHookHandlers = mod.createHookHandlers;
  });

  describe('createHookHandlers', () => {
    it('returns object with all 8 handler functions', () => {
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      expect(typeof handlers.handleSessionStart).toBe('function');
      expect(typeof handlers.handleUserPromptSubmit).toBe('function');
      expect(typeof handlers.handlePreToolUse).toBe('function');
      expect(typeof handlers.handlePostToolUse).toBe('function');
      expect(typeof handlers.handleStop).toBe('function');
      expect(typeof handlers.handlePreCompact).toBe('function');
      expect(typeof handlers.handleSubagentStart).toBe('function');
      expect(typeof handlers.handleSubagentStop).toBe('function');
    });
  });

  describe('handleSessionStart', () => {
    it('calls contextManager.init() on normal start', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSessionStart({ session_id: 'test' });
      expect(cm.getCalls()).toContain('init');
    });

    it('calls contextManager.resetAfterCompaction() when source is compact', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSessionStart({ session_id: 'test', source: 'compact' });
      expect(cm.getCalls()).toContain('resetAfterCompaction');
      expect(cm.getCalls()).not.toContain('init');
    });

    it('returns hookSpecificOutput with SessionStart event and additionalContext', async () => {
      const cm = createMockContextManager({ _injection: 'Test face prompt' });
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handleSessionStart({ session_id: 'test' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      expect(result.hookSpecificOutput.additionalContext).toBe('Test face prompt');
    });

    it('emits session-start event', async () => {
      const switchboard = createMockSwitchboard();
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard,
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSessionStart({ session_id: 'test' });
      const events = switchboard.getEvents();
      const startEvt = events.find(e => e.name === 'reverie:hook:session-start');
      expect(startEvt).toBeDefined();
    });
  });

  describe('handleUserPromptSubmit', () => {
    it('tracks prompt bytes via contextManager', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleUserPromptSubmit({ user_prompt: 'Hello world', session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      expect(trackCalls.length).toBeGreaterThanOrEqual(1);
      expect(trackCalls[0].trackBytes.source).toBe('user_prompt');
    });

    it('returns hookSpecificOutput with UserPromptSubmit event and additionalContext', async () => {
      const cm = createMockContextManager({ _injection: 'Personality frame' });
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handleUserPromptSubmit({ user_prompt: 'Test', session_id: 'test' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(result.hookSpecificOutput.additionalContext).toBe('Personality frame');
    });

    it('increments turn count', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleUserPromptSubmit({ user_prompt: 'Test', session_id: 'test' });
      expect(cm.getCalls()).toContain('incrementTurn');
    });

    it('uses Buffer.byteLength for accurate byte counting', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      // Multi-byte characters should be tracked accurately
      const prompt = 'Hello \u00e9\u00e0\u00fc'; // accented chars = more bytes than chars
      await handlers.handleUserPromptSubmit({ user_prompt: prompt, session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      const promptBytes = Buffer.byteLength(prompt, 'utf8');
      expect(trackCalls[0].trackBytes.bytes).toBe(promptBytes);
    });
  });

  describe('handlePreToolUse', () => {
    it('tracks bytes from tool input', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handlePreToolUse({ tool_name: 'Write', tool_input: { path: '/test' }, session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      expect(trackCalls.length).toBe(1);
      expect(trackCalls[0].trackBytes.source).toBe('tool_input');
    });

    it('returns empty object (no injection)', async () => {
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handlePreToolUse({ tool_name: 'Read', tool_input: {}, session_id: 'test' });
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('emits pre-tool-use event', async () => {
      const switchboard = createMockSwitchboard();
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard,
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handlePreToolUse({ tool_name: 'Bash', tool_input: {}, session_id: 'test' });
      const events = switchboard.getEvents();
      const evt = events.find(e => e.name === 'reverie:hook:pre-tool-use');
      expect(evt).toBeDefined();
      expect(evt.payload.tool).toBe('Bash');
    });
  });

  describe('handlePostToolUse', () => {
    it('tracks bytes from tool output', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handlePostToolUse({ tool_name: 'Read', tool_output: 'file contents here', session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      expect(trackCalls.length).toBe(1);
      expect(trackCalls[0].trackBytes.source).toBe('tool_output');
    });

    it('returns micro-nudge as additionalContext when phase is 3', async () => {
      const cm = createMockContextManager({ _phase: 3, _nudge: 'Remember: you are adaptive. Maintain personality frame.' });
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handlePostToolUse({ tool_name: 'Read', tool_output: 'data', session_id: 'test' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(result.hookSpecificOutput.additionalContext).toContain('Remember');
    });

    it('returns empty object when phase is not 3 (no injection)', async () => {
      const cm = createMockContextManager({ _phase: 1, _nudge: null });
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handlePostToolUse({ tool_name: 'Read', tool_output: 'data', session_id: 'test' });
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('handles non-string tool output by stringifying', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handlePostToolUse({ tool_name: 'Bash', tool_output: { exit_code: 0 }, session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      expect(trackCalls.length).toBe(1);
      // Should have tracked bytes from JSON.stringify of the object
      const expected = Buffer.byteLength(JSON.stringify({ exit_code: 0 }), 'utf8');
      expect(trackCalls[0].trackBytes.bytes).toBe(expected);
    });
  });

  describe('handlePreCompact', () => {
    it('calls contextManager.checkpoint()', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handlePreCompact({ session_id: 'test' });
      expect(cm.getCalls()).toContain('checkpoint');
    });

    it('returns hookSpecificOutput with compaction framing as additionalContext', async () => {
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handlePreCompact({ session_id: 'test' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('PreCompact');
      expect(result.hookSpecificOutput.additionalContext).toContain('Self Model');
      expect(result.hookSpecificOutput.additionalContext).toContain('preserve');
    });
  });

  describe('handleStop', () => {
    it('calls contextManager.persistWarmStart()', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleStop({ session_id: 'test', stop_hook_active: true });
      expect(cm.getCalls()).toContain('persistWarmStart');
    });

    it('writes session-end snapshot via lathe', async () => {
      const lathe = createMockLathe();
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe,
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleStop({ session_id: 'test', stop_hook_active: true });
      const writes = lathe.getWrites();
      const snapshotWrite = writes.find(w => w.path.includes('session-end-'));
      expect(snapshotWrite).toBeDefined();
      expect(snapshotWrite.path).toContain('.json');

      // Content should be valid JSON with snapshot fields
      const parsed = JSON.parse(snapshotWrite.content);
      expect(parsed.budgetPhase).toBeDefined();
    });

    it('emits stop event', async () => {
      const switchboard = createMockSwitchboard();
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard,
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleStop({ session_id: 'test', stop_hook_active: true });
      const events = switchboard.getEvents();
      const stopEvt = events.find(e => e.name === 'reverie:hook:stop');
      expect(stopEvt).toBeDefined();
      expect(stopEvt.payload.snapshot).toBeDefined();
    });

    it('returns empty object (no injection)', async () => {
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handleStop({ session_id: 'test', stop_hook_active: true });
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('handleSubagentStart', () => {
    it('tracks estimated bytes', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSubagentStart({ subagent_id: 'sub-1', session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      expect(trackCalls.length).toBe(1);
      expect(trackCalls[0].trackBytes.bytes).toBe(500);
      expect(trackCalls[0].trackBytes.source).toBe('subagent_start');
    });

    it('emits subagent-start event', async () => {
      const switchboard = createMockSwitchboard();
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard,
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSubagentStart({ subagent_id: 'sub-1', session_id: 'test' });
      const events = switchboard.getEvents();
      const evt = events.find(e => e.name === 'reverie:hook:subagent-start');
      expect(evt).toBeDefined();
      expect(evt.payload.subagent_id).toBe('sub-1');
    });

    it('returns empty object', async () => {
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handleSubagentStart({ subagent_id: 'sub-1', session_id: 'test' });
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('handleSubagentStop', () => {
    it('tracks estimated bytes', async () => {
      const cm = createMockContextManager();
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSubagentStop({ subagent_id: 'sub-1', session_id: 'test' });
      const trackCalls = cm.getCalls().filter(c => typeof c === 'object' && c.trackBytes);
      expect(trackCalls.length).toBe(1);
      expect(trackCalls[0].trackBytes.bytes).toBe(500);
      expect(trackCalls[0].trackBytes.source).toBe('subagent_stop');
    });

    it('emits subagent-stop event', async () => {
      const switchboard = createMockSwitchboard();
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard,
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      await handlers.handleSubagentStop({ subagent_id: 'sub-1', session_id: 'test' });
      const events = switchboard.getEvents();
      const evt = events.find(e => e.name === 'reverie:hook:subagent-stop');
      expect(evt).toBeDefined();
    });

    it('returns empty object', async () => {
      const handlers = createHookHandlers({
        contextManager: createMockContextManager(),
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      const result = await handlers.handleSubagentStop({ subagent_id: 'sub-1', session_id: 'test' });
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('no systemMessage usage', () => {
    it('none of the handlers use systemMessage field', async () => {
      const cm = createMockContextManager({ _phase: 3, _nudge: 'nudge text' });
      const handlers = createHookHandlers({
        contextManager: cm,
        switchboard: createMockSwitchboard(),
        lathe: createMockLathe(),
        dataDir: '/tmp/test-reverie',
      });

      // Test handlers that return hookSpecificOutput
      const sessionResult = await handlers.handleSessionStart({ session_id: 'test' });
      const promptResult = await handlers.handleUserPromptSubmit({ user_prompt: 'hi', session_id: 'test' });
      const postToolResult = await handlers.handlePostToolUse({ tool_name: 'Read', tool_output: 'data', session_id: 'test' });
      const compactResult = await handlers.handlePreCompact({ session_id: 'test' });

      // None should have systemMessage
      expect(sessionResult.systemMessage).toBeUndefined();
      expect(promptResult.systemMessage).toBeUndefined();
      expect(postToolResult.systemMessage).toBeUndefined();
      expect(compactResult.systemMessage).toBeUndefined();
    });
  });
});

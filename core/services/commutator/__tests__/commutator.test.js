'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { createCommutator } = require('../commutator.cjs');
const { isOk, isErr, unwrap } = require('../../../../lib/index.cjs');

/**
 * Creates a mock Switchboard for testing Commutator.
 *
 * Records all emit() calls, stores on() handlers for trigger simulation,
 * and returns removal functions from on().
 *
 * @returns {Object} Mock switchboard with emit, on, trigger, emitted, handlers
 */
function createMockSwitchboard() {
  const emitted = [];
  const handlers = new Map();

  function on(eventName, handler) {
    if (!handlers.has(eventName)) {
      handlers.set(eventName, []);
    }
    handlers.get(eventName).push(handler);

    // Return removal function
    return function remove() {
      const list = handlers.get(eventName);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) {
          list.splice(idx, 1);
        }
      }
    };
  }

  function emit(eventName, payload) {
    emitted.push({ eventName, payload });

    // Also fire any registered handlers (for outbound adapter testing)
    const list = handlers.get(eventName);
    if (list) {
      for (const handler of list) {
        handler(payload, eventName);
      }
    }
  }

  function trigger(eventName, payload) {
    const list = handlers.get(eventName);
    if (list) {
      for (const handler of list) {
        handler(payload, eventName);
      }
    }
  }

  return { on, emit, trigger, emitted, handlers };
}

// ---- Realistic hook payloads from Claude Code docs ----

const writePayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PostToolUse',
  tool_name: 'Write',
  tool_input: { file_path: '/project/src/index.js', content: 'hello' },
  tool_response: { filePath: '/project/src/index.js', success: true },
};

const editPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PostToolUse',
  tool_name: 'Edit',
  tool_input: { file_path: '/project/src/index.js', old_string: 'hello', new_string: 'world' },
  tool_response: { filePath: '/project/src/index.js', success: true },
};

const readPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PostToolUse',
  tool_name: 'Read',
  tool_input: { file_path: '/project/src/index.js' },
  tool_response: { content: 'hello' },
};

const bashPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'ls -la' },
  tool_response: { stdout: 'total 8\n', exitCode: 0 },
};

const preWritePayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: { file_path: '/project/src/index.js', content: 'hello' },
};

const preBashPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'rm -rf /' },
};

const sessionStartPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'SessionStart',
  source: 'startup',
  model: 'claude-sonnet-4-20250514',
};

const stopPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'Stop',
  stop_hook_active: true,
  last_assistant_message: 'Goodbye!',
};

const promptSubmitPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'UserPromptSubmit',
  prompt: 'What is this project about?',
};

const preCompactPayload = {
  session_id: 'abc123',
  cwd: '/project',
  hook_event_name: 'PreCompact',
  summary: 'User asked about project structure.',
};

describe('Commutator', () => {
  let mockSb;
  let commutator;

  beforeEach(() => {
    mockSb = createMockSwitchboard();
    const result = createCommutator();
    expect(isOk(result)).toBe(true);
    commutator = unwrap(result);
    commutator.init({ switchboard: mockSb });
    commutator.start();
  });

  describe('contract validation', () => {
    it('createCommutator() returns Ok with frozen object containing all required methods', () => {
      const result = createCommutator();
      expect(isOk(result)).toBe(true);
      const instance = unwrap(result);
      expect(Object.isFrozen(instance)).toBe(true);
      expect(typeof instance.ingest).toBe('function');
      expect(typeof instance.registerOutput).toBe('function');
      expect(typeof instance.init).toBe('function');
      expect(typeof instance.start).toBe('function');
      expect(typeof instance.stop).toBe('function');
      expect(typeof instance.healthCheck).toBe('function');
    });
  });

  describe('semantic routing - tool events', () => {
    it('ingest(PostToolUse+Write) causes switchboard.emit("file:changed", payload)', () => {
      commutator.ingest(writePayload);
      const fileEvents = mockSb.emitted.filter((e) => e.eventName === 'file:changed');
      expect(fileEvents.length).toBe(1);
      expect(fileEvents[0].payload).toBe(writePayload);
    });

    it('ingest(PostToolUse+Edit) causes switchboard.emit("file:changed", payload)', () => {
      commutator.ingest(editPayload);
      const fileEvents = mockSb.emitted.filter((e) => e.eventName === 'file:changed');
      expect(fileEvents.length).toBe(1);
      expect(fileEvents[0].payload).toBe(editPayload);
    });

    it('ingest(PostToolUse+Read) causes switchboard.emit("file:changed", payload)', () => {
      commutator.ingest(readPayload);
      const fileEvents = mockSb.emitted.filter((e) => e.eventName === 'file:changed');
      expect(fileEvents.length).toBe(1);
      expect(fileEvents[0].payload).toBe(readPayload);
    });

    it('ingest(PostToolUse+Bash) causes switchboard.emit("shell:executed", payload)', () => {
      commutator.ingest(bashPayload);
      const shellEvents = mockSb.emitted.filter((e) => e.eventName === 'shell:executed');
      expect(shellEvents.length).toBe(1);
      expect(shellEvents[0].payload).toBe(bashPayload);
    });

    it('ingest(PreToolUse+Write) causes switchboard.emit("file:pending", payload)', () => {
      commutator.ingest(preWritePayload);
      const pendingEvents = mockSb.emitted.filter((e) => e.eventName === 'file:pending');
      expect(pendingEvents.length).toBe(1);
      expect(pendingEvents[0].payload).toBe(preWritePayload);
    });

    it('ingest(PreToolUse+Bash) causes switchboard.emit("shell:pending", payload)', () => {
      commutator.ingest(preBashPayload);
      const pendingEvents = mockSb.emitted.filter((e) => e.eventName === 'shell:pending');
      expect(pendingEvents.length).toBe(1);
      expect(pendingEvents[0].payload).toBe(preBashPayload);
    });
  });

  describe('semantic routing - hook events', () => {
    it('ingest(SessionStart) causes switchboard.emit("hook:session-start", payload)', () => {
      commutator.ingest(sessionStartPayload);
      const hookEvents = mockSb.emitted.filter((e) => e.eventName === 'hook:session-start');
      expect(hookEvents.length).toBe(1);
      expect(hookEvents[0].payload).toBe(sessionStartPayload);
    });

    it('ingest(Stop) causes switchboard.emit("hook:stop", payload)', () => {
      commutator.ingest(stopPayload);
      const hookEvents = mockSb.emitted.filter((e) => e.eventName === 'hook:stop');
      expect(hookEvents.length).toBe(1);
      expect(hookEvents[0].payload).toBe(stopPayload);
    });

    it('ingest(UserPromptSubmit) causes switchboard.emit("hook:prompt-submit", payload)', () => {
      commutator.ingest(promptSubmitPayload);
      const hookEvents = mockSb.emitted.filter((e) => e.eventName === 'hook:prompt-submit');
      expect(hookEvents.length).toBe(1);
      expect(hookEvents[0].payload).toBe(promptSubmitPayload);
    });

    it('ingest(PreCompact) causes switchboard.emit("hook:pre-compact", payload)', () => {
      commutator.ingest(preCompactPayload);
      const hookEvents = mockSb.emitted.filter((e) => e.eventName === 'hook:pre-compact');
      expect(hookEvents.length).toBe(1);
      expect(hookEvents[0].payload).toBe(preCompactPayload);
    });
  });

  describe('fallback routing', () => {
    it('ingest with unknown hook_event_name emits "hook:<lowercase-name>"', () => {
      const unknownPayload = {
        session_id: 'abc123',
        cwd: '/project',
        hook_event_name: 'CustomEvent',
      };
      commutator.ingest(unknownPayload);
      const hookEvents = mockSb.emitted.filter((e) => e.eventName === 'hook:customevent');
      expect(hookEvents.length).toBe(1);
      expect(hookEvents[0].payload).toBe(unknownPayload);
    });

    it('ingest with unknown tool_name in PostToolUse emits "tool:changed" (fallback domain)', () => {
      const unknownToolPayload = {
        session_id: 'abc123',
        cwd: '/project',
        hook_event_name: 'PostToolUse',
        tool_name: 'UnknownTool',
        tool_input: {},
        tool_response: {},
      };
      commutator.ingest(unknownToolPayload);
      const toolEvents = mockSb.emitted.filter((e) => e.eventName === 'tool:changed');
      expect(toolEvents.length).toBe(1);
      expect(toolEvents[0].payload).toBe(unknownToolPayload);
    });
  });

  describe('outbound adapters', () => {
    it('registerOutput(eventName, adapter) registers an output adapter', () => {
      const adapter = () => {};
      const result = commutator.registerOutput('output:inject-context', adapter);
      expect(isOk(result)).toBe(true);
    });

    it('after registering output adapter, when switchboard emits matching event, adapter is called', () => {
      const received = [];
      const adapter = (payload) => received.push(payload);
      commutator.registerOutput('output:inject-context', adapter);

      // Simulate switchboard emitting the outbound event
      mockSb.trigger('output:inject-context', { context: 'memory data' });

      expect(received.length).toBe(1);
      expect(received[0]).toEqual({ context: 'memory data' });
    });

    it('multiple output adapters can be registered for different events', () => {
      const contextReceived = [];
      const logReceived = [];

      commutator.registerOutput('output:inject-context', (p) => contextReceived.push(p));
      commutator.registerOutput('output:log', (p) => logReceived.push(p));

      mockSb.trigger('output:inject-context', { context: 'data' });
      mockSb.trigger('output:log', { message: 'logged' });

      expect(contextReceived.length).toBe(1);
      expect(logReceived.length).toBe(1);
      expect(contextReceived[0]).toEqual({ context: 'data' });
      expect(logReceived[0]).toEqual({ message: 'logged' });
    });
  });

  describe('lifecycle', () => {
    it('healthCheck returns Ok({ healthy: true, name: "commutator" }) after start()', () => {
      const result = commutator.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('commutator');
    });

    it('healthCheck returns Ok({ healthy: false, name: "commutator" }) before start()', () => {
      const freshResult = createCommutator();
      const fresh = unwrap(freshResult);
      fresh.init({ switchboard: mockSb });
      // Do NOT call start()
      const result = fresh.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(false);
      expect(health.name).toBe('commutator');
    });

    it('init({ switchboard }) stores dependency and returns Ok', () => {
      const freshResult = createCommutator();
      const fresh = unwrap(freshResult);
      const initResult = fresh.init({ switchboard: mockSb });
      expect(isOk(initResult)).toBe(true);
    });

    it('stop() cleans up output adapter subscriptions', () => {
      const received = [];
      commutator.registerOutput('output:test', (p) => received.push(p));

      // Before stop, adapter should fire
      mockSb.trigger('output:test', { before: true });
      expect(received.length).toBe(1);

      // After stop, adapter subscriptions should be cleaned up
      commutator.stop();
      mockSb.trigger('output:test', { after: true });
      expect(received.length).toBe(1); // Should not increase
    });
  });
});

'use strict';

const { describe, it, expect } = require('bun:test');
const { HOOK_SCHEMAS, HOOK_EVENT_NAMES, createHookRegistry } = require('../hooks.cjs');
const { ok, err, isOk, isErr } = require('../../../lib/result.cjs');

describe('HOOK_SCHEMAS', () => {
  it('has exactly 8 hook type entries', () => {
    expect(Object.keys(HOOK_SCHEMAS).length).toBe(8);
  });

  it('includes all 8 Claude Code hook types', () => {
    const expected = [
      'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
      'Stop', 'PreCompact', 'SubagentStart', 'SubagentStop',
    ];
    for (const type of expected) {
      expect(HOOK_SCHEMAS[type]).toBeDefined();
    }
  });

  it('SessionStart has session_id and cwd fields', () => {
    expect(HOOK_SCHEMAS.SessionStart.fields.session_id).toBe('string');
    expect(HOOK_SCHEMAS.SessionStart.fields.cwd).toBe('string');
  });

  it('PostToolUse has tool_name, tool_input, tool_output, session_id fields', () => {
    expect(HOOK_SCHEMAS.PostToolUse.fields.tool_name).toBe('string');
    expect(HOOK_SCHEMAS.PostToolUse.fields.tool_input).toBe('object');
    expect(HOOK_SCHEMAS.PostToolUse.fields.tool_output).toBe('string');
    expect(HOOK_SCHEMAS.PostToolUse.fields.session_id).toBe('string');
  });

  it('each schema has a description', () => {
    for (const [type, schema] of Object.entries(HOOK_SCHEMAS)) {
      expect(typeof schema.description).toBe('string');
      expect(schema.description.length).toBeGreaterThan(0);
    }
  });

  it('each schema has a fields object', () => {
    for (const [type, schema] of Object.entries(HOOK_SCHEMAS)) {
      expect(typeof schema.fields).toBe('object');
      expect(schema.fields).not.toBeNull();
    }
  });
});

describe('HOOK_EVENT_NAMES', () => {
  it('maps all 8 hook types to Switchboard event names', () => {
    expect(Object.keys(HOOK_EVENT_NAMES).length).toBe(8);
  });

  it('SessionStart maps to hook:session-start', () => {
    expect(HOOK_EVENT_NAMES.SessionStart).toBe('hook:session-start');
  });

  it('UserPromptSubmit maps to hook:prompt-submit', () => {
    expect(HOOK_EVENT_NAMES.UserPromptSubmit).toBe('hook:prompt-submit');
  });

  it('Stop maps to hook:stop', () => {
    expect(HOOK_EVENT_NAMES.Stop).toBe('hook:stop');
  });

  it('PreCompact maps to hook:pre-compact', () => {
    expect(HOOK_EVENT_NAMES.PreCompact).toBe('hook:pre-compact');
  });

  it('SubagentStart maps to hook:subagent-start', () => {
    expect(HOOK_EVENT_NAMES.SubagentStart).toBe('hook:subagent-start');
  });

  it('SubagentStop maps to hook:subagent-stop', () => {
    expect(HOOK_EVENT_NAMES.SubagentStop).toBe('hook:subagent-stop');
  });
});

describe('createHookRegistry', () => {
  describe('register', () => {
    it('registers a handler for a valid hook type', () => {
      const registry = createHookRegistry();
      const handler = () => {};
      const result = registry.register('SessionStart', 'magnet', handler);
      expect(result.ok).toBe(true);
    });

    it('returns INVALID_HOOK_TYPE for unknown hook type', () => {
      const registry = createHookRegistry();
      const result = registry.register('Unknown', 'magnet', () => {});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INVALID_HOOK_TYPE');
    });
  });

  describe('getListeners', () => {
    it('returns registered handlers for a hook type', () => {
      const registry = createHookRegistry();
      const handler = () => {};
      registry.register('SessionStart', 'magnet', handler);

      const listeners = registry.getListeners('SessionStart');
      expect(listeners.length).toBe(1);
      expect(listeners[0].service).toBe('magnet');
      expect(listeners[0].handler).toBe(handler);
    });

    it('returns empty array for hook type with no listeners', () => {
      const registry = createHookRegistry();
      const listeners = registry.getListeners('Stop');
      expect(listeners).toEqual([]);
    });

    it('returns empty array for unknown hook type', () => {
      const registry = createHookRegistry();
      const listeners = registry.getListeners('Unknown');
      expect(listeners).toEqual([]);
    });

    it('returns multiple listeners in registration order', () => {
      const registry = createHookRegistry();
      const h1 = () => {};
      const h2 = () => {};
      registry.register('SessionStart', 'magnet', h1);
      registry.register('SessionStart', 'wire', h2);

      const listeners = registry.getListeners('SessionStart');
      expect(listeners.length).toBe(2);
      expect(listeners[0].service).toBe('magnet');
      expect(listeners[1].service).toBe('wire');
    });
  });

  describe('wireToSwitchboard', () => {
    it('calls switchboard.on for each registered hook type', () => {
      const registry = createHookRegistry();
      registry.register('SessionStart', 'magnet', () => {});
      registry.register('Stop', 'wire', () => {});

      const onCalls = [];
      const mockSwitchboard = {
        on: (eventName, handler) => {
          onCalls.push({ eventName, handler });
          return () => {};
        },
      };

      const result = registry.wireToSwitchboard(mockSwitchboard);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(2); // Two hook types wired
      expect(onCalls.length).toBe(2);
      expect(onCalls[0].eventName).toBe('hook:session-start');
      expect(onCalls[1].eventName).toBe('hook:stop');
    });

    it('wired handler invokes all registered listeners', () => {
      const registry = createHookRegistry();
      const calls = [];
      registry.register('SessionStart', 'magnet', (payload) => { calls.push(['magnet', payload]); });
      registry.register('SessionStart', 'wire', (payload) => { calls.push(['wire', payload]); });

      let wiredHandler;
      const mockSwitchboard = {
        on: (eventName, handler) => {
          wiredHandler = handler;
          return () => {};
        },
      };

      registry.wireToSwitchboard(mockSwitchboard);

      // Simulate Switchboard emitting the event
      const payload = { session_id: 'test-123', cwd: '/tmp' };
      wiredHandler(payload);

      expect(calls).toEqual([
        ['magnet', payload],
        ['wire', payload],
      ]);
    });

    it('returns ok with 0 if nothing registered', () => {
      const registry = createHookRegistry();
      const mockSwitchboard = {
        on: () => () => {},
      };

      const result = registry.wireToSwitchboard(mockSwitchboard);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(0);
    });
  });

  describe('loadFromConfig', () => {
    it('loads listeners from config hooks.listeners object', () => {
      const registry = createHookRegistry();
      const config = {
        hooks: {
          listeners: {
            SessionStart: ['magnet', 'wire'],
            Stop: ['magnet'],
          },
        },
      };

      const result = registry.loadFromConfig(config);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(3); // 3 registrations total

      const sessionListeners = registry.getListeners('SessionStart');
      expect(sessionListeners.length).toBe(2);
      expect(sessionListeners[0].service).toBe('magnet');
      expect(sessionListeners[1].service).toBe('wire');

      const stopListeners = registry.getListeners('Stop');
      expect(stopListeners.length).toBe(1);
      expect(stopListeners[0].service).toBe('magnet');
    });

    it('returns error if config.hooks is missing', () => {
      const registry = createHookRegistry();
      const result = registry.loadFromConfig({});
      expect(result.ok).toBe(false);
    });

    it('skips invalid hook types in config', () => {
      const registry = createHookRegistry();
      const config = {
        hooks: {
          listeners: {
            SessionStart: ['magnet'],
            InvalidHook: ['wire'],
          },
        },
      };

      const result = registry.loadFromConfig(config);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(1); // Only SessionStart registered
    });
  });

  describe('getSchema', () => {
    it('returns schema for valid hook type', () => {
      const registry = createHookRegistry();
      const schema = registry.getSchema('SessionStart');
      expect(schema).not.toBeNull();
      expect(schema.fields.session_id).toBe('string');
    });

    it('returns null for unknown hook type', () => {
      const registry = createHookRegistry();
      const schema = registry.getSchema('Unknown');
      expect(schema).toBeNull();
    });
  });

  describe('listHookTypes', () => {
    it('returns all 8 hook type names', () => {
      const registry = createHookRegistry();
      const types = registry.listHookTypes();
      expect(types.length).toBe(8);
      expect(types).toContain('SessionStart');
      expect(types).toContain('PostToolUse');
      expect(types).toContain('SubagentStop');
    });
  });
});

'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');

/**
 * Maps Claude Code tool names to semantic domains.
 * Used by resolveEventName to generate domain-specific event names.
 *
 * @type {Record<string, string>}
 */
const TOOL_DOMAIN_MAP = {
  'Write': 'file',
  'Edit': 'file',
  'Read': 'file',
  'Glob': 'file',
  'Grep': 'file',
  'Bash': 'shell',
  'WebFetch': 'web',
  'WebSearch': 'web',
  'Agent': 'agent',
};

/**
 * Maps hook event phases to generic action suffixes.
 *
 * @type {Record<string, string>}
 */
const TOOL_ACTION_MAP = {
  'PreToolUse': 'pending',
  'PostToolUse': 'changed',
};

/**
 * Override map for specific domain+phase combos where the generic action is wrong.
 * Key format: `${domain}:${hookEventName}`
 *
 * @type {Record<string, string>}
 */
const TOOL_ACTION_OVERRIDE = {
  'shell:PostToolUse': 'executed',
  'web:PostToolUse': 'fetched',
  'agent:PostToolUse': 'completed',
};

/**
 * Maps non-tool hook event names to domain event names.
 * These hooks are lifecycle/session events, not tool invocations.
 *
 * @type {Record<string, string>}
 */
const HOOK_EVENT_MAP = {
  'SessionStart': 'hook:session-start',
  'UserPromptSubmit': 'hook:prompt-submit',
  'Stop': 'hook:stop',
  'PreCompact': 'hook:pre-compact',
  'Notification': 'hook:notification',
  'SubagentStart': 'hook:subagent-start',
  'SubagentStop': 'hook:subagent-stop',
};

/**
 * Contract shape for the Commutator service.
 * Defines required and optional methods for contract validation.
 *
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const COMMUTATOR_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'ingest', 'registerOutput'],
  optional: [],
};

/**
 * Resolves a Claude Code hook payload to a Switchboard domain event name.
 *
 * For tool-related hooks (PreToolUse, PostToolUse), the event name is composed
 * from the tool's semantic domain and the hook phase action:
 *   - PostToolUse + Write -> 'file:changed'
 *   - PostToolUse + Bash -> 'shell:executed'
 *   - PreToolUse + Write -> 'file:pending'
 *
 * For non-tool hooks, the event name is looked up from HOOK_EVENT_MAP or
 * falls back to 'hook:<lowercase-name>'.
 *
 * @param {Object} hookPayload - The raw Claude Code hook payload
 * @param {string} hookPayload.hook_event_name - The hook event type
 * @param {string} [hookPayload.tool_name] - The tool name (present for tool hooks)
 * @returns {string} The resolved Switchboard event name
 */
function resolveEventName(hookPayload) {
  const hookEvent = hookPayload.hook_event_name;

  // Tool-related hooks: resolve to domain:action
  if ((hookEvent === 'PreToolUse' || hookEvent === 'PostToolUse') && hookPayload.tool_name) {
    const domain = TOOL_DOMAIN_MAP[hookPayload.tool_name] || 'tool';
    const overrideKey = domain + ':' + hookEvent;
    const action = TOOL_ACTION_OVERRIDE[overrideKey] || TOOL_ACTION_MAP[hookEvent] || 'unknown';
    return domain + ':' + action;
  }

  // Non-tool hooks: lookup or fallback
  return HOOK_EVENT_MAP[hookEvent] || ('hook:' + hookEvent.toLowerCase());
}

/**
 * Creates a Commutator I/O bridge service instance.
 *
 * Commutator is the translation layer between Claude Code hook payloads and
 * Switchboard domain events. It inspects hook payloads, applies tool-aware
 * semantic routing to emit domain-specific events, and supports bidirectional
 * I/O with outbound adapter registration.
 *
 * **Inbound flow (hooks -> domain events):**
 * Hook payloads arrive via ingest(), are analyzed for hook type and tool name,
 * then emitted as semantic domain events on Switchboard (e.g., 'file:changed',
 * 'shell:executed', 'hook:session-start').
 *
 * **Outbound flow (domain events -> output adapters):**
 * Output adapters are registered via registerOutput(eventName, adapterFn).
 * When Switchboard emits the matching event, the adapter function is called.
 * This enables injecting context back into Claude Code sessions (stdout for
 * hooks now, Wire for inter-session in Phase 6).
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createCommutator() {
  /** @type {boolean} */
  let _started = false;

  /** @type {Object|null} */
  let _switchboard = null;

  /**
   * Tracks switchboard.on removal functions for output adapter cleanup on stop().
   * @type {Array<Function>}
   */
  const _outputRemovers = [];

  /**
   * Initializes the Commutator with its dependencies.
   * Expects a Switchboard instance for event dispatch.
   *
   * @param {Object} options - Initialization options
   * @param {Object} options.switchboard - The Switchboard service instance
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function init(options) {
    if (!options || !options.switchboard) {
      return err('COMMUTATOR_MISSING_SWITCHBOARD', 'Commutator requires a switchboard instance in options');
    }
    _switchboard = options.switchboard;
    return ok(undefined);
  }

  /**
   * Ingests a raw Claude Code hook payload, resolves it to a domain event
   * name, and emits it on Switchboard.
   *
   * Also emits 'hook:raw' with the original payload for listeners that want
   * unprocessed hook data.
   *
   * @param {Object} hookPayload - The raw Claude Code hook JSON payload
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function ingest(hookPayload) {
    if (!_switchboard) {
      return err('COMMUTATOR_NOT_INITIALIZED', 'Commutator must be initialized before ingesting payloads');
    }
    const eventName = resolveEventName(hookPayload);
    _switchboard.emit(eventName, hookPayload);
    _switchboard.emit('hook:raw', hookPayload);
    return ok(undefined);
  }

  /**
   * Registers an outbound adapter that fires when a matching Switchboard
   * event is emitted.
   *
   * The adapter function receives the event payload as its argument.
   * Subscriptions are tracked and cleaned up when stop() is called.
   *
   * @param {string} eventName - The Switchboard event name to listen for
   * @param {Function} adapterFn - The adapter function to call with the event payload
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function registerOutput(eventName, adapterFn) {
    if (!_switchboard) {
      return err('COMMUTATOR_NOT_INITIALIZED', 'Commutator must be initialized before registering output adapters');
    }
    const remover = _switchboard.on(eventName, (payload) => adapterFn(payload));
    _outputRemovers.push(remover);
    return ok(undefined);
  }

  /**
   * Starts the Commutator service.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stops the Commutator service.
   * Cleans up all output adapter subscriptions.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function stop() {
    for (const remover of _outputRemovers) {
      remover();
    }
    _outputRemovers.length = 0;
    _started = false;
    return ok(undefined);
  }

  /**
   * Returns the health status of the Commutator.
   *
   * @returns {import('../../../lib/result.cjs').Result<{healthy: boolean, name: string}>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'commutator' });
  }

  const impl = { init, start, stop, healthCheck, ingest, registerOutput };
  return createContract('commutator', COMMUTATOR_SHAPE, impl);
}

module.exports = { createCommutator, TOOL_DOMAIN_MAP, HOOK_EVENT_MAP };

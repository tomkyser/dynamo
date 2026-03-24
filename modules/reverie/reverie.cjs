'use strict';

/**
 * Reverie module entry point.
 *
 * Registers Reverie with the Dynamo platform via Circuit's module API.
 * Creates the Context Manager orchestrator, wires all 8 Claude Code hook
 * handlers through Armature's hook registry, and connects them to Switchboard.
 *
 * Per INT-01: All hooks are registered via createHookRegistry().register(),
 * NOT via events.on(). This ensures hooks are discoverable, inspectable,
 * and follow the Armature contract.
 *
 * @module reverie
 */

const { createHookRegistry } = require('../../core/armature/hooks.cjs');
const { createContextManager } = require('./components/context/context-manager.cjs');
const { createHookHandlers } = require('./hooks/hook-handlers.cjs');
const { createSelfModel } = require('./components/self-model/self-model.cjs');
const { createEntropyEngine } = require('./components/self-model/entropy-engine.cjs');
const { DATA_DIR_DEFAULT } = require('./lib/constants.cjs');

/**
 * Registers the Reverie module with the Circuit API.
 *
 * Creates all required components (Self Model, Context Manager, Hook Handlers)
 * and wires 8 hook handlers through Armature's hook registry to Switchboard.
 *
 * @param {Object} facade - Scoped Circuit API with getService, getProvider, events, etc.
 * @returns {{ name: string, status: string, hooks: number }} Registration result
 */
function register(facade) {
  const { events, getService, getProvider } = facade;

  // Resolve platform services
  const switchboard = getService('switchboard');
  const lathe = getService('lathe');
  const magnet = getService('magnet');
  const wire = getService('wire');
  const journal = getProvider('journal');

  // Create Self Model manager
  const selfModelResult = createSelfModel({ journal, magnet, wire, switchboard });
  if (!selfModelResult.ok) {
    return { name: 'reverie', status: 'error', error: selfModelResult.error };
  }
  const selfModel = selfModelResult.value;

  // Create entropy engine for session variance
  const entropy = createEntropyEngine({});

  // Create Context Manager orchestrator
  const ctxResult = createContextManager({
    selfModel,
    lathe,
    switchboard,
    entropy,
    journal,
    dataDir: DATA_DIR_DEFAULT,
  });
  if (!ctxResult.ok) {
    return { name: 'reverie', status: 'error', error: ctxResult.error };
  }
  const contextManager = ctxResult.value;

  // Create hook handlers (lathe + dataDir needed for Stop snapshot writes)
  const handlers = createHookHandlers({
    contextManager,
    switchboard,
    lathe,
    dataDir: DATA_DIR_DEFAULT,
  });

  // Register all 8 hooks via Armature hook registry (per INT-01)
  // NOT events.on() -- hooks go through the registry for discoverability
  // and contract compliance
  const registry = createHookRegistry();

  registry.register('SessionStart', 'reverie', handlers.handleSessionStart);
  registry.register('UserPromptSubmit', 'reverie', handlers.handleUserPromptSubmit);
  registry.register('PreToolUse', 'reverie', handlers.handlePreToolUse);
  registry.register('PostToolUse', 'reverie', handlers.handlePostToolUse);
  registry.register('Stop', 'reverie', handlers.handleStop);
  registry.register('PreCompact', 'reverie', handlers.handlePreCompact);
  registry.register('SubagentStart', 'reverie', handlers.handleSubagentStart);
  registry.register('SubagentStop', 'reverie', handlers.handleSubagentStop);

  // Wire all registered hooks to Switchboard events
  // This connects registry entries to switchboard.on(HOOK_EVENT_NAMES[hookType], handler)
  registry.wireToSwitchboard(switchboard);

  return { name: 'reverie', status: 'registered', hooks: 8 };
}

module.exports = { register };

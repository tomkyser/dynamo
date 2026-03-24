'use strict';

/**
 * Reverie module entry point.
 *
 * Registers Reverie with the Dynamo platform via Circuit's module API.
 * Creates the Context Manager orchestrator and registers all 8 Claude Code
 * hook handlers through Exciter's integration surface.
 *
 * Per INT-01 + D-09: All hooks are registered via exciter.registerHooks(),
 * which delegates to Armature's createHookRegistry internally. This ensures
 * hooks are discoverable, inspectable, and follow the Armature contract
 * while routing through Dynamo's integration surface.
 *
 * @module reverie
 */

const { createContextManager } = require('./components/context/context-manager.cjs');
const { createHookHandlers } = require('./hooks/hook-handlers.cjs');
const { createSelfModel } = require('./components/self-model/self-model.cjs');
const { createEntropyEngine } = require('./components/self-model/entropy-engine.cjs');
const { createFragmentWriter } = require('./components/fragments/fragment-writer.cjs');
const { createFormationPipeline } = require('./components/formation/formation-pipeline.cjs');
const { createRecallEngine } = require('./components/recall/recall-engine.cjs');
const { createNudgeManager } = require('./components/formation/nudge-manager.cjs');
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

  // Resolve additional services for Phase 9
  const assay = getService('assay');

  // Resolve Exciter integration surface and Lithograph transcript provider (Phase 9.1)
  const exciter = getService('exciter');
  const lithograph = getProvider('lithograph');

  // Create FragmentWriter for formation
  const fragmentWriter = createFragmentWriter({
    journal, wire, switchboard, sessionId: 'reverie-formation',
  });

  // Create nudge manager for formation -> context manager coordination
  const nudgeManager = createNudgeManager({ lathe, dataDir: DATA_DIR_DEFAULT });

  // Create Context Manager orchestrator (with Phase 9 nudge integration)
  const ctxResult = createContextManager({
    selfModel,
    lathe,
    switchboard,
    entropy,
    journal,
    dataDir: DATA_DIR_DEFAULT,
    nudgeManager,
  });
  if (!ctxResult.ok) {
    return { name: 'reverie', status: 'error', error: ctxResult.error };
  }
  const contextManager = ctxResult.value;

  // Create formation pipeline (FRG-03)
  const formationPipeline = createFormationPipeline({
    fragmentWriter, selfModel, lathe, wire, switchboard, assay,
    dataDir: DATA_DIR_DEFAULT,
  });

  // Create recall engine (FRG-04)
  const recallEngine = createRecallEngine({
    assay, selfModel, switchboard,
  });

  // Create hook handlers (lathe + dataDir needed for Stop snapshot writes)
  // Phase 9: formation pipeline and recall engine wired for formation triggers and recall injection
  const handlers = createHookHandlers({
    contextManager,
    switchboard,
    lathe,
    dataDir: DATA_DIR_DEFAULT,
    formationPipeline,
    recallEngine,
    lithograph,
  });

  // Register all 8 hooks via Exciter integration surface (per D-09)
  // Exciter delegates to Armature's createHookRegistry internally.
  // wireToSwitchboard is called during Exciter's start() phase.
  const hookResult = exciter.registerHooks('reverie', {
    SessionStart: handlers.handleSessionStart,
    UserPromptSubmit: handlers.handleUserPromptSubmit,
    PreToolUse: handlers.handlePreToolUse,
    PostToolUse: handlers.handlePostToolUse,
    Stop: handlers.handleStop,
    PreCompact: handlers.handlePreCompact,
    SubagentStart: handlers.handleSubagentStart,
    SubagentStop: handlers.handleSubagentStop,
  });
  if (!hookResult.ok) {
    return { name: 'reverie', status: 'error', error: hookResult.error };
  }

  return { name: 'reverie', status: 'registered', hooks: hookResult.value, formation: true, recall: true };
}

module.exports = { register };

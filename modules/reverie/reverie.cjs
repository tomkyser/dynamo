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

// Phase 10: Three-session architecture components
const { createSessionManager } = require('./components/session/session-manager.cjs');
const { createSessionConfig, FRAMING_MODES } = require('./components/session/session-config.cjs');
const { createMindCycle } = require('./components/session/mind-cycle.cjs');
const { createSublimationLoop } = require('./components/session/sublimation-loop.cjs');
const { createWireTopology } = require('./components/session/wire-topology.cjs');
const { createModeManager } = require('./components/modes/mode-manager.cjs');
const { createReferentialFraming } = require('./components/context/referential-framing.cjs');

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

  // -------------------------------------------------------------------------
  // Phase 10: Three-session architecture components
  // -------------------------------------------------------------------------

  // Resolve Conductor for session spawning
  const conductor = getService('conductor');

  // Create session config (defaults: dual framing, opus secondary, sonnet tertiary)
  const sessionConfig = createSessionConfig({});

  // Create referential framing templates for face prompt slot 5
  const referentialFraming = createReferentialFraming({ mode: sessionConfig.framing_mode });

  // Create sublimation loop (Tertiary cycle config + system prompt)
  const sublimationLoop = createSublimationLoop({ config: sessionConfig });

  // Create Wire topology (topology-validated Wire wrapper with ACK protocol)
  const wireTopology = createWireTopology({ wire, switchboard, config: sessionConfig });

  // Create Mind cognitive cycle (Secondary processing center)
  const mindCycle = createMindCycle({
    selfModel,
    formationPipeline,
    recallEngine,
    templateComposer: null, // Mind composes face prompts via referentialFraming + selfModel directly
    referentialFraming,
    sublimationLoop,
    switchboard,
    wire,
    lithograph,
    config: sessionConfig,
  });

  // Create Session Manager (lifecycle state machine, spawns Secondary/Tertiary)
  const sessionManager = createSessionManager({
    conductor,
    wire,
    selfModel,
    switchboard,
    sublimationLoop,
    config: sessionConfig,
  });

  // Create Mode Manager (Active/Passive with automatic fallback)
  const modeManager = createModeManager({
    sessionManager,
    conductor,
    switchboard,
    config: sessionConfig,
  });

  // -------------------------------------------------------------------------
  // Phase 10 Gap Closure: Wire Secondary face prompt authority pipeline
  // -------------------------------------------------------------------------

  // 1. Listen for session state changes to toggle Secondary authority.
  //    When Session Manager transitions to passive or active, Secondary is running
  //    and is the face prompt authority (per D-04). When stopped, revert to local.
  switchboard.on('session:state-changed', function onSessionStateChanged(data) {
    if (!data) return;
    if (data.to === 'passive' || data.to === 'active') {
      // Secondary is running — it is the face prompt authority (per D-04)
      contextManager.setSecondaryActive(true);
    } else if (data.to === 'stopped') {
      // All sessions terminated — revert to local composition
      contextManager.setSecondaryActive(false);
    }
  });

  // 2. Subscribe Primary to Wire topology for face prompt updates from Secondary.
  //    wireTopology.subscribe filters by topology rules: Primary only receives from Secondary.
  //    DIRECTIVE envelopes with payload.role === 'face_prompt' are routed to
  //    contextManager.receiveSecondaryUpdate() to update the cached face prompt.
  wireTopology.subscribe('primary', 'primary', function onPrimaryMessage(envelope) {
    if (envelope.type === 'directive' && envelope.payload && envelope.payload.role === 'face_prompt') {
      contextManager.receiveSecondaryUpdate(envelope.payload.content);
    }
  });

  // Create hook handlers (lathe + dataDir needed for Stop snapshot writes)
  // Phase 9: formation pipeline and recall engine wired for formation triggers and recall injection
  // Phase 10: session manager, wire topology, and mode manager for three-session lifecycle
  const handlers = createHookHandlers({
    contextManager,
    switchboard,
    lathe,
    dataDir: DATA_DIR_DEFAULT,
    formationPipeline,
    recallEngine,
    lithograph,
    sessionManager,    // Phase 10
    wireTopology,      // Phase 10
    modeManager,       // Phase 10
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

  return {
    name: 'reverie',
    status: 'registered',
    hooks: hookResult.value,
    formation: true,
    recall: true,
    sessions: true,     // Phase 10: three-session architecture
    modes: true,        // Phase 10: operational mode management
  };
}

module.exports = { register };

// Dynamo > Reverie > inner-voice.cjs
'use strict';

// Core pipeline orchestrator for all hook event processing.
// Wires together activation.cjs, dual-path.cjs, and curation.cjs
// into coherent per-hook cognitive pipelines.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const resolve = require('../../lib/resolve.cjs');
const { loadConfig, logError } = require(resolve('lib', 'core.cjs'));
const {
  extractEntities, updateActivation, decayAll, computeSublimationScore,
  classifyDomainFrame, checkThresholdCrossings, checkSpawnBudget, recordSpawn,
  setRateLimited
} = require(resolve('reverie', 'activation.cjs'));
const {
  selectPath, detectSemanticShift, detectExplicitRecall, estimateTokens,
  truncateToTokenLimit, formatHotPathInjection, adjustThreshold
} = require(resolve('reverie', 'dual-path.cjs'));
const {
  curateForInjection, formatBriefing, formatSynthesis, formatPreCompact,
  TOKEN_LIMITS
} = require(resolve('reverie', 'curation.cjs'));

// --- Constants ---

const DELIBERATION_RESULT_PATH = path.join(os.homedir(), '.claude', 'dynamo', 'inner-voice-deliberation-result.json');
const HOT_PATH_ABORT_MS = 400;
const DELIBERATION_TTL_SECONDS = 60;
const DEFAULT_SUBLIMATION_THRESHOLD = 0.6;
const DEFAULT_SOFT_CAP = 50; // D-13: soft cap, not hard limit

// --- Pipeline: processUserPrompt ---

/**
 * Process a user prompt through the full cognitive pipeline.
 * Steps with per-step timing via performance.now() (PATH-02).
 *
 * @param {Object} promptData - { prompt, project, scope }
 * @param {Object} state - Current inner-voice state (deep-copied internally)
 * @param {Object|null} pendingResult - Pending deliberation result (from consumeDeliberationResult)
 * @param {Object} [options={}] - Options including config override
 * @returns {{ injection: string|null, updatedState: Object, timings: Object, pathSelected: string, aborted?: boolean }}
 */
function processUserPrompt(promptData, state, pendingResult, options = {}) {
  const timings = {};
  const hotStart = performance.now();

  // Step 1: statePrep -- deep-copy state, load config
  const stepStart1 = performance.now();
  const s = JSON.parse(JSON.stringify(state));
  const config = options.config || loadConfig();
  timings.statePrep = performance.now() - stepStart1;

  // Step 1.5: Strip system tags from prompt (noise reduction)
  // System-injected blocks (<task-notification>, <system-reminder>, <dynamo-memory-context>)
  // contain metadata that would pollute entity extraction and domain classification.
  const { stripSystemTags } = require(resolve('reverie', 'activation.cjs'));
  const cleanPrompt = stripSystemTags(promptData.prompt || '');

  // Step 2: entityExtraction
  const stepStart2 = performance.now();
  const currentEntities = extractEntities(cleanPrompt);
  timings.entityExtraction = performance.now() - stepStart2;

  // Step 3: activationUpdate
  const stepStart3 = performance.now();
  let updatedMap = updateActivation(s.activation_map, currentEntities);
  updatedMap = decayAll(updatedMap);
  s.activation_map = updatedMap;
  timings.activationUpdate = performance.now() - stepStart3;

  // Step 4: domainClassification
  const domainFrame = classifyDomainFrame(cleanPrompt);
  s.domain_frame = domainFrame;

  // Step 5: semanticShift (D-10)
  const previousEntities = s._previous_entities || [];
  const shift = detectSemanticShift(currentEntities, previousEntities);

  // Step 6: recallCheck (D-11)
  const explicitRecall = detectExplicitRecall(cleanPrompt);

  // Step 7: predictionCheck (D-12)
  let predictionsMatch = false;
  if (s.predictions && s.predictions.expected_topic && currentEntities.length > 0) {
    const expected = (s.predictions.expected_topic || '').toLowerCase();
    const entityNames = currentEntities.map(e => e.name.toLowerCase());
    predictionsMatch = entityNames.some(name => expected.includes(name) || name.includes(expected));
  }

  // Step 8: sublimation
  const threshold = s._sublimation_threshold || DEFAULT_SUBLIMATION_THRESHOLD;
  // Compute sublimation scores for entities in the activation map
  for (const [key, entry] of Object.entries(s.activation_map)) {
    const score = computeSublimationScore(
      { name: key, level: entry.level || 0 },
      s.predictions,
      promptData.prompt || '',
      0.3 // default cognitive load
    );
    s.activation_map[key] = { ...entry, sublimation_score: score };
  }
  const crossedEntities = checkThresholdCrossings(s.activation_map, threshold);

  // Step 9: pathSelection
  const stepStart9 = performance.now();
  const spawnBudget = checkSpawnBudget(s, config.reverie || { operational: { subagent_daily_cap: DEFAULT_SOFT_CAP } });
  const signals = {
    explicitRecall,
    rateLimited: spawnBudget.rate_limited,
    semanticShiftScore: shift.shifted ? (1 - shift.overlapScore) : 0,
    entityConfidence: domainFrame.frame_confidence,
    needsInjection: crossedEntities.length > 0,
    predictionsMatch
  };
  const pathSelected = selectPath(signals);
  timings.pathSelection = performance.now() - stepStart9;

  // Step 10: 400ms abort check (PATH-02)
  if (performance.now() - hotStart > HOT_PATH_ABORT_MS) {
    logError('reverie-hot-path', 'Abort: exceeded 400ms during processUserPrompt');
    timings.formatting = 0;
    timings.total = performance.now() - hotStart;
    return { injection: null, updatedState: s, timings, pathSelected, aborted: true };
  }

  // Step 11: formatting
  const stepStart11 = performance.now();
  let injection = null;
  if (pathSelected === 'hot' && crossedEntities.length > 0) {
    if (pendingResult && pendingResult.injection) {
      injection = pendingResult.injection;
    } else {
      injection = formatHotPathInjection(crossedEntities, s, { tokenLimit: TOKEN_LIMITS.mid_session });
    }
  } else if (pathSelected === 'skip') {
    injection = null;
  } else if (pendingResult && pendingResult.injection) {
    injection = pendingResult.injection;
  }
  timings.formatting = performance.now() - stepStart11;

  // Step 12: Update self_model
  s.self_model.attention_state = domainFrame.current_frame + ' (' + domainFrame.frame_confidence.toFixed(2) + ')';
  s.self_model.confidence = domainFrame.frame_confidence;

  // Step 13: Update injection_history if injection produced
  if (injection) {
    s.injection_history.push({
      timestamp: new Date().toISOString(),
      acknowledged: false,
      entities: crossedEntities.map(e => e.id)
    });
  }

  // Step 14: Adjust threshold (D-09)
  s._sublimation_threshold = adjustThreshold(
    s._sublimation_threshold || DEFAULT_SUBLIMATION_THRESHOLD,
    s.injection_history
  );

  // Step 15: Store previous entities for next semantic shift comparison
  s._previous_entities = currentEntities;

  // Step 16: Deliberation path handling
  if (pathSelected === 'deliberation') {
    s.processing.deliberation_pending = true;
    s.processing.last_deliberation_id = crypto.randomUUID();
    s.processing.deliberation_type = explicitRecall ? 'explicit_recall' : 'semantic_shift';
    s.processing.deliberation_queue = crossedEntities;

    if (spawnBudget.allowed) {
      recordSpawn(s);
    }

    // D-13: soft cap warning
    if (spawnBudget.remaining < 10) {
      logError('reverie-budget', 'Approaching soft cap: ' + spawnBudget.remaining + ' spawns remaining');
    }
  }

  // Step 17: Return
  timings.total = performance.now() - hotStart;
  return { injection, updatedState: s, timings, pathSelected };
}

// --- Pipeline: processSessionStart ---

/**
 * Process a session start event.
 * Per D-14: always triggers deliberation.
 *
 * @param {Object} sessionData - { project, recent, context, predictions }
 * @param {Object} state - Current inner-voice state
 * @param {Object} [options={}]
 * @returns {{ briefing: string, updatedState: Object }}
 */
function processSessionStart(sessionData, state, options = {}) {
  const s = JSON.parse(JSON.stringify(state));

  // Step 1: Reset session-scoped fields
  s.session_id = crypto.randomUUID();
  s.processing.deliberation_pending = false;

  // Step 2: Decay activation map
  s.activation_map = decayAll(s.activation_map);

  // Step 3: Classify domain frame from context
  if (sessionData && sessionData.context) {
    s.domain_frame = classifyDomainFrame(sessionData.context);
  }

  // Step 4: D-14 -- always deliberation
  s.processing.deliberation_pending = true;
  s.processing.last_deliberation_id = crypto.randomUUID();
  s.processing.deliberation_type = 'session_briefing';
  recordSpawn(s);

  // Step 5: Generate briefing
  const topEntities = getTopActivatedEntities(s.activation_map, 10);
  const briefing = formatBriefing(sessionData || {}, topEntities, s, options);

  return { briefing, updatedState: s };
}

// --- Pipeline: processStop ---

/**
 * Process a session stop event.
 * Per D-15: always triggers deliberation for REM Tier 3 synthesis.
 *
 * @param {Object} sessionData - { summary }
 * @param {Object} state - Current inner-voice state
 * @param {Object} [options={}]
 * @returns {{ synthesis: Object, updatedState: Object }}
 */
function processStop(sessionData, state, options = {}) {
  const s = JSON.parse(JSON.stringify(state));

  // Step 1: D-15 -- always deliberation
  s.processing.deliberation_pending = true;
  s.processing.last_deliberation_id = crypto.randomUUID();
  s.processing.deliberation_type = 'rem_synthesis';
  recordSpawn(s);

  // Step 2: Update self_model.recent_performance from injection_history
  const history = s.injection_history || [];
  s.self_model.recent_performance = {
    injections_made: history.length,
    injections_acknowledged: history.filter(i => i.acknowledged).length,
    last_calibration: new Date().toISOString()
  };

  // Step 3: Generate synthesis
  const synthesis = formatSynthesis(sessionData || {}, s, options);

  return { synthesis, updatedState: s };
}

// --- Pipeline: processPreCompact ---

/**
 * Process a pre-compact event.
 * Preserves high-activation entities, prunes low ones.
 *
 * @param {Object} compactData - Compact context data
 * @param {Object} state - Current inner-voice state
 * @param {Object} [options={}]
 * @returns {{ summary: string, updatedState: Object }}
 */
function processPreCompact(compactData, state, options = {}) {
  const s = JSON.parse(JSON.stringify(state));

  // Step 1: Generate compact summary
  const summary = formatPreCompact(s, options);

  // Step 2: Prune low-activation entities (< 0.1)
  const pruned = {};
  for (const [id, entry] of Object.entries(s.activation_map)) {
    if ((entry.level || 0) >= 0.1) {
      pruned[id] = entry;
    }
  }
  s.activation_map = pruned;

  return { summary, updatedState: s };
}

// --- Pipeline: processPostToolUse ---

/**
 * Process a post-tool-use event.
 * Lightweight: entity extraction + activation update only. No injection.
 *
 * @param {Object} toolData - { tool_name, tool_input: { file_path } }
 * @param {Object} state - Current inner-voice state
 * @param {Object} [options={}]
 * @returns {{ updatedState: Object }}
 */
function processPostToolUse(toolData, state, options = {}) {
  const s = JSON.parse(JSON.stringify(state));

  // Extract entities from tool file path and name
  const filePath = (toolData && toolData.tool_input && toolData.tool_input.file_path) || '';
  const toolName = (toolData && toolData.tool_name) || '';
  const text = filePath + ' ' + toolName;
  const entities = extractEntities(text);

  // Update activation map
  s.activation_map = updateActivation(s.activation_map, entities);

  return { updatedState: s };
}

// --- State Bridge: consumeDeliberationResult (PATH-05) ---

/**
 * Atomically consume a deliberation result file.
 * Uses fs.renameSync for atomic consumption (prevents double-consumption).
 *
 * @param {Object} state - Current inner-voice state
 * @param {Object} [options={}]
 * @returns {{ injection: string, type: string } | null}
 */
function consumeDeliberationResult(state, options = {}) {
  const resultPath = options.resultPath || DELIBERATION_RESULT_PATH;

  // Step 1: Check if result file exists
  if (!fs.existsSync(resultPath)) {
    return null;
  }

  // Step 2: Atomic consume via rename (prevents double-consumption, Pitfall 3)
  const consumedPath = resultPath + '.consumed';
  try {
    fs.renameSync(resultPath, consumedPath);
  } catch (e) {
    // Another process may have consumed it already
    logError('reverie-state-bridge', 'Failed to rename result file: ' + e.message);
    return null;
  }

  // Step 3: Read consumed file
  let result;
  try {
    const raw = fs.readFileSync(consumedPath, 'utf8');
    result = JSON.parse(raw);
  } catch (e) {
    logError('reverie-state-bridge', 'Failed to read consumed result: ' + e.message);
    try { fs.unlinkSync(consumedPath); } catch (_) { /* ignore */ }
    return null;
  }

  // Step 4: Clean up
  try {
    fs.unlinkSync(consumedPath);
  } catch (_) { /* ignore cleanup errors */ }

  // Step 5: Validate TTL
  const age = Date.now() - new Date(result.timestamp).getTime();
  const ttl = (result.ttl_seconds || DELIBERATION_TTL_SECONDS) * 1000;
  if (age > ttl) {
    logError('reverie-state-bridge', 'Discarding stale deliberation result (age: ' + Math.round(age / 1000) + 's)');
    return null;
  }

  // Step 6: Validate correlation
  if (result.correlation_id !== state.processing.last_deliberation_id) {
    logError('reverie-state-bridge', 'Discarding mismatched correlation_id: expected=' +
      state.processing.last_deliberation_id + ' got=' + result.correlation_id);
    return null;
  }

  // Step 7: Return
  return { injection: result.injection, type: result.type || 'deliberation' };
}

// --- State Bridge: writeDeliberationResult (PATH-05) ---

/**
 * Write a deliberation result for the state bridge.
 *
 * @param {Object} result - { injection, agent_id, type }
 * @param {Object} state - Current inner-voice state
 * @param {Object} [options={}]
 */
function writeDeliberationResult(result, state, options = {}) {
  const resultPath = options.resultPath || DELIBERATION_RESULT_PATH;

  const data = {
    status: 'complete',
    correlation_id: state.processing.last_deliberation_id,
    timestamp: new Date().toISOString(),
    injection: result.injection || '',
    agent_id: result.agent_id || 'inner-voice',
    ttl_seconds: DELIBERATION_TTL_SECONDS,
    type: result.type || 'deliberation'
  };

  fs.writeFileSync(resultPath, JSON.stringify(data, null, 2));
}

// --- Helpers ---

/**
 * Get top N activated entities from activation map.
 * @param {Object} activationMap
 * @param {number} n
 * @returns {Array<{name: string, activation: number}>}
 */
function getTopActivatedEntities(activationMap, n) {
  const entries = Object.entries(activationMap || {}).map(([name, entry]) => ({
    name,
    activation: entry.level || 0
  }));
  entries.sort((a, b) => b.activation - a.activation);
  return entries.slice(0, n);
}

// --- Exports ---

module.exports = {
  processUserPrompt,
  processSessionStart,
  processStop,
  processPreCompact,
  processPostToolUse,
  consumeDeliberationResult,
  writeDeliberationResult,
  DELIBERATION_RESULT_PATH
};

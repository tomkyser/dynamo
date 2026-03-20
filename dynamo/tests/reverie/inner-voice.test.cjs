// Dynamo > Tests > Reverie > inner-voice.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Module under test -- loaded via resolve for consistency
const resolve = require('../../../lib/resolve.cjs');

// Helper: create a temp directory for state bridge tests
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'iv-test-'));
}

// Helper: create a minimal valid state object
function freshState() {
  return {
    version: 1,
    last_updated: new Date().toISOString(),
    session_id: null,
    activation_map: {},
    domain_frame: {
      current_frame: 'general',
      frame_confidence: 0.5,
      active_frames: ['general']
    },
    predictions: {
      expected_topic: null,
      expected_activity: null,
      confidence: 0.5,
      last_embedding: null
    },
    processing: {
      deliberation_pending: false,
      last_deliberation_id: null
    },
    self_model: {
      attention_state: null,
      injection_mode: 'standard',
      confidence: 0.5,
      recent_performance: {
        injections_made: 0,
        injections_acknowledged: 0,
        last_calibration: null
      }
    },
    relationship_model: {
      communication_preferences: [],
      working_patterns: [],
      current_projects: [],
      affect_baseline: 'neutral',
      frustration_signals: []
    },
    injection_history: [],
    pending_associations: [],
    _previous_entities: [],
    _sublimation_threshold: 0.6
  };
}

// Load the module under test
const innerVoice = require(resolve('reverie', 'inner-voice.cjs'));

// ============================================================
// processUserPrompt tests
// ============================================================

describe('processUserPrompt', () => {
  it('extracts entities from promptData.prompt and updates activation map', () => {
    const state = freshState();
    const promptData = { prompt: 'Working on the dynamo activation module' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    // Activation map should have entries from entity extraction
    assert.ok(Object.keys(result.updatedState.activation_map).length > 0,
      'activation_map should be populated after entity extraction');
  });

  it('detects semantic shift between current and previous entities', () => {
    const state = freshState();
    state._previous_entities = [{ name: 'alpha' }, { name: 'beta' }];
    // Completely different entities = semantic shift
    const promptData = { prompt: 'gamma delta epsilon zeta theta' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    // The state should record the current entities as previous for the next call
    assert.ok(Array.isArray(result.updatedState._previous_entities),
      '_previous_entities should be stored in state');
  });

  it('returns injection string when entities cross sublimation threshold', () => {
    const state = freshState();
    // Pre-populate activation map with entities above threshold
    state.activation_map = {
      'dynamo': { level: 0.9, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 3 },
      'reverie': { level: 0.8, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 2 }
    };
    state._sublimation_threshold = 0.1; // Low threshold so entities cross it
    const promptData = { prompt: 'Working on the dynamo reverie module integration' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.ok(result.injection !== null && result.injection !== undefined,
      'injection should be returned when entities cross threshold');
    assert.equal(typeof result.injection, 'string');
  });

  it('returns null injection when no entities cross threshold', () => {
    const state = freshState();
    state._sublimation_threshold = 0.99; // Very high threshold
    const promptData = { prompt: 'hello world' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.equal(result.injection, null, 'injection should be null when no entities cross threshold');
  });

  it('returns null injection when predictions match prompt (D-12 silence)', () => {
    const state = freshState();
    state.predictions = { expected_topic: 'dynamo', expected_activity: 'engineering', confidence: 0.5 };
    // Pre-populate activation map with entities above threshold
    state.activation_map = {
      'dynamo': { level: 0.9, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 3 }
    };
    state._sublimation_threshold = 0.1;
    const promptData = { prompt: 'Working on the dynamo module' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    // D-12: silence when predictions match
    assert.equal(result.injection, null, 'injection should be null when predictions match (D-12 silence)');
  });

  it('explicit recall phrase returns path=deliberation signal (D-11)', () => {
    const state = freshState();
    const promptData = { prompt: 'do you remember the architecture decision we made?' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.equal(result.pathSelected, 'deliberation',
      'explicit recall should select deliberation path');
  });

  it('updates self_model.attention_state with current domain frame', () => {
    const state = freshState();
    const promptData = { prompt: 'implement the new function to handle errors' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.ok(result.updatedState.self_model.attention_state !== null,
      'self_model.attention_state should be set');
  });

  it('adjusts sublimation threshold based on injection_history (D-09)', () => {
    const state = freshState();
    // Provide enough acknowledged injections to trigger threshold adjustment
    state.injection_history = [];
    for (let i = 0; i < 10; i++) {
      state.injection_history.push({ timestamp: new Date().toISOString(), acknowledged: true, entities: ['test'] });
    }
    state._sublimation_threshold = 0.6;
    const promptData = { prompt: 'working on something new' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    // With >70% acknowledged, threshold should decrease
    assert.ok(result.updatedState._sublimation_threshold < 0.6,
      'threshold should decrease when injections are consistently acknowledged');
  });

  it('stores current entities as previous_entities for next invocation', () => {
    const state = freshState();
    const promptData = { prompt: 'Working on the dynamo module with activation' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.ok(Array.isArray(result.updatedState._previous_entities),
      '_previous_entities should be an array');
    assert.ok(result.updatedState._previous_entities.length > 0,
      '_previous_entities should contain extracted entities');
  });

  it('per-step timing is present in returned timings object (PATH-02)', () => {
    const state = freshState();
    const promptData = { prompt: 'test timing instrumentation' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.ok(result.timings !== undefined, 'timings object should be returned');
    assert.equal(typeof result.timings.total, 'number', 'total timing should be a number');
  });
});

// ============================================================
// processSessionStart tests
// ============================================================

describe('processSessionStart', () => {
  it('returns briefing string (never null -- D-14)', () => {
    const state = freshState();
    const sessionData = { project: 'dynamo' };
    const result = innerVoice.processSessionStart(sessionData, state, {});
    assert.ok(result.briefing !== null && result.briefing !== undefined,
      'briefing should never be null (D-14)');
    assert.equal(typeof result.briefing, 'string');
    assert.ok(result.briefing.length > 0, 'briefing should not be empty');
  });

  it('resets session-scoped state fields', () => {
    const state = freshState();
    state.processing.deliberation_pending = true;
    state.session_id = 'old-session-id';
    const result = innerVoice.processSessionStart({}, state, {});
    // session_id should be reset to a new UUID
    assert.notEqual(result.updatedState.session_id, 'old-session-id',
      'session_id should be reset');
    assert.ok(result.updatedState.session_id, 'session_id should be set to a new value');
  });

  it('decays activation map entries in returned state', () => {
    const state = freshState();
    const pastTime = new Date(Date.now() - 600000).toISOString(); // 10 min ago
    state.activation_map = {
      'test-entity': { level: 1.0, sources: ['direct_mention'], last_activated: pastTime, convergence_count: 1 }
    };
    const result = innerVoice.processSessionStart({}, state, {});
    const entry = result.updatedState.activation_map['test-entity'];
    // Decayed entries should have lower level
    if (entry) {
      assert.ok(entry.level < 1.0, 'activation should have decayed');
    }
    // Or if pruned entirely, that's also valid
  });

  it('updates domain_frame in returned state', () => {
    const state = freshState();
    const sessionData = { context: 'implement new error handling function' };
    const result = innerVoice.processSessionStart(sessionData, state, {});
    assert.ok(result.updatedState.domain_frame, 'domain_frame should exist');
    assert.ok(result.updatedState.domain_frame.current_frame, 'current_frame should be set');
  });

  it('sets deliberation_pending=true and generates correlation ID (D-14)', () => {
    const state = freshState();
    const result = innerVoice.processSessionStart({}, state, {});
    assert.equal(result.updatedState.processing.deliberation_pending, true,
      'D-14: sessionStart always sets deliberation_pending=true');
    assert.ok(result.updatedState.processing.last_deliberation_id,
      'correlation ID should be generated');
  });

  it('records spawn in state (D-14)', () => {
    const state = freshState();
    state.processing.spawn_tracker = { date: new Date().toISOString().slice(0, 10), count: 0, rate_limited: false };
    const result = innerVoice.processSessionStart({}, state, {});
    assert.ok(result.updatedState.processing.spawn_tracker.count >= 1,
      'spawn count should be incremented (D-14)');
  });
});

// ============================================================
// processStop tests
// ============================================================

describe('processStop', () => {
  it('returns synthesis object with required fields', () => {
    const state = freshState();
    const sessionData = { summary: 'Worked on inner voice pipeline' };
    const result = innerVoice.processStop(sessionData, state, {});
    assert.ok(result.synthesis, 'synthesis should be returned');
    assert.ok('synthesis' in result.synthesis, 'synthesis object should have synthesis field');
    assert.ok('session_name' in result.synthesis, 'synthesis object should have session_name field');
    assert.ok('self_model_updates' in result.synthesis, 'synthesis object should have self_model_updates field');
    assert.ok('predictions' in result.synthesis, 'synthesis object should have predictions field');
  });

  it('updates self_model.recent_performance with injection counts', () => {
    const state = freshState();
    state.injection_history = [
      { timestamp: new Date().toISOString(), acknowledged: true, entities: ['a'] },
      { timestamp: new Date().toISOString(), acknowledged: false, entities: ['b'] },
      { timestamp: new Date().toISOString(), acknowledged: true, entities: ['c'] }
    ];
    const result = innerVoice.processStop({}, state, {});
    const perf = result.updatedState.self_model.recent_performance;
    assert.equal(perf.injections_made, 3, 'injections_made should count all injections');
    assert.equal(perf.injections_acknowledged, 2, 'injections_acknowledged should count acknowledged ones');
  });

  it('sets deliberation_pending=true for REM Tier 3 (D-15)', () => {
    const state = freshState();
    const result = innerVoice.processStop({}, state, {});
    assert.equal(result.updatedState.processing.deliberation_pending, true,
      'D-15: stop always sets deliberation_pending=true');
  });

  it('records spawn in state (D-15)', () => {
    const state = freshState();
    state.processing.spawn_tracker = { date: new Date().toISOString().slice(0, 10), count: 0, rate_limited: false };
    const result = innerVoice.processStop({}, state, {});
    assert.ok(result.updatedState.processing.spawn_tracker.count >= 1,
      'spawn count should be incremented (D-15)');
  });
});

// ============================================================
// processPreCompact tests
// ============================================================

describe('processPreCompact', () => {
  it('returns compact summary string', () => {
    const state = freshState();
    const result = innerVoice.processPreCompact({}, state, {});
    assert.equal(typeof result.summary, 'string', 'summary should be a string');
    assert.ok(result.summary.length > 0, 'summary should not be empty');
  });

  it('preserves high-activation entities in returned state', () => {
    const state = freshState();
    state.activation_map = {
      'high': { level: 0.8, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 1 },
      'low': { level: 0.05, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 1 }
    };
    const result = innerVoice.processPreCompact({}, state, {});
    assert.ok(result.updatedState.activation_map['high'],
      'high activation entities should be preserved');
  });

  it('prunes low-activation entities (level < 0.1) from returned state', () => {
    const state = freshState();
    state.activation_map = {
      'high': { level: 0.8, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 1 },
      'low': { level: 0.05, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 1 }
    };
    const result = innerVoice.processPreCompact({}, state, {});
    assert.equal(result.updatedState.activation_map['low'], undefined,
      'low activation entities (< 0.1) should be pruned');
  });
});

// ============================================================
// processPostToolUse tests
// ============================================================

describe('processPostToolUse', () => {
  it('extracts entities from tool output file path', () => {
    const state = freshState();
    const toolData = { tool_name: 'Write', tool_input: { file_path: '/src/reverie/activation.cjs' } };
    const result = innerVoice.processPostToolUse(toolData, state, {});
    assert.ok(Object.keys(result.updatedState.activation_map).length > 0,
      'activation_map should be updated from tool file path');
  });

  it('updates activation map with extracted entities', () => {
    const state = freshState();
    state.activation_map = {
      'existing': { level: 0.5, sources: ['direct_mention'], last_activated: new Date().toISOString(), convergence_count: 1 }
    };
    const toolData = { tool_name: 'Read', tool_input: { file_path: '/src/dynamo/config.cjs' } };
    const result = innerVoice.processPostToolUse(toolData, state, {});
    // Existing entity should be preserved
    assert.ok(result.updatedState.activation_map['existing'],
      'existing activation entries should be preserved');
  });

  it('returns only updatedState (no injection)', () => {
    const state = freshState();
    const toolData = { tool_name: 'Write', tool_input: { file_path: '/test.cjs' } };
    const result = innerVoice.processPostToolUse(toolData, state, {});
    assert.ok(result.updatedState, 'updatedState should be returned');
    assert.equal(result.injection, undefined, 'PostToolUse should not produce injection');
  });
});

// ============================================================
// consumeDeliberationResult tests (PATH-05)
// ============================================================

describe('consumeDeliberationResult', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) { /* ignore cleanup errors */ }
  });

  it('returns null when no result file exists', () => {
    const state = freshState();
    const resultPath = path.join(tmpDir, 'no-such-result.json');
    const result = innerVoice.consumeDeliberationResult(state, { resultPath });
    assert.equal(result, null, 'should return null when no file exists');
  });

  it('returns injection string when valid result file exists', () => {
    const state = freshState();
    const correlationId = crypto.randomUUID();
    state.processing.last_deliberation_id = correlationId;
    const resultPath = path.join(tmpDir, 'result.json');
    const resultData = {
      status: 'complete',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      injection: 'Here is relevant context from deliberation.',
      agent_id: 'inner-voice',
      ttl_seconds: 60
    };
    fs.writeFileSync(resultPath, JSON.stringify(resultData));

    const result = innerVoice.consumeDeliberationResult(state, { resultPath });
    assert.ok(result !== null, 'should return a result');
    assert.equal(result.injection, 'Here is relevant context from deliberation.');
  });

  it('atomically moves file via rename before reading', () => {
    const state = freshState();
    const correlationId = crypto.randomUUID();
    state.processing.last_deliberation_id = correlationId;
    const resultPath = path.join(tmpDir, 'result.json');
    const resultData = {
      status: 'complete',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      injection: 'test',
      agent_id: 'inner-voice',
      ttl_seconds: 60
    };
    fs.writeFileSync(resultPath, JSON.stringify(resultData));

    innerVoice.consumeDeliberationResult(state, { resultPath });

    // Original file should be gone (renamed then deleted)
    assert.equal(fs.existsSync(resultPath), false,
      'original file should be removed after consumption');
  });

  it('discards result when TTL exceeded (>60 seconds old)', () => {
    const state = freshState();
    const correlationId = crypto.randomUUID();
    state.processing.last_deliberation_id = correlationId;
    const resultPath = path.join(tmpDir, 'result.json');
    const oldTimestamp = new Date(Date.now() - 120000).toISOString(); // 2 min ago
    const resultData = {
      status: 'complete',
      correlation_id: correlationId,
      timestamp: oldTimestamp,
      injection: 'stale data',
      agent_id: 'inner-voice',
      ttl_seconds: 60
    };
    fs.writeFileSync(resultPath, JSON.stringify(resultData));

    const result = innerVoice.consumeDeliberationResult(state, { resultPath });
    assert.equal(result, null, 'should discard stale result');
  });

  it('discards result when correlation_id does not match', () => {
    const state = freshState();
    state.processing.last_deliberation_id = 'expected-id';
    const resultPath = path.join(tmpDir, 'result.json');
    const resultData = {
      status: 'complete',
      correlation_id: 'wrong-id',
      timestamp: new Date().toISOString(),
      injection: 'mismatched data',
      agent_id: 'inner-voice',
      ttl_seconds: 60
    };
    fs.writeFileSync(resultPath, JSON.stringify(resultData));

    const result = innerVoice.consumeDeliberationResult(state, { resultPath });
    assert.equal(result, null, 'should discard mismatched correlation_id result');
  });

  it('cleans up consumed file after reading', () => {
    const state = freshState();
    const correlationId = crypto.randomUUID();
    state.processing.last_deliberation_id = correlationId;
    const resultPath = path.join(tmpDir, 'result.json');
    const resultData = {
      status: 'complete',
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      injection: 'cleanup test',
      agent_id: 'inner-voice',
      ttl_seconds: 60
    };
    fs.writeFileSync(resultPath, JSON.stringify(resultData));

    innerVoice.consumeDeliberationResult(state, { resultPath });

    // Both original and consumed file should be gone
    assert.equal(fs.existsSync(resultPath), false, 'original file should be gone');
    assert.equal(fs.existsSync(resultPath + '.consumed'), false, 'consumed file should be cleaned up');
  });
});

// ============================================================
// writeDeliberationResult tests (PATH-05)
// ============================================================

describe('writeDeliberationResult', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) { /* ignore cleanup errors */ }
  });

  it('writes JSON file with required fields', () => {
    const state = freshState();
    state.processing.last_deliberation_id = 'test-corr-id';
    const resultPath = path.join(tmpDir, 'result.json');
    const resultData = { injection: 'test injection', agent_id: 'inner-voice' };

    innerVoice.writeDeliberationResult(resultData, state, { resultPath });

    assert.ok(fs.existsSync(resultPath), 'result file should exist');
    const written = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    assert.equal(written.status, 'complete');
    assert.equal(written.correlation_id, 'test-corr-id');
    assert.ok(written.timestamp, 'timestamp should be set');
    assert.equal(written.injection, 'test injection');
    assert.equal(written.agent_id, 'inner-voice');
    assert.equal(written.ttl_seconds, 60);
  });

  it('correlation_id matches state.processing.last_deliberation_id', () => {
    const state = freshState();
    const corrId = crypto.randomUUID();
    state.processing.last_deliberation_id = corrId;
    const resultPath = path.join(tmpDir, 'result.json');

    innerVoice.writeDeliberationResult({ injection: 'x' }, state, { resultPath });

    const written = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    assert.equal(written.correlation_id, corrId,
      'correlation_id should match state.processing.last_deliberation_id');
  });

  it('ttl_seconds defaults to 60', () => {
    const state = freshState();
    state.processing.last_deliberation_id = 'ttl-test';
    const resultPath = path.join(tmpDir, 'result.json');

    innerVoice.writeDeliberationResult({ injection: 'x' }, state, { resultPath });

    const written = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    assert.equal(written.ttl_seconds, 60, 'ttl_seconds should default to 60');
  });
});

// ============================================================
// Hot path timing tests (PATH-02)
// ============================================================

describe('Hot path timing (PATH-02)', () => {
  it('processUserPrompt returns timings object with numeric values', () => {
    const state = freshState();
    const promptData = { prompt: 'test timing' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    assert.ok(result.timings, 'timings should be present');
    for (const [key, value] of Object.entries(result.timings)) {
      assert.equal(typeof value, 'number', `timing "${key}" should be a number`);
    }
  });

  it('timings includes expected keys', () => {
    const state = freshState();
    const promptData = { prompt: 'test timing keys' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    const expectedKeys = ['statePrep', 'entityExtraction', 'activationUpdate', 'pathSelection', 'formatting', 'total'];
    for (const key of expectedKeys) {
      assert.ok(key in result.timings, `timings should include key "${key}"`);
    }
  });

  it('total timing is approximately sum of individual step timings', () => {
    const state = freshState();
    const promptData = { prompt: 'test timing sum validation' };
    const result = innerVoice.processUserPrompt(promptData, state, null, {});
    const individual = result.timings.statePrep + result.timings.entityExtraction +
      result.timings.activationUpdate + result.timings.pathSelection + result.timings.formatting;
    // Allow for timing overhead -- total should be within 50ms of sum
    assert.ok(Math.abs(result.timings.total - individual) < 50,
      `total (${result.timings.total}) should be approximately sum of steps (${individual})`);
  });
});

// ============================================================
// Module exports check
// ============================================================

describe('module exports', () => {
  it('exports all required functions and constants', () => {
    assert.equal(typeof innerVoice.processUserPrompt, 'function');
    assert.equal(typeof innerVoice.processSessionStart, 'function');
    assert.equal(typeof innerVoice.processStop, 'function');
    assert.equal(typeof innerVoice.processPreCompact, 'function');
    assert.equal(typeof innerVoice.processPostToolUse, 'function');
    assert.equal(typeof innerVoice.consumeDeliberationResult, 'function');
    assert.equal(typeof innerVoice.writeDeliberationResult, 'function');
    assert.equal(typeof innerVoice.DELIBERATION_RESULT_PATH, 'string');
  });
});

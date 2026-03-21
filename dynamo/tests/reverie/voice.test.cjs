// Dynamo > Tests > Reverie > voice.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const voiceModulePath = path.join(__dirname, '..', '..', '..', 'subsystems', 'reverie', 'voice.cjs');

describe('Reverie Voice Module', () => {
  let voice;

  beforeEach(() => {
    voice = require(voiceModulePath);
  });

  describe('formatVoiceStatus()', () => {
    it('contains "Inner Voice State" header', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Inner Voice State'), 'Missing header');
    });

    it('contains "Activation Map" section', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Activation Map'), 'Missing Activation Map section');
    });

    it('contains "Domain Frame" section', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Domain Frame'), 'Missing Domain Frame section');
    });

    it('contains "Self-Model" section', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Self-Model'), 'Missing Self-Model section');
    });

    it('contains "Predictions" section', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Predictions'), 'Missing Predictions section');
    });

    it('shows activation map entries sorted by level descending with percentage', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      // "resolver" at 85% should come before "dynamo" at 60%
      const resolverIdx = result.indexOf('resolver');
      const dynamoIdx = result.indexOf('dynamo');
      assert.ok(resolverIdx < dynamoIdx, 'Entities not sorted by level descending');
      assert.ok(result.includes('85%'), 'Missing percentage display for resolver');
      assert.ok(result.includes('60%'), 'Missing percentage display for dynamo');
    });

    it('shows sublimation score if present', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('0.72'), 'Missing sublimation score');
    });

    it('shows injection history entries with timestamp and acknowledged status', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('2026-03-20T12:00:00'), 'Missing history timestamp');
      // Check acknowledged status indicator
      assert.ok(result.includes('ack') || result.includes('unack'), 'Missing ack/unack indicator');
    });

    it('shows processing section with deliberation state', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Processing') || result.includes('deliberation'), 'Missing processing section');
    });

    it('handles empty/freshDefaults state with "0 entities" and "general" frame', () => {
      const state = makeEmptyState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('Inner Voice State'), 'Missing header for empty state');
      assert.ok(result.includes('0 entities'), 'Missing "0 entities" for empty activation map');
      assert.ok(result.includes('general'), 'Missing "general" frame');
    });

    it('displays "none" for null fields', () => {
      const state = makeEmptyState();
      const result = voice.formatVoiceStatus(state);
      assert.ok(result.includes('none'), 'Missing "none" for null fields');
    });

    it('limits injection history to last 10 entries', () => {
      const state = makePopulatedState();
      // Add 15 history entries
      state.injection_history = [];
      for (let i = 0; i < 15; i++) {
        state.injection_history.push({
          timestamp: `2026-03-20T${String(i).padStart(2, '0')}:00:00Z`,
          acknowledged: i % 2 === 0,
          entities: ['entity' + i]
        });
      }
      const result = voice.formatVoiceStatus(state);
      // Should show entries 5-14 (last 10), not entries 0-4
      assert.ok(!result.includes('entity0') || !result.includes('entity1'),
        'Should limit to last 10 entries');
      assert.ok(result.includes('entity14'), 'Should include most recent entry');
    });
  });

  describe('formatVoiceExplain()', () => {
    it('returns last injection details when history is non-empty', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceExplain(state);
      // Should show last entry timestamp
      assert.ok(result.includes('2026-03-20T12:30:00'), 'Missing last entry timestamp');
    });

    it('shows acknowledged status as yes/no', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceExplain(state);
      // Last entry has acknowledged: true
      assert.ok(result.includes('yes') || result.includes('Yes'), 'Missing acknowledged status');
    });

    it('shows entities list from last entry', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceExplain(state);
      assert.ok(result.includes('resolver'), 'Missing entity from last injection');
    });

    it('shows processing context', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceExplain(state);
      assert.ok(result.includes('semantic_shift') || result.includes('deliberation'),
        'Missing processing context');
    });

    it('shows model state (attention, confidence)', () => {
      const state = makePopulatedState();
      const result = voice.formatVoiceExplain(state);
      assert.ok(result.includes('0.75') || result.includes('attention'),
        'Missing model state info');
    });

    it('returns "No injection decisions recorded yet." for empty history', () => {
      const state = makeEmptyState();
      const result = voice.formatVoiceExplain(state);
      assert.strictEqual(result, 'No injection decisions recorded yet.');
    });

    it('returns "No injection decisions recorded yet." for missing injection_history', () => {
      const state = makeEmptyState();
      delete state.injection_history;
      const result = voice.formatVoiceExplain(state);
      assert.strictEqual(result, 'No injection decisions recorded yet.');
    });
  });

  describe('partialReset()', () => {
    it('resets self_model to freshDefaults values', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.strictEqual(result.self_model.confidence, 0.5, 'self_model.confidence not reset');
      assert.strictEqual(result.self_model.attention_state, null, 'attention_state not reset');
      assert.strictEqual(result.self_model.injection_mode, 'standard', 'injection_mode not reset');
      assert.strictEqual(result.self_model.recent_performance.injections_made, 0, 'injections_made not reset');
    });

    it('resets predictions to freshDefaults values', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.strictEqual(result.predictions.expected_topic, null, 'expected_topic not reset');
      assert.strictEqual(result.predictions.expected_activity, null, 'expected_activity not reset');
      assert.strictEqual(result.predictions.confidence, 0.5, 'predictions.confidence not reset');
    });

    it('clears injection_history to empty array', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.deepStrictEqual(result.injection_history, [], 'injection_history not cleared');
    });

    it('clears pending_associations to empty array', () => {
      const state = makePopulatedState();
      state.pending_associations = [{ topic: 'test' }];
      const result = voice.partialReset(state);
      assert.deepStrictEqual(result.pending_associations, [], 'pending_associations not cleared');
    });

    it('resets processing to freshDefaults values', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.strictEqual(result.processing.deliberation_pending, false, 'deliberation_pending not reset');
      assert.strictEqual(result.processing.last_deliberation_id, null, 'last_deliberation_id not reset');
    });

    it('preserves activation_map entries', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.ok(result.activation_map.resolver, 'activation_map.resolver not preserved');
      assert.strictEqual(result.activation_map.resolver.level, 0.85, 'resolver level not preserved');
      assert.ok(result.activation_map.dynamo, 'activation_map.dynamo not preserved');
      assert.strictEqual(result.activation_map.dynamo.level, 0.6, 'dynamo level not preserved');
    });

    it('preserves domain_frame', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.strictEqual(result.domain_frame.current_frame, 'development', 'domain_frame not preserved');
      assert.strictEqual(result.domain_frame.frame_confidence, 0.8, 'frame_confidence not preserved');
    });

    it('preserves session_id and version', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.strictEqual(result.session_id, 'test-session-123', 'session_id not preserved');
      assert.strictEqual(result.version, 1, 'version not preserved');
    });

    it('preserves relationship_model', () => {
      const state = makePopulatedState();
      const result = voice.partialReset(state);
      assert.strictEqual(result.relationship_model.affect_baseline, 'neutral', 'relationship_model not preserved');
    });

    it('updates last_updated timestamp', () => {
      const state = makePopulatedState();
      const before = new Date().toISOString();
      const result = voice.partialReset(state);
      assert.ok(result.last_updated >= before, 'last_updated not updated');
    });
  });

  describe('exports', () => {
    it('exports formatVoiceStatus', () => {
      assert.strictEqual(typeof voice.formatVoiceStatus, 'function');
    });

    it('exports formatVoiceExplain', () => {
      assert.strictEqual(typeof voice.formatVoiceExplain, 'function');
    });

    it('exports partialReset', () => {
      assert.strictEqual(typeof voice.partialReset, 'function');
    });
  });
});

// --- Test Helpers ---

function makeEmptyState() {
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
    pending_associations: []
  };
}

function makePopulatedState() {
  return {
    version: 1,
    last_updated: '2026-03-20T12:00:00Z',
    session_id: 'test-session-123',
    activation_map: {
      resolver: { level: 0.85, sublimation_score: 0.72 },
      dynamo: { level: 0.6, sublimation_score: 0.45 }
    },
    domain_frame: {
      current_frame: 'development',
      frame_confidence: 0.8,
      active_frames: ['development', 'architecture']
    },
    predictions: {
      expected_topic: 'resolver refactor',
      expected_activity: 'code review',
      confidence: 0.75,
      last_embedding: null
    },
    processing: {
      deliberation_pending: false,
      last_deliberation_id: 'delib-001',
      deliberation_type: 'semantic_shift'
    },
    self_model: {
      attention_state: 'development (0.80)',
      injection_mode: 'standard',
      confidence: 0.75,
      recent_performance: {
        injections_made: 5,
        injections_acknowledged: 3,
        last_calibration: '2026-03-20T11:00:00Z'
      }
    },
    relationship_model: {
      communication_preferences: ['concise'],
      working_patterns: ['iterative'],
      current_projects: ['dynamo'],
      affect_baseline: 'neutral',
      frustration_signals: []
    },
    injection_history: [
      {
        timestamp: '2026-03-20T12:00:00Z',
        acknowledged: false,
        entities: ['dynamo', 'ledger']
      },
      {
        timestamp: '2026-03-20T12:30:00Z',
        acknowledged: true,
        entities: ['resolver', 'activation']
      }
    ],
    pending_associations: []
  };
}

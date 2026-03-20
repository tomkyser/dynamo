// Dynamo > Reverie > state.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const resolve = require('../../lib/resolve.cjs');
const { logError } = require(resolve('lib', 'core.cjs'));

const DEFAULT_STATE_PATH = path.join(os.homedir(), '.claude', 'dynamo', 'inner-voice-state.json');

// --- Fresh defaults ---

function freshDefaults() {
  return {
    version: 1,
    last_updated: new Date().toISOString(),
    session_id: null,
    // Phase 23 LIVE sections
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
    // Phase 23 STUBBED sections
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

// --- Load state ---

function loadState(statePath, options = {}) {
  const filePath = options.statePath || statePath || DEFAULT_STATE_PATH;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    // Merge with defaults to ensure all fields present
    const defaults = freshDefaults();
    return { ...defaults, ...parsed };
  } catch (e) {
    if (e.code !== 'ENOENT') {
      logError('reverie-state', 'Corrupt state file, resetting to defaults: ' + e.message);
    }
    return freshDefaults();
  }
}

// --- Persist state ---

function persistState(state, statePath, options = {}) {
  const filePath = options.statePath || statePath || DEFAULT_STATE_PATH;
  state.last_updated = new Date().toISOString();
  const tmpPath = filePath + '.' + crypto.randomUUID().slice(0, 8) + '.tmp';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, filePath);
}

module.exports = { loadState, persistState, freshDefaults, DEFAULT_STATE_PATH };

// Dynamo > Reverie > voice.cjs
'use strict';

const path = require('path');
const resolve = require('../../lib/resolve.cjs');
const { freshDefaults } = require(resolve('reverie', 'state.cjs'));

// --- formatVoiceStatus ---

/**
 * Format a full status display of the Inner Voice state.
 * @param {Object} state - Inner Voice state object
 * @returns {string} Multi-line human-readable status string
 */
function formatVoiceStatus(state) {
  const lines = [];

  // Header
  lines.push('Inner Voice State');
  lines.push('=================');
  lines.push('');

  // Last updated and session
  lines.push('Last updated: ' + (state.last_updated || 'none'));
  lines.push('Session ID:   ' + (state.session_id || 'none'));
  lines.push('');

  // Activation Map
  const mapEntries = Object.entries(state.activation_map || {});
  lines.push('Activation Map (' + mapEntries.length + ' entities)');
  lines.push('-----------------');
  if (mapEntries.length === 0) {
    lines.push('  (empty)');
  } else {
    // Sort by level descending
    mapEntries.sort((a, b) => (b[1].level || 0) - (a[1].level || 0));
    for (const [name, entry] of mapEntries) {
      const pct = Math.round((entry.level || 0) * 100) + '%';
      let line = '  ' + name + ': ' + pct;
      if (entry.sublimation_score !== undefined && entry.sublimation_score !== null) {
        line += ' sub=' + entry.sublimation_score.toFixed(2);
      }
      lines.push(line);
    }
  }
  lines.push('');

  // Domain Frame
  const df = state.domain_frame || {};
  lines.push('Domain Frame');
  lines.push('------------');
  lines.push('  Current: ' + (df.current_frame || 'none') + ' (confidence: ' + (df.frame_confidence !== undefined ? df.frame_confidence.toFixed(2) : 'none') + ')');
  if (df.active_frames && df.active_frames.length > 0) {
    lines.push('  Active:  ' + df.active_frames.join(', '));
  }
  lines.push('');

  // Predictions
  const pred = state.predictions || {};
  lines.push('Predictions');
  lines.push('-----------');
  lines.push('  Expected topic:    ' + (pred.expected_topic || 'none'));
  lines.push('  Expected activity: ' + (pred.expected_activity || 'none'));
  lines.push('  Confidence:        ' + (pred.confidence !== undefined ? pred.confidence.toFixed(2) : 'none'));
  lines.push('');

  // Self-Model
  const sm = state.self_model || {};
  const perf = sm.recent_performance || {};
  lines.push('Self-Model');
  lines.push('----------');
  lines.push('  Attention:    ' + (sm.attention_state || 'none'));
  lines.push('  Mode:         ' + (sm.injection_mode || 'none'));
  lines.push('  Confidence:   ' + (sm.confidence !== undefined ? sm.confidence.toFixed(2) : 'none'));
  lines.push('  Injections:   ' + (perf.injections_made || 0) + ' made, ' + (perf.injections_acknowledged || 0) + ' acknowledged');
  lines.push('');

  // Injection History (last 10)
  const history = state.injection_history || [];
  const displayHistory = history.slice(-10);
  lines.push('Injection History (last ' + displayHistory.length + ' of ' + history.length + ')');
  lines.push('------------------');
  if (displayHistory.length === 0) {
    lines.push('  (none)');
  } else {
    for (const entry of displayHistory) {
      const ackLabel = entry.acknowledged ? 'ack' : 'unack';
      const entities = (entry.entities || []).join(', ');
      lines.push('  ' + (entry.timestamp || 'unknown') + ' [' + ackLabel + '] entities: ' + (entities || 'none'));
    }
  }
  lines.push('');

  // Processing
  const proc = state.processing || {};
  lines.push('Processing');
  lines.push('----------');
  lines.push('  Deliberation pending: ' + (proc.deliberation_pending ? 'yes' : 'no'));
  lines.push('  Last deliberation ID: ' + (proc.last_deliberation_id || 'none'));
  if (proc.deliberation_type) {
    lines.push('  Deliberation type:    ' + proc.deliberation_type);
  }

  return lines.join('\n');
}

// --- formatVoiceExplain ---

/**
 * Format an explanation of the last injection decision.
 * @param {Object} state - Inner Voice state object
 * @returns {string} Human-readable explanation of last injection decision
 */
function formatVoiceExplain(state) {
  const history = state.injection_history;
  if (!history || history.length === 0) {
    return 'No injection decisions recorded yet.';
  }

  const last = history[history.length - 1];
  const lines = [];

  lines.push('Last Injection Decision');
  lines.push('=======================');
  lines.push('');

  // Entry details
  lines.push('Timestamp:    ' + (last.timestamp || 'unknown'));
  lines.push('Acknowledged: ' + (last.acknowledged ? 'yes' : 'no'));
  lines.push('Entities:     ' + (last.entities || []).join(', '));
  lines.push('');

  // Processing context
  const proc = state.processing || {};
  lines.push('Processing Context');
  lines.push('------------------');
  lines.push('  Deliberation type:    ' + (proc.deliberation_type || 'none'));
  lines.push('  Deliberation pending: ' + (proc.deliberation_pending ? 'yes' : 'no'));
  lines.push('');

  // Model state
  const sm = state.self_model || {};
  lines.push('Model State');
  lines.push('-----------');
  lines.push('  Attention:  ' + (sm.attention_state || 'none'));
  lines.push('  Confidence: ' + (sm.confidence !== undefined ? sm.confidence.toFixed(2) : 'none'));

  return lines.join('\n');
}

// --- partialReset ---

/**
 * Partially reset Inner Voice state.
 * Clears self_model, predictions, injection_history, pending_associations, and processing.
 * Preserves activation_map, domain_frame, session_id, version, and relationship_model.
 * @param {Object} state - Current Inner Voice state
 * @returns {Object} New state with reset fields
 */
function partialReset(state) {
  const defaults = freshDefaults();
  return {
    ...state,
    self_model: defaults.self_model,
    predictions: defaults.predictions,
    injection_history: defaults.injection_history,
    pending_associations: defaults.pending_associations,
    processing: defaults.processing,
    last_updated: new Date().toISOString()
  };
}

module.exports = { formatVoiceStatus, formatVoiceExplain, partialReset };

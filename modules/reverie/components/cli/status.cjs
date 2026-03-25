'use strict';

/**
 * Reverie CLI status command handler.
 *
 * Provides an operational dashboard showing current mode, fragment counts,
 * Self Model version, last REM timestamp, domain count, and association
 * index size.
 *
 * Per INT-02: CLI surface via Pulley for read-only inspection.
 * Per D-01: Status returns complete operational dashboard in three output modes.
 *
 * @module reverie/components/cli/status
 */

const { ok } = require('../../../../lib/result.cjs');

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates the Reverie status handler.
 *
 * @param {Object} context - Handler context
 * @param {Object|null} context.modeManager - Mode Manager for current mode
 * @param {Object|null} context.selfModel - Self Model for version info
 * @param {Object|null} context.journal - Journal provider for fragment counts
 * @param {Object|null} context.switchboard - Switchboard for last event queries
 * @param {Object|null} context.wire - Wire service (reserved for domain queries)
 * @param {Object|null} context.formationPipeline - Formation pipeline (reserved)
 * @returns {{ handle: Function }} Handler object
 */
function createStatusHandler(context) {
  const { modeManager, selfModel, journal, switchboard } = context || {};

  /**
   * Handles the `dynamo reverie status` command.
   *
   * Returns mode, topology health, fragment lifecycle counts, Self Model
   * version, last REM timestamp, domain count, and association index size.
   *
   * @param {string[]} args - Positional arguments (unused)
   * @param {Object} flags - Command flags (unused)
   * @returns {import('../../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>}
   */
  function handle(args, flags) {
    // Mode: from modeManager or 'unknown' if unavailable
    const mode = modeManager ? modeManager.getMode() : 'unknown';

    // Topology health: from modeManager metrics or 'unknown'
    let topologyHealth = 'unknown';
    if (modeManager && typeof modeManager.getMetrics === 'function') {
      const metrics = modeManager.getMetrics();
      topologyHealth = metrics.active_sessions_count > 0 ? 'connected' : 'disconnected';
    }

    // Self Model version: from identity-core aspect or 'uninitialized'
    let smVersion = 'uninitialized';
    if (selfModel && typeof selfModel.getAspect === 'function') {
      const identity = selfModel.getAspect('identity-core');
      if (identity && identity.version !== undefined) {
        smVersion = identity.version;
      }
    }

    // Fragment counts: from journal list or fallback to 0
    const fragments = { working: 0, active: 0, archive: 0 };
    if (journal && typeof journal.list === 'function') {
      const dirs = ['working', 'active', 'archive'];
      for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        const listResult = journal.list(dir);
        if (listResult && listResult.ok && Array.isArray(listResult.value)) {
          fragments[dir] = listResult.value.length;
        }
      }
    }

    // Last REM timestamp: from switchboard last event or null
    let lastRemTimestamp = null;
    if (switchboard && typeof switchboard.lastEvent === 'function') {
      const lastRem = switchboard.lastEvent('reverie:rem:complete');
      if (lastRem) {
        lastRemTimestamp = lastRem;
      }
    }

    // Domain count and association index size: stub as 0
    // These require Ledger queries via Wire that will be populated with live data
    const domainCount = 0;
    const indexSize = 0;

    // Build data object per D-01
    const data = {
      mode: mode,
      topology_health: topologyHealth,
      fragments: fragments,
      self_model_version: smVersion,
      last_rem: lastRemTimestamp,
      domain_count: domainCount,
      association_index_size: indexSize,
    };

    // Build human-readable output
    const human = [
      'Reverie Status',
      '==============',
      'Mode:                    ' + data.mode,
      'Topology Health:         ' + data.topology_health,
      'Fragments (working):     ' + data.fragments.working,
      'Fragments (active):      ' + data.fragments.active,
      'Fragments (archive):     ' + data.fragments.archive,
      'Self Model Version:      ' + data.self_model_version,
      'Last REM:                ' + (data.last_rem || 'never'),
      'Domain Count:            ' + data.domain_count,
      'Association Index Size:  ' + data.association_index_size,
    ].join('\n');

    return ok({
      human: human,
      json: data,
      raw: JSON.stringify(data),
    });
  }

  return Object.freeze({ handle: handle });
}

module.exports = { createStatusHandler };

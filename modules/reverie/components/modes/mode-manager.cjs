'use strict';

/**
 * Mode Manager — Active/Passive operational mode state machine with automatic fallback.
 *
 * Controls which operational mode Reverie runs in:
 *   - Passive: Primary + lightweight Secondary (no formation, no recall, no sublimation)
 *   - Active: All three sessions with full Mind capabilities
 *   - REM: Placeholder for Phase 11 (consolidation mode)
 *   - Dormant: Placeholder for Phase 11 (idle/sleep mode)
 *
 * Automatic fallback: If Tertiary session health fails in Active mode,
 * Mode Manager automatically degrades to Passive.
 *
 * Per OPS-01: Active mode runs all three sessions.
 * Per OPS-02: Passive mode runs only Primary + lightweight Secondary.
 *
 * @module reverie/components/modes/mode-manager
 */

const { ok, err } = require('../../../../lib/index.cjs');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Operational modes for the Reverie module.
 * REM and DORMANT are placeholders for Phase 11.
 *
 * @type {Readonly<{ ACTIVE: string, PASSIVE: string, REM: string, DORMANT: string }>}
 */
const OPERATIONAL_MODES = Object.freeze({
  ACTIVE: 'active',
  PASSIVE: 'passive',
  REM: 'rem',
  DORMANT: 'dormant',
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a Mode Manager instance.
 *
 * @param {Object} options
 * @param {Object} options.sessionManager - Session Manager for upgrade/degrade
 * @param {Object} options.conductor - Conductor service for health checks
 * @param {Object} options.switchboard - Switchboard service for event emission
 * @param {Object} options.config - Configuration options
 * @returns {Readonly<{ getMode: Function, requestActive: Function, requestPassive: Function, checkHealth: Function, getMetrics: Function }>}
 */
function createModeManager({ sessionManager, conductor, switchboard, config } = {}) {
  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  let _mode = OPERATIONAL_MODES.PASSIVE;
  const _startedAt = Date.now();
  let _modeChanges = 0;
  let _lastHealthCheck = null;

  // ---------------------------------------------------------------------------
  // Helper: set mode with event emission
  // ---------------------------------------------------------------------------

  /**
   * Sets the operational mode and emits a mode:changed event.
   *
   * @param {string} newMode - New operational mode
   * @param {string} reason - Reason for mode change
   */
  function _setMode(newMode, reason) {
    const oldMode = _mode;
    _mode = newMode;
    _modeChanges++;

    if (switchboard) {
      switchboard.emit('mode:changed', { from: oldMode, to: newMode, reason });
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Returns the current operational mode.
   *
   * @returns {string} Current mode ('active', 'passive', 'rem', or 'dormant')
   */
  function getMode() {
    return _mode;
  }

  /**
   * Requests transition to Active mode.
   * Calls sessionManager.upgrade() to spawn Tertiary session.
   *
   * @returns {Promise<import('../../../../lib/result.cjs').Result>}
   */
  async function requestActive() {
    if (_mode === OPERATIONAL_MODES.ACTIVE) {
      return ok({ mode: _mode, changed: false });
    }

    const upgradeResult = await sessionManager.upgrade();
    if (!upgradeResult.ok) {
      return err('UPGRADE_FAILED', upgradeResult.error.message || 'Upgrade failed');
    }

    _setMode(OPERATIONAL_MODES.ACTIVE, 'user_requested');
    return ok({ mode: _mode, changed: true });
  }

  /**
   * Requests transition to Passive mode.
   * Calls sessionManager.degrade() to stop Tertiary session.
   *
   * @returns {Promise<import('../../../../lib/result.cjs').Result>}
   */
  async function requestPassive() {
    if (_mode === OPERATIONAL_MODES.PASSIVE) {
      return ok({ mode: _mode, changed: false });
    }

    if (_mode === OPERATIONAL_MODES.ACTIVE) {
      await sessionManager.degrade();
    }

    _setMode(OPERATIONAL_MODES.PASSIVE, 'user_requested');
    return ok({ mode: _mode, changed: true });
  }

  /**
   * Checks health of active sessions.
   * In Active mode: checks both Secondary and Tertiary. If Tertiary is down,
   * automatically falls back to Passive.
   * In Passive mode: checks Secondary only. If Secondary is down, emits mode:critical.
   *
   * @returns {Promise<import('../../../../lib/result.cjs').Result>}
   */
  async function checkHealth() {
    _lastHealthCheck = Date.now();
    const sessionState = sessionManager.getState();
    const checkedSessions = [];
    let healthy = true;

    if (_mode === OPERATIONAL_MODES.ACTIVE) {
      // Check Tertiary first (most likely to fail)
      if (sessionState.tertiary) {
        const tertiaryHealth = conductor.getSessionHealth(sessionState.tertiary);
        const tertiaryAlive = tertiaryHealth.ok && tertiaryHealth.value && tertiaryHealth.value.alive;
        checkedSessions.push({ sessionId: sessionState.tertiary, alive: tertiaryAlive });

        if (!tertiaryAlive) {
          // Automatic fallback to Passive
          healthy = false;
          await sessionManager.degrade();
          _setMode(OPERATIONAL_MODES.PASSIVE, 'tertiary_health_failure');
        }
      }

      // Check Secondary
      if (sessionState.secondary) {
        const secondaryHealth = conductor.getSessionHealth(sessionState.secondary);
        const secondaryAlive = secondaryHealth.ok && secondaryHealth.value && secondaryHealth.value.alive;
        checkedSessions.push({ sessionId: sessionState.secondary, alive: secondaryAlive });

        if (!secondaryAlive) {
          healthy = false;
        }
      }
    } else if (_mode === OPERATIONAL_MODES.PASSIVE) {
      // Passive: only check Secondary
      if (sessionState.secondary) {
        const secondaryHealth = conductor.getSessionHealth(sessionState.secondary);
        const secondaryAlive = secondaryHealth.ok && secondaryHealth.value && secondaryHealth.value.alive;
        checkedSessions.push({ sessionId: sessionState.secondary, alive: secondaryAlive });

        if (!secondaryAlive) {
          healthy = false;
          if (switchboard) {
            switchboard.emit('mode:critical', { reason: 'secondary_not_alive' });
          }
        }
      }
    }

    return ok({ mode: _mode, healthy, checked_sessions: checkedSessions });
  }

  /**
   * Returns operational metrics.
   *
   * @returns {{ mode: string, uptime_ms: number, mode_changes: number, last_health_check: number|null, active_sessions_count: number }}
   */
  function getMetrics() {
    let activeSessionsCount = 0;
    if (_mode === OPERATIONAL_MODES.ACTIVE) {
      activeSessionsCount = 2; // Secondary + Tertiary
    } else if (_mode === OPERATIONAL_MODES.PASSIVE) {
      activeSessionsCount = 1; // Secondary only
    }
    // REM and DORMANT: 0

    return {
      mode: _mode,
      uptime_ms: Date.now() - _startedAt,
      mode_changes: _modeChanges,
      last_health_check: _lastHealthCheck,
      active_sessions_count: activeSessionsCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Return frozen public API
  // ---------------------------------------------------------------------------

  return Object.freeze({
    getMode,
    requestActive,
    requestPassive,
    checkHealth,
    getMetrics,
  });
}

module.exports = { createModeManager, OPERATIONAL_MODES };

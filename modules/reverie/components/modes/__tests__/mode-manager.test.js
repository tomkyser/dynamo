'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');

/**
 * Creates a mock Session Manager for mode manager tests.
 */
function createMockSessionManager() {
  let _state = 'passive';
  let _secondaryId = 'reverie-secondary-1234';
  let _tertiaryId = null;
  return {
    _setInternalState(state, tertiaryId) {
      _state = state;
      _tertiaryId = tertiaryId || null;
    },
    async upgrade() {
      _state = 'active';
      _tertiaryId = 'reverie-tertiary-5678';
      return { ok: true, value: { state: _state, secondary: _secondaryId, tertiary: _tertiaryId } };
    },
    async degrade() {
      _state = 'passive';
      _tertiaryId = null;
      return { ok: true, value: { state: _state } };
    },
    getState() {
      return { state: _state, secondary: _secondaryId, tertiary: _tertiaryId, config: {} };
    },
  };
}

/**
 * Creates a mock Conductor.
 */
function createMockConductor() {
  const healthResponses = {};
  return {
    healthResponses,
    getSessionHealth(sessionId) {
      if (healthResponses[sessionId] !== undefined) {
        return healthResponses[sessionId];
      }
      return { ok: true, value: { sessionId, alive: true, pid: 1234, uptime: 1000 } };
    },
  };
}

/**
 * Creates a mock Switchboard.
 */
function createMockSwitchboard() {
  const events = [];
  return {
    events,
    emit(name, data) {
      events.push({ name, data });
    },
    on() {},
    off() {},
  };
}

describe('Mode Manager', () => {
  let sessionManager, conductor, switchboard, config;

  beforeEach(() => {
    sessionManager = createMockSessionManager();
    conductor = createMockConductor();
    switchboard = createMockSwitchboard();
    config = {};
  });

  describe('OPERATIONAL_MODES', () => {
    it('has 4 entries: active, passive, rem, dormant', () => {
      const { OPERATIONAL_MODES } = require('../mode-manager.cjs');
      expect(Object.keys(OPERATIONAL_MODES)).toHaveLength(4);
      expect(OPERATIONAL_MODES.ACTIVE).toBe('active');
      expect(OPERATIONAL_MODES.PASSIVE).toBe('passive');
      expect(OPERATIONAL_MODES.REM).toBe('rem');
      expect(OPERATIONAL_MODES.DORMANT).toBe('dormant');
    });
  });

  describe('createModeManager', () => {
    it('returns instance with getMode, requestActive, requestPassive, checkHealth, getMetrics', () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      expect(typeof mgr.getMode).toBe('function');
      expect(typeof mgr.requestActive).toBe('function');
      expect(typeof mgr.requestPassive).toBe('function');
      expect(typeof mgr.checkHealth).toBe('function');
      expect(typeof mgr.getMetrics).toBe('function');
    });
  });

  describe('initial mode', () => {
    it('is passive', () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      expect(mgr.getMode()).toBe('passive');
    });
  });

  describe('requestActive()', () => {
    it('calls sessionManager.upgrade() and mode becomes active on success', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      const result = await mgr.requestActive();
      expect(result.ok).toBe(true);
      expect(mgr.getMode()).toBe('active');
    });

    it('when already active returns ok without calling upgrade again', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      let upgradeCalled = false;
      sessionManager.upgrade = async () => { upgradeCalled = true; return { ok: true, value: {} }; };
      const result = await mgr.requestActive();
      expect(result.ok).toBe(true);
      expect(result.value.changed).toBe(false);
      expect(upgradeCalled).toBe(false);
    });

    it('failure (upgrade returns err) keeps mode as passive', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      sessionManager.upgrade = async () => ({ ok: false, error: { code: 'SPAWN_FAILED', message: 'fail' } });
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      const result = await mgr.requestActive();
      expect(result.ok).toBe(false);
      expect(mgr.getMode()).toBe('passive');
    });
  });

  describe('requestPassive()', () => {
    it('calls sessionManager.degrade() and mode becomes passive', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      const result = await mgr.requestPassive();
      expect(result.ok).toBe(true);
      expect(mgr.getMode()).toBe('passive');
    });

    it('when already passive returns ok', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      const result = await mgr.requestPassive();
      expect(result.ok).toBe(true);
      expect(result.value.changed).toBe(false);
    });
  });

  describe('checkHealth()', () => {
    it('in active mode calls conductor.getSessionHealth for both Secondary and Tertiary', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      const checkedIds = [];
      conductor.getSessionHealth = (id) => {
        checkedIds.push(id);
        return { ok: true, value: { sessionId: id, alive: true, pid: 1234, uptime: 1000 } };
      };
      await mgr.checkHealth();
      // Should have checked both Secondary and Tertiary
      expect(checkedIds.length).toBe(2);
    });

    it('detects Tertiary failure and triggers automatic fallback to passive', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      const tertiaryState = sessionManager.getState();
      conductor.healthResponses[tertiaryState.tertiary] = {
        ok: true, value: { sessionId: tertiaryState.tertiary, alive: false, pid: 0, uptime: 0 },
      };
      await mgr.checkHealth();
      expect(mgr.getMode()).toBe('passive');
    });

    it('in passive mode only checks Secondary health', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      const checkedIds = [];
      conductor.getSessionHealth = (id) => {
        checkedIds.push(id);
        return { ok: true, value: { sessionId: id, alive: true, pid: 1234, uptime: 1000 } };
      };
      await mgr.checkHealth();
      expect(checkedIds.length).toBe(1);
      expect(checkedIds[0]).toContain('secondary');
    });

    it('Tertiary not alive triggers degrade with reason tertiary_health_failure', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      const tertiaryState = sessionManager.getState();
      conductor.healthResponses[tertiaryState.tertiary] = {
        ok: true, value: { sessionId: tertiaryState.tertiary, alive: false, pid: 0, uptime: 0 },
      };
      await mgr.checkHealth();
      // Should have emitted mode:changed with reason
      const modeChanged = switchboard.events.filter(e => e.name === 'mode:changed');
      const fallbackEvent = modeChanged.find(e => e.data.reason === 'tertiary_health_failure');
      expect(fallbackEvent).toBeDefined();
    });

    it('Secondary not alive in passive mode emits mode:critical event', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      const secondaryState = sessionManager.getState();
      conductor.healthResponses[secondaryState.secondary] = {
        ok: true, value: { sessionId: secondaryState.secondary, alive: false, pid: 0, uptime: 0 },
      };
      await mgr.checkHealth();
      const criticalEvents = switchboard.events.filter(e => e.name === 'mode:critical');
      expect(criticalEvents.length).toBeGreaterThanOrEqual(1);
      expect(criticalEvents[0].data.reason).toBe('secondary_not_alive');
    });
  });

  describe('getMetrics()', () => {
    it('returns { mode, uptime_ms, mode_changes, last_health_check, active_sessions_count }', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      const metrics = mgr.getMetrics();
      expect(metrics.mode).toBe('passive');
      expect(typeof metrics.uptime_ms).toBe('number');
      expect(metrics.mode_changes).toBe(0);
      expect(metrics.last_health_check).toBe(null);
      expect(metrics.active_sessions_count).toBe(1); // passive = secondary only
    });

    it('active_sessions_count is 2 in active mode', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      expect(mgr.getMetrics().active_sessions_count).toBe(2);
    });
  });

  describe('mode change events', () => {
    it('emits mode:changed via switchboard with { from, to, reason }', async () => {
      const { createModeManager } = require('../mode-manager.cjs');
      const mgr = createModeManager({ sessionManager, conductor, switchboard, config });
      await mgr.requestActive();
      const modeChanged = switchboard.events.filter(e => e.name === 'mode:changed');
      expect(modeChanged.length).toBeGreaterThanOrEqual(1);
      expect(modeChanged[0].data.from).toBe('passive');
      expect(modeChanged[0].data.to).toBe('active');
      expect(modeChanged[0].data.reason).toBe('user_requested');
    });
  });
});

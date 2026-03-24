'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');

// ---------------------------------------------------------------------------
// Test helpers: mock factories for reverie.cjs wiring verification
// ---------------------------------------------------------------------------

/**
 * Creates a mock Switchboard that tracks both .emit() and .on() registrations.
 * Enhanced from hook-handlers.test.js to support listener replay.
 */
function createMockSwitchboard() {
  const _events = [];
  const _listeners = {};
  return {
    emit(name, payload) {
      _events.push({ name, payload });
      // Also invoke registered listeners
      if (_listeners[name]) {
        _listeners[name].forEach(function (fn) { fn(payload); });
      }
    },
    on(name, handler) {
      if (!_listeners[name]) _listeners[name] = [];
      _listeners[name].push(handler);
    },
    getEvents() { return _events; },
    getListeners() { return _listeners; },
  };
}

/**
 * Creates a mock Context Manager with tracking for setSecondaryActive and receiveSecondaryUpdate.
 */
function createMockContextManager() {
  const _calls = [];
  return {
    async init() { _calls.push('init'); return { ok: true, value: { source: 'warm-start' } }; },
    async compose() { _calls.push('compose'); return { ok: true, value: { phase: 1, path: '/tmp/fp.md' } }; },
    getInjection() { return 'mock face prompt'; },
    trackBytes(b, s) { return { changed: false, from: 1, to: 1 }; },
    getBudgetPhase() { return 1; },
    getMicroNudge() { return null; },
    async checkpoint() { return { ok: true, value: {} }; },
    async resetAfterCompaction() { return { ok: true, value: { phase: 1 } }; },
    getSessionSnapshot() { return {}; },
    async persistWarmStart() { return { ok: true, value: { path: '/tmp/fp.md' } }; },
    incrementTurn() {},
    async getNudge() { return null; },
    receiveSecondaryUpdate(facePrompt) {
      _calls.push({ receiveSecondaryUpdate: facePrompt });
      return { ok: true, value: { source: 'secondary', length: facePrompt.length } };
    },
    setSecondaryActive(active) {
      _calls.push({ setSecondaryActive: active });
    },
    getCalls() { return _calls; },
  };
}

/**
 * Creates a mock Wire topology that captures subscribe calls.
 */
function createMockWireTopology() {
  const _subscriptions = [];
  const _sends = [];

  return {
    subscribe(sessionId, subscriberIdentity, callback) {
      _subscriptions.push({ sessionId, subscriberIdentity, callback });
      return function unsubscribe() {};
    },
    async send(envelope) {
      _sends.push(envelope);
      return { ok: true, value: { sent: true } };
    },
    validateRoute(from, to) { return { ok: true, value: { from, to } }; },
    getMetrics() { return { messages_sent: 0, messages_blocked: 0, ack_timeouts: 0, topology_violations: 0 }; },
    _handleIncomingAck() {},
    waitForAck() { return Promise.resolve({ ok: true }); },
    getSubscriptions() { return _subscriptions; },
    getSends() { return _sends; },
  };
}

// ---------------------------------------------------------------------------
// Tests: Phase 10 — Secondary face prompt authority wiring in reverie.cjs
// ---------------------------------------------------------------------------

describe('Phase 10: Secondary face prompt authority wiring', () => {

  describe('Switchboard session:state-changed listener', () => {
    it('calls contextManager.setSecondaryActive(true) when state transitions to passive', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();

      // The wiring in reverie.cjs registers a listener on session:state-changed.
      // We simulate what register() does by checking that after register() runs,
      // emitting session:state-changed { to: 'passive' } calls setSecondaryActive(true).

      // We need to import and call register() with a mock facade.
      const { register } = require('../reverie.cjs');

      const facade = createMockFacade({ switchboard, contextManager });
      register(facade);

      // Simulate session state change to passive
      switchboard.emit('session:state-changed', { from: 'starting', to: 'passive' });

      const calls = contextManager.getCalls();
      const setActiveCalls = calls.filter(function (c) {
        return c && typeof c === 'object' && 'setSecondaryActive' in c;
      });
      expect(setActiveCalls.length).toBeGreaterThanOrEqual(1);
      expect(setActiveCalls[setActiveCalls.length - 1].setSecondaryActive).toBe(true);
    });

    it('calls contextManager.setSecondaryActive(true) when state transitions to active', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager });
      register(facade);

      switchboard.emit('session:state-changed', { from: 'upgrading', to: 'active' });

      const calls = contextManager.getCalls();
      const setActiveCalls = calls.filter(function (c) {
        return c && typeof c === 'object' && 'setSecondaryActive' in c;
      });
      expect(setActiveCalls.length).toBeGreaterThanOrEqual(1);
      expect(setActiveCalls[setActiveCalls.length - 1].setSecondaryActive).toBe(true);
    });

    it('calls contextManager.setSecondaryActive(false) when state transitions to stopped', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager });
      register(facade);

      switchboard.emit('session:state-changed', { from: 'shutting_down', to: 'stopped' });

      const calls = contextManager.getCalls();
      const setActiveCalls = calls.filter(function (c) {
        return c && typeof c === 'object' && 'setSecondaryActive' in c;
      });
      expect(setActiveCalls.length).toBeGreaterThanOrEqual(1);
      expect(setActiveCalls[setActiveCalls.length - 1].setSecondaryActive).toBe(false);
    });

    it('does not call setSecondaryActive for other state transitions', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager });
      register(facade);

      switchboard.emit('session:state-changed', { from: 'uninitialized', to: 'starting' });

      const calls = contextManager.getCalls();
      const setActiveCalls = calls.filter(function (c) {
        return c && typeof c === 'object' && 'setSecondaryActive' in c;
      });
      expect(setActiveCalls.length).toBe(0);
    });
  });

  describe('Wire topology subscription for face prompt updates', () => {
    it('subscribes Primary to Wire for DIRECTIVE face_prompt from Secondary', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();
      const wireTopology = createMockWireTopology();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager, wireTopology });
      register(facade);

      // Verify subscription was registered for primary
      const subs = wireTopology.getSubscriptions();
      const primarySubs = subs.filter(function (s) {
        return s.subscriberIdentity === 'primary';
      });
      expect(primarySubs.length).toBeGreaterThanOrEqual(1);
    });

    it('routes DIRECTIVE face_prompt envelopes to contextManager.receiveSecondaryUpdate', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();
      const wireTopology = createMockWireTopology();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager, wireTopology });
      register(facade);

      // Get the registered subscription callback
      const subs = wireTopology.getSubscriptions();
      const primarySub = subs.find(function (s) { return s.subscriberIdentity === 'primary'; });
      expect(primarySub).toBeTruthy();

      // Simulate a DIRECTIVE face_prompt envelope from Secondary
      primarySub.callback({
        id: 'test-env-1',
        from: 'secondary',
        to: 'primary',
        type: 'directive',
        urgency: 'directive',
        payload: { role: 'face_prompt', content: 'Secondary composed prompt with referential framing' },
        timestamp: new Date().toISOString(),
      });

      const calls = contextManager.getCalls();
      const updateCalls = calls.filter(function (c) {
        return c && typeof c === 'object' && 'receiveSecondaryUpdate' in c;
      });
      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0].receiveSecondaryUpdate).toBe('Secondary composed prompt with referential framing');
    });

    it('does NOT route non-face_prompt DIRECTIVE envelopes to receiveSecondaryUpdate', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();
      const wireTopology = createMockWireTopology();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager, wireTopology });
      register(facade);

      const subs = wireTopology.getSubscriptions();
      const primarySub = subs.find(function (s) { return s.subscriberIdentity === 'primary'; });

      // Simulate a DIRECTIVE behavioral envelope (not face_prompt)
      primarySub.callback({
        id: 'test-env-2',
        from: 'secondary',
        to: 'primary',
        type: 'directive',
        urgency: 'directive',
        payload: { role: 'behavioral', content: 'Some behavioral directive' },
        timestamp: new Date().toISOString(),
      });

      const calls = contextManager.getCalls();
      const updateCalls = calls.filter(function (c) {
        return c && typeof c === 'object' && 'receiveSecondaryUpdate' in c;
      });
      expect(updateCalls.length).toBe(0);
    });
  });

  describe('Backward compatibility', () => {
    it('all existing registration works even with new wiring (null-guard)', () => {
      const switchboard = createMockSwitchboard();
      const contextManager = createMockContextManager();

      const { register } = require('../reverie.cjs');
      const facade = createMockFacade({ switchboard, contextManager });

      // Should not throw
      const result = register(facade);
      expect(result.status).toBe('registered');
      expect(result.name).toBe('reverie');
    });
  });
});

// ---------------------------------------------------------------------------
// Helper: creates a mock facade that simulates Circuit API for register()
// ---------------------------------------------------------------------------

function createMockFacade(overrides) {
  const opts = overrides || {};
  const switchboard = opts.switchboard || createMockSwitchboard();
  const contextManager = opts.contextManager || createMockContextManager();
  const wireTopology = opts.wireTopology || null;

  // Track what createContextManager would return
  let _contextManagerOverride = contextManager;

  // Mock services
  const services = {
    switchboard: switchboard,
    lathe: {
      async readFile() { return { ok: false, error: { code: 'FILE_NOT_FOUND' } }; },
      async writeFile(p, c) { return { ok: true, value: { path: p } }; },
    },
    magnet: {
      get() { return null; },
      set() {},
    },
    wire: {
      register() {},
      unregister() {},
      subscribe() { return function () {}; },
      async send() { return { ok: true }; },
      createEnvelope() { return { ok: true, value: {} }; },
    },
    assay: {
      search() { return { ok: true, value: [] }; },
    },
    conductor: {
      spawnSession() { return { ok: true, value: { sessionId: 'sec-1', pid: 123, proc: {} } }; },
      stopSession() { return { ok: true }; },
      getSessionHealth() { return { ok: true, value: { healthy: true } }; },
    },
    exciter: {
      registerHooks(name, handlers) {
        return { ok: true, value: Object.keys(handlers).length };
      },
    },
  };

  const providers = {
    journal: {
      read() { return { ok: false }; },
      write() { return { ok: true }; },
      list() { return { ok: true, value: [] }; },
    },
    lithograph: {
      setTranscriptPath() { return { ok: true }; },
    },
  };

  return {
    events: switchboard,
    getService(name) { return services[name]; },
    getProvider(name) { return providers[name]; },
  };
}

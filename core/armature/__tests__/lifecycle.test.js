'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { createContainer } = require('../container.cjs');
const { createLifecycle } = require('../lifecycle.cjs');
const { ok, err } = require('../../../lib/result.cjs');

/**
 * Helper: creates a mock service factory that records init/start/stop calls.
 * Returns { factory, calls } where calls is a shared array of events.
 */
function createMockService(name, deps = [], callLog = []) {
  function factory() {
    const contract = {
      init(options) {
        callLog.push({ service: name, action: 'init', options, ts: Date.now() });
        return ok(undefined);
      },
      start() {
        callLog.push({ service: name, action: 'start', ts: Date.now() });
        return ok(undefined);
      },
      stop() {
        callLog.push({ service: name, action: 'stop', ts: Date.now() });
        return ok(undefined);
      },
    };
    return ok(contract);
  }
  return { factory, calls: callLog };
}

/**
 * Helper: creates a mock async service (init returns a Promise).
 */
function createAsyncMockService(name, callLog = []) {
  function factory() {
    const contract = {
      async init(options) {
        callLog.push({ service: name, action: 'init-start', ts: Date.now() });
        await new Promise((resolve) => setTimeout(resolve, 10));
        callLog.push({ service: name, action: 'init-done', options, ts: Date.now() });
        return ok(undefined);
      },
      start() {
        callLog.push({ service: name, action: 'start', ts: Date.now() });
        return ok(undefined);
      },
      stop() {
        callLog.push({ service: name, action: 'stop', ts: Date.now() });
        return ok(undefined);
      },
    };
    return ok(contract);
  }
  return { factory, calls: callLog };
}

describe('createLifecycle', () => {
  let container;

  beforeEach(() => {
    container = createContainer();
  });

  it('returns a lifecycle object with register, boot, shutdown, getFacade, getStatus', () => {
    const lifecycle = createLifecycle(container);
    expect(typeof lifecycle.register).toBe('function');
    expect(typeof lifecycle.boot).toBe('function');
    expect(typeof lifecycle.shutdown).toBe('function');
    expect(typeof lifecycle.getFacade).toBe('function');
    expect(typeof lifecycle.getStatus).toBe('function');
  });

  it('starts in idle status', () => {
    const lifecycle = createLifecycle(container);
    expect(lifecycle.getStatus()).toBe('idle');
  });
});

describe('lifecycle.register', () => {
  let container;

  beforeEach(() => {
    container = createContainer();
  });

  it('accepts a callback that registers on the container', () => {
    const lifecycle = createLifecycle(container);
    const result = lifecycle.register((c) => {
      c.singleton('services.lathe', () => ok({ init() {} }));
    });
    expect(result.ok).toBe(true);
    expect(container.has('services.lathe')).toBe(true);
  });

  it('transitions status through registering to registered', () => {
    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    // After register completes, status should be past registering
    // (It may be 'registered' or similar -- we check it is not 'idle')
    const status = lifecycle.getStatus();
    expect(status).not.toBe('idle');
  });
});

describe('lifecycle.boot', () => {
  let container;

  beforeEach(() => {
    container = createContainer();
  });

  it('boots services in topological dependency order', async () => {
    const callLog = [];
    const { factory: aFactory } = createMockService('serviceA', [], callLog);
    const { factory: bFactory } = createMockService('serviceB', ['serviceA'], callLog);

    container.singleton('serviceA', aFactory);
    container.singleton('serviceB', bFactory, {
      deps: ['serviceA'],
      mapDeps: { serviceA: 'serviceA' },
    });

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    const result = await lifecycle.boot();

    expect(result.ok).toBe(true);

    // A should init before B
    const aInit = callLog.findIndex((e) => e.service === 'serviceA' && e.action === 'init');
    const bInit = callLog.findIndex((e) => e.service === 'serviceB' && e.action === 'init');
    expect(aInit).toBeLessThan(bInit);
  });

  it('init receives resolved deps via mapDeps as facades', async () => {
    const callLog = [];
    const { factory: aFactory } = createMockService('serviceA', [], callLog);
    const { factory: bFactory } = createMockService('serviceB', ['serviceA'], callLog);

    container.singleton('serviceA', aFactory);
    container.singleton('serviceB', bFactory, {
      deps: ['serviceA'],
      mapDeps: { serviceA: 'myDep' },
    });

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    // B's init should have received options.myDep (the facade for serviceA)
    const bInitCall = callLog.find((e) => e.service === 'serviceB' && e.action === 'init');
    expect(bInitCall).toBeDefined();
    expect(bInitCall.options).toBeDefined();
    expect(bInitCall.options.myDep).toBeDefined();
    // The facade should have meta.name = 'serviceA'
    expect(bInitCall.options.myDep.meta.name).toBe('serviceA');
  });

  it('init receives config values merged into options', async () => {
    const callLog = [];
    const { factory } = createMockService('serviceC', [], callLog);

    container.singleton('serviceC', factory, {
      config: { dbPath: '/tmp/test.db', timeout: 5000 },
    });

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    const initCall = callLog.find((e) => e.service === 'serviceC' && e.action === 'init');
    expect(initCall.options.dbPath).toBe('/tmp/test.db');
    expect(initCall.options.timeout).toBe(5000);
  });

  it('stores facades accessible via getFacade', async () => {
    const { factory } = createMockService('serviceA');
    container.singleton('serviceA', factory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    const facade = lifecycle.getFacade('serviceA');
    expect(facade).toBeDefined();
    expect(facade.meta.name).toBe('serviceA');
  });

  it('plugin boot failure does not crash core services', async () => {
    const callLog = [];
    const { factory: coreFactory } = createMockService('services.core', [], callLog);

    // Plugin factory that fails on init
    function failingPluginFactory() {
      return ok({
        init() {
          return err('PLUGIN_INIT_FAILED', 'Plugin crashed on init');
        },
        start() {},
        stop() {},
      });
    }

    container.singleton('services.core', coreFactory);
    container.singleton('plugins.bad-plugin', failingPluginFactory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    const result = await lifecycle.boot();

    // Boot should succeed (core service is running)
    expect(result.ok).toBe(true);
    // Core service should have been initialized
    const coreInit = callLog.find((e) => e.service === 'services.core' && e.action === 'init');
    expect(coreInit).toBeDefined();
  });

  it('returns Err when core service init fails', async () => {
    function failingCoreFactory() {
      return ok({
        init() {
          return err('CORE_INIT_FAILED', 'Core service failed');
        },
        start() {},
        stop() {},
      });
    }

    container.singleton('services.core', failingCoreFactory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    const result = await lifecycle.boot();

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('CORE_INIT_FAILED');
  });

  it('properly awaits async init', async () => {
    const callLog = [];
    const { factory: asyncFactory } = createAsyncMockService('asyncService', callLog);

    container.singleton('asyncService', asyncFactory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    // Both init-start and init-done should appear before start
    const initStart = callLog.findIndex((e) => e.service === 'asyncService' && e.action === 'init-start');
    const initDone = callLog.findIndex((e) => e.service === 'asyncService' && e.action === 'init-done');
    const start = callLog.findIndex((e) => e.service === 'asyncService' && e.action === 'start');
    expect(initStart).toBeLessThan(initDone);
    expect(initDone).toBeLessThan(start);
  });

  it('transitions status to running after boot', async () => {
    const { factory } = createMockService('serviceA');
    container.singleton('serviceA', factory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    expect(lifecycle.getStatus()).toBe('running');
  });

  it('returns Err when boot order has cycle', async () => {
    container.singleton('a', () => ok({ init() {}, start() {}, stop() {} }), {
      deps: ['b'],
    });
    container.singleton('b', () => ok({ init() {}, start() {}, stop() {} }), {
      deps: ['a'],
    });

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    const result = await lifecycle.boot();

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('CYCLE_DETECTED');
  });
});

describe('lifecycle.shutdown', () => {
  let container;

  beforeEach(() => {
    container = createContainer();
  });

  it('stops services in reverse topological order', async () => {
    const callLog = [];
    const { factory: aFactory } = createMockService('serviceA', [], callLog);
    const { factory: bFactory } = createMockService('serviceB', ['serviceA'], callLog);

    container.singleton('serviceA', aFactory);
    container.singleton('serviceB', bFactory, {
      deps: ['serviceA'],
      mapDeps: { serviceA: 'serviceA' },
    });

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    const shutdownResult = await lifecycle.shutdown();
    expect(shutdownResult.ok).toBe(true);

    // B should stop before A (reverse boot order)
    const bStop = callLog.findIndex((e) => e.service === 'serviceB' && e.action === 'stop');
    const aStop = callLog.findIndex((e) => e.service === 'serviceA' && e.action === 'stop');
    expect(bStop).toBeLessThan(aStop);
  });

  it('transitions status to stopped after shutdown', async () => {
    const { factory } = createMockService('serviceA');
    container.singleton('serviceA', factory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();
    await lifecycle.shutdown();

    expect(lifecycle.getStatus()).toBe('stopped');
  });

  it('handles services without stop method gracefully', async () => {
    function noStopFactory() {
      return ok({
        init() { return ok(undefined); },
        start() { return ok(undefined); },
        // No stop method
      });
    }

    container.singleton('noStopService', noStopFactory);

    const lifecycle = createLifecycle(container);
    lifecycle.register(() => {});
    await lifecycle.boot();

    const result = await lifecycle.shutdown();
    expect(result.ok).toBe(true);
  });
});

describe('lifecycle status transitions', () => {
  it('follows idle -> registering -> booting -> running -> shutting-down -> stopped', async () => {
    const container = createContainer();
    const { factory } = createMockService('serviceA');
    container.singleton('serviceA', factory);

    const lifecycle = createLifecycle(container);
    expect(lifecycle.getStatus()).toBe('idle');

    lifecycle.register(() => {});
    // After register, should be registered (not idle)
    expect(['registering', 'registered']).toContain(lifecycle.getStatus());

    await lifecycle.boot();
    expect(lifecycle.getStatus()).toBe('running');

    await lifecycle.shutdown();
    expect(lifecycle.getStatus()).toBe('stopped');
  });
});

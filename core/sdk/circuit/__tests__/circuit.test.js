'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { createCircuit, CIRCUIT_SHAPE } = require('../circuit.cjs');
const { ok, err, isOk, isErr } = require('../../../../lib/result.cjs');

describe('createCircuit', () => {
  let mockContainer;
  let mockLifecycle;
  let mockSwitchboard;
  let circuit;

  beforeEach(() => {
    mockSwitchboard = {
      emit: () => undefined,
      on: () => ({ ok: true, value: undefined }),
      off: () => ({ ok: true, value: undefined }),
      filter: () => ({ ok: true, value: undefined }),
    };

    const facades = new Map();
    facades.set('services.switchboard', mockSwitchboard);
    facades.set('services.lathe', { read: () => ok('data') });
    facades.set('providers.journal', { load: () => ok({}) });

    mockLifecycle = {
      getFacade: (name) => facades.get(name) || null,
    };

    mockContainer = {
      has: (name) => {
        return ['services.switchboard', 'services.lathe', 'providers.journal'].includes(name);
      },
    };

    const result = createCircuit({ lifecycle: mockLifecycle, container: mockContainer });
    expect(result.ok).toBe(true);
    circuit = result.value;
  });

  it('createCircuit returns ok with contract', () => {
    const result = createCircuit({ lifecycle: mockLifecycle, container: mockContainer });
    expect(result.ok).toBe(true);
    expect(typeof result.value.registerModule).toBe('function');
    expect(typeof result.value.shutdownModule).toBe('function');
    expect(typeof result.value.getService).toBe('function');
    expect(typeof result.value.getProvider).toBe('function');
    expect(typeof result.value.getModuleInfo).toBe('function');
    expect(typeof result.value.listModules).toBe('function');
  });

  it('registerModule with valid manifest calls registerFn', () => {
    let receivedApi = null;
    const manifest = { name: 'testmod', version: '1.0.0', main: 'index.cjs' };
    const result = circuit.registerModule(manifest, (api) => {
      receivedApi = api;
    });
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe('testmod');
    expect(receivedApi).not.toBeNull();
  });

  it('registerModule rejects manifest with missing name', () => {
    const result = circuit.registerModule({ version: '1.0.0', main: 'index.cjs' }, () => {});
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('registerModule rejects undeclared dependency', () => {
    const manifest = {
      name: 'badmod',
      version: '1.0.0',
      main: 'index.cjs',
      dependencies: { services: ['nonexistent'], providers: [] },
    };
    const result = circuit.registerModule(manifest, () => {});
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('MODULE_MISSING_DEPS');
  });

  it('getService returns facade for declared dependency', () => {
    const manifest = {
      name: 'svcmod',
      version: '1.0.0',
      main: 'index.cjs',
      dependencies: { services: ['lathe'], providers: [] },
    };
    circuit.registerModule(manifest, () => {});

    const result = circuit.getService('svcmod', 'lathe');
    expect(result.ok).toBe(true);
    expect(result.value).toBe(mockLifecycle.getFacade('services.lathe'));
  });

  it('getService returns error for undeclared dependency', () => {
    const manifest = { name: 'limited', version: '1.0.0', main: 'index.cjs' };
    circuit.registerModule(manifest, () => {});

    const result = circuit.getService('limited', 'lathe');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('UNDECLARED_DEPENDENCY');
  });

  it('getProvider returns facade for declared dependency', () => {
    const manifest = {
      name: 'provmod',
      version: '1.0.0',
      main: 'index.cjs',
      dependencies: { services: [], providers: ['journal'] },
    };
    circuit.registerModule(manifest, () => {});

    const result = circuit.getProvider('provmod', 'journal');
    expect(result.ok).toBe(true);
    expect(result.value).toBe(mockLifecycle.getFacade('providers.journal'));
  });

  it('getProvider returns error for undeclared dependency', () => {
    const manifest = { name: 'noprov', version: '1.0.0', main: 'index.cjs' };
    circuit.registerModule(manifest, () => {});

    const result = circuit.getProvider('noprov', 'journal');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('UNDECLARED_DEPENDENCY');
  });

  it('registerModule passes event proxy with correct methods', () => {
    let receivedApi = null;
    const manifest = { name: 'evtmod', version: '1.0.0', main: 'index.cjs' };
    circuit.registerModule(manifest, (api) => { receivedApi = api; });

    expect(typeof receivedApi.events.emit).toBe('function');
    expect(typeof receivedApi.events.on).toBe('function');
    expect(typeof receivedApi.events.filter).toBe('function');
    expect(typeof receivedApi.events.cleanup).toBe('function');
  });

  it('shutdownModule calls eventProxy cleanup', () => {
    let cleanupCalled = false;
    const manifest = { name: 'shutmod', version: '1.0.0', main: 'index.cjs' };
    circuit.registerModule(manifest, (api) => {
      // Subscribe to something so we can verify cleanup
      api.events.on('test', () => {});
    });

    const result = circuit.shutdownModule('shutmod');
    expect(result.ok).toBe(true);

    // Module should be removed
    const infoResult = circuit.getModuleInfo('shutmod');
    expect(infoResult.ok).toBe(false);
  });

  it('getModuleInfo returns manifest and subscription count', () => {
    const manifest = { name: 'infomod', version: '1.0.0', main: 'index.cjs' };
    circuit.registerModule(manifest, (api) => {
      api.events.on('a', () => {});
      api.events.on('b', () => {});
    });

    const result = circuit.getModuleInfo('infomod');
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe('infomod');
    expect(result.value.subscriptions).toBe(2);
    expect(result.value.manifest.name).toBe('infomod');
  });

  it('listModules returns registered module names', () => {
    circuit.registerModule({ name: 'mod1', version: '1.0.0', main: 'index.cjs' }, () => {});
    circuit.registerModule({ name: 'mod2', version: '1.0.0', main: 'index.cjs' }, () => {});

    const result = circuit.listModules();
    expect(result.ok).toBe(true);
    expect(result.value).toContain('mod1');
    expect(result.value).toContain('mod2');
  });

  it('re-exports lib essentials', () => {
    let receivedApi = null;
    circuit.registerModule({ name: 'libmod', version: '1.0.0', main: 'index.cjs' }, (api) => {
      receivedApi = api;
    });

    expect(typeof receivedApi.ok).toBe('function');
    expect(typeof receivedApi.err).toBe('function');
    expect(typeof receivedApi.isOk).toBe('function');
    expect(typeof receivedApi.isErr).toBe('function');
    expect(typeof receivedApi.validate).toBe('function');
    expect(typeof receivedApi.createContract).toBe('function');
  });

  it('registerCommand delegates to pulley when provided', () => {
    const pulleyCalls = [];
    const mockPulley = {
      registerCommand: (name, handler, meta) => { pulleyCalls.push({ name, handler, meta }); return ok(undefined); },
      registerMcpTool: () => ok(undefined),
    };

    const result = createCircuit({ lifecycle: mockLifecycle, container: mockContainer, pulley: mockPulley });
    const circuitWithPulley = result.value;

    let api = null;
    circuitWithPulley.registerModule({ name: 'cmdmod', version: '1.0.0', main: 'index.cjs' }, (a) => { api = a; });

    const handler = () => {};
    api.registerCommand('do-stuff', handler, { description: 'test' });
    expect(pulleyCalls.length).toBe(1);
    expect(pulleyCalls[0].name).toBe('cmdmod do-stuff');
  });

  it('registerMcpTool delegates to pulley when provided', () => {
    const pulleyCalls = [];
    const mockPulley = {
      registerCommand: () => ok(undefined),
      registerMcpTool: (name, handler, schema) => { pulleyCalls.push({ name, handler, schema }); return ok(undefined); },
    };

    const result = createCircuit({ lifecycle: mockLifecycle, container: mockContainer, pulley: mockPulley });
    const circuitWithPulley = result.value;

    let api = null;
    circuitWithPulley.registerModule({ name: 'mcpmod', version: '1.0.0', main: 'index.cjs' }, (a) => { api = a; });

    const handler = () => {};
    api.registerMcpTool('search', handler, { type: 'object' });
    expect(pulleyCalls.length).toBe(1);
    expect(pulleyCalls[0].name).toBe('search');
  });

  it('registerModule rejects duplicate module name', () => {
    circuit.registerModule({ name: 'dup', version: '1.0.0', main: 'index.cjs' }, () => {});
    const result = circuit.registerModule({ name: 'dup', version: '1.0.0', main: 'index.cjs' }, () => {});
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('MODULE_EXISTS');
  });
});

describe('CIRCUIT_SHAPE', () => {
  it('has required methods', () => {
    expect(CIRCUIT_SHAPE.required).toContain('registerModule');
    expect(CIRCUIT_SHAPE.required).toContain('shutdownModule');
    expect(CIRCUIT_SHAPE.required).toContain('getService');
    expect(CIRCUIT_SHAPE.required).toContain('getProvider');
    expect(CIRCUIT_SHAPE.required).toContain('getModuleInfo');
    expect(CIRCUIT_SHAPE.required).toContain('listModules');
  });
});

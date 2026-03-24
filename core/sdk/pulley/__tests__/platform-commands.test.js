'use strict';

const { describe, it, expect } = require('bun:test');
const { ok, err } = require('../../../../lib/result.cjs');

/**
 * Creates a mock Pulley that tracks command registrations.
 */
function createMockPulley() {
  const registered = new Map();
  return {
    registerCommand(name, handler, meta) {
      registered.set(name, { handler, meta });
      return ok(undefined);
    },
    _registered: registered,
  };
}

/**
 * Creates a mock lifecycle with getFacade and getStatus.
 */
function createMockLifecycle(overrides = {}) {
  const facades = overrides.facades || new Map();
  return {
    getFacade: (name) => facades.get(name) || null,
    getStatus: () => overrides.status || 'running',
  };
}

/**
 * Creates a mock container with getRegistry.
 */
function createMockContainer(entries = {}) {
  const registry = new Map();
  for (const [name, entry] of Object.entries(entries)) {
    registry.set(name, {
      deps: entry.deps || [],
      tags: entry.tags || [],
      aliases: entry.aliases || [],
    });
  }
  return {
    getRegistry: () => registry,
  };
}

/**
 * Creates a mock Relay service.
 */
function createMockRelay() {
  const calls = [];
  return {
    addPlugin: (url, name) => { calls.push({ method: 'addPlugin', url, name }); return Promise.resolve(ok({ name, url })); },
    addModule: (url, name) => { calls.push({ method: 'addModule', url, name }); return Promise.resolve(ok({ name, url })); },
    update: (src, dest) => { calls.push({ method: 'update', src, dest }); return Promise.resolve(ok({ hash: 'abc123' })); },
    _calls: calls,
  };
}

/**
 * Creates a mock Forge service.
 */
function createMockForge() {
  const calls = [];
  return {
    pull: (remote, branch) => { calls.push({ method: 'pull', remote, branch }); return ok('pulled'); },
    submoduleUpdate: () => { calls.push({ method: 'submoduleUpdate' }); return ok('submodules updated'); },
    _calls: calls,
  };
}

describe('registerPlatformCommands', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('registers 6 root commands with pulley', () => {
    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle(),
      container: createMockContainer(),
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    const result = registerPlatformCommands(pulley, context);
    expect(result.ok).toBe(true);
    expect(result.value.registered).toBe(6);
    expect(pulley._registered.has('status')).toBe(true);
    expect(pulley._registered.has('health')).toBe(true);
    expect(pulley._registered.has('version')).toBe(true);
    expect(pulley._registered.has('install')).toBe(true);
    expect(pulley._registered.has('update')).toBe(true);
    expect(pulley._registered.has('config')).toBe(true);
  });
});

describe('handleStatus', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('returns status with human, json, and raw fields', async () => {
    const pulley = createMockPulley();
    const container = createMockContainer({
      'services.switchboard': { deps: [] },
      'services.forge': { deps: [] },
      'providers.ledger': { deps: [] },
    });
    const context = {
      lifecycle: createMockLifecycle({ status: 'running' }),
      container,
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('status').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(result.value.human).toContain('running');
    expect(result.value.json.status).toBe('running');
    expect(result.value.json.services).toBe(2);
    expect(result.value.json.providers).toBe(1);
    expect(typeof result.value.raw).toBe('string');
  });
});

describe('handleHealth', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('returns health report with human, json, and raw fields', async () => {
    const facades = new Map();
    facades.set('services.switchboard', {
      healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
    });
    facades.set('services.forge', {
      healthCheck: () => ok({ healthy: true, name: 'forge' }),
    });

    const registry = {
      'services.switchboard': { deps: [] },
      'services.forge': { deps: [] },
    };

    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle({ facades, status: 'running' }),
      container: createMockContainer(registry),
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('health').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(result.value.human).toContain('Health Report');
    expect(result.value.json.overall).toBe('healthy');
    expect(Array.isArray(result.value.json.services)).toBe(true);
    expect(typeof result.value.raw).toBe('string');
  });

  it('includes dependency chain analysis when services are unhealthy', async () => {
    const facades = new Map();
    facades.set('services.switchboard', {
      healthCheck: () => ok({ healthy: false, name: 'switchboard' }),
    });
    facades.set('services.forge', {
      healthCheck: () => ok({ healthy: true, name: 'forge' }),
    });

    const registry = {
      'services.switchboard': { deps: [] },
      'services.forge': { deps: ['services.switchboard'] },
    };

    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle({ facades, status: 'running' }),
      container: createMockContainer(registry),
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('health').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(result.value.json.impacted.length).toBeGreaterThan(0);
    expect(result.value.human).toContain('Impacted');
  });
});

describe('handleVersion', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('returns version with human, json, and raw fields', async () => {
    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle(),
      container: createMockContainer(),
      config: { github: { owner: 'test-owner', repo: 'test-repo' } },
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('version').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(result.value.human).toContain('Dynamo v1.0.0');
    expect(result.value.json.version).toBe('1.0.0');
    expect(result.value.raw).toBe('1.0.0');
  });

  it('includes update availability when remote check succeeds', async () => {
    // This test verifies the structure; the actual remote call may fail in test env
    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle(),
      container: createMockContainer(),
      config: { github: { owner: 'test-owner', repo: 'test-repo' } },
      paths: { root: '/test' },
      packageVersion: '0.0.1',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('version').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(result.value.json).toHaveProperty('updateAvailable');
  });
});

describe('handleInstall', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('delegates to relay.addPlugin for plugin type', async () => {
    const relay = createMockRelay();
    const facades = new Map();
    facades.set('services.relay', relay);

    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle({ facades }),
      container: createMockContainer(),
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('install').handler;
    const result = await handler(['https://github.com/example/plugin.git', 'my-plugin'], { type: 'plugin' });

    expect(result.ok).toBe(true);
    expect(relay._calls[0].method).toBe('addPlugin');
    expect(relay._calls[0].url).toBe('https://github.com/example/plugin.git');
    expect(relay._calls[0].name).toBe('my-plugin');
  });

  it('delegates to relay.addModule for module type', async () => {
    const relay = createMockRelay();
    const facades = new Map();
    facades.set('services.relay', relay);

    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle({ facades }),
      container: createMockContainer(),
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('install').handler;
    const result = await handler(['https://github.com/example/module.git', 'my-module'], { type: 'module' });

    expect(result.ok).toBe(true);
    expect(relay._calls[0].method).toBe('addModule');
  });

  it('returns error when no URL provided', async () => {
    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle(),
      container: createMockContainer(),
      config: {},
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('install').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('MISSING_URL');
  });
});

describe('handleUpdate', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('calls relay.update with context.paths.root and context.paths.deploy', async () => {
    const relay = createMockRelay();
    const forge = createMockForge();
    const facades = new Map();
    facades.set('services.relay', relay);
    facades.set('services.forge', forge);

    // Add health-checkable facades for post-update health check
    facades.set('services.switchboard', {
      healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
    });

    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle({ facades }),
      container: createMockContainer({
        'services.switchboard': { deps: [] },
      }),
      config: {},
      paths: { root: '/test/root', deploy: '/test/deploy' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('update').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(relay._calls[0].method).toBe('update');
    expect(relay._calls[0].src).toBe('/test/root');
    expect(relay._calls[0].dest).toBe('/test/deploy');
  });

  it('calls forge.submoduleUpdate for submodule sync', async () => {
    const relay = createMockRelay();
    const forge = createMockForge();
    const facades = new Map();
    facades.set('services.relay', relay);
    facades.set('services.forge', forge);

    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle({ facades }),
      container: createMockContainer(),
      config: {},
      paths: { root: '/test/root' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('update').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(forge._calls.some(c => c.method === 'submoduleUpdate')).toBe(true);
  });
});

describe('handleConfig', () => {
  const { registerPlatformCommands } = require('../platform-commands.cjs');

  it('returns specific config key when provided', async () => {
    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle(),
      container: createMockContainer(),
      config: { github: { owner: 'my-org', repo: 'dynamo' } },
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('config').handler;
    const result = await handler(['github'], {});

    expect(result.ok).toBe(true);
    expect(result.value.json).toEqual({ owner: 'my-org', repo: 'dynamo' });
  });

  it('returns full config summary when no key provided', async () => {
    const pulley = createMockPulley();
    const context = {
      lifecycle: createMockLifecycle(),
      container: createMockContainer(),
      config: { github: { owner: 'my-org' }, platform: { name: 'dynamo' } },
      paths: { root: '/test' },
      packageVersion: '1.0.0',
    };

    registerPlatformCommands(pulley, context);
    const handler = pulley._registered.get('config').handler;
    const result = await handler([], {});

    expect(result.ok).toBe(true);
    expect(result.value.json).toHaveProperty('github');
    expect(result.value.json).toHaveProperty('platform');
  });
});

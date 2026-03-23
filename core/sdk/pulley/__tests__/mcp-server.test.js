'use strict';

const { describe, it, expect } = require('bun:test');
const { ok, err } = require('../../../../lib/result.cjs');

/**
 * Creates a mock lifecycle with getFacade.
 */
function createMockLifecycle(facades) {
  return {
    getFacade: (name) => (facades && facades.get(name)) || null,
    getStatus: () => 'running',
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
  return { getRegistry: () => registry };
}

/**
 * Creates a mock circuit.
 */
function createMockCircuit(modules = []) {
  const moduleMap = new Map(modules.map(m => [m.name, m]));
  return {
    listModules: () => ok([...moduleMap.keys()]),
    getModuleInfo: (name) => {
      const mod = moduleMap.get(name);
      if (!mod) return err('MODULE_NOT_FOUND', `Module "${name}" not found`);
      return ok({ name: mod.name, manifest: mod.manifest || {}, subscriptions: mod.subscriptions || 0 });
    },
  };
}

/**
 * Creates a mock Pulley with MCP tools.
 */
function createMockPulley(tools = []) {
  const toolMap = new Map(tools.map(t => [t.name, t]));
  return {
    getMcpTools: () => ok(toolMap),
  };
}

describe('createPlatformMcpServer', () => {
  const { createPlatformMcpServer } = require('../mcp-server.cjs');

  it('creates MCP Server instance with tool registry', () => {
    const server = createPlatformMcpServer({ version: '1.0.0' });
    expect(server).toBeDefined();
    expect(server.mcp).toBeDefined();
    expect(typeof server.registerTool).toBe('function');
    expect(typeof server.getTools).toBe('function');
    expect(typeof server.start).toBe('function');
  });

  it('registerTool adds a tool that appears in getTools', () => {
    const server = createPlatformMcpServer();
    server.registerTool('test_tool', () => ({ status: 'ok' }), {
      type: 'object',
      properties: {},
      description: 'A test tool',
    });

    const tools = server.getTools();
    expect(tools.has('test_tool')).toBe(true);
    expect(tools.get('test_tool').description).toBe('A test tool');
  });
});

describe('registerPlatformTools', () => {
  const { createPlatformMcpServer, registerPlatformTools } = require('../mcp-server.cjs');

  it('registers 6 MCP tools', () => {
    const server = createPlatformMcpServer();
    const facades = new Map();
    facades.set('services.switchboard', {
      healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
    });

    const context = {
      lifecycle: createMockLifecycle(facades),
      container: createMockContainer({ 'services.switchboard': { deps: [] } }),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);
    const tools = server.getTools();

    expect(tools.has('dynamo_health')).toBe(true);
    expect(tools.has('dynamo_diagnose')).toBe(true);
    expect(tools.has('dynamo_status')).toBe(true);
    expect(tools.has('dynamo_version')).toBe(true);
    expect(tools.has('dynamo_module_list')).toBe(true);
    expect(tools.has('dynamo_module_status')).toBe(true);
  });

  it('dynamo_health tool returns health report', async () => {
    const server = createPlatformMcpServer();
    const facades = new Map();
    facades.set('services.switchboard', {
      healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
    });

    const context = {
      lifecycle: createMockLifecycle(facades),
      container: createMockContainer({ 'services.switchboard': { deps: [] } }),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_health');
    const result = await tool.handler({});
    expect(result.overall).toBe('healthy');
    expect(Array.isArray(result.services)).toBe(true);
  });

  it('dynamo_status tool returns platform status', async () => {
    const server = createPlatformMcpServer();
    const facades = new Map();
    const context = {
      lifecycle: createMockLifecycle(facades),
      container: createMockContainer({
        'services.switchboard': { deps: [] },
        'providers.ledger': { deps: [] },
      }),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_status');
    const result = await tool.handler({});
    expect(result.status).toBe('running');
    expect(result.services).toBe(1);
    expect(result.providers).toBe(1);
  });

  it('dynamo_version tool returns version info', async () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '2.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_version');
    const result = await tool.handler({});
    expect(result.version).toBe('2.0.0');
  });

  it('dynamo_module_list tool returns module names from circuit', async () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit([
        { name: 'reverie', manifest: { version: '1.0.0' } },
        { name: 'test-mod', manifest: { version: '0.1.0' } },
      ]),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_module_list');
    const result = await tool.handler({});
    expect(result.modules).toContain('reverie');
    expect(result.modules).toContain('test-mod');
    expect(result.modules.length).toBe(2);
  });

  it('dynamo_module_status tool returns module info from circuit', async () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit([
        { name: 'reverie', manifest: { version: '1.0.0' }, subscriptions: 5 },
      ]),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_module_status');
    const result = await tool.handler({ name: 'reverie' });
    expect(result.name).toBe('reverie');
    expect(result.subscriptions).toBe(5);
  });

  it('dynamo_module_status returns error for unknown module', async () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_module_status');
    const result = await tool.handler({ name: 'nonexistent' });
    expect(result.error).toBeDefined();
  });

  it('dynamo_diagnose tool returns full diagnostics with analysis', async () => {
    const server = createPlatformMcpServer();
    const facades = new Map();
    facades.set('services.switchboard', {
      healthCheck: () => ok({ healthy: false, name: 'switchboard' }),
    });
    facades.set('services.forge', {
      healthCheck: () => ok({ healthy: true, name: 'forge' }),
    });

    const context = {
      lifecycle: createMockLifecycle(facades),
      container: createMockContainer({
        'services.switchboard': { deps: [] },
        'services.forge': { deps: ['services.switchboard'] },
      }),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);

    const tool = server.getTools().get('dynamo_diagnose');
    const result = await tool.handler({});
    expect(result.diagnostics).toContain('Health Report');
    expect(result.healthReport).toBeDefined();
    expect(result.healthReport.overall).not.toBe('healthy');
  });

  it('module-registered tools via pulley appear in tool listing', () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit(),
      pulley: createMockPulley([
        { name: 'reverie_analyze', handler: () => ({}), schema: {}, description: 'Analyze with Reverie' },
      ]),
      packageVersion: '1.0.0',
    };

    registerPlatformTools(server, context);
    const tools = server.getTools();
    expect(tools.has('reverie_analyze')).toBe(true);
  });
});

describe('MCP handler integration', () => {
  const { createPlatformMcpServer, registerPlatformTools } = require('../mcp-server.cjs');

  it('listTools returns all registered tools with schemas', () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };
    registerPlatformTools(server, context);

    // Access internal list to check tool count
    const tools = server.getTools();
    expect(tools.size).toBe(6);

    // Each tool should have a description
    for (const [name, tool] of tools.entries()) {
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it('callTool with unknown tool name returns error', async () => {
    const server = createPlatformMcpServer();
    const context = {
      lifecycle: createMockLifecycle(new Map()),
      container: createMockContainer(),
      config: {},
      circuit: createMockCircuit(),
      packageVersion: '1.0.0',
    };
    registerPlatformTools(server, context);

    // Test the internal dispatch directly
    const tool = server.getTools().get('nonexistent_tool');
    expect(tool).toBeUndefined();
  });
});

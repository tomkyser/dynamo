'use strict';

const { ok, err } = require('../../../lib/result.cjs');
const { Server } = require('@modelcontextprotocol/sdk/server');
const { aggregateHealth, analyzeDependencyChain, formatDiagnostics } = require('./health.cjs');

/**
 * Resolves the StdioServerTransport from the MCP SDK.
 * The SDK uses package.json exports with a wildcard pattern that Bun's
 * require() resolution does not always match. We resolve via absolute
 * path to the CJS dist as a reliable fallback.
 *
 * @returns {Function} StdioServerTransport constructor
 */
function _resolveStdioTransport() {
  try {
    const path = require('node:path');
    const sdkDir = require.resolve('@modelcontextprotocol/sdk/server');
    const baseDir = sdkDir.substring(0, sdkDir.lastIndexOf('dist') + 4);
    return require(path.join(baseDir, 'cjs', 'server', 'stdio.js')).StdioServerTransport;
  } catch (_e) {
    throw new Error('Failed to resolve StdioServerTransport from @modelcontextprotocol/sdk');
  }
}

/**
 * Resolves the CallToolRequestSchema and ListToolsRequestSchema from the MCP SDK types.
 *
 * @returns {{ CallToolRequestSchema: Object, ListToolsRequestSchema: Object }}
 */
function _resolveSchemas() {
  try {
    const path = require('node:path');
    const sdkDir = require.resolve('@modelcontextprotocol/sdk/server');
    const baseDir = sdkDir.substring(0, sdkDir.lastIndexOf('dist') + 4);
    const types = require(path.join(baseDir, 'cjs', 'types.js'));
    return {
      CallToolRequestSchema: types.CallToolRequestSchema,
      ListToolsRequestSchema: types.ListToolsRequestSchema,
    };
  } catch (_e) {
    throw new Error('Failed to resolve MCP SDK type schemas');
  }
}

/**
 * Creates a Pulley MCP server for platform operations.
 *
 * Separate from Wire's channel-server.cjs (per D-08). This server exposes
 * platform management tools (health, status, version, modules) that Claude
 * Code sessions invoke directly.
 *
 * Per D-09: v1 tool set for platform operations.
 * Per D-10: module tools registered via Circuit appear in tool listing.
 *
 * @param {Object} [options={}] - Server options
 * @param {string} [options.version='1.0.0'] - Server version string
 * @returns {{ mcp: Object, registerTool: Function, getTools: Function, start: Function }}
 */
function createPlatformMcpServer(options = {}) {
  const mcp = new Server(
    { name: 'dynamo-platform', version: options.version || '1.0.0' },
    { capabilities: { tools: {} } }
  );

  /** @type {Map<string, {handler: Function, schema: Object, description: string}>} */
  const _tools = new Map();

  /**
   * Registers a tool with the MCP server.
   *
   * @param {string} name - Tool name (convention: dynamo_{operation})
   * @param {Function} handler - Tool handler function (args) => result
   * @param {Object} [schema] - Tool input schema and metadata
   */
  function registerTool(name, handler, schema) {
    _tools.set(name, {
      handler,
      schema: schema || {},
      description: (schema && schema.description) || '',
    });
  }

  /**
   * Returns a defensive copy of the tools map.
   * @returns {Map<string, {handler: Function, schema: Object, description: string}>}
   */
  function getTools() {
    return new Map(_tools);
  }

  // Wire MCP request handlers for ListTools and CallTool
  const { ListToolsRequestSchema, CallToolRequestSchema } = _resolveSchemas();

  mcp.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [..._tools].map(([name, t]) => ({
        name,
        description: t.description,
        inputSchema: t.schema,
      })),
    };
  });

  mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const toolEntry = _tools.get(toolName);

    if (!toolEntry) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
        isError: true,
      };
    }

    try {
      const result = await toolEntry.handler(request.params.arguments || {});
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }],
        isError: true,
      };
    }
  });

  /**
   * Starts the MCP server with stdio transport.
   * @returns {Promise<void>}
   */
  async function start() {
    const StdioServerTransport = _resolveStdioTransport();
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
  }

  return { mcp, registerTool, getTools, start };
}

/**
 * Registers the 6 platform MCP tools on a Pulley MCP server instance.
 *
 * Tools registered:
 *   - dynamo_health:        Get platform health status
 *   - dynamo_diagnose:      Run full platform diagnostics with dependency analysis
 *   - dynamo_status:        Get platform status overview
 *   - dynamo_version:       Get Dynamo version information
 *   - dynamo_module_list:   List registered modules (via Circuit)
 *   - dynamo_module_status: Get module status (via Circuit)
 *
 * Also merges module-registered tools from Pulley's MCP tool registry.
 *
 * @param {{ registerTool: Function, getTools: Function }} mcpServerObj - Platform MCP server instance
 * @param {Object} context - Platform context
 * @param {Object} context.lifecycle - Lifecycle manager
 * @param {Object} context.container - IoC container
 * @param {Object} context.config - Platform config
 * @param {Object} [context.circuit] - Circuit module API (from Plan 01)
 * @param {Object} [context.pulley] - Pulley SDK for merging module-registered tools
 * @param {string} context.packageVersion - Current Dynamo version
 */
function registerPlatformTools(mcpServerObj, context) {
  const { lifecycle, container, config, circuit } = context;

  // 1. dynamo_health — Get platform health status
  mcpServerObj.registerTool('dynamo_health', async () => {
    const registry = container.getRegistry();
    const facadesMap = new Map();
    for (const name of registry.keys()) {
      const facade = lifecycle.getFacade(name);
      if (facade) {
        facadesMap.set(name, facade);
      }
    }
    return aggregateHealth(facadesMap, registry);
  }, {
    type: 'object',
    properties: {},
    description: 'Get platform health status',
  });

  // 2. dynamo_diagnose — Run full platform diagnostics
  mcpServerObj.registerTool('dynamo_diagnose', async () => {
    const registry = container.getRegistry();
    const facadesMap = new Map();
    for (const name of registry.keys()) {
      const facade = lifecycle.getFacade(name);
      if (facade) {
        facadesMap.set(name, facade);
      }
    }

    const healthReport = aggregateHealth(facadesMap, registry);

    // Find unhealthy service registry keys
    const unhealthy = [...facadesMap.keys()].filter(key => {
      const facade = facadesMap.get(key);
      if (typeof facade.healthCheck !== 'function') return false;
      try {
        const hc = facade.healthCheck();
        if (hc && hc.ok === true && hc.value) return !hc.value.healthy;
        if (hc && hc.ok === false) return true;
      } catch (_e) {
        return true;
      }
      return false;
    });

    const analysis = unhealthy.length > 0
      ? analyzeDependencyChain(unhealthy, registry)
      : null;

    const diagnostics = formatDiagnostics(healthReport, analysis);

    return {
      diagnostics,
      healthReport,
      analysis,
    };
  }, {
    type: 'object',
    properties: {},
    description: 'Run full platform diagnostics',
  });

  // 3. dynamo_status — Get platform status overview
  mcpServerObj.registerTool('dynamo_status', async () => {
    const registry = container.getRegistry();
    const serviceNames = [...registry.keys()].filter(n => n.startsWith('services.'));
    const providerNames = [...registry.keys()].filter(n => n.startsWith('providers.'));

    return {
      status: lifecycle.getStatus(),
      services: serviceNames.length,
      providers: providerNames.length,
    };
  }, {
    type: 'object',
    properties: {},
    description: 'Get platform status overview',
  });

  // 4. dynamo_version — Get Dynamo version information
  mcpServerObj.registerTool('dynamo_version', async () => {
    const version = context.packageVersion || '0.0.0';
    return { version };
  }, {
    type: 'object',
    properties: {},
    description: 'Get Dynamo version information',
  });

  // 5. dynamo_module_list — List registered modules
  mcpServerObj.registerTool('dynamo_module_list', async () => {
    if (!circuit) {
      return { modules: [] };
    }
    const result = circuit.listModules();
    if (result.ok) {
      return { modules: result.value };
    }
    return { modules: [], error: result.error ? result.error.message : 'Unknown error' };
  }, {
    type: 'object',
    properties: {},
    description: 'List registered modules',
  });

  // 6. dynamo_module_status — Get module status
  mcpServerObj.registerTool('dynamo_module_status', async (args) => {
    if (!circuit) {
      return { error: 'Circuit not available' };
    }
    const name = args.name;
    if (!name) {
      return { error: 'Module name is required' };
    }
    const result = circuit.getModuleInfo(name);
    if (result.ok) {
      return result.value;
    }
    return { error: result.error ? result.error.message : 'Unknown error' };
  }, {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Module name' },
    },
    required: ['name'],
    description: 'Get module status',
  });

  // Merge module-registered tools from Pulley's MCP tool registry (D-10)
  if (context.pulley && typeof context.pulley.getMcpTools === 'function') {
    const toolsResult = context.pulley.getMcpTools();
    if (toolsResult.ok) {
      for (const [name, tool] of toolsResult.value.entries()) {
        mcpServerObj.registerTool(name, tool.handler, {
          ...tool.schema,
          description: tool.description || (tool.schema && tool.schema.description) || '',
        });
      }
    }
  }
}

module.exports = { createPlatformMcpServer, registerPlatformTools, _resolveStdioTransport, _resolveSchemas };

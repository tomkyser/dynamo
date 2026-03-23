'use strict';

const circuit = require('./circuit/circuit.cjs');
const moduleManifest = require('./circuit/module-manifest.cjs');
const eventProxy = require('./circuit/event-proxy.cjs');
const pulley = require('./pulley/pulley.cjs');
const output = require('./pulley/output.cjs');
const help = require('./pulley/help.cjs');
const health = require('./pulley/health.cjs');
const mcpServer = require('./pulley/mcp-server.cjs');
const platformCommands = require('./pulley/platform-commands.cjs');

module.exports = {
  // Circuit
  createCircuit: circuit.createCircuit,
  CIRCUIT_SHAPE: circuit.CIRCUIT_SHAPE,
  MODULE_MANIFEST_SCHEMA: moduleManifest.MODULE_MANIFEST_SCHEMA,
  validateModuleManifest: moduleManifest.validateModuleManifest,
  createEventProxy: eventProxy.createEventProxy,

  // Pulley
  createPulley: pulley.createPulley,
  PULLEY_SHAPE: pulley.PULLEY_SHAPE,
  formatOutput: output.formatOutput,
  generateHelp: help.generateHelp,
  generateCommandHelp: help.generateCommandHelp,

  // Health & Diagnostics
  aggregateHealth: health.aggregateHealth,
  analyzeDependencyChain: health.analyzeDependencyChain,
  formatDiagnostics: health.formatDiagnostics,

  // MCP Server
  createPlatformMcpServer: mcpServer.createPlatformMcpServer,
  registerPlatformTools: mcpServer.registerPlatformTools,

  // Platform Commands
  registerPlatformCommands: platformCommands.registerPlatformCommands,
};

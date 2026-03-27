'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');
const { formatOutput } = require('./output.cjs');
const { generateHelp, generateCommandHelp } = require('./help.cjs');
const { parseArgs } = require('node:util');

/**
 * Pulley contract shape -- defines the CLI framework API surface.
 *
 * Required methods:
 * - registerCommand: Register a CLI command with handler and metadata
 * - route: Route positional args to the matching command handler
 * - getCommands: Return all registered commands
 * - registerMcpTool: Register an MCP tool with handler and schema
 * - getMcpTools: Return all registered MCP tools
 *
 * Optional methods:
 * - generateHelp: Generate top-level help text
 */
const PULLEY_SHAPE = {
  required: ['registerCommand', 'route', 'getCommands', 'registerMcpTool', 'getMcpTools'],
  optional: ['generateHelp'],
};

/**
 * Creates a Pulley CLI framework instance.
 *
 * Pulley is the user-facing command surface for Dynamo. It handles:
 * - Command registration with subcommand support (e.g., 'reverie status')
 * - Longest-match routing for subcommands
 * - Three output modes (human, json, raw) via flags
 * - Auto-generated help text from command metadata
 * - MCP tool registration for programmatic access
 *
 * @param {Object} [options={}] - Factory options (reserved for future DI)
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen Pulley contract
 */
function createPulley(options = {}) {
  /** @type {Map<string, {handler: Function, description: string, flags: Object, output: string[]}>} */
  const _commands = new Map();

  /** @type {Map<string, {handler: Function, schema: Object, description: string}>} */
  const _mcpTools = new Map();

  /**
   * Registers a CLI command.
   *
   * @param {string} name - Command name (space-separated for subcommands, e.g., 'reverie status')
   * @param {Function} handler - Command handler function (positionals, flags) => Result
   * @param {Object} [meta={}] - Command metadata
   * @param {string} [meta.description] - Human-readable description
   * @param {Object} [meta.flags] - Flag definitions for help generation
   * @param {string[]} [meta.output] - Supported output modes
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function registerCommand(name, handler, meta = {}) {
    if (_commands.has(name)) {
      return err('COMMAND_EXISTS', `Command "${name}" already registered`);
    }
    _commands.set(name, {
      handler,
      description: meta.description || '',
      flags: meta.flags || {},
      output: meta.output || ['human', 'json', 'raw'],
    });
    return ok(undefined);
  }

  /**
   * Routes positional arguments to the matching command handler.
   *
   * Uses longest-match for subcommand resolution:
   * ['reverie', 'status'] matches 'reverie status' over 'reverie'.
   *
   * @param {string[]} positionals - Positional arguments (command + subcommand words)
   * @param {string[]} argv - Full argument array (for flag parsing)
   * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
   */
  async function route(positionals, argv) {
    // Parse flags from argv
    let values;
    try {
      const parsed = parseArgs({
        args: argv,
        options: {
          json: { type: 'boolean', short: 'j', default: false },
          raw: { type: 'boolean', default: false },
          help: { type: 'boolean', short: 'h', default: false },
          'dry-run': { type: 'boolean', default: false },
          confirm: { type: 'boolean', default: false },
          limit: { type: 'string' },
          'batch-size': { type: 'string' },
        },
        allowPositionals: true,
        strict: false,
      });
      values = parsed.values;
    } catch (_e) {
      values = { json: false, raw: false, help: false };
    }

    const outputMode = values.json ? 'json' : values.raw ? 'raw' : 'human';

    // Global help (no positionals)
    if (values.help && positionals.length === 0) {
      return ok({
        human: generateHelp(_commands),
        json: { commands: Object.fromEntries([..._commands].map(([k, v]) => [k, v.description])) },
        raw: generateHelp(_commands),
      });
    }

    // Find command via longest match
    let matchedName = null;
    let matchLength = 0;
    for (let i = positionals.length; i >= 1; i--) {
      const candidate = positionals.slice(0, i).join(' ');
      if (_commands.has(candidate)) {
        matchedName = candidate;
        matchLength = i;
        break;
      }
    }

    if (matchedName === null) {
      return err('COMMAND_NOT_FOUND', `Unknown command: ${positionals.join(' ')}`);
    }

    const commandMeta = _commands.get(matchedName);

    // Command-specific help
    if (values.help) {
      return ok({
        human: generateCommandHelp(matchedName, commandMeta),
        json: { command: matchedName, description: commandMeta.description, flags: commandMeta.flags },
        raw: generateCommandHelp(matchedName, commandMeta),
      });
    }

    // Extract remaining positionals after the matched command name
    const remainingPositionals = positionals.slice(matchLength);

    // Call the command handler
    const handlerResult = await commandMeta.handler(remainingPositionals, values);

    // If handler returns an error, pass it through
    if (handlerResult && handlerResult.ok === false) {
      return handlerResult;
    }

    // Format output from handler result
    const value = handlerResult && handlerResult.ok === true ? handlerResult.value : handlerResult;
    const formatted = formatOutput(value, outputMode);

    return ok({ formatted, outputMode });
  }

  /**
   * Returns all registered commands as a new Map (defensive copy).
   * @returns {import('../../../lib/result.cjs').Result<Map>}
   */
  function getCommands() {
    return ok(new Map(_commands));
  }

  /**
   * Registers an MCP tool for programmatic access.
   *
   * @param {string} name - Tool name (convention: dynamo_{operation})
   * @param {Function} handler - Tool handler function
   * @param {Object} [schema] - Tool input schema and metadata
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function registerMcpTool(name, handler, schema) {
    if (_mcpTools.has(name)) {
      return err('TOOL_EXISTS', `MCP tool "${name}" already registered`);
    }
    _mcpTools.set(name, {
      handler,
      schema: schema || {},
      description: (schema && schema.description) || '',
    });
    return ok(undefined);
  }

  /**
   * Returns all registered MCP tools as a new Map (defensive copy).
   * @returns {import('../../../lib/result.cjs').Result<Map>}
   */
  function getMcpTools() {
    return ok(new Map(_mcpTools));
  }

  return createContract('pulley', PULLEY_SHAPE, {
    registerCommand,
    route,
    getCommands,
    registerMcpTool,
    getMcpTools,
    generateHelp: () => generateHelp(_commands),
  });
}

module.exports = { createPulley, PULLEY_SHAPE };

#!/usr/bin/env node
// Dynamo > dynamo.cjs -- CLI router
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
// Bootstrap resolver: dynamo.cjs lives at repo root (and deployed root)
const resolve = require('./lib/resolve.cjs');
const { output, error, safeReadFile, isEnabled } = require(resolve('lib', 'core.cjs'));

// --- Flag/arg helpers for memory commands ---

/**
 * Extract a flag value from args array. Returns the value after the flag, or null.
 * Example: extractFlag(['--scope', 'global', '--format', 'json'], '--scope') -> 'global'
 */
function extractFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

/**
 * Get non-flag arguments (arguments that don't start with --)
 */
function getPositionalArgs(args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { i++; continue; }  // Skip flag + value
    result.push(args[i]);
  }
  return result;
}

/**
 * Format output based on --format flag
 */
function formatOutput(data, format, humanText) {
  if (format === 'json') {
    output(data);
  } else if (format === 'raw') {
    // Raw: dump the full content as-is
    const raw = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    process.stdout.write(raw + '\n');
  } else {
    // Default: human-readable to stderr
    process.stderr.write(humanText + '\n');
  }
}

/**
 * Toggle gate for memory commands.
 * Respects DYNAMO_CONFIG_PATH env var for test isolation.
 */
function requireEnabled() {
  const configPath = process.env.DYNAMO_CONFIG_PATH || undefined;
  if (!isEnabled(configPath)) {
    error('Dynamo is disabled. Use "dynamo toggle on" or set DYNAMO_DEV=1');
  }
}

// --- Help ---

function showHelp() {
  const help = `
Dynamo — Unified CLI for the Dynamo memory system

Usage: node dynamo.cjs <command> [options]

Commands:
  health-check   Run 8-stage health check (Docker, Neo4j, API, MCP, env, canary, Node.js, sessions)
  diagnose       Run all 13 diagnostic stages (deep system inspection)
  verify-memory  Run 6 pipeline checks (write, read, scope isolation, sessions)
  sync           Bidirectional sync between repo and live deployment
  start          Start the Graphiti Docker stack with health wait
  stop           Stop the Graphiti Docker stack (preserves data)
  install        Deploy CJS system to ~/.claude/dynamo/ and retire Python
  rollback       Restore previous version from backup
  check-update   Check for available Dynamo updates
  update         Update Dynamo to the latest version
  search         Search knowledge graph for facts and entities
  remember       Store a memory in the knowledge graph
  recall         Retrieve episodes from a scope
  edge           Inspect a specific entity relationship
  forget         Delete an episode or edge by UUID
  clear          Clear all data for a scope (destructive)
  toggle         Enable or disable Dynamo globally (on/off)
  status         Show Dynamo enabled/disabled state
  session        Session management (list, view, label, backfill)
  test           Run the Dynamo test suite
  version        Show Dynamo version
  config         Get or set configuration values (dot notation)
  help           Show this help message

Options:
  --pretty       Human-readable output (default: JSON for operational commands)
  --format       Output format: text (human), json (structured), raw (full source)
  --scope        Memory scope: global, project-<name>, session-<ts>, task-<desc>
  --verbose      Show detailed stage output
  --help         Show command-specific help

Examples:
  node dynamo.cjs health-check --pretty
  node dynamo.cjs sync repo-to-live --dry-run
  node dynamo.cjs session list --pretty
`.trim();
  process.stderr.write(help + '\n');
}

// --- Command-specific help ---

const COMMAND_HELP = {
  'health-check': 'Usage: dynamo health-check [--pretty] [--verbose]\n  Run 8-stage health check.',
  'diagnose':     'Usage: dynamo diagnose [--pretty] [--verbose]\n  Run all 13 diagnostic stages.',
  'verify-memory':'Usage: dynamo verify-memory [--pretty] [--verbose]\n  Run 6 pipeline checks.',
  'sync':         'Usage: dynamo sync <repo-to-live|live-to-repo|status> [--dry-run] [--pretty]\n  Bidirectional sync.',
  'start':        'Usage: dynamo start [--pretty]\n  Start Graphiti Docker stack.',
  'stop':         'Usage: dynamo stop [--pretty]\n  Stop Graphiti Docker stack.',
  'install':      'Usage: dynamo install [--pretty]\n  Deploy CJS system and retire Python.',
  'rollback':     'Usage: dynamo rollback [--pretty]\n  Restore previous version from backup.',
  'check-update': 'Usage: dynamo check-update [--format json]\n  Check for available Dynamo updates. Shows current vs latest version.',
  'update':       'Usage: dynamo update [--pretty]\n  Update Dynamo to the latest version. Creates backup, pulls code, runs migrations, verifies health. Auto-rolls back on failure.',
  'search':       'Usage: dynamo search <query> [--facts|--nodes] [--scope <scope>] [--format json|raw]\n  Search knowledge graph.',
  'remember':     'Usage: dynamo remember <content> [--scope <scope>] [--format json|raw]\n  Store a memory.',
  'recall':       'Usage: dynamo recall [--scope <scope>] [--format json|raw]\n  Retrieve episodes from a scope.',
  'edge':         'Usage: dynamo edge <uuid> [--format json|raw]\n  Inspect a specific entity relationship.',
  'forget':       'Usage: dynamo forget <uuid> [--edge] [--format json|raw]\n  Delete an episode or edge.',
  'clear':        'Usage: dynamo clear --scope <scope> --confirm [--format json|raw]\n  Clear all data for a scope (DESTRUCTIVE).',
  'toggle':       'Usage: dynamo toggle <on|off>\n  Enable or disable Dynamo globally.',
  'status':       'Usage: dynamo status [--pretty]\n  Show Dynamo enabled/disabled state.',
  'session':      'Usage: dynamo session <list|view|label|backfill> [args] [--pretty]\n  Session management.',
  'test':         'Usage: dynamo test\n  Run the Dynamo test suite.',
  'version':      'Usage: dynamo version\n  Show Dynamo version.',
  'config':       'Usage: dynamo config <get|set> <key> [value]\n  Get or set configuration values using dot notation.\n  Examples:\n    dynamo config get reverie.activation.sublimation_threshold\n    dynamo config set reverie.activation.sublimation_threshold 0.5\n    dynamo config set reverie.operational.subagent_daily_cap 30',
};

// --- Version ---

function showVersion() {
  const versionFile = path.join(__dirname, 'dynamo', 'VERSION');
  const version = safeReadFile(versionFile) || 'unknown';
  output({ command: 'version', version: version.trim() });
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const pretty = args.includes('--pretty');
  const restArgs = args.slice(1).filter(a => a !== '--pretty');

  // No command or help
  if (!command || command === 'help' || command === '--help') {
    showHelp();
    return;
  }

  // Command-specific help
  if (restArgs.includes('--help')) {
    const helpText = COMMAND_HELP[command];
    if (helpText) {
      process.stderr.write(helpText + '\n');
    } else {
      process.stderr.write('No help available for: ' + command + '\n');
    }
    return;
  }

  switch (command) {
    case 'health-check':
      await require(resolve('terminus', 'health-check.cjs')).run(restArgs, pretty);
      break;

    case 'diagnose':
      await require(resolve('terminus', 'diagnose.cjs')).run(restArgs, pretty);
      break;

    case 'verify-memory':
      await require(resolve('terminus', 'verify-memory.cjs')).run(restArgs, pretty);
      break;

    case 'sync':
      await require(resolve('switchboard', 'sync.cjs')).run(restArgs, pretty);
      break;

    case 'start':
      await require(resolve('terminus', 'stack.cjs')).start(restArgs, pretty);
      break;

    case 'stop':
      await require(resolve('terminus', 'stack.cjs')).stop(restArgs, pretty);
      break;

    case 'install':
      await require(resolve('switchboard', 'install.cjs')).run(restArgs, pretty);
      break;

    case 'rollback':
      await require(resolve('switchboard', 'install.cjs')).rollback(restArgs, pretty);
      break;

    case 'check-update': {
      const updateCheck = require(resolve('switchboard', 'update-check.cjs'));
      const result = await updateCheck.checkUpdate();
      const format = extractFlag(restArgs, '--format') || null;

      if (format === 'json') {
        output({ command: 'check-update', ...result });
      } else {
        // Human-readable inline status to stderr
        if (result.error) {
          process.stderr.write(result.error + '\n');
        } else if (result.update_available) {
          process.stderr.write('Dynamo ' + result.current + ' -> ' + result.latest + ' available. Run "dynamo update" to upgrade.\n');
        } else {
          process.stderr.write('Dynamo ' + result.current + ' is up to date.\n');
        }
        // Exit cleanly (no output() call -- already wrote to stderr)
        // For non-JSON mode, just exit 0 without JSON stdout
      }
      break;
    }

    case 'update':
      await require(resolve('switchboard', 'update.cjs')).update(restArgs, pretty);
      break;

    // --- Memory Commands ---

    case 'search': {
      requireEnabled();
      const query = getPositionalArgs(restArgs).join(' ');
      if (!query) { error('Usage: dynamo search <query> [--facts|--nodes] [--scope <scope>] [--format json|raw]'); return; }
      const scopeArg = extractFlag(restArgs, '--scope') || 'global';
      const format = extractFlag(restArgs, '--format') || 'text';
      const search = require(resolve('assay', 'search.cjs'));
      let result;
      if (restArgs.includes('--nodes')) {
        result = await search.searchNodes(query, scopeArg);
      } else if (restArgs.includes('--facts')) {
        result = await search.searchFacts(query, scopeArg);
      } else {
        result = await search.combinedSearch(query, scopeArg);
      }
      formatOutput(
        { command: 'search', query, scope: scopeArg, result },
        format,
        result || 'No results found.'
      );
      break;
    }

    case 'remember': {
      requireEnabled();
      const content = getPositionalArgs(restArgs).join(' ');
      if (!content) { error('Usage: dynamo remember <content> [--scope <scope>] [--format json|raw]'); return; }
      const scopeArg = extractFlag(restArgs, '--scope') || 'global';
      const format = extractFlag(restArgs, '--format') || 'text';
      const { addEpisode } = require(resolve('ledger', 'episodes.cjs'));
      const result = await addEpisode(content, scopeArg);
      formatOutput(
        { command: 'remember', content, scope: scopeArg, success: !!result },
        format,
        result ? 'Memory stored.' : 'Failed to store memory.'
      );
      break;
    }

    case 'recall': {
      requireEnabled();
      const scopeArg = extractFlag(restArgs, '--scope') || 'global';
      const format = extractFlag(restArgs, '--format') || 'text';
      const { MCPClient } = require(resolve('lib', 'core.cjs'));
      const { extractContent } = require(resolve('ledger', 'episodes.cjs'));
      const client = new MCPClient();
      const response = await client.callTool('get_episodes', { group_ids: [scopeArg] });
      const content = extractContent(response);
      formatOutput(
        { command: 'recall', scope: scopeArg, episodes: content },
        format,
        content || 'No episodes found.'
      );
      break;
    }

    case 'edge': {
      requireEnabled();
      const uuid = restArgs.find(a => !a.startsWith('--'));
      if (!uuid) { error('Usage: dynamo edge <uuid> [--format json|raw]'); return; }
      const format = extractFlag(restArgs, '--format') || 'text';
      const { MCPClient } = require(resolve('lib', 'core.cjs'));
      const { extractContent } = require(resolve('ledger', 'episodes.cjs'));
      const client = new MCPClient();
      const response = await client.callTool('get_entity_edge', { uuid });
      const content = extractContent(response);
      formatOutput(
        { command: 'edge', uuid, result: content },
        format,
        content || 'Edge not found.'
      );
      break;
    }

    case 'forget': {
      requireEnabled();
      const isEdge = restArgs.includes('--edge');
      const uuid = restArgs.find(a => !a.startsWith('--'));
      if (!uuid) { error('Usage: dynamo forget <uuid> [--edge] [--format json|raw]'); return; }
      const format = extractFlag(restArgs, '--format') || 'text';
      const { MCPClient } = require(resolve('lib', 'core.cjs'));
      const { extractContent } = require(resolve('ledger', 'episodes.cjs'));
      const client = new MCPClient();
      const toolName = isEdge ? 'delete_entity_edge' : 'delete_episode';
      const response = await client.callTool(toolName, { uuid });
      const content = extractContent(response);
      formatOutput(
        { command: 'forget', uuid, type: isEdge ? 'edge' : 'episode', result: content },
        format,
        `Deleted ${isEdge ? 'edge' : 'episode'}: ${uuid}`
      );
      break;
    }

    case 'clear': {
      requireEnabled();
      if (!restArgs.includes('--confirm')) {
        error('DESTRUCTIVE: This will clear all data for the specified scope.\nUsage: dynamo clear --scope <scope> --confirm');
        return;
      }
      const scopeArg = extractFlag(restArgs, '--scope');
      if (!scopeArg) { error('Usage: dynamo clear --scope <scope> --confirm'); return; }
      const format = extractFlag(restArgs, '--format') || 'text';
      const { MCPClient } = require(resolve('lib', 'core.cjs'));
      const { extractContent } = require(resolve('ledger', 'episodes.cjs'));
      const client = new MCPClient();
      const response = await client.callTool('clear_graph', { group_ids: [scopeArg] });
      const content = extractContent(response);
      formatOutput(
        { command: 'clear', scope: scopeArg, result: content },
        format,
        `Cleared scope: ${scopeArg}`
      );
      break;
    }

    case 'toggle': {
      const action = restArgs[0];
      if (action !== 'on' && action !== 'off') {
        error('Usage: dynamo toggle <on|off>');
        return;
      }
      // Use DYNAMO_CONFIG_PATH env var for testing, otherwise deployed config
      const toggleConfigPath = process.env.DYNAMO_CONFIG_PATH || path.join(os.homedir(), '.claude', 'dynamo', 'config.json');
      const cfg = JSON.parse(fs.readFileSync(toggleConfigPath, 'utf8'));
      cfg.enabled = action === 'on';
      fs.writeFileSync(toggleConfigPath, JSON.stringify(cfg, null, 2) + '\n');
      if (pretty) {
        process.stderr.write('Dynamo ' + (cfg.enabled ? 'enabled' : 'disabled') + '\n');
      } else {
        output({ command: 'toggle', enabled: cfg.enabled });
      }
      break;
    }

    case 'status': {
      const { isEnabled, loadConfig } = require(resolve('lib', 'core.cjs'));
      const cfg = loadConfig();
      const enabled = cfg.enabled !== false;
      const devMode = process.env.DYNAMO_DEV === '1';
      const effective = enabled || devMode;
      if (pretty) {
        process.stderr.write(`Dynamo: ${effective ? 'ACTIVE' : 'INACTIVE'}\n`);
        process.stderr.write(`  Global: ${enabled ? 'ON' : 'OFF'}\n`);
        process.stderr.write(`  Dev mode: ${devMode ? 'ON' : 'OFF'}\n`);
      } else {
        output({ command: 'status', enabled, dev_mode: devMode, effective });
      }
      break;
    }

    case 'session': {
      const sessions = require(resolve('assay', 'sessions.cjs'));
      const subCmd = restArgs[0];
      switch (subCmd) {
        case 'list':
          output({ command: 'session', subcommand: 'list', sessions: sessions.listSessions({ pretty }) });
          break;
        case 'view':
          output({ command: 'session', subcommand: 'view', session: sessions.viewSession(restArgs[1]) });
          break;
        case 'label':
          sessions.labelSession(restArgs[1], restArgs[2]);
          output({ command: 'session', subcommand: 'label', status: 'ok' });
          break;
        case 'backfill': {
          const { generateSessionName } = require(resolve('reverie', 'curation.cjs'));
          const count = await sessions.backfillSessions(
            async (entry) => generateSessionName(entry.project || 'unnamed session')
          );
          output({ command: 'session', subcommand: 'backfill', status: 'ok', backfilled: count });
        }
          break;
        default:
          error('Usage: dynamo session <list|view|label|backfill>');
      }
      break;
    }

    case 'config': {
      const configModule = require(resolve('lib', 'config.cjs'));
      const subCmd = restArgs[0];
      if (subCmd === 'get') {
        const key = restArgs[1];
        if (!key) { error('Usage: dynamo config get <key>'); return; }
        const value = configModule.get(key);
        if (value === undefined) {
          process.stderr.write('(not set)\n');
        } else {
          const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          process.stderr.write(display + '\n');
        }
      } else if (subCmd === 'set') {
        const key = restArgs[1];
        const val = restArgs[2];
        if (!key || val === undefined) { error('Usage: dynamo config set <key> <value>'); return; }
        try {
          const written = configModule.set(key, val);
          process.stderr.write(key + ' = ' + JSON.stringify(written) + '\n');
        } catch (e) {
          error(e.message);
        }
      } else {
        error('Usage: dynamo config <get|set> <key> [value]');
      }
      break;
    }

    case 'test': {
      const { execSync } = require('child_process');
      const testDir = path.join(__dirname, 'dynamo', 'tests');
      const cmd = 'node --test ' + path.join(testDir, '*.test.cjs') + ' ' + path.join(testDir, 'ledger', '*.test.cjs') + ' ' + path.join(testDir, 'switchboard', '*.test.cjs') + ' ' + path.join(testDir, 'reverie', '*.test.cjs');
      execSync(cmd, { stdio: 'inherit' });
      break;
    }

    case 'version':
      showVersion();
      break;

    default:
      error('Unknown command: ' + command + '. Run "dynamo help" for usage.');
  }
}

main().catch(e => { error(e.message); process.exitCode = 1; });

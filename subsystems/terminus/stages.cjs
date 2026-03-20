// Dynamo > Switchboard > stages.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const resolve = require('../../lib/resolve.cjs');
const { DYNAMO_DIR, loadConfig, loadEnv, safeReadFile, fetchWithTimeout, MCPClient } = require(resolve('lib', 'core.cjs'));

// --- Constants ---

const GRAPHITI_DIR = path.join(os.homedir(), '.claude', 'graphiti');
const COMPOSE_FILE = path.join(GRAPHITI_DIR, 'docker-compose.yml');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const STAGE_NAMES = [
  'Docker',
  'Neo4j',
  'Graphiti API',
  'MCP Session',
  'Env Vars',
  '.env File',
  'Hook Registrations',
  'Hook Files',
  'CJS Modules',
  'MCP Tool Call',
  'Search Round-trip',
  'Episode Write',
  'Canary Write/Read',
  'Node.js Version'
];

// Indices of the 7 health-check stages
const HEALTH_STAGES = [0, 1, 2, 3, 4, 12, 13];

// --- Helpers ---

function ok(detail, raw) {
  return { status: 'OK', detail, raw: raw || '' };
}

function fail(detail, raw) {
  return { status: 'FAIL', detail, raw: raw || '' };
}

function warn(detail, raw) {
  return { status: 'WARN', detail, raw: raw || '' };
}

function skip(detail, raw) {
  return { status: 'SKIP', detail, raw: raw || '' };
}

// --- Stage 1: Docker containers ---

async function stageDocker(options = {}) {
  const { verbose = false } = options;
  try {
    const output = execSync(
      'docker ps --filter name=graphiti --format "{{.Names}} {{.Status}}"',
      { timeout: 10000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!output) {
      return fail('No graphiti containers found', output);
    }

    const lines = output.split('\n');
    const neo4jUp = lines.some(l => l.includes('graphiti-neo4j') && l.includes('Up'));
    const mcpUp = lines.some(l => l.includes('graphiti-mcp') && l.includes('Up'));

    if (neo4jUp && mcpUp) {
      return ok('Both containers running', output);
    }

    const issues = [];
    if (!neo4jUp) issues.push('graphiti-neo4j not running');
    if (!mcpUp) issues.push('graphiti-mcp not running');
    return fail(issues.join('; '), output);
  } catch (e) {
    return fail(e.message);
  }
}

// --- Stage 2: Neo4j HTTP ---

async function stageNeo4j(options = {}) {
  const { verbose = false, neo4jUrl } = options;
  try {
    const url = neo4jUrl || 'http://localhost:7475';
    const resp = await fetchWithTimeout(url, {}, 5000);
    return ok('HTTP reachable on port 7475', `HTTP ${resp.status}`);
  } catch (e) {
    return fail(`Connection failed: ${e.message}`);
  }
}

// --- Stage 3: Graphiti API health ---

async function stageGraphitiApi(options = {}) {
  const { verbose = false, healthUrl } = options;
  try {
    const url = healthUrl || loadConfig().graphiti.health_url;
    const timeout = loadConfig().timeouts.health || 3000;
    const resp = await fetchWithTimeout(url, {}, timeout);
    if (resp.ok) {
      return ok('healthy', `HTTP ${resp.status}`);
    }
    return fail(`HTTP ${resp.status}`);
  } catch (e) {
    return fail(`Connection failed: ${e.message}`);
  }
}

// --- Stage 4: MCP Session ---

async function stageMcpSession(options = {}) {
  const { verbose = false, mcpClient = null, mcpUrl } = options;
  let client = mcpClient;
  let shouldClose = false;
  try {
    if (!client) {
      const clientOpts = mcpUrl ? { url: mcpUrl } : {};
      client = new MCPClient(clientOpts);
      shouldClose = true;
    }
    await client.initialize();
    const detail = client.sessionId
      ? `initialized (session: ${client.sessionId.slice(0, 8)}...)`
      : 'initialized (no session id)';
    return ok(detail);
  } catch (e) {
    return fail(`MCP session failed: ${e.message}`);
  }
}

// --- Stage 5: Environment variables ---

async function stageEnvVars(options = {}) {
  const { verbose = false } = options;
  try {
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasNeo4j = !!process.env.NEO4J_PASSWORD;

    if (!hasNeo4j) {
      return fail('NEO4J_PASSWORD missing' + (!hasOpenRouter ? ', OPENROUTER_API_KEY missing' : ''));
    }

    if (!hasOpenRouter) {
      return warn('OPENROUTER_API_KEY missing (non-fatal)');
    }

    return ok('OPENROUTER_API_KEY set, NEO4J_PASSWORD set');
  } catch (e) {
    return fail(e.message);
  }
}

// --- Stage 6: .env file ---

async function stageEnvFile(options = {}) {
  const { verbose = false, graphitiDir } = options;
  try {
    const dir = graphitiDir || GRAPHITI_DIR;
    const envPath = path.join(dir, '.env');

    if (!fs.existsSync(envPath)) {
      return fail(`.env file not found at ${envPath}`);
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const requiredKeys = ['OPENROUTER_API_KEY', 'NEO4J_PASSWORD', 'GRAPHITI_MCP_URL'];
    const missing = [];

    for (const key of requiredKeys) {
      if (!content.includes(`${key}=`)) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      return fail(`Missing keys in .env: ${missing.join(', ')}`);
    }

    return ok(`All required keys present in .env`);
  } catch (e) {
    return fail(e.message);
  }
}

// --- Stage 7: Hook registrations ---

async function stageHookRegistrations(options = {}) {
  const { verbose = false, settingsPath } = options;
  try {
    const sPath = settingsPath || SETTINGS_PATH;
    const content = safeReadFile(sPath);
    if (!content) {
      return fail(`settings.json not found at ${sPath}`);
    }

    const settings = JSON.parse(content);
    if (!settings.hooks) {
      return fail('No hooks section in settings.json');
    }

    const requiredEvents = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop'];
    const missing = [];

    for (const event of requiredEvents) {
      const entries = settings.hooks[event];
      if (!entries || !Array.isArray(entries)) {
        missing.push(event);
        continue;
      }

      // Check if at least one hook command contains dynamo-hooks.cjs
      const hasDynamo = entries.some(entry => {
        if (!entry.hooks || !Array.isArray(entry.hooks)) return false;
        return entry.hooks.some(h => h.command && h.command.includes('dynamo-hooks.cjs'));
      });

      if (!hasDynamo) {
        missing.push(event);
      }
    }

    if (missing.length > 0) {
      return fail(`${missing.length} events missing dynamo-hooks.cjs: ${missing.join(', ')}`);
    }

    return ok(`All 5 hook events registered with dynamo-hooks.cjs`);
  } catch (e) {
    return fail(e.message);
  }
}

// --- Stage 8: Hook files ---

async function stageHookFiles(options = {}) {
  const { verbose = false, settingsPath } = options;
  try {
    const sPath = settingsPath || SETTINGS_PATH;
    const content = safeReadFile(sPath);
    if (!content) {
      return fail(`settings.json not found at ${sPath}`);
    }

    const settings = JSON.parse(content);
    if (!settings.hooks) {
      return fail('No hooks section in settings.json');
    }

    const filePaths = new Set();

    // Extract file paths from all hook commands
    for (const event of Object.keys(settings.hooks)) {
      const entries = settings.hooks[event];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry.hooks || !Array.isArray(entry.hooks)) continue;
        for (const h of entry.hooks) {
          if (!h.command) continue;
          // Extract file path: handle both 'node path/to/file.cjs' and 'node "path/to/file.cjs"'
          const cmd = h.command;
          // Try quoted path first
          const quotedMatch = cmd.match(/node\s+"([^"]+)"/);
          if (quotedMatch) {
            // Expand $HOME
            const filePath = quotedMatch[1].replace(/\$HOME/g, os.homedir());
            filePaths.add(filePath);
            continue;
          }
          // Try unquoted path
          const parts = cmd.split(/\s+/);
          if (parts.length >= 2 && parts[0] === 'node') {
            const filePath = parts[1].replace(/\$HOME/g, os.homedir());
            filePaths.add(filePath);
          }
        }
      }
    }

    if (filePaths.size === 0) {
      return warn('No hook file paths found in settings.json');
    }

    const missing = [];
    for (const fp of filePaths) {
      if (!fs.existsSync(fp)) {
        missing.push(fp);
      }
    }

    if (missing.length > 0) {
      return fail(`${missing.length} hook files missing: ${missing.join(', ')}`);
    }

    return ok(`All ${filePaths.size} hook files exist on disk`);
  } catch (e) {
    return fail(e.message);
  }
}

// --- Stage 9: CJS modules ---

async function stageCjsModules(options = {}) {
  const { verbose = false, dynamoDir } = options;
  try {
    const dir = dynamoDir || DYNAMO_DIR;
    const libDir = path.join(dir, 'lib');

    if (!fs.existsSync(libDir)) {
      return fail(`lib directory not found at ${libDir}`);
    }

    // Recursively find all .cjs files
    const cjsFiles = [];
    function walk(dirPath) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.cjs')) {
          cjsFiles.push(fullPath);
        }
      }
    }
    walk(libDir);

    if (cjsFiles.length === 0) {
      return warn('No .cjs files found in lib directory');
    }

    const failed = [];
    for (const file of cjsFiles) {
      try {
        require(file);
      } catch (e) {
        failed.push(`${path.relative(libDir, file)}: ${e.message}`);
      }
    }

    if (failed.length > 0) {
      return fail(`${failed.length}/${cjsFiles.length} modules failed to load: ${failed.join('; ')}`);
    }

    return ok(`All ${cjsFiles.length} CJS modules loaded successfully`);
  } catch (e) {
    return fail(e.message);
  }
}

// --- Stage 10: MCP Tool Call ---

async function stageMcpToolCall(options = {}) {
  const { verbose = false, mcpClient = null, mcpUrl } = options;
  let client = mcpClient;
  let shouldClose = false;
  try {
    if (!client) {
      const clientOpts = mcpUrl ? { url: mcpUrl } : {};
      client = new MCPClient(clientOpts);
      shouldClose = true;
    }
    const result = await client.callTool('search_memory_facts', {
      query: 'dynamo health check',
      group_ids: ['global']
    });

    if (result && result.error) {
      return fail(`Tool call error: ${JSON.stringify(result.error)}`);
    }

    return ok('search_memory_facts call succeeded', JSON.stringify(result).slice(0, 500));
  } catch (e) {
    return fail(`MCP tool call failed: ${e.message}`);
  }
}

// --- Stage 11: Search Round-trip ---

async function stageSearchRoundtrip(options = {}) {
  const { verbose = false, mcpClient = null, mcpUrl } = options;
  let client = mcpClient;
  let shouldClose = false;
  try {
    if (!client) {
      const clientOpts = mcpUrl ? { url: mcpUrl } : {};
      client = new MCPClient(clientOpts);
      shouldClose = true;
    }
    const result = await client.callTool('search_memory_facts', {
      query: 'test',
      group_ids: ['global']
    });

    if (result && result.error && !result.result) {
      return fail(`Search error: ${JSON.stringify(result.error)}`);
    }

    // Verify response has content field
    const hasContent = result && result.result && result.result.content;
    if (hasContent) {
      return ok('Search returned result with content', JSON.stringify(result).slice(0, 500));
    }

    return ok('Search returned response', JSON.stringify(result).slice(0, 500));
  } catch (e) {
    return fail(`Search round-trip failed: ${e.message}`);
  }
}

// --- Stage 12: Episode Write ---

async function stageEpisodeWrite(options = {}) {
  const { verbose = false, mcpClient = null, mcpUrl } = options;
  let client = mcpClient;
  let shouldClose = false;
  try {
    if (!client) {
      const clientOpts = mcpUrl ? { url: mcpUrl } : {};
      client = new MCPClient(clientOpts);
      shouldClose = true;
    }
    const result = await client.callTool('add_memory', {
      data: 'Dynamo diagnostic canary ' + new Date().toISOString(),
      group_id: 'global'
    });

    if (result && result.error && !result.result) {
      return fail(`Episode write error: ${JSON.stringify(result.error)}`);
    }

    return ok('Episode write succeeded', JSON.stringify(result).slice(0, 500));
  } catch (e) {
    return fail(`Episode write failed: ${e.message}`);
  }
}

// --- Stage 13: Canary Write/Read ---

async function stageCanaryWriteRead(options = {}) {
  const { verbose = false, mcpClient = null, mcpUrl } = options;
  let client = mcpClient;
  let shouldClose = false;
  try {
    if (!client) {
      const clientOpts = mcpUrl ? { url: mcpUrl } : {};
      client = new MCPClient(clientOpts);
      shouldClose = true;
    }

    const canaryId = crypto.randomUUID();
    const canaryBody = `Dynamo canary ${canaryId} at ${new Date().toISOString()}`;

    // Write
    const writeResult = await client.callTool('add_memory', {
      data: canaryBody,
      group_id: 'global'
    });

    if (writeResult && writeResult.error && !writeResult.result) {
      return fail(`Canary write failed: ${JSON.stringify(writeResult.error)}`);
    }

    // Wait for Graphiti to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Read back
    const readResult = await client.callTool('search_memory_facts', {
      query: `canary ${canaryId}`,
      group_ids: ['global']
    });

    if (readResult && readResult.error && !readResult.result) {
      return warn(`Write succeeded but read failed: ${JSON.stringify(readResult.error)}`);
    }

    // Check if canary appears in results
    const readText = JSON.stringify(readResult);
    if (readText.includes(canaryId)) {
      return ok(`Write-then-read round-trip succeeded (canary: ${canaryId.slice(0, 8)}...)`);
    }

    return warn(`Write succeeded but canary not found in read results (eventual consistency, canary: ${canaryId.slice(0, 8)}...)`);
  } catch (e) {
    return fail(`Canary write/read failed: ${e.message}`);
  }
}

// --- Stage 14: Node.js Version ---

async function stageNodeVersion(options = {}) {
  const { verbose = false, minMajor = 22 } = options;
  try {
    const version = process.version; // e.g., 'v24.13.1'
    const major = parseInt(version.slice(1).split('.')[0], 10);
    if (isNaN(major)) {
      return fail('Could not parse Node.js version from: ' + version);
    }
    if (major >= minMajor) {
      return ok('Node.js ' + version + ' (meets minimum v' + minMajor + '.x)');
    }
    return fail(
      'Node.js ' + version + ' is below minimum v' + minMajor + '.x. ' +
      'Install Node.js ' + minMajor + ' or later: https://nodejs.org/'
    );
  } catch (e) {
    return fail('Version check error: ' + e.message);
  }
}

// --- Exports ---

module.exports = {
  stageDocker,
  stageNeo4j,
  stageGraphitiApi,
  stageMcpSession,
  stageEnvVars,
  stageEnvFile,
  stageHookRegistrations,
  stageHookFiles,
  stageCjsModules,
  stageMcpToolCall,
  stageSearchRoundtrip,
  stageEpisodeWrite,
  stageCanaryWriteRead,
  stageNodeVersion,
  STAGE_NAMES,
  HEALTH_STAGES
};

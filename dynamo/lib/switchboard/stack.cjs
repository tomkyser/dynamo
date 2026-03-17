// Dynamo > Switchboard > stack.cjs
'use strict';

const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { output, error, fetchWithTimeout } = require(path.join(__dirname, '..', 'core.cjs'));

// --- Constants ---

const GRAPHITI_DIR = path.join(os.homedir(), '.claude', 'graphiti');
const COMPOSE_FILE = path.join(GRAPHITI_DIR, 'docker-compose.yml');
const HEALTH_URL = 'http://localhost:8100/health';
const MAX_HEALTH_ATTEMPTS = 30;
const HEALTH_INTERVAL_MS = 2000;

// --- Helpers ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if Graphiti containers are already running.
 * Returns true if both graphiti-neo4j and graphiti-mcp are running.
 */
function isRunning() {
  try {
    const ps = execSync(`docker compose -f "${COMPOSE_FILE}" ps --status running`, {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return ps.includes('graphiti-neo4j') && ps.includes('graphiti-mcp');
  } catch (e) {
    return false;
  }
}

// --- Commands ---

/**
 * Start the Graphiti Docker stack.
 * Checks if already running, starts if not, waits for health check.
 */
async function start(args, pretty) {
  args = args || [];
  pretty = pretty || false;

  for (const arg of args) {
    if (arg === '--pretty') pretty = true;
  }

  // Check if already running
  if (isRunning()) {
    const result = {
      command: 'start',
      status: 'already_running',
      message: 'Graphiti stack is already running',
      endpoints: {
        mcp: 'http://localhost:8100/mcp',
        neo4j: 'http://localhost:7475'
      }
    };

    if (pretty) {
      process.stderr.write('Graphiti stack is already running.\n');
      process.stderr.write('  MCP: http://localhost:8100/mcp\n');
      process.stderr.write('  Neo4j: http://localhost:7475\n');
    }

    output(result);
    return;
  }

  // Start containers
  if (pretty) {
    process.stderr.write('Starting Graphiti stack...\n');
  }

  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d`, {
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    const msg = e.message || 'Failed to start Docker compose';
    const result = {
      command: 'start',
      status: 'error',
      message: msg
    };

    if (pretty) {
      process.stderr.write('Error starting stack: ' + msg + '\n');
    }

    output(result);
    return;
  }

  // Health wait loop
  if (pretty) {
    process.stderr.write('Waiting for health check...\n');
  }

  for (let i = 0; i < MAX_HEALTH_ATTEMPTS; i++) {
    try {
      const resp = await fetchWithTimeout(HEALTH_URL, {}, 3000);
      if (resp.ok) {
        const result = {
          command: 'start',
          status: 'started',
          message: 'Graphiti stack is ready',
          endpoints: {
            mcp: 'http://localhost:8100/mcp',
            neo4j: 'http://localhost:7475'
          }
        };

        if (pretty) {
          process.stderr.write('Graphiti stack is ready.\n');
          process.stderr.write('  MCP: http://localhost:8100/mcp\n');
          process.stderr.write('  Neo4j: http://localhost:7475\n');
        }

        output(result);
        return;
      }
    } catch (e) {
      // Not ready yet -- wait and retry
    }
    await sleep(HEALTH_INTERVAL_MS);
  }

  // Timeout
  const result = {
    command: 'start',
    status: 'timeout',
    message: 'Stack started but health check timed out after 60s. Check: docker compose -f "' + COMPOSE_FILE + '" logs graphiti-mcp'
  };

  if (pretty) {
    process.stderr.write('Warning: Health check timed out after 60s.\n');
    process.stderr.write('Check logs: docker compose -f "' + COMPOSE_FILE + '" logs graphiti-mcp\n');
  }

  output(result);
}

/**
 * Stop the Graphiti Docker stack. Data volumes are preserved.
 */
async function stop(args, pretty) {
  args = args || [];
  pretty = pretty || false;

  for (const arg of args) {
    if (arg === '--pretty') pretty = true;
  }

  if (pretty) {
    process.stderr.write('Stopping Graphiti stack...\n');
  }

  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" down`, {
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    const msg = e.message || 'Failed to stop Docker compose';
    const result = {
      command: 'stop',
      status: 'error',
      message: msg
    };

    if (pretty) {
      process.stderr.write('Error stopping stack: ' + msg + '\n');
    }

    output(result);
    return;
  }

  const result = {
    command: 'stop',
    status: 'stopped',
    message: 'Graphiti stack stopped. Data volumes preserved.',
    hint: 'To remove data: docker compose -f "' + COMPOSE_FILE + '" down -v'
  };

  if (pretty) {
    process.stderr.write('Graphiti stack stopped. Data volumes preserved.\n');
    process.stderr.write('To remove data: docker compose -f "' + COMPOSE_FILE + '" down -v\n');
  }

  output(result);
}

module.exports = { start, stop };

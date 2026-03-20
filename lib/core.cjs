// Dynamo > Lib > Core
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
// core.cjs lives in lib/ alongside resolve.cjs -- no conditional bootstrap needed
const resolve = require('./resolve.cjs');
const { execSync } = require('child_process');

const DYNAMO_DIR = path.join(os.homedir(), '.claude', 'dynamo');

const VERBOSE = process.env.GRAPHITI_VERBOSE === '1' || process.env.GRAPHITI_VERBOSE === 'true';

function debug(msg) {
  if (VERBOSE) {
    process.stderr.write('[dynamo] ' + msg + '\n');
  }
}

// --- Output helpers (GSD pattern) ---

function output(result, raw, rawValue) {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    const json = JSON.stringify(result, null, 2);
    if (json.length > 50000) {
      const tmpPath = path.join(os.tmpdir(), `dynamo-${Date.now()}.json`);
      fs.writeFileSync(tmpPath, json, 'utf-8');
      process.stdout.write('@file:' + tmpPath);
    } else {
      process.stdout.write(json);
    }
  }
  process.exit(0);
}

function error(message) {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    debug('safeReadFile failed for ' + filePath + ': ' + e.message);
    return null;
  }
}

// --- Config loading ---

function loadConfig() {
  const configPath = path.join(DYNAMO_DIR, 'config.json');
  const defaults = {
    version: '0.1.0',
    graphiti: { mcp_url: 'http://localhost:8100/mcp', health_url: 'http://localhost:8100/health' },
    curation: { model: 'anthropic/claude-haiku-4.5', api_url: 'https://openrouter.ai/api/v1/chat/completions' },
    timeouts: { health: 3000, mcp: 5000, curation: 10000, summarization: 15000 },
    logging: { max_size_bytes: 1048576, file: 'hook-errors.log' }
  };

  const content = safeReadFile(configPath);
  if (!content) return defaults;

  try {
    const parsed = JSON.parse(content);
    return {
      ...defaults,
      ...parsed,
      graphiti: { ...defaults.graphiti, ...parsed.graphiti },
      curation: { ...defaults.curation, ...parsed.curation },
      timeouts: { ...defaults.timeouts, ...parsed.timeouts },
      logging: { ...defaults.logging, ...parsed.logging }
    };
  } catch (e) {
    debug('loadConfig parse error: ' + e.message);
    return defaults;
  }
}

// --- .env loading (originally ported from Python graphiti-helper.py) ---

function loadEnv(envPath) {
  if (!envPath) {
    envPath = path.join(os.homedir(), '.claude', 'graphiti', '.env');
  }

  let content;
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch (e) {
    debug('loadEnv: .env not found at ' + envPath);
    return;
  }

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && value && !(key in process.env)) {
      process.env[key] = value;
      debug('loadEnv: set ' + key);
    }
  }
}

// --- Project detection (originally ported from Python graphiti-helper.py) ---

function detectProject(cwd) {
  cwd = cwd || process.cwd();

  // 1. git remote origin URL
  try {
    const url = execSync('git config --get remote.origin.url', {
      cwd,
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (url) {
      let name = url.replace(/\/$/, '').split('/').pop();
      name = name.replace(/\.git$/, '');
      debug('detectProject: git remote -> ' + name);
      return name;
    }
  } catch (e) {
    debug('detectProject: git remote failed: ' + e.message);
  }

  // 2. package.json name
  try {
    const pkgContent = fs.readFileSync(path.join(cwd, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgContent);
    if (pkg.name) {
      debug('detectProject: package.json -> ' + pkg.name);
      return pkg.name;
    }
  } catch (e) {
    debug('detectProject: package.json failed: ' + e.message);
  }

  // 3. composer.json name
  try {
    const composerContent = fs.readFileSync(path.join(cwd, 'composer.json'), 'utf8');
    const composer = JSON.parse(composerContent);
    if (composer.name) {
      const name = composer.name.split('/').pop();
      debug('detectProject: composer.json -> ' + name);
      return name;
    }
  } catch (e) {
    debug('detectProject: composer.json failed: ' + e.message);
  }

  // 4. pyproject.toml name
  try {
    const pyContent = fs.readFileSync(path.join(cwd, 'pyproject.toml'), 'utf8');
    for (const line of pyContent.split('\n')) {
      const match = line.match(/^name\s*=\s*"(.+)"$/);
      if (match) {
        debug('detectProject: pyproject.toml -> ' + match[1]);
        return match[1];
      }
    }
  } catch (e) {
    debug('detectProject: pyproject.toml failed: ' + e.message);
  }

  // 5. .ddev/config.yaml name
  try {
    const ddevContent = fs.readFileSync(path.join(cwd, '.ddev', 'config.yaml'), 'utf8');
    for (const line of ddevContent.split('\n')) {
      const match = line.match(/^name:\s*(.+)$/);
      if (match) {
        const name = match[1].trim().replace(/^["']|["']$/g, '');
        debug('detectProject: .ddev/config.yaml -> ' + name);
        return name;
      }
    }
  } catch (e) {
    debug('detectProject: .ddev/config.yaml failed: ' + e.message);
  }

  // 6. Fallback to directory name
  const fallback = path.basename(cwd);
  debug('detectProject: fallback -> ' + fallback);
  return fallback;
}

// --- HTTP utility (FND-06) ---

async function fetchWithTimeout(url, options, timeoutMs) {
  timeoutMs = timeoutMs || 5000;
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

// --- Error logging (FND-04) ---

function logError(hookName, message) {
  try {
    const logPath = path.join(DYNAMO_DIR, 'hook-errors.log');
    const line = '[' + new Date().toISOString() + '] [' + hookName + '] ' + message + '\n';

    // Check for rotation
    try {
      const stat = fs.statSync(logPath);
      if (stat.size >= 1048576) {
        const oldPath = logPath + '.old';
        fs.renameSync(logPath, oldPath);
        debug('logError: rotated log to .old');
      }
    } catch (e) {
      // File doesn't exist yet -- no rotation needed
    }

    fs.appendFileSync(logPath, line, 'utf8');
    debug('logError: wrote to ' + logPath);
  } catch (e) {
    // Logging must never throw
    debug('logError: failed to write: ' + e.message);
  }
}

// --- Health guard (FND-05) ---

function healthGuard(checkFn) {
  const flagPath = path.join(os.tmpdir(), 'dynamo-health-warned-' + process.ppid);

  // Check for cached result
  try {
    const cached = fs.readFileSync(flagPath, 'utf8');
    const result = JSON.parse(cached);
    debug('healthGuard: returning cached result');
    return { healthy: result.healthy, cached: true, detail: result.detail || '' };
  } catch (e) {
    // No cached result -- run the check
  }

  // Run the health check
  let healthy = false;
  let detail = '';
  try {
    const result = checkFn();
    healthy = !!result.healthy;
    detail = result.detail || '';
  } catch (e) {
    healthy = false;
    detail = 'Health check threw: ' + e.message;
    debug('healthGuard: checkFn threw: ' + e.message);
  }

  // Write result to flag file
  try {
    const data = { healthy, timestamp: new Date().toISOString(), detail };
    fs.writeFileSync(flagPath, JSON.stringify(data), 'utf8');
    debug('healthGuard: cached result at ' + flagPath);
  } catch (e) {
    debug('healthGuard: failed to write flag: ' + e.message);
  }

  return { healthy, cached: false, detail };
}

// --- Prompt loading ---

function loadPrompt(promptName) {
  const promptPath = path.join(DYNAMO_DIR, 'prompts', promptName + '.md');
  const content = safeReadFile(promptPath);
  if (!content) return null;

  // Split on first line that is exactly '---'
  const lines = content.split('\n');
  let splitIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      splitIdx = i;
      break;
    }
  }

  if (splitIdx === -1) {
    return { system: content.trim(), user: '' };
  }

  const system = lines.slice(0, splitIdx).join('\n').trim();
  const user = lines.slice(splitIdx + 1).join('\n').trim();
  return { system, user };
}

// --- Toggle mechanism (STAB-10) ---

/**
 * Check if Dynamo is enabled. Returns true if:
 * - config.enabled is true (or absent, default = enabled)
 * - OR process.env.DYNAMO_DEV === '1' (dev mode override)
 * @param {string} [configPath] - Override config path for testing
 * @returns {boolean}
 */
function isEnabled(configPath) {
  try {
    const cfgPath = configPath || path.join(DYNAMO_DIR, 'config.json');
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const config = JSON.parse(raw);
    if (config.enabled === false && process.env.DYNAMO_DEV !== '1') {
      return false;
    }
    return true;
  } catch (e) {
    // If config can't be read, default to enabled
    return true;
  }
}

// Export base utilities first (before loading ledger modules to avoid circular dependency)
module.exports = {
  DYNAMO_DIR,
  output,
  error,
  safeReadFile,
  loadConfig,
  loadEnv,
  detectProject,
  fetchWithTimeout,
  logError,
  healthGuard,
  loadPrompt,
  isEnabled
};

// Re-export MCPClient -- widely used across subsystems (7+ consumers)
// Loaded AFTER base exports to break circular dependency (terminus modules require core.cjs)
const { MCPClient } = require(resolve('terminus', 'mcp-client.cjs'));

Object.assign(module.exports, { MCPClient });

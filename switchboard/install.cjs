// Dynamo > Switchboard > install.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

// Resolve core.cjs: deployed layout (../core.cjs) or repo layout (../dynamo/core.cjs)
function resolveCore() {
  const deployed = path.join(__dirname, '..', 'core.cjs');
  if (fs.existsSync(deployed)) return deployed;
  return path.join(__dirname, '..', 'dynamo', 'core.cjs');
}

const { DYNAMO_DIR, output, error, loadEnv, safeReadFile } = require(resolveCore());
const { formatInstallReport } = require(path.join(__dirname, 'pretty.cjs'));

// --- Constants ---

const REPO_ROOT = path.join(__dirname, '..');               // repo root from switchboard/
const LIVE_DIR = path.join(os.homedir(), '.claude', 'dynamo');
const GRAPHITI_DIR = path.join(os.homedir(), '.claude', 'graphiti');
const LEGACY_DIR = path.join(os.homedir(), '.claude', 'graphiti-legacy');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const SETTINGS_BACKUP = SETTINGS_PATH + '.bak';  // ~/.claude/settings.json.bak
const HOOKS_TEMPLATE = path.join(REPO_ROOT, 'claude-config', 'settings-hooks.json');
const INSTALL_EXCLUDES = ['tests', '.last-sync', '.git', '.DS_Store', 'node_modules'];

// --- Helper: copyTree ---

/**
 * Recursively copy directory tree, skipping excluded names.
 * @param {string} src - Source directory
 * @param {string} dst - Destination directory
 * @param {string[]} excludes - Names to skip
 * @returns {number} Count of files copied
 */
function copyTree(src, dst, excludes) {
  fs.mkdirSync(dst, { recursive: true });
  let count = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (excludes.includes(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      count += copyTree(srcPath, dstPath, excludes);
    } else {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
      count++;
    }
  }

  return count;
}

// --- Helper: generateConfig ---

/**
 * Generate config.json from .env values and write to output directory.
 * @param {string} envPath - Path to .env file
 * @param {string} [outDir] - Output directory (defaults to LIVE_DIR)
 */
function generateConfig(envPath, outDir) {
  outDir = outDir || LIVE_DIR;

  // Load env vars from .env file (doesn't overwrite existing process.env)
  loadEnv(envPath);

  const config = {
    version: (safeReadFile(path.join(REPO_ROOT, 'dynamo', 'VERSION')) || '0.1.0').trim(),
    enabled: true,
    graphiti: {
      mcp_url: process.env.GRAPHITI_MCP_URL || 'http://localhost:8100/mcp',
      health_url: process.env.GRAPHITI_HEALTH_URL || 'http://localhost:8100/health'
    },
    curation: {
      model: 'anthropic/claude-haiku-4.5',
      api_url: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
    },
    timeouts: { health: 3000, mcp: 5000, curation: 10000, summarization: 15000 },
    logging: { max_size_bytes: 1048576, file: 'hook-errors.log' }
  };

  fs.mkdirSync(outDir, { recursive: true });
  const configPath = path.join(outDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  return config;
}

// --- Helper: mergeSettings ---

/**
 * Merge Dynamo hooks template into settings.json.
 * Backs up settings.json before modification. Preserves non-Dynamo hooks.
 * Uses atomic write (tmp + rename).
 * @param {string} settingsPath - Path to settings.json
 * @param {string} templatePath - Path to hooks template JSON
 */
function mergeSettings(settingsPath, templatePath) {
  // Read existing settings or start with empty object
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    // File doesn't exist or invalid -- start fresh
  }

  // Backup BEFORE any modification (only if settings.json exists)
  if (fs.existsSync(settingsPath)) {
    fs.copyFileSync(settingsPath, settingsPath + '.bak');
  }

  // Read template
  let template = {};
  try {
    template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  } catch (e) {
    // Template missing or invalid -- nothing to merge
    return;
  }

  // Merge env additively
  if (template.env) {
    settings.env = Object.assign(settings.env || {}, template.env);
  }

  // Merge hooks: for each event, keep non-Dynamo entries, then add all template entries
  if (template.hooks) {
    settings.hooks = settings.hooks || {};
    for (const event of Object.keys(template.hooks)) {
      const existingEntries = settings.hooks[event] || [];
      const templateEntries = template.hooks[event] || [];

      // Keep non-Dynamo hooks (entries whose commands don't contain 'dynamo-hooks.cjs')
      const nonDynamo = existingEntries.filter(entry => {
        if (!entry.hooks || !Array.isArray(entry.hooks)) return true;
        return !entry.hooks.some(h => h.command && h.command.includes('dynamo-hooks.cjs'));
      });

      // Add all template entries
      settings.hooks[event] = [...nonDynamo, ...templateEntries];
    }
  }

  // Merge permissions additively
  if (template.permissions) {
    settings.permissions = settings.permissions || {};
    settings.permissions.allow = settings.permissions.allow || [];
    settings.permissions.ask = settings.permissions.ask || [];

    // Add template allow items not already present
    for (const perm of (template.permissions.allow || [])) {
      if (!settings.permissions.allow.includes(perm)) {
        settings.permissions.allow.push(perm);
      }
    }

    // Add template ask items not already present
    for (const perm of (template.permissions.ask || [])) {
      if (!settings.permissions.ask.includes(perm)) {
        settings.permissions.ask.push(perm);
      }
    }
  }

  // Write atomically: write to .tmp, then rename
  const tmpPath = settingsPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPath, settingsPath);
}

// --- Helper: registerMcp ---

/**
 * Register Graphiti MCP server via `claude mcp add` if not already registered.
 * @returns {{ status: string, detail: string }}
 */
function registerMcp() {
  // Check if already registered
  try {
    const claudeJsonPath = path.join(os.homedir(), '.claude.json');
    const content = safeReadFile(claudeJsonPath);
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed.mcpServers && parsed.mcpServers.graphiti) {
        return { status: 'OK', detail: 'Already registered' };
      }
    }
  } catch (e) {
    // Continue to registration attempt
  }

  try {
    execSync('claude mcp add --transport http --scope user graphiti http://localhost:8100/mcp', {
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { status: 'OK', detail: 'Registered' };
  } catch (e) {
    return { status: 'WARN', detail: 'Registration failed: ' + e.message };
  }
}

// --- Helper: retirePython ---

/**
 * Move Python-specific files from graphiti/ to graphiti-legacy/.
 * Keeps docker-compose.yml, .env, .env.example, config.yaml, sessions.json, hook-errors.log.
 * @param {string} [graphitiDir] - Path to graphiti/ (defaults to GRAPHITI_DIR)
 * @param {string} [legacyDir] - Path to graphiti-legacy/ (defaults to LEGACY_DIR)
 * @returns {{ moved: string[], kept: string[] }}
 */
function retirePython(graphitiDir, legacyDir) {
  graphitiDir = graphitiDir || GRAPHITI_DIR;
  legacyDir = legacyDir || LEGACY_DIR;

  const KEEP = new Set([
    'docker-compose.yml', '.env', '.env.example', 'config.yaml',
    'sessions.json', 'hook-errors.log'
  ]);

  // Patterns to retire: .py files, .venv/, __pycache__/, requirements.txt, curation/, hooks/*.sh
  const RETIRE_PATTERNS = ['.py', '.venv', '__pycache__', 'requirements.txt', 'curation'];

  const moved = [];
  const kept = [];

  if (!fs.existsSync(graphitiDir)) {
    return { moved, kept };
  }

  fs.mkdirSync(legacyDir, { recursive: true });

  const entries = fs.readdirSync(graphitiDir, { withFileTypes: true });

  for (const entry of entries) {
    if (KEEP.has(entry.name)) {
      kept.push(entry.name);
      continue;
    }

    const shouldRetire = (
      entry.name.endsWith('.py') ||
      entry.name === '.venv' ||
      entry.name === '__pycache__' ||
      entry.name === 'requirements.txt' ||
      entry.name === 'curation'
    );

    // Also retire hooks/*.sh (shell hooks)
    const isHooksDir = entry.name === 'hooks' && entry.isDirectory();

    if (shouldRetire || isHooksDir) {
      const srcPath = path.join(graphitiDir, entry.name);
      const dstPath = path.join(legacyDir, entry.name);
      fs.renameSync(srcPath, dstPath);
      moved.push(entry.name);
    } else {
      kept.push(entry.name);
    }
  }

  return { moved, kept };
}

// --- Helper: restoreSettings ---

/**
 * Restore settings.json from backup.
 * @param {string} [settingsPath] - Path to settings.json (defaults to SETTINGS_PATH)
 */
function restoreSettings(settingsPath) {
  settingsPath = settingsPath || SETTINGS_PATH;
  const backupPath = settingsPath + '.bak';
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, settingsPath);
  }
}

// --- Helper: restorePython ---

/**
 * Move files from graphiti-legacy/ back to graphiti/.
 * @param {string} [graphitiDir] - Path to graphiti/ (defaults to GRAPHITI_DIR)
 * @param {string} [legacyDir] - Path to graphiti-legacy/ (defaults to LEGACY_DIR)
 */
function restorePython(graphitiDir, legacyDir) {
  graphitiDir = graphitiDir || GRAPHITI_DIR;
  legacyDir = legacyDir || LEGACY_DIR;

  if (!fs.existsSync(legacyDir)) return;

  const entries = fs.readdirSync(legacyDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(legacyDir, entry.name);
    const dstPath = path.join(graphitiDir, entry.name);
    fs.renameSync(srcPath, dstPath);
  }

  // Remove legacy dir if empty
  try {
    fs.rmdirSync(legacyDir);
  } catch (e) {
    // Not empty -- leave it
  }
}

// --- Main: run (install) ---

/**
 * Run the full installer: copy files, generate config, merge settings, register MCP, retire Python, health check.
 * @param {string[]} args - CLI args
 * @param {boolean} pretty - Pretty output flag
 */
async function run(args = [], pretty = false, _returnOnly = false) {
  const usePretty = pretty || args.includes('--pretty');
  const steps = [];

  // Step 1: Copy files (3 source dirs -> deployed layout)
  try {
    let fileCount = 0;
    // Copy dynamo/* -> LIVE_DIR/* (core.cjs, dynamo.cjs, hooks/, prompts/, config.json, VERSION)
    fileCount += copyTree(path.join(REPO_ROOT, 'dynamo'), LIVE_DIR, [...INSTALL_EXCLUDES, 'tests']);
    // Copy ledger/* -> LIVE_DIR/ledger/*
    fileCount += copyTree(path.join(REPO_ROOT, 'ledger'), path.join(LIVE_DIR, 'ledger'), INSTALL_EXCLUDES);
    // Copy switchboard/* -> LIVE_DIR/switchboard/*
    fileCount += copyTree(path.join(REPO_ROOT, 'switchboard'), path.join(LIVE_DIR, 'switchboard'), INSTALL_EXCLUDES);
    steps.push({ name: 'Copy files', status: 'OK', detail: fileCount + ' files copied to ' + LIVE_DIR });
  } catch (e) {
    steps.push({ name: 'Copy files', status: 'FAIL', detail: e.message });
  }

  // Step 2: Generate config
  try {
    generateConfig(path.join(GRAPHITI_DIR, '.env'));
    steps.push({ name: 'Generate config', status: 'OK', detail: 'config.json written' });
  } catch (e) {
    steps.push({ name: 'Generate config', status: 'WARN', detail: e.message });
  }

  // Step 3: Merge settings
  try {
    mergeSettings(SETTINGS_PATH, HOOKS_TEMPLATE);
    steps.push({ name: 'Merge settings', status: 'OK', detail: 'settings.json updated' });
  } catch (e) {
    steps.push({ name: 'Merge settings', status: 'FAIL', detail: e.message });
  }

  // Step 4: Register MCP
  try {
    const mcpResult = registerMcp();
    steps.push({ name: 'Register MCP', status: mcpResult.status, detail: mcpResult.detail });
  } catch (e) {
    steps.push({ name: 'Register MCP', status: 'WARN', detail: e.message });
  }

  // Step 5: Retire Python
  try {
    const retireResult = retirePython();
    steps.push({ name: 'Retire Python', status: 'OK', detail: retireResult.moved.length + ' items retired' });
  } catch (e) {
    steps.push({ name: 'Retire Python', status: 'WARN', detail: e.message });
  }

  // Step 6: Post-install health check
  let hcResult = null;
  try {
    const hc = require(path.join(__dirname, 'health-check.cjs'));
    hcResult = await hc.run([], false, true);
    const hcOk = hcResult && hcResult.summary && hcResult.summary.ok;
    steps.push({ name: 'Health check', status: hcOk ? 'OK' : 'WARN', detail: hcOk ? 'All checks passed' : 'Some checks failed' });
  } catch (e) {
    steps.push({ name: 'Health check', status: 'WARN', detail: e.message });
  }

  const completed = steps.filter(s => s.status === 'OK').length;
  const total = steps.length;

  const result = {
    command: 'install',
    steps,
    summary: { completed, total },
    health_check: hcResult
  };

  if (usePretty) {
    formatInstallReport(result);
  }

  if (_returnOnly) {
    return result;
  }

  output(result);
}

// --- Main: rollback ---

/**
 * Rollback: restore settings.json and Python files.
 * @param {string[]} args - CLI args
 * @param {boolean} pretty - Pretty output flag
 */
async function rollback(args = [], pretty = false) {
  const BACKUP_DIR = path.join(os.homedir(), '.claude', 'dynamo-backup');

  if (fs.existsSync(BACKUP_DIR)) {
    // Full snapshot rollback (from update system)
    try {
      const updateMod = require(path.join(__dirname, 'update.cjs'));
      const result = updateMod.restoreSnapshot({ backupDir: BACKUP_DIR, liveDir: LIVE_DIR });
      output({ command: 'rollback', type: 'full-snapshot', ...result });
    } catch (e) {
      // update.cjs not available (older install) -- fall through to legacy
      output({ command: 'rollback', type: 'error', error: 'Snapshot restore failed: ' + e.message });
    }
  } else if (fs.existsSync(SETTINGS_BACKUP)) {
    // Legacy settings-only rollback
    restoreSettings();
    output({ command: 'rollback', type: 'settings-only', status: 'ok', restored: ['settings.json'] });
  } else {
    output({ command: 'rollback', type: 'none', status: 'no-backup-found',
             detail: 'No dynamo-backup/ directory or settings.json.bak found' });
  }
}

// --- Exports ---

module.exports = {
  run,
  rollback,
  copyTree,
  generateConfig,
  mergeSettings,
  retirePython,
  restoreSettings,
  restorePython
};

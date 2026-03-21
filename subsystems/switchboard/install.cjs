// Dynamo > Switchboard > install.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const resolve = require('../../lib/resolve.cjs');
const { DYNAMO_DIR, output, error, loadEnv, safeReadFile } = require(resolve('lib', 'core.cjs'));
const { formatInstallReport } = require(resolve('lib', 'pretty.cjs'));

// --- Constants ---

const LIVE_DIR = path.join(os.homedir(), '.claude', 'dynamo');

const { resolveRepoRoot } = require('../../lib/resolve.cjs');
const REPO_ROOT = resolveRepoRoot();
const GRAPHITI_DIR = path.join(os.homedir(), '.claude', 'graphiti');
const LEGACY_DIR = path.join(os.homedir(), '.claude', 'graphiti-legacy');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const SETTINGS_BACKUP = SETTINGS_PATH + '.bak';  // ~/.claude/settings.json.bak
const HOOKS_TEMPLATE = path.join(REPO_ROOT, 'cc', 'settings-hooks.json');
const AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents');
const REPO_AGENTS_DIR = path.join(REPO_ROOT, 'cc', 'agents');
const INSTALL_EXCLUDES = ['tests', '.last-sync', '.git', '.DS_Store', 'node_modules'];

// Classic-mode artifacts to remove during install upgrade
const CLEANUP_FILES = [
  'cc/prompts/curation.md',
  'cc/prompts/precompact.md',
  'cc/prompts/prompt-context.md',
  'cc/prompts/session-name.md',
  'cc/prompts/session-summary.md',
  'subsystems/ledger/curation.cjs',
];

// --- Helper: cleanupClassicArtifacts ---

/**
 * Remove classic-mode artifacts from deployed directory.
 * Deletes dead prompt templates, dead Ledger handlers, dead hooks directory,
 * and strips curation/reverie.mode from existing config.json.
 * @param {object} [options={}] - Options for test isolation
 * @param {string} [options.liveDir] - Override live directory
 * @returns {number} Count of items cleaned
 */
function cleanupClassicArtifacts(options = {}) {
  const liveDir = options.liveDir || LIVE_DIR;
  let cleaned = 0;

  // Remove dead prompt templates and classic modules
  for (const relPath of CLEANUP_FILES) {
    const fullPath = path.join(liveDir, relPath);
    try {
      fs.unlinkSync(fullPath);
      cleaned++;
    } catch (e) {
      // File doesn't exist -- already clean
    }
  }

  // Remove dead Ledger hook handlers
  const ledgerHooksDir = path.join(liveDir, 'subsystems', 'ledger', 'hooks');
  try {
    const deadHandlers = ['session-start.cjs', 'prompt-augment.cjs', 'session-summary.cjs', 'preserve-knowledge.cjs', 'capture-change.cjs'];
    for (const f of deadHandlers) {
      try { fs.unlinkSync(path.join(ledgerHooksDir, f)); cleaned++; } catch (e) { /* already gone */ }
    }
    // Try removing the directory if now empty
    try { fs.rmdirSync(ledgerHooksDir); } catch (e) { /* not empty or doesn't exist */ }
  } catch (e) {
    // Directory doesn't exist
  }

  // Clean curation key from existing config.json if present
  const configPath = path.join(liveDir, 'config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    let configChanged = false;
    if (config.curation) {
      delete config.curation;
      configChanged = true;
    }
    if (config.reverie && config.reverie.mode) {
      delete config.reverie.mode;
      configChanged = true;
    }
    if (configChanged) {
      const tmpPath = configPath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
      fs.renameSync(tmpPath, configPath);
      cleaned++;
    }
  } catch (e) {
    // Config not found or not parseable -- skip
  }

  return cleaned;
}

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
    timeouts: { health: 3000, mcp: 5000 },
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

// --- Helper: deployAgents ---

/**
 * Deploy agent definitions from cc/agents/ to ~/.claude/agents/.
 * Claude Code discovers subagents by scanning ~/.claude/agents/ for .md files.
 * Only copies .md files (agent definitions). Skips non-.md files.
 * @param {object} [options={}] - Options for test isolation
 * @param {string} [options.repoAgentsDir] - Override repo agents source directory
 * @param {string} [options.agentsDir] - Override target agents directory
 * @returns {{ deployed: string[], skipped: string[] }}
 */
function deployAgents(options = {}) {
  const repoAgents = options.repoAgentsDir || REPO_AGENTS_DIR;
  const targetDir = options.agentsDir || AGENTS_DIR;
  const deployed = [];
  const skipped = [];

  if (!fs.existsSync(repoAgents)) {
    return { deployed, skipped };
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const entries = fs.readdirSync(repoAgents, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) {
      skipped.push(entry.name);
      continue;
    }
    const srcPath = path.join(repoAgents, entry.name);
    const dstPath = path.join(targetDir, entry.name);
    fs.copyFileSync(srcPath, dstPath);
    deployed.push(entry.name);
  }

  return { deployed, skipped };
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

// --- Helper: installShim ---

/**
 * Install the CLI shim to ~/.local/bin/dynamo and write .repo-path dotfile.
 * Copies bin/dynamo from repo (not symlink -- survives repo moves).
 * @param {object} [options={}] - Options for test isolation
 * @param {string} [options.repoRoot] - Override repo root
 * @param {string} [options.liveDir] - Override live directory
 * @param {string} [options.shimDir] - Override shim directory
 */
function installShim(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const liveDir = options.liveDir || LIVE_DIR;
  const shimDir = options.shimDir || path.join(os.homedir(), '.local', 'bin');

  // Write .repo-path dotfile to live directory (enables DYNAMO_DEV=1)
  fs.mkdirSync(liveDir, { recursive: true });
  const repoPathFile = path.join(liveDir, '.repo-path');
  fs.writeFileSync(repoPathFile, repoRoot + '\n', 'utf8');

  // Create shim directory if needed
  fs.mkdirSync(shimDir, { recursive: true });

  // Copy shim from repo (not symlink -- survives repo moves)
  const shimSrc = path.join(repoRoot, 'bin', 'dynamo');
  const shimPath = path.join(shimDir, 'dynamo');
  fs.copyFileSync(shimSrc, shimPath);
  fs.chmodSync(shimPath, 0o755);
}

// --- Main: run (install) ---

/**
 * Run the full installer: copy files, generate config, merge settings, deregister MCP, deploy CLAUDE.md, clean stale lib/, retire Python, health check.
 * @param {string[]} args - CLI args
 * @param {boolean} pretty - Pretty output flag
 */
async function run(args = [], pretty = false, _returnOnly = false) {
  const usePretty = pretty || args.includes('--pretty');
  const steps = [];

  // Step 0: Check dependencies
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    if (major >= 22) {
      steps.push({ name: 'Check dependencies', status: 'OK', detail: 'Node.js ' + version + ' (meets minimum v22.x)' });
    } else {
      steps.push({ name: 'Check dependencies', status: 'WARN', detail: 'Node.js ' + version + ' is below minimum v22.x. Install Node.js 22 or later: https://nodejs.org/' });
    }
  } catch (e) {
    steps.push({ name: 'Check dependencies', status: 'WARN', detail: 'Version check failed: ' + e.message });
  }

  // Step 1: Copy files (six-subsystem layout -> deployed layout)
  try {
    let fileCount = 0;
    // Copy root-level dynamo.cjs
    fs.mkdirSync(LIVE_DIR, { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, 'dynamo.cjs'), path.join(LIVE_DIR, 'dynamo.cjs'));
    fileCount++;
    // Copy dynamo/ meta (VERSION, migrations -- config.json excluded, generated separately)
    fileCount += copyTree(path.join(REPO_ROOT, 'dynamo'), path.join(LIVE_DIR, 'dynamo'), [...INSTALL_EXCLUDES, 'tests']);
    // Copy subsystems/* -> LIVE_DIR/subsystems/*
    fileCount += copyTree(path.join(REPO_ROOT, 'subsystems'), path.join(LIVE_DIR, 'subsystems'), INSTALL_EXCLUDES);
    // Copy cc/* -> LIVE_DIR/cc/*
    fileCount += copyTree(path.join(REPO_ROOT, 'cc'), path.join(LIVE_DIR, 'cc'), INSTALL_EXCLUDES);
    // Copy lib/* -> LIVE_DIR/lib/*
    fileCount += copyTree(path.join(REPO_ROOT, 'lib'), path.join(LIVE_DIR, 'lib'), INSTALL_EXCLUDES);
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

  // Step 4: Deregister MCP (defensive -- CLI-only architecture per Phase 12-04)
  try {
    execSync('claude mcp remove graphiti', {
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    steps.push({ name: 'Deregister MCP', status: 'OK', detail: 'Graphiti MCP removed (CLI-only architecture)' });
  } catch (e) {
    // Not registered -- that's the desired state
    steps.push({ name: 'Deregister MCP', status: 'OK', detail: 'Not registered (already CLI-only)' });
  }

  // Step 5: Deploy CLAUDE.md template
  try {
    const templatePath = path.join(REPO_ROOT, 'cc', 'CLAUDE.md.template');
    const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, claudeMdPath);
      steps.push({ name: 'Deploy CLAUDE.md', status: 'OK', detail: 'Template copied to ~/.claude/CLAUDE.md' });
    } else {
      steps.push({ name: 'Deploy CLAUDE.md', status: 'WARN', detail: 'Template not found at ' + templatePath });
    }
  } catch (e) {
    steps.push({ name: 'Deploy CLAUDE.md', status: 'WARN', detail: e.message });
  }

  // Step 6: Deploy agents to ~/.claude/agents/
  try {
    const agentResult = deployAgents();
    if (agentResult.deployed.length > 0) {
      steps.push({ name: 'Deploy agents', status: 'OK', detail: agentResult.deployed.length + ' agent(s) deployed to ~/.claude/agents/: ' + agentResult.deployed.join(', ') });
    } else {
      steps.push({ name: 'Deploy agents', status: 'OK', detail: 'No agent definitions found in cc/agents/' });
    }
  } catch (e) {
    steps.push({ name: 'Deploy agents', status: 'WARN', detail: e.message });
  }

  // Step 7: Verify lib/ shared substrate deployed (renumbered from original Step 6)
  try {
    const libDir = path.join(LIVE_DIR, 'lib');
    if (fs.existsSync(path.join(libDir, 'resolve.cjs'))) {
      steps.push({ name: 'Verify lib/', status: 'OK', detail: 'lib/resolve.cjs deployed' });
    } else {
      steps.push({ name: 'Verify lib/', status: 'WARN', detail: 'lib/resolve.cjs not found after copy' });
    }
  } catch (e) {
    steps.push({ name: 'Verify lib/', status: 'WARN', detail: e.message });
  }

  // Step 8: Retire Python
  try {
    const retireResult = retirePython();
    steps.push({ name: 'Retire Python', status: 'OK', detail: retireResult.moved.length + ' items retired' });
  } catch (e) {
    steps.push({ name: 'Retire Python', status: 'WARN', detail: e.message });
  }

  // Step 9: Migrate sessions from JSON to SQLite
  try {
    const sessionStore = require(resolve('terminus', 'session-store.cjs'));
    if (sessionStore.isAvailable()) {
      const jsonPath = path.join(GRAPHITI_DIR, 'sessions.json');
      const migratedPath = jsonPath + '.migrated';
      if (fs.existsSync(jsonPath) && !fs.existsSync(migratedPath)) {
        const result = sessionStore.migrateFromJson(jsonPath, sessionStore.DEFAULT_DB_PATH);
        if (result.status === 'ok') {
          // Rename original to .migrated (backup, not deletion)
          fs.renameSync(jsonPath, migratedPath);
          steps.push({
            name: 'Migrate sessions',
            status: 'OK',
            detail: result.migrated + ' sessions migrated to SQLite, ' + result.skipped + ' skipped. Original renamed to sessions.json.migrated'
          });
        } else {
          steps.push({
            name: 'Migrate sessions',
            status: 'WARN',
            detail: 'Migration returned status: ' + result.status + (result.error ? ' (' + result.error + ')' : '')
          });
        }
      } else if (fs.existsSync(migratedPath)) {
        steps.push({ name: 'Migrate sessions', status: 'OK', detail: 'Already migrated (sessions.json.migrated exists)' });
      } else {
        steps.push({ name: 'Migrate sessions', status: 'OK', detail: 'No sessions.json to migrate' });
      }
    } else {
      steps.push({ name: 'Migrate sessions', status: 'WARN', detail: 'node:sqlite unavailable -- using JSON fallback' });
    }
  } catch (e) {
    steps.push({ name: 'Migrate sessions', status: 'WARN', detail: 'Migration error: ' + e.message });
  }

  // Step 10: Clean up classic-mode artifacts
  try {
    const cleaned = cleanupClassicArtifacts();
    if (cleaned > 0) {
      steps.push({ name: 'Cleanup classics', status: 'OK', detail: 'Cleaned ' + cleaned + ' classic-mode artifacts' });
    } else {
      steps.push({ name: 'Cleanup classics', status: 'OK', detail: 'No classic artifacts to clean' });
    }
  } catch (e) {
    steps.push({ name: 'Cleanup classics', status: 'WARN', detail: e.message });
  }

  // Step 11: Post-install health check
  let hcResult = null;
  try {
    const hc = require(resolve('terminus', 'health-check.cjs'));
    hcResult = await hc.run([], false, true);
    const hcOk = hcResult && hcResult.summary && hcResult.summary.ok;
    steps.push({ name: 'Health check', status: hcOk ? 'OK' : 'WARN', detail: hcOk ? 'All checks passed' : 'Some checks failed' });
  } catch (e) {
    steps.push({ name: 'Health check', status: 'WARN', detail: e.message });
  }

  // Step 12: Install CLI shim
  try {
    installShim();
    steps.push({ name: 'CLI shim', status: 'OK', detail: 'Installed at ~/.local/bin/dynamo' });
  } catch (e) {
    steps.push({ name: 'CLI shim', status: 'WARN', detail: e.message });
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
  deployAgents,
  retirePython,
  restoreSettings,
  restorePython,
  installShim,
  cleanupClassicArtifacts,
  resolveRepoRoot,
  CLEANUP_FILES
};

// Dynamo > Switchboard > update.cjs
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

const { fetchWithTimeout, safeReadFile, output, error } = require(resolveCore());

// --- Constants ---

const LIVE_DIR = path.join(os.homedir(), '.claude', 'dynamo');
const BACKUP_DIR = path.join(os.homedir(), '.claude', 'dynamo-backup');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

// --- Snapshot: create ---

/**
 * Create a full snapshot of the live directory and settings.json.
 * Overwrites any existing backup.
 *
 * @param {object} [options={}] - Options for test isolation
 * @param {string} [options.liveDir] - Override live directory
 * @param {string} [options.backupDir] - Override backup directory
 * @param {string} [options.settingsPath] - Override settings.json path
 * @returns {{ backed_up: boolean, backup_dir: string }}
 */
function createSnapshot(options = {}) {
  const liveDir = options.liveDir || LIVE_DIR;
  const backupDir = options.backupDir || BACKUP_DIR;
  const settingsPath = options.settingsPath || SETTINGS_PATH;

  // Remove old backup
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }

  // Copy entire live dir
  const { copyTree } = require(path.join(__dirname, 'install.cjs'));
  copyTree(liveDir, backupDir, []);

  // Also backup settings.json
  if (fs.existsSync(settingsPath)) {
    fs.copyFileSync(settingsPath, path.join(backupDir, 'settings.json.snapshot'));
  }

  return { backed_up: true, backup_dir: backupDir };
}

// --- Snapshot: restore ---

/**
 * Restore live directory and settings.json from a snapshot backup.
 *
 * @param {object} [options={}] - Options for test isolation
 * @param {string} [options.liveDir] - Override live directory
 * @param {string} [options.backupDir] - Override backup directory
 * @param {string} [options.settingsPath] - Override settings.json path
 * @returns {{ restored: boolean, error?: string }}
 */
function restoreSnapshot(options = {}) {
  const liveDir = options.liveDir || LIVE_DIR;
  const backupDir = options.backupDir || BACKUP_DIR;
  const settingsPath = options.settingsPath || SETTINGS_PATH;

  if (!fs.existsSync(backupDir)) {
    return { restored: false, error: 'No backup found' };
  }

  // Remove current live dir and restore from backup
  if (fs.existsSync(liveDir)) {
    fs.rmSync(liveDir, { recursive: true, force: true });
  }

  const { copyTree } = require(path.join(__dirname, 'install.cjs'));
  copyTree(backupDir, liveDir, ['settings.json.snapshot']);

  // Restore settings.json
  const snapshotSettings = path.join(backupDir, 'settings.json.snapshot');
  if (fs.existsSync(snapshotSettings)) {
    fs.copyFileSync(snapshotSettings, settingsPath);
  }

  return { restored: true };
}

// --- Dev mode detection ---

/**
 * Detect whether running from a git repo clone with the known remote.
 *
 * @param {object} [options={}] - Options for test isolation
 * @param {string} [options.scriptDir] - Override directory to check for git remote
 * @returns {boolean}
 */
function isDevMode(options = {}) {
  const scriptDir = options.scriptDir || path.join(__dirname, '..');
  try {
    const remote = execSync('git config --get remote.origin.url', {
      cwd: scriptDir,
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return remote.includes('tomkyser/dynamo');
  } catch (e) {
    return false;
  }
}

// --- Tarball download and extract ---

/**
 * Download a tarball from a URL and extract to a destination directory.
 *
 * @param {string} tarballUrl - URL to download tarball from
 * @param {string} destDir - Directory to extract into
 * @param {object} [options={}] - Options
 * @param {number} [options.timeout] - Download timeout in ms (default 30000)
 * @returns {Promise<{ success: boolean, dir: string }>}
 */
async function downloadAndExtract(tarballUrl, destDir, options = {}) {
  const tmpFile = path.join(os.tmpdir(), 'dynamo-update-' + Date.now() + '.tar.gz');

  try {
    const resp = await fetchWithTimeout(tarballUrl, {
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'dynamo-updater'
      }
    }, options.timeout || 30000);

    if (!resp.ok) {
      throw new Error('Download failed: HTTP ' + resp.status);
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(tmpFile, buffer);

    fs.mkdirSync(destDir, { recursive: true });
    execSync('tar xzf "' + tmpFile + '" -C "' + destDir + '" --strip-components=1', {
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return { success: true, dir: destDir };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) { /* no-op */ }
  }
}

// --- Update orchestrator ---

/**
 * Run the full update pipeline: check -> snapshot -> pull/download -> migrate -> install -> verify.
 * Auto-rolls back on any failure after snapshot.
 *
 * @param {string[]} args - CLI args
 * @param {boolean} pretty - Pretty output flag
 * @param {object} [options={}] - Options for test isolation
 * @param {boolean} [_returnOnly=false] - If true, return result instead of calling output()
 * @returns {Promise<object>} Result object (only when _returnOnly is true)
 */
async function update(args = [], pretty = false, options = {}, _returnOnly = false) {
  const steps = [];

  // Step 1: Check for update
  const { checkUpdate } = require(path.join(__dirname, 'update-check.cjs'));
  const check = await checkUpdate({
    versionPath: options.versionPath,
    apiUrl: options.apiUrl,
    timeout: options.checkTimeout
  });

  if (check.error && !check.update_available) {
    const checkFailResult = { command: 'update', status: 'check-failed', error: check.error };
    if (_returnOnly) return checkFailResult;
    output(checkFailResult);
    return;
  }

  if (!check.update_available) {
    const upToDateResult = { command: 'update', status: 'up-to-date', version: check.current };
    if (_returnOnly) return upToDateResult;
    output(upToDateResult);
    return;
  }

  steps.push({ name: 'Check version', status: 'OK', detail: check.current + ' -> ' + check.latest });

  // Step 2: Create snapshot
  createSnapshot({
    liveDir: options.liveDir,
    backupDir: options.backupDir,
    settingsPath: options.settingsPath
  });
  steps.push({ name: 'Snapshot', status: 'OK' });

  try {
    // Step 3: Pull code
    if (isDevMode(options)) {
      const repoRoot = options.repoRoot || path.join(__dirname, '..');
      execSync('git pull origin master', {
        cwd: repoRoot,
        timeout: 30000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      steps.push({ name: 'Pull code', status: 'OK', mode: 'dev', detail: 'git pull' });
    } else {
      // User mode: download tarball
      const tmpDir = path.join(os.tmpdir(), 'dynamo-update-' + Date.now());
      await downloadAndExtract(check.tarball_url, tmpDir, options);
      options._extractedDir = tmpDir;
      steps.push({ name: 'Pull code', status: 'OK', mode: 'user', detail: 'tarball download' });
    }

    // Step 4: Run migrations
    const { runMigrations } = require(path.join(__dirname, 'migrate.cjs'));
    const migResult = await runMigrations(check.current, check.latest, {
      migrationsDir: options.migrationsDir,
      configPath: options.configPath,
      settingsPath: options.settingsPath
    });
    if (!migResult.success) {
      throw new Error('Migration failed at ' + migResult.failedAt.from + '-to-' + migResult.failedAt.to + ': ' + migResult.error);
    }
    steps.push({ name: 'Migrations', status: 'OK', detail: migResult.applied + ' applied' });

    // Step 5: Run install
    const install = require(path.join(__dirname, 'install.cjs'));
    const installResult = await install.run([], false, true);
    // Check if install had any FAIL steps
    if (installResult && installResult.steps) {
      const hasFail = installResult.steps.some(s => s.status === 'FAIL');
      if (hasFail) {
        throw new Error('Install failed');
      }
    }
    steps.push({ name: 'Install', status: 'OK' });

    // Step 6: Health check
    const healthCheck = require(path.join(__dirname, 'health-check.cjs'));
    const hcResult = await healthCheck.run([], false, true);
    if (!hcResult.summary.ok) {
      throw new Error('Health check failed after update');
    }
    steps.push({ name: 'Health check', status: 'OK' });

  } catch (e) {
    // Auto-rollback on any failure
    restoreSnapshot({
      liveDir: options.liveDir,
      backupDir: options.backupDir,
      settingsPath: options.settingsPath
    });
    steps.push({ name: 'Rollback', status: 'OK', detail: 'Restored previous version' });

    const rollbackResult = {
      command: 'update',
      status: 'rolled-back',
      error: e.message,
      from: check.current,
      to: check.latest,
      steps
    };
    if (_returnOnly) return rollbackResult;
    output(rollbackResult);
    return;
  }

  // Clean up user-mode tmp dir if exists
  if (options._extractedDir) {
    try { fs.rmSync(options._extractedDir, { recursive: true, force: true }); } catch (e) { /* no-op */ }
  }

  const result = {
    command: 'update',
    status: 'updated',
    from: check.current,
    to: check.latest,
    steps
  };

  if (_returnOnly) return result;
  output(result);
}

// --- Exports ---

module.exports = { update, createSnapshot, restoreSnapshot, isDevMode, downloadAndExtract };

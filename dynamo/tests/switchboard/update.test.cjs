// Dynamo > Tests > update.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const MOD_PATH = path.join(__dirname, '..', '..', '..', 'switchboard', 'update.cjs');

// --- Test helpers ---

function makeTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// --- Module existence ---

describe('update.cjs', () => {

  it('module exists and exports update, createSnapshot, restoreSnapshot, isDevMode', () => {
    assert.ok(fs.existsSync(MOD_PATH), 'update.cjs should exist');
    const mod = require(MOD_PATH);
    assert.equal(typeof mod.update, 'function', 'should export update');
    assert.equal(typeof mod.createSnapshot, 'function', 'should export createSnapshot');
    assert.equal(typeof mod.restoreSnapshot, 'function', 'should export restoreSnapshot');
    assert.equal(typeof mod.isDevMode, 'function', 'should export isDevMode');
    assert.equal(typeof mod.downloadAndExtract, 'function', 'should export downloadAndExtract');
  });

  it('has identity comment', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('Dynamo > Switchboard > update.cjs'), 'should have identity comment');
  });

  it('imports update-check, migrate, install, and health-check', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes("require(path.join(__dirname, 'update-check.cjs'))"), 'should import update-check');
    assert.ok(content.includes("require(path.join(__dirname, 'migrate.cjs'))"), 'should import migrate');
    assert.ok(content.includes("require(path.join(__dirname, 'install.cjs'))"), 'should import install');
    assert.ok(content.includes("require(path.join(__dirname, 'health-check.cjs'))"), 'should import health-check');
  });

  it('uses resolveCore pattern', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('function resolveCore()'), 'should have resolveCore function');
  });
});

// --- createSnapshot ---

describe('createSnapshot', () => {
  let liveDir, backupDir, settingsPath;

  beforeEach(() => {
    liveDir = makeTmpDir('snap-live');
    backupDir = path.join(makeTmpDir('snap-bak'), 'backup');
    settingsPath = path.join(makeTmpDir('snap-set'), 'settings.json');
  });

  afterEach(() => {
    rmrf(liveDir);
    rmrf(path.dirname(backupDir));
    rmrf(path.dirname(settingsPath));
  });

  it('copies live directory to backup', () => {
    // Create files in live dir
    fs.writeFileSync(path.join(liveDir, 'core.cjs'), 'module.exports = {};', 'utf8');
    fs.mkdirSync(path.join(liveDir, 'switchboard'), { recursive: true });
    fs.writeFileSync(path.join(liveDir, 'switchboard', 'install.cjs'), 'install', 'utf8');

    const { createSnapshot } = require(MOD_PATH);
    createSnapshot({ liveDir, backupDir, settingsPath });

    assert.ok(fs.existsSync(path.join(backupDir, 'core.cjs')), 'should copy core.cjs to backup');
    assert.ok(fs.existsSync(path.join(backupDir, 'switchboard', 'install.cjs')), 'should copy nested files');
    assert.equal(fs.readFileSync(path.join(backupDir, 'core.cjs'), 'utf8'), 'module.exports = {};');
  });

  it('copies settings.json to backup as settings.json.snapshot', () => {
    fs.writeFileSync(path.join(liveDir, 'dummy.cjs'), 'x', 'utf8');
    writeJSON(settingsPath, { hooks: { Stop: [] } });

    const { createSnapshot } = require(MOD_PATH);
    createSnapshot({ liveDir, backupDir, settingsPath });

    const snapshotPath = path.join(backupDir, 'settings.json.snapshot');
    assert.ok(fs.existsSync(snapshotPath), 'should create settings.json.snapshot in backup');
    const restored = readJSON(snapshotPath);
    assert.deepStrictEqual(restored.hooks, { Stop: [] });
  });

  it('overwrites existing backup', () => {
    // Create initial live and backup
    fs.writeFileSync(path.join(liveDir, 'v1.cjs'), 'v1', 'utf8');
    const { createSnapshot } = require(MOD_PATH);
    createSnapshot({ liveDir, backupDir, settingsPath });
    assert.ok(fs.existsSync(path.join(backupDir, 'v1.cjs')));

    // Modify live dir
    fs.unlinkSync(path.join(liveDir, 'v1.cjs'));
    fs.writeFileSync(path.join(liveDir, 'v2.cjs'), 'v2', 'utf8');

    // Snapshot again
    createSnapshot({ liveDir, backupDir, settingsPath });

    // Old file should be gone, new file should be present
    assert.ok(!fs.existsSync(path.join(backupDir, 'v1.cjs')), 'old backup should be removed');
    assert.ok(fs.existsSync(path.join(backupDir, 'v2.cjs')), 'new backup should exist');
  });

  it('returns { backed_up: true }', () => {
    fs.writeFileSync(path.join(liveDir, 'x.cjs'), 'x', 'utf8');
    const { createSnapshot } = require(MOD_PATH);
    const result = createSnapshot({ liveDir, backupDir, settingsPath });
    assert.equal(result.backed_up, true);
    assert.equal(result.backup_dir, backupDir);
  });
});

// --- restoreSnapshot ---

describe('restoreSnapshot', () => {
  let liveDir, backupDir, settingsPath;

  beforeEach(() => {
    liveDir = makeTmpDir('rest-live');
    backupDir = makeTmpDir('rest-bak');
    settingsPath = path.join(makeTmpDir('rest-set'), 'settings.json');
  });

  afterEach(() => {
    rmrf(liveDir);
    rmrf(backupDir);
    rmrf(path.dirname(settingsPath));
  });

  it('restores live directory from backup', () => {
    // Create backup with known files
    fs.writeFileSync(path.join(backupDir, 'backup-file.cjs'), 'original', 'utf8');

    // Modify live dir
    fs.writeFileSync(path.join(liveDir, 'new-file.cjs'), 'modified', 'utf8');

    const { restoreSnapshot } = require(MOD_PATH);
    restoreSnapshot({ liveDir, backupDir, settingsPath });

    assert.ok(fs.existsSync(path.join(liveDir, 'backup-file.cjs')), 'should restore backup file');
    assert.equal(fs.readFileSync(path.join(liveDir, 'backup-file.cjs'), 'utf8'), 'original');
    assert.ok(!fs.existsSync(path.join(liveDir, 'new-file.cjs')), 'should remove files not in backup');
  });

  it('restores settings.json from snapshot', () => {
    // Create backup with settings snapshot
    writeJSON(path.join(backupDir, 'settings.json.snapshot'), { original: true });
    fs.writeFileSync(path.join(backupDir, 'dummy.cjs'), 'x', 'utf8');

    // Write current (modified) settings
    writeJSON(settingsPath, { modified: true });

    const { restoreSnapshot } = require(MOD_PATH);
    restoreSnapshot({ liveDir, backupDir, settingsPath });

    const restored = readJSON(settingsPath);
    assert.equal(restored.original, true, 'should restore original settings');
  });

  it('returns { restored: false } when no backup exists', () => {
    const nonexistentDir = path.join(os.tmpdir(), 'nonexistent-backup-' + Date.now());
    const { restoreSnapshot } = require(MOD_PATH);
    const result = restoreSnapshot({ backupDir: nonexistentDir, liveDir, settingsPath });
    assert.equal(result.restored, false);
    assert.ok(result.error, 'should have error message');
  });

  it('returns { restored: true } on success', () => {
    fs.writeFileSync(path.join(backupDir, 'file.cjs'), 'content', 'utf8');
    const { restoreSnapshot } = require(MOD_PATH);
    const result = restoreSnapshot({ liveDir, backupDir, settingsPath });
    assert.equal(result.restored, true);
  });
});

// --- isDevMode ---

describe('isDevMode', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('dev-mode');
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('returns false for non-git directory', () => {
    const { isDevMode } = require(MOD_PATH);
    const result = isDevMode({ scriptDir: tmpDir });
    assert.equal(result, false);
  });

  it('returns false for git repo without dynamo remote', () => {
    execSync('git init', { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] });
    execSync('git remote add origin https://github.com/other/repo.git', { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] });

    const { isDevMode } = require(MOD_PATH);
    const result = isDevMode({ scriptDir: tmpDir });
    assert.equal(result, false);
  });

  it('returns true for git repo with tomkyser/dynamo remote', () => {
    execSync('git init', { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] });
    execSync('git remote add origin https://github.com/tomkyser/dynamo.git', { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] });

    const { isDevMode } = require(MOD_PATH);
    const result = isDevMode({ scriptDir: tmpDir });
    assert.equal(result, true);
  });
});

// --- Update orchestration (structural tests) ---

describe('update orchestration', () => {

  it('contains check -> snapshot -> pull -> migrate -> install -> health-check flow', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    // Check for the key references to each stage
    assert.ok(content.includes('checkUpdate'), 'should reference checkUpdate');
    assert.ok(content.includes('createSnapshot'), 'should reference createSnapshot');
    assert.ok(content.includes('git pull origin master'), 'should have git pull for dev mode');
    assert.ok(content.includes('runMigrations'), 'should reference runMigrations');
    assert.ok(content.includes('install.run'), 'should reference install.run');
    assert.ok(content.includes('healthCheck.run') || content.includes('health-check'), 'should reference health check');
  });

  it('has auto-rollback in catch block', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('restoreSnapshot'), 'should call restoreSnapshot on failure');
    assert.ok(content.includes("status: 'rolled-back'"), 'should set status to rolled-back');
  });

  it('references --strip-components=1 for tarball extraction', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('--strip-components=1'), 'should use strip-components for tar');
  });

  it('references tomkyser/dynamo for dev mode detection', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('tomkyser/dynamo'), 'should check for dynamo remote');
  });

  it('references dynamo-backup for snapshot directory', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('dynamo-backup'), 'should use dynamo-backup directory');
  });

  it('references settings.json.snapshot for settings backup', () => {
    const content = fs.readFileSync(MOD_PATH, 'utf8');
    assert.ok(content.includes('settings.json.snapshot'), 'should use settings.json.snapshot');
  });
});

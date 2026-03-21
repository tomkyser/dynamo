// Dynamo > Tests > install.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const INSTALL_PATH = path.join(__dirname, '..', '..', '..', 'subsystems', 'switchboard', 'install.cjs');

// All tests use temp directories -- never touch real ~/.claude/
function makeTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}

function writeJSON(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('install.cjs', () => {

  it('module exists and exports run and rollback', () => {
    assert.ok(fs.existsSync(INSTALL_PATH), 'install.cjs should exist');
    const mod = require(INSTALL_PATH);
    assert.ok(typeof mod.run === 'function', 'should export run');
    assert.ok(typeof mod.rollback === 'function', 'should export rollback');
  });

  it('has identity comment', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('Dynamo > Switchboard > install.cjs'), 'should have identity comment');
  });

  it('references settings.json.bak for backup', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('settings.json.bak'), 'should reference backup path');
  });

  it('uses fs.renameSync for atomic operations', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('fs.renameSync'), 'should use renameSync for atomic write or moves');
  });

  it('has copyTree function', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('copyTree'), 'should have copyTree function');
  });

  it('references graphiti-legacy for retirement', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('graphiti-legacy'), 'should reference retirement directory');
  });

  it('requires health-check for post-install check', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('health-check'), 'should reference health-check');
  });

  it('does NOT register MCP -- uses defensive deregistration only', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(!content.includes('claude mcp add'), 'must NOT register MCP (CLI-only architecture)');
    assert.ok(!content.includes('function registerMcp'), 'registerMcp function must be removed');
    assert.ok(content.includes('claude mcp remove graphiti'), 'must have defensive MCP deregistration');
  });

  it('uses REPO_ROOT constant (renamed from REPO_DIR)', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('REPO_ROOT'), 'should use REPO_ROOT constant');
    assert.ok(!content.includes('REPO_DIR'), 'should not use old REPO_DIR constant');
  });

  it('copies from six-subsystem layout (subsystems, cc, lib, dynamo)', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes("path.join(REPO_ROOT, 'subsystems')"), 'should copy from subsystems/');
    assert.ok(content.includes("path.join(REPO_ROOT, 'cc')"), 'should copy from cc/');
    assert.ok(content.includes("path.join(REPO_ROOT, 'lib')"), 'should copy from lib/');
    assert.ok(content.includes("path.join(REPO_ROOT, 'dynamo.cjs')"), 'should copy dynamo.cjs from root');
  });

  it('deploys CLAUDE.md template during install', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('CLAUDE.md.template'), 'should reference CLAUDE.md template');
    assert.ok(content.includes('Deploy CLAUDE.md'), 'should have Deploy CLAUDE.md step name');
  });

  it('verifies lib/ shared substrate during install', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('Verify lib/'), 'should verify lib/ shared substrate deployment');
  });

  it('generateConfig includes enabled:true in source', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes('enabled: true'), 'should include enabled:true in generated config');
  });

  it('has dependency check step reference in source', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    assert.ok(content.includes("'Check dependencies'"), 'should have Check dependencies step');
  });

  it('dependency check step appears before Copy files step', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    const depIdx = content.indexOf("'Check dependencies'");
    const copyIdx = content.indexOf("'Copy files'");
    assert.ok(depIdx !== -1, 'Check dependencies must exist');
    assert.ok(copyIdx !== -1, 'Copy files must exist');
    assert.ok(depIdx < copyIdx, 'Check dependencies must appear before Copy files');
  });

  it('dependency check uses WARN not FAIL on version mismatch', () => {
    const content = fs.readFileSync(INSTALL_PATH, 'utf8');
    // Find the dependency check block (between "Check dependencies" and "Copy files")
    const depIdx = content.indexOf("'Check dependencies'");
    const copyIdx = content.indexOf("'Copy files'");
    const depBlock = content.slice(depIdx, copyIdx);
    // The catch/else block should use WARN, not FAIL
    assert.ok(depBlock.includes("status: 'WARN'"), 'dependency check should use WARN on failure');
    assert.ok(!depBlock.includes("status: 'FAIL'"), 'dependency check must not use FAIL');
  });
});

describe('resolveRepoRoot', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('rrr');
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('is exported as a function', () => {
    const mod = require(INSTALL_PATH);
    assert.ok(typeof mod.resolveRepoRoot === 'function', 'should export resolveRepoRoot');
  });

  it('returns a string path', () => {
    const { resolveRepoRoot } = require(INSTALL_PATH);
    const result = resolveRepoRoot();
    assert.ok(typeof result === 'string', 'should return a string');
    assert.ok(result.length > 0, 'should not be empty');
  });

  it('when running from repo (has .git), returns the repo path', () => {
    // The test itself is running from the repo, so resolveRepoRoot should
    // detect the .git directory and return the repo root
    const { resolveRepoRoot } = require(INSTALL_PATH);
    const result = resolveRepoRoot();
    const expectedRepoRoot = path.join(__dirname, '..', '..', '..');
    // Both should resolve to the same actual directory
    assert.strictEqual(
      fs.realpathSync(result),
      fs.realpathSync(expectedRepoRoot),
      'should resolve to the repo root when .git exists'
    );
  });
});

describe('copyTree helper', () => {
  let srcDir, dstDir;

  beforeEach(() => {
    srcDir = makeTmpDir('ct-src');
    dstDir = makeTmpDir('ct-dst');
  });

  afterEach(() => {
    rmrf(srcDir);
    rmrf(dstDir);
  });

  it('copies directory structure correctly', () => {
    // Setup source tree
    fs.mkdirSync(path.join(srcDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'file1.cjs'), 'content1', 'utf8');
    fs.writeFileSync(path.join(srcDir, 'lib', 'file2.cjs'), 'content2', 'utf8');

    const { copyTree } = require(INSTALL_PATH);
    copyTree(srcDir, dstDir, []);

    assert.ok(fs.existsSync(path.join(dstDir, 'file1.cjs')), 'should copy file1');
    assert.ok(fs.existsSync(path.join(dstDir, 'lib', 'file2.cjs')), 'should copy nested file');
    assert.equal(fs.readFileSync(path.join(dstDir, 'file1.cjs'), 'utf8'), 'content1');
  });

  it('skips excluded entries', () => {
    fs.mkdirSync(path.join(srcDir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'ok.cjs'), 'ok', 'utf8');
    fs.writeFileSync(path.join(srcDir, 'tests', 'test.cjs'), 'test', 'utf8');
    fs.writeFileSync(path.join(srcDir, '.DS_Store'), 'junk', 'utf8');

    const { copyTree } = require(INSTALL_PATH);
    copyTree(srcDir, dstDir, ['tests', '.DS_Store']);

    assert.ok(fs.existsSync(path.join(dstDir, 'ok.cjs')), 'should copy non-excluded');
    assert.ok(!fs.existsSync(path.join(dstDir, 'tests')), 'should skip excluded dir');
    assert.ok(!fs.existsSync(path.join(dstDir, '.DS_Store')), 'should skip excluded file');
  });
});

describe('generateConfig helper', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('gc');
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('produces valid JSON with correct keys from env values', () => {
    // Write a mock .env
    const envPath = path.join(tmpDir, '.env');
    fs.writeFileSync(envPath, [
      'GRAPHITI_MCP_URL=http://test:8100/mcp',
      'GRAPHITI_HEALTH_URL=http://test:8100/health'
    ].join('\n'), 'utf8');

    // Create output dir for config
    const outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });

    const { generateConfig } = require(INSTALL_PATH);
    generateConfig(envPath, outDir);

    const configPath = path.join(outDir, 'config.json');
    assert.ok(fs.existsSync(configPath), 'config.json should be written');

    const config = readJSON(configPath);
    assert.ok(config.version, 'should have version');
    assert.ok(config.graphiti, 'should have graphiti section');
    assert.ok(config.graphiti.mcp_url, 'should have mcp_url');
    assert.strictEqual(config.curation, undefined, 'should NOT have curation section');
    assert.ok(config.timeouts, 'should have timeouts section');
    assert.ok(config.logging, 'should have logging section');
  });

  it('generated config includes enabled:true field', () => {
    const envPath = path.join(tmpDir, '.env');
    fs.writeFileSync(envPath, 'GRAPHITI_MCP_URL=http://test:8100/mcp\n', 'utf8');

    const outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });

    const { generateConfig } = require(INSTALL_PATH);
    generateConfig(envPath, outDir);

    const config = readJSON(path.join(outDir, 'config.json'));
    assert.strictEqual(config.enabled, true, 'generated config should have enabled:true');
  });

  it('generated config does NOT contain OPENROUTER references', () => {
    const envPath = path.join(tmpDir, '.env');
    fs.writeFileSync(envPath, 'GRAPHITI_MCP_URL=http://test:8100/mcp\n', 'utf8');

    const outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });

    const { generateConfig } = require(INSTALL_PATH);
    generateConfig(envPath, outDir);

    const raw = fs.readFileSync(path.join(outDir, 'config.json'), 'utf8');
    assert.ok(!raw.includes('openrouter'), 'config.json should NOT reference OpenRouter');
    assert.ok(!raw.includes('OPENROUTER'), 'config.json should NOT reference OPENROUTER');
    assert.ok(!raw.includes('claude-haiku'), 'config.json should NOT reference claude-haiku');
  });
});

describe('mergeSettings helper', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('ms');
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('backs up settings.json before modification', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const templatePath = path.join(tmpDir, 'template.json');

    writeJSON(settingsPath, { env: {}, hooks: {} });
    writeJSON(templatePath, { env: { TEST: '1' }, hooks: {}, permissions: {} });

    const { mergeSettings } = require(INSTALL_PATH);
    mergeSettings(settingsPath, templatePath);

    const backupPath = settingsPath + '.bak';
    assert.ok(fs.existsSync(backupPath), 'backup should be created');
  });

  it('merges hooks from template', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const templatePath = path.join(tmpDir, 'template.json');

    writeJSON(settingsPath, { hooks: {} });
    writeJSON(templatePath, {
      env: { CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS: '10000' },
      hooks: {
        Stop: [{ matcher: '', hooks: [{ type: 'command', command: 'node dynamo-hooks.cjs', timeout: 30 }] }]
      },
      permissions: { allow: ['mcp__graphiti__add_memory'], ask: [] }
    });

    const { mergeSettings } = require(INSTALL_PATH);
    mergeSettings(settingsPath, templatePath);

    const merged = readJSON(settingsPath);
    assert.ok(merged.hooks.Stop, 'should have Stop hooks');
    assert.ok(merged.hooks.Stop.length > 0, 'should have at least one Stop hook entry');
  });

  it('preserves non-Dynamo hooks', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const templatePath = path.join(tmpDir, 'template.json');

    writeJSON(settingsPath, {
      hooks: {
        Stop: [
          { matcher: '', hooks: [{ type: 'command', command: 'node gsd-tools.cjs', timeout: 5 }] }
        ]
      }
    });
    writeJSON(templatePath, {
      env: {},
      hooks: {
        Stop: [{ matcher: '', hooks: [{ type: 'command', command: 'node dynamo-hooks.cjs', timeout: 30 }] }]
      },
      permissions: { allow: [], ask: [] }
    });

    const { mergeSettings } = require(INSTALL_PATH);
    mergeSettings(settingsPath, templatePath);

    const merged = readJSON(settingsPath);
    // Should have both the GSD hook and the Dynamo hook
    const allCommands = [];
    for (const entry of merged.hooks.Stop) {
      for (const hook of entry.hooks) {
        allCommands.push(hook.command);
      }
    }
    assert.ok(allCommands.some(c => c.includes('gsd-tools')), 'should preserve GSD hooks');
    assert.ok(allCommands.some(c => c.includes('dynamo-hooks')), 'should add Dynamo hooks');
  });

  it('merges permissions additively', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const templatePath = path.join(tmpDir, 'template.json');

    writeJSON(settingsPath, {
      permissions: { allow: ['existing_perm'], ask: [] }
    });
    writeJSON(templatePath, {
      env: {},
      hooks: {},
      permissions: { allow: ['mcp__graphiti__add_memory'], ask: ['mcp__graphiti__clear_graph'] }
    });

    const { mergeSettings } = require(INSTALL_PATH);
    mergeSettings(settingsPath, templatePath);

    const merged = readJSON(settingsPath);
    assert.ok(merged.permissions.allow.includes('existing_perm'), 'should keep existing perm');
    assert.ok(merged.permissions.allow.includes('mcp__graphiti__add_memory'), 'should add new perm');
    assert.ok(merged.permissions.ask.includes('mcp__graphiti__clear_graph'), 'should add ask perm');
  });

  it('uses atomic write (tmp + rename)', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const templatePath = path.join(tmpDir, 'template.json');

    writeJSON(settingsPath, {});
    writeJSON(templatePath, { env: {}, hooks: {}, permissions: {} });

    const { mergeSettings } = require(INSTALL_PATH);
    mergeSettings(settingsPath, templatePath);

    // After merge, settings.json should exist and be valid JSON (proves atomic write completed)
    const merged = readJSON(settingsPath);
    assert.ok(merged !== null, 'settings should be valid JSON after merge');
    // tmp file should NOT exist (renamed to final)
    assert.ok(!fs.existsSync(settingsPath + '.tmp'), 'tmp file should be cleaned up');
  });
});

describe('retirePython helper', () => {
  let tmpDir, graphitiDir, legacyDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('rp');
    graphitiDir = path.join(tmpDir, 'graphiti');
    legacyDir = path.join(tmpDir, 'graphiti-legacy');
    fs.mkdirSync(graphitiDir, { recursive: true });
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('moves .py files but keeps docker-compose.yml', () => {
    // Setup graphiti dir with mixed files
    fs.writeFileSync(path.join(graphitiDir, 'helper.py'), '# python', 'utf8');
    fs.writeFileSync(path.join(graphitiDir, 'docker-compose.yml'), 'version: 3', 'utf8');
    fs.writeFileSync(path.join(graphitiDir, '.env'), 'KEY=val', 'utf8');
    fs.writeFileSync(path.join(graphitiDir, 'requirements.txt'), 'graphiti', 'utf8');

    const { retirePython } = require(INSTALL_PATH);
    retirePython(graphitiDir, legacyDir);

    // Python files moved to legacy
    assert.ok(fs.existsSync(path.join(legacyDir, 'helper.py')), 'should move .py to legacy');
    assert.ok(fs.existsSync(path.join(legacyDir, 'requirements.txt')), 'should move requirements.txt to legacy');

    // Kept files remain
    assert.ok(fs.existsSync(path.join(graphitiDir, 'docker-compose.yml')), 'should keep docker-compose.yml');
    assert.ok(fs.existsSync(path.join(graphitiDir, '.env')), 'should keep .env');

    // Python files removed from original
    assert.ok(!fs.existsSync(path.join(graphitiDir, 'helper.py')), 'should remove .py from graphiti');
  });
});

describe('rollback helper', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('rb');
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('restores settings.json from backup', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    const backupPath = settingsPath + '.bak';

    writeJSON(backupPath, { original: true });
    writeJSON(settingsPath, { modified: true });

    const { restoreSettings } = require(INSTALL_PATH);
    restoreSettings(settingsPath);

    const restored = readJSON(settingsPath);
    assert.ok(restored.original === true, 'should restore original settings');
  });

  it('moves files back from legacy dir', () => {
    const graphitiDir = path.join(tmpDir, 'graphiti');
    const legacyDir = path.join(tmpDir, 'graphiti-legacy');

    fs.mkdirSync(graphitiDir, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'helper.py'), '# python', 'utf8');
    fs.writeFileSync(path.join(graphitiDir, 'docker-compose.yml'), 'v3', 'utf8');

    const { restorePython } = require(INSTALL_PATH);
    restorePython(graphitiDir, legacyDir);

    assert.ok(fs.existsSync(path.join(graphitiDir, 'helper.py')), 'should restore .py to graphiti');
  });
});

describe('cleanupClassicArtifacts', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir('cleanup');
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  it('removes files listed in CLEANUP_FILES from target directory', () => {
    const { cleanupClassicArtifacts, CLEANUP_FILES } = require(INSTALL_PATH);

    // Create all classic artifact files
    for (const relPath of CLEANUP_FILES) {
      const fullPath = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, 'classic content', 'utf8');
    }

    const cleaned = cleanupClassicArtifacts({ liveDir: tmpDir });

    // All files should be removed
    for (const relPath of CLEANUP_FILES) {
      assert.ok(!fs.existsSync(path.join(tmpDir, relPath)), relPath + ' should be removed');
    }
    assert.ok(cleaned >= CLEANUP_FILES.length, 'should report at least ' + CLEANUP_FILES.length + ' cleaned');
  });

  it('removes dead Ledger hook handlers', () => {
    const { cleanupClassicArtifacts } = require(INSTALL_PATH);

    const hooksDir = path.join(tmpDir, 'subsystems', 'ledger', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    const deadHandlers = ['session-start.cjs', 'prompt-augment.cjs', 'session-summary.cjs', 'preserve-knowledge.cjs', 'capture-change.cjs'];
    for (const f of deadHandlers) {
      fs.writeFileSync(path.join(hooksDir, f), '// dead handler', 'utf8');
    }

    const cleaned = cleanupClassicArtifacts({ liveDir: tmpDir });

    for (const f of deadHandlers) {
      assert.ok(!fs.existsSync(path.join(hooksDir, f)), f + ' should be removed');
    }
    assert.ok(cleaned >= deadHandlers.length, 'should report at least ' + deadHandlers.length + ' cleaned');
  });

  it('strips curation key from config.json', () => {
    const { cleanupClassicArtifacts } = require(INSTALL_PATH);

    const configPath = path.join(tmpDir, 'config.json');
    writeJSON(configPath, {
      version: '0.1.0',
      enabled: true,
      graphiti: { mcp_url: 'http://localhost:8100/mcp' },
      curation: { model: 'anthropic/claude-haiku-4.5', api_url: 'https://openrouter.ai/api/v1/chat/completions' },
      timeouts: { health: 3000, mcp: 5000 }
    });

    const cleaned = cleanupClassicArtifacts({ liveDir: tmpDir });

    const config = readJSON(configPath);
    assert.strictEqual(config.curation, undefined, 'curation key should be removed');
    assert.ok(config.graphiti, 'graphiti key should be preserved');
    assert.ok(config.enabled === true, 'enabled key should be preserved');
    assert.ok(cleaned >= 1, 'should report at least 1 cleaned');
  });

  it('strips reverie.mode from config.json', () => {
    const { cleanupClassicArtifacts } = require(INSTALL_PATH);

    const configPath = path.join(tmpDir, 'config.json');
    writeJSON(configPath, {
      version: '0.1.0',
      enabled: true,
      curation: { model: 'test' },
      reverie: { mode: 'classic', other_key: 'keep' }
    });

    const cleaned = cleanupClassicArtifacts({ liveDir: tmpDir });

    const config = readJSON(configPath);
    assert.strictEqual(config.curation, undefined, 'curation key should be removed');
    assert.strictEqual(config.reverie.mode, undefined, 'reverie.mode should be removed');
    assert.strictEqual(config.reverie.other_key, 'keep', 'other reverie keys should be preserved');
    assert.ok(cleaned >= 1, 'should report at least 1 cleaned');
  });

  it('handles missing files gracefully (returns 0 when nothing to clean)', () => {
    const { cleanupClassicArtifacts } = require(INSTALL_PATH);

    // Empty directory -- nothing to clean
    const cleaned = cleanupClassicArtifacts({ liveDir: tmpDir });
    assert.strictEqual(cleaned, 0, 'should return 0 when nothing to clean');
  });

  it('CLEANUP_FILES contains exactly 6 entries', () => {
    const { CLEANUP_FILES } = require(INSTALL_PATH);
    assert.strictEqual(CLEANUP_FILES.length, 6, 'should have 6 classic artifact paths');
  });

  it('exports cleanupClassicArtifacts and CLEANUP_FILES', () => {
    const mod = require(INSTALL_PATH);
    assert.ok(typeof mod.cleanupClassicArtifacts === 'function', 'should export cleanupClassicArtifacts');
    assert.ok(Array.isArray(mod.CLEANUP_FILES), 'should export CLEANUP_FILES array');
  });
});

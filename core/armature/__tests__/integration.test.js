'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { bootstrap } = require('../../core.cjs');

describe('Integration: Full Platform Bootstrap', () => {
  let tmpDir;
  let testPaths;
  let result;

  beforeAll(async () => {
    // Create temp directory structure for test isolation
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-integration-'));

    // Create required directories
    fs.mkdirSync(path.join(tmpDir, 'data'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'data', 'journal'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'plugins'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'core', 'services'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'core', 'providers'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'core', 'sdk', 'circuit'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'core', 'sdk', 'pulley'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'modules'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'extensions'), { recursive: true });

    // Create minimal config.json
    fs.writeFileSync(
      path.join(tmpDir, 'config.json'),
      JSON.stringify({ name: 'dynamo-test', version: '0.0.0' })
    );

    // Initialize a git repo in tmpDir so Forge can work
    Bun.spawnSync(['git', 'init'], { cwd: tmpDir });
    Bun.spawnSync(['git', 'config', 'user.email', 'test@test.com'], { cwd: tmpDir });
    Bun.spawnSync(['git', 'config', 'user.name', 'Test'], { cwd: tmpDir });

    // Build test paths matching createPaths() output
    testPaths = {
      root: tmpDir,
      lib: path.join(tmpDir, 'lib'),
      core: path.join(tmpDir, 'core'),
      services: path.join(tmpDir, 'core', 'services'),
      providers: path.join(tmpDir, 'core', 'providers'),
      armature: path.join(tmpDir, 'core', 'armature'),
      sdk: path.join(tmpDir, 'core', 'sdk'),
      circuit: path.join(tmpDir, 'core', 'sdk', 'circuit'),
      pulley: path.join(tmpDir, 'core', 'sdk', 'pulley'),
      plugins: path.join(tmpDir, 'plugins'),
      modules: path.join(tmpDir, 'modules'),
      extensions: path.join(tmpDir, 'extensions'),
      config: path.join(tmpDir, 'config.json'),
    };

    // Bootstrap the platform
    result = await bootstrap({ paths: testPaths });
  });

  afterAll(async () => {
    // Clean shutdown if bootstrap succeeded
    if (result && result.ok && result.value.lifecycle) {
      await result.value.lifecycle.shutdown();
    }

    // Cleanup tmpDir
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('bootstrap returns ok result', () => {
    expect(result.ok).toBe(true);
  });

  it('result contains container, lifecycle, config, and paths', () => {
    expect(result.value).toBeDefined();
    expect(result.value.container).toBeDefined();
    expect(result.value.lifecycle).toBeDefined();
    expect(result.value.config).toBeDefined();
    expect(result.value.paths).toBeDefined();
  });

  it('lifecycle status is running after boot', () => {
    expect(result.value.lifecycle.getStatus()).toBe('running');
  });

  describe('Container registration', () => {
    it('has all 9 services registered', () => {
      const container = result.value.container;
      expect(container.has('services.switchboard')).toBe(true);
      expect(container.has('services.lathe')).toBe(true);
      expect(container.has('services.commutator')).toBe(true);
      expect(container.has('services.magnet')).toBe(true);
      expect(container.has('services.conductor')).toBe(true);
      expect(container.has('services.forge')).toBe(true);
      expect(container.has('services.relay')).toBe(true);
      expect(container.has('services.wire')).toBe(true);
      expect(container.has('services.assay')).toBe(true);
    });

    it('has both providers registered', () => {
      const container = result.value.container;
      expect(container.has('providers.ledger')).toBe(true);
      expect(container.has('providers.journal')).toBe(true);
    });

    it('resolves provider domain alias providers.data.sql', () => {
      const container = result.value.container;
      expect(container.has('providers.data.sql')).toBe(true);
    });

    it('resolves provider domain alias providers.data.files', () => {
      const container = result.value.container;
      expect(container.has('providers.data.files')).toBe(true);
    });

    it('resolveTagged("service") returns at least 9 entries', () => {
      const container = result.value.container;
      const services = container.resolveTagged('service');
      expect(services.length).toBeGreaterThanOrEqual(9);
    });

    it('resolveTagged("provider") returns at least 2 entries', () => {
      const container = result.value.container;
      const providers = container.resolveTagged('provider');
      expect(providers.length).toBeGreaterThanOrEqual(2);
    });

    it('resolveTagged("sql") includes Ledger', () => {
      const container = result.value.container;
      const sqlTagged = container.resolveTagged('sql');
      const names = sqlTagged.map(e => e.name);
      expect(names).toContain('providers.ledger');
    });
  });

  describe('Facade access via lifecycle', () => {
    it('getFacade returns switchboard with correct meta name', () => {
      const facade = result.value.lifecycle.getFacade('services.switchboard');
      expect(facade).not.toBeNull();
      expect(facade.meta.name).toBe('services.switchboard');
    });

    it('getFacade returns ledger with sql tag in meta', () => {
      const facade = result.value.lifecycle.getFacade('providers.ledger');
      expect(facade).not.toBeNull();
      expect(facade.meta.tags).toContain('sql');
    });

    it('getFacade resolves providers.data.sql alias to ledger facade', () => {
      const facade = result.value.lifecycle.getFacade('providers.data.sql');
      expect(facade).not.toBeNull();
      expect(facade.meta.tags).toContain('sql');
    });

    it('getFacade resolves providers.data.files alias to journal facade', () => {
      const facade = result.value.lifecycle.getFacade('providers.data.files');
      expect(facade).not.toBeNull();
      expect(facade.meta.tags).toContain('files');
    });
  });

  describe('Shutdown', () => {
    it('shutdown completes without error and sets status to stopped', async () => {
      const lifecycle = result.value.lifecycle;
      const shutdownResult = await lifecycle.shutdown();
      expect(shutdownResult.ok).toBe(true);
      expect(lifecycle.getStatus()).toBe('stopped');
    });
  });
});

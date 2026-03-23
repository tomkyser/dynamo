'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { bootstrap } = require('../../core.cjs');

describe('Integration: SDK Layer (Circuit + Pulley + Bootstrap)', () => {
  let tmpDir;
  let testPaths;
  let platform;

  beforeAll(async () => {
    // Create temp directory structure for test isolation
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-sdk-test-'));

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
      JSON.stringify({ name: 'dynamo-test', version: '1.0.0' })
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

    // Bootstrap the platform (now returns circuit and pulley)
    const result = await bootstrap({ paths: testPaths });
    if (!result.ok) {
      throw new Error('Bootstrap failed: ' + (result.error || result.code || JSON.stringify(result)));
    }
    platform = result.value;
  });

  afterAll(async () => {
    // Clean shutdown
    if (platform && platform.lifecycle) {
      await platform.lifecycle.shutdown();
    }

    // Cleanup tmpDir
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ---- Bootstrap with SDK ----

  describe('Bootstrap with SDK', () => {
    it('returns circuit and pulley in bootstrap result', () => {
      expect(platform.circuit).toBeDefined();
      expect(platform.pulley).toBeDefined();
    });

    it('lifecycle is running after boot', () => {
      expect(platform.lifecycle.getStatus()).toBe('running');
    });

    it('still returns container, config, and paths (backward compatible)', () => {
      expect(platform.container).toBeDefined();
      expect(platform.config).toBeDefined();
      expect(platform.paths).toBeDefined();
    });
  });

  // ---- Circuit module API ----

  describe('Circuit module API', () => {
    let moduleApi;

    it('lists no modules initially', () => {
      const r = platform.circuit.listModules();
      expect(r.ok).toBe(true);
      expect(r.value).toEqual([]);
    });

    it('registers a test module with valid manifest', () => {
      const manifest = {
        name: 'test-module',
        version: '1.0.0',
        main: 'index.cjs',
        dependencies: { services: ['switchboard', 'lathe'], providers: [] },
      };

      const r = platform.circuit.registerModule(manifest, (api) => {
        moduleApi = api;
      });

      expect(r.ok).toBe(true);
      expect(r.value.name).toBe('test-module');
    });

    it('module receives scoped Circuit API with lib re-exports', () => {
      expect(moduleApi).toBeDefined();
      expect(typeof moduleApi.ok).toBe('function');
      expect(typeof moduleApi.err).toBe('function');
      expect(typeof moduleApi.isOk).toBe('function');
      expect(typeof moduleApi.isErr).toBe('function');
      expect(typeof moduleApi.validate).toBe('function');
      expect(typeof moduleApi.createContract).toBe('function');
    });

    it('module receives event proxy', () => {
      expect(moduleApi.events).toBeDefined();
      expect(typeof moduleApi.events.emit).toBe('function');
      expect(typeof moduleApi.events.on).toBe('function');
      expect(typeof moduleApi.events.cleanup).toBe('function');
    });

    it('module accesses declared service (switchboard)', () => {
      const r = platform.circuit.getService('test-module', 'switchboard');
      expect(r.ok).toBe(true);
      expect(r.value).toBeDefined();
      expect(r.value.meta.name).toBe('services.switchboard');
    });

    it('module accesses declared service (lathe)', () => {
      const r = platform.circuit.getService('test-module', 'lathe');
      expect(r.ok).toBe(true);
      expect(r.value).toBeDefined();
    });

    it('module rejected for undeclared service (wire)', () => {
      const r = platform.circuit.getService('test-module', 'wire');
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe('UNDECLARED_DEPENDENCY');
    });

    it('event proxy namespaces module emissions', () => {
      const switchboardFacade = platform.lifecycle.getFacade('services.switchboard');
      let receivedEvent = null;

      // Listen for the namespaced event on switchboard
      switchboardFacade.on('test-module:update', (payload) => {
        receivedEvent = payload;
      });

      // Emit from module event proxy
      moduleApi.events.emit('update', { value: 42 });

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent.value).toBe(42);
    });

    it('lists registered module', () => {
      const r = platform.circuit.listModules();
      expect(r.ok).toBe(true);
      expect(r.value).toContain('test-module');
    });

    it('getModuleInfo returns module details', () => {
      const r = platform.circuit.getModuleInfo('test-module');
      expect(r.ok).toBe(true);
      expect(r.value.name).toBe('test-module');
      expect(r.value.manifest.version).toBe('1.0.0');
    });

    it('shutdown cleans up module event subscriptions', () => {
      const r = platform.circuit.shutdownModule('test-module');
      expect(r.ok).toBe(true);

      const listResult = platform.circuit.listModules();
      expect(listResult.value).toEqual([]);
    });
  });

  // ---- Pulley CLI ----

  describe('Pulley CLI', () => {
    it('routes status command', async () => {
      const r = await platform.pulley.route(['status'], ['status']);
      expect(r.ok).toBe(true);
      expect(r.value).toBeDefined();
    });

    it('routes health command', async () => {
      const r = await platform.pulley.route(['health'], ['health']);
      expect(r.ok).toBe(true);
      expect(r.value).toBeDefined();
    });

    it('routes version command', async () => {
      const r = await platform.pulley.route(['version'], ['version']);
      expect(r.ok).toBe(true);
      expect(r.value).toBeDefined();
    });

    it('routes config command', async () => {
      const r = await platform.pulley.route(['config'], ['config']);
      expect(r.ok).toBe(true);
    });

    it('rejects unknown command', async () => {
      const r = await platform.pulley.route(['nonexistent'], ['nonexistent']);
      expect(r.ok).toBe(false);
      expect(r.error.code).toBe('COMMAND_NOT_FOUND');
    });

    it('getCommands returns registered platform commands', () => {
      const r = platform.pulley.getCommands();
      expect(r.ok).toBe(true);
      const commands = r.value;
      expect(commands.has('status')).toBe(true);
      expect(commands.has('health')).toBe(true);
      expect(commands.has('version')).toBe(true);
      expect(commands.has('config')).toBe(true);
    });
  });

  // ---- Health aggregation ----

  describe('Health aggregation', () => {
    it('returns valid health report after boot', () => {
      const { aggregateHealth } = require('../../sdk/pulley/health.cjs');

      // Build facades map from lifecycle (same approach as platform-commands.cjs)
      const facades = new Map();
      const registry = platform.container.getRegistry();
      for (const [name] of registry) {
        const f = platform.lifecycle.getFacade(name);
        if (f) {
          facades.set(name, f);
        }
      }

      const report = aggregateHealth(facades, registry);
      // In test environment, some services may be degraded (Wire without relay, etc.)
      expect(['healthy', 'degraded']).toContain(report.overall);
      expect(report.services.length).toBeGreaterThan(0);
      expect(report.timestamp).toBeDefined();

      // Verify at least some core services report healthy
      const healthyServices = report.services.filter(s => s.healthy === true);
      expect(healthyServices.length).toBeGreaterThan(0);
    });
  });

  // ---- SDK barrel export ----

  describe('SDK barrel export', () => {
    it('exports all expected functions', () => {
      const sdk = require('../../sdk/index.cjs');

      // Circuit
      expect(typeof sdk.createCircuit).toBe('function');
      expect(sdk.CIRCUIT_SHAPE).toBeDefined();
      expect(sdk.MODULE_MANIFEST_SCHEMA).toBeDefined();
      expect(typeof sdk.validateModuleManifest).toBe('function');
      expect(typeof sdk.createEventProxy).toBe('function');

      // Pulley
      expect(typeof sdk.createPulley).toBe('function');
      expect(sdk.PULLEY_SHAPE).toBeDefined();
      expect(typeof sdk.formatOutput).toBe('function');
      expect(typeof sdk.generateHelp).toBe('function');
      expect(typeof sdk.generateCommandHelp).toBe('function');

      // Health & Diagnostics
      expect(typeof sdk.aggregateHealth).toBe('function');
      expect(typeof sdk.analyzeDependencyChain).toBe('function');
      expect(typeof sdk.formatDiagnostics).toBe('function');

      // MCP Server
      expect(typeof sdk.createPlatformMcpServer).toBe('function');
      expect(typeof sdk.registerPlatformTools).toBe('function');

      // Platform Commands
      expect(typeof sdk.registerPlatformCommands).toBe('function');
    });
  });
});

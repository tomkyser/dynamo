'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { bootstrap } = require('../core.cjs');

describe('Bootstrap Integration: Phase 06 Fixes', () => {
  let tmpDir;
  let testPaths;
  let platform;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-boot-int-'));

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

    fs.writeFileSync(
      path.join(tmpDir, 'config.json'),
      JSON.stringify({ name: 'dynamo-test', version: '1.0.0' })
    );

    Bun.spawnSync(['git', 'init'], { cwd: tmpDir });
    Bun.spawnSync(['git', 'config', 'user.email', 'test@test.com'], { cwd: tmpDir });
    Bun.spawnSync(['git', 'config', 'user.name', 'Test'], { cwd: tmpDir });

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

    const result = await bootstrap({ paths: testPaths });
    if (!result.ok) {
      throw new Error('Bootstrap failed: ' + JSON.stringify(result.error || result));
    }
    platform = result.value;
  });

  afterAll(async () => {
    if (platform && platform.lifecycle) {
      await platform.lifecycle.shutdown();
    }
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ---- SVC-09: Assay has both providers after bootstrap ----

  describe('Assay provider injection (SVC-09, INT-GAP-01)', () => {
    it('assay facade is accessible after bootstrap', () => {
      const facade = platform.lifecycle.getFacade('services.assay');
      expect(facade).toBeDefined();
      expect(facade.meta.name).toBe('services.assay');
    });

    it('assay has both ledger and journal providers registered', () => {
      const facade = platform.lifecycle.getFacade('services.assay');
      const result = facade.getProviders();
      expect(result.ok).toBe(true);
      expect(result.value).toContain('ledger');
      expect(result.value).toContain('journal');
      expect(result.value.length).toBe(2);
    });

    it('assay.search() returns results structure (not error) after bootstrap', async () => {
      const facade = platform.lifecycle.getFacade('services.assay');
      const result = await facade.search({ criteria: { table: 'nonexistent' } });
      // Even with no matching data, search should return a valid structure (not crash)
      expect(result.ok).toBe(true);
      expect(result.value).toHaveProperty('results');
      expect(result.value).toHaveProperty('providers');
    });
  });

  // ---- SVC-03: Magnet state persists via json-provider ----

  describe('Magnet persistence (SVC-03, INT-GAP-02)', () => {
    it('magnet facade is accessible after bootstrap', () => {
      const facade = platform.lifecycle.getFacade('services.magnet');
      expect(facade).toBeDefined();
      expect(facade.meta.name).toBe('services.magnet');
    });

    it('magnet.set writes state and magnet.get retrieves it', async () => {
      const magnet = platform.lifecycle.getFacade('services.magnet');
      const setResult = await magnet.set('global', 'testKey', 'testValue');
      expect(setResult.ok).toBe(true);
      expect(magnet.get('global', 'testKey')).toBe('testValue');
    });

    it('state file is created on disk after set+shutdown', async () => {
      const magnet = platform.lifecycle.getFacade('services.magnet');
      await magnet.set('global', 'persistCheck', 42);

      // Trigger flush by calling stop (shutdown flushes with flush:true)
      // We need to shutdown and re-bootstrap to test persistence
      await platform.lifecycle.shutdown();

      // Verify state file exists on disk
      const stateFile = path.join(tmpDir, 'data', 'state.json');
      expect(fs.existsSync(stateFile)).toBe(true);

      // Verify file contains the persisted value
      const content = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(content.global.persistCheck).toBe(42);

      // Re-bootstrap and verify state survives restart
      const result2 = await bootstrap({ paths: testPaths });
      expect(result2.ok).toBe(true);
      platform = result2.value; // Update reference for afterAll cleanup

      const magnet2 = platform.lifecycle.getFacade('services.magnet');
      expect(magnet2.get('global', 'persistCheck')).toBe(42);
    });
  });

  // ---- SVC-05 + INF-02: forge.pull() exists and is callable ----

  describe('Forge pull (SVC-05, INF-02, INT-GAP-03)', () => {
    it('forge facade has pull method after bootstrap', () => {
      const forge = platform.lifecycle.getFacade('services.forge');
      expect(forge).toBeDefined();
      expect(typeof forge.pull).toBe('function');
    });

    it('forge.pull returns a Result (not throws) even without remote', () => {
      const forge = platform.lifecycle.getFacade('services.forge');
      const result = forge.pull('origin', 'master');
      // No remote configured in test repo, so pull fails gracefully
      expect(result).toHaveProperty('ok');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('GIT_FAILED');
    });
  });

  // ---- Tech Debt: Switchboard deps declared correctly ----

  describe('Switchboard dependency declarations', () => {
    it('every service with switchboard in mapDeps has it in deps[]', () => {
      const registry = platform.container.getRegistry();
      const violations = [];

      for (const [name, entry] of registry) {
        if (!entry.mapDeps) continue;
        const mapDepKeys = Object.keys(entry.mapDeps);
        for (const depKey of mapDepKeys) {
          if (!entry.deps.includes(depKey)) {
            violations.push({ service: name, missing: depKey });
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('switchboard and lathe are level-0 (no deps)', () => {
      const registry = platform.container.getRegistry();
      const switchboard = registry.get('services.switchboard');
      const lathe = registry.get('services.lathe');

      expect(switchboard.deps).toEqual([]);
      expect(lathe.deps).toEqual([]);
    });

    it('assay depends on both providers and switchboard', () => {
      const registry = platform.container.getRegistry();
      const assay = registry.get('services.assay');

      expect(assay.deps).toContain('services.switchboard');
      expect(assay.deps).toContain('providers.ledger');
      expect(assay.deps).toContain('providers.journal');
    });

    it('magnet depends on switchboard and lathe (for persistence)', () => {
      const registry = platform.container.getRegistry();
      const magnet = registry.get('services.magnet');

      expect(magnet.deps).toContain('services.switchboard');
      expect(magnet.deps).toContain('services.lathe');
    });
  });
});

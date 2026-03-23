'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const { createContainer } = require('../container.cjs');

// Will be implemented in plugin.cjs
const {
  PLUGIN_MANIFEST_SCHEMA,
  validateManifest,
  checkDependencies,
  loadPlugin,
  discoverPlugins,
} = require('../plugin.cjs');

describe('PLUGIN_MANIFEST_SCHEMA', () => {
  it('defines required fields: name, version, main', () => {
    expect(PLUGIN_MANIFEST_SCHEMA.name.required).toBe(true);
    expect(PLUGIN_MANIFEST_SCHEMA.name.type).toBe('string');
    expect(PLUGIN_MANIFEST_SCHEMA.version.required).toBe(true);
    expect(PLUGIN_MANIFEST_SCHEMA.version.type).toBe('string');
    expect(PLUGIN_MANIFEST_SCHEMA.main.required).toBe(true);
    expect(PLUGIN_MANIFEST_SCHEMA.main.type).toBe('string');
  });

  it('defines optional fields with defaults: description, enabled, dependencies', () => {
    expect(PLUGIN_MANIFEST_SCHEMA.description.required).toBe(false);
    expect(PLUGIN_MANIFEST_SCHEMA.description.default).toBe('');
    expect(PLUGIN_MANIFEST_SCHEMA.enabled.required).toBe(false);
    expect(PLUGIN_MANIFEST_SCHEMA.enabled.default).toBe(true);
    expect(PLUGIN_MANIFEST_SCHEMA.dependencies.required).toBe(false);
  });
});

describe('validateManifest', () => {
  it('returns ok for valid manifest with all required fields', () => {
    const manifest = {
      name: 'test-plugin',
      version: '1.0.0',
      main: 'index.cjs',
    };
    const result = validateManifest(manifest);
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe('test-plugin');
    expect(result.value.version).toBe('1.0.0');
    expect(result.value.main).toBe('index.cjs');
  });

  it('applies defaults for optional fields', () => {
    const manifest = {
      name: 'test-plugin',
      version: '1.0.0',
      main: 'index.cjs',
    };
    const result = validateManifest(manifest);
    expect(result.ok).toBe(true);
    expect(result.value.description).toBe('');
    expect(result.value.enabled).toBe(true);
  });

  it('returns Err with SCHEMA_VALIDATION_FAILED for missing required fields', () => {
    const result = validateManifest({});
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('returns Err when name is missing', () => {
    const result = validateManifest({ version: '1.0.0', main: 'index.cjs' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('validates full manifest with all fields', () => {
    const manifest = {
      name: 'my-plugin',
      version: '2.0.0',
      description: 'A test plugin',
      main: 'entry.cjs',
      enabled: false,
      dependencies: {
        services: ['switchboard'],
        providers: ['ledger'],
      },
    };
    const result = validateManifest(manifest);
    expect(result.ok).toBe(true);
    expect(result.value.enabled).toBe(false);
    expect(result.value.description).toBe('A test plugin');
  });
});

describe('checkDependencies', () => {
  let container;

  beforeEach(() => {
    container = createContainer();
    container.singleton('services.switchboard', () => ({ name: 'switchboard' }));
    container.singleton('providers.ledger', () => ({ name: 'ledger' }));
  });

  it('returns ok when all dependencies exist in container', () => {
    const manifest = {
      name: 'test-plugin',
      dependencies: {
        services: ['switchboard'],
        providers: ['ledger'],
      },
    };
    const result = checkDependencies(manifest, container);
    expect(result.ok).toBe(true);
  });

  it('returns ok when plugin has no dependencies', () => {
    const manifest = {
      name: 'test-plugin',
      dependencies: { services: [], providers: [] },
    };
    const result = checkDependencies(manifest, container);
    expect(result.ok).toBe(true);
  });

  it('returns Err with PLUGIN_MISSING_DEPS when a service dependency is missing', () => {
    const manifest = {
      name: 'test-plugin',
      dependencies: {
        services: ['switchboard', 'nonexistent'],
        providers: [],
      },
    };
    const result = checkDependencies(manifest, container);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('PLUGIN_MISSING_DEPS');
    expect(result.error.context.missing).toContain('services.nonexistent');
  });

  it('returns Err with PLUGIN_MISSING_DEPS when a provider dependency is missing', () => {
    const manifest = {
      name: 'test-plugin',
      dependencies: {
        services: [],
        providers: ['ledger', 'missing-provider'],
      },
    };
    const result = checkDependencies(manifest, container);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('PLUGIN_MISSING_DEPS');
    expect(result.error.context.missing).toContain('providers.missing-provider');
  });

  it('lists all missing deps in context', () => {
    const manifest = {
      name: 'test-plugin',
      dependencies: {
        services: ['missing-svc'],
        providers: ['missing-prov'],
      },
    };
    const result = checkDependencies(manifest, container);
    expect(result.ok).toBe(false);
    expect(result.error.context.missing).toHaveLength(2);
    expect(result.error.context.plugin).toBe('test-plugin');
  });
});

describe('loadPlugin', () => {
  let tmpDir;
  let container;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-plugin-test-'));
    container = createContainer();
    container.singleton('services.switchboard', () => ({ name: 'switchboard' }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a valid plugin and calls register(container)', () => {
    const pluginDir = path.join(tmpDir, 'my-plugin');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
      name: 'my-plugin',
      version: '1.0.0',
      main: 'index.cjs',
      dependencies: { services: ['switchboard'], providers: [] },
    }));
    fs.writeFileSync(path.join(pluginDir, 'index.cjs'), `
      'use strict';
      module.exports = {
        register(container) {
          container.singleton('plugins.my-plugin.registered', () => true);
          return { ok: true, value: undefined };
        }
      };
    `);

    const result = loadPlugin(pluginDir, container);
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe('my-plugin');
    // Verify register was called
    expect(container.has('plugins.my-plugin.registered')).toBe(true);
  });

  it('returns Err with PLUGIN_DISABLED for disabled plugins', () => {
    const pluginDir = path.join(tmpDir, 'disabled-plugin');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
      name: 'disabled-plugin',
      version: '1.0.0',
      main: 'index.cjs',
      enabled: false,
    }));

    const result = loadPlugin(pluginDir, container);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('PLUGIN_DISABLED');
  });

  it('returns Err with SCHEMA_VALIDATION_FAILED for invalid manifest', () => {
    const pluginDir = path.join(tmpDir, 'bad-manifest');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
      description: 'no name or version',
    }));

    const result = loadPlugin(pluginDir, container);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('returns Err with PLUGIN_MISSING_DEPS when dependency not in container', () => {
    const pluginDir = path.join(tmpDir, 'missing-deps');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
      name: 'missing-deps-plugin',
      version: '1.0.0',
      main: 'index.cjs',
      dependencies: { services: ['nonexistent'], providers: [] },
    }));

    const result = loadPlugin(pluginDir, container);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('PLUGIN_MISSING_DEPS');
  });

  it('returns Err with PLUGIN_LOAD_FAILED if require() throws', () => {
    const pluginDir = path.join(tmpDir, 'broken-plugin');
    fs.mkdirSync(pluginDir);
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify({
      name: 'broken-plugin',
      version: '1.0.0',
      main: 'index.cjs',
      dependencies: { services: [], providers: [] },
    }));
    fs.writeFileSync(path.join(pluginDir, 'index.cjs'), `
      'use strict';
      throw new Error('Module load failure');
    `);

    const result = loadPlugin(pluginDir, container);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('PLUGIN_LOAD_FAILED');
  });
});

describe('discoverPlugins', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-discover-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array for nonexistent directory', () => {
    const result = discoverPlugins('/nonexistent/path');
    expect(result).toEqual([]);
  });

  it('returns empty array for directory with no plugin.json files', () => {
    const emptyDir = path.join(tmpDir, 'empty-subdir');
    fs.mkdirSync(emptyDir);
    const result = discoverPlugins(tmpDir);
    expect(result).toEqual([]);
  });

  it('discovers subdirectories containing plugin.json', () => {
    const pluginA = path.join(tmpDir, 'plugin-a');
    const pluginB = path.join(tmpDir, 'plugin-b');
    const notPlugin = path.join(tmpDir, 'not-a-plugin');
    fs.mkdirSync(pluginA);
    fs.mkdirSync(pluginB);
    fs.mkdirSync(notPlugin);
    fs.writeFileSync(path.join(pluginA, 'plugin.json'), '{}');
    fs.writeFileSync(path.join(pluginB, 'plugin.json'), '{}');
    // notPlugin has no plugin.json

    const result = discoverPlugins(tmpDir);
    expect(result).toHaveLength(2);
    expect(result).toContain(pluginA);
    expect(result).toContain(pluginB);
  });

  it('ignores files (not directories) in plugins dir', () => {
    fs.writeFileSync(path.join(tmpDir, 'some-file.txt'), 'hello');
    const pluginA = path.join(tmpDir, 'plugin-a');
    fs.mkdirSync(pluginA);
    fs.writeFileSync(path.join(pluginA, 'plugin.json'), '{}');

    const result = discoverPlugins(tmpDir);
    expect(result).toHaveLength(1);
    expect(result).toContain(pluginA);
  });
});

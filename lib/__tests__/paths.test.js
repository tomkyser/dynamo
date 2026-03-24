'use strict';

const { describe, it, expect, beforeEach, afterEach, spyOn } = require('bun:test');
const path = require('node:path');
const fs = require('node:fs');
const { discoverRoot, createPaths, getPaths, _resetRoot } = require('../paths.cjs');

describe('discoverRoot', () => {
  let spy;

  beforeEach(() => {
    _resetRoot();
    spy = spyOn(fs, 'existsSync');
    spy.mockImplementation(() => false);
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('finds root via .dynamo marker file', () => {
    spy.mockImplementation((p) => p === path.join('/fake/project', '.dynamo'));
    const result = discoverRoot('/fake/project/lib');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('/fake/project');
  });

  it('walks multiple levels up to find .dynamo marker', () => {
    spy.mockImplementation((p) => p === path.join('/fake/project', '.dynamo'));
    const result = discoverRoot('/fake/project/core/services');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('/fake/project');
  });

  it('falls back to config.json when .dynamo is missing', () => {
    spy.mockImplementation((p) => p === path.join('/fake/project', 'config.json'));
    const result = discoverRoot('/fake/project/lib');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('/fake/project');
  });

  it('returns Err with ROOT_NOT_FOUND when neither marker exists', () => {
    spy.mockImplementation(() => false);
    const result = discoverRoot('/');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('ROOT_NOT_FOUND');
    expect(result.error.context).toBeDefined();
    expect(result.error.context.startDir).toBe('/');
  });

  it('checks .dynamo before config.json (priority)', () => {
    const checked = [];
    spy.mockImplementation((p) => {
      checked.push(path.basename(p));
      if (p === path.join('/fake/project', '.dynamo')) return true;
      if (p === path.join('/fake/project', 'config.json')) return true;
      return false;
    });
    const result = discoverRoot('/fake/project/lib');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('/fake/project');
    // At the /fake/project level, .dynamo should be checked first
    // Find the first occurrence of .dynamo and config.json at the project level
    const projectChecks = [];
    for (let i = 0; i < checked.length; i++) {
      if (checked[i] === '.dynamo' || checked[i] === 'config.json') {
        projectChecks.push(checked[i]);
      }
    }
    // .dynamo should appear before config.json
    const dynIdx = projectChecks.indexOf('.dynamo');
    const cfgIdx = projectChecks.indexOf('config.json');
    expect(dynIdx).toBeLessThan(cfgIdx === -1 ? Infinity : cfgIdx);
  });

  it('caches the discovered root on subsequent calls', () => {
    let callCount = 0;
    spy.mockImplementation((p) => {
      callCount++;
      return p === path.join('/fake/project', '.dynamo');
    });
    const result1 = discoverRoot('/fake/project/lib');
    const firstCallCount = callCount;
    const result2 = discoverRoot('/fake/project/lib');
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(result1.value).toBe(result2.value);
    // Second call should not invoke existsSync again (cached)
    expect(callCount).toBe(firstCallCount);
  });

  it('clears cache when _resetRoot() is called', () => {
    spy.mockImplementation((p) => p === path.join('/fake/project', '.dynamo'));
    const result1 = discoverRoot('/fake/project/lib');
    expect(result1.ok).toBe(true);

    _resetRoot();

    // Now change mock to simulate a different root
    spy.mockImplementation((p) => p === path.join('/other/project', '.dynamo'));
    const result2 = discoverRoot('/other/project/lib');
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe('/other/project');
  });

  it('returns an absolute path', () => {
    spy.mockImplementation((p) => p === path.join('/fake/project', '.dynamo'));
    const result = discoverRoot('/fake/project/lib');
    expect(result.ok).toBe(true);
    expect(path.isAbsolute(result.value)).toBe(true);
  });
});

describe('createPaths', () => {
  it('returns root as the given root directory', () => {
    const paths = createPaths('/fake/root');
    expect(paths.root).toBe('/fake/root');
  });

  it('returns correct lib path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.lib).toBe('/fake/root/lib');
  });

  it('returns correct core path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.core).toBe('/fake/root/core');
  });

  it('returns correct services path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.services).toBe('/fake/root/core/services');
  });

  it('returns correct providers path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.providers).toBe('/fake/root/core/providers');
  });

  it('returns correct armature path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.armature).toBe('/fake/root/core/armature');
  });

  it('returns correct sdk path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.sdk).toBe('/fake/root/core/sdk');
  });

  it('returns correct circuit path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.circuit).toBe('/fake/root/core/sdk/circuit');
  });

  it('returns correct pulley path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.pulley).toBe('/fake/root/core/sdk/pulley');
  });

  it('returns correct plugins path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.plugins).toBe('/fake/root/plugins');
  });

  it('returns correct modules path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.modules).toBe('/fake/root/modules');
  });

  it('returns correct extensions path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.extensions).toBe('/fake/root/extensions');
  });

  it('returns correct config path', () => {
    const paths = createPaths('/fake/root');
    expect(paths.config).toBe('/fake/root/config.json');
  });

  it('all returned paths are absolute', () => {
    const paths = createPaths('/fake/root');
    for (const [key, value] of Object.entries(paths)) {
      expect(path.isAbsolute(value)).toBe(true);
    }
  });

  it('all returned values are strings', () => {
    const paths = createPaths('/fake/root');
    for (const [key, value] of Object.entries(paths)) {
      expect(typeof value).toBe('string');
    }
  });
});

describe('getPaths', () => {
  let spy;

  beforeEach(() => {
    _resetRoot();
    spy = spyOn(fs, 'existsSync');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('returns Ok with path registry when discoverRoot succeeds', () => {
    spy.mockImplementation((p) => p === path.join('/fake/project', '.dynamo'));
    const result = getPaths('/fake/project/lib');
    expect(result.ok).toBe(true);
    expect(result.value.root).toBe('/fake/project');
    expect(result.value.lib).toBe('/fake/project/lib');
    expect(result.value.services).toBe('/fake/project/core/services');
  });

  it('returns Err when discoverRoot fails', () => {
    spy.mockImplementation(() => false);
    const result = getPaths('/');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('ROOT_NOT_FOUND');
  });
});

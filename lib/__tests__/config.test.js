'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { deepMerge, envToConfig, loadConfig } = require('../config.cjs');

/**
 * Helper: creates a temporary directory and returns { dir, cleanup }.
 */
function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-config-test-'));
  return {
    dir,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Helper: writes a JSON file synchronously.
 */
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── deepMerge ─────────────────────────────────────────

describe('deepMerge', () => {
  it('merges two flat objects', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('overrides scalar with scalar', () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it('deep merges nested objects', () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3 } })).toEqual({ a: { b: 1, c: 3 } });
  });

  it('replaces arrays (not concatenate) per D-07', () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });

  it('replaces nested arrays', () => {
    expect(deepMerge({ a: { b: [1] } }, { a: { b: [2, 3] } })).toEqual({ a: { b: [2, 3] } });
  });

  it('scalar overridden by object', () => {
    expect(deepMerge({ a: 1 }, { a: { b: 2 } })).toEqual({ a: { b: 2 } });
  });

  it('object overridden by scalar', () => {
    expect(deepMerge({ a: { b: 2 } }, { a: 1 })).toEqual({ a: 1 });
  });

  it('null is a valid value (not recursed into)', () => {
    expect(deepMerge({}, { a: null })).toEqual({ a: null });
  });

  it('does not mutate either input object', () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    const targetCopy = JSON.parse(JSON.stringify(target));
    const sourceCopy = JSON.parse(JSON.stringify(source));

    deepMerge(target, source);

    expect(target).toEqual(targetCopy);
    expect(source).toEqual(sourceCopy);
  });
});

// ─── envToConfig ───────────────────────────────────────

describe('envToConfig', () => {
  it('maps DYNAMO_PORT with numeric coercion', () => {
    expect(envToConfig({ DYNAMO_PORT: '3000' })).toEqual({ port: 3000 });
  });

  it('maps DYNAMO_DEBUG=true to boolean true', () => {
    expect(envToConfig({ DYNAMO_DEBUG: 'true' })).toEqual({ debug: true });
  });

  it('maps DYNAMO_DEBUG=false to boolean false', () => {
    expect(envToConfig({ DYNAMO_DEBUG: 'false' })).toEqual({ debug: false });
  });

  it('maps DYNAMO_VALUE=null to null', () => {
    expect(envToConfig({ DYNAMO_VALUE: 'null' })).toEqual({ value: null });
  });

  it('maps DYNAMO_DB_HOST to nested path { db: { host: ... } }', () => {
    expect(envToConfig({ DYNAMO_DB_HOST: 'localhost' })).toEqual({ db: { host: 'localhost' } });
  });

  it('maps DYNAMO_DB_PORT to nested path with numeric coercion', () => {
    expect(envToConfig({ DYNAMO_DB_PORT: '5432' })).toEqual({ db: { port: 5432 } });
  });

  it('ignores non-DYNAMO_ vars', () => {
    expect(envToConfig({ OTHER_VAR: 'x', DYNAMO_A: 'b' })).toEqual({ a: 'b' });
  });

  it('returns empty object for empty input', () => {
    expect(envToConfig({})).toEqual({});
  });

  it('preserves string values that are not boolean/null/numeric', () => {
    expect(envToConfig({ DYNAMO_NAME: 'hello world' })).toEqual({ name: 'hello world' });
  });
});

// ─── loadConfig ────────────────────────────────────────

describe('loadConfig', () => {
  let tmp;

  beforeEach(() => {
    tmp = tmpDir();
  });

  afterEach(() => {
    tmp.cleanup();
  });

  const simpleSchema = {
    port: { type: 'number', default: 80 },
    debug: { type: 'boolean', default: false },
    name: { type: 'string', default: 'dynamo' },
  };

  it('returns Ok with validated config when only defaults provided', () => {
    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(80);
    expect(result.value.debug).toBe(false);
    expect(result.value.name).toBe('dynamo');
  });

  it('merges global config.json over defaults', () => {
    const globalPath = path.join(tmp.dir, 'global-config.json');
    writeJson(globalPath, { port: 3000 });

    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
      globalConfigPath: globalPath,
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(3000);
    expect(result.value.debug).toBe(false);
  });

  it('merges project config over global config', () => {
    const globalPath = path.join(tmp.dir, 'global-config.json');
    const projectPath = path.join(tmp.dir, 'project-config.json');
    writeJson(globalPath, { port: 3000 });
    writeJson(projectPath, { port: 8080 });

    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
      globalConfigPath: globalPath,
      projectConfigPath: projectPath,
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(8080);
  });

  it('merges DYNAMO_* env vars over file configs', () => {
    const globalPath = path.join(tmp.dir, 'global-config.json');
    writeJson(globalPath, { port: 3000 });

    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
      globalConfigPath: globalPath,
      env: { DYNAMO_PORT: '9090' },
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(9090);
  });

  it('merges runtime options over everything (highest precedence)', () => {
    const globalPath = path.join(tmp.dir, 'global-config.json');
    writeJson(globalPath, { port: 3000 });

    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
      globalConfigPath: globalPath,
      env: { DYNAMO_PORT: '9090' },
      runtimeOverrides: { port: 4000 },
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(4000);
  });

  it('returns Err when schema validation fails', () => {
    const strictSchema = {
      port: { type: 'number', required: true },
      host: { type: 'string', required: true },
    };

    const result = loadConfig({
      defaults: { port: 3000 },
      schema: strictSchema,
      env: {},
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('returns Ok with defaults when no config files exist', () => {
    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
      globalConfigPath: path.join(tmp.dir, 'nonexistent.json'),
      projectConfigPath: path.join(tmp.dir, 'also-nonexistent.json'),
      env: {},
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(80);
  });

  it('validates the merged result against the provided schema', () => {
    const typedSchema = {
      port: { type: 'number', required: true },
    };

    // Provide port as string via env var which coerces to number
    const result = loadConfig({
      defaults: {},
      schema: typedSchema,
      env: { DYNAMO_PORT: '8080' },
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(8080);
  });

  it('full 5-level precedence: runtime wins over all', () => {
    const globalPath = path.join(tmp.dir, 'global.json');
    const projectPath = path.join(tmp.dir, 'project.json');
    writeJson(globalPath, { port: 3000 });
    writeJson(projectPath, { port: 8080 });

    const result = loadConfig({
      defaults: { port: 80, debug: false, name: 'dynamo' },
      schema: simpleSchema,
      globalConfigPath: globalPath,
      projectConfigPath: projectPath,
      env: { DYNAMO_PORT: '9090' },
      runtimeOverrides: { port: 4000 },
    });
    expect(result.ok).toBe(true);
    expect(result.value.port).toBe(4000);
  });

  it('returns Ok without validation when no schema provided', () => {
    const result = loadConfig({
      defaults: { anything: 'goes' },
      env: {},
    });
    expect(result.ok).toBe(true);
    expect(result.value.anything).toBe('goes');
  });
});

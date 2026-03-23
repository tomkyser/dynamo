'use strict';

const { describe, it, expect } = require('bun:test');
const { MODULE_MANIFEST_SCHEMA, validateModuleManifest } = require('../module-manifest.cjs');

describe('validateModuleManifest', () => {
  const validManifest = {
    name: 'reverie',
    version: '1.0.0',
    main: 'index.cjs',
  };

  it('valid manifest passes validation', () => {
    const result = validateModuleManifest(validManifest);
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe('reverie');
    expect(result.value.version).toBe('1.0.0');
    expect(result.value.main).toBe('index.cjs');
  });

  it('missing name returns validation error', () => {
    const result = validateModuleManifest({ version: '1.0.0', main: 'index.cjs' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('missing version returns validation error', () => {
    const result = validateModuleManifest({ name: 'test', main: 'index.cjs' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('missing main returns validation error', () => {
    const result = validateModuleManifest({ name: 'test', version: '1.0.0' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
  });

  it('manifest with hooks passes with hooks preserved', () => {
    const manifest = {
      ...validManifest,
      hooks: { 'hook:SessionStart': 'onSessionStart' },
    };
    const result = validateModuleManifest(manifest);
    expect(result.ok).toBe(true);
    expect(result.value.hooks).toEqual({ 'hook:SessionStart': 'onSessionStart' });
  });

  it('default enabled=true applied when omitted', () => {
    const result = validateModuleManifest(validManifest);
    expect(result.ok).toBe(true);
    expect(result.value.enabled).toBe(true);
  });

  it('default dependencies applied when omitted', () => {
    const result = validateModuleManifest(validManifest);
    expect(result.ok).toBe(true);
    expect(result.value.dependencies).toEqual({ services: [], providers: [] });
  });
});

describe('MODULE_MANIFEST_SCHEMA', () => {
  it('has hooks field definition', () => {
    expect(MODULE_MANIFEST_SCHEMA.hooks).toBeDefined();
    expect(MODULE_MANIFEST_SCHEMA.hooks.type).toBe('object');
  });
});

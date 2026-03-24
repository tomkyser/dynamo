'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createClaudeMdManager } = require('../claudemd-manager.cjs');

/**
 * Creates a test-double lathe that operates on real filesystem via tmpDir.
 */
function createTestLathe(tmpDir) {
  return {
    readFile(p) {
      try { return { ok: true, value: fs.readFileSync(p, 'utf8') }; }
      catch (e) { return { ok: false, error: { code: 'FILE_NOT_FOUND', message: e.message } }; }
    },
    readJson(p) {
      try { return { ok: true, value: JSON.parse(fs.readFileSync(p, 'utf8')) }; }
      catch (e) { return { ok: false, error: { code: 'READ_FAILED', message: e.message } }; }
    },
    writeJson(p, data) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      return { ok: true, value: undefined };
    },
    async writeFileAtomic(p, content) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
      return { ok: true, value: undefined };
    },
    exists(p) { return { ok: true, value: fs.existsSync(p) }; },
    mkdir(p) { fs.mkdirSync(p, { recursive: true }); return { ok: true, value: undefined }; },
    listDir(p) {
      try { return { ok: true, value: fs.readdirSync(p) }; }
      catch (e) { return { ok: false, error: { code: 'DIR_NOT_FOUND', message: e.message } }; }
    },
  };
}

describe('claudemd-manager', () => {
  let tmpDir;
  let lathe;
  let manager;
  let claudeMdPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-claudemd-test-'));
    lathe = createTestLathe(tmpDir);
    manager = createClaudeMdManager({ lathe });
    claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('createClaudeMdManager returns object with required methods', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.claimSection).toBe('function');
    expect(typeof manager.updateSection).toBe('function');
    expect(typeof manager.releaseSection).toBe('function');
    expect(typeof manager.hasSection).toBe('function');
  });

  it('claimSection inserts section with dynamo:section markers', async () => {
    const result = await manager.claimSection('reverie', 'Reverie config here', claudeMdPath);
    expect(result.ok).toBe(true);

    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).toContain('<!-- dynamo:section:reverie:start -->');
    expect(content).toContain('Reverie config here');
    expect(content).toContain('<!-- dynamo:section:reverie:end -->');
  });

  it('claimSection on non-existent file creates file with section', async () => {
    expect(fs.existsSync(claudeMdPath)).toBe(false);
    const result = await manager.claimSection('reverie', 'New section', claudeMdPath);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(claudeMdPath)).toBe(true);

    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).toContain('<!-- dynamo:section:reverie:start -->');
    expect(content).toContain('New section');
  });

  it('claimSection returns err SECTION_EXISTS if already claimed', async () => {
    await manager.claimSection('reverie', 'First claim', claudeMdPath);
    const result = await manager.claimSection('reverie', 'Second claim', claudeMdPath);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SECTION_EXISTS');
  });

  it('updateSection replaces content between markers', async () => {
    await manager.claimSection('reverie', 'Original content', claudeMdPath);
    const result = await manager.updateSection('reverie', 'Updated content', claudeMdPath);
    expect(result.ok).toBe(true);

    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).not.toContain('Original content');
    expect(content).toContain('Updated content');
    expect(content).toContain('<!-- dynamo:section:reverie:start -->');
    expect(content).toContain('<!-- dynamo:section:reverie:end -->');
  });

  it('updateSection returns err SECTION_NOT_FOUND if markers not present', async () => {
    fs.writeFileSync(claudeMdPath, '# My CLAUDE.md\n');
    const result = await manager.updateSection('reverie', 'New content', claudeMdPath);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SECTION_NOT_FOUND');
  });

  it('releaseSection removes markers and content', async () => {
    fs.writeFileSync(claudeMdPath, '# Header\n\nSome text\n');
    await manager.claimSection('reverie', 'Section content', claudeMdPath);
    const result = await manager.releaseSection('reverie', claudeMdPath);
    expect(result.ok).toBe(true);

    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).not.toContain('<!-- dynamo:section:reverie:start -->');
    expect(content).not.toContain('Section content');
    expect(content).not.toContain('<!-- dynamo:section:reverie:end -->');
    expect(content).toContain('# Header');
  });

  it('hasSection returns true when markers present, false otherwise', async () => {
    expect(manager.hasSection('reverie', claudeMdPath)).toBe(false);
    await manager.claimSection('reverie', 'Content', claudeMdPath);
    expect(manager.hasSection('reverie', claudeMdPath)).toBe(true);
  });

  it('multiple sections coexist without interfering', async () => {
    await manager.claimSection('reverie', 'Reverie content', claudeMdPath);
    await manager.claimSection('other', 'Other content', claudeMdPath);

    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).toContain('<!-- dynamo:section:reverie:start -->');
    expect(content).toContain('Reverie content');
    expect(content).toContain('<!-- dynamo:section:reverie:end -->');
    expect(content).toContain('<!-- dynamo:section:other:start -->');
    expect(content).toContain('Other content');
    expect(content).toContain('<!-- dynamo:section:other:end -->');

    expect(manager.hasSection('reverie', claudeMdPath)).toBe(true);
    expect(manager.hasSection('other', claudeMdPath)).toBe(true);
  });

  it('section markers use correct format with dynamo:section prefix', async () => {
    await manager.claimSection('test-module', 'Module content', claudeMdPath);
    const content = fs.readFileSync(claudeMdPath, 'utf8');
    expect(content).toContain('<!-- dynamo:section:test-module:start -->');
    expect(content).toContain('<!-- dynamo:section:test-module:end -->');
  });
});

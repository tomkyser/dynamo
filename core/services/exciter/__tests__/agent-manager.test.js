'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createAgentManager } = require('../agent-manager.cjs');

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
    deleteFile(p) {
      try { fs.unlinkSync(p); return { ok: true, value: undefined }; }
      catch (e) { return { ok: false, error: { code: 'FILE_NOT_FOUND', message: e.message } }; }
    },
  };
}

describe('agent-manager', () => {
  let tmpDir;
  let lathe;
  let manager;
  let agentsDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-agent-test-'));
    agentsDir = path.join(tmpDir, '.claude', 'agents');
    lathe = createTestLathe(tmpDir);
    manager = createAgentManager({ lathe });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('createAgentManager returns object with required methods', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.installAgent).toBe('function');
    expect(typeof manager.removeAgent).toBe('function');
    expect(typeof manager.listAgents).toBe('function');
    expect(typeof manager.getAgent).toBe('function');
  });

  it('installAgent writes .md file with YAML frontmatter and body', async () => {
    const definition = {
      frontmatter: {
        name: 'reverie-formation',
        description: 'Fragment formation agent',
        tools: 'Read, Write, Bash',
        model: 'sonnet',
        background: true,
        permissionMode: 'bypassPermissions',
        maxTurns: 10,
      },
      body: '# Reverie Formation Agent\n\nYou are a formation agent.',
    };

    const result = await manager.installAgent('reverie-formation', definition, agentsDir);
    expect(result.ok).toBe(true);

    const filePath = path.join(agentsDir, 'reverie-formation.md');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('---');
    expect(content).toContain('name: reverie-formation');
    expect(content).toContain('description: Fragment formation agent');
    expect(content).toContain('background: true');
    expect(content).toContain('maxTurns: 10');
    expect(content).toContain('# Reverie Formation Agent');
  });

  it('installAgent overwrites existing file for same agent name', async () => {
    const def1 = {
      frontmatter: { name: 'test-agent', description: 'Version 1' },
      body: 'Body v1',
    };
    const def2 = {
      frontmatter: { name: 'test-agent', description: 'Version 2' },
      body: 'Body v2',
    };

    await manager.installAgent('test-agent', def1, agentsDir);
    await manager.installAgent('test-agent', def2, agentsDir);

    const content = fs.readFileSync(path.join(agentsDir, 'test-agent.md'), 'utf8');
    expect(content).toContain('Version 2');
    expect(content).toContain('Body v2');
    expect(content).not.toContain('Version 1');
  });

  it('removeAgent deletes the file and returns ok', async () => {
    const definition = {
      frontmatter: { name: 'to-remove' },
      body: 'Will be removed',
    };
    await manager.installAgent('to-remove', definition, agentsDir);
    expect(fs.existsSync(path.join(agentsDir, 'to-remove.md'))).toBe(true);

    const result = manager.removeAgent('to-remove', agentsDir);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'to-remove.md'))).toBe(false);
  });

  it('removeAgent returns err AGENT_NOT_FOUND if file does not exist', () => {
    const result = manager.removeAgent('nonexistent', agentsDir);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('AGENT_NOT_FOUND');
  });

  it('listAgents returns array of { name, path } for all .md files', async () => {
    await manager.installAgent('agent-a', { frontmatter: { name: 'agent-a' }, body: 'A' }, agentsDir);
    await manager.installAgent('agent-b', { frontmatter: { name: 'agent-b' }, body: 'B' }, agentsDir);

    const result = manager.listAgents(agentsDir);
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(2);

    const names = result.value.map(a => a.name).sort();
    expect(names).toEqual(['agent-a', 'agent-b']);

    // Each entry should have a path
    for (const agent of result.value) {
      expect(agent.path).toContain(agentsDir);
      expect(agent.path).toContain('.md');
    }
  });

  it('listAgents returns empty array if directory does not exist', () => {
    const result = manager.listAgents(path.join(tmpDir, 'nonexistent'));
    expect(result.ok).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('getAgent reads and returns parsed frontmatter and body', async () => {
    const definition = {
      frontmatter: {
        name: 'test-read',
        description: 'Read test',
        model: 'sonnet',
        background: true,
      },
      body: '# Test Agent\n\nAgent instructions here.',
    };
    await manager.installAgent('test-read', definition, agentsDir);

    const result = manager.getAgent('test-read', agentsDir);
    expect(result.ok).toBe(true);
    expect(result.value.frontmatter.name).toBe('test-read');
    expect(result.value.frontmatter.description).toBe('Read test');
    expect(result.value.frontmatter.model).toBe('sonnet');
    expect(result.value.body).toContain('# Test Agent');
    expect(result.value.body).toContain('Agent instructions here.');
  });
});

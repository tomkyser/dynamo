'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createJournal } = require('../journal.cjs');
const { createLathe } = require('../../../services/lathe/lathe.cjs');
const { createSwitchboard } = require('../../../services/switchboard/switchboard.cjs');
const { unwrap } = require('../../../../lib/index.cjs');

/**
 * Creates a temporary directory for test isolation.
 * @returns {string} Path to the temp directory
 */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'journal-test-'));
}

/**
 * Recursively removes a directory.
 * @param {string} dir - Directory path
 */
function cleanTmpDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) { /* ignore */ }
}

describe('createJournal', () => {
  it('returns Ok(frozen journal instance)', () => {
    const result = createJournal();
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('has all 8 DATA_PROVIDER_SHAPE methods', () => {
    const journal = unwrap(createJournal());
    const required = ['init', 'start', 'stop', 'healthCheck', 'read', 'write', 'query', 'delete'];
    for (const method of required) {
      expect(typeof journal[method]).toBe('function');
    }
  });
});

describe('journal lifecycle', () => {
  let tmpDir;
  let lathe;
  let switchboard;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    lathe = unwrap(createLathe());
    lathe.init();
    lathe.start();
    switchboard = unwrap(createSwitchboard());
    switchboard.init({});
    switchboard.start();
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('init succeeds with basePath and lathe', async () => {
    const journal = unwrap(createJournal());
    const result = await journal.init({ basePath: tmpDir, lathe, switchboard });
    expect(result.ok).toBe(true);
  });

  it('init fails without basePath', async () => {
    const journal = unwrap(createJournal());
    const result = await journal.init({ lathe });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INIT_FAILED');
  });

  it('init fails without lathe', async () => {
    const journal = unwrap(createJournal());
    const result = await journal.init({ basePath: tmpDir });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('INIT_FAILED');
  });

  it('healthCheck returns healthy: true after start', async () => {
    const journal = unwrap(createJournal());
    await journal.init({ basePath: tmpDir, lathe, switchboard });
    journal.start();
    const health = journal.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.value).toEqual({ healthy: true, name: 'journal' });
  });

  it('healthCheck returns healthy: false before start', async () => {
    const journal = unwrap(createJournal());
    await journal.init({ basePath: tmpDir, lathe, switchboard });
    const health = journal.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.value).toEqual({ healthy: false, name: 'journal' });
  });

  it('stop resets started state', async () => {
    const journal = unwrap(createJournal());
    await journal.init({ basePath: tmpDir, lathe, switchboard });
    journal.start();
    await journal.stop();
    const health = journal.healthCheck();
    expect(health.value.healthy).toBe(false);
  });
});

describe('journal CRUD operations', () => {
  let tmpDir;
  let lathe;
  let switchboard;
  let journal;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    lathe = unwrap(createLathe());
    lathe.init();
    lathe.start();
    switchboard = unwrap(createSwitchboard());
    switchboard.init({});
    switchboard.start();
    journal = unwrap(createJournal());
    await journal.init({ basePath: tmpDir, lathe, switchboard });
    journal.start();
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('write stores a file at basePath/id.md', async () => {
    const result = await journal.write('doc-1', { type: 'note', title: 'Hello' }, 'Body content');
    expect(result.ok).toBe(true);
    const filePath = path.join(tmpDir, 'doc-1.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('written file contains YAML frontmatter with fields', async () => {
    await journal.write('doc-1', { type: 'note', title: 'Hello' }, 'Body content');
    const filePath = path.join(tmpDir, 'doc-1.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('type: note');
    expect(content).toContain('title: Hello');
    expect(content).toContain('Body content');
  });

  it('read returns the document with id, data, and body', async () => {
    await journal.write('doc-1', { type: 'note', title: 'Hello' }, 'Body content');
    const result = await journal.read('doc-1');
    expect(result.ok).toBe(true);
    expect(result.value.id).toBe('doc-1');
    expect(result.value.data).toEqual({ type: 'note', title: 'Hello' });
    expect(result.value.body).toBe('Body content');
  });

  it('read returns NOT_FOUND for nonexistent document', async () => {
    const result = await journal.read('nonexistent');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('write updates existing file (overwrites)', async () => {
    await journal.write('doc-1', { type: 'note', title: 'Hello' }, 'Old body');
    await journal.write('doc-1', { type: 'updated', title: 'World' }, 'New body');
    const result = await journal.read('doc-1');
    expect(result.ok).toBe(true);
    expect(result.value.data).toEqual({ type: 'updated', title: 'World' });
    expect(result.value.body).toBe('New body');
  });

  it('delete removes the file', async () => {
    await journal.write('doc-1', { type: 'note', title: 'Hello' }, 'Body');
    const delResult = await journal.delete('doc-1');
    expect(delResult.ok).toBe(true);
    const readResult = await journal.read('doc-1');
    expect(readResult.ok).toBe(false);
    expect(readResult.error.code).toBe('NOT_FOUND');
  });

  it('delete returns NOT_FOUND for nonexistent document', async () => {
    const result = await journal.delete('nonexistent');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('write with combined frontmatter+body data object', async () => {
    const result = await journal.write('doc-2', {
      frontmatter: { type: 'note', title: 'Combined' },
      body: 'Combined body'
    });
    expect(result.ok).toBe(true);
    const readResult = await journal.read('doc-2');
    expect(readResult.value.data).toEqual({ type: 'note', title: 'Combined' });
    expect(readResult.value.body).toBe('Combined body');
  });
});

describe('journal query', () => {
  let tmpDir;
  let lathe;
  let switchboard;
  let journal;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    lathe = unwrap(createLathe());
    lathe.init();
    lathe.start();
    switchboard = unwrap(createSwitchboard());
    switchboard.init({});
    switchboard.start();
    journal = unwrap(createJournal());
    await journal.init({ basePath: tmpDir, lathe, switchboard });
    journal.start();

    // Seed test data
    await journal.write('note-1', { type: 'note', category: 'work' }, 'Note 1 body');
    await journal.write('note-2', { type: 'note', category: 'personal' }, 'Note 2 body');
    await journal.write('frag-1', { type: 'experiential', category: 'work' }, 'Fragment body');
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('query with matching criteria returns filtered results', async () => {
    const result = await journal.query({ type: 'note' });
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(2);
    const ids = result.value.map(d => d.id).sort();
    expect(ids).toEqual(['note-1', 'note-2']);
  });

  it('query with empty criteria returns all documents', async () => {
    const result = await journal.query({});
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(3);
  });

  it('query with multiple criteria ANDs them', async () => {
    const result = await journal.query({ type: 'note', category: 'work' });
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].id).toBe('note-1');
  });

  it('query with no matches returns empty array', async () => {
    const result = await journal.query({ type: 'nonexistent' });
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(0);
  });

  it('query with _limit restricts number of results', async () => {
    const result = await journal.query({ _limit: 2 });
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(2);
  });

  it('query with null criteria returns all documents', async () => {
    const result = await journal.query(null);
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(3);
  });
});

describe('journal switchboard events', () => {
  let tmpDir;
  let lathe;
  let switchboard;
  let journal;
  let emittedEvents;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    lathe = unwrap(createLathe());
    lathe.init();
    lathe.start();
    switchboard = unwrap(createSwitchboard());
    switchboard.init({});
    switchboard.start();

    // Track emitted events
    emittedEvents = [];
    switchboard.on('data:written', (payload) => {
      emittedEvents.push({ event: 'data:written', payload });
    });
    switchboard.on('data:deleted', (payload) => {
      emittedEvents.push({ event: 'data:deleted', payload });
    });

    journal = unwrap(createJournal());
    await journal.init({ basePath: tmpDir, lathe, switchboard });
    journal.start();
  });

  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it('emits data:written on write', async () => {
    await journal.write('doc-1', { type: 'note' }, 'Body');
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].event).toBe('data:written');
    expect(emittedEvents[0].payload.provider).toBe('journal');
    expect(emittedEvents[0].payload.id).toBe('doc-1');
  });

  it('emits data:deleted on delete', async () => {
    await journal.write('doc-1', { type: 'note' }, 'Body');
    emittedEvents = []; // Clear write event
    await journal.delete('doc-1');
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].event).toBe('data:deleted');
    expect(emittedEvents[0].payload.provider).toBe('journal');
    expect(emittedEvents[0].payload.id).toBe('doc-1');
  });

  it('works without switchboard (no events emitted, no error)', async () => {
    const journal2 = unwrap(createJournal());
    await journal2.init({ basePath: tmpDir, lathe });
    journal2.start();
    // Should not throw
    const result = await journal2.write('doc-no-sb', { type: 'note' }, 'Body');
    expect(result.ok).toBe(true);
  });
});

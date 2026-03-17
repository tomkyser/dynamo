// Dynamo > Tests > sessions.test.cjs
'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Module under test -- loaded from the live deployed location
const sessions = require(path.join(__dirname, '..', 'lib', 'ledger', 'sessions.cjs'));

// --- Test isolation: use temp directory for sessions.json ---
const tmpBase = path.join(os.tmpdir(), 'dynamo-sessions-test-' + process.pid);

function tmpFile(name) {
  return path.join(tmpBase, name || 'sessions.json');
}

before(() => {
  fs.mkdirSync(tmpBase, { recursive: true });
});

after(() => {
  try { fs.rmSync(tmpBase, { recursive: true }); } catch {}
});

beforeEach(() => {
  // Clean up any leftover test files
  const files = fs.readdirSync(tmpBase);
  for (const f of files) {
    try { fs.unlinkSync(path.join(tmpBase, f)); } catch {}
  }
});

// ========================================
// loadSessions
// ========================================
describe('loadSessions', () => {
  it('returns empty array when file does not exist', () => {
    const result = sessions.loadSessions(path.join(tmpBase, 'nonexistent.json'));
    assert.deepStrictEqual(result, []);
  });

  it('returns empty array when file contains invalid JSON', () => {
    const fp = tmpFile('bad.json');
    fs.writeFileSync(fp, 'this is not json!!!', 'utf8');
    const result = sessions.loadSessions(fp);
    assert.deepStrictEqual(result, []);
  });

  it('returns parsed array when file contains valid JSON array', () => {
    const fp = tmpFile();
    const data = [{ timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'Test', labeled_by: 'auto' }];
    fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
    const result = sessions.loadSessions(fp);
    assert.deepStrictEqual(result, data);
  });

  it('returns empty array when file contains non-array JSON', () => {
    const fp = tmpFile('obj.json');
    fs.writeFileSync(fp, JSON.stringify({ not: 'an array' }), 'utf8');
    const result = sessions.loadSessions(fp);
    assert.deepStrictEqual(result, []);
  });
});

// ========================================
// saveSessions
// ========================================
describe('saveSessions', () => {
  it('writes JSON with 2-space indentation and trailing newline', () => {
    const fp = tmpFile();
    const data = [{ timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'Test', labeled_by: 'auto' }];
    sessions.saveSessions(data, fp);
    const content = fs.readFileSync(fp, 'utf8');
    assert.strictEqual(content, JSON.stringify(data, null, 2) + '\n');
  });

  it('uses atomic write pattern (no .tmp file left behind)', () => {
    const fp = tmpFile();
    sessions.saveSessions([], fp);
    assert.ok(fs.existsSync(fp), 'Target file should exist');
    assert.ok(!fs.existsSync(fp + '.tmp'), '.tmp file should not remain');
  });

  it('creates parent directory if it does not exist', () => {
    const nested = path.join(tmpBase, 'nested', 'dir', 'sessions.json');
    sessions.saveSessions([{ timestamp: 'test' }], nested);
    assert.ok(fs.existsSync(nested), 'File should exist in nested dir');
  });
});

// ========================================
// indexSession
// ========================================
describe('indexSession', () => {
  it('adds new entry with timestamp, project, label, labeled_by fields', () => {
    const fp = tmpFile();
    sessions.saveSessions([], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'my-project', 'New Session', 'auto', { filePath: fp });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].timestamp, '2026-01-01T00:00:00Z');
    assert.strictEqual(data[0].project, 'my-project');
    assert.strictEqual(data[0].label, 'New Session');
    assert.strictEqual(data[0].labeled_by, 'auto');
  });

  it('updates existing entry (matched by timestamp) label and labeled_by', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'Old', labeled_by: 'auto' }
    ], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'test', 'Updated', 'auto', { filePath: fp });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].label, 'Updated');
  });

  it('never overwrites entry where labeled_by is user (regression test 12 contract)', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'My Custom Name', labeled_by: 'user' }
    ], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'test', 'Auto Name', 'auto', { filePath: fp });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].label, 'My Custom Name');
    assert.strictEqual(data[0].labeled_by, 'user');
  });

  it('does not overwrite existing label with empty string', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'Has Label', labeled_by: 'auto' }
    ], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'test', '', 'auto', { filePath: fp });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].label, 'Has Label');
  });

  it('updates project field if new project is non-empty and not unknown', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'old-project', label: 'Test', labeled_by: 'auto' }
    ], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'new-project', 'Test', 'auto', { filePath: fp });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].project, 'new-project');
  });

  it('does not update project when new project is "unknown"', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'real-project', label: 'Test', labeled_by: 'auto' }
    ], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'unknown', 'Test', 'auto', { filePath: fp });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].project, 'real-project');
  });

  it('supports named_phase field via options.namedPhase', () => {
    const fp = tmpFile();
    sessions.saveSessions([], fp);
    sessions.indexSession('2026-01-01T00:00:00Z', 'test', 'Auto Name', 'auto', { filePath: fp, namedPhase: 'preliminary' });
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].named_phase, 'preliminary');
  });
});

// ========================================
// listSessions
// ========================================
describe('listSessions', () => {
  it('returns sessions sorted by timestamp descending', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'First', labeled_by: 'auto' },
      { timestamp: '2026-01-03T00:00:00Z', project: 'test', label: 'Third', labeled_by: 'auto' },
      { timestamp: '2026-01-02T00:00:00Z', project: 'test', label: 'Second', labeled_by: 'auto' }
    ], fp);
    const result = sessions.listSessions({ filePath: fp });
    assert.strictEqual(result[0].label, 'Third');
    assert.strictEqual(result[1].label, 'Second');
    assert.strictEqual(result[2].label, 'First');
  });

  it('accepts optional limit parameter', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'A', labeled_by: 'auto' },
      { timestamp: '2026-01-02T00:00:00Z', project: 'test', label: 'B', labeled_by: 'auto' },
      { timestamp: '2026-01-03T00:00:00Z', project: 'test', label: 'C', labeled_by: 'auto' }
    ], fp);
    const result = sessions.listSessions({ filePath: fp, limit: 2 });
    assert.strictEqual(result.length, 2);
  });

  it('accepts optional project filter', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'alpha', label: 'A', labeled_by: 'auto' },
      { timestamp: '2026-01-02T00:00:00Z', project: 'beta', label: 'B', labeled_by: 'auto' },
      { timestamp: '2026-01-03T00:00:00Z', project: 'alpha', label: 'C', labeled_by: 'auto' }
    ], fp);
    const result = sessions.listSessions({ filePath: fp, project: 'alpha' });
    assert.strictEqual(result.length, 2);
    assert.ok(result.every(s => s.project === 'alpha'));
  });
});

// ========================================
// viewSession
// ========================================
describe('viewSession', () => {
  it('returns single session entry matching timestamp', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'Target', labeled_by: 'auto' },
      { timestamp: '2026-01-02T00:00:00Z', project: 'test', label: 'Other', labeled_by: 'auto' }
    ], fp);
    const result = sessions.viewSession('2026-01-01T00:00:00Z', { filePath: fp });
    assert.strictEqual(result.label, 'Target');
  });

  it('returns null when no match found', () => {
    const fp = tmpFile();
    sessions.saveSessions([], fp);
    const result = sessions.viewSession('nonexistent', { filePath: fp });
    assert.strictEqual(result, null);
  });
});

// ========================================
// labelSession
// ========================================
describe('labelSession', () => {
  it('sets label and labeled_by=user for entry matching timestamp', () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: 'Auto Name', labeled_by: 'auto' }
    ], fp);
    const result = sessions.labelSession('2026-01-01T00:00:00Z', 'My Custom Name', { filePath: fp });
    assert.strictEqual(result, true);
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].label, 'My Custom Name');
    assert.strictEqual(data[0].labeled_by, 'user');
  });

  it('returns false when no match found', () => {
    const fp = tmpFile();
    sessions.saveSessions([], fp);
    const result = sessions.labelSession('nonexistent', 'label', { filePath: fp });
    assert.strictEqual(result, false);
  });
});

// ========================================
// backfillSessions
// ========================================
describe('backfillSessions', () => {
  it('updates entries with empty labels using provided label function', async () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: '', labeled_by: 'auto' },
      { timestamp: '2026-01-02T00:00:00Z', project: 'test', label: 'Has Label', labeled_by: 'auto' }
    ], fp);
    const count = await sessions.backfillSessions(async (entry) => 'Generated: ' + entry.timestamp, { filePath: fp });
    assert.strictEqual(count, 1);
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].label, 'Generated: 2026-01-01T00:00:00Z');
    assert.strictEqual(data[1].label, 'Has Label');
  });

  it('skips entries where labeled_by is user', async () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: '', labeled_by: 'user' }
    ], fp);
    const count = await sessions.backfillSessions(async () => 'Should Not Apply', { filePath: fp });
    assert.strictEqual(count, 0);
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].label, '');
    assert.strictEqual(data[0].labeled_by, 'user');
  });
});

// ========================================
// generateAndApplyName
// ========================================
describe('generateAndApplyName', () => {
  it('applies name via indexSession with named_phase tracking', async () => {
    const fp = tmpFile();
    sessions.saveSessions([
      { timestamp: '2026-01-01T00:00:00Z', project: 'test', label: '', labeled_by: 'auto' }
    ], fp);
    const name = await sessions.generateAndApplyName(
      '2026-01-01T00:00:00Z',
      'test',
      async () => 'Generated Name',
      'preliminary',
      { filePath: fp }
    );
    assert.strictEqual(name, 'Generated Name');
    const data = sessions.loadSessions(fp);
    assert.strictEqual(data[0].label, 'Generated Name');
    assert.strictEqual(data[0].named_phase, 'preliminary');
  });

  it('returns empty string on generator failure', async () => {
    const fp = tmpFile();
    sessions.saveSessions([], fp);
    const name = await sessions.generateAndApplyName(
      '2026-01-01T00:00:00Z',
      'test',
      async () => null,
      'preliminary',
      { filePath: fp }
    );
    assert.strictEqual(name, '');
  });
});

// ========================================
// SESSIONS_FILE constant
// ========================================
describe('SESSIONS_FILE', () => {
  it('points to ~/.claude/graphiti/sessions.json', () => {
    assert.ok(sessions.SESSIONS_FILE.endsWith(path.join('.claude', 'graphiti', 'sessions.json')));
  });

  it('is an absolute path', () => {
    assert.ok(path.isAbsolute(sessions.SESSIONS_FILE));
  });
});

// ========================================
// Real sessions.json compatibility
// ========================================
describe('real sessions.json compatibility', () => {
  it('can load the real sessions.json without error', () => {
    const realPath = path.join(os.homedir(), '.claude', 'graphiti', 'sessions.json');
    if (fs.existsSync(realPath)) {
      const result = sessions.loadSessions(realPath);
      assert.ok(Array.isArray(result), 'Should return an array');
      assert.ok(result.length > 0, 'Real sessions.json should have entries');
      // Verify structure of first entry
      const first = result[0];
      assert.ok('timestamp' in first, 'Entry should have timestamp');
      assert.ok('project' in first, 'Entry should have project');
      assert.ok('labeled_by' in first, 'Entry should have labeled_by');
    }
  });
});

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const { createLithograph } = require('../lithograph.cjs');

/**
 * Creates a mock Lathe service for testing.
 * Uses real filesystem for reads but tracks writeFileAtomic calls.
 * @param {Object} opts - Options for controlling mock behavior
 * @param {boolean} [opts.failWrite=false] - If true, writeFileAtomic returns err
 * @returns {Object} Mock lathe with call tracking
 */
function createMockLathe(opts = {}) {
  const _calls = [];
  return {
    readFile(p) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        return { ok: true, value: content };
      } catch (e) {
        return { ok: false, error: { code: 'READ_FAILED', message: e.message } };
      }
    },
    async writeFileAtomic(p, content) {
      _calls.push({ writeFileAtomic: p, content });
      if (opts.failWrite) {
        return { ok: false, error: { code: 'WRITE_FAILED', message: 'mock fail' } };
      }
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
      return { ok: true, value: undefined };
    },
    getCalls() { return _calls; },
    // lifecycle stubs
    init() { return { ok: true, value: undefined }; },
    start() { return { ok: true, value: undefined }; },
    stop() { return { ok: true, value: undefined }; },
    healthCheck() { return { ok: true, value: { status: 'healthy' } }; },
  };
}

/**
 * Creates a sample JSONL transcript string.
 */
function sampleTranscript() {
  return [
    JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Read the file' }] }),
    JSON.stringify({ role: 'assistant', content: [
      { type: 'text', text: 'Let me read that.' },
      { type: 'tool_use', id: 'toolu_abc', name: 'Read', input: { file_path: '/src/index.ts' } }
    ]}),
    JSON.stringify({ role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'toolu_abc', content: 'export default function main() {}' }
    ]}),
    JSON.stringify({ role: 'assistant', content: [{ type: 'text', text: 'Here is the file content.' }] })
  ].join('\n');
}

describe('Lithograph Provider', () => {
  let tmpDir;
  let transcriptPath;
  let lathe;
  let lithograph;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lithograph-test-'));
    transcriptPath = path.join(tmpDir, 'transcript.jsonl');
    fs.writeFileSync(transcriptPath, sampleTranscript());
    lathe = createMockLathe();

    const result = createLithograph();
    expect(result.ok).toBe(true);
    lithograph = result.value;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('createLithograph', () => {
    it('returns ok result with frozen object containing all DATA_PROVIDER_SHAPE methods + setTranscriptPath', () => {
      const result = createLithograph();
      expect(result.ok).toBe(true);
      const provider = result.value;
      expect(typeof provider.init).toBe('function');
      expect(typeof provider.start).toBe('function');
      expect(typeof provider.stop).toBe('function');
      expect(typeof provider.healthCheck).toBe('function');
      expect(typeof provider.read).toBe('function');
      expect(typeof provider.write).toBe('function');
      expect(typeof provider.query).toBe('function');
      expect(typeof provider.delete).toBe('function');
      expect(typeof provider.setTranscriptPath).toBe('function');
      expect(Object.isFrozen(provider)).toBe(true);
    });
  });

  describe('init', () => {
    it('returns ok when lathe is provided', () => {
      const result = lithograph.init({ lathe });
      expect(result.ok).toBe(true);
    });

    it('returns err with INIT_FAILED when lathe is missing', () => {
      const result = lithograph.init({});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INIT_FAILED');
    });
  });

  describe('lifecycle', () => {
    it('start sets healthy; healthCheck reflects state', () => {
      lithograph.init({ lathe });
      const beforeStart = lithograph.healthCheck();
      expect(beforeStart.status).toBe('unhealthy');

      lithograph.start();
      const afterStart = lithograph.healthCheck();
      expect(afterStart.status).toBe('healthy');
    });

    it('stop clears started, transcript_path, and cache', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      lithograph.stop();
      const health = lithograph.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.transcriptPath).toBeNull();

      // Verify that read after stop fails (no transcript path)
      const readResult = lithograph.read('all');
      expect(readResult.ok).toBe(false);
      expect(readResult.error.code).toBe('NO_TRANSCRIPT_PATH');
    });
  });

  describe('setTranscriptPath', () => {
    it('stores the path for subsequent read operations', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = lithograph.read('all');
      expect(result.ok).toBe(true);
      expect(result.value.version).toBe('v1');
      expect(result.value.entries.length).toBeGreaterThan(0);
    });

    it('invalidates cached parse results', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      // First read populates cache
      const first = lithograph.read('all');
      expect(first.ok).toBe(true);
      expect(first.value.entries).toHaveLength(4);

      // Write a different transcript
      const newTranscript = JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Only one line' }] });
      const newPath = path.join(tmpDir, 'transcript2.jsonl');
      fs.writeFileSync(newPath, newTranscript);

      // Set new path -- should invalidate cache
      lithograph.setTranscriptPath(newPath);
      const second = lithograph.read('all');
      expect(second.ok).toBe(true);
      expect(second.value.entries).toHaveLength(1);
    });
  });

  describe('read', () => {
    it('returns err NO_TRANSCRIPT_PATH when no path is set', () => {
      lithograph.init({ lathe });
      lithograph.start();
      const result = lithograph.read('all');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NO_TRANSCRIPT_PATH');
    });

    it('returns ok with full parse result for read("all")', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = lithograph.read('all');
      expect(result.ok).toBe(true);
      expect(result.value.version).toBe('v1');
      expect(result.value.entries).toHaveLength(4);
      expect(result.value.entries[0].role).toBe('user');
      expect(result.value.entries[1].role).toBe('assistant');
    });

    it('returns specific entry for numeric string id', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = lithograph.read('1');
      expect(result.ok).toBe(true);
      expect(result.value.role).toBe('assistant');
      expect(result.value._lineIndex).toBe(1);
    });
  });

  describe('write', () => {
    it('replaces specified field in matching tool_use block and writes atomically', async () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = await lithograph.write('replace', {
        toolUseId: 'toolu_abc',
        field: 'input',
        value: { file_path: '/replaced.ts' }
      });
      expect(result.ok).toBe(true);

      // Verify the write was persisted
      const readResult = lithograph.read('all');
      expect(readResult.ok).toBe(true);
      const toolBlocks = readResult.value.entries[1].content;
      const toolUse = toolBlocks.find(b => b.type === 'tool_use');
      expect(toolUse.input).toEqual({ file_path: '/replaced.ts' });
    });

    it('clears input for matching tool_use_id with clear_input operation', async () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = await lithograph.write('clear_input', { toolUseId: 'toolu_abc' });
      expect(result.ok).toBe(true);

      // Verify input was cleared
      const readResult = lithograph.read('all');
      expect(readResult.ok).toBe(true);
      const toolBlocks = readResult.value.entries[1].content;
      const toolUse = toolBlocks.find(b => b.type === 'tool_use');
      expect(toolUse.input).toEqual({});
    });

    it('returns err when lathe.writeFileAtomic fails', async () => {
      const failLathe = createMockLathe({ failWrite: true });
      const failResult = createLithograph();
      const failProvider = failResult.value;
      failProvider.init({ lathe: failLathe });
      failProvider.start();
      failProvider.setTranscriptPath(transcriptPath);

      const result = await failProvider.write('replace', {
        toolUseId: 'toolu_abc',
        field: 'input',
        value: { file_path: '/fail.ts' }
      });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('WRITE_FAILED');
    });
  });

  describe('query', () => {
    it('returns only user entries when querying by role', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = lithograph.query({ role: 'user' });
      expect(result.ok).toBe(true);
      expect(result.value.every(e => e.role === 'user')).toBe(true);
      expect(result.value.length).toBeGreaterThan(0);
    });

    it('returns all tool_use blocks when querying by type', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = lithograph.query({ type: 'tool_use' });
      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe('toolu_abc');
    });

    it('returns matching entry/block when querying by toolUseId', () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = lithograph.query({ toolUseId: 'toolu_abc' });
      expect(result.ok).toBe(true);
      expect(result.value.block.id).toBe('toolu_abc');
      expect(result.value.entry.role).toBe('assistant');
    });
  });

  describe('delete', () => {
    it('removes content block with matching tool_use_id and writes atomically', async () => {
      lithograph.init({ lathe });
      lithograph.start();
      lithograph.setTranscriptPath(transcriptPath);

      const result = await lithograph.delete('toolu_abc');
      expect(result.ok).toBe(true);

      // Verify the block was removed
      const readResult = lithograph.read('all');
      expect(readResult.ok).toBe(true);
      // Entry 1 (assistant) should now only have the text block
      const assistantEntry = readResult.value.entries[1];
      expect(assistantEntry.content).toHaveLength(1);
      expect(assistantEntry.content[0].type).toBe('text');
    });
  });
});

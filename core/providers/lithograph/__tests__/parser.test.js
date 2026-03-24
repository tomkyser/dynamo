'use strict';

const { describe, it, expect } = require('bun:test');
const {
  parseTranscript,
  detectVersion,
  PARSERS,
  extractToolUseBlocks,
  extractToolResults,
  filterByRole,
  findByToolUseId
} = require('../parser.cjs');

describe('Lithograph Parser', () => {

  describe('parseTranscript', () => {
    it('returns empty result for empty string', () => {
      const result = parseTranscript('');
      expect(result.version).toBeNull();
      expect(result.entries).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('parses single user turn line', () => {
      const line = JSON.stringify({
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }]
      });
      const result = parseTranscript(line);
      expect(result.version).toBe('v1');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].role).toBe('user');
      expect(result.entries[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
      expect(result.entries[0]._parserVersion).toBe('v1');
      expect(result.entries[0]._lineIndex).toBe(0);
    });

    it('parses assistant turn with tool_use blocks preserving nested content', () => {
      const line = JSON.stringify({
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me read that.' },
          { type: 'tool_use', id: 'toolu_abc', name: 'Read', input: { file_path: '/src/index.ts' } }
        ]
      });
      const result = parseTranscript(line);
      expect(result.version).toBe('v1');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].role).toBe('assistant');
      expect(result.entries[0].content).toHaveLength(2);
      expect(result.entries[0].content[1].type).toBe('tool_use');
      expect(result.entries[0].content[1].id).toBe('toolu_abc');
      expect(result.entries[0].content[1].name).toBe('Read');
      expect(result.entries[0].content[1].input).toEqual({ file_path: '/src/index.ts' });
    });

    it('parses mixed user/assistant/tool_result turns in order with correct _lineIndex', () => {
      const lines = [
        JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Read file' }] }),
        JSON.stringify({ role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: '/a.ts' } }] }),
        JSON.stringify({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'file contents' }] })
      ].join('\n');
      const result = parseTranscript(lines);
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0]._lineIndex).toBe(0);
      expect(result.entries[0].role).toBe('user');
      expect(result.entries[1]._lineIndex).toBe(1);
      expect(result.entries[1].role).toBe('assistant');
      expect(result.entries[2]._lineIndex).toBe(2);
      expect(result.entries[2].role).toBe('user');
    });

    it('skips malformed lines without crashing', () => {
      const lines = [
        JSON.stringify({ role: 'user', content: [{ type: 'text', text: 'Hello' }] }),
        'this is not valid json {{{',
        JSON.stringify({ role: 'assistant', content: [{ type: 'text', text: 'Hi' }] })
      ].join('\n');
      const result = parseTranscript(lines);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].role).toBe('user');
      expect(result.entries[1].role).toBe('assistant');
      expect(result.entries[1]._lineIndex).toBe(2);
    });

    it('parses tool_result entries preserving tool_use_id and content fields', () => {
      const line = JSON.stringify({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'toolu_xyz', content: 'result data here' }]
      });
      const result = parseTranscript(line);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].content[0].tool_use_id).toBe('toolu_xyz');
      expect(result.entries[0].content[0].content).toBe('result data here');
    });
  });

  describe('detectVersion', () => {
    it('returns v1 for line with role field present', () => {
      const line = JSON.stringify({ role: 'user', content: [] });
      expect(detectVersion(line)).toBe('v1');
    });

    it('returns null for line that is not valid JSON', () => {
      expect(detectVersion('not json at all')).toBeNull();
    });

    it('returns null for valid JSON without role field', () => {
      expect(detectVersion(JSON.stringify({ type: 'event', data: {} }))).toBeNull();
    });
  });

  describe('PARSERS.v1', () => {
    it('detect returns true for objects with role field', () => {
      expect(PARSERS.v1.detect({ role: 'user', content: [] })).toBe(true);
      expect(PARSERS.v1.detect({ role: 'assistant', content: [] })).toBe(true);
    });
  });

  describe('extractToolUseBlocks', () => {
    it('returns flat array of all tool_use objects across entries', () => {
      const entries = [
        { role: 'assistant', content: [
          { type: 'text', text: 'Reading...' },
          { type: 'tool_use', id: 'toolu_1', name: 'Read', input: {} }
        ]},
        { role: 'assistant', content: [
          { type: 'tool_use', id: 'toolu_2', name: 'Write', input: {} }
        ]}
      ];
      const blocks = extractToolUseBlocks(entries);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].id).toBe('toolu_1');
      expect(blocks[1].id).toBe('toolu_2');
    });
  });

  describe('extractToolResults', () => {
    it('returns flat array of all tool_result objects across entries', () => {
      const entries = [
        { role: 'user', content: [
          { type: 'tool_result', tool_use_id: 'toolu_1', content: 'data1' }
        ]},
        { role: 'user', content: [
          { type: 'tool_result', tool_use_id: 'toolu_2', content: 'data2' }
        ]}
      ];
      const results = extractToolResults(entries);
      expect(results).toHaveLength(2);
      expect(results[0].tool_use_id).toBe('toolu_1');
      expect(results[1].tool_use_id).toBe('toolu_2');
    });
  });

  describe('filterByRole', () => {
    it('returns only entries with role === user', () => {
      const entries = [
        { role: 'user', content: [] },
        { role: 'assistant', content: [] },
        { role: 'user', content: [] }
      ];
      const filtered = filterByRole(entries, 'user');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.role === 'user')).toBe(true);
    });

    it('returns only entries with role === assistant', () => {
      const entries = [
        { role: 'user', content: [] },
        { role: 'assistant', content: [] },
        { role: 'assistant', content: [] }
      ];
      const filtered = filterByRole(entries, 'assistant');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.role === 'assistant')).toBe(true);
    });
  });

  describe('findByToolUseId', () => {
    it('finds entry and block matching tool_use_id', () => {
      const entries = [
        { role: 'assistant', content: [
          { type: 'text', text: 'Reading...' },
          { type: 'tool_use', id: 'toolu_target', name: 'Read', input: { file_path: '/a.ts' } }
        ]},
        { role: 'user', content: [
          { type: 'tool_result', tool_use_id: 'toolu_target', content: 'file data' }
        ]}
      ];
      const result = findByToolUseId(entries, 'toolu_target');
      expect(result).not.toBeNull();
      expect(result.entry.role).toBe('assistant');
      expect(result.block.id).toBe('toolu_target');
      expect(result.block.name).toBe('Read');
    });

    it('returns null when no matching id found', () => {
      const entries = [
        { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] }
      ];
      expect(findByToolUseId(entries, 'toolu_nonexistent')).toBeNull();
    });
  });
});

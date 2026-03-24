'use strict';

const { describe, it, expect } = require('bun:test');
const { parseFrontmatter, serializeFrontmatter } = require('../frontmatter.cjs');

describe('parseFrontmatter', () => {
  it('parses valid JSON frontmatter with body', () => {
    const input = '---\n{"title": "Hello"}\n---\nBody text';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({ title: 'Hello' });
    expect(result.body).toBe('Body text');
  });

  it('parses empty frontmatter block', () => {
    const input = '---\n---\n\nbody';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('body');
  });

  it('returns null for null input', () => {
    expect(parseFrontmatter(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseFrontmatter(undefined)).toBeNull();
  });

  it('returns null for empty string input', () => {
    expect(parseFrontmatter('')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseFrontmatter(42)).toBeNull();
  });

  it('returns null for content without frontmatter delimiters', () => {
    expect(parseFrontmatter('No frontmatter here')).toBeNull();
  });

  it('returns null for content with only one delimiter', () => {
    expect(parseFrontmatter('---\n{"title": "Hello"}\nNo closing')).toBeNull();
  });

  it('returns null for invalid JSON between delimiters', () => {
    const input = '---\n{not valid json}\n---\n\nbody';
    expect(parseFrontmatter(input)).toBeNull();
  });

  it('returns null for YAML content between delimiters (no backward compat)', () => {
    const input = '---\ntitle: Hello\ncount: 42\n---\n\nbody';
    expect(parseFrontmatter(input)).toBeNull();
  });

  it('parses nested objects in JSON frontmatter', () => {
    const input = '---\n{"temporal": {"created": "2026-01-01", "decay": 0.5}}\n---\n\nbody';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({
      temporal: { created: '2026-01-01', decay: 0.5 },
    });
    expect(result.body).toBe('body');
  });

  it('parses deeply nested structures', () => {
    const fm = {
      associations: {
        domains: ['engineering', 'architecture'],
        entities: ['project-atlas'],
        emotional_valence: -0.3,
      },
    };
    const input = `---\n${JSON.stringify(fm)}\n---\n\nbody`;
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual(fm);
  });

  it('parses arrays in JSON frontmatter', () => {
    const input = '---\n{"tags": ["alpha", "beta", "gamma"]}\n---\n\nbody';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({ tags: ['alpha', 'beta', 'gamma'] });
  });

  it('parses all JSON scalar types correctly', () => {
    const input = '---\n{"str": "hello", "num": 42, "float": 3.14, "bool": true, "nil": null}\n---\n';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter.str).toBe('hello');
    expect(result.frontmatter.num).toBe(42);
    expect(result.frontmatter.float).toBe(3.14);
    expect(result.frontmatter.bool).toBe(true);
    expect(result.frontmatter.nil).toBeNull();
  });

  it('handles empty body', () => {
    const input = '---\n{"title": "Test"}\n---\n';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({ title: 'Test' });
    expect(result.body).toBe('');
  });

  it('handles Reverie fragment-like schema', () => {
    const fm = {
      id: 'frag-2026-03-22-a7f3b2c1',
      type: 'experiential',
      created: '2026-03-22T14:30:00Z',
      temporal: {
        absolute: '2026-03-22T14:30:00Z',
        session_relative: 0.35,
        sequence: 127,
      },
      decay: {
        initial_weight: 0.85,
        current_weight: 0.72,
        pinned: false,
      },
      associations: {
        domains: ['engineering', 'architecture'],
        entities: ['project-atlas'],
        emotional_valence: -0.3,
        attention_tags: ['deadline-pressure', 'communication-breakdown'],
      },
    };
    const body = "The user's voice shifted \u2014 shorter sentences, more direct.";
    const input = `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${body}`;
    const result = parseFrontmatter(input);

    expect(result).not.toBeNull();
    expect(result.frontmatter.id).toBe('frag-2026-03-22-a7f3b2c1');
    expect(result.frontmatter.type).toBe('experiential');
    expect(result.frontmatter.temporal.session_relative).toBe(0.35);
    expect(result.frontmatter.decay.pinned).toBe(false);
    expect(result.frontmatter.associations.domains).toEqual(['engineering', 'architecture']);
    expect(result.frontmatter.associations.entities).toEqual(['project-atlas']);
    expect(result.frontmatter.associations.emotional_valence).toBe(-0.3);
    expect(result.frontmatter.associations.attention_tags).toEqual(['deadline-pressure', 'communication-breakdown']);
    expect(result.body).toContain("The user's voice shifted");
  });
});

describe('serializeFrontmatter', () => {
  it('produces correct format with body', () => {
    const result = serializeFrontmatter({ title: 'Hello' }, 'Body');
    expect(result).toBe('---\n{\n  "title": "Hello"\n}\n---\n\nBody');
  });

  it('starts with triple-dash delimiter', () => {
    const result = serializeFrontmatter({ key: 'value' }, 'body');
    expect(result.startsWith('---\n')).toBe(true);
  });

  it('uses pretty-printed JSON', () => {
    const result = serializeFrontmatter({ a: 1, b: 2 }, '');
    expect(result).toContain('  "a": 1');
    expect(result).toContain('  "b": 2');
  });

  it('handles empty body', () => {
    const result = serializeFrontmatter({ key: 'value' }, '');
    expect(result).toBe('---\n{\n  "key": "value"\n}\n---\n\n');
  });

  it('handles null body', () => {
    const result = serializeFrontmatter({ key: 'value' }, null);
    expect(result).toBe('---\n{\n  "key": "value"\n}\n---\n\n');
  });

  it('serializes nested objects', () => {
    const fm = { temporal: { created: '2026-01-01', decay: 0.5 } };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('"temporal"');
    expect(result).toContain('"created": "2026-01-01"');
    expect(result).toContain('"decay": 0.5');
  });

  it('serializes arrays', () => {
    const fm = { tags: ['alpha', 'beta'] };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('"tags"');
    expect(result).toContain('"alpha"');
    expect(result).toContain('"beta"');
  });
});

describe('round-trip fidelity', () => {
  it('round-trips basic frontmatter and body', () => {
    const fm = { type: 'experiential', count: 42, active: true };
    const body = 'This is the body content.';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips experiential fragment with nested temporal, decay, associations', () => {
    const fm = {
      id: 'frag-2026-03-22-a7f3b2c1',
      type: 'experiential',
      created: '2026-03-22T14:30:00Z',
      temporal: {
        absolute: '2026-03-22T14:30:00Z',
        session_relative: 0.35,
        sequence: 127,
      },
      decay: {
        initial_weight: 0.85,
        current_weight: 0.72,
        pinned: false,
      },
      associations: {
        domains: ['engineering', 'architecture'],
        entities: ['project-atlas'],
        emotional_valence: -0.3,
        attention_tags: ['deadline-pressure'],
      },
    };
    const body = "The user's voice shifted \u2014 shorter sentences, more direct.";

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips meta-recall fragment', () => {
    const fm = {
      id: 'frag-2026-03-22-b1c2d3e4',
      type: 'meta-recall',
      created: '2026-03-22T15:00:00Z',
      temporal: { absolute: '2026-03-22T15:00:00Z', session_relative: 0.5, sequence: 200 },
      decay: { initial_weight: 0.6, current_weight: 0.55, pinned: false },
      associations: { domains: ['reflection'], entities: [], emotional_valence: 0.1, attention_tags: [] },
      source_fragment: 'frag-2026-03-22-a7f3b2c1',
    };
    const body = 'Reflecting on earlier interaction about architecture decisions.';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips sublimation fragment', () => {
    const fm = {
      id: 'frag-2026-03-22-c3d4e5f6',
      type: 'sublimation',
      created: '2026-03-22T15:30:00Z',
      temporal: { absolute: '2026-03-22T15:30:00Z', session_relative: 0.65, sequence: 250 },
      decay: { initial_weight: 0.4, current_weight: 0.38, pinned: false },
      associations: { domains: ['pattern'], entities: [], emotional_valence: 0.0, attention_tags: ['subtle-signal'] },
    };
    const body = 'A faint resonance with patterns from unrelated sessions.';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips consolidation fragment', () => {
    const fm = {
      id: 'frag-2026-03-22-d5e6f7a8',
      type: 'consolidation',
      created: '2026-03-22T23:00:00Z',
      temporal: { absolute: '2026-03-22T23:00:00Z', session_relative: 1.0, sequence: 500 },
      decay: { initial_weight: 0.9, current_weight: 0.9, pinned: true },
      associations: { domains: ['engineering', 'architecture'], entities: ['project-atlas', 'project-nova'], emotional_valence: 0.2, attention_tags: [] },
      merged_from: ['frag-2026-03-22-a7f3b2c1', 'frag-2026-03-22-b1c2d3e4'],
    };
    const body = 'REM consolidation: merged two related fragments about architecture patterns.';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips source-reference fragment', () => {
    const fm = {
      id: 'frag-2026-03-22-e7f8a9b0',
      type: 'source-reference',
      created: '2026-03-22T16:00:00Z',
      temporal: { absolute: '2026-03-22T16:00:00Z', session_relative: 0.7, sequence: 300 },
      decay: { initial_weight: 0.5, current_weight: 0.48, pinned: false },
      associations: { domains: ['documentation'], entities: [], emotional_valence: 0.0, attention_tags: [] },
      source_locator: { type: 'file', path: '/src/main.cjs', line_start: 42, line_end: 67 },
    };
    const body = 'Reference to the main bootstrap implementation.';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips body with special characters: markdown headers, code blocks, triple-dash', () => {
    const fm = { type: 'experiential' };
    const body = '## Section Header\n\nSome text with `code` and:\n\n```javascript\nconst x = 1;\n```\n\nLine with --- in it.\n\n### Another header';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });

  it('round-trips unicode characters in frontmatter and body', () => {
    const fm = {
      title: 'Caf\u00e9 \u2014 R\u00e9sum\u00e9',
      emoji: '\u{1F680}\u{1F30D}\u2728',
      japanese: '\u3053\u3093\u306b\u3061\u306f',
    };
    const body = 'The user said \u00abbonjour\u00bb and mentioned Schr\u00f6dinger\u2019s cat. \u{1F431}';

    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });
});

'use strict';

const { describe, it, expect } = require('bun:test');
const { parseFrontmatter, serializeFrontmatter } = require('../frontmatter.cjs');

describe('parseFrontmatter', () => {
  it('parses basic frontmatter with body', () => {
    const input = '---\ntitle: Hello\n---\nBody text';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({ title: 'Hello' });
    expect(result.body).toBe('Body text');
  });

  it('returns null for content without frontmatter', () => {
    const result = parseFrontmatter('No frontmatter here');
    expect(result).toBeNull();
  });

  it('returns null for content with only one delimiter', () => {
    const result = parseFrontmatter('---\ntitle: Hello\nNo closing delimiter');
    expect(result).toBeNull();
  });

  it('handles string values', () => {
    const input = '---\nkey: value\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ key: 'value' });
  });

  it('handles integer values', () => {
    const input = '---\ncount: 42\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ count: 42 });
  });

  it('handles float values', () => {
    const input = '---\nscore: 3.14\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ score: 3.14 });
  });

  it('handles boolean true', () => {
    const input = '---\nactive: true\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ active: true });
  });

  it('handles boolean false', () => {
    const input = '---\ndone: false\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ done: false });
  });

  it('handles null value', () => {
    const input = '---\nempty: null\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ empty: null });
  });

  it('handles blank value as null', () => {
    const input = '---\nblank:\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ blank: null });
  });

  it('handles double-quoted strings', () => {
    const input = '---\nname: "hello world"\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ name: 'hello world' });
  });

  it('handles single-quoted strings', () => {
    const input = "---\nname: 'hello world'\n---\n";
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ name: 'hello world' });
  });

  it('handles inline arrays', () => {
    const input = '---\ntags: [a, b, c]\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ tags: ['a', 'b', 'c'] });
  });

  it('handles inline arrays with quoted items', () => {
    const input = '---\ntags: ["alpha", "beta"]\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ tags: ['alpha', 'beta'] });
  });

  it('handles block arrays', () => {
    const input = '---\ntags:\n  - alpha\n  - beta\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ tags: ['alpha', 'beta'] });
  });

  it('handles nested objects', () => {
    const input = '---\ntemporal:\n  created: 2026-01-01\n  decay: 0.5\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      temporal: {
        created: '2026-01-01',
        decay: 0.5
      }
    });
  });

  it('handles deeply nested structures', () => {
    const input = [
      '---',
      'associations:',
      '  domains:',
      '    - engineering',
      '  entities:',
      '    - name: claude',
      '---',
      ''
    ].join('\n');
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({
      associations: {
        domains: ['engineering'],
        entities: [{ name: 'claude' }]
      }
    });
  });

  it('preserves body content after frontmatter delimiter', () => {
    const body = 'This is the body.\n\nWith multiple paragraphs.\n\n## And headings';
    const input = '---\ntitle: Test\n---\n' + body;
    const result = parseFrontmatter(input);
    expect(result.body).toBe(body.trim());
  });

  it('handles empty body', () => {
    const input = '---\ntitle: Test\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ title: 'Test' });
    expect(result.body).toBe('');
  });

  it('handles Reverie fragment-like schema', () => {
    const input = [
      '---',
      'id: "frag-2026-03-22-a7f3b2c1"',
      'type: experiential',
      'created: "2026-03-22T14:30:00Z"',
      'temporal:',
      '  absolute: "2026-03-22T14:30:00Z"',
      '  session_relative: 0.35',
      '  sequence: 127',
      'decay:',
      '  initial_weight: 0.85',
      '  current_weight: 0.72',
      '  pinned: false',
      'associations:',
      '  domains:',
      '    - engineering',
      '    - architecture',
      '  entities:',
      '    - project-atlas',
      '  emotional_valence: -0.3',
      '  attention_tags:',
      '    - deadline-pressure',
      '    - communication-breakdown',
      '---',
      '',
      'The user\'s voice shifted — shorter sentences, more direct.'
    ].join('\n');
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

  it('handles comments in YAML', () => {
    const input = '---\n# This is a comment\ntitle: Hello\n---\n';
    const result = parseFrontmatter(input);
    expect(result.frontmatter).toEqual({ title: 'Hello' });
  });

  it('handles empty frontmatter', () => {
    const input = '---\n---\nBody';
    const result = parseFrontmatter(input);
    expect(result).not.toBeNull();
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('Body');
  });
});

describe('serializeFrontmatter', () => {
  it('serializes basic frontmatter with body', () => {
    const result = serializeFrontmatter({ title: 'Hello' }, 'Body');
    expect(result).toBe('---\ntitle: Hello\n---\n\nBody');
  });

  it('serializes nested objects with indentation', () => {
    const fm = { temporal: { created: '2026-01-01', decay: 0.5 } };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('temporal:');
    expect(result).toContain('  created: 2026-01-01');
    expect(result).toContain('  decay: 0.5');
  });

  it('serializes arrays in block format', () => {
    const fm = { tags: ['alpha', 'beta'] };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('tags:');
    expect(result).toContain('  - alpha');
    expect(result).toContain('  - beta');
  });

  it('serializes boolean values', () => {
    const fm = { active: true, done: false };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('active: true');
    expect(result).toContain('done: false');
  });

  it('serializes null values', () => {
    const fm = { empty: null };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('empty: null');
  });

  it('quotes strings containing special characters', () => {
    const fm = { name: 'hello: world' };
    const result = serializeFrontmatter(fm, '');
    expect(result).toContain('name: "hello: world"');
  });

  it('round-trip: parse(serialize(fm, body)) produces identical result', () => {
    const originalFm = {
      type: 'experiential',
      count: 42,
      active: true,
      temporal: {
        created: '2026-01-01',
        decay: 0.5
      },
      tags: ['a', 'b', 'c']
    };
    const originalBody = 'This is the body content.';

    const serialized = serializeFrontmatter(originalFm, originalBody);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(originalFm);
    expect(parsed.body).toBe(originalBody);
  });

  it('round-trip with nested structures', () => {
    const originalFm = {
      associations: {
        domains: ['engineering', 'architecture'],
        emotional_valence: -0.3
      },
      decay: {
        initial_weight: 0.85,
        pinned: false
      }
    };
    const originalBody = 'Fragment body text.';

    const serialized = serializeFrontmatter(originalFm, originalBody);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed.frontmatter).toEqual(originalFm);
    expect(parsed.body).toBe(originalBody);
  });
});

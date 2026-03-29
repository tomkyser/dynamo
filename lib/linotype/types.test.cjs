'use strict';

const { describe, it, expect } = require('bun:test');
const { createMatrix, createSlug, createForme } = require('./types.cjs');

describe('createMatrix', () => {
  it('creates a frozen Matrix with required fields', () => {
    const m = createMatrix({ name: 'test', version: '1.0', slots: {} });
    expect(m.name).toBe('test');
    expect(m.version).toBe('1.0');
    expect(m.slots).toEqual({});
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const m = createMatrix({ name: 'test', version: '1.0', slots: {} });
    expect(m.description).toBe('');
    expect(m.tags).toEqual([]);
    expect(m.token_estimate).toBe(0);
    expect(m.includes).toEqual([]);
    expect(m.body).toBe('');
    expect(m.raw_frontmatter).toEqual({});
  });

  it('preserves all provided fields', () => {
    const m = createMatrix({
      name: 'face-prompt',
      version: '2.0',
      description: 'A face prompt',
      tags: ['injection', 'face'],
      token_estimate: 400,
      slots: { identity: { required: true } },
      includes: ['identity-core'],
      body: 'Hello {{identity}}',
      raw_frontmatter: { name: 'face-prompt', version: '2.0', slots: {} }
    });
    expect(m.name).toBe('face-prompt');
    expect(m.version).toBe('2.0');
    expect(m.description).toBe('A face prompt');
    expect(m.tags).toEqual(['injection', 'face']);
    expect(m.token_estimate).toBe(400);
    expect(m.includes).toEqual(['identity-core']);
    expect(m.body).toBe('Hello {{identity}}');
  });

  it('throws TypeError when name is missing', () => {
    expect(() => createMatrix({ version: '1.0', slots: {} })).toThrow(TypeError);
    expect(() => createMatrix({ version: '1.0', slots: {} })).toThrow(/name/);
  });

  it('throws TypeError when version is missing', () => {
    expect(() => createMatrix({ name: 'test', slots: {} })).toThrow(TypeError);
    expect(() => createMatrix({ name: 'test', slots: {} })).toThrow(/version/);
  });

  it('throws TypeError when slots is missing', () => {
    expect(() => createMatrix({ name: 'test', version: '1.0' })).toThrow(TypeError);
    expect(() => createMatrix({ name: 'test', version: '1.0' })).toThrow(/slots/);
  });

  it('throws TypeError on empty object', () => {
    expect(() => createMatrix({})).toThrow(TypeError);
  });

  it('throws TypeError on null/undefined input', () => {
    expect(() => createMatrix(null)).toThrow(TypeError);
    expect(() => createMatrix(undefined)).toThrow(TypeError);
  });

  it('freezes nested arrays and objects', () => {
    const m = createMatrix({
      name: 'test',
      version: '1.0',
      slots: { x: { required: true } },
      tags: ['a'],
      includes: ['b']
    });
    expect(Object.isFrozen(m.tags)).toBe(true);
    expect(Object.isFrozen(m.includes)).toBe(true);
    expect(Object.isFrozen(m.slots)).toBe(true);
    expect(Object.isFrozen(m.raw_frontmatter)).toBe(true);
  });
});

describe('createSlug', () => {
  it('creates a frozen Slug with computed token estimate', () => {
    const s = createSlug({ name: 'test', content: 'Hello World' });
    expect(s.name).toBe('test');
    expect(s.content).toBe('Hello World');
    expect(s.token_estimate).toBe(Math.ceil('Hello World'.length / 4));
    expect(Object.isFrozen(s)).toBe(true);
  });

  it('defaults resolved_slots to empty array', () => {
    const s = createSlug({ name: 'test', content: 'x' });
    expect(s.resolved_slots).toEqual([]);
  });

  it('preserves resolved_slots', () => {
    const s = createSlug({ name: 'test', content: 'x', resolved_slots: ['a', 'b'] });
    expect(s.resolved_slots).toEqual(['a', 'b']);
    expect(Object.isFrozen(s.resolved_slots)).toBe(true);
  });

  it('throws TypeError when name is missing', () => {
    expect(() => createSlug({ content: 'x' })).toThrow(TypeError);
  });

  it('throws TypeError when content is missing', () => {
    expect(() => createSlug({ name: 'test' })).toThrow(TypeError);
  });

  it('computes token_estimate as ceil(length/4)', () => {
    // 16 chars / 4 = 4 tokens exactly
    const s1 = createSlug({ name: 'test', content: '1234567890123456' });
    expect(s1.token_estimate).toBe(4);

    // 17 chars / 4 = 4.25 -> ceil = 5
    const s2 = createSlug({ name: 'test', content: '12345678901234567' });
    expect(s2.token_estimate).toBe(5);
  });

  it('allows empty content string', () => {
    const s = createSlug({ name: 'test', content: '' });
    expect(s.content).toBe('');
    expect(s.token_estimate).toBe(0);
  });
});

describe('createForme', () => {
  it('creates a frozen Forme with required fields', () => {
    const f = createForme({ content: 'Final output', total_tokens: 100 });
    expect(f.content).toBe('Final output');
    expect(f.total_tokens).toBe(100);
    expect(Object.isFrozen(f)).toBe(true);
  });

  it('defaults optional fields to null/empty', () => {
    const f = createForme({ content: 'x', total_tokens: 10 });
    expect(f.sections).toEqual([]);
    expect(f.budget).toBeNull();
    expect(f.budget_remaining).toBeNull();
  });

  it('preserves sections with frozen entries', () => {
    const f = createForme({
      content: 'x',
      total_tokens: 10,
      sections: [{ name: 'identity', tokens: 5 }, { name: 'behavior', tokens: 5 }]
    });
    expect(f.sections).toHaveLength(2);
    expect(f.sections[0].name).toBe('identity');
    expect(Object.isFrozen(f.sections)).toBe(true);
    expect(Object.isFrozen(f.sections[0])).toBe(true);
  });

  it('preserves budget values', () => {
    const f = createForme({ content: 'x', total_tokens: 10, budget: 100, budget_remaining: 90 });
    expect(f.budget).toBe(100);
    expect(f.budget_remaining).toBe(90);
  });

  it('throws TypeError when content is missing', () => {
    expect(() => createForme({ total_tokens: 10 })).toThrow(TypeError);
  });

  it('throws TypeError when total_tokens is missing', () => {
    expect(() => createForme({ content: 'x' })).toThrow(TypeError);
  });
});

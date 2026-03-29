'use strict';

const { describe, it, expect } = require('bun:test');
const { resolve } = require('./engine.cjs');

describe('Linotype Engine: resolve', () => {

  describe('variable substitution', () => {
    it('resolves a simple variable', () => {
      expect(resolve('{{name}}', { name: 'Claude' }, { slots: {} })).toBe('Claude');
    });

    it('resolves multiple variables', () => {
      expect(resolve('Hello {{name}}, you are {{role}}', { name: 'Claude', role: 'an AI' }, { slots: {} }))
        .toBe('Hello Claude, you are an AI');
    });

    it('resolves dot notation for nested context', () => {
      expect(resolve('{{user.name}}', { user: { name: 'Tom' } }, { slots: {} })).toBe('Tom');
    });

    it('converts non-string values to string', () => {
      expect(resolve('Count: {{n}}', { n: 42 }, { slots: {} })).toBe('Count: 42');
    });

    it('throws on missing required slot', () => {
      expect(() => resolve('{{name}}', {}, { slots: { name: { required: true } } }))
        .toThrow(/required slot "name" missing/);
    });

    it('uses default for optional slot when missing', () => {
      expect(resolve('{{name}}', {}, { slots: { name: { required: false, default: 'Anonymous' } } }))
        .toBe('Anonymous');
    });

    it('uses empty string for optional slot without default', () => {
      expect(resolve('{{name}}', {}, { slots: { name: { required: false } } }))
        .toBe('');
    });

    it('handles full variable resolution with strict mode', () => {
      expect(resolve('Hello {{name}}', { name: 'World' }, { slots: { name: { required: true } }, strict: true }))
        .toBe('Hello World');
    });
  });

  describe('conditionals', () => {
    it('includes content when condition is truthy', () => {
      expect(resolve('{{#if x}}yes{{/if}}', { x: true }, { slots: {} })).toBe('yes');
    });

    it('excludes content when condition is falsy', () => {
      expect(resolve('{{#if x}}yes{{/if}}', { x: false }, { slots: {} })).toBe('');
    });

    it('handles else branch', () => {
      expect(resolve('{{#if x}}yes{{else}}no{{/if}}', { x: '' }, { slots: {} })).toBe('no');
    });

    it('treats null as falsy', () => {
      expect(resolve('{{#if x}}yes{{else}}no{{/if}}', { x: null }, { slots: {} })).toBe('no');
    });

    it('treats undefined as falsy', () => {
      expect(resolve('{{#if x}}yes{{else}}no{{/if}}', {}, { slots: {} })).toBe('no');
    });

    it('treats empty array as falsy', () => {
      expect(resolve('{{#if x}}yes{{else}}no{{/if}}', { x: [] }, { slots: {} })).toBe('no');
    });

    it('treats non-empty string as truthy', () => {
      expect(resolve('{{#if x}}yes{{/if}}', { x: 'hello' }, { slots: {} })).toBe('yes');
    });

    it('treats non-empty array as truthy', () => {
      expect(resolve('{{#if x}}yes{{/if}}', { x: [1] }, { slots: {} })).toBe('yes');
    });

    it('handles nested conditionals', () => {
      const template = '{{#if a}}A{{#if b}}B{{/if}}{{/if}}';
      expect(resolve(template, { a: true, b: true }, { slots: {} })).toBe('AB');
      expect(resolve(template, { a: true, b: false }, { slots: {} })).toBe('A');
      expect(resolve(template, { a: false, b: true }, { slots: {} })).toBe('');
    });
  });

  describe('iteration', () => {
    it('iterates over string array with {{.}}', () => {
      expect(resolve('{{#each items}}- {{.}}\n{{/each}}', { items: ['a', 'b'] }, { slots: {} }))
        .toBe('- a\n- b\n');
    });

    it('provides @index', () => {
      expect(resolve('{{#each items}}{{@index}}: {{.}}\n{{/each}}', { items: ['x'] }, { slots: {} }))
        .toBe('0: x\n');
    });

    it('iterates over object array with {{.fieldname}}', () => {
      expect(resolve('{{#each items}}- {{.name}}\n{{/each}}', { items: [{ name: 'a' }] }, { slots: {} }))
        .toBe('- a\n');
    });

    it('handles multiple items with index and fields', () => {
      const result = resolve(
        '{{#each people}}{{@index}}. {{.name}} ({{.role}})\n{{/each}}',
        { people: [{ name: 'Alice', role: 'dev' }, { name: 'Bob', role: 'pm' }] },
        { slots: {} }
      );
      expect(result).toBe('0. Alice (dev)\n1. Bob (pm)\n');
    });

    it('produces empty string for empty array', () => {
      expect(resolve('{{#each items}}- {{.}}\n{{/each}}', { items: [] }, { slots: {} }))
        .toBe('');
    });

    it('handles three items', () => {
      expect(resolve('{{#each items}}- {{.}}\n{{/each}}', { items: ['a', 'b', 'c'] }, { slots: {} }))
        .toBe('- a\n- b\n- c\n');
    });
  });

  describe('includes (partials)', () => {
    it('resolves a partial by name', () => {
      const partials = new Map([['header', '# Title']]);
      expect(resolve('{{> header}}', {}, { slots: {}, partials })).toBe('# Title');
    });

    it('resolves variables inside partials', () => {
      const partials = new Map([['greet', 'Hello {{name}}']]);
      expect(resolve('{{> greet}}', { name: 'World' }, { slots: {}, partials })).toBe('Hello World');
    });

    it('throws on missing partial in strict mode', () => {
      expect(() => resolve('{{> missing}}', {}, { slots: {}, strict: true }))
        .toThrow(/partial "missing" not found/);
    });

    it('replaces missing partial with empty string in non-strict mode', () => {
      expect(resolve('{{> missing}}', {}, { slots: {}, strict: false })).toBe('');
    });
  });

  describe('comments', () => {
    it('strips single-line comments', () => {
      expect(resolve('{{! comment }}visible', {}, { slots: {} })).toBe('visible');
    });

    it('strips multi-line comments', () => {
      expect(resolve('before{{! this\nis a\ncomment }}after', {}, { slots: {} })).toBe('beforeafter');
    });

    it('strips multiple comments', () => {
      expect(resolve('a{{! x }}b{{! y }}c', {}, { slots: {} })).toBe('abc');
    });
  });

  describe('raw blocks', () => {
    it('preserves template syntax inside raw blocks', () => {
      expect(resolve('{{{raw}}}{{literal}}preserved{{{/raw}}}', {}, { slots: {} }))
        .toBe('{{literal}}preserved');
    });

    it('preserves block syntax inside raw blocks', () => {
      expect(resolve('{{{raw}}}{{#if x}}kept{{/if}}{{{/raw}}}', {}, { slots: {} }))
        .toBe('{{#if x}}kept{{/if}}');
    });
  });

  describe('combined scenarios', () => {
    it('handles variables, conditionals, and iteration together', () => {
      const template = [
        '# {{title}}',
        '{{#if show_list}}',
        '{{#each items}}- {{.}}\n{{/each}}',
        '{{/if}}'
      ].join('\n');

      const result = resolve(template, {
        title: 'My List',
        show_list: true,
        items: ['one', 'two']
      }, { slots: {} });

      expect(result).toContain('# My List');
      expect(result).toContain('- one');
      expect(result).toContain('- two');
    });

    it('handles default options', () => {
      // resolve with minimal options
      expect(resolve('Hello {{name}}', { name: 'World' }, { slots: {} })).toBe('Hello World');
    });
  });
});

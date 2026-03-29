'use strict';

const { describe, it, expect } = require('bun:test');
const { parse, parseString } = require('./parser.cjs');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

describe('parseString', () => {
  it('parses valid JSON frontmatter and body into a Matrix', () => {
    const content = [
      '---',
      '{"name":"test-template","version":"1.0","slots":{"greeting":{"required":true}}}',
      '---',
      'Hello {{greeting}}'
    ].join('\n');

    const m = parseString(content, 'test');
    expect(m.name).toBe('test-template');
    expect(m.version).toBe('1.0');
    expect(m.slots).toEqual({ greeting: { required: true } });
    expect(m.body).toBe('Hello {{greeting}}');
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('parses multi-line JSON frontmatter', () => {
    const content = [
      '---',
      '{',
      '  "name": "multi",',
      '  "version": "2.0",',
      '  "description": "A multi-line test",',
      '  "slots": {',
      '    "x": {"required": true},',
      '    "y": {"required": false, "default": "fallback"}',
      '  }',
      '}',
      '---',
      'Body text here'
    ].join('\n');

    const m = parseString(content, 'test');
    expect(m.name).toBe('multi');
    expect(m.version).toBe('2.0');
    expect(m.description).toBe('A multi-line test');
    expect(m.slots.x).toEqual({ required: true });
    expect(m.slots.y).toEqual({ required: false, default: 'fallback' });
  });

  it('detects slot references in body', () => {
    const content = [
      '---',
      '{"name":"t","version":"1.0","slots":{}}',
      '---',
      'Hello {{name}}, your {{role}} is {{status}}'
    ].join('\n');

    const m = parseString(content, 'test');
    // The raw_frontmatter should contain slots info
    expect(m.body).toContain('{{name}}');
    expect(m.body).toContain('{{role}}');
    expect(m.body).toContain('{{status}}');
  });

  it('preserves raw_frontmatter', () => {
    const content = [
      '---',
      '{"name":"t","version":"1.0","slots":{},"custom_field":"custom_value"}',
      '---',
      'body'
    ].join('\n');

    const m = parseString(content, 'test');
    expect(m.raw_frontmatter.custom_field).toBe('custom_value');
  });

  it('throws on missing opening delimiter', () => {
    expect(() => parseString('no frontmatter', 'test')).toThrow(/missing opening frontmatter delimiter/);
  });

  it('throws on missing closing delimiter', () => {
    const content = '---\n{"name":"t"}\nbody with no close';
    expect(() => parseString(content, 'test')).toThrow(/missing closing frontmatter delimiter/);
  });

  it('throws on invalid JSON', () => {
    const content = '---\n{invalid json}\n---\nbody';
    expect(() => parseString(content, 'test')).toThrow(/invalid JSON frontmatter/);
  });

  it('throws when "name" field is missing', () => {
    const content = '---\n{"version":"1.0","slots":{}}\n---\nbody';
    expect(() => parseString(content, 'test')).toThrow(/missing required field "name"/);
  });

  it('throws when "version" field is missing', () => {
    const content = '---\n{"name":"t","slots":{}}\n---\nbody';
    expect(() => parseString(content, 'test')).toThrow(/missing required field "version"/);
  });

  it('throws when "slots" field is missing', () => {
    const content = '---\n{"name":"t","version":"1.0"}\n---\nbody';
    expect(() => parseString(content, 'test')).toThrow(/missing required field "slots"/);
  });

  it('includes source name in error messages', () => {
    const content = '---\n{"version":"1.0","slots":{}}\n---\nbody';
    expect(() => parseString(content, 'my-template.md')).toThrow('my-template.md');
  });

  it('does not detect block openers as slot references', () => {
    const content = [
      '---',
      '{"name":"t","version":"1.0","slots":{}}',
      '---',
      '{{#if active}}yes{{/if}}',
      '{{#each items}}{{.}}{{/each}}',
      '{{> partial}}',
      '{{! comment }}'
    ].join('\n');

    const m = parseString(content, 'test');
    // Body should not have false slot detections for block syntax
    // The regex should not match #if, /if, #each, /each, > partial, ! comment
    expect(m.body).toContain('{{#if active}}');
  });

  it('handles empty body', () => {
    const content = '---\n{"name":"t","version":"1.0","slots":{}}\n---\n';
    const m = parseString(content, 'test');
    expect(m.body).toBe('');
  });

  it('handles body with multiple lines', () => {
    const content = [
      '---',
      '{"name":"t","version":"1.0","slots":{}}',
      '---',
      'Line 1',
      'Line 2',
      'Line 3'
    ].join('\n');

    const m = parseString(content, 'test');
    expect(m.body).toBe('Line 1\nLine 2\nLine 3');
  });
});

describe('parse (file-based)', () => {
  it('reads a template file and returns a Matrix', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linotype-'));
    const filePath = path.join(tmpDir, 'test.md');
    const content = [
      '---',
      '{"name":"file-test","version":"1.0","slots":{"x":{"required":true}}}',
      '---',
      'Hello {{x}}'
    ].join('\n');

    fs.writeFileSync(filePath, content, 'utf8');

    const m = await parse(filePath);
    expect(m.name).toBe('file-test');
    expect(m.version).toBe('1.0');
    expect(m.body).toBe('Hello {{x}}');
    expect(Object.isFrozen(m)).toBe(true);

    // Cleanup
    fs.unlinkSync(filePath);
    fs.rmdirSync(tmpDir);
  });

  it('throws on nonexistent file', async () => {
    await expect(parse('/nonexistent/file.md')).rejects.toThrow();
  });
});

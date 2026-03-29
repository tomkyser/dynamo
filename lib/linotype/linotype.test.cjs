'use strict';

const { describe, it, expect } = require('bun:test');
const { parse, parseString, cast, compose, validate, inspect } = require('./linotype.cjs');

describe('Linotype public API', () => {

  describe('exports', () => {
    it('exports all 6 public functions', () => {
      expect(typeof parse).toBe('function');
      expect(typeof parseString).toBe('function');
      expect(typeof cast).toBe('function');
      expect(typeof compose).toBe('function');
      expect(typeof validate).toBe('function');
      expect(typeof inspect).toBe('function');
    });
  });

  describe('cast()', () => {
    it('returns Slug with resolved content and token_estimate', () => {
      const matrix = parseString(`---
{
  "name": "greeting",
  "version": "1.0",
  "slots": {
    "name": { "required": true, "type": "string" }
  }
}
---
Hello {{name}}, welcome.`, 'test');

      const slug = cast(matrix, { name: 'Claude' });
      expect(slug.name).toBe('greeting');
      expect(slug.content).toBe('Hello Claude, welcome.');
      expect(slug.content).toContain('Claude');
      expect(slug.resolved_slots).toContain('name');
      expect(slug.token_estimate).toBe(Math.ceil('Hello Claude, welcome.'.length / 4));
      expect(Object.isFrozen(slug)).toBe(true);
    });

    it('throws on missing required slot', () => {
      const matrix = parseString(`---
{
  "name": "test",
  "version": "1.0",
  "slots": {
    "required_slot": { "required": true }
  }
}
---
{{required_slot}}`, 'test');

      expect(() => cast(matrix, {})).toThrow('required slot');
    });

    it('uses default for optional slot', () => {
      const matrix = parseString(`---
{
  "name": "test",
  "version": "1.0",
  "slots": {
    "greeting": { "required": false, "default": "Hi there" }
  }
}
---
{{greeting}}`, 'test');

      const slug = cast(matrix, {});
      expect(slug.content).toBe('Hi there');
    });

    it('resolves partials via includes when registry provided', () => {
      const matrix = parseString(`---
{
  "name": "test",
  "version": "1.0",
  "slots": {}
}
---
Header: {{> header}}`, 'test');

      const partials = new Map([['header', 'Welcome!']]);
      const slug = cast(matrix, {}, { partials });
      expect(slug.content).toBe('Header: Welcome!');
    });
  });

  describe('compose()', () => {
    it('returns Forme with joined content from multiple Slugs', () => {
      const m1 = parseString(`---
{
  "name": "face",
  "version": "1.0",
  "slots": { "identity": { "required": true } }
}
---
Identity: {{identity}}`, 'face');

      const m2 = parseString(`---
{
  "name": "recall",
  "version": "1.0",
  "slots": { "memory": { "required": true } }
}
---
Memory: {{memory}}`, 'recall');

      const slug1 = cast(m1, { identity: 'Claude' });
      const slug2 = cast(m2, { memory: 'conversation about AI' });

      const forme = compose([slug1, slug2]);
      expect(forme.content).toContain('Identity: Claude');
      expect(forme.content).toContain('Memory: conversation about AI');
      expect(forme.total_tokens).toBe(slug1.token_estimate + slug2.token_estimate);
      expect(forme.sections).toHaveLength(2);
      expect(forme.sections[0].name).toBe('face');
      expect(forme.sections[1].name).toBe('recall');
      expect(Object.isFrozen(forme)).toBe(true);
    });

    it('applies custom separator', () => {
      const m1 = parseString(`---
{
  "name": "a",
  "version": "1.0",
  "slots": {}
}
---
Section A`, 'a');
      const m2 = parseString(`---
{
  "name": "b",
  "version": "1.0",
  "slots": {}
}
---
Section B`, 'b');

      const slug1 = cast(m1, {});
      const slug2 = cast(m2, {});
      const forme = compose([slug1, slug2], { separator: '\n---\n' });
      expect(forme.content).toBe('Section A\n---\nSection B');
    });

    it('computes budget_remaining with token_budget', () => {
      const m = parseString(`---
{
  "name": "small",
  "version": "1.0",
  "slots": {}
}
---
Short`, 'small');

      const slug = cast(m, {});
      const forme = compose([slug], { token_budget: 100 });
      expect(forme.budget).toBe(100);
      expect(forme.budget_remaining).toBe(100 - forme.total_tokens);
    });
  });

  describe('validate()', () => {
    it('returns empty array for valid matrix', () => {
      const matrix = parseString(`---
{
  "name": "valid",
  "version": "1.0",
  "slots": {
    "x": { "required": true, "type": "string" }
  }
}
---
{{x}}`, 'test');

      const issues = validate(matrix);
      expect(issues).toEqual([]);
    });

    it('returns issues for invalid matrix', () => {
      const matrix = parseString(`---
{
  "name": "bad",
  "version": "1.0",
  "slots": {
    "missing_req": { "type": "string" },
    "bad_type": { "required": true, "type": "invalid_type" }
  }
}
---
{{missing_req}} {{bad_type}}`, 'test');

      const issues = validate(matrix);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.field === 'slots.missing_req')).toBe(true);
      expect(issues.some(i => i.field === 'slots.bad_type.type')).toBe(true);
    });

    it('detects unmatched block directives in body', () => {
      const matrix = parseString(`---
{
  "name": "unmatched",
  "version": "1.0",
  "slots": {}
}
---
{{#if x}}open but no close`, 'test');

      const issues = validate(matrix);
      expect(issues.some(i => i.field === 'body' && i.issue.includes('{{#if}}'))).toBe(true);
    });
  });

  describe('inspect()', () => {
    it('returns bill of materials for a Forme', () => {
      const m = parseString(`---
{
  "name": "test",
  "version": "1.0",
  "slots": {}
}
---
Content here`, 'test');

      const slug = cast(m, {});
      const forme = compose([slug], { token_budget: 200 });
      const bom = inspect(forme);

      expect(bom).toHaveProperty('sections');
      expect(bom).toHaveProperty('total_tokens');
      expect(bom).toHaveProperty('budget');
      expect(bom).toHaveProperty('budget_remaining');
      expect(bom.sections).toHaveLength(1);
      expect(bom.sections[0].name).toBe('test');
      expect(bom.total_tokens).toBe(forme.total_tokens);
      expect(bom.budget).toBe(200);
      expect(!Object.isFrozen(bom)).toBe(true);
    });
  });

  describe('full pipeline', () => {
    it('parseString -> cast -> compose produces correct Forme', () => {
      const faceTemplate = `---
{
  "name": "face-prompt",
  "version": "1.0",
  "slots": {
    "identity": { "required": true, "type": "string" },
    "mode": { "required": false, "default": "active" }
  }
}
---
You are {{identity}} running in {{mode}} mode.

{{#if show_extra}}Extra context here.{{/if}}`;

      const recallTemplate = `---
{
  "name": "recall-injection",
  "version": "1.0",
  "slots": {
    "memories": { "required": false, "type": "array" }
  }
}
---
Relevant memories:
{{#each memories}}- {{.}}
{{/each}}`;

      const faceMatrix = parseString(faceTemplate, 'face');
      const recallMatrix = parseString(recallTemplate, 'recall');

      const faceSlug = cast(faceMatrix, { identity: 'Claude', show_extra: true });
      const recallSlug = cast(recallMatrix, { memories: ['chat about AI', 'discussion on ethics'] });

      const forme = compose([faceSlug, recallSlug], {
        separator: '\n\n---\n\n',
        token_budget: 500
      });

      expect(forme.content).toContain('You are Claude running in active mode.');
      expect(forme.content).toContain('Extra context here.');
      expect(forme.content).toContain('- chat about AI');
      expect(forme.content).toContain('- discussion on ethics');
      expect(forme.sections).toHaveLength(2);
      expect(forme.sections[0].name).toBe('face-prompt');
      expect(forme.sections[1].name).toBe('recall-injection');
      expect(forme.budget).toBe(500);
      expect(forme.budget_remaining).toBe(500 - forme.total_tokens);

      // inspect the composed forme
      const bom = inspect(forme);
      expect(bom.sections).toHaveLength(2);
      expect(bom.total_tokens).toBe(forme.total_tokens);
    });

    it('parseString -> cast -> compose -> inspect chain works', () => {
      const t = parseString(`---
{
  "name": "simple",
  "version": "1.0",
  "slots": { "msg": { "required": true } }
}
---
{{msg}}`, 'simple');

      const slug = cast(t, { msg: 'hello' });
      const forme = compose([slug]);
      const bom = inspect(forme);

      expect(slug.content).toBe('hello');
      expect(forme.content).toBe('hello');
      expect(bom.total_tokens).toBe(slug.token_estimate);
      expect(bom.sections[0].name).toBe('simple');
    });

    it('handles conditionals and iteration in full pipeline', () => {
      const tpl = `---
{
  "name": "complex",
  "version": "1.0",
  "slots": {
    "title": { "required": true },
    "items": { "required": false, "type": "array" },
    "show_footer": { "required": false }
  }
}
---
# {{title}}

{{#if items}}Items:
{{#each items}}- {{.}}
{{/each}}{{/if}}

{{#if show_footer}}---
Footer content{{else}}No footer{{/if}}`;

      const matrix = parseString(tpl, 'complex');
      const slug = cast(matrix, {
        title: 'My List',
        items: ['alpha', 'beta', 'gamma'],
        show_footer: false
      });

      expect(slug.content).toContain('# My List');
      expect(slug.content).toContain('- alpha');
      expect(slug.content).toContain('- beta');
      expect(slug.content).toContain('- gamma');
      expect(slug.content).toContain('No footer');
      expect(slug.content).not.toContain('Footer content');
    });
  });

  describe('error paths', () => {
    it('parseString throws on malformed frontmatter', () => {
      expect(() => parseString('---\n{invalid json}\n---\nbody', 'bad')).toThrow('invalid JSON');
    });

    it('parseString throws on missing required frontmatter fields', () => {
      expect(() => parseString('---\n{"version":"1.0","slots":{}}\n---\nbody', 'bad')).toThrow('missing required field "name"');
    });

    it('cast throws on missing required slot', () => {
      const m = parseString(`---
{
  "name": "test",
  "version": "1.0",
  "slots": { "required_one": { "required": true } }
}
---
{{required_one}}`, 'test');

      expect(() => cast(m, {})).toThrow('required slot');
    });
  });
});

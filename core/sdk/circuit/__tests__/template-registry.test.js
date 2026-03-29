'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createTemplateRegistry } = require('../template-registry.cjs');

/** Create a temp directory with template files for testing. */
function createTempTemplateDir(templates) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpl-reg-'));
  const templateDir = path.join(tmpDir, 'templates');
  fs.mkdirSync(templateDir, { recursive: true });

  for (const [filename, content] of Object.entries(templates)) {
    fs.writeFileSync(path.join(templateDir, filename), content, 'utf8');
  }

  return { root: tmpDir, templateDir };
}

/** Minimal valid template content. */
function makeTemplate(name, body, slots) {
  const fm = {
    name,
    version: '1.0',
    slots: slots || {},
  };
  return `---\n${JSON.stringify(fm, null, 2)}\n---\n${body || ''}`;
}

describe('createTemplateRegistry', () => {
  let tmpDirs = [];

  afterEach(() => {
    for (const dir of tmpDirs) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_e) { /* ignore */ }
    }
    tmpDirs = [];
  });

  function trackDir(dir) {
    tmpDirs.push(dir);
    return dir;
  }

  describe('registerTemplates', () => {
    it('returns 0 when manifest has no templates section', async () => {
      const registry = createTemplateRegistry();
      const count = await registry.registerTemplates({}, '/tmp');
      expect(count).toBe(0);
    });

    it('returns 0 when templates directory does not exist', async () => {
      const registry = createTemplateRegistry();
      const count = await registry.registerTemplates(
        { templates: { directory: 'nonexistent', namespace: 'test' } },
        '/tmp/no-such-path'
      );
      expect(count).toBe(0);
    });

    it('returns 0 when directory and namespace are missing', async () => {
      const registry = createTemplateRegistry();
      const count = await registry.registerTemplates(
        { templates: {} },
        '/tmp'
      );
      expect(count).toBe(0);
    });

    it('registers templates from a directory', async () => {
      const { root } = createTempTemplateDir({
        'greeting.md': makeTemplate('greeting', 'Hello {{name}}', {
          name: { required: true, type: 'string' },
        }),
        'farewell.md': makeTemplate('farewell', 'Goodbye {{name}}', {
          name: { required: true, type: 'string' },
        }),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      const count = await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'test' } },
        root
      );

      expect(count).toBe(2);
      expect(registry.hasTemplate('test:greeting')).toBe(true);
      expect(registry.hasTemplate('test:farewell')).toBe(true);
    });

    it('throws on invalid frontmatter (bad slot type)', async () => {
      const { root } = createTempTemplateDir({
        'bad.md': makeTemplate('bad-tmpl', 'content', {
          broken: { required: true, type: 'invalid_type' },
        }),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await expect(
        registry.registerTemplates(
          { templates: { directory: 'templates', namespace: 'test' } },
          root
        )
      ).rejects.toThrow('contract violation');
    });

    it('throws on Linotype parse error', async () => {
      const { root } = createTempTemplateDir({
        'bad.md': '---\n{"slots": {}}\n---\nno name or version',
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await expect(
        registry.registerTemplates(
          { templates: { directory: 'templates', namespace: 'test' } },
          root
        )
      ).rejects.toThrow('parse error');
    });

    it('ignores non-.md files', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmpl-reg-'));
      trackDir(tmpDir);
      const templateDir = path.join(tmpDir, 'templates');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(path.join(templateDir, 'notes.txt'), 'not a template', 'utf8');
      fs.writeFileSync(
        path.join(templateDir, 'valid.md'),
        makeTemplate('valid', 'content'),
        'utf8'
      );

      const registry = createTemplateRegistry();
      const count = await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'ns' } },
        tmpDir
      );

      expect(count).toBe(1);
      expect(registry.hasTemplate('ns:valid')).toBe(true);
    });
  });

  describe('getTemplate', () => {
    it('returns null for unregistered name', () => {
      const registry = createTemplateRegistry();
      expect(registry.getTemplate('nope:nothing')).toBeNull();
    });

    it('returns Matrix for registered name', async () => {
      const { root } = createTempTemplateDir({
        'test.md': makeTemplate('mytemplate', 'body here'),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'ns' } },
        root
      );

      const matrix = registry.getTemplate('ns:mytemplate');
      expect(matrix).not.toBeNull();
      expect(matrix.name).toBe('mytemplate');
      expect(matrix.version).toBe('1.0');
    });
  });

  describe('hasTemplate', () => {
    it('returns false for unregistered name', () => {
      const registry = createTemplateRegistry();
      expect(registry.hasTemplate('nope:nothing')).toBe(false);
    });

    it('returns true for registered name', async () => {
      const { root } = createTempTemplateDir({
        'a.md': makeTemplate('alpha', 'content'),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'ns' } },
        root
      );

      expect(registry.hasTemplate('ns:alpha')).toBe(true);
    });
  });

  describe('castTemplate', () => {
    it('throws for unregistered template', () => {
      const registry = createTemplateRegistry();
      expect(() => registry.castTemplate('ns:nope', {})).toThrow('not found in registry');
    });

    it('casts a template against context', async () => {
      const { root } = createTempTemplateDir({
        'greet.md': makeTemplate('greet', 'Hello {{name}}, you have {{count}} items', {
          name: { required: true, type: 'string' },
          count: { required: false, type: 'number' },
        }),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'app' } },
        root
      );

      const slug = registry.castTemplate('app:greet', { name: 'Alice', count: 5 });
      expect(slug.name).toBe('greet');
      expect(slug.content).toContain('Hello Alice');
      expect(slug.content).toContain('5 items');
      expect(slug.resolved_slots).toContain('name');
      expect(slug.resolved_slots).toContain('count');
      expect(typeof slug.token_estimate).toBe('number');
    });
  });

  describe('listTemplates', () => {
    it('returns empty array when registry is empty', () => {
      const registry = createTemplateRegistry();
      expect(registry.listTemplates()).toEqual([]);
    });

    it('returns all template names sorted', async () => {
      const { root } = createTempTemplateDir({
        'beta.md': makeTemplate('beta', 'b'),
        'alpha.md': makeTemplate('alpha', 'a'),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'ns' } },
        root
      );

      const all = registry.listTemplates();
      expect(all).toEqual(['ns:alpha', 'ns:beta']);
    });

    it('filters by namespace', async () => {
      const { root: root1 } = createTempTemplateDir({
        'one.md': makeTemplate('one', 'content'),
      });
      trackDir(root1);

      const { root: root2 } = createTempTemplateDir({
        'two.md': makeTemplate('two', 'content'),
      });
      trackDir(root2);

      const registry = createTemplateRegistry();
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'foo' } },
        root1
      );
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'bar' } },
        root2
      );

      const fooOnly = registry.listTemplates('foo');
      expect(fooOnly).toEqual(['foo:one']);

      const barOnly = registry.listTemplates('bar');
      expect(barOnly).toEqual(['bar:two']);
    });
  });

  describe('clear', () => {
    it('empties the registry', async () => {
      const { root } = createTempTemplateDir({
        'item.md': makeTemplate('item', 'content'),
      });
      trackDir(root);

      const registry = createTemplateRegistry();
      await registry.registerTemplates(
        { templates: { directory: 'templates', namespace: 'ns' } },
        root
      );

      expect(registry.listTemplates()).toHaveLength(1);

      registry.clear();

      expect(registry.listTemplates()).toHaveLength(0);
      expect(registry.getTemplate('ns:item')).toBeNull();
    });
  });
});

'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { createSkillManager } = require('../skill-manager.cjs');

/**
 * Creates a test-double lathe that operates on real filesystem via tmpDir.
 */
function createTestLathe() {
  return {
    writeFileSync(p, content) {
      try {
        fs.writeFileSync(p, content);
        return { ok: true, value: undefined };
      } catch (e) {
        return { ok: false, error: { code: 'WRITE_FAILED', message: e.message } };
      }
    },
  };
}

/**
 * Creates a lathe mock that always fails on writes.
 */
function createFailingLathe() {
  return {
    writeFileSync() {
      return { ok: false, error: { code: 'WRITE_FAILED', message: 'Simulated write failure' } };
    },
  };
}

describe('skill-manager', () => {
  let tmpDir;
  let lathe;
  let manager;
  let skillsDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-skill-test-'));
    skillsDir = path.join(tmpDir, '.claude', 'skills');
    lathe = createTestLathe();
    manager = createSkillManager({ lathe });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('createSkillManager returns object with required methods', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.registerSkill).toBe('function');
    expect(typeof manager.removeSkill).toBe('function');
    expect(typeof manager.listSkills).toBe('function');
  });

  describe('registerSkill', () => {
    it('creates skillsDir/name/SKILL.md', () => {
      const result = manager.registerSkill('my-skill', { description: 'A skill' }, skillsDir);
      expect(result.ok).toBe(true);

      const skillPath = path.join(skillsDir, 'my-skill', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it('writes valid YAML frontmatter with --- delimiters', () => {
      manager.registerSkill('test-skill', { description: 'Test' }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'test-skill', 'SKILL.md'), 'utf8');
      expect(content.startsWith('---\n')).toBe(true);
      expect(content).toContain('\n---\n');
    });

    it('includes name field in frontmatter', () => {
      manager.registerSkill('greeting', {}, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'greeting', 'SKILL.md'), 'utf8');
      expect(content).toContain('name: greeting');
    });

    it('includes description field in frontmatter when provided', () => {
      manager.registerSkill('greet', { description: 'Say hello' }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'greet', 'SKILL.md'), 'utf8');
      expect(content).toContain('description: "Say hello"');
    });

    it('includes disable-model-invocation when disableModelInvocation is true', () => {
      manager.registerSkill('quiet', { disableModelInvocation: true }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'quiet', 'SKILL.md'), 'utf8');
      expect(content).toContain('disable-model-invocation: true');
    });

    it('does not include disable-model-invocation when disableModelInvocation is false', () => {
      manager.registerSkill('loud', { disableModelInvocation: false }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'loud', 'SKILL.md'), 'utf8');
      expect(content).not.toContain('disable-model-invocation');
    });

    it('includes allowed-tools when allowedTools is provided', () => {
      manager.registerSkill('tooled', { allowedTools: 'Read, Write, Bash' }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'tooled', 'SKILL.md'), 'utf8');
      expect(content).toContain('allowed-tools: Read, Write, Bash');
    });

    it('includes argument-hint when argumentHint is provided', () => {
      manager.registerSkill('hinted', { argumentHint: '<topic>' }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'hinted', 'SKILL.md'), 'utf8');
      expect(content).toContain('argument-hint: "<topic>"');
    });

    it('includes user-invocable when userInvocable is false', () => {
      manager.registerSkill('hidden', { userInvocable: false }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'hidden', 'SKILL.md'), 'utf8');
      expect(content).toContain('user-invocable: false');
    });

    it('includes context when provided', () => {
      manager.registerSkill('forked', { context: 'fork' }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'forked', 'SKILL.md'), 'utf8');
      expect(content).toContain('context: fork');
    });

    it('includes content body after frontmatter', () => {
      manager.registerSkill('documented', {
        description: 'With body',
        content: '# Instructions\n\nDo the thing.',
      }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'documented', 'SKILL.md'), 'utf8');
      expect(content).toContain('# Instructions');
      expect(content).toContain('Do the thing.');

      // Content should be after the closing ---
      const parts = content.split('---');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      const body = parts.slice(2).join('---');
      expect(body).toContain('# Instructions');
    });

    it('creates directory recursively if missing', () => {
      const deepDir = path.join(tmpDir, 'a', 'b', 'c', 'skills');
      const result = manager.registerSkill('deep-skill', { description: 'Deep' }, deepDir);
      expect(result.ok).toBe(true);

      expect(fs.existsSync(path.join(deepDir, 'deep-skill', 'SKILL.md'))).toBe(true);
    });

    it('returns ok with name and path on success', () => {
      const result = manager.registerSkill('named', { description: 'Named' }, skillsDir);
      expect(result.ok).toBe(true);
      expect(result.value.name).toBe('named');
      expect(result.value.path).toBe(path.join(skillsDir, 'named', 'SKILL.md'));
    });

    it('returns Err SKILL_WRITE_FAILED if lathe.writeFileSync fails', () => {
      const failManager = createSkillManager({ lathe: createFailingLathe() });
      // Must create dir ourselves since registerSkill uses fs.mkdirSync
      const dir = path.join(skillsDir, 'fail-skill');
      fs.mkdirSync(dir, { recursive: true });

      const result = failManager.registerSkill('fail-skill', {}, skillsDir);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SKILL_WRITE_FAILED');
    });

    it('handles all optional fields together', () => {
      manager.registerSkill('full-skill', {
        description: 'Full featured skill',
        content: '# Usage\n\nUse this skill.',
        disableModelInvocation: true,
        allowedTools: 'Read, Write',
        argumentHint: '<input>',
        userInvocable: false,
        context: 'fork',
      }, skillsDir);

      const content = fs.readFileSync(path.join(skillsDir, 'full-skill', 'SKILL.md'), 'utf8');
      expect(content).toContain('name: full-skill');
      expect(content).toContain('description: "Full featured skill"');
      expect(content).toContain('disable-model-invocation: true');
      expect(content).toContain('allowed-tools: Read, Write');
      expect(content).toContain('argument-hint: "<input>"');
      expect(content).toContain('user-invocable: false');
      expect(content).toContain('context: fork');
      expect(content).toContain('# Usage');
    });
  });

  describe('removeSkill', () => {
    it('removes the skill directory', () => {
      manager.registerSkill('removable', { description: 'Remove me' }, skillsDir);
      expect(fs.existsSync(path.join(skillsDir, 'removable'))).toBe(true);

      const result = manager.removeSkill('removable', skillsDir);
      expect(result.ok).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, 'removable'))).toBe(false);
    });

    it('returns Err SKILL_NOT_FOUND if skill directory does not exist', () => {
      const result = manager.removeSkill('nonexistent', skillsDir);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SKILL_NOT_FOUND');
    });
  });

  describe('listSkills', () => {
    it('returns array of installed skill names', () => {
      manager.registerSkill('skill-a', {}, skillsDir);
      manager.registerSkill('skill-b', {}, skillsDir);

      const result = manager.listSkills(skillsDir);
      expect(result.ok).toBe(true);
      expect(result.value.sort()).toEqual(['skill-a', 'skill-b']);
    });

    it('returns empty array if directory does not exist', () => {
      const result = manager.listSkills(path.join(tmpDir, 'nonexistent'));
      expect(result.ok).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('filters directories that do not contain SKILL.md', () => {
      // Create a skill properly
      manager.registerSkill('real-skill', {}, skillsDir);
      // Create a directory without SKILL.md
      fs.mkdirSync(path.join(skillsDir, 'fake-skill'), { recursive: true });

      const result = manager.listSkills(skillsDir);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual(['real-skill']);
    });
  });
});

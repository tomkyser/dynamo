'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { ok, err } = require('../../../lib/result.cjs');

/**
 * Builds YAML frontmatter string from skill name and options.
 *
 * Uses string concatenation per plan specification (no YAML library).
 * Always includes name. Optional fields included only when present/truthy.
 *
 * @param {string} name - Skill name (becomes /slash-command)
 * @param {Object} options - Skill registration options
 * @returns {string} Complete frontmatter block including --- delimiters
 */
function buildFrontmatter(name, options) {
  let fm = '---\n';
  fm += `name: ${name}\n`;

  if (options.description) {
    fm += `description: "${options.description}"\n`;
  }
  if (options.disableModelInvocation === true) {
    fm += 'disable-model-invocation: true\n';
  }
  if (options.userInvocable === false) {
    fm += 'user-invocable: false\n';
  }
  if (options.allowedTools) {
    fm += `allowed-tools: ${options.allowedTools}\n`;
  }
  if (options.argumentHint) {
    fm += `argument-hint: "${options.argumentHint}"\n`;
  }
  if (options.context) {
    fm += `context: ${options.context}\n`;
  }

  fm += '---\n';
  return fm;
}

/**
 * Creates a skill file manager for Claude Code's .claude/skills/ directory.
 *
 * Manages SKILL.md files that define conversational skills (slash commands).
 * Each skill lives in its own directory: .claude/skills/<name>/SKILL.md
 *
 * Follows the agent-manager.cjs sub-module pattern with lathe injection
 * for atomic file writes.
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.lathe - Lathe filesystem facade instance
 * @returns {Object} Manager with registerSkill, removeSkill, listSkills
 */
function createSkillManager(options) {
  const { lathe } = options;

  /**
   * Registers a Claude Code skill by writing a SKILL.md file.
   *
   * Creates the skill directory recursively if it does not exist,
   * builds YAML frontmatter from options, and writes SKILL.md
   * via lathe for atomic file operations.
   *
   * @param {string} name - Skill identifier (becomes /slash-command name)
   * @param {Object} options - Skill registration options
   * @param {string} [options.description] - Skill description
   * @param {string} [options.content] - Markdown body with skill instructions
   * @param {boolean} [options.disableModelInvocation] - Prevent Claude auto-loading
   * @param {string} [options.allowedTools] - Tools Claude can use without permission
   * @param {string} [options.argumentHint] - Autocomplete hint
   * @param {boolean} [options.userInvocable] - Whether skill appears in / menu
   * @param {string} [options.context] - Execution context (e.g., 'fork' for subagent)
   * @param {string} skillsDir - Absolute path to the skills directory
   * @returns {import('../../../lib/result.cjs').Result<{name: string, path: string}>}
   */
  function registerSkill(name, options, skillsDir) {
    const skillDir = path.join(skillsDir, name);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Create directory recursively (plain fs, not lathe -- directory creation is not atomic concern)
    fs.mkdirSync(skillDir, { recursive: true });

    // Build file content
    const frontmatter = buildFrontmatter(name, options);
    const body = options.content || '';
    const fullContent = frontmatter + '\n' + body;

    // Write via lathe for atomic file write
    const writeResult = lathe.writeFileSync(skillPath, fullContent);
    if (!writeResult.ok) {
      return err('SKILL_WRITE_FAILED', `Failed to write SKILL.md for "${name}": ${writeResult.error.message}`);
    }

    return ok({ name, path: skillPath });
  }

  /**
   * Removes a skill directory and all its contents.
   *
   * @param {string} name - Skill identifier
   * @param {string} skillsDir - Absolute path to the skills directory
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function removeSkill(name, skillsDir) {
    const skillDir = path.join(skillsDir, name);

    if (!fs.existsSync(skillDir)) {
      return err('SKILL_NOT_FOUND', `Skill "${name}" not found at ${skillDir}`);
    }

    fs.rmSync(skillDir, { recursive: true, force: true });
    return ok(undefined);
  }

  /**
   * Lists all installed skill names by scanning the skills directory.
   *
   * Only includes directories that contain a SKILL.md file.
   *
   * @param {string} skillsDir - Absolute path to the skills directory
   * @returns {import('../../../lib/result.cjs').Result<string[]>}
   */
  function listSkills(skillsDir) {
    if (!fs.existsSync(skillsDir)) {
      return ok([]);
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          skills.push(entry.name);
        }
      }
    }

    return ok(skills);
  }

  return { registerSkill, removeSkill, listSkills };
}

module.exports = { createSkillManager };

'use strict';

const path = require('node:path');
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
 * All filesystem operations route through Lathe per core value:
 * "Everything routes through Dynamo."
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
   * Creates the skill directory via lathe.mkdir, builds YAML frontmatter
   * from options, and writes SKILL.md via lathe.writeFile.
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
   * @returns {Promise<import('../../../lib/result.cjs').Result<{name: string, path: string}>>}
   */
  async function registerSkill(name, options, skillsDir) {
    const skillDir = path.join(skillsDir, name);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Build file content
    const frontmatter = buildFrontmatter(name, options);
    const body = options.content || '';
    const fullContent = frontmatter + '\n' + body;

    // Write via lathe (creates parent directories automatically)
    const writeResult = await lathe.writeFile(skillPath, fullContent);
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
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function removeSkill(name, skillsDir) {
    const skillDir = path.join(skillsDir, name);
    const skillPath = path.join(skillDir, 'SKILL.md');

    const existsResult = await lathe.exists(skillPath);
    if (!existsResult.ok || !existsResult.value) {
      return err('SKILL_NOT_FOUND', `Skill "${name}" not found at ${skillDir}`);
    }

    // Delete the SKILL.md file via lathe
    const deleteResult = lathe.deleteFile(skillPath);
    if (!deleteResult.ok) {
      return deleteResult;
    }

    // Remove the now-empty directory
    const fs = require('node:fs');
    try {
      fs.rmdirSync(skillDir);
    } catch (_e) {
      // Directory may have other files or already be gone — non-fatal
    }

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
    const listResult = lathe.listDir(skillsDir);
    if (!listResult.ok) {
      // Directory doesn't exist — no skills installed
      return ok([]);
    }

    const skills = [];
    for (const entry of listResult.value) {
      if (entry.isDirectory) {
        const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
        // listDir is sync, so use a sync existence check via listDir on the skill dir
        const innerResult = lathe.listDir(path.join(skillsDir, entry.name));
        if (innerResult.ok && innerResult.value.some(e => e.name === 'SKILL.md')) {
          skills.push(entry.name);
        }
      }
    }

    return ok(skills);
  }

  return { registerSkill, removeSkill, listSkills };
}

module.exports = { createSkillManager };

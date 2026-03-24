'use strict';

const { ok, err } = require('../../../lib/result.cjs');

/**
 * Generates the start marker for a named section.
 * @param {string} name - Section name
 * @returns {string} HTML comment marker
 */
const SECTION_START = (name) => `<!-- dynamo:section:${name}:start -->`;

/**
 * Generates the end marker for a named section.
 * @param {string} name - Section name
 * @returns {string} HTML comment marker
 */
const SECTION_END = (name) => `<!-- dynamo:section:${name}:end -->`;

/**
 * Creates a CLAUDE.md section manager for multi-module coexistence.
 *
 * Each module/extension claims a named section in CLAUDE.md, delimited by markers.
 * Exciter manages sections: create, update, remove. No module can write outside
 * its section. Prevents clobbering between multiple consumers.
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.lathe - Lathe filesystem facade instance
 * @returns {Object} Manager with claimSection, updateSection, releaseSection, hasSection
 */
function createClaudeMdManager(options) {
  const { lathe } = options;

  /**
   * Checks whether a named section exists in the CLAUDE.md file.
   *
   * @param {string} sectionName - The section identifier
   * @param {string} claudeMdPath - Absolute path to the CLAUDE.md file
   * @returns {boolean} True if both start and end markers are present
   */
  function hasSection(sectionName, claudeMdPath) {
    const readResult = lathe.readFile(claudeMdPath);
    if (!readResult.ok) {
      return false;
    }

    const content = readResult.value;
    return content.includes(SECTION_START(sectionName)) && content.includes(SECTION_END(sectionName));
  }

  /**
   * Claims a new section in the CLAUDE.md file. Creates the file if it does not exist.
   * Returns err('SECTION_EXISTS') if the section is already claimed.
   *
   * @param {string} sectionName - The section identifier
   * @param {string} content - The content to place between markers
   * @param {string} claudeMdPath - Absolute path to the CLAUDE.md file
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function claimSection(sectionName, content, claudeMdPath) {
    const readResult = lathe.readFile(claudeMdPath);
    let existingContent = readResult.ok ? readResult.value : '';

    // Check if section already exists
    if (existingContent.includes(SECTION_START(sectionName)) && existingContent.includes(SECTION_END(sectionName))) {
      return err('SECTION_EXISTS', `Section "${sectionName}" already exists in ${claudeMdPath}`);
    }

    // Append section with markers
    const sectionBlock = `\n\n${SECTION_START(sectionName)}\n${content}\n${SECTION_END(sectionName)}\n`;
    const newContent = existingContent + sectionBlock;

    return lathe.writeFileAtomic(claudeMdPath, newContent);
  }

  /**
   * Updates the content of an existing section. Returns err('SECTION_NOT_FOUND') if markers are absent.
   *
   * @param {string} sectionName - The section identifier
   * @param {string} newContent - The new content to place between markers
   * @param {string} claudeMdPath - Absolute path to the CLAUDE.md file
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function updateSection(sectionName, newContent, claudeMdPath) {
    const readResult = lathe.readFile(claudeMdPath);
    if (!readResult.ok) {
      return err('SECTION_NOT_FOUND', `File not found: ${claudeMdPath}`);
    }

    const fileContent = readResult.value;
    const startMarker = SECTION_START(sectionName);
    const endMarker = SECTION_END(sectionName);
    const startIdx = fileContent.indexOf(startMarker);
    const endIdx = fileContent.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      return err('SECTION_NOT_FOUND', `Section "${sectionName}" not found in ${claudeMdPath}`);
    }

    // Replace everything between start and end markers (exclusive of markers)
    const before = fileContent.substring(0, startIdx + startMarker.length);
    const after = fileContent.substring(endIdx);
    const updatedContent = before + '\n' + newContent + '\n' + after;

    return lathe.writeFileAtomic(claudeMdPath, updatedContent);
  }

  /**
   * Releases (removes) a section from the CLAUDE.md file, including markers and content.
   *
   * @param {string} sectionName - The section identifier
   * @param {string} claudeMdPath - Absolute path to the CLAUDE.md file
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function releaseSection(sectionName, claudeMdPath) {
    const readResult = lathe.readFile(claudeMdPath);
    if (!readResult.ok) {
      return err('SECTION_NOT_FOUND', `File not found: ${claudeMdPath}`);
    }

    const fileContent = readResult.value;
    const startMarker = SECTION_START(sectionName);
    const endMarker = SECTION_END(sectionName);
    const startIdx = fileContent.indexOf(startMarker);
    const endIdx = fileContent.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      return err('SECTION_NOT_FOUND', `Section "${sectionName}" not found in ${claudeMdPath}`);
    }

    // Remove the entire section block including surrounding whitespace
    const before = fileContent.substring(0, startIdx);
    const after = fileContent.substring(endIdx + endMarker.length);

    // Trim excessive blank lines at the splice point
    const cleanedContent = (before + after).replace(/\n{3,}/g, '\n\n');

    return lathe.writeFileAtomic(claudeMdPath, cleanedContent);
  }

  return { claimSection, updateSection, releaseSection, hasSection };
}

module.exports = { createClaudeMdManager };

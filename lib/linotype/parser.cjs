'use strict';

/**
 * Linotype Parser
 *
 * Parses markdown template files with JSON frontmatter into Matrix objects.
 * Supports both file-based (async) and string-based (sync) parsing.
 *
 * Frontmatter format: JSON delimited by --- lines (not YAML, per D-07).
 *
 * @module lib/linotype/parser
 */

const { createMatrix } = require('./types.cjs');

/**
 * Slot reference detection regex.
 * Matches {{slot_name}} but not block openers ({{#...}}), closers ({{/...}}),
 * includes ({{>...}}), comments ({{!...}}), or raw blocks ({{{...}}}).
 */
const SLOT_REGEX = /\{\{([^#/>!{][\w.@]+)\}\}/g;

/**
 * Extracts JSON frontmatter and body from raw template content.
 *
 * @param {string} content - Raw template file content
 * @param {string} sourceName - Source identifier for error messages
 * @returns {{ frontmatter: Object, body: string }}
 * @throws {Error} If frontmatter delimiters are missing or JSON is invalid
 */
function extractFrontmatter(content, sourceName) {
  const lines = content.split('\n');

  // First line must be ---
  if (lines[0].trim() !== '---') {
    throw new Error(`Linotype parse error (${sourceName}): missing opening frontmatter delimiter "---"`);
  }

  // Find closing ---
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new Error(`Linotype parse error (${sourceName}): missing closing frontmatter delimiter "---"`);
  }

  const frontmatterText = lines.slice(1, closingIndex).join('\n');
  let frontmatter;

  try {
    frontmatter = JSON.parse(frontmatterText);
  } catch (e) {
    throw new Error(`Linotype parse error (${sourceName}): invalid JSON frontmatter - ${e.message}`);
  }

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    throw new Error(`Linotype parse error (${sourceName}): frontmatter must be a JSON object`);
  }

  // Body is everything after the closing ---
  const body = lines.slice(closingIndex + 1).join('\n');

  return { frontmatter, body };
}

/**
 * Validates required frontmatter fields.
 *
 * @param {Object} frontmatter - Parsed frontmatter object
 * @param {string} sourceName - Source identifier for error messages
 * @throws {Error} If required fields are missing or invalid
 */
function validateFrontmatter(frontmatter, sourceName) {
  if (typeof frontmatter.name !== 'string' || frontmatter.name.length === 0) {
    throw new Error(`Linotype parse error (${sourceName}): missing required field "name"`);
  }
  if (typeof frontmatter.version !== 'string' || frontmatter.version.length === 0) {
    throw new Error(`Linotype parse error (${sourceName}): missing required field "version"`);
  }
  if (!frontmatter.slots || typeof frontmatter.slots !== 'object' || Array.isArray(frontmatter.slots)) {
    throw new Error(`Linotype parse error (${sourceName}): missing required field "slots"`);
  }
}

/**
 * Detects slot references in the template body.
 *
 * @param {string} body - Template body text
 * @returns {string[]} Array of unique detected slot names
 */
function detectSlots(body) {
  const slots = new Set();
  let match;
  const regex = new RegExp(SLOT_REGEX.source, SLOT_REGEX.flags);

  while ((match = regex.exec(body)) !== null) {
    slots.add(match[1]);
  }

  return [...slots];
}

/**
 * Parses a template string into a Matrix object.
 *
 * @param {string} content - Raw template content (frontmatter + body)
 * @param {string} sourceName - Source identifier for error messages
 * @returns {Readonly<Object>} Frozen Matrix object
 * @throws {Error} If frontmatter is missing, invalid, or missing required fields
 */
function parseString(content, sourceName) {
  const { frontmatter, body } = extractFrontmatter(content, sourceName);
  validateFrontmatter(frontmatter, sourceName);

  const detected_slots = detectSlots(body);

  return createMatrix({
    name: frontmatter.name,
    version: frontmatter.version,
    description: frontmatter.description,
    tags: frontmatter.tags,
    token_estimate: frontmatter.token_estimate,
    slots: frontmatter.slots,
    includes: frontmatter.includes,
    body,
    raw_frontmatter: frontmatter
  });
}

/**
 * Parses a template file from disk into a Matrix object.
 *
 * @param {string} filePath - Absolute path to the template file
 * @returns {Promise<Readonly<Object>>} Frozen Matrix object
 * @throws {Error} If file cannot be read, frontmatter is missing/invalid, or required fields missing
 */
async function parse(filePath) {
  const content = await Bun.file(filePath).text();
  return parseString(content, filePath);
}

module.exports = { parse, parseString };

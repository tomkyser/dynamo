'use strict';

/**
 * JSON frontmatter parser and serializer.
 *
 * Parses and produces markdown files with JSON frontmatter
 * between triple-dash delimiters per D-13 and D-14:
 *
 * ```
 * ---
 * {"key": "value"}
 * ---
 *
 * Body content
 * ```
 *
 * Replaces the previous YAML frontmatter parser. The API surface
 * is identical: parseFrontmatter(content) and serializeFrontmatter(frontmatter, body).
 * This ensures journal.cjs needs zero changes.
 *
 * Designed for Reverie fragment schema which includes nested
 * structures like temporal, decay, and associations.
 *
 * @module frontmatter
 */

/**
 * Parses markdown content with JSON frontmatter.
 *
 * Expects content in the format:
 * ```
 * ---
 * {"key": "value"}
 * ---
 *
 * body content
 * ```
 *
 * @param {string} content - The full markdown content string
 * @returns {{ frontmatter: Object, body: string } | null} Parsed result or null if no frontmatter
 */
function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') return null;

  // Match: ---\n{json}\n---\n\nbody
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    // Try empty frontmatter: ---\n---
    const emptyMatch = content.match(/^---\n---\n?([\s\S]*)$/);
    if (!emptyMatch) return null;
    return { frontmatter: {}, body: (emptyMatch[1] || '').trim() };
  }

  let frontmatter;
  try {
    frontmatter = JSON.parse(match[1]);
  } catch (e) {
    return null; // Invalid JSON frontmatter
  }

  return { frontmatter, body: (match[2] || '').trim() };
}

/**
 * Serializes frontmatter and body into a markdown string with JSON frontmatter.
 *
 * Produces output in the format:
 * ```
 * ---
 * {
 *   "key": "value"
 * }
 * ---
 *
 * body content
 * ```
 *
 * @param {Object} frontmatter - The frontmatter object to serialize
 * @param {string} body - The body content
 * @returns {string} Complete markdown string with frontmatter
 */
function serializeFrontmatter(frontmatter, body) {
  const json = JSON.stringify(frontmatter, null, 2);
  return `---\n${json}\n---\n\n${body || ''}`;
}

module.exports = { parseFrontmatter, serializeFrontmatter };

'use strict';

/**
 * Versioned JSONL parser for Claude Code transcript files.
 *
 * Parses the undocumented transcript JSONL format used by Claude Code.
 * The versioned parser approach detects the format on first read and selects
 * the matching parser, allowing future format changes to be handled by adding
 * a new parser version without modifying existing consumers.
 *
 * All functions are pure (no side effects, no platform service dependencies).
 *
 * @module core/providers/lithograph/parser
 */

/**
 * Registry of versioned parsers. Each parser has:
 * - detect(firstParsed): Returns true if the parsed object matches this format
 * - parseLine(line, lineIndex): Parses a single JSONL line into an entry
 *
 * @type {Object.<string, { detect: function, parseLine: function }>}
 */
const PARSERS = Object.freeze({
  v1: {
    /**
     * Detects v1 transcript format. v1 lines have a "role" property (string).
     * @param {Object} parsed - The parsed JSON object from the first non-empty line
     * @returns {boolean}
     */
    detect(parsed) {
      return typeof parsed.role === 'string';
    },

    /**
     * Parses a single v1 JSONL line into a transcript entry.
     * Spreads all original fields and adds parser metadata.
     * @param {string} line - Raw JSONL line string
     * @param {number} lineIndex - Zero-based line index in the transcript
     * @returns {Object} Parsed entry with _parserVersion and _lineIndex metadata
     */
    parseLine(line, lineIndex) {
      const parsed = JSON.parse(line);
      return {
        ...parsed,
        _parserVersion: 'v1',
        _lineIndex: lineIndex
      };
    }
  }
});

/**
 * Detects the transcript format version from the first line of a JSONL file.
 *
 * Iterates through registered PARSERS, attempting each detect() function
 * on the parsed first line. Returns the version string of the first match,
 * or null if no parser matches (unknown format) or if the line is invalid JSON.
 *
 * @param {string} firstLine - The first non-empty line from the transcript file
 * @returns {string|null} Version string (e.g., 'v1') or null if undetectable
 */
function detectVersion(firstLine) {
  if (!firstLine || typeof firstLine !== 'string') {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(firstLine);
  } catch (_) {
    return null;
  }

  for (const [version, parser] of Object.entries(PARSERS)) {
    try {
      if (parser.detect(parsed)) {
        return version;
      }
    } catch (_) {
      // Parser detect threw -- skip this version
    }
  }

  return null;
}

/**
 * Parses a full transcript JSONL string into structured entries.
 *
 * Splits content on newlines, detects the format version from the first line,
 * and maps each line through the matching parser. Malformed lines are silently
 * skipped (logged in the future if needed). Empty/whitespace content returns
 * an empty result with null version.
 *
 * @param {string} content - Raw transcript JSONL content (newline-separated JSON objects)
 * @returns {{ version: string|null, entries: Object[], error?: string }}
 */
function parseTranscript(content) {
  if (!content || !content.trim()) {
    return { version: null, entries: [] };
  }

  const lines = content.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return { version: null, entries: [] };
  }

  const version = detectVersion(lines[0]);

  if (!version) {
    return { version: null, entries: [], error: 'UNKNOWN_FORMAT' };
  }

  const parser = PARSERS[version];
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const entry = parser.parseLine(lines[i], i);
      entries.push(entry);
    } catch (_) {
      // Malformed line -- skip without crashing
    }
  }

  return { version, entries };
}

/**
 * Extracts all tool_use content blocks from parsed transcript entries.
 *
 * Flat-maps all entries' content arrays, filtering for blocks with type === 'tool_use'.
 *
 * @param {Object[]} entries - Array of parsed transcript entries
 * @returns {Object[]} Flat array of tool_use content blocks
 */
function extractToolUseBlocks(entries) {
  const blocks = [];
  for (const entry of entries) {
    if (!Array.isArray(entry.content)) continue;
    for (const block of entry.content) {
      if (block.type === 'tool_use') {
        blocks.push(block);
      }
    }
  }
  return blocks;
}

/**
 * Extracts all tool_result content blocks from parsed transcript entries.
 *
 * Flat-maps all entries' content arrays, filtering for blocks with type === 'tool_result'.
 *
 * @param {Object[]} entries - Array of parsed transcript entries
 * @returns {Object[]} Flat array of tool_result content blocks
 */
function extractToolResults(entries) {
  const blocks = [];
  for (const entry of entries) {
    if (!Array.isArray(entry.content)) continue;
    for (const block of entry.content) {
      if (block.type === 'tool_result') {
        blocks.push(block);
      }
    }
  }
  return blocks;
}

/**
 * Filters parsed transcript entries by role.
 *
 * @param {Object[]} entries - Array of parsed transcript entries
 * @param {string} role - Role to filter by ('user' or 'assistant')
 * @returns {Object[]} Entries matching the specified role
 */
function filterByRole(entries, role) {
  return entries.filter(entry => entry.role === role);
}

/**
 * Finds the entry and content block matching a tool_use_id.
 *
 * Searches all entries' content arrays for a block with:
 * - `id` matching toolUseId (for tool_use blocks), or
 * - `tool_use_id` matching toolUseId (for tool_result blocks)
 *
 * Returns the first match found.
 *
 * @param {Object[]} entries - Array of parsed transcript entries
 * @param {string} toolUseId - The tool_use_id to search for
 * @returns {{ entry: Object, block: Object }|null} Matching entry and block, or null
 */
function findByToolUseId(entries, toolUseId) {
  for (const entry of entries) {
    if (!Array.isArray(entry.content)) continue;
    for (const block of entry.content) {
      if (block.id === toolUseId || block.tool_use_id === toolUseId) {
        return { entry, block };
      }
    }
  }
  return null;
}

module.exports = {
  parseTranscript,
  detectVersion,
  PARSERS,
  extractToolUseBlocks,
  extractToolResults,
  filterByRole,
  findByToolUseId
};

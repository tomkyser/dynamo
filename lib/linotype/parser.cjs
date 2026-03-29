'use strict';

const { createMatrix } = require('./types.cjs');

/**
 * Parses a markdown template file with JSON frontmatter into a Matrix.
 * @param {string} filePath - Absolute path to template file
 * @returns {Promise<Object>} Matrix object
 */
async function parse(filePath) {
  const text = await Bun.file(filePath).text();
  return parseString(text, filePath);
}

/**
 * Parses a template string with JSON frontmatter into a Matrix.
 * @param {string} content - Template content string
 * @param {string} sourceName - Source name for error messages
 * @returns {Object} Matrix object
 */
function parseString(content, sourceName) {
  sourceName = sourceName || '<string>';

  // Find frontmatter delimiters
  const lines = content.split('\n');
  let fmStart = -1;
  let fmEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (fmStart === -1) {
        fmStart = i;
      } else {
        fmEnd = i;
        break;
      }
    }
  }

  if (fmStart === -1 || fmEnd === -1) {
    throw new Error(`Linotype parse error (${sourceName}): no JSON frontmatter found (expected --- delimiters)`);
  }

  // Extract and parse JSON frontmatter
  const fmContent = lines.slice(fmStart + 1, fmEnd).join('\n').trim();
  let parsed;
  try {
    parsed = JSON.parse(fmContent);
  } catch (e) {
    throw new Error(`Linotype parse error (${sourceName}): invalid JSON frontmatter: ${e.message}`);
  }

  // Validate required fields
  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error(`Linotype parse error (${sourceName}): missing required field "name"`);
  }
  if (!parsed.version || typeof parsed.version !== 'string') {
    throw new Error(`Linotype parse error (${sourceName}): missing required field "version"`);
  }
  if (!parsed.slots || typeof parsed.slots !== 'object' || Array.isArray(parsed.slots)) {
    throw new Error(`Linotype parse error (${sourceName}): missing required field "slots"`);
  }

  // Extract body (everything after closing ---)
  const body = lines.slice(fmEnd + 1).join('\n');

  // Detect slot references in body
  const slotRefRegex = /\{\{([^#/>!{][\w.@]+)\}\}/g;
  const detectedSlots = [];
  let match;
  while ((match = slotRefRegex.exec(body)) !== null) {
    const slotName = match[1].trim();
    if (!detectedSlots.includes(slotName)) {
      detectedSlots.push(slotName);
    }
  }

  return createMatrix({
    name: parsed.name,
    version: parsed.version,
    description: parsed.description || '',
    tags: parsed.tags || [],
    token_estimate: parsed.token_estimate || 0,
    slots: parsed.slots,
    includes: parsed.includes || [],
    body: body,
    raw_frontmatter: parsed
  });
}

module.exports = { parse, parseString };

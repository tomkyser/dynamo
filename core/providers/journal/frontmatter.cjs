'use strict';

/**
 * Zero-dependency YAML frontmatter parser and serializer.
 *
 * Handles the subset of YAML used in markdown frontmatter:
 * scalars (string, number, boolean, null), quoted strings,
 * inline arrays, block arrays, and nested objects.
 *
 * Designed for Reverie fragment schema which includes nested
 * structures like temporal, decay, and associations.
 *
 * @module frontmatter
 */

/**
 * Parses a value string into its appropriate JS type.
 *
 * @param {string} raw - The raw value string to parse
 * @returns {string|number|boolean|null|Array} Parsed value
 */
function _parseValue(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  const trimmed = raw.trim();

  if (trimmed === '') {
    return null;
  }

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Null
  if (trimmed === 'null') return null;

  // Quoted strings
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Inline array: [a, b, c]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(item => _parseValue(item.trim()));
  }

  // Number
  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== '') {
    return num;
  }

  // Default: string
  return trimmed;
}

/**
 * Parses a YAML string into a JavaScript object.
 * Handles scalars, arrays (inline and block), and nested objects.
 *
 * @param {string} yaml - YAML content string (without --- delimiters)
 * @returns {Object} Parsed object
 */
function _parseYaml(yaml) {
  const lines = yaml.split('\n');
  const root = {};

  // Stack tracks the nesting context. Each frame:
  // { indent: number, target: object|array, key: string|null }
  const stack = [{ indent: -1, target: root, key: null }];

  /**
   * Gets the current target from the stack.
   * @returns {{ indent: number, target: Object|Array, key: string|null }}
   */
  function current() {
    return stack[stack.length - 1];
  }

  /**
   * Pops stack frames until we find one at or below the given indent level.
   * @param {number} indent - The indent level to pop to
   */
  function popToIndent(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    // Calculate indent (number of leading spaces)
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // Pop stack to correct nesting level
    popToIndent(indent);

    const ctx = current();

    // Array item: - value or - key: value
    if (trimmed.startsWith('- ')) {
      const itemValue = trimmed.slice(2).trim();

      // Check if this array item is a key: value pair (object in array)
      const colonIdx = itemValue.indexOf(':');
      if (colonIdx > 0 && !itemValue.startsWith('"') && !itemValue.startsWith("'")) {
        const maybeKey = itemValue.slice(0, colonIdx).trim();
        const maybeVal = itemValue.slice(colonIdx + 1).trim();
        // If it looks like a key: value, create an object
        if (/^[\w_][\w_.-]*$/.test(maybeKey)) {
          const obj = {};
          obj[maybeKey] = _parseValue(maybeVal);
          if (Array.isArray(ctx.target)) {
            ctx.target.push(obj);
          }
          continue;
        }
      }

      // Simple array item
      if (Array.isArray(ctx.target)) {
        ctx.target.push(_parseValue(itemValue));
      }
      continue;
    }

    // Key: value or Key: (start of nested)
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const valueStr = trimmed.slice(colonIdx + 1).trim();

      if (valueStr === '') {
        // No value -- peek at next non-empty line to determine structure type.
        // If next relevant line has greater indent, it's nested. Otherwise, treat as null.
        let nextType = null; // null means "no nested content"
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          const nextTrimmed = nextLine.trim();
          if (nextTrimmed === '' || nextTrimmed.startsWith('#')) continue;
          const nextIndent = nextLine.length - nextLine.trimStart().length;
          if (nextIndent > indent) {
            nextType = nextTrimmed.startsWith('- ') ? 'array' : 'object';
          }
          break;
        }

        if (nextType === null) {
          // No nested content follows -- this is a null value
          ctx.target[key] = null;
        } else {
          const child = nextType === 'array' ? [] : {};
          ctx.target[key] = child;
          stack.push({ indent, target: child, key });
        }
      } else {
        // Inline value
        ctx.target[key] = _parseValue(valueStr);
      }
    }
  }

  return root;
}

/**
 * Parses markdown content with YAML frontmatter.
 *
 * Expects content in the format:
 * ```
 * ---
 * key: value
 * ---
 * body content
 * ```
 *
 * @param {string} content - The full markdown content string
 * @returns {{ frontmatter: Object, body: string } | null} Parsed result or null if no frontmatter
 */
function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Match frontmatter: starts with ---, ends with ---
  // Handles both non-empty and empty frontmatter blocks
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    // Try empty frontmatter: ---\n---
    const emptyMatch = content.match(/^---\n---\n?([\s\S]*)$/);
    if (!emptyMatch) {
      return null;
    }
    return {
      frontmatter: {},
      body: (emptyMatch[1] || '').trim()
    };
  }

  const yamlStr = match[1];
  const body = match[2];

  const frontmatter = _parseYaml(yamlStr);

  return {
    frontmatter,
    body: body.trim()
  };
}

/**
 * Determines if a string value needs quoting in YAML.
 *
 * @param {string} value - The string to check
 * @returns {boolean} True if the string needs quoting
 */
function _needsQuoting(value) {
  if (typeof value !== 'string') return false;
  // Quote if contains colon followed by space, or starts/ends with special chars
  if (value.includes(': ') || value.includes('#')) return true;
  // Quote if it would be parsed as something else
  if (value === 'true' || value === 'false' || value === 'null') return true;
  if (!Number.isNaN(Number(value)) && value.trim() !== '') return true;
  return false;
}

/**
 * Serializes a JavaScript value to a YAML string representation.
 *
 * @param {*} value - The value to serialize
 * @returns {string} YAML string representation
 */
function _serializeValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (_needsQuoting(value)) return `"${value}"`;
    return value;
  }
  return String(value);
}

/**
 * Serializes a JavaScript object to a YAML string.
 *
 * @param {Object} obj - The object to serialize
 * @param {number} indent - Current indentation level (number of spaces)
 * @returns {string} YAML string
 */
function _serializeYaml(obj, indent) {
  const prefix = ' '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result += `${prefix}${key}: null\n`;
    } else if (Array.isArray(value)) {
      result += `${prefix}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Object in array: serialize as "- key: value" for single-key objects
          const entries = Object.entries(item);
          if (entries.length === 1) {
            const [k, v] = entries[0];
            result += `${prefix}  - ${k}: ${_serializeValue(v)}\n`;
          } else {
            // Multi-key object in array
            result += `${prefix}  -\n`;
            result += _serializeYaml(item, indent + 4);
          }
        } else {
          result += `${prefix}  - ${_serializeValue(item)}\n`;
        }
      }
    } else if (typeof value === 'object') {
      result += `${prefix}${key}:\n`;
      result += _serializeYaml(value, indent + 2);
    } else {
      result += `${prefix}${key}: ${_serializeValue(value)}\n`;
    }
  }

  return result;
}

/**
 * Serializes frontmatter and body into a markdown string with YAML frontmatter.
 *
 * @param {Object} frontmatter - The frontmatter object to serialize
 * @param {string} body - The body content
 * @returns {string} Complete markdown string with frontmatter
 */
function serializeFrontmatter(frontmatter, body) {
  const yaml = _serializeYaml(frontmatter, 0);
  const bodyStr = body || '';
  return `---\n${yaml}---\n\n${bodyStr}`;
}

module.exports = { parseFrontmatter, serializeFrontmatter };

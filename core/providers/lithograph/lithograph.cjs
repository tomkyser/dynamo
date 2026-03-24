'use strict';

const fs = require('node:fs');
const { ok, err } = require('../../../lib/index.cjs');
const { validateDataProvider } = require('../provider-contract.cjs');
const {
  parseTranscript,
  findByToolUseId,
  extractToolUseBlocks,
  extractToolResults,
  filterByRole
} = require('./parser.cjs');

/**
 * Creates a Lithograph transcript data provider.
 *
 * Lithograph wraps the undocumented Claude Code transcript_path mechanism
 * behind a versioned, validated provider contract. It enables transcript
 * reading, querying, atomic manipulation, and rollback -- the foundation
 * for context sculpting in future phases and richer formation stimulus.
 *
 * The transcript_path is session-scoped: injected once per session via
 * setTranscriptPath(), then used for all subsequent operations.
 *
 * Read/query operations are synchronous (fast hot path for hooks).
 * Write/delete operations are async with atomic semantics (temp+rename via Lathe).
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createLithograph() {
  /** @type {boolean} */
  let _started = false;

  /** @type {Object|null} Lathe service instance for atomic writes */
  let _lathe = null;

  /** @type {string|null} Session-scoped path to the transcript JSONL file */
  let _transcriptPath = null;

  /** @type {{ version: string|null, entries: Object[] }|null} Cached parse result */
  let _cachedParse = null;

  /**
   * Initialize the Lithograph provider.
   *
   * Requires a Lathe service instance for atomic write operations.
   * Transcript path is NOT set at init -- it is session-scoped and injected
   * via setTranscriptPath() after SessionStart fires.
   *
   * @param {Object} options - Initialization options
   * @param {Object} options.lathe - Lathe service instance for writeFileAtomic
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function init(options) {
    if (!options || !options.lathe) {
      return err('INIT_FAILED', 'Lithograph init requires lathe service');
    }
    _lathe = options.lathe;
    return ok(undefined);
  }

  /**
   * Start the Lithograph provider.
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Lithograph provider.
   * Clears started state, transcript path, and cached parse results.
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function stop() {
    _started = false;
    _transcriptPath = null;
    _cachedParse = null;
    return ok(undefined);
  }

  /**
   * Check health status of the Lithograph provider.
   * Reports healthy only when started. Includes transcript path for diagnostics.
   * @returns {{ status: string, transcriptPath: string|null }}
   */
  function healthCheck() {
    return {
      status: _started ? 'healthy' : 'unhealthy',
      transcriptPath: _transcriptPath
    };
  }

  /**
   * Set the session-scoped transcript file path.
   *
   * Called once per session when SessionStart fires (transcript_path comes
   * from the hook payload). Invalidates any cached parse results, forcing
   * a fresh read on next operation.
   *
   * @param {string} transcriptPath - Absolute path to the JSONL transcript file
   */
  function setTranscriptPath(transcriptPath) {
    _transcriptPath = transcriptPath;
    _cachedParse = null;
  }

  /**
   * Ensures transcript is parsed and cached. Reads file synchronously.
   * @returns {import('../../../lib/result.cjs').Result<{ version: string|null, entries: Object[] }>}
   */
  function _ensureParsed() {
    if (_cachedParse) {
      return ok(_cachedParse);
    }
    if (!_transcriptPath) {
      return err('NO_TRANSCRIPT_PATH', 'Call setTranscriptPath() before read operations');
    }
    try {
      const content = fs.readFileSync(_transcriptPath, 'utf8');
      _cachedParse = parseTranscript(content);
      return ok(_cachedParse);
    } catch (e) {
      return err('READ_FAILED', `Failed to read transcript: ${e.message}`, { path: _transcriptPath });
    }
  }

  /**
   * Read transcript data.
   *
   * Synchronous operation for fast hook response times.
   *
   * @param {string} [id='all'] - 'all' for full parse result, or a numeric string for entry at that line index
   * @returns {import('../../../lib/result.cjs').Result<Object>}
   */
  function read(id) {
    const parseResult = _ensureParsed();
    if (!parseResult.ok) {
      return parseResult;
    }
    const parsed = parseResult.value;

    if (id === 'all' || id === undefined) {
      return ok(parsed);
    }

    const index = parseInt(id, 10);
    if (isNaN(index) || index < 0 || index >= parsed.entries.length) {
      return err('OUT_OF_BOUNDS', `Entry index ${id} is out of bounds (0-${parsed.entries.length - 1})`, { id });
    }
    return ok(parsed.entries[index]);
  }

  /**
   * Write/manipulate transcript data.
   *
   * Async operation with atomic write semantics via Lathe.
   *
   * @param {string} opType - Operation type: 'replace' or 'clear_input'
   * @param {Object} data - Operation data
   * @param {string} data.toolUseId - The tool_use_id to target
   * @param {string} [data.field] - Field to replace (for 'replace' op)
   * @param {*} [data.value] - New value (for 'replace' op)
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function write(opType, data) {
    if (!_transcriptPath) {
      return err('NO_TRANSCRIPT_PATH', 'Call setTranscriptPath() before write operations');
    }

    // Read current file content (fresh, not cached)
    let content;
    try {
      content = fs.readFileSync(_transcriptPath, 'utf8');
    } catch (e) {
      return err('READ_FAILED', `Failed to read transcript for write: ${e.message}`, { path: _transcriptPath });
    }

    const parsed = parseTranscript(content);
    if (!parsed.version) {
      return err('PARSE_FAILED', 'Failed to parse transcript for write operation');
    }

    const match = findByToolUseId(parsed.entries, data.toolUseId);
    if (!match) {
      return err('NOT_FOUND', `No block found with toolUseId: ${data.toolUseId}`, { toolUseId: data.toolUseId });
    }

    if (opType === 'replace') {
      match.block[data.field] = data.value;
    } else if (opType === 'clear_input') {
      match.block.input = {};
    } else {
      return err('INVALID_OPERATION', `Unknown write operation: ${opType}`, { opType });
    }

    // Serialize back to JSONL -- strip parser metadata before writing
    const serialized = _serializeEntries(parsed.entries);

    const writeResult = await _lathe.writeFileAtomic(_transcriptPath, serialized);
    if (!writeResult.ok) {
      return writeResult;
    }

    // Invalidate cache so next read gets fresh data
    _cachedParse = null;

    return ok(undefined);
  }

  /**
   * Query transcript data.
   *
   * Synchronous operation. Supports filtering by role, content type, or toolUseId.
   *
   * @param {Object} criteria - Query criteria
   * @param {string} [criteria.role] - Filter by role ('user' or 'assistant')
   * @param {string} [criteria.type] - Filter by content type ('tool_use' or 'tool_result')
   * @param {string} [criteria.toolUseId] - Find specific tool_use/tool_result by ID
   * @returns {import('../../../lib/result.cjs').Result<Object[]|Object|null>}
   */
  function query(criteria) {
    const parseResult = _ensureParsed();
    if (!parseResult.ok) {
      return parseResult;
    }
    const entries = parseResult.value.entries;

    if (criteria && criteria.role) {
      return ok(filterByRole(entries, criteria.role));
    }

    if (criteria && criteria.type) {
      if (criteria.type === 'tool_use') {
        return ok(extractToolUseBlocks(entries));
      }
      if (criteria.type === 'tool_result') {
        return ok(extractToolResults(entries));
      }
    }

    if (criteria && criteria.toolUseId) {
      return ok(findByToolUseId(entries, criteria.toolUseId));
    }

    // No recognized criteria -- return all entries
    return ok(entries);
  }

  /**
   * Delete a content block from the transcript by tool_use_id.
   *
   * Async operation with atomic write semantics.
   *
   * @param {string} id - The tool_use_id of the block to remove
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function del(id) {
    if (!_transcriptPath) {
      return err('NO_TRANSCRIPT_PATH', 'Call setTranscriptPath() before delete operations');
    }

    // Read current file content (fresh)
    let content;
    try {
      content = fs.readFileSync(_transcriptPath, 'utf8');
    } catch (e) {
      return err('READ_FAILED', `Failed to read transcript for delete: ${e.message}`, { path: _transcriptPath });
    }

    const parsed = parseTranscript(content);
    if (!parsed.version) {
      return err('PARSE_FAILED', 'Failed to parse transcript for delete operation');
    }

    const match = findByToolUseId(parsed.entries, id);
    if (!match) {
      return err('NOT_FOUND', `No block found with toolUseId: ${id}`, { toolUseId: id });
    }

    // Remove the block from its parent entry's content array
    const blockIndex = match.entry.content.indexOf(match.block);
    if (blockIndex !== -1) {
      match.entry.content.splice(blockIndex, 1);
    }

    // Serialize and write atomically
    const serialized = _serializeEntries(parsed.entries);

    const writeResult = await _lathe.writeFileAtomic(_transcriptPath, serialized);
    if (!writeResult.ok) {
      return writeResult;
    }

    // Invalidate cache
    _cachedParse = null;

    return ok(undefined);
  }

  /**
   * Serializes parsed entries back to JSONL format.
   * Strips parser metadata (_parserVersion, _lineIndex) before writing.
   *
   * @param {Object[]} entries - Parsed transcript entries
   * @returns {string} JSONL string (one JSON object per line)
   */
  function _serializeEntries(entries) {
    return entries.map(entry => {
      const clean = { ...entry };
      delete clean._parserVersion;
      delete clean._lineIndex;
      return JSON.stringify(clean);
    }).join('\n');
  }

  // Build the full implementation including the extra setTranscriptPath method
  const impl = {
    init,
    start,
    stop,
    healthCheck,
    read,
    write,
    query,
    delete: del,
    setTranscriptPath
  };

  return validateDataProvider('lithograph', impl);
}

module.exports = { createLithograph };

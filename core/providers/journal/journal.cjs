'use strict';

const path = require('node:path');
const { ok, err } = require('../../../lib/index.cjs');
const { validateDataProvider } = require('../provider-contract.cjs');
const { parseFrontmatter, serializeFrontmatter } = require('./frontmatter.cjs');

/**
 * Creates a Journal flat-file markdown data provider.
 *
 * Journal stores documents as markdown files with YAML frontmatter metadata.
 * It implements the same DATA_PROVIDER_SHAPE contract as Ledger, enabling
 * Assay to search across both providers uniformly.
 *
 * All file I/O is performed through the Lathe service (injected via options).
 * Switchboard events are emitted on mutations when a Switchboard instance is provided.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createJournal() {
  /** @type {boolean} */
  let _started = false;

  /** @type {Object|null} Lathe service instance */
  let _lathe = null;

  /** @type {Object|null} Switchboard service instance */
  let _switchboard = null;

  /** @type {string|null} Base directory path for markdown files */
  let _basePath = null;

  /**
   * Constructs the file path for a document ID.
   *
   * @param {string} id - Document identifier
   * @returns {string} Absolute file path
   */
  function _filePath(id) {
    return path.join(_basePath, id + '.md');
  }

  /**
   * Emits an event on the Switchboard if one is configured.
   *
   * @param {string} eventName - Event name to emit
   * @param {Object} payload - Event payload
   */
  function _emit(eventName, payload) {
    if (_switchboard) {
      _switchboard.emit(eventName, payload);
    }
  }

  /**
   * Initialize the Journal provider.
   *
   * @param {Object} options - Initialization options
   * @param {string} options.basePath - Base directory for storing markdown files
   * @param {Object} options.lathe - Lathe service instance for file I/O
   * @param {Object} [options.switchboard] - Optional Switchboard for event emission
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function init(options) {
    if (!options || !options.basePath) {
      return err('INIT_FAILED', 'Journal init requires basePath');
    }
    if (!options.lathe) {
      return err('INIT_FAILED', 'Journal init requires lathe service');
    }

    _lathe = options.lathe;
    _switchboard = options.switchboard || null;
    _basePath = options.basePath;

    // Ensure base directory exists
    _lathe.mkdir(_basePath);

    return ok(undefined);
  }

  /**
   * Start the Journal provider.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Journal provider.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function stop() {
    _started = false;
    return ok(undefined);
  }

  /**
   * Check the health status of the Journal provider.
   *
   * @returns {import('../../../lib/result.cjs').Result<{ healthy: boolean, name: string }>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'journal' });
  }

  /**
   * Read a document by ID.
   *
   * @param {string} id - Document identifier
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ id: string, data: Object, body: string }>>}
   */
  async function read(id) {
    const filePath = _filePath(id);

    const existsResult = await _lathe.exists(filePath);
    if (!existsResult.value) {
      return err('NOT_FOUND', `Document not found: ${id}`, { id });
    }

    const readResult = await _lathe.readFile(filePath);
    if (!readResult.ok) {
      return readResult;
    }

    const parsed = parseFrontmatter(readResult.value);
    if (!parsed) {
      return err('PARSE_FAILED', `No frontmatter found in ${id}`, { id });
    }

    return ok({
      id,
      data: parsed.frontmatter,
      body: parsed.body
    });
  }

  /**
   * Write a document by ID.
   *
   * Accepts either:
   * - write(id, frontmatterObj, bodyStr) -- separate frontmatter and body
   * - write(id, { frontmatter: {...}, body: '...' }) -- combined data object
   *
   * @param {string} id - Document identifier
   * @param {Object} data - Frontmatter object, or { frontmatter, body } combined
   * @param {string} [body=''] - Body content (if data is just frontmatter)
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function write(id, data, body) {
    let frontmatter;
    let bodyStr;

    // Normalize: if data has frontmatter and body keys, extract them
    if (data && typeof data === 'object' && 'frontmatter' in data && 'body' in data) {
      frontmatter = data.frontmatter;
      bodyStr = data.body || '';
    } else {
      frontmatter = data;
      bodyStr = body || '';
    }

    const content = serializeFrontmatter(frontmatter, bodyStr);
    const filePath = _filePath(id);

    const writeResult = await _lathe.writeFileAtomic(filePath, content);
    if (!writeResult.ok) {
      return writeResult;
    }

    _emit('data:written', { provider: 'journal', id, data: frontmatter });

    return ok(undefined);
  }

  /**
   * Query documents by frontmatter criteria.
   *
   * Scans all .md files in basePath, parses frontmatter, and filters by
   * matching criteria keys against frontmatter values. Empty or null criteria
   * returns all documents.
   *
   * Special criteria keys (prefixed with _):
   * - _limit: Maximum number of results to return
   *
   * @param {Object|null} criteria - Query criteria object
   * @returns {Promise<import('../../../lib/result.cjs').Result<Array<{ id: string, data: Object, body: string }>>>}
   */
  async function query(criteria) {
    const listResult = _lathe.listDir(_basePath);
    if (!listResult.ok) {
      return ok([]); // Empty directory or not found -- return empty
    }

    const entries = listResult.value.filter(
      e => e.isFile && e.name.endsWith('.md')
    );

    const results = [];
    const limit = (criteria && criteria._limit) ? criteria._limit : Infinity;

    for (const entry of entries) {
      if (results.length >= limit) break;

      const id = entry.name.slice(0, -3); // Remove .md extension
      const readResult = await read(id);
      if (!readResult.ok) continue;

      const doc = readResult.value;

      // Filter by criteria
      if (criteria && typeof criteria === 'object') {
        let matches = true;
        for (const [key, value] of Object.entries(criteria)) {
          // Skip special keys (prefixed with _)
          if (key.startsWith('_')) continue;

          const fmValue = doc.data[key];
          if (Array.isArray(fmValue)) {
            // If frontmatter value is an array, check if criteria value is contained
            if (!fmValue.includes(value)) {
              matches = false;
              break;
            }
          } else if (fmValue !== value) {
            matches = false;
            break;
          }
        }

        if (!matches) continue;
      }

      results.push(doc);
    }

    return ok(results);
  }

  /**
   * Delete a document by ID.
   *
   * @param {string} id - Document identifier
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function del(id) {
    const filePath = _filePath(id);

    const existsResult = await _lathe.exists(filePath);
    if (!existsResult.value) {
      return err('NOT_FOUND', `Document not found: ${id}`, { id });
    }

    const deleteResult = _lathe.deleteFile(filePath);
    if (!deleteResult.ok) {
      return deleteResult;
    }

    _emit('data:deleted', { provider: 'journal', id });

    return ok(undefined);
  }

  return validateDataProvider('journal', {
    init,
    start,
    stop,
    healthCheck,
    read,
    write,
    query,
    delete: del
  });
}

module.exports = { createJournal };

// Dynamo > Ledger > search.cjs
'use strict';

const path = require('path');
const fs = require('fs');

const resolve = require('../lib/resolve.cjs');
const { logError } = require(resolve('dynamo', 'core.cjs'));
const { MCPClient } = require(path.join(__dirname, 'mcp-client.cjs'));
const { extractContent } = require(path.join(__dirname, 'episodes.cjs'));

/**
 * Search Graphiti for facts (relationships between entities).
 */
async function searchFacts(query, groupId, options = {}) {
  try {
    const client = new MCPClient(options);
    const response = await client.callTool('search_memory_facts', {
      query,
      group_id: groupId,
      max_facts: options.maxFacts || 10
    });
    return extractContent(response);
  } catch (err) {
    logError(options.hookName || 'search', 'searchFacts error: ' + err.message);
    return '';
  }
}

/**
 * Search Graphiti for entity nodes.
 */
async function searchNodes(query, groupId, options = {}) {
  try {
    const client = new MCPClient(options);
    const response = await client.callTool('search_nodes', {
      query,
      group_id: groupId,
      max_nodes: options.maxNodes || 5
    });
    return extractContent(response);
  } catch (err) {
    logError(options.hookName || 'search', 'searchNodes error: ' + err.message);
    return '';
  }
}

/**
 * Combined search: facts + nodes in parallel.
 */
async function combinedSearch(query, groupId, options = {}) {
  const [facts, nodes] = await Promise.all([
    searchFacts(query, groupId, options),
    searchNodes(query, groupId, options)
  ]);

  if (!facts && !nodes) return '';
  return '## Facts\n' + facts + '\n\n## Entities\n' + nodes;
}

module.exports = { searchFacts, searchNodes, combinedSearch };

// Dynamo > Ledger > episodes.cjs
'use strict';

const path = require('path');
const fs = require('fs');

const resolve = require('../lib/resolve.cjs');
const { logError } = require(resolve('dynamo', 'core.cjs'));
const { MCPClient } = require(path.join(__dirname, 'mcp-client.cjs'));

/**
 * Extract text content from MCP JSON-RPC response.
 * Filters for items with type='text' and joins with newlines.
 */
function extractContent(response) {
  if (!response || response.error) return '';

  const content = (response.result || {}).content || [];
  const texts = content
    .filter(item => item.type === 'text' && item.text)
    .map(item => item.text);

  return texts.join('\n');
}

/**
 * Write an episode to Graphiti via MCP callTool.
 */
async function addEpisode(content, groupId, options = {}) {
  try {
    const client = new MCPClient(options);
    const response = await client.callTool('add_memory', {
      content,
      group_id: groupId
    });
    return response;
  } catch (err) {
    logError(options.hookName || 'episodes', 'addEpisode error: ' + err.message);
    return null;
  }
}

module.exports = { addEpisode, extractContent };

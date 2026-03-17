// Dynamo > Ledger > mcp-client.cjs
'use strict';

const crypto = require('crypto');
const path = require('path');
const { fetchWithTimeout, loadConfig } = require(path.join(__dirname, '..', 'core.cjs'));

const MCP_DEFAULTS = {
  url: 'http://localhost:8100/mcp',
  healthUrl: 'http://localhost:8100/health',
  timeout: 5000
};

class MCPClient {
  constructor(options = {}) {
    const config = loadConfig();
    this.url = process.env.GRAPHITI_MCP_URL || options.url || config.graphiti?.mcp_url || MCP_DEFAULTS.url;
    this.timeout = options.timeout || config.timeouts?.mcp || MCP_DEFAULTS.timeout;
    this.sessionId = null;
  }

  async initialize() {
    if (this.sessionId) return;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };

    // Step 1: Send initialize request (MCP protocol 2025-03-26)
    const resp = await fetchWithTimeout(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'dynamo', version: '0.1.0' }
        },
        id: 1
      })
    }, this.timeout);

    this.sessionId = resp.headers.get('mcp-session-id');

    // Step 2: Send notifications/initialized (MCP spec requires this handshake)
    const notifHeaders = { 'Content-Type': 'application/json' };
    if (this.sessionId) notifHeaders['mcp-session-id'] = this.sessionId;

    await fetchWithTimeout(this.url, {
      method: 'POST',
      headers: notifHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })
    }, this.timeout);
  }

  async callTool(toolName, args) {
    await this.initialize();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId;

    const resp = await fetchWithTimeout(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: args },
        id: crypto.randomUUID()
      })
    }, this.timeout);

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return parseSSE(await resp.text());
    }
    return resp.json();
  }
}

function parseSSE(text) {
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if ('result' in parsed || 'error' in parsed) return parsed;
        } catch { continue; }
      }
    }
  }
  return { error: { message: 'No valid JSON-RPC response in SSE stream' } };
}

module.exports = { MCPClient, parseSSE };

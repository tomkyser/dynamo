// Dynamo > Tests > mcp-client.test.cjs
'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { MCPClient, parseSSE } = require(path.join(__dirname, '..', 'lib', 'ledger', 'mcp-client.cjs'));

// --- Test data ---

const validSSE = 'event: message\ndata: {"jsonrpc":"2.0","result":{"content":[{"text":"hello"}]},"id":"123"}\n\n';
const errorSSE = 'event: message\ndata: {"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid Request"},"id":"456"}\n\n';
const emptySSE = 'event: ping\n\n';
const malformedSSE = 'data: not json\ndata: {"jsonrpc":"2.0","result":{"content":[]},"id":"789"}\n';
const multiDataSSE = 'data: {"jsonrpc":"2.0","id":"first"}\ndata: {"jsonrpc":"2.0","result":{"content":[{"text":"second"}]},"id":"match"}\n';

describe('parseSSE', () => {
  it('extracts JSON-RPC result from valid SSE data', () => {
    const result = parseSSE(validSSE);
    assert.ok('result' in result);
    assert.deepStrictEqual(result.result, { content: [{ text: 'hello' }] });
    assert.strictEqual(result.id, '123');
  });

  it('extracts JSON-RPC error from SSE data', () => {
    const result = parseSSE(errorSSE);
    assert.ok('error' in result);
    assert.strictEqual(result.error.code, -32600);
    assert.strictEqual(result.error.message, 'Invalid Request');
  });

  it('returns error object when no valid data in stream', () => {
    const result = parseSSE(emptySSE);
    assert.ok('error' in result);
    assert.ok(result.error.message.includes('No valid JSON-RPC response'));
  });

  it('handles multiple data: lines, returning first valid JSON-RPC', () => {
    const result = parseSSE(multiDataSSE);
    // First data line has no result/error key, so it is skipped
    // Second data line has result, so it is returned
    assert.ok('result' in result);
    assert.strictEqual(result.id, 'match');
  });

  it('handles malformed JSON gracefully (continues to next line)', () => {
    const result = parseSSE(malformedSSE);
    // First line is not valid JSON, second line is valid
    assert.ok('result' in result);
    assert.strictEqual(result.id, '789');
  });

  it('returns error for completely empty input', () => {
    const result = parseSSE('');
    assert.ok('error' in result);
  });

  it('handles data: with extra whitespace', () => {
    const result = parseSSE('data:   {"jsonrpc":"2.0","result":{"ok":true},"id":"ws"}  \n');
    assert.ok('result' in result);
    assert.strictEqual(result.result.ok, true);
  });
});

describe('MCPClient constructor', () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = process.env.GRAPHITI_MCP_URL;
    delete process.env.GRAPHITI_MCP_URL;
  });

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.GRAPHITI_MCP_URL = savedEnv;
    } else {
      delete process.env.GRAPHITI_MCP_URL;
    }
  });

  it('uses defaults when no options given', () => {
    const c = new MCPClient();
    assert.ok(c.url.includes('localhost'));
    assert.ok(c.url.includes('8100'));
    assert.strictEqual(typeof c.timeout, 'number');
    assert.ok(c.timeout > 0);
  });

  it('respects environment variable GRAPHITI_MCP_URL', () => {
    process.env.GRAPHITI_MCP_URL = 'http://custom-env:9999/mcp';
    const c = new MCPClient();
    assert.strictEqual(c.url, 'http://custom-env:9999/mcp');
  });

  it('respects options.url override', () => {
    const c = new MCPClient({ url: 'http://custom:9999/mcp' });
    assert.strictEqual(c.url, 'http://custom:9999/mcp');
  });

  it('environment variable takes precedence over options.url', () => {
    process.env.GRAPHITI_MCP_URL = 'http://env-wins:8100/mcp';
    const c = new MCPClient({ url: 'http://options-lose:8100/mcp' });
    assert.strictEqual(c.url, 'http://env-wins:8100/mcp');
  });

  it('sessionId is null before initialize()', () => {
    const c = new MCPClient();
    assert.strictEqual(c.sessionId, null);
  });

  it('respects options.timeout', () => {
    const c = new MCPClient({ timeout: 10000 });
    assert.strictEqual(c.timeout, 10000);
  });
});

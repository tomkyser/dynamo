// Dynamo > Tests > integration.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const DISPATCHER = path.join(os.homedir(), '.claude', 'dynamo', 'hooks', 'dynamo-hooks.cjs');

/**
 * Pipe JSON through the dispatcher and capture results.
 * Handlers will gracefully degrade (exit 0) when Graphiti/OpenRouter are unavailable.
 */
function pipeThrough(jsonInput, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [DISPATCHER], { timeout: timeoutMs });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => resolve({ code, stdout, stderr }));
    proc.on('error', reject);
    proc.stdin.write(JSON.stringify(jsonInput));
    proc.stdin.end();
  });
}

describe('Integration: pipe-through dispatcher', () => {
  it('SessionStart exits 0', async () => {
    const result = await pipeThrough({
      hook_event_name: 'SessionStart',
      session_id: 'test',
      cwd: '/tmp',
      source: 'startup'
    });
    assert.strictEqual(result.code, 0, 'Should exit 0');
  });

  it('UserPromptSubmit exits 0', async () => {
    const result = await pipeThrough({
      hook_event_name: 'UserPromptSubmit',
      session_id: 'test',
      cwd: '/tmp',
      prompt: 'hello world test prompt that is long enough'
    });
    assert.strictEqual(result.code, 0, 'Should exit 0');
  });

  it('PostToolUse exits 0', async () => {
    const result = await pipeThrough({
      hook_event_name: 'PostToolUse',
      session_id: 'test',
      cwd: '/tmp',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/test.txt' }
    });
    assert.strictEqual(result.code, 0, 'Should exit 0');
  });

  it('PreCompact exits 0', async () => {
    const result = await pipeThrough({
      hook_event_name: 'PreCompact',
      session_id: 'test',
      cwd: '/tmp',
      custom_instructions: 'some context here that is long enough to process and trigger summarization logic properly'
    });
    assert.strictEqual(result.code, 0, 'Should exit 0');
  });

  it('Stop with stop_hook_active=true exits 0 immediately', async () => {
    const start = Date.now();
    const result = await pipeThrough({
      hook_event_name: 'Stop',
      session_id: 'test',
      cwd: '/tmp',
      stop_hook_active: true
    });
    assert.strictEqual(result.code, 0, 'Should exit 0');
    assert.ok(Date.now() - start < 3000, 'Should exit quickly when stop_hook_active is true');
  });

  it('unknown event exits 0 silently', async () => {
    const result = await pipeThrough({
      hook_event_name: 'UnknownEvent',
      session_id: 'test',
      cwd: '/tmp'
    });
    assert.strictEqual(result.code, 0, 'Should exit 0');
    assert.strictEqual(result.stdout, '', 'Unknown events should produce no output');
  });

  it('invalid JSON exits 0 gracefully', async () => {
    const proc = spawn('node', [DISPATCHER], { timeout: 10000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    const result = await new Promise(resolve => {
      proc.on('close', code => resolve({ code, stdout, stderr }));
      proc.stdin.write('not valid json{{{');
      proc.stdin.end();
    });
    assert.strictEqual(result.code, 0, 'Must exit 0 even on invalid JSON');
  });
});

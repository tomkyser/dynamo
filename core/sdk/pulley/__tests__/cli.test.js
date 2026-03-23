'use strict';

const { describe, it, expect, beforeEach, mock } = require('bun:test');
const { ok, err, unwrap } = require('../../../../lib/result.cjs');
const { createPulley } = require('../pulley.cjs');
const { main } = require('../cli.cjs');

describe('CLI main', () => {
  let pulley;
  let stdoutChunks;
  let stderrChunks;
  let originalStdoutWrite;
  let originalStderrWrite;

  beforeEach(() => {
    pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({ human: 'Status: ok', json: { status: 'ok' }, raw: 'ok' }), { description: 'Show status' });
    pulley.registerCommand('health', () => ok({ human: 'Healthy', json: { healthy: true }, raw: 'healthy' }), { description: 'Health check' });

    stdoutChunks = [];
    stderrChunks = [];
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;
    process.stdout.write = (chunk) => { stdoutChunks.push(chunk); return true; };
    process.stderr.write = (chunk) => { stderrChunks.push(chunk); return true; };
  });

  // Restore after each test
  const restoreStreams = () => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  };

  it('calls pulley.route with correct args for basic command', async () => {
    const result = await main(['status'], pulley);
    restoreStreams();
    expect(result.ok).toBe(true);
    const output = stdoutChunks.join('');
    expect(output).toContain('Status: ok');
  });

  it('passes json flag when --json is used', async () => {
    const result = await main(['status', '--json'], pulley);
    restoreStreams();
    expect(result.ok).toBe(true);
    const output = stdoutChunks.join('');
    expect(output).toContain('"status"');
  });

  it('outputs help text when --help is the only arg', async () => {
    const result = await main(['--help'], pulley);
    restoreStreams();
    expect(result.ok).toBe(true);
    const output = stdoutChunks.join('');
    expect(output).toContain('Usage: dynamo');
  });

  it('outputs command-specific help with command --help', async () => {
    const result = await main(['status', '--help'], pulley);
    restoreStreams();
    expect(result.ok).toBe(true);
    const output = stdoutChunks.join('');
    expect(output).toContain('Usage: dynamo status');
  });

  it('writes error to stderr for unknown command', async () => {
    const result = await main(['nonexistent'], pulley);
    restoreStreams();
    expect(result.ok).toBe(false);
    const errOutput = stderrChunks.join('');
    expect(errOutput).toContain('Error:');
    // Reset process.exitCode to avoid leaking to test runner
    process.exitCode = 0;
  });
});

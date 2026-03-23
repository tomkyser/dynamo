'use strict';

const { describe, it, expect } = require('bun:test');
const { formatOutput } = require('../output.cjs');
const { generateHelp, generateCommandHelp } = require('../help.cjs');

describe('formatOutput', () => {
  it('returns human field in human mode', () => {
    const result = { human: 'Status: ok', json: { status: 'ok' }, raw: '{"status":"ok"}' };
    expect(formatOutput(result, 'human')).toBe('Status: ok');
  });

  it('returns JSON.stringify of json field in json mode', () => {
    const result = { human: 'Status: ok', json: { status: 'ok' } };
    expect(formatOutput(result, 'json')).toBe(JSON.stringify({ status: 'ok' }, null, 2));
  });

  it('returns raw field in raw mode', () => {
    const result = { raw: 'raw data' };
    expect(formatOutput(result, 'raw')).toBe('raw data');
  });

  it('falls back to JSON.stringify when human field missing', () => {
    const result = { json: { a: 1 } };
    const output = formatOutput(result, 'human');
    // Should fall back to JSON.stringify of the whole object
    expect(output).toBe(JSON.stringify(result, null, 2));
  });

  it('coerces plain string in human mode', () => {
    expect(formatOutput('plain string', 'human')).toBe('plain string');
  });

  it('handles null in human mode', () => {
    expect(formatOutput(null, 'human')).toBe('null');
  });

  it('returns pretty-printed JSON string for json mode', () => {
    const result = { json: { a: 1 } };
    expect(formatOutput(result, 'json')).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it('falls back to JSON.stringify for raw mode when raw field missing', () => {
    const result = { json: { a: 1 } };
    expect(formatOutput(result, 'raw')).toBe(JSON.stringify(result));
  });
});

describe('generateHelp', () => {
  it('generates help text with all command names and descriptions', () => {
    const commands = new Map([
      ['status', { description: 'Show status' }],
      ['health', { description: 'Health check' }],
    ]);
    const help = generateHelp(commands);
    expect(help).toContain('status');
    expect(help).toContain('Show status');
    expect(help).toContain('health');
    expect(help).toContain('Health check');
  });

  it('includes dynamo prefix in usage line', () => {
    const commands = new Map([['status', { description: 'Show status' }]]);
    const help = generateHelp(commands);
    expect(help).toContain('Usage: dynamo');
  });

  it('returns usage line with no commands listed for empty map', () => {
    const commands = new Map();
    const help = generateHelp(commands);
    expect(help).toContain('Usage: dynamo');
    expect(help).toContain('Commands:');
  });

  it('sorts command names alphabetically', () => {
    const commands = new Map([
      ['zebra', { description: 'Zebra cmd' }],
      ['alpha', { description: 'Alpha cmd' }],
    ]);
    const help = generateHelp(commands);
    const alphaIdx = help.indexOf('alpha');
    const zebraIdx = help.indexOf('zebra');
    expect(alphaIdx).toBeLessThan(zebraIdx);
  });
});

describe('generateCommandHelp', () => {
  it('generates per-command help with description', () => {
    const help = generateCommandHelp('status', {
      description: 'Show system status',
      flags: { verbose: { type: 'boolean', description: 'Show verbose output' } },
    });
    expect(help).toContain('Usage: dynamo status');
    expect(help).toContain('Show system status');
    expect(help).toContain('--verbose');
    expect(help).toContain('Show verbose output');
  });

  it('generates help without flags section when no flags', () => {
    const help = generateCommandHelp('version', {
      description: 'Show version',
    });
    expect(help).toContain('Usage: dynamo version');
    expect(help).toContain('Show version');
    expect(help).not.toContain('Options:');
  });
});

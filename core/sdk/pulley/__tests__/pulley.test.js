'use strict';

const { describe, it, expect } = require('bun:test');
const { createPulley, PULLEY_SHAPE } = require('../pulley.cjs');
const { ok, err, unwrap } = require('../../../../lib/result.cjs');

describe('createPulley', () => {
  it('returns ok with contract', () => {
    const result = createPulley();
    expect(result.ok).toBe(true);
    expect(typeof result.value.registerCommand).toBe('function');
    expect(typeof result.value.route).toBe('function');
    expect(typeof result.value.getCommands).toBe('function');
    expect(typeof result.value.registerMcpTool).toBe('function');
    expect(typeof result.value.getMcpTools).toBe('function');
  });

  it('exports PULLEY_SHAPE', () => {
    expect(PULLEY_SHAPE).toBeDefined();
    expect(PULLEY_SHAPE.required).toContain('registerCommand');
    expect(PULLEY_SHAPE.required).toContain('route');
    expect(PULLEY_SHAPE.required).toContain('getCommands');
    expect(PULLEY_SHAPE.required).toContain('registerMcpTool');
    expect(PULLEY_SHAPE.required).toContain('getMcpTools');
  });
});

describe('registerCommand', () => {
  it('registers a command and returns ok', () => {
    const pulley = unwrap(createPulley());
    const result = pulley.registerCommand('status', () => ok({ human: 'ok' }), { description: 'Show status' });
    expect(result.ok).toBe(true);
  });

  it('rejects duplicate command registration with COMMAND_EXISTS', () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({ human: 'ok' }), { description: 'Show status' });
    const result = pulley.registerCommand('status', () => ok({ human: 'ok' }), { description: 'Show status' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('COMMAND_EXISTS');
  });

  it('registers subcommand with space-separated name', () => {
    const pulley = unwrap(createPulley());
    const result = pulley.registerCommand('reverie status', () => ok({ human: 'ok' }), { description: 'Reverie status' });
    expect(result.ok).toBe(true);
  });
});

describe('route', () => {
  it('calls status handler and returns result', async () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({ human: 'Status: ok', json: { status: 'ok' }, raw: 'ok' }), { description: 'Show status' });
    const result = await pulley.route(['status'], ['status']);
    expect(result.ok).toBe(true);
    expect(result.value.formatted).toContain('Status: ok');
  });

  it('calls subcommand handler via longest match', async () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('reverie', () => ok({ human: 'reverie root' }), { description: 'Reverie' });
    pulley.registerCommand('reverie status', () => ok({ human: 'reverie status result' }), { description: 'Reverie status' });
    const result = await pulley.route(['reverie', 'status'], ['reverie', 'status']);
    expect(result.ok).toBe(true);
    expect(result.value.formatted).toContain('reverie status result');
  });

  it('returns COMMAND_NOT_FOUND for unknown command', async () => {
    const pulley = unwrap(createPulley());
    const result = await pulley.route(['unknown'], ['unknown']);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('COMMAND_NOT_FOUND');
  });

  it('sets output mode to json when --json flag is passed', async () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({ human: 'Status: ok', json: { status: 'ok' }, raw: 'ok' }), { description: 'Show status' });
    const result = await pulley.route(['status'], ['status', '--json']);
    expect(result.ok).toBe(true);
    expect(result.value.outputMode).toBe('json');
  });

  it('returns help text when --help flag with no positionals', async () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({ human: 'ok' }), { description: 'Show status' });
    const result = await pulley.route([], ['--help']);
    expect(result.ok).toBe(true);
    expect(result.value.human).toContain('Usage: dynamo');
    expect(result.value.human).toContain('status');
  });

  it('returns command-specific help when --help flag with command', async () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({ human: 'ok' }), { description: 'Show system status', flags: { verbose: { type: 'boolean', description: 'Verbose output' } } });
    const result = await pulley.route(['status'], ['status', '--help']);
    expect(result.ok).toBe(true);
    expect(result.value.human).toContain('Usage: dynamo status');
    expect(result.value.human).toContain('Show system status');
  });
});

describe('registerMcpTool', () => {
  it('registers an MCP tool and returns ok', () => {
    const pulley = unwrap(createPulley());
    const result = pulley.registerMcpTool('dynamo_health', () => ok({ status: 'healthy' }), { description: 'Health check' });
    expect(result.ok).toBe(true);
  });

  it('rejects duplicate MCP tool registration with TOOL_EXISTS', () => {
    const pulley = unwrap(createPulley());
    pulley.registerMcpTool('dynamo_health', () => ok({}), { description: 'Health' });
    const result = pulley.registerMcpTool('dynamo_health', () => ok({}), { description: 'Health' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('TOOL_EXISTS');
  });

  it('getMcpTools returns all registered tools', () => {
    const pulley = unwrap(createPulley());
    pulley.registerMcpTool('dynamo_health', () => ok({}), { description: 'Health' });
    pulley.registerMcpTool('dynamo_status', () => ok({}), { description: 'Status' });
    const result = pulley.getMcpTools();
    expect(result.ok).toBe(true);
    expect(result.value.size).toBe(2);
    expect(result.value.has('dynamo_health')).toBe(true);
    expect(result.value.has('dynamo_status')).toBe(true);
  });
});

describe('getCommands', () => {
  it('returns all registered commands', () => {
    const pulley = unwrap(createPulley());
    pulley.registerCommand('status', () => ok({}), { description: 'Status' });
    pulley.registerCommand('health', () => ok({}), { description: 'Health' });
    const result = pulley.getCommands();
    expect(result.ok).toBe(true);
    expect(result.value.size).toBe(2);
    expect(result.value.has('status')).toBe(true);
    expect(result.value.has('health')).toBe(true);
  });
});

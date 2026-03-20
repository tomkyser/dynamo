// Dynamo > Tests > dispatcher.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use repo paths for testing (deployed layout mirrors repo after install)
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const DISPATCHER = path.join(REPO_ROOT, 'cc', 'hooks', 'dynamo-hooks.cjs');

// Handlers: repo layout (subsystems/ledger/hooks/)
const HANDLERS_DIR = path.join(REPO_ROOT, 'subsystems', 'ledger', 'hooks');

// Load dispatcher exports for unit testing validateInput
const dispatcher = require(DISPATCHER);

describe('Dispatcher structure', () => {
  it('dispatcher file exists', () => {
    assert.ok(fs.existsSync(DISPATCHER), 'dynamo-hooks.cjs must exist');
  });

  it('dispatcher starts with Dynamo branding', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.startsWith('// Dynamo >'), 'Must start with "// Dynamo >" identity block');
  });

  it('dispatcher contains handler routing for all 7 events', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    for (const evt of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop']) {
      assert.ok(src.includes(`case '${evt}'`), `Missing case for ${evt}`);
    }
    // SubagentStart/SubagentStop are routed via SUBAGENT_ROUTE, not switch/case
    assert.ok(src.includes("'SubagentStart'"), 'Missing routing for SubagentStart');
    assert.ok(src.includes("'SubagentStop'"), 'Missing routing for SubagentStop');
  });

  it('dispatcher calls loadEnv before routing', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    const loadEnvIdx = src.indexOf('loadEnv()');
    const switchIdx = src.indexOf('switch');
    assert.ok(loadEnvIdx !== -1, 'Must call loadEnv()');
    assert.ok(switchIdx !== -1, 'Must have switch statement');
    assert.ok(loadEnvIdx < switchIdx, 'loadEnv must be called before switch routing');
  });

  it('dispatcher has stdin timeout guard at 5000ms', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('setTimeout'), 'Must have stdin timeout');
    assert.ok(src.includes('5000'), 'Timeout should be 5000ms');
  });

  it('dispatcher always exits with code 0', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('process.exit(0)'), 'Must exit 0');
  });

  it('dispatcher uses centralized resolver for dual-layout path resolution', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes("lib/resolve.cjs"), 'Must use centralized resolver bootstrap');
    assert.ok(src.includes("resolve('ledger'"), 'Must resolve ledger via centralized resolver');
  });

  it('dispatcher uses resolver or __dirname-based paths (no ad-hoc relative requires)', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    // Dispatcher must use centralized resolver for cross-component resolution
    assert.ok(src.includes("lib/resolve.cjs"), 'Must bootstrap centralized resolver');
    // Only allowed bare relative requires are the bootstrap resolver paths
    const bareRelatives = (src.match(/require\(\s*['"][.\/][^'"]*/g) || [])
      .filter(r => !r.includes('lib/resolve.cjs'));
    assert.strictEqual(bareRelatives.length, 0,
      'Must not use bare relative requires except bootstrap resolver: ' + bareRelatives.join(', '));
  });
});

describe('Handler exports', () => {
  const handlers = ['session-start', 'prompt-augment', 'capture-change', 'preserve-knowledge', 'session-summary'];

  for (const name of handlers) {
    it(`${name}.cjs exists and exports an async function`, () => {
      const handlerPath = path.join(HANDLERS_DIR, name + '.cjs');
      assert.ok(fs.existsSync(handlerPath), `${name}.cjs must exist at ${HANDLERS_DIR}`);
      const handler = require(handlerPath);
      assert.strictEqual(typeof handler, 'function', `${name}.cjs must export a function`);
    });
  }

  for (const name of handlers) {
    it(`${name}.cjs starts with "// Dynamo >" branding`, () => {
      const src = fs.readFileSync(path.join(HANDLERS_DIR, name + '.cjs'), 'utf8');
      assert.ok(src.startsWith('// Dynamo >'), `${name}.cjs must start with "// Dynamo >" identity block`);
    });
  }

  it('no handler has bare .catch(() => {})', () => {
    const violations = [];
    for (const name of handlers) {
      const src = fs.readFileSync(path.join(HANDLERS_DIR, name + '.cjs'), 'utf8');
      if (/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(src)) {
        violations.push(name + '.cjs');
      }
    }
    assert.strictEqual(violations.length, 0,
      'Bare .catch(() => {}) found in: ' + violations.join(', '));
  });
});

describe('Input validation (MGMT-08a)', () => {
  const { validateInput, VALID_EVENTS, LIMITS } = dispatcher;

  describe('validateInput function', () => {
    it('returns violations for missing hook_event_name', () => {
      const violations = validateInput({});
      assert.ok(violations.length > 0, 'should have violations');
      assert.ok(violations[0].includes('hook_event_name'), 'should mention hook_event_name');
    });

    it('returns violations for non-string hook_event_name', () => {
      const violations = validateInput({ hook_event_name: 123 });
      assert.ok(violations.length > 0);
      assert.ok(violations[0].includes('hook_event_name'));
    });

    it('returns violations for unknown hook_event_name', () => {
      const violations = validateInput({ hook_event_name: 'UnknownEvent' });
      assert.ok(violations.length > 0);
      assert.ok(violations[0].includes('unknown hook_event_name'));
      assert.ok(violations[0].includes('UnknownEvent'));
    });

    it('returns violations for oversized hook_event_name', () => {
      const violations = validateInput({ hook_event_name: 'A'.repeat(65) });
      assert.ok(violations.length > 0);
      assert.ok(violations[0].includes('exceeds'));
    });

    it('returns no violations for valid SessionStart event', () => {
      const violations = validateInput({ hook_event_name: 'SessionStart' });
      assert.strictEqual(violations.length, 0);
    });

    it('returns no violations for valid UserPromptSubmit event', () => {
      const violations = validateInput({ hook_event_name: 'UserPromptSubmit' });
      assert.strictEqual(violations.length, 0);
    });

    it('returns no violations for valid PostToolUse event', () => {
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: '/tmp/test' } });
      assert.strictEqual(violations.length, 0);
    });

    it('accepts all 7 valid event names', () => {
      for (const event of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop', 'SubagentStart', 'SubagentStop']) {
        const violations = validateInput({ hook_event_name: event });
        assert.strictEqual(violations.length, 0, event + ' should be valid');
      }
    });

    it('returns violations for non-string tool_name', () => {
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_name: 42 });
      assert.ok(violations.some(v => v.includes('tool_name')));
    });

    it('returns violations for non-object tool_input', () => {
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_input: 'not-an-object' });
      assert.ok(violations.some(v => v.includes('tool_input')));
    });

    it('returns violations for array tool_input', () => {
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_input: [1, 2, 3] });
      assert.ok(violations.some(v => v.includes('tool_input')));
    });

    it('returns violations for null tool_input', () => {
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_input: null });
      assert.ok(violations.some(v => v.includes('tool_input')));
    });

    it('returns violations for non-string cwd', () => {
      const violations = validateInput({ hook_event_name: 'SessionStart', cwd: 123 });
      assert.ok(violations.some(v => v.includes('cwd')));
    });

    it('returns violations for oversized cwd', () => {
      const violations = validateInput({ hook_event_name: 'SessionStart', cwd: '/'.repeat(4097) });
      assert.ok(violations.some(v => v.includes('cwd') && v.includes('4096')));
    });

    it('returns violations for oversized tool_input string value', () => {
      const bigValue = 'x'.repeat(102401);
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_input: { content: bigValue } });
      assert.ok(violations.some(v => v.includes('tool_input.content') && v.includes('100KB')));
    });

    it('allows tool_input string values under 100KB', () => {
      const okValue = 'x'.repeat(102400);
      const violations = validateInput({ hook_event_name: 'PostToolUse', tool_input: { content: okValue } });
      assert.strictEqual(violations.length, 0);
    });

    it('ignores unknown fields (future-proof)', () => {
      const violations = validateInput({ hook_event_name: 'SessionStart', agent_id: 'abc', unknown_field: true });
      assert.strictEqual(violations.length, 0, 'unknown fields should not cause violations');
    });

    it('returns early on missing hook_event_name without checking other fields', () => {
      const violations = validateInput({ tool_name: 42, cwd: 123 });
      // Should only report hook_event_name issue, not tool_name/cwd
      assert.strictEqual(violations.length, 1);
      assert.ok(violations[0].includes('hook_event_name'));
    });
  });

  describe('constants', () => {
    it('VALID_EVENTS has exactly 7 events', () => {
      assert.strictEqual(VALID_EVENTS.size, 7);
    });

    it('LIMITS.hook_event_name is 64', () => {
      assert.strictEqual(LIMITS.hook_event_name, 64);
    });

    it('LIMITS.cwd is 4096', () => {
      assert.strictEqual(LIMITS.cwd, 4096);
    });

    it('LIMITS.tool_input_value is 102400', () => {
      assert.strictEqual(LIMITS.tool_input_value, 102400);
    });
  });
});

describe('Boundary markers (MGMT-08b)', () => {
  const { BOUNDARY_OPEN, BOUNDARY_CLOSE } = dispatcher;

  it('BOUNDARY_OPEN contains dynamo-memory-context tag', () => {
    assert.ok(BOUNDARY_OPEN.includes('dynamo-memory-context'), 'should use dynamo-memory-context tag');
    assert.ok(BOUNDARY_OPEN.includes('source='), 'should have source attribute');
  });

  it('BOUNDARY_CLOSE is the closing tag', () => {
    assert.ok(BOUNDARY_CLOSE.includes('</dynamo-memory-context>'), 'should be closing XML tag');
  });

  it('dispatcher source contains stdout interception pattern', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('process.stdout.write'), 'should intercept stdout');
    assert.ok(src.includes('originalWrite'), 'should save original write');
  });

  it('dispatcher source has try/finally around handler to restore stdout', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    // Find the stdout interception area
    assert.ok(src.includes('finally'), 'should have finally block');
    assert.ok(src.includes('process.stdout.write = originalWrite'), 'should restore stdout in finally');
  });

  it('dispatcher guards against wrapping empty output', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('handlerOutput.length > 0'), 'should only wrap non-empty output');
  });

  it('dispatcher emits BOUNDARY_OPEN before handler output and BOUNDARY_CLOSE after', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    const openIdx = src.indexOf('BOUNDARY_OPEN');
    const closeIdx = src.indexOf('BOUNDARY_CLOSE');
    assert.ok(openIdx !== -1, 'should reference BOUNDARY_OPEN');
    assert.ok(closeIdx !== -1, 'should reference BOUNDARY_CLOSE');
  });
});

describe('Dispatcher validation integration', () => {
  it('dispatcher source calls validateInput before handler routing', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    const validateIdx = src.indexOf('validateInput(');
    const switchIdx = src.indexOf('switch (event)');
    assert.ok(validateIdx !== -1, 'should call validateInput');
    assert.ok(switchIdx !== -1, 'should have switch routing');
    assert.ok(validateIdx < switchIdx, 'validateInput must be called before switch routing');
  });

  it('dispatcher logs validation failures via logError', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes("logError('dispatcher', 'input validation failed:"), 'should log validation failures');
  });

  it('dispatcher specifically logs malformed JSON', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('malformed JSON input'), 'should log malformed JSON specifically');
  });

  it('dispatcher exports validateInput for testability', () => {
    assert.strictEqual(typeof dispatcher.validateInput, 'function', 'should export validateInput');
  });

  it('dispatcher exports VALID_EVENTS for testability', () => {
    assert.ok(dispatcher.VALID_EVENTS instanceof Set, 'should export VALID_EVENTS as Set');
  });

  it('dispatcher exports LIMITS for testability', () => {
    assert.strictEqual(typeof dispatcher.LIMITS, 'object', 'should export LIMITS');
  });

  it('dispatcher exports BOUNDARY_OPEN and BOUNDARY_CLOSE for testability', () => {
    assert.strictEqual(typeof dispatcher.BOUNDARY_OPEN, 'string', 'should export BOUNDARY_OPEN');
    assert.strictEqual(typeof dispatcher.BOUNDARY_CLOSE, 'string', 'should export BOUNDARY_CLOSE');
  });
});

describe('SubagentStart/SubagentStop validation (HOOK-02)', () => {
  const { validateInput, VALID_EVENTS } = dispatcher;

  it('VALID_EVENTS has 7 events (5 original + 2 subagent)', () => {
    assert.strictEqual(VALID_EVENTS.size, 7);
  });

  it('VALID_EVENTS includes SubagentStart', () => {
    assert.ok(VALID_EVENTS.has('SubagentStart'));
  });

  it('VALID_EVENTS includes SubagentStop', () => {
    assert.ok(VALID_EVENTS.has('SubagentStop'));
  });

  it('validateInput accepts SubagentStart event', () => {
    const violations = validateInput({ hook_event_name: 'SubagentStart' });
    assert.strictEqual(violations.length, 0);
  });

  it('validateInput accepts SubagentStop event', () => {
    const violations = validateInput({ hook_event_name: 'SubagentStop' });
    assert.strictEqual(violations.length, 0);
  });
});

describe('JSON_OUTPUT_EVENTS (HOOK-02)', () => {
  const { JSON_OUTPUT_EVENTS } = dispatcher;

  it('JSON_OUTPUT_EVENTS exists and is a Set', () => {
    assert.ok(JSON_OUTPUT_EVENTS instanceof Set, 'should export JSON_OUTPUT_EVENTS as Set');
  });

  it('JSON_OUTPUT_EVENTS contains SubagentStart and SubagentStop', () => {
    assert.ok(JSON_OUTPUT_EVENTS.has('SubagentStart'));
    assert.ok(JSON_OUTPUT_EVENTS.has('SubagentStop'));
  });

  it('JSON_OUTPUT_EVENTS does not contain regular events', () => {
    assert.ok(!JSON_OUTPUT_EVENTS.has('SessionStart'));
    assert.ok(!JSON_OUTPUT_EVENTS.has('UserPromptSubmit'));
  });
});

describe('Mode-based routing (HOOK-01)', () => {
  it('dispatcher source reads reverie.mode from config', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('config.reverie') && src.includes('mode'), 'should read reverie.mode from config');
  });

  it('dispatcher source defaults mode to classic', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes("|| 'classic'"), 'should default to classic mode');
  });

  it('dispatcher source contains REVERIE_ROUTE mapping', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('REVERIE_ROUTE'), 'should have REVERIE_ROUTE mapping');
  });

  it('REVERIE_ROUTE maps all 5 cognitive events to handler files', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes("'session-start.cjs'"), 'should map SessionStart');
    assert.ok(src.includes("'user-prompt.cjs'"), 'should map UserPromptSubmit');
    assert.ok(src.includes("'post-tool-use.cjs'"), 'should map PostToolUse');
    assert.ok(src.includes("'pre-compact.cjs'"), 'should map PreCompact');
    assert.ok(src.includes("'stop.cjs'"), 'should map Stop');
  });

  it('dispatcher resolves reverie handlers directory', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes("resolve('reverie', 'handlers')"), 'should resolve reverie handlers path');
  });

  it('dispatcher preserves classic switch/case in else block', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    // Classic handler paths must still be present for classic mode
    assert.ok(src.includes("'session-start.cjs'"), 'should have session-start handler reference');
    assert.ok(src.includes("'prompt-augment.cjs'"), 'should have prompt-augment handler reference');
    assert.ok(src.includes("'capture-change.cjs'"), 'should have capture-change handler reference');
    assert.ok(src.includes("'preserve-knowledge.cjs'"), 'should have preserve-knowledge handler reference');
    assert.ok(src.includes("'session-summary.cjs'"), 'should have session-summary handler reference');
  });
});

describe('SubagentStart/SubagentStop output format (Pitfall prevention)', () => {
  it('dispatcher contains hookSpecificOutput JSON structure for SubagentStart', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    assert.ok(src.includes('hookSpecificOutput'), 'should output hookSpecificOutput JSON');
    assert.ok(src.includes('hookEventName'), 'should include hookEventName field');
    assert.ok(src.includes('additionalContext'), 'should include additionalContext field');
  });

  it('SubagentStart/SubagentStop handlers skip boundary wrapping', () => {
    const src = fs.readFileSync(DISPATCHER, 'utf8');
    // The JSON_OUTPUT_EVENTS check should prevent boundary wrapping
    assert.ok(src.includes('JSON_OUTPUT_EVENTS'), 'should reference JSON_OUTPUT_EVENTS for boundary skip logic');
  });
});

describe('settings-hooks.json subagent registration (HOOK-02)', () => {
  const settingsPath = path.join(REPO_ROOT, 'cc', 'settings-hooks.json');

  it('settings-hooks.json is valid JSON', () => {
    const content = fs.readFileSync(settingsPath, 'utf8');
    assert.doesNotThrow(() => JSON.parse(content), 'must be valid JSON');
  });

  it('settings-hooks.json contains SubagentStart entry', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks.SubagentStart, 'must have SubagentStart entry');
    assert.ok(Array.isArray(settings.hooks.SubagentStart), 'SubagentStart must be array');
  });

  it('settings-hooks.json contains SubagentStop entry', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks.SubagentStop, 'must have SubagentStop entry');
    assert.ok(Array.isArray(settings.hooks.SubagentStop), 'SubagentStop must be array');
  });

  it('SubagentStart matcher is inner-voice', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(settings.hooks.SubagentStart[0].matcher, 'inner-voice');
  });

  it('SubagentStop matcher is inner-voice', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(settings.hooks.SubagentStop[0].matcher, 'inner-voice');
  });

  it('SubagentStart command points to dynamo-hooks.cjs', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks.SubagentStart[0].hooks[0].command.includes('dynamo-hooks.cjs'));
  });

  it('SubagentStop command points to dynamo-hooks.cjs', () => {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.hooks.SubagentStop[0].hooks[0].command.includes('dynamo-hooks.cjs'));
  });
});

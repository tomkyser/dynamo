// Dynamo > Hooks > dynamo-hooks.cjs
'use strict';

const path = require('path');
const fs = require('fs');
// Bootstrap resolver: cc/hooks/ is at depth 2 from root
const resolve = require('../../lib/resolve.cjs');
const { loadEnv, detectProject, logError } = require(resolve('lib', 'core.cjs'));
const { SCOPE } = require(resolve('lib', 'scope.cjs'));

// Load .env early (API keys needed by handlers)
loadEnv();

// --- Input validation (MGMT-08a) ---

const VALID_EVENTS = new Set([
  'SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop'
]);

const LIMITS = {
  hook_event_name: 64,
  cwd: 4096,
  tool_input_value: 102400  // 100KB per string value
};

function validateInput(data) {
  const violations = [];

  // hook_event_name: required, must be known event
  if (!data.hook_event_name || typeof data.hook_event_name !== 'string') {
    violations.push('missing or non-string hook_event_name');
    return violations;
  }
  if (data.hook_event_name.length > LIMITS.hook_event_name) {
    violations.push('hook_event_name exceeds ' + LIMITS.hook_event_name + ' chars');
    return violations;
  }
  if (!VALID_EVENTS.has(data.hook_event_name)) {
    violations.push('unknown hook_event_name: ' + data.hook_event_name.slice(0, 64));
    return violations;
  }

  // Optional field type checks (ignore unknown fields entirely)
  if (data.tool_name !== undefined && typeof data.tool_name !== 'string') {
    violations.push('tool_name is not a string');
  }
  if (data.tool_input !== undefined && (typeof data.tool_input !== 'object' || data.tool_input === null || Array.isArray(data.tool_input))) {
    violations.push('tool_input is not an object');
  }
  if (data.cwd !== undefined) {
    if (typeof data.cwd !== 'string') {
      violations.push('cwd is not a string');
    } else if (data.cwd.length > LIMITS.cwd) {
      violations.push('cwd exceeds ' + LIMITS.cwd + ' chars');
    }
  }

  // tool_input string value length limits
  if (data.tool_input && typeof data.tool_input === 'object' && !Array.isArray(data.tool_input)) {
    for (const [key, val] of Object.entries(data.tool_input)) {
      if (typeof val === 'string' && val.length > LIMITS.tool_input_value) {
        violations.push('tool_input.' + key + ' exceeds 100KB (' + val.length + ' bytes)');
      }
    }
  }

  return violations;
}

// --- Stdout boundary markers (MGMT-08b) ---

const BOUNDARY_OPEN = '<dynamo-memory-context source="dynamo-hooks">';
const BOUNDARY_CLOSE = '</dynamo-memory-context>';

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 5000); // 5s stdin guard

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);

  // Toggle gate: exit silently if Dynamo is disabled
  const { isEnabled } = require(resolve('lib', 'core.cjs'));
  if (!isEnabled()) {
    process.exit(0);  // Silent exit -- no error, no output
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    logError('dispatcher', 'malformed JSON input: ' + e.message);
    process.exit(0);
  }

  try {
    const event = data.hook_event_name;

    // Input validation (MGMT-08a)
    const violations = validateInput(data);
    if (violations.length > 0) {
      logError('dispatcher', 'input validation failed: ' + violations.join('; '));
      process.exit(0);
    }

    // Build context object (dispatcher responsibility)
    const project = detectProject(data.cwd || process.cwd());
    const scope = (project !== 'unknown' && project !== 'tom.kyser')
      ? SCOPE.project(project)
      : SCOPE.global;

    const ctx = { ...data, project, scope };

    // Stdout boundary wrapping (MGMT-08b)
    const stdoutChunks = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk, encoding, callback) => {
      if (typeof chunk === 'string') {
        stdoutChunks.push(chunk);
      } else if (Buffer.isBuffer(chunk)) {
        stdoutChunks.push(chunk.toString(encoding || 'utf8'));
      }
      if (typeof callback === 'function') callback();
      return true;
    };

    try {
      // Route to handler
      const HANDLERS = resolve('ledger', 'hooks');
      switch (event) {
        case 'SessionStart':
          await require(path.join(HANDLERS, 'session-start.cjs'))(ctx);
          break;
        case 'UserPromptSubmit':
          await require(path.join(HANDLERS, 'prompt-augment.cjs'))(ctx);
          break;
        case 'PostToolUse':
          await require(path.join(HANDLERS, 'capture-change.cjs'))(ctx);
          break;
        case 'PreCompact':
          await require(path.join(HANDLERS, 'preserve-knowledge.cjs'))(ctx);
          break;
        case 'Stop':
          await require(path.join(HANDLERS, 'session-summary.cjs'))(ctx);
          break;
        default:
          break;
      }
    } finally {
      process.stdout.write = originalWrite;
    }

    // Wrap collected output in boundary markers
    const handlerOutput = stdoutChunks.join('');
    if (handlerOutput.length > 0) {
      originalWrite(BOUNDARY_OPEN + '\n' + handlerOutput + '\n' + BOUNDARY_CLOSE);
    }
  } catch (e) {
    logError('dispatcher', e.message);
  }
  process.exit(0); // Always exit 0 -- never block Claude Code
});

// Exports for testing
module.exports = { validateInput, VALID_EVENTS, LIMITS, BOUNDARY_OPEN, BOUNDARY_CLOSE };

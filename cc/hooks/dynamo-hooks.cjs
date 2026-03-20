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
  'SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop',
  'SubagentStart', 'SubagentStop'
]);

const JSON_OUTPUT_EVENTS = new Set(['SubagentStart', 'SubagentStop']);

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

    if (JSON_OUTPUT_EVENTS.has(event)) {
      // SubagentStart/SubagentStop: route to Reverie handlers, output JSON directly (no boundary wrapping)
      const REVERIE_HANDLERS = resolve('reverie', 'handlers');
      const SUBAGENT_ROUTE = {
        'SubagentStart':  'iv-subagent-start.cjs',
        'SubagentStop':   'iv-subagent-stop.cjs',
      };
      const handlerFile = SUBAGENT_ROUTE[event];
      if (handlerFile) {
        const result = await require(path.join(REVERIE_HANDLERS, handlerFile))(ctx);
        // SubagentStart can return additionalContext for the subagent
        if (event === 'SubagentStart' && result) {
          process.stdout.write(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: 'SubagentStart',
              additionalContext: typeof result === 'string' ? result : JSON.stringify(result)
            }
          }));
        }
        // SubagentStop: no stdout output needed (stub returns null)
      }
    } else {
      // All cognitive events route to Reverie handlers
      const REVERIE_HANDLERS = resolve('reverie', 'handlers');
      const REVERIE_ROUTE = {
        'SessionStart':     'session-start.cjs',
        'UserPromptSubmit': 'user-prompt.cjs',
        'PostToolUse':      'post-tool-use.cjs',
        'PreCompact':       'pre-compact.cjs',
        'Stop':             'stop.cjs',
      };
      const handlerFile = REVERIE_ROUTE[event];
      if (handlerFile) {
        // Stdout boundary wrapping
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
          await require(path.join(REVERIE_HANDLERS, handlerFile))(ctx);
        } finally {
          process.stdout.write = originalWrite;
        }
        const handlerOutput = stdoutChunks.join('');
        if (handlerOutput.length > 0) {
          originalWrite(BOUNDARY_OPEN + '\n' + handlerOutput + '\n' + BOUNDARY_CLOSE);
        }
      }
    }
  } catch (e) {
    logError('dispatcher', e.message);
  }
  process.exit(0); // Always exit 0 -- never block Claude Code
});

// Exports for testing
module.exports = { validateInput, VALID_EVENTS, JSON_OUTPUT_EVENTS, LIMITS, BOUNDARY_OPEN, BOUNDARY_CLOSE };

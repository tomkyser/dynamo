// Dynamo > Hooks > dynamo-hooks.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const resolve = require('../../lib/resolve.cjs');
const { loadEnv, detectProject, logError, SCOPE } = require(resolve('dynamo', 'core.cjs'));

// Load .env early (API keys needed by handlers)
loadEnv();

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 5000); // 5s stdin guard

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);

  // Toggle gate: exit silently if Dynamo is disabled
  const { isEnabled } = require(resolve('dynamo', 'core.cjs'));
  if (!isEnabled()) {
    process.exit(0);  // Silent exit -- no error, no output
  }

  try {
    const data = JSON.parse(input);
    const event = data.hook_event_name;

    // Build context object (dispatcher responsibility)
    const project = detectProject(data.cwd || process.cwd());
    const scope = (project !== 'unknown' && project !== 'tom.kyser')
      ? SCOPE.project(project)
      : SCOPE.global;

    const ctx = { ...data, project, scope };

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
        break; // Unknown event, exit silently
    }
  } catch (e) {
    logError('dispatcher', e.message);
  }
  process.exit(0); // Always exit 0 -- never block Claude Code
});

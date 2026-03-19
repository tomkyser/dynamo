// Dynamo > Hooks > dynamo-hooks.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const { loadEnv, detectProject, logError, SCOPE } = require(path.join(__dirname, '..', 'core.cjs'));

// Load .env early (API keys needed by handlers)
loadEnv();

// Resolve handler directory for both repo and deployed layouts
function resolveHandlers() {
  // Repo layout: dynamo/hooks/ -> ../../ledger/hooks/
  const repoPath = path.join(__dirname, '..', '..', 'ledger', 'hooks');
  if (fs.existsSync(repoPath)) return repoPath;
  // Deployed layout: ~/.claude/dynamo/hooks/ -> ../ledger/hooks/
  return path.join(__dirname, '..', 'ledger', 'hooks');
}

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 5000); // 5s stdin guard

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);

  // Toggle gate: exit silently if Dynamo is disabled
  const { isEnabled } = require(path.join(__dirname, '..', 'core.cjs'));
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
    const HANDLERS = resolveHandlers();
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

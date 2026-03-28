'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { ok, err } = require('../../../lib/index.cjs');

/**
 * Spawns a visible macOS Terminal.app window running the given command.
 *
 * Uses a temp shell script intermediary (per Pitfall 6) to avoid multi-layer
 * escaping issues with osascript -> AppleScript -> shell -> env vars.
 *
 * The temp script:
 *   1. Sets a shebang (#!/bin/bash)
 *   2. Exports all environment variables
 *   3. Runs the command with exec (process replacement)
 *
 * Then osascript tells Terminal.app to `do script "bash /path/to/script.sh"`.
 *
 * @param {Object} opts
 * @param {string} opts.command - The command to run in the terminal window
 * @param {Object} [opts.env={}] - Environment variables to export in the script
 * @param {string} [opts.title='dynamo-session'] - Title used for temp script naming
 * @param {Object} [opts._deps] - Dependency injection for testing (options-based DI)
 * @param {Function} [opts._deps.execSync] - Override execSync
 * @param {Function} [opts._deps.writeFileSync] - Override fs.writeFileSync
 * @returns {import('../../../lib/result.cjs').Result<{ scriptPath: string, title: string }>}
 */
function spawnTerminalWindow({ command, env = {}, title = 'dynamo-session', _deps } = {}) {
  if (!command) {
    return err('MISSING_PARAM', 'command is required for terminal window spawning');
  }

  // Options-based DI for test isolation
  const _execSync = (_deps && _deps.execSync) || execSync;
  const _writeFileSync = (_deps && _deps.writeFileSync) || fs.writeFileSync;

  try {
    // Sanitize title for safe filesystem path
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const scriptPath = '/tmp/dynamo-session-' + safeTitle + '.sh';

    // Build script content
    const lines = [
      '#!/bin/bash',
      '# Dynamo session launcher: ' + title,
    ];

    // Add env export lines
    for (const [k, v] of Object.entries(env)) {
      lines.push('export ' + k + '=' + JSON.stringify(String(v)));
    }

    // Add exec command as last line (process replacement)
    lines.push('exec ' + command);

    const content = lines.join('\n');

    // Write temp script with executable permissions
    _writeFileSync(scriptPath, content, { mode: 0o755 });

    // Detect terminal emulator and spawn accordingly.
    // Terminal.app-specific osascript only works when Terminal.app is the
    // active terminal. For Ghostty, iTerm2, and other emulators, use `open`
    // with a .command file — macOS routes these to the default terminal handler.
    const termProgram = process.env.TERM_PROGRAM || '';

    if (termProgram === 'Apple_Terminal' || termProgram === '') {
      // Terminal.app path (original): use osascript for direct window control
      const appleScript = 'tell application "Terminal" to do script "bash ' + scriptPath + '"';
      _execSync('osascript -e ' + JSON.stringify(appleScript));
    } else {
      // Generic path: write a .command file and open it.
      // macOS opens .command files in the default terminal emulator.
      const commandFilePath = scriptPath.replace(/\.sh$/, '.command');
      _writeFileSync(commandFilePath, '#!/bin/bash\nexec bash ' + JSON.stringify(scriptPath) + '\n', { mode: 0o755 });
      _execSync('open ' + JSON.stringify(commandFilePath));
    }

    return ok({ scriptPath, title });
  } catch (e) {
    return err('TERMINAL_SPAWN_FAILED', e.message);
  }
}

module.exports = { spawnTerminalWindow };

'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const { spawnTerminalWindow } = require('./terminal-spawn.cjs');

/**
 * Creates a session spawner that manages Claude Code session processes.
 *
 * On macOS (default), spawns visible Terminal.app windows for each session
 * using osascript and temp shell scripts. Falls back to piped Bun.spawn
 * on other platforms or when useTerminal is false.
 *
 * Spawns Claude Code sessions with the Channels development flag,
 * passing Wire relay URL and session identity via environment variables.
 * Tracks spawned sessions and provides stop/health/list operations.
 *
 * @param {Object} [options={}]
 * @param {string} [options.channelServerPath] - Path to Wire's channel-server.cjs
 * @param {Object} [options.switchboard] - Switchboard service for event emission
 * @param {boolean} [options.useTerminal] - Force terminal window mode (default: true on macOS)
 * @returns {Object} Session spawner with spawn/stop/health/list methods
 */
function createSessionSpawner(options = {}) {
  const { channelServerPath, switchboard } = options;

  // Platform-aware default: use terminal windows on macOS, piped stdio elsewhere
  const _useTerminal = options.useTerminal !== undefined
    ? options.useTerminal
    : process.platform === 'darwin';

  /** @type {Map<string, { proc?: Object, scriptPath?: string, identity: string, startedAt: number }>} */
  const _sessions = new Map();

  return {
    /**
     * Spawn a new Claude Code session.
     *
     * On macOS with useTerminal=true, opens a visible Terminal.app window.
     * Otherwise, spawns a background process with piped stdio.
     *
     * @param {Object} opts
     * @param {string} opts.sessionId - Unique session identifier
     * @param {string} opts.identity - Session identity (primary/secondary/tertiary)
     * @param {Object} [opts.env={}] - Additional environment variables
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string, pid: number|null, proc?: Object, scriptPath?: string }>}
     */
    spawn({ sessionId, identity, env = {} }) {
      const mergedEnv = {
        ...process.env,
        WIRE_RELAY_URL: env.relayUrl || '',
        SESSION_ID: sessionId,
        SESSION_IDENTITY: identity,
        // Spawned sessions MUST have hooks active for Wire communication.
        // Override any dev bypass inherited from the parent process.
        DYNAMO_DEV_BYPASS: '0',
        ...env,
      };

      if (_useTerminal) {
        // Terminal window path: visible macOS Terminal.app window
        // channelServerPath is treated as the MCP server name registered in .mcp.json.
        // Per Claude Code channels API: --dangerously-load-development-channels takes
        // server:<name> where <name> matches an mcpServers key, NOT a file path.
        const channelName = channelServerPath || 'dynamo-wire';
        const command = 'claude --dangerously-load-development-channels server:' + channelName;
        const title = 'dynamo-' + identity + '-' + sessionId.slice(0, 8);

        const termResult = spawnTerminalWindow({ command, env: mergedEnv, title });
        if (!termResult.ok) {
          return termResult;
        }

        _sessions.set(sessionId, {
          identity,
          startedAt: Date.now(),
          scriptPath: termResult.value.scriptPath,
        });

        if (switchboard) {
          switchboard.emit('infra:session-spawned', {
            sessionId,
            identity,
            pid: null,
          });
        }

        return ok({ sessionId, pid: null, scriptPath: termResult.value.scriptPath });
      }

      // Piped stdio path: invisible background process (tests, non-macOS)
      const pipedChannelName = channelServerPath || 'dynamo-wire';
      const args = ['claude', '--dangerously-load-development-channels', 'server:' + pipedChannelName];

      const proc = Bun.spawn(args, {
        env: mergedEnv,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      });

      _sessions.set(sessionId, {
        proc,
        identity,
        startedAt: Date.now(),
      });

      if (switchboard) {
        switchboard.emit('infra:session-spawned', {
          sessionId,
          identity,
          pid: proc.pid,
        });
      }

      return ok({ sessionId, pid: proc.pid, proc });
    },

    /**
     * Stop a spawned session by session ID.
     *
     * For terminal-spawned sessions: removes tracking and cleans up temp script.
     * For piped sessions: kills the process.
     * Actual Claude Code session termination happens via Wire shutdown signals.
     *
     * @param {string} sessionId - Session to stop
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string }>}
     */
    stop(sessionId) {
      const entry = _sessions.get(sessionId);
      if (!entry) {
        return err('SESSION_NOT_FOUND', `Session "${sessionId}" not found in tracked sessions`);
      }

      if (entry.proc) {
        // Piped process path: kill the process
        entry.proc.kill();
      }

      if (entry.scriptPath) {
        // Terminal path: clean up temp script
        try { require('node:fs').unlinkSync(entry.scriptPath); } catch (_e) { /* ignore */ }
      }

      _sessions.delete(sessionId);

      if (switchboard) {
        switchboard.emit('infra:session-stopped', {
          sessionId,
          identity: entry.identity,
        });
      }

      return ok({ sessionId });
    },

    /**
     * Check health of a spawned session.
     *
     * For terminal-spawned sessions: returns tracking record (real health
     * is checked via relay /health endpoint in the status command).
     * For piped sessions: checks process liveness.
     *
     * @param {string} sessionId - Session to check
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string, alive: boolean, pid: number|null, uptime: number }>}
     */
    health(sessionId) {
      const entry = _sessions.get(sessionId);
      if (!entry) {
        return err('SESSION_NOT_FOUND', `Session "${sessionId}" not found in tracked sessions`);
      }

      if (entry.proc) {
        // Piped process path: check process liveness
        const alive = !entry.proc.killed && entry.proc.exitCode === null;
        return ok({
          sessionId,
          alive,
          pid: entry.proc.pid,
          uptime: Date.now() - entry.startedAt,
        });
      }

      // Terminal path: session is tracked, real health via relay /health
      return ok({
        sessionId,
        alive: true,
        pid: null,
        uptime: Date.now() - entry.startedAt,
      });
    },

    /**
     * List all tracked sessions.
     *
     * @returns {Array<{ sessionId: string, identity: string, alive: boolean }>}
     */
    list() {
      const result = [];
      for (const [sessionId, entry] of _sessions) {
        if (entry.proc) {
          const alive = !entry.proc.killed && entry.proc.exitCode === null;
          result.push({ sessionId, identity: entry.identity, alive });
        } else {
          // Terminal-spawned: report as alive (real health via relay)
          result.push({ sessionId, identity: entry.identity, alive: true });
        }
      }
      return result;
    },
  };
}

module.exports = { createSessionSpawner };

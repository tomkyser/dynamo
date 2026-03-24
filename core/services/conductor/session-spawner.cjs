'use strict';

const { ok, err } = require('../../../lib/index.cjs');

/**
 * Creates a session spawner that manages Claude Code session processes.
 *
 * Spawns Claude Code sessions via Bun.spawn with the Channels development flag,
 * passing Wire relay URL and session identity via environment variables.
 * Tracks spawned sessions and provides stop/health/list operations.
 *
 * @param {Object} [options={}]
 * @param {string} [options.channelServerPath] - Path to Wire's channel-server.cjs
 * @param {Object} [options.switchboard] - Switchboard service for event emission
 * @returns {Object} Session spawner with spawn/stop/health/list methods
 */
function createSessionSpawner(options = {}) {
  const { channelServerPath, switchboard } = options;

  /** @type {Map<string, { proc: Object, identity: string, startedAt: number }>} */
  const _sessions = new Map();

  return {
    /**
     * Spawn a new Claude Code session.
     *
     * @param {Object} opts
     * @param {string} opts.sessionId - Unique session identifier
     * @param {string} opts.identity - Session identity (primary/secondary/tertiary)
     * @param {Object} [opts.env={}] - Additional environment variables
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string, pid: number, proc: Object }>}
     */
    spawn({ sessionId, identity, env = {} }) {
      const args = ['claude', '--dangerously-load-development-channels', 'server:' + (channelServerPath || '')];

      const mergedEnv = {
        ...process.env,
        WIRE_RELAY_URL: env.relayUrl || '',
        SESSION_ID: sessionId,
        SESSION_IDENTITY: identity,
        ...env,
      };

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
     * @param {string} sessionId - Session to stop
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string }>}
     */
    stop(sessionId) {
      const entry = _sessions.get(sessionId);
      if (!entry) {
        return err('SESSION_NOT_FOUND', `Session "${sessionId}" not found in tracked sessions`);
      }

      entry.proc.kill();
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
     * @param {string} sessionId - Session to check
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string, alive: boolean, pid: number, uptime: number }>}
     */
    health(sessionId) {
      const entry = _sessions.get(sessionId);
      if (!entry) {
        return err('SESSION_NOT_FOUND', `Session "${sessionId}" not found in tracked sessions`);
      }

      const alive = !entry.proc.killed && entry.proc.exitCode === null;

      return ok({
        sessionId,
        alive,
        pid: entry.proc.pid,
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
        const alive = !entry.proc.killed && entry.proc.exitCode === null;
        result.push({ sessionId, identity: entry.identity, alive });
      }
      return result;
    },
  };
}

module.exports = { createSessionSpawner };

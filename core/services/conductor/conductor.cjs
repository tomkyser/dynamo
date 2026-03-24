'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { createSessionSpawner } = require('./session-spawner.cjs');

/**
 * Contract shape for the Conductor infrastructure service.
 * Defines required and optional methods for contract validation.
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const CONDUCTOR_SHAPE = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'composeUp', 'composeDown', 'composeStatus',
    'checkDependencies', 'isDockerAvailable',
    'spawnSession', 'stopSession', 'getSessionHealth',
  ],
  optional: ['composeRestart', 'composeLogs', 'listSessions']
};

/**
 * Creates a Conductor infrastructure management service instance.
 *
 * Conductor manages Docker Compose lifecycle for containerized services
 * (MCP servers, databases), checks platform dependency health (Bun version,
 * git, DuckDB, disk space), and gracefully degrades when Docker is absent.
 *
 * Graceful degradation (D-07): All compose operations return
 * Err('DOCKER_UNAVAILABLE') when Docker is not installed, rather than
 * crashing. The platform works without Docker -- Conductor simply reports
 * what is and is not available.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen Conductor contract instance
 */
function createConductor() {
  let _started = false;
  let _switchboard = null;
  let _dockerAvailable = false;
  let _sessionSpawner = null;

  /**
   * Runs a Docker CLI command via Bun.spawnSync.
   * Returns Err('DOCKER_UNAVAILABLE') if Docker is not installed.
   * Returns Err('DOCKER_FAILED') if the command exits non-zero.
   *
   * @param {string[]} args - Arguments to pass after 'docker'
   * @returns {import('../../../lib/result.cjs').Result<string>} stdout on success
   */
  function _runDocker(args) {
    if (!_dockerAvailable) {
      return err('DOCKER_UNAVAILABLE', 'Docker is not installed or not running');
    }
    const result = Bun.spawnSync(['docker', ...args], {
      env: process.env,
      stdin: 'ignore',
    });
    if (!result.success) {
      const stderr = result.stderr.toString().trim();
      return err('DOCKER_FAILED', `docker ${args[0]} failed: ${stderr}`, {
        command: ['docker', ...args],
        exitCode: result.exitCode,
      });
    }
    return ok(result.stdout.toString().trim());
  }

  /**
   * Checks whether Docker CLI is available on the system.
   * Uses 'which docker' on macOS/Linux.
   *
   * @returns {boolean} true if docker binary is found
   */
  function _checkDockerInstalled() {
    try {
      const result = Bun.spawnSync(['which', 'docker'], { stdin: 'ignore' });
      return result.success;
    } catch (_e) {
      return false;
    }
  }

  const impl = {
    /**
     * Initialize the Conductor service.
     * Stores switchboard reference and detects Docker availability.
     *
     * @param {Object} options
     * @param {Object} [options.switchboard] - Switchboard service for event emission
     * @param {boolean} [options._dockerAvailable] - Override Docker availability (testing)
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    init(options) {
      _switchboard = (options && options.switchboard) || null;

      // Allow test override for Docker availability
      if (options && options._dockerAvailable !== undefined) {
        _dockerAvailable = options._dockerAvailable;
      } else {
        _dockerAvailable = _checkDockerInstalled();
      }

      // Initialize session spawner for Claude Code session management
      _sessionSpawner = createSessionSpawner({
        channelServerPath: (options && options.channelServerPath)
          || path.resolve(__dirname, '../wire/channel-server.cjs'),
        switchboard: _switchboard,
      });

      return ok(undefined);
    },

    /**
     * Start the Conductor service.
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    start() {
      _started = true;
      return ok(undefined);
    },

    /**
     * Stop the Conductor service.
     * Cleans up all spawned sessions before stopping.
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    stop() {
      // Clean up all spawned sessions
      if (_sessionSpawner) {
        const sessions = _sessionSpawner.list();
        for (const session of sessions) {
          if (session.alive) {
            _sessionSpawner.stop(session.sessionId);
          }
        }
      }

      _started = false;
      return ok(undefined);
    },

    /**
     * Health check for the Conductor service.
     * Reports started state, name, and Docker availability.
     *
     * @returns {import('../../../lib/result.cjs').Result<Object>}
     */
    healthCheck() {
      return ok({
        healthy: _started,
        name: 'conductor',
        dockerAvailable: _dockerAvailable,
      });
    },

    /**
     * Check if Docker is available on this system.
     *
     * @returns {import('../../../lib/result.cjs').Result<boolean>}
     */
    isDockerAvailable() {
      return ok(_dockerAvailable);
    },

    /**
     * Start services defined in a Docker Compose file.
     * Runs `docker compose -f <path> up -d`.
     * Emits 'infra:compose-up' via Switchboard when Docker is available.
     *
     * @param {string} composePath - Path to docker-compose.yml
     * @returns {import('../../../lib/result.cjs').Result<string>} stdout on success
     */
    composeUp(composePath) {
      if (!_dockerAvailable) {
        return err('DOCKER_UNAVAILABLE', 'Docker is not installed or not running');
      }
      const result = _runDocker(['compose', '-f', composePath, 'up', '-d']);
      if (_switchboard) {
        _switchboard.emit('infra:compose-up', { composePath, success: result.ok });
      }
      return result;
    },

    /**
     * Stop services defined in a Docker Compose file.
     * Runs `docker compose -f <path> down`.
     * Emits 'infra:compose-down' via Switchboard when Docker is available.
     *
     * @param {string} composePath - Path to docker-compose.yml
     * @returns {import('../../../lib/result.cjs').Result<string>} stdout on success
     */
    composeDown(composePath) {
      if (!_dockerAvailable) {
        return err('DOCKER_UNAVAILABLE', 'Docker is not installed or not running');
      }
      const result = _runDocker(['compose', '-f', composePath, 'down']);
      if (_switchboard) {
        _switchboard.emit('infra:compose-down', { composePath, success: result.ok });
      }
      return result;
    },

    /**
     * Get status of services defined in a Docker Compose file.
     * Runs `docker compose -f <path> ps --format json`.
     * Parses JSON output into an array of service status objects.
     *
     * @param {string} composePath - Path to docker-compose.yml
     * @returns {import('../../../lib/result.cjs').Result<Array>} Array of service status objects
     */
    composeStatus(composePath) {
      const result = _runDocker(['compose', '-f', composePath, 'ps', '--format', 'json']);
      if (!result.ok) {
        return result;
      }

      try {
        const stdout = result.value;
        if (!stdout || stdout.trim() === '') {
          return ok([]);
        }

        // docker compose ps --format json outputs one JSON object per line
        const services = stdout
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            const svc = JSON.parse(line);
            return {
              name: svc.Name || svc.Service || '',
              state: svc.State || '',
              status: svc.Status || '',
              ports: svc.Ports || '',
            };
          });

        return ok(services);
      } catch (parseErr) {
        return err('COMPOSE_PARSE_FAILED', `Failed to parse compose status: ${parseErr.message}`, {
          composePath,
        });
      }
    },

    /**
     * Check all platform dependencies and report their availability.
     * Checks Bun, git, DuckDB (loadable), disk space, and Docker.
     *
     * @returns {import('../../../lib/result.cjs').Result<Object>} Dependency report
     */
    checkDependencies() {
      // 1. Bun -- always available since we're running on it
      const bun = { available: true, version: Bun.version };

      // 2. git
      let git;
      try {
        const gitResult = Bun.spawnSync(['git', '--version'], { stdin: 'ignore' });
        if (gitResult.success) {
          const versionOutput = gitResult.stdout.toString().trim();
          // Parse "git version X.Y.Z" -> "X.Y.Z"
          const versionMatch = versionOutput.match(/git version\s+(.+)/);
          git = {
            available: true,
            version: versionMatch ? versionMatch[1].trim() : versionOutput,
          };
        } else {
          git = { available: false, version: null };
        }
      } catch (_e) {
        git = { available: false, version: null };
      }

      // 3. DuckDB -- check if @duckdb/node-api is loadable
      let duckdb;
      try {
        require('@duckdb/node-api');
        duckdb = { loadable: true };
      } catch (duckErr) {
        duckdb = { loadable: false, error: duckErr.message };
      }

      // 4. Disk space
      let disk;
      try {
        if (typeof fs.statfsSync === 'function') {
          const stats = fs.statfsSync('/');
          const freeBytes = stats.bavail * stats.bsize;
          disk = { available: true, freeBytes };
        } else {
          // Fallback: use df command
          const dfResult = Bun.spawnSync(['df', '-k', '/'], { stdin: 'ignore' });
          if (dfResult.success) {
            const lines = dfResult.stdout.toString().trim().split('\n');
            if (lines.length >= 2) {
              const parts = lines[1].split(/\s+/);
              // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
              const freeKB = parseInt(parts[3], 10);
              disk = { available: true, freeBytes: freeKB * 1024 };
            } else {
              disk = { available: false };
            }
          } else {
            disk = { available: false };
          }
        }
      } catch (_e) {
        disk = { available: false };
      }

      // 5. Docker
      let docker;
      if (_dockerAvailable) {
        try {
          const versionResult = Bun.spawnSync(['docker', '--version'], { stdin: 'ignore' });
          if (versionResult.success) {
            docker = {
              available: true,
              version: versionResult.stdout.toString().trim(),
            };
          } else {
            docker = { available: true, version: null };
          }
        } catch (_e) {
          docker = { available: true, version: null };
        }
      } else {
        docker = { available: false, version: null };
      }

      return ok({ bun, git, duckdb, disk, docker });
    },

    /**
     * Spawn a Claude Code session via the session spawner.
     *
     * @param {Object} opts
     * @param {string} opts.sessionId - Unique session identifier
     * @param {string} opts.identity - Session identity (primary/secondary/tertiary)
     * @param {Object} [opts.env] - Additional environment variables
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string, pid: number, proc: Object }>}
     */
    spawnSession({ sessionId, identity, env }) {
      if (!_started) {
        return err('NOT_STARTED', 'Conductor not started');
      }
      return _sessionSpawner.spawn({ sessionId, identity, env });
    },

    /**
     * Stop a spawned Claude Code session.
     *
     * @param {string} sessionId - Session to stop
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string }>}
     */
    stopSession(sessionId) {
      if (!_started) {
        return err('NOT_STARTED', 'Conductor not started');
      }
      return _sessionSpawner.stop(sessionId);
    },

    /**
     * Get health status of a spawned Claude Code session.
     *
     * @param {string} sessionId - Session to check
     * @returns {import('../../../lib/result.cjs').Result<{ sessionId: string, alive: boolean, pid: number, uptime: number }>}
     */
    getSessionHealth(sessionId) {
      return _sessionSpawner.health(sessionId);
    },

    /**
     * List all tracked sessions.
     *
     * @returns {Array<{ sessionId: string, identity: string, alive: boolean }>}
     */
    listSessions() {
      return _sessionSpawner.list();
    },
  };

  return createContract('conductor', CONDUCTOR_SHAPE, impl);
}

module.exports = { createConductor };

#!/usr/bin/env bun
'use strict';

/**
 * Dynamo Daemon Entry Point
 *
 * This is the actual daemon process. It:
 * 1. Guards against direct invocation (must be launched via `bun bin/dynamo.cjs start`)
 * 2. Bootstraps all platform services via core.cjs bootstrap()
 * 3. Registers SIGTERM/SIGINT handlers for graceful shutdown
 * 4. Routes all console output to .dynamo/dynamo.log
 * 5. Exports getState() for the HTTP server module (Plan 04)
 *
 * NOTE: The HTTP server is NOT started here -- that comes in Plan 04
 * (daemon-server.cjs). This plan creates the daemon bootstrap and lifecycle.
 *
 * Per D-01, D-16: The daemon is a persistent process that survives shell exit.
 */

const path = require('node:path');
const fs = require('node:fs');
const { bootstrap } = require('./core.cjs');
const {
  writeDaemonFile,
  removeDaemonFile,
  createDaemonLogger,
  getDynamoDir,
} = require('./daemon-lifecycle.cjs');

// ---------------------------------------------------------------------------
// 1. Guard: must be launched with DYNAMO_DAEMON_MODE=1
// ---------------------------------------------------------------------------
if (process.env.DYNAMO_DAEMON_MODE !== '1') {
  process.stderr.write('daemon.cjs must be launched via `bun bin/dynamo.cjs start`\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Read environment
// ---------------------------------------------------------------------------
const port = parseInt(process.env.DYNAMO_PORT, 10) || 9876;
const projectRoot = process.env.DYNAMO_PROJECT_ROOT;

if (!projectRoot) {
  process.stderr.write('DYNAMO_PROJECT_ROOT environment variable is required\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Create logger
// ---------------------------------------------------------------------------
const dynamoDir = getDynamoDir(projectRoot);
const logPath = path.join(dynamoDir, 'dynamo.log');
const logger = createDaemonLogger(logPath);

// ---------------------------------------------------------------------------
// 4. Override console to route through daemon logger
// ---------------------------------------------------------------------------
console.log = (...args) => logger.info('daemon', args.join(' '));
console.warn = (...args) => logger.warn('daemon', args.join(' '));
console.error = (...args) => logger.error('daemon', args.join(' '));

// ---------------------------------------------------------------------------
// Module-level state (accessible via getState() for HTTP server in Plan 04)
// ---------------------------------------------------------------------------
let _state = null;
let _shuttingDown = false;

// ---------------------------------------------------------------------------
// 5-7. Bootstrap and store state
// ---------------------------------------------------------------------------
async function _init() {
  logger.info('daemon', `Dynamo daemon starting (PID ${process.pid}, port ${port})`);

  const result = await bootstrap();

  if (!result.ok) {
    logger.error('daemon', `Bootstrap failed: ${result.error.code} - ${result.error.message}`);
    process.exit(1);
  }

  const { container, lifecycle, config, paths, circuit, pulley } = result.value;

  _state = {
    container,
    lifecycle,
    config,
    paths,
    circuit,
    pulley,
    logger,
    port,
    projectRoot,
    startedAt: new Date().toISOString(),
  };

  // Write PID file after successful bootstrap
  const packageVersion = config.version || '0.1.0';
  writeDaemonFile(projectRoot, {
    pid: process.pid,
    port,
    started: _state.startedAt,
    version: packageVersion,
  });

  logger.info('daemon', `Dynamo daemon ready (PID ${process.pid}, port ${port})`);
}

// ---------------------------------------------------------------------------
// 8-9. Signal handlers and graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Graceful shutdown sequence.
 *
 * Steps:
 * 1. Signal active modules to shut down (iterate container registrations)
 * 2. Close Ledger connection if available
 * 3. Remove PID file
 * 4. Remove active-triad.json if exists
 * 5. Log completion
 * 6. Exit
 *
 * @param {string} signal - The signal that triggered shutdown
 * @param {number} timeout - Hard timeout in ms before force exit
 */
function _gracefulShutdown(signal, timeout) {
  if (_shuttingDown) return;
  _shuttingDown = true;

  logger.info('daemon', `Received ${signal}, shutting down...`);

  // Hard timeout: force exit if shutdown takes too long
  const hardTimer = setTimeout(() => {
    logger.error('daemon', 'Shutdown timeout exceeded, force exit');
    process.exit(1);
  }, timeout);
  // Unref so it doesn't keep the event loop alive if shutdown completes
  if (hardTimer.unref) hardTimer.unref();

  (async () => {
    try {
      // Step 1: Signal active modules to shut down
      if (_state && _state.lifecycle) {
        try {
          await _state.lifecycle.shutdown();
        } catch (e) {
          logger.warn('daemon', `Lifecycle shutdown error: ${e.message}`);
        }
      }

      // Step 2: Close Ledger connection if available
      if (_state && _state.container) {
        try {
          const ledger = _state.container.resolve('providers.ledger');
          if (ledger && typeof ledger.close === 'function') {
            await ledger.close();
          }
        } catch (e) {
          logger.warn('daemon', `Ledger close error: ${e.message}`);
        }
      }

      // Step 3: Remove PID file
      try {
        removeDaemonFile(projectRoot);
      } catch (e) {
        logger.warn('daemon', `PID file removal error: ${e.message}`);
      }

      // Step 4: Remove active-triad.json if exists
      try {
        const triadPath = path.join(dynamoDir, 'active-triad.json');
        fs.unlinkSync(triadPath);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          logger.warn('daemon', `Triad file removal error: ${e.message}`);
        }
      }

      // Step 5: Log completion
      logger.info('daemon', 'Dynamo stopped');

      // Step 6: Exit
      clearTimeout(hardTimer);
      process.exit(0);
    } catch (e) {
      logger.error('daemon', `Shutdown error: ${e.message}`);
      clearTimeout(hardTimer);
      process.exit(1);
    }
  })();
}

process.on('SIGTERM', () => _gracefulShutdown('SIGTERM', 10000));
process.on('SIGINT', () => _gracefulShutdown('SIGINT', 5000));

// ---------------------------------------------------------------------------
// 10. NOTE: HTTP server comes in Plan 04 (daemon-server.cjs)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 11. Export state getter for daemon-server.cjs
// ---------------------------------------------------------------------------
module.exports = { getState: () => _state };

// ---------------------------------------------------------------------------
// Run init
// ---------------------------------------------------------------------------
_init().catch((e) => {
  logger.error('daemon', `Fatal init error: ${e.message}`);
  process.exit(1);
});

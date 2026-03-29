#!/usr/bin/env bun
'use strict';

/**
 * Dynamo daemon entry point.
 *
 * Bootstraps all services via core.cjs, registers signal handlers,
 * routes console output to .dynamo/dynamo.log, and exports state
 * for daemon-server.cjs.
 *
 * Per D-01: daemon process with PID file management.
 * Per D-16: daemon lifecycle and service initialization.
 *
 * Plan 03: bootstrap + signal handlers + log routing.
 * Plan 04: HTTP server wired via createDaemonServer.
 */

const path = require('node:path');
const { createDaemonLogger, writeDaemonFile, removeDaemonFile, getDynamoDir } = require('./daemon-lifecycle.cjs');

// -- Guard: must be launched via `bun bin/dynamo.cjs start` --
if (process.env.DYNAMO_DAEMON_MODE !== '1') {
  console.error('daemon.cjs must be launched via `bun bin/dynamo.cjs start`');
  process.exit(1);
}

// -- Configuration from environment --
const port = parseInt(process.env.DYNAMO_PORT || '9876', 10);
const projectRoot = process.env.DYNAMO_PROJECT_ROOT || process.cwd();

// -- Logger setup --
const logPath = path.join(getDynamoDir(projectRoot), 'dynamo.log');
const logger = createDaemonLogger(logPath);

// Override console to route all output through daemon logger
console.log = (...args) => logger.info('daemon', args.join(' '));
console.warn = (...args) => logger.warn('daemon', args.join(' '));
console.error = (...args) => logger.error('daemon', args.join(' '));

// -- Daemon state (exported for daemon-server.cjs) --
let _state = {
  container: null,
  lifecycle: null,
  config: null,
  paths: null,
  circuit: null,
  pulley: null,
  logger,
  startedAt: new Date().toISOString(),
  server: null,
};

/**
 * Graceful shutdown sequence.
 *
 * @param {string} signal - Signal name (SIGTERM, SIGINT)
 * @param {number} timeout - Hard timeout in ms
 */
async function _gracefulShutdown(signal, timeout) {
  logger.info('daemon', `Received ${signal}, shutting down...`);

  // Hard timeout fallback
  const hardTimer = setTimeout(() => {
    logger.error('daemon', 'Shutdown timeout exceeded, force exit');
    process.exit(1);
  }, timeout);

  try {
    // Step 1: Stop HTTP server if running
    if (_state.server) {
      _state.server.stop();
      logger.info('daemon', 'HTTP server stopped');
    }

    // Step 2: Close Ledger connection if available
    try {
      const ledger = _state.container?.resolve?.('ledger');
      if (ledger && typeof ledger.close === 'function') {
        ledger.close();
      }
    } catch (_e) { /* non-fatal */ }

    // Step 3: Remove PID file
    removeDaemonFile(projectRoot);

    // Step 4: Remove active-triad.json if exists
    try {
      const fs = require('node:fs');
      const triadPath = path.join(projectRoot, '.dynamo', 'active-triad.json');
      fs.unlinkSync(triadPath);
    } catch (_e) { /* ENOENT ok */ }

    // Step 5: Log final message
    logger.info('daemon', 'Dynamo stopped');
  } catch (shutdownErr) {
    logger.error('daemon', `Shutdown error: ${shutdownErr.message}`);
  } finally {
    clearTimeout(hardTimer);
    process.exit(0);
  }
}

// -- Signal handlers --
process.on('SIGTERM', () => _gracefulShutdown('SIGTERM', 10000));
process.on('SIGINT', () => _gracefulShutdown('SIGINT', 5000));

// -- Bootstrap --
(async () => {
  try {
    logger.info('daemon', 'Bootstrapping Dynamo...');

    // Attempt to load core.cjs for bootstrap
    let bootstrap;
    try {
      ({ bootstrap } = require('./core.cjs'));
    } catch (_e) {
      // If core.cjs is not available (worktree/test), create minimal state
      logger.warn('daemon', 'core.cjs not available, running in minimal mode');
      _state.config = { version: '0.1.0', daemon: { port } };

      // Skip to server startup
      _startServer();
      return;
    }

    const result = await bootstrap();
    if (!result.ok) {
      logger.error('daemon', `Bootstrap failed: ${result.error?.message || 'unknown error'}`);
      process.exit(1);
    }

    const { container, lifecycle, config, paths, circuit, pulley } = result.value;
    _state.container = container;
    _state.lifecycle = lifecycle;
    _state.config = config;
    _state.paths = paths;
    _state.circuit = circuit;
    _state.pulley = pulley;

    logger.info('daemon', 'Bootstrap complete');

    // -- Plan 04 additions: start HTTP server --
    _startServer();
  } catch (err) {
    logger.error('daemon', `Fatal: ${err.message}`);
    process.exit(1);
  }
})();

/**
 * Starts the HTTP server and writes PID file.
 * Called after bootstrap completes (or in minimal mode).
 */
function _startServer() {
  try {
    const { createDaemonServer } = require('./daemon-server.cjs');
    const server = createDaemonServer(_state);
    _state.server = server;

    // Write PID file
    writeDaemonFile(projectRoot, {
      pid: process.pid,
      port: server.port,
      started: _state.startedAt,
      version: _state.config?.version || '0.1.0',
    });

    logger.info('daemon', 'Dynamo running on port ' + server.port + ' (PID ' + process.pid + ')');
  } catch (serverErr) {
    logger.error('daemon', `Server start failed: ${serverErr.message}`);
    process.exit(1);
  }
}

module.exports = { getState: () => _state };

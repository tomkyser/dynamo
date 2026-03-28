'use strict';

const { ok, err } = require('../../../lib/result.cjs');
const { aggregateHealth, analyzeDependencyChain, formatDiagnostics } = require('./health.cjs');
const { getLatestRelease, compareVersions, isNewerAvailable } = require('../../services/forge/versioning.cjs');

/**
 * Registers all platform-level CLI commands with Pulley.
 *
 * Commands registered:
 *   - status:  Show platform status (lifecycle, service/provider counts)
 *   - health:  Run health check on all services with dependency analysis
 *   - version: Show version info with remote update check
 *   - install: Install a plugin or module from git URL via Relay
 *   - update:  Self-update: pull core + submodules + relay update + health verify
 *   - config:  Show configuration values
 *
 * Per D-05: operations-focused root commands.
 * Per D-13: full ecosystem management via Relay.
 * Per INF-02: self-update orchestrates core + submodules.
 *
 * @param {Object} pulley - Pulley instance with registerCommand()
 * @param {Object} context - Platform context
 * @param {Object} context.lifecycle - Lifecycle manager with getFacade(), getStatus()
 * @param {Object} context.container - IoC container with getRegistry()
 * @param {Object} context.config - Platform config object
 * @param {Object} context.paths - Platform paths { root, deploy }
 * @param {string} context.packageVersion - Current Dynamo version string
 * @returns {import('../../../lib/result.cjs').Result<{registered: number}>}
 */
function registerPlatformCommands(pulley, context) {
  const owner = (context.config.github && context.config.github.owner) || 'user';
  const repo = (context.config.github && context.config.github.repo) || 'dynamo';

  // ---- status ----

  /**
   * Shows platform status: lifecycle state, service count, provider count.
   *
   * @param {string[]} args - Positional arguments (unused)
   * @param {Object} flags - Command flags (unused)
   * @returns {import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>}
   */
  function handleStatus(args, flags) {
    const lifecycleStatus = context.lifecycle.getStatus();
    const registry = context.container.getRegistry();
    const serviceNames = [...registry.keys()].filter(n => n.startsWith('services.'));
    const providerNames = [...registry.keys()].filter(n => n.startsWith('providers.'));

    const result = {
      status: lifecycleStatus,
      services: serviceNames.length,
      providers: providerNames.length,
      lifecycle: lifecycleStatus,
    };

    return ok({
      human: `Dynamo Platform: ${lifecycleStatus}\nServices: ${serviceNames.length}\nProviders: ${providerNames.length}`,
      json: result,
      raw: JSON.stringify(result),
    });
  }

  pulley.registerCommand('status', handleStatus, {
    description: 'Show platform status',
  });

  // ---- health ----

  /**
   * Runs health check on all services. Includes dependency chain analysis
   * when unhealthy services are detected.
   *
   * @param {string[]} args - Positional arguments (unused)
   * @param {Object} flags - Command flags (unused)
   * @returns {import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>}
   */
  function handleHealth(args, flags) {
    const registry = context.container.getRegistry();

    // Build facades map from lifecycle for each registered name
    const facadesMap = new Map();
    for (const name of registry.keys()) {
      const facade = context.lifecycle.getFacade(name);
      if (facade) {
        facadesMap.set(name, facade);
      }
    }

    const healthReport = aggregateHealth(facadesMap, registry);

    // Analyze dependency chains for unhealthy services.
    // We need the registry keys (e.g. 'services.switchboard'), not the health
    // report names (e.g. 'switchboard'), because analyzeDependencyChain uses
    // registry keys to trace reverse dependency edges.
    const unhealthyNames = new Set(
      healthReport.services.filter(s => !s.healthy).map(s => s.name || 'unknown')
    );
    const unhealthy = [...facadesMap.keys()].filter(key => {
      const facade = facadesMap.get(key);
      if (typeof facade.healthCheck !== 'function') return false;
      try {
        const hc = facade.healthCheck();
        if (hc && hc.ok === true && hc.value) return !hc.value.healthy;
        if (hc && hc.ok === false) return true;
      } catch (_e) {
        return true;
      }
      return false;
    });

    const analysis = unhealthy.length > 0
      ? analyzeDependencyChain(unhealthy, registry)
      : null;

    const diagnosticsStr = formatDiagnostics(healthReport, analysis);

    return ok({
      human: diagnosticsStr,
      json: {
        ...healthReport,
        impacted: analysis ? analysis.impacted : [],
      },
      raw: JSON.stringify(healthReport, null, 2),
    });
  }

  pulley.registerCommand('health', handleHealth, {
    description: 'Run health check on all services',
  });

  // ---- version ----

  /**
   * Shows version information. Checks GitHub for remote updates.
   *
   * @param {string[]} args - Positional arguments (unused)
   * @param {Object} flags - Command flags (unused)
   * @returns {Promise<import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>>}
   */
  async function handleVersion(args, flags) {
    const local = context.packageVersion || '0.0.0';
    let newer = false;
    let latestVersion = 'unknown';

    try {
      const remoteResult = await getLatestRelease(owner, repo);
      if (remoteResult.ok) {
        latestVersion = remoteResult.value.version;
        newer = isNewerAvailable(local, latestVersion);
      }
    } catch (_e) {
      // Remote check failed -- non-fatal
    }

    const result = {
      version: local,
      latest: latestVersion,
      updateAvailable: newer,
    };

    const humanStr = `Dynamo v${local}${newer ? ' (update available: v' + latestVersion + ')' : ''}`;

    return ok({
      human: humanStr,
      json: result,
      raw: local,
    });
  }

  pulley.registerCommand('version', handleVersion, {
    description: 'Show version information',
  });

  // ---- install ----

  /**
   * Installs a plugin or module from a git URL via Relay.
   *
   * @param {string[]} args - [url, name?] positional arguments
   * @param {Object} flags - Command flags
   * @param {string} [flags.type='plugin'] - 'plugin' | 'module' | 'extension'
   * @returns {Promise<import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>>}
   */
  async function handleInstall(args, flags) {
    const url = args[0];
    if (!url) {
      return err('MISSING_URL', 'Usage: dynamo install <git-url> [name] [--type plugin|module]');
    }

    // Derive name from URL if not provided
    const name = args[1] || url.split('/').pop().replace(/\.git$/, '');

    const relay = context.lifecycle.getFacade('services.relay');
    if (!relay) {
      return err('NO_RELAY', 'Relay service not available -- platform may not be fully initialized. Try: bun bin/dynamo.cjs health to check service status');
    }

    const installType = flags.type || 'plugin';
    let installResult;

    if (installType === 'module') {
      installResult = await relay.addModule(url, name);
    } else {
      installResult = await relay.addPlugin(url, name);
    }

    if (!installResult.ok) {
      return installResult;
    }

    return ok({
      human: `Installed ${installType} "${name}" from ${url}`,
      json: { type: installType, name, url, status: 'installed' },
      raw: `${installType}:${name}`,
    });
  }

  pulley.registerCommand('install', handleInstall, {
    description: 'Install a plugin or module from git URL',
    flags: {
      type: { type: 'string', description: 'plugin|module|extension', default: 'plugin' },
    },
  });

  // ---- update ----

  /**
   * Self-update: pull core, update submodules, relay update, verify health.
   *
   * @param {string[]} args - Positional arguments (unused)
   * @param {Object} flags - Command flags (unused)
   * @returns {Promise<import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>>}
   */
  async function handleUpdate(args, flags) {
    const relay = context.lifecycle.getFacade('services.relay');
    const forge = context.lifecycle.getFacade('services.forge');

    const steps = [];

    // Step 1: Pull core
    if (forge && typeof forge.pull === 'function') {
      const pullResult = forge.pull('origin', 'master');
      steps.push({ step: 'pull', ok: pullResult.ok });
    }

    // Step 2: Update submodules
    if (forge && typeof forge.submoduleUpdate === 'function') {
      const subResult = forge.submoduleUpdate();
      steps.push({ step: 'submodules', ok: subResult.ok });
    }

    // Step 3: Run relay update with source and deploy paths
    if (relay && typeof relay.update === 'function') {
      const deployPath = (context.paths && context.paths.deploy) || (context.paths && context.paths.root);
      const relayResult = await relay.update(context.paths.root, deployPath);
      steps.push({ step: 'relay', ok: relayResult.ok });
    }

    // Step 4: Verify health
    const registry = context.container.getRegistry();
    const facadesMap = new Map();
    for (const name of registry.keys()) {
      const facade = context.lifecycle.getFacade(name);
      if (facade) {
        facadesMap.set(name, facade);
      }
    }
    const healthReport = aggregateHealth(facadesMap, registry);
    steps.push({ step: 'health', ok: healthReport.overall === 'healthy' });

    const allOk = steps.every(s => s.ok);
    const summary = steps.map(s => `${s.step}: ${s.ok ? 'OK' : 'FAIL'}`).join(', ');

    return ok({
      human: `Update ${allOk ? 'complete' : 'completed with issues'}: ${summary}`,
      json: { steps, overall: allOk ? 'success' : 'partial', health: healthReport.overall },
      raw: JSON.stringify({ steps, overall: allOk ? 'success' : 'partial' }),
    });
  }

  pulley.registerCommand('update', handleUpdate, {
    description: 'Update Dynamo and all submodules',
  });

  // ---- config ----

  /**
   * Shows configuration values.
   *
   * @param {string[]} args - [key?] positional arguments
   * @param {Object} flags - Command flags (unused)
   * @returns {import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>}
   */
  function handleConfig(args, flags) {
    const configData = context.config || {};

    if (args[0]) {
      const key = args[0];
      const value = configData[key];
      if (value === undefined) {
        return err('CONFIG_KEY_NOT_FOUND', `Config key "${key}" not found. Try: bun bin/dynamo.cjs config to list all available config keys`);
      }
      return ok({
        human: `${key}: ${JSON.stringify(value, null, 2)}`,
        json: value,
        raw: JSON.stringify(value),
      });
    }

    // Full config summary
    const keys = Object.keys(configData);
    const formatted = keys.map(k => `${k}: ${typeof configData[k] === 'object' ? JSON.stringify(configData[k]) : configData[k]}`).join('\n');

    return ok({
      human: formatted || 'No configuration loaded',
      json: configData,
      raw: JSON.stringify(configData, null, 2),
    });
  }

  pulley.registerCommand('config', handleConfig, {
    description: 'Show configuration',
  });

  // ---- reverie kill ----

  /**
   * Force-kills all Reverie session processes (relay, channel servers, spawned Claude sessions).
   * Brute-force cleanup that works regardless of Reverie state or bootstrap health.
   *
   * Searches for processes by name pattern, kills them, and clears Magnet PIDs if available.
   *
   * @param {string[]} args - Positional arguments (unused)
   * @param {Object} flags - Command flags (unused)
   * @returns {import('../../../lib/result.cjs').Result<{human: string, json: Object, raw: string}>}
   */
  function handleReverieKill(args, flags) {
    const { execSync } = require('node:child_process');
    const killed = [];

    // Patterns that identify Reverie session processes
    const patterns = [
      'relay-server.cjs',
      'channel-server.cjs',
      'dangerously-load-development-channels.*dynamo-wire',
    ];

    for (const pattern of patterns) {
      try {
        const output = execSync(
          'ps aux | grep -E ' + JSON.stringify(pattern) + ' | grep -v grep',
          { encoding: 'utf8', timeout: 5000 }
        ).trim();

        if (!output) continue;

        const lines = output.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1], 10);
          if (pid && pid !== process.pid) {
            try {
              process.kill(pid, 'SIGTERM');
              killed.push({ pid, pattern, command: parts.slice(10).join(' ').slice(0, 80) });
            } catch (_e) {
              // Already dead or permission denied
            }
          }
        }
      } catch (_e) {
        // grep returns exit 1 when no matches -- expected
      }
    }

    // Clear Magnet PIDs if available
    const magnetFacade = context.lifecycle.getFacade('services.magnet');
    if (magnetFacade && typeof magnetFacade.set === 'function') {
      try {
        magnetFacade.set('global', 'relay_pid', null);
        magnetFacade.set('global', 'relay_port', null);
        magnetFacade.set('global', 'secondary_pid', null);
        magnetFacade.set('global', 'tertiary_pid', null);
        magnetFacade.set('global', 'triplet_id', null);
      } catch (_e) { /* best-effort */ }
    }

    const result = { killed: killed.length, processes: killed };
    const humanLines = killed.length === 0
      ? 'No Reverie processes found'
      : 'Killed ' + killed.length + ' process(es):\n' + killed.map(function (p) {
          return '  PID ' + p.pid + ' — ' + p.command;
        }).join('\n');

    return ok({
      human: humanLines,
      json: result,
      raw: JSON.stringify(result),
    });
  }

  pulley.registerCommand('reverie kill', handleReverieKill, {
    description: 'Force-kill all Reverie session processes',
  });

  return ok({ registered: 7 });
}

module.exports = { registerPlatformCommands };

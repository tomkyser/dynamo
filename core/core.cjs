'use strict';

const path = require('node:path');
const { ok, err } = require('../lib/result.cjs');
const { discoverRoot, createPaths } = require('../lib/paths.cjs');
const { loadConfig } = require('../lib/config.cjs');
const { createContainer, createLifecycle } = require('./armature/index.cjs');
const { discoverModules, loadModule } = require('./armature/module-discovery.cjs');

// Service factories
const { createSwitchboard } = require('./services/switchboard/switchboard.cjs');
const { createLathe } = require('./services/lathe/lathe.cjs');
const { createCommutator } = require('./services/commutator/commutator.cjs');
const { createMagnet } = require('./services/magnet/magnet.cjs');
const { createConductor } = require('./services/conductor/conductor.cjs');
const { createForge } = require('./services/forge/forge.cjs');
const { createRelay } = require('./services/relay/relay.cjs');
const { createWire } = require('./services/wire/wire.cjs');
const { createAssay } = require('./services/assay/assay.cjs');
const { createExciter } = require('./services/exciter/exciter.cjs');

// Provider factories
const { createLedger } = require('./providers/ledger/ledger.cjs');
const { createJournal } = require('./providers/journal/journal.cjs');
const { createLithograph } = require('./providers/lithograph/lithograph.cjs');

// SDK factories
const { createCircuit } = require('./sdk/circuit/circuit.cjs');
const { createPulley } = require('./sdk/pulley/pulley.cjs');
const { registerPlatformCommands } = require('./sdk/pulley/platform-commands.cjs');

/**
 * Bootstraps the entire Dynamo platform.
 *
 * Creates the IoC container, registers all 10 services and 3 providers with
 * their dependency metadata, domain tags, and aliases, then boots them in
 * topological order via the lifecycle orchestrator.
 *
 * This is the single entry point for the platform (per D-07). Everything
 * routes through Dynamo -- no component bypasses the patterns and paths
 * Dynamo defines.
 *
 * @param {Object} [options={}] - Bootstrap options
 * @param {Object} [options.paths] - Pre-built paths object (for test isolation with tmpdir)
 * @param {Object} [options.configOverrides] - Config overrides merged into loaded config
 * @param {string} [options.pluginsDir] - Override plugins directory
 * @returns {Promise<import('../lib/result.cjs').Result<{container: Object, lifecycle: Object, config: Object, paths: Object, circuit: Object, pulley: Object}>>}
 */
async function bootstrap(options = {}) {
  // 1. Resolve paths
  let paths;
  if (options.paths) {
    paths = options.paths;
  } else {
    const rootResult = discoverRoot(process.cwd());
    if (!rootResult.ok) {
      return rootResult;
    }
    paths = createPaths(rootResult.value);
  }

  // 2. Load config
  const configResult = loadConfig({
    globalConfigPath: paths.config,
    env: {},
    runtimeOverrides: options.configOverrides || {},
  });
  if (!configResult.ok) {
    return configResult;
  }
  const config = configResult.value;

  // 3. Create container
  const container = createContainer();

  // 4. Register all 10 services as singletons
  container.singleton('services.switchboard', createSwitchboard, {
    deps: [],
    tags: ['service', 'events'],
  });

  container.singleton('services.lathe', createLathe, {
    deps: [],
    tags: ['service', 'filesystem'],
  });

  container.singleton('services.commutator', createCommutator, {
    deps: ['services.switchboard'],
    tags: ['service', 'io'],
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  container.singleton('services.magnet', createMagnet, {
    deps: ['services.switchboard', 'services.lathe'],
    tags: ['service', 'state'],
    mapDeps: { 'services.switchboard': 'switchboard', 'services.lathe': 'lathe' },
    config: { statePath: paths.root + '/data/state.json' },
  });

  container.singleton('services.conductor', createConductor, {
    deps: ['services.switchboard'],
    tags: ['service', 'infrastructure'],
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  container.singleton('services.forge', createForge, {
    deps: ['services.lathe', 'services.switchboard'],
    tags: ['service', 'git'],
    mapDeps: { 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
    config: { repoPath: paths.root },
  });

  container.singleton('services.relay', createRelay, {
    deps: ['services.forge', 'services.lathe', 'services.switchboard'],
    tags: ['service', 'operations'],
    mapDeps: { 'services.forge': 'forge', 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
    config: { configPath: paths.config },
  });

  container.singleton('services.wire', createWire, {
    deps: ['services.switchboard', 'services.conductor', 'providers.ledger'],
    tags: ['service', 'communication'],
    mapDeps: { 'services.switchboard': 'switchboard', 'services.conductor': 'conductor', 'providers.ledger': 'ledger' },
  });

  container.singleton('services.assay', createAssay, {
    deps: ['services.switchboard', 'providers.ledger', 'providers.journal'],
    tags: ['service', 'search'],
    mapDeps: { 'services.switchboard': 'switchboard', 'providers.ledger': 'ledger', 'providers.journal': 'journal' },
  });

  container.singleton('services.exciter', createExciter, {
    deps: ['services.switchboard', 'services.lathe'],
    tags: ['service', 'integration'],
    mapDeps: { 'services.switchboard': 'switchboard', 'services.lathe': 'lathe' },
  });

  // 5. Register all 3 providers with domain tags and aliases
  container.singleton('providers.ledger', createLedger, {
    deps: ['services.switchboard'],
    tags: ['provider', 'data', 'sql'],
    aliases: ['providers.data.sql'],
    config: { dbPath: paths.root + '/data/ledger.db' },
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  container.singleton('providers.journal', createJournal, {
    deps: ['services.lathe', 'services.switchboard'],
    tags: ['provider', 'data', 'files'],
    aliases: ['providers.data.files'],
    mapDeps: { 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
    config: { basePath: paths.root + '/data/journal' },
  });

  container.singleton('providers.lithograph', createLithograph, {
    deps: ['services.lathe'],
    tags: ['provider', 'data', 'transcript'],
    aliases: ['providers.data.transcript'],
    mapDeps: { 'services.lathe': 'lathe' },
  });

  // 6. Create lifecycle
  const lifecycle = createLifecycle(container, {
    pluginsDir: options.pluginsDir || paths.root + '/plugins',
    config,
  });

  // 7. Boot
  const bootResult = await lifecycle.boot();
  if (!bootResult.ok) {
    return bootResult;
  }

  // 7.5a. Create Pulley CLI framework
  const pulleyResult = createPulley();
  if (!pulleyResult.ok) {
    return pulleyResult;
  }
  const pulley = pulleyResult.value;

  // 7.5b. Create Circuit module API
  const circuitResult = createCircuit({
    lifecycle,
    container,
    pulley,
  });
  if (!circuitResult.ok) {
    return circuitResult;
  }
  const circuit = circuitResult.value;

  // 7.5c. Register platform CLI commands
  const packageVersion = config.version || '0.0.0';
  registerPlatformCommands(pulley, {
    lifecycle,
    container,
    config,
    paths,
    packageVersion,
  });

  // 7.5d. Discover and register modules
  const modulesDir = options.modulesDir || paths.root + '/modules';
  const moduleResults = [];
  const moduleDirs = discoverModules(modulesDir);

  for (const moduleDir of moduleDirs) {
    try {
      const loadResult = loadModule(moduleDir);
      if (!loadResult.ok) {
        moduleResults.push({ name: path.basename(moduleDir), status: 'skipped', reason: loadResult.error });
        continue;
      }

      const { name, manifest, entryPath } = loadResult.value;
      const entry = require(entryPath);
      const regResult = circuit.registerModule(manifest, entry.register);
      moduleResults.push({
        name,
        status: regResult.ok ? 'registered' : 'error',
        error: regResult.ok ? undefined : regResult.error,
      });
    } catch (e) {
      // Module failure is isolated -- platform continues (per plugin isolation pattern)
      moduleResults.push({ name: path.basename(moduleDir), status: 'error', error: e.message });
    }
  }

  // 7.6. Re-wire Exciter hooks to Switchboard (MUST be after module registration)
  // Exciter.start() during lifecycle boot wired 0 listeners because no modules
  // had registered yet. Now that modules have registered hooks via
  // exciter.registerHooks(), re-wire to connect them to Switchboard.
  // wireToSwitchboard is idempotent -- already-wired types are skipped.
  const exciterFacade = lifecycle.getFacade('services.exciter');
  if (exciterFacade && typeof exciterFacade.start === 'function') {
    exciterFacade.start();
  }

  // 7.7. Generate .claude/settings.json hook entries for Claude Code dispatch
  // Each hook type gets an entry pointing to Dynamo's hook entry point.
  // Exciter.updateSettings handles deduplication -- safe to call on every boot.
  if (exciterFacade && typeof exciterFacade.updateSettings === 'function') {
    const hookTypes = [
      'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
      'Stop', 'PreCompact', 'SubagentStart', 'SubagentStop',
    ];
    for (const hookType of hookTypes) {
      exciterFacade.updateSettings('project', hookType, {
        hooks: [{
          type: 'command',
          command: 'bun run bin/dynamo.cjs hook ' + hookType,
        }],
      });
    }
  }

  // 8. Return success
  return ok({ container, lifecycle, config, paths, circuit, pulley, modules: moduleResults });
}

module.exports = { bootstrap };

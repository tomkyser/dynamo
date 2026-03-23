'use strict';

const { ok, err } = require('../lib/result.cjs');
const { discoverRoot, createPaths } = require('../lib/paths.cjs');
const { loadConfig } = require('../lib/config.cjs');
const { createContainer, createLifecycle } = require('./armature/index.cjs');

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

// Provider factories
const { createLedger } = require('./providers/ledger/ledger.cjs');
const { createJournal } = require('./providers/journal/journal.cjs');

/**
 * Bootstraps the entire Dynamo platform.
 *
 * Creates the IoC container, registers all 9 services and 2 providers with
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
 * @returns {Promise<import('../lib/result.cjs').Result<{container: Object, lifecycle: Object, config: Object, paths: Object}>>}
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

  // 4. Register all 9 services as singletons
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
    deps: [],
    tags: ['service', 'state'],
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  container.singleton('services.conductor', createConductor, {
    deps: [],
    tags: ['service', 'infrastructure'],
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  container.singleton('services.forge', createForge, {
    deps: ['services.lathe'],
    tags: ['service', 'git'],
    mapDeps: { 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
    config: { repoPath: paths.root },
  });

  container.singleton('services.relay', createRelay, {
    deps: ['services.forge', 'services.lathe'],
    tags: ['service', 'operations'],
    mapDeps: { 'services.forge': 'forge', 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
    config: { configPath: paths.config },
  });

  container.singleton('services.wire', createWire, {
    deps: ['services.switchboard'],
    tags: ['service', 'communication'],
    mapDeps: { 'services.switchboard': 'switchboard', 'services.conductor': 'conductor', 'providers.ledger': 'ledger' },
  });

  container.singleton('services.assay', createAssay, {
    deps: [],
    tags: ['service', 'search'],
    mapDeps: { 'services.switchboard': 'switchboard', 'providers.ledger': 'ledger', 'providers.journal': 'journal' },
  });

  // 5. Register both providers with domain tags and aliases
  container.singleton('providers.ledger', createLedger, {
    deps: [],
    tags: ['provider', 'data', 'sql'],
    aliases: ['providers.data.sql'],
    config: { dbPath: paths.root + '/data/ledger.db' },
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  container.singleton('providers.journal', createJournal, {
    deps: ['services.lathe'],
    tags: ['provider', 'data', 'files'],
    aliases: ['providers.data.files'],
    mapDeps: { 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
    config: { basePath: paths.root + '/data/journal' },
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

  // 8. Return success
  return ok({ container, lifecycle, config, paths });
}

module.exports = { bootstrap };

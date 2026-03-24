'use strict';

const container = require('./container.cjs');
const facade = require('./facade.cjs');
const lifecycle = require('./lifecycle.cjs');
const hooks = require('./hooks.cjs');
const plugin = require('./plugin.cjs');

module.exports = {
  // container.cjs
  createContainer: container.createContainer,

  // facade.cjs
  createFacade: facade.createFacade,

  // lifecycle.cjs
  createLifecycle: lifecycle.createLifecycle,

  // hooks.cjs
  HOOK_SCHEMAS: hooks.HOOK_SCHEMAS,
  HOOK_EVENT_NAMES: hooks.HOOK_EVENT_NAMES,
  createHookRegistry: hooks.createHookRegistry,

  // plugin.cjs
  PLUGIN_MANIFEST_SCHEMA: plugin.PLUGIN_MANIFEST_SCHEMA,
  validateManifest: plugin.validateManifest,
  checkDependencies: plugin.checkDependencies,
  loadPlugin: plugin.loadPlugin,
  discoverPlugins: plugin.discoverPlugins,
};

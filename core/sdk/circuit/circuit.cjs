'use strict';

const { ok, err, isOk, isErr, createContract, validate } = require('../../../lib/index.cjs');
const { createEventProxy } = require('./event-proxy.cjs');
const { validateModuleManifest } = require('./module-manifest.cjs');
const { createTemplateRegistry } = require('./template-registry.cjs');
const { loadModule } = require('../../armature/module-discovery.cjs');

/**
 * Contract shape for the Circuit module API.
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const CIRCUIT_SHAPE = {
  required: ['registerModule', 'shutdownModule', 'getService', 'getProvider', 'getModuleInfo', 'listModules'],
  optional: ['registerCommand', 'registerMcpTool', 'registerTemplates', 'getTemplate', 'castTemplate', 'listTemplates', 'enableModule', 'disableModule'],
};

/**
 * Creates the Circuit module API -- the only gateway for modules to interact
 * with the Dynamo platform.
 *
 * Circuit enforces:
 * - Facade-only access (modules never see raw implementations or the container)
 * - Manifest-based registration with dependency validation
 * - Namespaced event proxy per module
 * - Lib essentials re-export (ok, err, isOk, isErr, validate, createContract)
 * - Optional Pulley delegation for CLI commands and MCP tools
 *
 * @param {Object} [options={}] - Circuit options
 * @param {Object} options.lifecycle - Lifecycle manager with getFacade()
 * @param {Object} options.container - IoC container with has() for dependency checking
 * @param {Object} [options.pulley] - Pulley SDK with registerCommand/registerMcpTool
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen Circuit contract
 */
function createCircuit(options = {}) {
  const { lifecycle, container, pulley } = options;

  /**
   * Registered modules: Map<moduleName, { manifest, eventProxy }>
   * @type {Map<string, {manifest: Object, eventProxy: Object}>}
   */
  const _modules = new Map();

  /**
   * Template registry instance for this Circuit.
   * Provides namespaced template registration, retrieval, and casting.
   * @type {Object}
   */
  const _templateRegistry = createTemplateRegistry();

  /**
   * Returns a facade for a service, scoped to the module's declared dependencies.
   *
   * @param {string} moduleName - The requesting module
   * @param {string} serviceName - The service to access
   * @returns {import('../../../lib/result.cjs').Result<Object>} Ok with facade, or Err
   * @private
   */
  function _scopedGetService(moduleName, serviceName) {
    const mod = _modules.get(moduleName);
    if (!mod) {
      return err('MODULE_NOT_FOUND', `Module "${moduleName}" is not registered`, { moduleName });
    }

    const deps = mod.manifest.dependencies || { services: [], providers: [] };
    if (!deps.services.includes(serviceName)) {
      return err('UNDECLARED_DEPENDENCY', `Module "${moduleName}" has not declared dependency on service "${serviceName}"`, {
        moduleName,
        serviceName,
      });
    }

    const facade = lifecycle.getFacade('services.' + serviceName);
    if (!facade) {
      return err('SERVICE_NOT_FOUND', `Service "${serviceName}" facade not available`, { serviceName });
    }

    return ok(facade);
  }

  /**
   * Returns a facade for a provider, scoped to the module's declared dependencies.
   *
   * @param {string} moduleName - The requesting module
   * @param {string} providerName - The provider to access
   * @returns {import('../../../lib/result.cjs').Result<Object>} Ok with facade, or Err
   * @private
   */
  function _scopedGetProvider(moduleName, providerName) {
    const mod = _modules.get(moduleName);
    if (!mod) {
      return err('MODULE_NOT_FOUND', `Module "${moduleName}" is not registered`, { moduleName });
    }

    const deps = mod.manifest.dependencies || { services: [], providers: [] };
    if (!deps.providers.includes(providerName)) {
      return err('UNDECLARED_DEPENDENCY', `Module "${moduleName}" has not declared dependency on provider "${providerName}"`, {
        moduleName,
        providerName,
      });
    }

    const facade = lifecycle.getFacade('providers.' + providerName);
    if (!facade) {
      return err('PROVIDER_NOT_FOUND', `Provider "${providerName}" facade not available`, { providerName });
    }

    return ok(facade);
  }

  /**
   * Registers a module with the Circuit.
   *
   * Validates the manifest, checks for duplicates, verifies all declared
   * dependencies exist in the container, creates a scoped event proxy,
   * then calls the module's register callback with the scoped Circuit API.
   *
   * @param {Object} manifest - Module manifest (name, version, main, dependencies, hooks)
   * @param {Function} registerFn - Module registration callback receiving the scoped Circuit API
   * @returns {import('../../../lib/result.cjs').Result<{name: string}>}
   */
  function registerModule(manifest, registerFn) {
    // 1. Validate manifest
    const validationResult = validateModuleManifest(manifest);
    if (!validationResult.ok) {
      return validationResult;
    }
    const validatedManifest = validationResult.value;

    // 2. Check for duplicates
    if (_modules.has(validatedManifest.name)) {
      return err('MODULE_EXISTS', `Module "${validatedManifest.name}" is already registered`, {
        moduleName: validatedManifest.name,
      });
    }

    // 3. Check dependencies
    const deps = validatedManifest.dependencies || { services: [], providers: [] };
    const missing = [];

    for (const svc of (deps.services || [])) {
      if (!container.has('services.' + svc)) {
        missing.push('services.' + svc);
      }
    }
    for (const prov of (deps.providers || [])) {
      if (!container.has('providers.' + prov)) {
        missing.push('providers.' + prov);
      }
    }

    if (missing.length > 0) {
      return err('MODULE_MISSING_DEPS', `Module "${validatedManifest.name}" has unmet dependencies: ${missing.join(', ')}`, {
        missing,
        moduleName: validatedManifest.name,
      });
    }

    // 4. Create event proxy
    const switchboardFacade = lifecycle.getFacade('services.switchboard');
    const eventProxy = createEventProxy(validatedManifest.name, switchboardFacade);

    // 5. Build scoped Circuit API for the module
    //    getService/getProvider unwrap Results so modules get facades directly.
    //    Undeclared dependencies throw — they are programming errors, not runtime conditions.
    const circuitApi = {
      getService: (name) => {
        const result = _scopedGetService(validatedManifest.name, name);
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      },
      getProvider: (name) => {
        const result = _scopedGetProvider(validatedManifest.name, name);
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      },
      events: eventProxy,
      registerCommand: pulley
        ? (name, handler, meta) => pulley.registerCommand(`${validatedManifest.name} ${name}`, handler, meta)
        : () => err('NO_PULLEY', 'Pulley not available'),
      registerMcpTool: pulley
        ? (name, handler, schema) => pulley.registerMcpTool(name, handler, schema)
        : () => err('NO_PULLEY', 'Pulley not available'),
      ok,
      err,
      isOk,
      isErr,
      validate,
      createContract,
    };

    // 6. Store module BEFORE calling registerFn so getService/getProvider
    //    can resolve the module's declared dependencies during registration.
    _modules.set(validatedManifest.name, { manifest: validatedManifest, eventProxy });

    // 7. Call registerFn
    const registerResult = registerFn(circuitApi);
    if (registerResult && registerResult.ok === false) {
      _modules.delete(validatedManifest.name); // rollback on failure
      return registerResult;
    }

    // 8. Return success
    return ok({ name: validatedManifest.name });
  }

  /**
   * Shuts down a registered module by cleaning up its event subscriptions
   * and removing it from the registry.
   *
   * @param {string} moduleName - Name of the module to shut down
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function shutdownModule(moduleName) {
    const mod = _modules.get(moduleName);
    if (!mod) {
      return err('MODULE_NOT_FOUND', `Module "${moduleName}" is not registered`, { moduleName });
    }

    mod.eventProxy.cleanup();
    _modules.delete(moduleName);
    return ok(undefined);
  }

  /**
   * Public API for getService -- delegates to scoped access.
   *
   * @param {string} moduleName - The requesting module
   * @param {string} serviceName - The service to access
   * @returns {import('../../../lib/result.cjs').Result<Object>}
   */
  function getService(moduleName, serviceName) {
    return _scopedGetService(moduleName, serviceName);
  }

  /**
   * Public API for getProvider -- delegates to scoped access.
   *
   * @param {string} moduleName - The requesting module
   * @param {string} providerName - The provider to access
   * @returns {import('../../../lib/result.cjs').Result<Object>}
   */
  function getProvider(moduleName, providerName) {
    return _scopedGetProvider(moduleName, providerName);
  }

  /**
   * Returns information about a registered module.
   *
   * @param {string} moduleName - Module name
   * @returns {import('../../../lib/result.cjs').Result<{name: string, manifest: Object, subscriptions: number}>}
   */
  function getModuleInfo(moduleName) {
    const mod = _modules.get(moduleName);
    if (!mod) {
      return err('MODULE_NOT_FOUND', `Module "${moduleName}" is not registered`, { moduleName });
    }

    return ok({
      name: moduleName,
      manifest: mod.manifest,
      subscriptions: mod.eventProxy.getSubscriptionCount(),
    });
  }

  /**
   * Returns a list of all registered module names.
   *
   * @returns {import('../../../lib/result.cjs').Result<string[]>}
   */
  function listModules() {
    return ok([..._modules.keys()]);
  }

  /**
   * Top-level registerCommand -- delegates to Pulley if available.
   *
   * @param {string} name - Command name
   * @param {Function} handler - Command handler
   * @param {Object} [meta] - Command metadata
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function registerCommand(name, handler, meta) {
    if (!pulley) {
      return err('NO_PULLEY', 'Pulley not available');
    }
    return pulley.registerCommand(name, handler, meta);
  }

  /**
   * Top-level registerMcpTool -- delegates to Pulley if available.
   *
   * @param {string} name - Tool name
   * @param {Function} handler - Tool handler
   * @param {Object} [schema] - Tool input schema
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function registerMcpTool(name, handler, schema) {
    if (!pulley) {
      return err('NO_PULLEY', 'Pulley not available');
    }
    return pulley.registerMcpTool(name, handler, schema);
  }

  /**
   * Enables a discovered module by loading it, registering templates, and
   * returning it as ready for use.
   *
   * @param {string} moduleName - Name of the module to enable
   * @returns {Promise<{status: string, module: string, instance: Object|null}>}
   * @throws {Error} If the module is not found or cannot be loaded
   */
  async function enableModule(moduleName) {
    // Resolve module directory from container's discovered modules
    const armature = container.has('armature') ? container.resolve('armature') : null;
    const moduleManifest = armature?.getModuleManifest?.(moduleName);

    // Try module-discovery loadModule as fallback
    let moduleDir = null;
    let manifest = null;
    let entryPath = null;

    if (moduleManifest) {
      manifest = moduleManifest;
      moduleDir = manifest._moduleRoot;
      entryPath = manifest._entryPath;
    } else {
      // Search in modules/ directory
      const path = require('node:path');
      const projectRoot = container.has('projectRoot') ? container.resolve('projectRoot') : process.cwd();
      const candidateDir = path.join(projectRoot, 'modules', moduleName);
      const loadResult = loadModule(candidateDir);
      if (!loadResult.ok) {
        throw new Error(`Module "${moduleName}" not found: ${loadResult.error.message}`);
      }
      manifest = loadResult.value.manifest;
      moduleDir = candidateDir;
      entryPath = loadResult.value.entryPath;
    }

    // Register templates if manifest has templates section
    if (manifest.templates && moduleDir) {
      await _templateRegistry.registerTemplates(manifest, moduleDir);
    }

    // Load module entry point if available
    let instance = null;
    if (entryPath) {
      try {
        const moduleEntry = require(entryPath);
        if (typeof moduleEntry.register === 'function') {
          instance = moduleEntry;
        }
      } catch (_e) {
        // Entry point load failure is non-fatal for enable
      }
    }

    return { status: 'enabled', module: moduleName, instance };
  }

  /**
   * Disables a module by cleaning up its templates and resources.
   *
   * For v1 single-module, clear all templates. Future multi-module
   * support would clear only the module's namespace.
   *
   * @param {string} moduleName - Name of the module to disable
   * @returns {Promise<{status: string, module: string}>}
   */
  async function disableModule(moduleName) {
    // Clear templates (v1 single-module: clear all)
    _templateRegistry.clear();

    // Shutdown module from Circuit registry if registered
    if (_modules.has(moduleName)) {
      shutdownModule(moduleName);
    }

    return { status: 'disabled', module: moduleName };
  }

  return createContract('circuit', CIRCUIT_SHAPE, {
    registerModule,
    shutdownModule,
    getService,
    getProvider,
    getModuleInfo,
    listModules,
    registerCommand,
    registerMcpTool,
    registerTemplates: (manifest, moduleRoot) => _templateRegistry.registerTemplates(manifest, moduleRoot),
    getTemplate: (name) => _templateRegistry.getTemplate(name),
    castTemplate: (name, context, options) => _templateRegistry.castTemplate(name, context, options),
    listTemplates: (namespace) => _templateRegistry.listTemplates(namespace),
    enableModule,
    disableModule,
  });
}

module.exports = { createCircuit, CIRCUIT_SHAPE };

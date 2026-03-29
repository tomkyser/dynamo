'use strict';

/**
 * Circuit template registry.
 *
 * Provides namespaced template registration, retrieval, and casting for modules.
 * Templates are parsed via Linotype (lib layer), validated against Armature
 * contracts (framework layer), and exposed through Circuit (SDK layer).
 *
 * Flow: module manifest -> registerTemplates() -> Linotype parse -> Armature validate -> registry store
 * Access: getTemplate(namespace:name) -> Matrix, castTemplate(namespace:name, context) -> Slug
 *
 * Layer: SDK (Circuit) -- consumes Armature contracts + Linotype lib.
 *
 * @module core/sdk/circuit/template-registry
 */

const fs = require('node:fs');
const path = require('node:path');
const linotype = require('../../../lib/linotype/linotype.cjs');
const contracts = require('../../armature/template-contracts.cjs');

/**
 * Creates a new template registry instance.
 *
 * Each registry maintains its own namespaced template store. In v1 with a
 * single module, one registry per Circuit instance is sufficient. For
 * multi-module support, namespacing prevents collisions.
 *
 * @returns {Object} Registry with registerTemplates, getTemplate, hasTemplate,
 *                    castTemplate, listTemplates, clear
 */
function createTemplateRegistry() {
  /**
   * Internal template store.
   * Key: namespaced name (e.g., 'reverie:face-prompt')
   * Value: Matrix object from Linotype parse
   * @type {Map<string, Object>}
   */
  const _templates = new Map();

  /**
   * Registers all templates from a module's template directory.
   *
   * Scans the directory for .md files, parses each via Linotype, validates
   * frontmatter against Armature contracts, validates structural integrity,
   * then stores under the module's namespace.
   *
   * After all templates are individually registered, performs a cross-registry
   * include resolution check: every {{> partial}} reference in every template
   * must resolve to a registered template.
   *
   * @param {Object} manifest - Module manifest with templates section.
   * @param {string} manifest.templates.directory - Relative path from moduleRoot to templates.
   * @param {string} manifest.templates.namespace - Namespace prefix for registered names.
   * @param {string} moduleRoot - Absolute path to the module's root directory.
   * @returns {Promise<number>} Number of templates registered.
   * @throws {Error} If a template fails validation or an include cannot resolve.
   */
  async function registerTemplates(manifest, moduleRoot) {
    if (!manifest || !manifest.templates) {
      return 0;
    }

    const { directory, namespace } = manifest.templates;
    if (!directory || !namespace) {
      return 0;
    }

    const templateDir = path.join(moduleRoot, directory);

    if (!fs.existsSync(templateDir)) {
      return 0;
    }

    const entries = fs.readdirSync(templateDir);
    const mdFiles = entries.filter(f => f.endsWith('.md'));

    let count = 0;

    for (const file of mdFiles) {
      const filePath = path.join(templateDir, file);

      // 1. Parse via Linotype
      const matrix = await linotype.parse(filePath);

      // 2. Validate frontmatter via Armature contract
      const contractResult = contracts.validateTemplateFrontmatter(matrix.raw_frontmatter);
      if (!contractResult.valid) {
        throw new Error(
          `Template contract violation in "${filePath}": ${contractResult.errors.join('; ')}`
        );
      }

      // 3. Run Linotype structural validation
      const issues = linotype.validate(matrix, { registry: _templates });
      if (issues.length > 0) {
        const issueList = issues.map(i => `${i.field}: ${i.issue}`).join('; ');
        throw new Error(
          `Template validation failed for "${filePath}": ${issueList}`
        );
      }

      // 4. Register under namespace
      const namespacedName = `${namespace}:${matrix.name}`;
      _templates.set(namespacedName, matrix);
      count++;
    }

    // 5. Cross-registry include resolution check
    for (const [namespacedName, matrix] of _templates) {
      if (matrix.includes && matrix.includes.length > 0) {
        for (const includeName of matrix.includes) {
          if (!_templates.has(includeName)) {
            throw new Error(
              `Unresolved include "${includeName}" in template "${namespacedName}"`
            );
          }
        }
      }
    }

    return count;
  }

  /**
   * Retrieves a template Matrix by its namespaced name.
   *
   * @param {string} namespacedName - e.g., 'reverie:face-prompt'
   * @returns {Object|null} Matrix object or null if not found.
   */
  function getTemplate(namespacedName) {
    return _templates.get(namespacedName) || null;
  }

  /**
   * Checks whether a template exists in the registry.
   *
   * @param {string} namespacedName - e.g., 'reverie:face-prompt'
   * @returns {boolean}
   */
  function hasTemplate(namespacedName) {
    return _templates.has(namespacedName);
  }

  /**
   * Casts a registered template against a context, producing a Slug.
   *
   * Builds a partials Map from all registered templates so that include
   * references ({{> partial}}) resolve during casting.
   *
   * @param {string} namespacedName - e.g., 'reverie:face-prompt'
   * @param {Object} context - Slot values object.
   * @param {Object} [options] - Additional cast options (passed through to Linotype).
   * @returns {Object} Frozen Slug object.
   * @throws {Error} If the template is not found in the registry.
   */
  function castTemplate(namespacedName, context, options) {
    const matrix = _templates.get(namespacedName);
    if (!matrix) {
      throw new Error(`Template "${namespacedName}" not found in registry`);
    }

    // Build partials Map from registry for include resolution
    const partials = new Map();
    for (const [name, tmpl] of _templates) {
      partials.set(name, tmpl.body);
    }

    return linotype.cast(matrix, context, { ...options, partials });
  }

  /**
   * Lists registered template names, optionally filtered by namespace.
   *
   * @param {string} [namespace] - If provided, only return names with this prefix.
   * @returns {string[]} Sorted array of namespaced template names.
   */
  function listTemplates(namespace) {
    let keys = [..._templates.keys()];
    if (namespace) {
      const prefix = `${namespace}:`;
      keys = keys.filter(k => k.startsWith(prefix));
    }
    return keys.sort();
  }

  /**
   * Clears all templates from the registry.
   * Used during module disable to clean up registered templates.
   */
  function clear() {
    _templates.clear();
  }

  return {
    registerTemplates,
    getTemplate,
    hasTemplate,
    castTemplate,
    listTemplates,
    clear,
  };
}

module.exports = { createTemplateRegistry };

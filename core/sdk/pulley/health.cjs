'use strict';

/**
 * Health aggregation and dependency chain analysis for the Dynamo platform.
 *
 * Iterates booted facades from the lifecycle to build a single diagnostic
 * report. Each facade that exposes a healthCheck() method is polled for its
 * current health status. The overall status is derived from individual results:
 *   - 'healthy'   — all services report healthy: true
 *   - 'degraded'  — at least one service reports healthy: false (without error)
 *   - 'unhealthy' — at least one healthCheck threw or returned an err Result
 *
 * Dependency chain analysis uses the container registry to identify transitively
 * impacted services when a dependency is down.
 *
 * Design decision (D-11): Lifecycle-driven aggregation. Health iterates facades
 * directly rather than introducing a dedicated health service. The lifecycle
 * already holds all facades in a Map — no reason to duplicate that collection.
 *
 * @module core/sdk/pulley/health
 */

/**
 * Aggregates health status from all booted facades.
 *
 * @param {Map<string, Object>} facades - Booted facades keyed by binding name (from lifecycle)
 * @param {Map<string, Object>|null} registry - Container registry for alias detection (optional)
 * @returns {{ overall: 'healthy'|'degraded'|'unhealthy', services: Object[], timestamp: string }}
 */
function aggregateHealth(facades, registry) {
  const results = [];
  let overall = 'healthy';

  // Build set of primary names (non-alias) from registry if available.
  // Aliases are stored in the facades Map under their alias key, but we only
  // want to report each service once under its primary binding name.
  const primaryNames = new Set();
  if (registry) {
    for (const name of registry.keys()) {
      primaryNames.add(name);
    }
  }

  for (const [name, facade] of facades.entries()) {
    // Skip alias entries: if we have a registry, only process names that are
    // primary keys in the registry (not alias keys that point to a primary).
    if (registry && !primaryNames.has(name)) {
      continue;
    }

    // Skip facades without healthCheck method
    if (typeof facade.healthCheck !== 'function') {
      continue;
    }

    try {
      const hcResult = facade.healthCheck();

      if (hcResult && hcResult.ok === true && hcResult.value) {
        // Successful healthCheck — push the full value (preserves extra fields)
        results.push(hcResult.value);
        if (!hcResult.value.healthy) {
          overall = 'degraded';
        }
      } else if (hcResult && hcResult.ok === false) {
        // healthCheck returned an err Result
        results.push({
          name: name || 'unknown',
          healthy: false,
          error: hcResult.error ? hcResult.error.message : 'Unknown error',
        });
        overall = 'unhealthy';
      }
    } catch (e) {
      // healthCheck threw an exception
      results.push({
        name: name || 'unknown',
        healthy: false,
        error: e.message,
      });
      overall = 'unhealthy';
    }
  }

  return {
    overall,
    services: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Analyzes dependency chains to find services transitively impacted by
 * unhealthy dependencies.
 *
 * Builds a reverse dependency map from the container registry, then performs
 * BFS from each unhealthy name to collect all transitively impacted services.
 *
 * @param {string[]} unhealthyNames - Array of unhealthy service/provider binding names
 * @param {Map<string, Object>} registry - Container registry with deps for each entry
 * @returns {{ impacted: string[], chains: Object }}
 */
function analyzeDependencyChain(unhealthyNames, registry) {
  if (!unhealthyNames || unhealthyNames.length === 0 || !registry) {
    return { impacted: [], chains: {} };
  }

  // Build reverse dependency map: dep -> [names that depend on it]
  const reverseDeps = new Map();
  for (const [name, entry] of registry.entries()) {
    const deps = entry.deps || [];
    for (const dep of deps) {
      if (!reverseDeps.has(dep)) {
        reverseDeps.set(dep, []);
      }
      reverseDeps.get(dep).push(name);
    }
  }

  const impactedSet = new Set();
  const chains = {};

  for (const unhealthyName of unhealthyNames) {
    const directDependants = reverseDeps.get(unhealthyName) || [];
    chains[unhealthyName] = [...directDependants];

    // BFS to find all transitively impacted
    const queue = [...directDependants];
    while (queue.length > 0) {
      const current = queue.shift();
      if (impactedSet.has(current)) {
        continue;
      }
      impactedSet.add(current);

      // Check if anything depends on the current impacted service
      const transitive = reverseDeps.get(current) || [];
      for (const t of transitive) {
        if (!impactedSet.has(t)) {
          queue.push(t);
        }
      }
    }
  }

  return {
    impacted: [...impactedSet],
    chains,
  };
}

/**
 * Formats a health report and optional dependency analysis into a
 * human-readable diagnostic string.
 *
 * @param {{ overall: string, timestamp: string, services: Object[] }} healthReport
 * @param {{ impacted: string[], chains: Object }|null} analysis - Dependency analysis (optional)
 * @returns {string} Formatted diagnostic string
 */
function formatDiagnostics(healthReport, analysis) {
  let output = 'Dynamo Health Report\n';
  output += `Overall: ${healthReport.overall.toUpperCase()}\n`;
  output += `Timestamp: ${healthReport.timestamp}\n\n`;
  output += 'Services:\n';

  for (const service of healthReport.services) {
    const status = service.healthy ? 'OK' : 'FAIL';
    const errorPart = service.error ? ` (${service.error})` : '';

    // Collect extra fields (anything beyond name, healthy, error)
    const extraKeys = Object.keys(service).filter(
      (k) => k !== 'name' && k !== 'healthy' && k !== 'error'
    );
    const extraPart = extraKeys.map((k) => `[${k}=${service[k]}]`).join(' ');

    output += `  ${service.name}: ${status}${errorPart}${extraPart ? ' ' + extraPart : ''}\n`;
  }

  if (analysis && analysis.impacted && analysis.impacted.length > 0) {
    output += '\nImpacted by dependency failures:\n';
    for (const name of analysis.impacted) {
      output += `  ${name}\n`;
    }
  }

  return output;
}

module.exports = { aggregateHealth, analyzeDependencyChain, formatDiagnostics };

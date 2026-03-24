'use strict';

const { describe, it, expect } = require('bun:test');
const { ok, err } = require('../../../../lib/result.cjs');

/**
 * Helper: builds a facades Map from an object of { name: facade }.
 */
function buildFacades(obj) {
  return new Map(Object.entries(obj));
}

/**
 * Helper: builds a registry Map mimicking the container's getRegistry() output.
 * Each entry: { deps: string[], tags: string[], aliases: string[] }
 */
function buildRegistry(entries) {
  const map = new Map();
  for (const [name, entry] of Object.entries(entries)) {
    map.set(name, {
      deps: entry.deps || [],
      tags: entry.tags || [],
      aliases: entry.aliases || [],
    });
  }
  return map;
}

describe('aggregateHealth', () => {
  const { aggregateHealth } = require('../health.cjs');

  it('returns healthy when all facades are healthy', () => {
    const facades = buildFacades({
      'services.switchboard': {
        healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
      },
      'services.forge': {
        healthCheck: () => ok({ healthy: true, name: 'forge' }),
      },
    });

    const result = aggregateHealth(facades, null);
    expect(result.overall).toBe('healthy');
    expect(result.services).toHaveLength(2);
    expect(result.timestamp).toBeTruthy();
    expect(result.services.every((s) => s.healthy === true)).toBe(true);
  });

  it('returns degraded when one facade is unhealthy', () => {
    const facades = buildFacades({
      'services.switchboard': {
        healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
      },
      'services.forge': {
        healthCheck: () => ok({ healthy: false, name: 'forge', reason: 'git not found' }),
      },
    });

    const result = aggregateHealth(facades, null);
    expect(result.overall).toBe('degraded');
    expect(result.services).toHaveLength(2);
  });

  it('returns unhealthy when healthCheck throws', () => {
    const facades = buildFacades({
      'services.switchboard': {
        healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
      },
      'services.forge': {
        healthCheck: () => {
          throw new Error('Unexpected failure');
        },
      },
    });

    const result = aggregateHealth(facades, null);
    expect(result.overall).toBe('unhealthy');
    const forgeEntry = result.services.find((s) => s.name === 'forge' || s.name === 'services.forge');
    expect(forgeEntry).toBeTruthy();
    expect(forgeEntry.healthy).toBe(false);
    expect(forgeEntry.error).toContain('Unexpected failure');
  });

  it('preserves extra fields from healthCheck (e.g., gitAvailable, dockerAvailable)', () => {
    const facades = buildFacades({
      'services.forge': {
        healthCheck: () =>
          ok({ healthy: true, name: 'forge', gitAvailable: true, gitVersion: '2.43.0' }),
      },
      'services.conductor': {
        healthCheck: () => ok({ healthy: true, name: 'conductor', dockerAvailable: false }),
      },
    });

    const result = aggregateHealth(facades, null);
    expect(result.overall).toBe('healthy');
    const forge = result.services.find((s) => s.name === 'forge');
    expect(forge.gitAvailable).toBe(true);
    expect(forge.gitVersion).toBe('2.43.0');
    const conductor = result.services.find((s) => s.name === 'conductor');
    expect(conductor.dockerAvailable).toBe(false);
  });

  it('skips facades without healthCheck method', () => {
    const facades = buildFacades({
      'services.switchboard': {
        healthCheck: () => ok({ healthy: true, name: 'switchboard' }),
      },
      'services.nohealth': {
        doSomething: () => 'ok',
      },
    });

    const result = aggregateHealth(facades, null);
    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('switchboard');
  });

  it('skips alias entries when registry is provided', () => {
    const registry = buildRegistry({
      'providers.ledger': { deps: [], aliases: ['providers.data.sql'] },
    });

    const facades = buildFacades({
      'providers.ledger': {
        healthCheck: () => ok({ healthy: true, name: 'ledger' }),
      },
      'providers.data.sql': {
        healthCheck: () => ok({ healthy: true, name: 'ledger' }),
      },
    });

    const result = aggregateHealth(facades, registry);
    // Should only include the primary entry, not the alias
    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe('ledger');
  });

  it('handles err results from healthCheck', () => {
    const facades = buildFacades({
      'services.forge': {
        healthCheck: () => err('HC_FAILED', 'health check failed'),
      },
    });

    const result = aggregateHealth(facades, null);
    expect(result.overall).toBe('unhealthy');
    expect(result.services).toHaveLength(1);
    expect(result.services[0].healthy).toBe(false);
    expect(result.services[0].error).toBe('health check failed');
  });
});

describe('analyzeDependencyChain', () => {
  const { analyzeDependencyChain } = require('../health.cjs');

  it('returns services that depend on an unhealthy service', () => {
    const registry = buildRegistry({
      'providers.ledger': { deps: [] },
      'services.assay': { deps: ['providers.ledger'] },
      'services.forge': { deps: [] },
    });

    const result = analyzeDependencyChain(['providers.ledger'], registry);
    expect(result.impacted).toContain('services.assay');
    expect(result.impacted).not.toContain('services.forge');
  });

  it('returns empty impacted list when no unhealthy names provided', () => {
    const registry = buildRegistry({
      'services.forge': { deps: [] },
    });

    const result = analyzeDependencyChain([], registry);
    expect(result.impacted).toHaveLength(0);
  });

  it('returns full chain for transitive dependencies', () => {
    const registry = buildRegistry({
      'providers.ledger': { deps: [] },
      'services.assay': { deps: ['providers.ledger'] },
      'services.search-ui': { deps: ['services.assay'] },
      'services.forge': { deps: [] },
    });

    const result = analyzeDependencyChain(['providers.ledger'], registry);
    expect(result.impacted).toContain('services.assay');
    expect(result.impacted).toContain('services.search-ui');
    expect(result.impacted).not.toContain('services.forge');
    expect(result.impacted).not.toContain('providers.ledger');
  });

  it('provides chain details per unhealthy service', () => {
    const registry = buildRegistry({
      'providers.ledger': { deps: [] },
      'services.assay': { deps: ['providers.ledger'] },
    });

    const result = analyzeDependencyChain(['providers.ledger'], registry);
    expect(result.chains).toBeTruthy();
    expect(result.chains['providers.ledger']).toContain('services.assay');
  });
});

describe('formatDiagnostics', () => {
  const { formatDiagnostics } = require('../health.cjs');

  it('renders human-readable diagnostic string', () => {
    const healthReport = {
      overall: 'healthy',
      timestamp: '2026-03-23T12:00:00.000Z',
      services: [
        { name: 'switchboard', healthy: true },
        { name: 'forge', healthy: true, gitAvailable: true },
      ],
    };

    const output = formatDiagnostics(healthReport, null);
    expect(output).toContain('Dynamo Health Report');
    expect(output).toContain('Overall: HEALTHY');
    expect(output).toContain('Timestamp: 2026-03-23T12:00:00.000Z');
    expect(output).toContain('switchboard: OK');
    expect(output).toContain('forge: OK');
    expect(output).toContain('[gitAvailable=true]');
  });

  it('renders FAIL entries with error messages', () => {
    const healthReport = {
      overall: 'unhealthy',
      timestamp: '2026-03-23T12:00:00.000Z',
      services: [
        { name: 'forge', healthy: false, error: 'git not found' },
      ],
    };

    const output = formatDiagnostics(healthReport, null);
    expect(output).toContain('Overall: UNHEALTHY');
    expect(output).toContain('forge: FAIL (git not found)');
  });

  it('includes impacted services section when analysis has impacted entries', () => {
    const healthReport = {
      overall: 'degraded',
      timestamp: '2026-03-23T12:00:00.000Z',
      services: [
        { name: 'ledger', healthy: false, error: 'connection failed' },
      ],
    };
    const analysis = {
      impacted: ['services.assay', 'services.search-ui'],
      chains: { 'providers.ledger': ['services.assay'] },
    };

    const output = formatDiagnostics(healthReport, analysis);
    expect(output).toContain('Impacted by dependency failures');
    expect(output).toContain('services.assay');
    expect(output).toContain('services.search-ui');
  });

  it('omits impacted section when no analysis or empty impacted', () => {
    const healthReport = {
      overall: 'healthy',
      timestamp: '2026-03-23T12:00:00.000Z',
      services: [{ name: 'forge', healthy: true }],
    };

    const output = formatDiagnostics(healthReport, { impacted: [], chains: {} });
    expect(output).not.toContain('Impacted by dependency failures');
  });
});

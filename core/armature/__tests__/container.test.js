'use strict';

const { describe, it, expect } = require('bun:test');
const { createContainer } = require('../container.cjs');

describe('IoC Container', () => {
  describe('bind and resolve', () => {
    it('binds a factory and resolves it by name', () => {
      const container = createContainer();
      container.bind('logger', () => ({ log: () => {} }));
      const result = container.resolve('logger');
      expect(result.ok).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value.log).toBe('function');
    });

    it('returns Err with BINDING_NOT_FOUND for unknown name', () => {
      const container = createContainer();
      const result = container.resolve('unknown');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('BINDING_NOT_FOUND');
    });

    it('returns Err with BINDING_EXISTS when binding duplicate name', () => {
      const container = createContainer();
      container.bind('logger', () => ({}));
      const result = container.bind('logger', () => ({}));
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('BINDING_EXISTS');
    });
  });

  describe('singleton lifetime', () => {
    it('returns the same instance on repeated resolve calls', () => {
      const container = createContainer();
      container.singleton('counter', () => ({ count: 0 }));
      const first = container.resolve('counter');
      const second = container.resolve('counter');
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      expect(first.value).toBe(second.value); // same reference
    });

    it('defers singleton creation until first resolve (lazy)', () => {
      let factoryCalled = false;
      const container = createContainer();
      container.singleton('lazy', () => {
        factoryCalled = true;
        return { ready: true };
      });
      expect(factoryCalled).toBe(false); // NOT created yet
      const result = container.resolve('lazy');
      expect(factoryCalled).toBe(true); // created now
      expect(result.ok).toBe(true);
      expect(result.value.ready).toBe(true);
    });
  });

  describe('factory lifetime', () => {
    it('returns a new instance on each resolve call', () => {
      const container = createContainer();
      container.factory('config', () => ({ timestamp: Date.now() }));
      const first = container.resolve('config');
      const second = container.resolve('config');
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      expect(first.value).not.toBe(second.value); // different references
    });
  });

  describe('tagged resolution', () => {
    it('resolves all bindings with a given tag', () => {
      const container = createContainer();
      container.bind('ledger', () => ({ name: 'ledger' }), { tags: ['sql', 'data'] });
      container.bind('journal', () => ({ name: 'journal' }), { tags: ['file', 'data'] });
      const dataBindings = container.resolveTagged('data');
      expect(dataBindings).toHaveLength(2);
      expect(dataBindings.map(b => b.name)).toContain('ledger');
      expect(dataBindings.map(b => b.name)).toContain('journal');
    });

    it('returns empty array for nonexistent tag', () => {
      const container = createContainer();
      container.bind('ledger', () => ({}), { tags: ['sql'] });
      const result = container.resolveTagged('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('alias resolution', () => {
    it('resolves alias to primary binding', () => {
      const container = createContainer();
      container.bind('ledger', () => ({ name: 'ledger' }), {
        aliases: ['providers.data.sql'],
      });
      const result = container.resolve('providers.data.sql');
      expect(result.ok).toBe(true);
      expect(result.value.name).toBe('ledger');
    });

    it('has() returns true for aliases', () => {
      const container = createContainer();
      container.bind('ledger', () => ({}), { aliases: ['providers.data.sql'] });
      expect(container.has('providers.data.sql')).toBe(true);
      expect(container.has('nonexistent')).toBe(false);
    });
  });

  describe('has()', () => {
    it('returns true for registered names', () => {
      const container = createContainer();
      container.bind('logger', () => ({}));
      expect(container.has('logger')).toBe(true);
    });

    it('returns false for unregistered names', () => {
      const container = createContainer();
      expect(container.has('unknown')).toBe(false);
    });
  });

  describe('getMetadata()', () => {
    it('returns metadata for registered binding', () => {
      const container = createContainer();
      container.bind('ledger', () => ({}), {
        deps: ['switchboard'],
        tags: ['sql'],
        aliases: ['providers.data.sql'],
        lifetime: 'factory',
      });
      const meta = container.getMetadata('ledger');
      expect(meta).not.toBeNull();
      expect(meta.deps).toEqual(['switchboard']);
      expect(meta.tags).toEqual(['sql']);
      expect(meta.aliases).toEqual(['providers.data.sql']);
      expect(meta.lifetime).toBe('factory');
    });

    it('returns null for unregistered binding', () => {
      const container = createContainer();
      expect(container.getMetadata('unknown')).toBeNull();
    });
  });

  describe('getBootOrder() - topological sort', () => {
    it('returns correct boot order for a dependency chain', () => {
      const container = createContainer();
      container.bind('switchboard', () => ({}), { deps: [] });
      container.bind('magnet', () => ({}), { deps: ['switchboard'] });
      container.bind('forge', () => ({}), { deps: ['switchboard', 'magnet'] });
      const result = container.getBootOrder();
      expect(result.ok).toBe(true);
      const order = result.value;
      expect(order.indexOf('switchboard')).toBeLessThan(order.indexOf('magnet'));
      expect(order.indexOf('magnet')).toBeLessThan(order.indexOf('forge'));
    });

    it('detects circular dependencies and returns Err with CYCLE_DETECTED', () => {
      const container = createContainer();
      container.bind('a', () => ({}), { deps: ['b'] });
      container.bind('b', () => ({}), { deps: ['a'] });
      const result = container.getBootOrder();
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('CYCLE_DETECTED');
      expect(result.error.context.cycle).toBeDefined();
      expect(result.error.context.cycle).toContain('a');
      expect(result.error.context.cycle).toContain('b');
    });

    it('returns ok with ordered array when no cycles exist', () => {
      const container = createContainer();
      container.bind('a', () => ({}));
      container.bind('b', () => ({}));
      const result = container.getBootOrder();
      expect(result.ok).toBe(true);
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(2);
    });
  });

  describe('mapDeps option', () => {
    it('maps container keys to options keys during resolution', () => {
      const container = createContainer();
      container.bind('switchboard', () => ({ name: 'switchboard-instance' }));
      container.bind('magnet', (opts) => ({ switchboard: opts.switchboard }), {
        deps: ['switchboard'],
        mapDeps: { switchboard: 'switchboard' },
      });
      const result = container.resolve('magnet');
      expect(result.ok).toBe(true);
      expect(result.value.switchboard).toBeDefined();
      expect(result.value.switchboard.name).toBe('switchboard-instance');
    });
  });

  describe('config option', () => {
    it('merges config values into options during resolution', () => {
      const container = createContainer();
      container.bind('forge', (opts) => ({ repoPath: opts.repoPath }), {
        config: { repoPath: '/dev/dynamo' },
      });
      const result = container.resolve('forge');
      expect(result.ok).toBe(true);
      expect(result.value.repoPath).toBe('/dev/dynamo');
    });
  });

  describe('INSTANTIATION_FAILED', () => {
    it('returns Err when factory throws an error', () => {
      const container = createContainer();
      container.bind('broken', () => {
        throw new Error('Factory explosion');
      });
      const result = container.resolve('broken');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INSTANTIATION_FAILED');
    });

    it('returns Err when factory returns an Err Result', () => {
      const container = createContainer();
      const { err } = require('../../../lib/result.cjs');
      container.bind('broken', () => err('INIT_FAILED', 'Could not init'));
      const result = container.resolve('broken');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('INSTANTIATION_FAILED');
    });
  });

  describe('getRegistry()', () => {
    it('returns the internal registry Map', () => {
      const container = createContainer();
      container.bind('a', () => ({}));
      container.bind('b', () => ({}));
      const registry = container.getRegistry();
      expect(registry instanceof Map).toBe(true);
      expect(registry.size).toBe(2);
      expect(registry.has('a')).toBe(true);
      expect(registry.has('b')).toBe(true);
    });
  });
});

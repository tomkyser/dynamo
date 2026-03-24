'use strict';

const { describe, it, expect } = require('bun:test');
const { createFacade } = require('../facade.cjs');
const { ok, err, isOk, isErr } = require('../../../lib/result.cjs');

describe('createFacade', () => {
  /**
   * Helper: creates a frozen contract with common test methods.
   */
  function makeContract() {
    return Object.freeze({
      query: (sql) => ok({ rows: [sql] }),
      write: (data) => ok({ written: data }),
      version: '1.0',
    });
  }

  describe('delegation', () => {
    it('delegates method calls to the underlying contract', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ rows: ['SELECT 1'] });
    });

    it('delegates all contract methods', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const result = facade.write({ key: 'val' });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ written: { key: 'val' } });
    });

    it('copies non-function properties as-is', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      expect(facade.version).toBe('1.0');
    });
  });

  describe('metadata', () => {
    it('exposes meta with name', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      expect(facade.meta.name).toBe('ledger');
    });

    it('exposes meta with tags and aliases', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract, {
        tags: ['sql', 'data'],
        aliases: ['providers.data.sql'],
      });

      expect(facade.meta.tags).toEqual(['sql', 'data']);
      expect(facade.meta.aliases).toEqual(['providers.data.sql']);
    });

    it('meta is frozen', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract, { tags: ['sql'] });

      expect(() => { facade.meta.name = 'hacked'; }).toThrow();
    });
  });

  describe('before hooks', () => {
    it('before hook can modify args', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.hook('query', 'before', (args) => {
        return [args[0].toUpperCase()];
      });

      const result = facade.query('select 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ rows: ['SELECT 1'] });
    });

    it('before hook returning Err halts execution', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.hook('query', 'before', () => {
        return err('BLOCKED', 'Blocked by hook');
      });

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('BLOCKED');
    });

    it('before hook receives (args, facadeName, methodName)', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);
      let captured = {};

      facade.hook('query', 'before', (args, facadeName, methodName) => {
        captured = { args, facadeName, methodName };
      });

      facade.query('test');
      expect(captured.args).toEqual(['test']);
      expect(captured.facadeName).toBe('ledger');
      expect(captured.methodName).toBe('query');
    });

    it('multiple before hooks execute in order', () => {
      const calls = [];
      const contract = Object.freeze({
        action: () => ok('done'),
      });
      const facade = createFacade('svc', contract);

      facade.hook('action', 'before', () => { calls.push('first'); });
      facade.hook('action', 'before', () => { calls.push('second'); });

      facade.action();
      expect(calls).toEqual(['first', 'second']);
    });
  });

  describe('after hooks', () => {
    it('after hook can modify return value', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.hook('query', 'after', (result) => {
        return ok({ ...result.value, enriched: true });
      });

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value.enriched).toBe(true);
    });

    it('after hook receives (result, args, facadeName, methodName)', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);
      let captured = {};

      facade.hook('query', 'after', (result, args, facadeName, methodName) => {
        captured = { result, args, facadeName, methodName };
      });

      facade.query('test');
      expect(captured.args).toEqual(['test']);
      expect(captured.facadeName).toBe('ledger');
      expect(captured.methodName).toBe('query');
      expect(captured.result.ok).toBe(true);
    });

    it('after hook returning undefined does not replace result', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.hook('query', 'after', () => {
        // return nothing
      });

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ rows: ['SELECT 1'] });
    });
  });

  describe('around hooks', () => {
    it('around hook wraps the call', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);
      let aroundCalled = false;

      facade.hook('query', 'around', (next, args) => {
        aroundCalled = true;
        return next(args);
      });

      const result = facade.query('SELECT 1');
      expect(aroundCalled).toBe(true);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ rows: ['SELECT 1'] });
    });

    it('around hook can modify args before passing to next', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.hook('query', 'around', (next, args) => {
        return next([args[0].toUpperCase()]);
      });

      const result = facade.query('select 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ rows: ['SELECT 1'] });
    });

    it('around hook can short-circuit without calling next', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.hook('query', 'around', () => {
        return ok({ cached: true });
      });

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ cached: true });
    });

    it('multiple around hooks chain correctly', () => {
      const calls = [];
      const contract = Object.freeze({
        action: () => { calls.push('impl'); return ok('done'); },
      });
      const facade = createFacade('svc', contract);

      facade.hook('action', 'around', (next, args) => {
        calls.push('outer-before');
        const result = next(args);
        calls.push('outer-after');
        return result;
      });

      facade.hook('action', 'around', (next, args) => {
        calls.push('inner-before');
        const result = next(args);
        calls.push('inner-after');
        return result;
      });

      facade.action();
      expect(calls).toEqual(['outer-before', 'inner-before', 'impl', 'inner-after', 'outer-after']);
    });
  });

  describe('override', () => {
    it('override swaps implementation for a method', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const overrideResult = facade.override('query', (sql) => ok({ custom: sql }));
      expect(overrideResult.ok).toBe(true);

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ custom: 'SELECT 1' });
    });

    it('override on nonexistent method returns FACADE_INVALID_METHOD', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const result = facade.override('nonexistent', () => {});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('FACADE_INVALID_METHOD');
    });

    it('override on non-function property returns FACADE_INVALID_METHOD', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const result = facade.override('version', () => '2.0');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('FACADE_INVALID_METHOD');
    });
  });

  describe('hook registration', () => {
    it('hook returns ok on valid registration', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const result = facade.hook('query', 'before', () => {});
      expect(result.ok).toBe(true);
    });

    it('hook returns FACADE_INVALID_POSITION for invalid position', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      const result = facade.hook('query', 'invalid', () => {});
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('FACADE_INVALID_POSITION');
    });
  });

  describe('freezing', () => {
    it('facade is frozen', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      expect(Object.isFrozen(facade)).toBe(true);
    });

    it('cannot add new properties to facade', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      expect(() => { facade.newProp = 'value'; }).toThrow();
    });
  });

  describe('combined hooks and override', () => {
    it('before hooks work with overridden implementation', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.override('query', (sql) => ok({ custom: sql }));
      facade.hook('query', 'before', (args) => {
        return [args[0] + ' -- modified'];
      });

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ custom: 'SELECT 1 -- modified' });
    });

    it('after hooks work with overridden implementation', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.override('query', (sql) => ok({ custom: sql }));
      facade.hook('query', 'after', (result) => {
        return ok({ ...result.value, afterHook: true });
      });

      const result = facade.query('SELECT 1');
      expect(result.ok).toBe(true);
      expect(result.value.afterHook).toBe(true);
    });

    it('around hooks work with overridden implementation', () => {
      const contract = makeContract();
      const facade = createFacade('ledger', contract);

      facade.override('query', (sql) => ok({ custom: sql }));
      let passedThrough = false;

      facade.hook('query', 'around', (next, args) => {
        passedThrough = true;
        return next(args);
      });

      const result = facade.query('SELECT 1');
      expect(passedThrough).toBe(true);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ custom: 'SELECT 1' });
    });
  });
});

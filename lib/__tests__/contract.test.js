'use strict';

const { describe, it, expect } = require('bun:test');
const { createContract } = require('../contract.cjs');

describe('Contract validation', () => {
  const noop = () => {};

  describe('valid contracts', () => {
    it('returns Ok with frozen object when all required methods present', () => {
      const result = createContract('svc', { required: ['start', 'stop'] }, { start: noop, stop: noop });
      expect(result.ok).toBe(true);
      expect(typeof result.value.start).toBe('function');
      expect(typeof result.value.stop).toBe('function');
    });

    it('returns Ok when optional methods are not provided', () => {
      const result = createContract('svc', { required: ['start'], optional: ['reset'] }, { start: noop });
      expect(result.ok).toBe(true);
      expect(typeof result.value.start).toBe('function');
    });

    it('returns Ok with both required and optional methods when provided', () => {
      const result = createContract('svc', { required: ['start'], optional: ['reset'] }, { start: noop, reset: noop });
      expect(result.ok).toBe(true);
      expect(typeof result.value.start).toBe('function');
      expect(typeof result.value.reset).toBe('function');
    });

    it('returns Ok with frozen empty object when no required methods', () => {
      const result = createContract('svc', { required: [] }, {});
      expect(result.ok).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('frozen instances', () => {
    it('returned Ok value is frozen (Object.isFrozen returns true)', () => {
      const result = createContract('svc', { required: ['start', 'stop'] }, { start: noop, stop: noop });
      expect(result.ok).toBe(true);
      expect(Object.isFrozen(result.value)).toBe(true);
    });

    it('frozen instance cannot be modified', () => {
      const result = createContract('svc', { required: ['run'] }, { run: noop });
      expect(result.ok).toBe(true);
      expect(() => {
        result.value.run = 'overwritten';
      }).toThrow();
    });
  });

  describe('invalid contracts', () => {
    it('returns Err with CONTRACT_MISSING_METHOD when a required method is missing', () => {
      const result = createContract('svc', { required: ['start', 'stop'] }, { start: noop });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('CONTRACT_MISSING_METHOD');
      expect(result.error.context.contract).toBe('svc');
      expect(result.error.context.method).toBe('stop');
    });

    it('returns Err when required method is not a function', () => {
      const result = createContract('svc', { required: ['run'] }, { run: 'not a function' });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('CONTRACT_MISSING_METHOD');
    });

    it('includes contract name in error message for debugging', () => {
      const result = createContract('myService', { required: ['init'] }, {});
      expect(result.ok).toBe(false);
      expect(result.error.message).toContain('myService');
    });
  });
});

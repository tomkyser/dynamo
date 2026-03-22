'use strict';

const { describe, it, expect } = require('bun:test');
const { validate } = require('../schema.cjs');

describe('Schema validator', () => {
  describe('type checking', () => {
    it('validates string type', () => {
      const result = validate({ name: 'foo' }, { name: { type: 'string', required: true } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ name: 'foo' });
    });

    it('validates number type', () => {
      const result = validate({ count: 5 }, { count: { type: 'number', required: true } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ count: 5 });
    });

    it('validates boolean type', () => {
      const result = validate({ flag: true }, { flag: { type: 'boolean', required: true } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ flag: true });
    });

    it('validates array type', () => {
      const result = validate({ tags: ['a'] }, { tags: { type: 'array', required: true } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ tags: ['a'] });
    });

    it('rejects wrong type (number expected, string given)', () => {
      const result = validate({ count: 'abc' }, { count: { type: 'number', required: true } });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
      const errors = result.error.context.errors;
      expect(errors).toHaveLength(1);
      expect(errors[0].key).toBe('count');
      expect(errors[0].code).toBe('TYPE_MISMATCH');
    });

    it('rejects non-array when array expected', () => {
      const result = validate({ tags: 'not-array' }, { tags: { type: 'array', required: true } });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
      const errors = result.error.context.errors;
      expect(errors[0].code).toBe('TYPE_MISMATCH');
    });
  });

  describe('required fields', () => {
    it('returns Err when required field is missing', () => {
      const result = validate({}, { name: { type: 'string', required: true } });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA_VALIDATION_FAILED');
      const errors = result.error.context.errors;
      expect(errors).toHaveLength(1);
      expect(errors[0].key).toBe('name');
      expect(errors[0].code).toBe('REQUIRED');
    });

    it('succeeds when optional field is missing', () => {
      const result = validate({}, { name: { type: 'string' } });
      expect(result.ok).toBe(true);
    });
  });

  describe('defaults', () => {
    it('applies default value when field is missing', () => {
      const result = validate({}, { port: { type: 'number', default: 3000 } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ port: 3000 });
    });

    it('does not apply default when field is present', () => {
      const result = validate({ port: 8080 }, { port: { type: 'number', default: 3000 } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ port: 8080 });
    });
  });

  describe('nested objects', () => {
    it('validates nested object properties', () => {
      const result = validate(
        { db: { host: 'localhost' } },
        { db: { type: 'object', properties: { host: { type: 'string', required: true } } } }
      );
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ db: { host: 'localhost' } });
    });

    it('returns Err with nested key path for nested type mismatch', () => {
      const result = validate(
        { db: { host: 123 } },
        { db: { type: 'object', properties: { host: { type: 'string', required: true } } } }
      );
      expect(result.ok).toBe(false);
      const errors = result.error.context.errors;
      expect(errors.some(e => e.key === 'db.host')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns Err with SCHEMA_INVALID_ROOT for null value', () => {
      const result = validate(null, { x: { type: 'string' } });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA_INVALID_ROOT');
    });

    it('returns Err with SCHEMA_INVALID_ROOT for string value', () => {
      const result = validate('string', { x: { type: 'string' } });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('SCHEMA_INVALID_ROOT');
    });

    it('strips extra keys not in schema', () => {
      const result = validate({ a: 1, b: 2 }, { a: { type: 'number', required: true } });
      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ a: 1 });
      expect(result.value.b).toBeUndefined();
    });
  });

  describe('error accumulation', () => {
    it('accumulates multiple validation errors (not fail-on-first)', () => {
      const result = validate(
        {},
        {
          a: { type: 'string', required: true },
          b: { type: 'number', required: true },
        }
      );
      expect(result.ok).toBe(false);
      expect(result.error.context.errors).toHaveLength(2);
    });
  });
});

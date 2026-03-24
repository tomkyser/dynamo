'use strict';

const { describe, it, expect } = require('bun:test');
const { ok, err, isOk, isErr, unwrap } = require('../result.cjs');

describe('Result types', () => {
  describe('ok()', () => {
    it('creates Ok result with a value', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('creates Ok result with null (null is a valid value)', () => {
      const result = ok(null);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(null);
    });

    it('creates Ok result with undefined', () => {
      const result = ok(undefined);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(undefined);
    });
  });

  describe('err()', () => {
    it('creates Err result with code and message', () => {
      const result = err('NOT_FOUND', 'Item not found');
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Item not found');
      expect(result.error.context).toBeUndefined();
    });

    it('creates Err result with code, message, and context', () => {
      const result = err('PARSE_ERROR', 'Bad input', { input: 'abc' });
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('PARSE_ERROR');
      expect(result.error.message).toBe('Bad input');
      expect(result.error.context).toEqual({ input: 'abc' });
    });
  });

  describe('Result discrimination', () => {
    it('ok result has ok === true and value exists', () => {
      const result = ok('hello');
      if (result.ok === true) {
        expect(result.value).toBe('hello');
      } else {
        throw new Error('Expected ok result');
      }
    });

    it('err result has ok === false and error exists with code and message', () => {
      const result = err('FAIL', 'failure');
      if (result.ok === false) {
        expect(result.error.code).toBe('FAIL');
        expect(result.error.message).toBe('failure');
      } else {
        throw new Error('Expected err result');
      }
    });
  });

  describe('isOk()', () => {
    it('returns true for ok result', () => {
      expect(isOk(ok(1))).toBe(true);
    });

    it('returns false for err result', () => {
      expect(isOk(err('X', 'x'))).toBe(false);
    });
  });

  describe('isErr()', () => {
    it('returns true for err result', () => {
      expect(isErr(err('X', 'x'))).toBe(true);
    });

    it('returns false for ok result', () => {
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe('unwrap()', () => {
    it('returns value for ok result', () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it('throws Error with code in message for err result', () => {
      expect(() => unwrap(err('X', 'x'))).toThrow();
      try {
        unwrap(err('MY_CODE', 'my message'));
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toContain('MY_CODE');
      }
    });
  });
});

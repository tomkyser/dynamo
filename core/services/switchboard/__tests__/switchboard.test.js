'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { createSwitchboard } = require('../switchboard.cjs');
const { isOk, isErr, unwrap } = require('../../../../lib/index.cjs');

describe('Switchboard', () => {
  let sb;

  beforeEach(() => {
    const result = createSwitchboard();
    expect(isOk(result)).toBe(true);
    sb = unwrap(result);
    sb.init({});
    sb.start();
  });

  describe('contract validation', () => {
    it('createSwitchboard() returns Ok with frozen object containing all required methods', () => {
      const result = createSwitchboard();
      expect(isOk(result)).toBe(true);
      const instance = unwrap(result);
      expect(Object.isFrozen(instance)).toBe(true);
      expect(typeof instance.on).toBe('function');
      expect(typeof instance.off).toBe('function');
      expect(typeof instance.emit).toBe('function');
      expect(typeof instance.filter).toBe('function');
      expect(typeof instance.init).toBe('function');
      expect(typeof instance.start).toBe('function');
      expect(typeof instance.stop).toBe('function');
      expect(typeof instance.healthCheck).toBe('function');
    });
  });

  describe('action dispatch', () => {
    it('emit delivers payload to handler registered via on()', () => {
      const received = [];
      sb.on('test:action', (payload) => received.push(payload));
      sb.emit('test:action', { data: 42 });
      expect(received).toEqual([{ data: 42 }]);
    });

    it('multiple handlers on same action event all fire in registration order', () => {
      const order = [];
      sb.on('test:action', () => order.push('first'));
      sb.on('test:action', () => order.push('second'));
      sb.on('test:action', () => order.push('third'));
      sb.emit('test:action', {});
      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('emit returns undefined for actions (fire-and-forget)', () => {
      sb.on('test:action', () => {});
      const result = sb.emit('test:action', {});
      expect(result).toBeUndefined();
    });
  });

  describe('filter pipeline', () => {
    it('filter delivers payload to handler registered with type filter', () => {
      const received = [];
      sb.on('test:filter', (payload) => {
        received.push(payload);
        return payload;
      }, { type: 'filter', priority: 100 });
      sb.filter('test:filter', { data: 'hello' });
      expect(received).toEqual([{ data: 'hello' }]);
    });

    it('filter handlers run in priority order -- priority 10 before 50 before 100', () => {
      const order = [];
      sb.on('test:filter', (payload) => { order.push('p50'); return payload; }, { type: 'filter', priority: 50 });
      sb.on('test:filter', (payload) => { order.push('p10'); return payload; }, { type: 'filter', priority: 10 });
      sb.on('test:filter', (payload) => { order.push('p100'); return payload; }, { type: 'filter', priority: 100 });
      sb.filter('test:filter', {});
      expect(order).toEqual(['p10', 'p50', 'p100']);
    });

    it('filter handlers with same priority run in registration order (FIFO)', () => {
      const order = [];
      sb.on('test:filter', (payload) => { order.push('first'); return payload; }, { type: 'filter', priority: 50 });
      sb.on('test:filter', (payload) => { order.push('second'); return payload; }, { type: 'filter', priority: 50 });
      sb.on('test:filter', (payload) => { order.push('third'); return payload; }, { type: 'filter', priority: 50 });
      sb.filter('test:filter', {});
      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('filter handler returning false halts the pipeline and filter() returns Err', () => {
      const order = [];
      sb.on('test:filter', () => { order.push('halter'); return false; }, { type: 'filter', priority: 10 });
      sb.on('test:filter', () => { order.push('never'); return true; }, { type: 'filter', priority: 50 });
      const result = sb.filter('test:filter', {});
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('FILTER_HALTED');
      expect(order).toEqual(['halter']);
    });

    it('filter handler returning err() halts the pipeline and filter() returns that Err', () => {
      const { err } = require('../../../../lib/index.cjs');
      const order = [];
      sb.on('test:filter', () => { order.push('err-handler'); return err('CUSTOM_ERROR', 'custom halt'); }, { type: 'filter', priority: 10 });
      sb.on('test:filter', () => { order.push('never'); return true; }, { type: 'filter', priority: 50 });
      const result = sb.filter('test:filter', {});
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('CUSTOM_ERROR');
      expect(result.error.message).toBe('custom halt');
      expect(order).toEqual(['err-handler']);
    });

    it('filter handler returning a transformed payload passes it to next handler', () => {
      sb.on('test:filter', (payload) => ({ ...payload, step1: true }), { type: 'filter', priority: 10 });
      sb.on('test:filter', (payload) => {
        expect(payload.step1).toBe(true);
        return { ...payload, step2: true };
      }, { type: 'filter', priority: 50 });
      const result = sb.filter('test:filter', { original: true });
      expect(isOk(result)).toBe(true);
      const final = unwrap(result);
      expect(final.original).toBe(true);
      expect(final.step1).toBe(true);
      expect(final.step2).toBe(true);
    });

    it('filter() returns Ok(finalPayload) when pipeline completes', () => {
      sb.on('test:filter', (payload) => ({ ...payload, processed: true }), { type: 'filter', priority: 100 });
      const result = sb.filter('test:filter', { input: 'data' });
      expect(isOk(result)).toBe(true);
      const final = unwrap(result);
      expect(final.input).toBe('data');
      expect(final.processed).toBe(true);
    });
  });

  describe('wildcard matching', () => {
    it('on("hook:*", handler) catches emit("hook:session-start") and emit("hook:stop")', () => {
      const received = [];
      sb.on('hook:*', (payload, eventName) => received.push(eventName));
      sb.emit('hook:session-start', {});
      sb.emit('hook:stop', {});
      expect(received).toEqual(['hook:session-start', 'hook:stop']);
    });

    it('on("hook:*", handler) does NOT catch emit("file:changed")', () => {
      const received = [];
      sb.on('hook:*', (payload, eventName) => received.push(eventName));
      sb.emit('file:changed', {});
      expect(received).toEqual([]);
    });

    it('wildcard handler receives the full event name and payload', () => {
      let capturedEvent = null;
      let capturedPayload = null;
      sb.on('hook:*', (payload, eventName) => {
        capturedPayload = payload;
        capturedEvent = eventName;
      });
      sb.emit('hook:session-start', { userId: 'abc' });
      expect(capturedEvent).toBe('hook:session-start');
      expect(capturedPayload).toEqual({ userId: 'abc' });
    });

    it('exact handlers and wildcard handlers both fire for matching events', () => {
      const fired = [];
      sb.on('hook:session-start', () => fired.push('exact'));
      sb.on('hook:*', () => fired.push('wildcard'));
      sb.emit('hook:session-start', {});
      expect(fired).toContain('exact');
      expect(fired).toContain('wildcard');
      expect(fired.length).toBe(2);
    });
  });

  describe('handler management', () => {
    it('on() returns a removal function; calling it removes the handler', () => {
      const received = [];
      const remove = sb.on('test:action', (payload) => received.push(payload));
      sb.emit('test:action', 'first');
      expect(received).toEqual(['first']);
      remove();
      sb.emit('test:action', 'second');
      expect(received).toEqual(['first']);
    });

    it('off(eventName, handler) removes the specific handler', () => {
      const received = [];
      const handler = (payload) => received.push(payload);
      sb.on('test:action', handler);
      sb.emit('test:action', 'first');
      expect(received).toEqual(['first']);
      sb.off('test:action', handler);
      sb.emit('test:action', 'second');
      expect(received).toEqual(['first']);
    });
  });

  describe('lifecycle', () => {
    it('healthCheck returns Ok({ healthy: true, name: "switchboard" }) after start()', () => {
      const result = sb.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('switchboard');
    });

    it('healthCheck returns Ok({ healthy: false, name: "switchboard" }) before start()', () => {
      const freshResult = createSwitchboard();
      const fresh = unwrap(freshResult);
      fresh.init({});
      // Do NOT call start()
      const result = fresh.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(false);
      expect(health.name).toBe('switchboard');
    });
  });
});

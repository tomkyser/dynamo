'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { createEventProxy } = require('../event-proxy.cjs');

describe('createEventProxy', () => {
  let mockSwitchboard;
  let proxy;

  beforeEach(() => {
    mockSwitchboard = {
      emit: (event, payload) => undefined,
      on: (event, handler) => ({ ok: true, value: undefined }),
      off: (event, handler) => ({ ok: true, value: undefined }),
      filter: (event, payload) => ({ ok: true, value: payload }),
    };
    proxy = createEventProxy('mymodule', mockSwitchboard);
  });

  it('emit namespaces module events', () => {
    const calls = [];
    mockSwitchboard.emit = (event, payload) => { calls.push({ event, payload }); };
    proxy = createEventProxy('mymodule', mockSwitchboard);

    proxy.emit('update', { x: 1 });
    expect(calls).toEqual([{ event: 'mymodule:update', payload: { x: 1 } }]);
  });

  it('on subscribes to namespaced module events', () => {
    const calls = [];
    mockSwitchboard.on = (event, handler) => { calls.push({ event, handler }); return { ok: true, value: undefined }; };
    proxy = createEventProxy('mymodule', mockSwitchboard);

    const handler = () => {};
    proxy.on('update', handler);
    expect(calls[0].event).toBe('mymodule:update');
    expect(calls[0].handler).toBe(handler);
  });

  it('on passes system hook events un-namespaced', () => {
    const calls = [];
    mockSwitchboard.on = (event, handler) => { calls.push({ event }); return { ok: true, value: undefined }; };
    proxy = createEventProxy('mymodule', mockSwitchboard);

    proxy.on('hook:SessionStart', () => {});
    expect(calls[0].event).toBe('hook:SessionStart');
  });

  it('on passes system state events un-namespaced', () => {
    const calls = [];
    mockSwitchboard.on = (event, handler) => { calls.push({ event }); return { ok: true, value: undefined }; };
    proxy = createEventProxy('mymodule', mockSwitchboard);

    proxy.on('state:changed', () => {});
    expect(calls[0].event).toBe('state:changed');
  });

  it('getSubscriptionCount returns correct count', () => {
    proxy.on('a', () => {});
    proxy.on('b', () => {});
    proxy.on('c', () => {});
    expect(proxy.getSubscriptionCount()).toBe(3);
  });

  it('cleanup calls switchboard.off for every subscription', () => {
    const offCalls = [];
    mockSwitchboard.off = (event, handler) => { offCalls.push({ event, handler }); return { ok: true, value: undefined }; };
    proxy = createEventProxy('mymodule', mockSwitchboard);

    const h1 = () => {};
    const h2 = () => {};
    proxy.on('update', h1);
    proxy.on('hook:SessionStart', h2);
    proxy.cleanup();

    expect(offCalls.length).toBe(2);
    expect(offCalls[0].event).toBe('mymodule:update');
    expect(offCalls[0].handler).toBe(h1);
    expect(offCalls[1].event).toBe('hook:SessionStart');
    expect(offCalls[1].handler).toBe(h2);
  });

  it('cleanup resets subscription count to 0', () => {
    proxy.on('a', () => {});
    proxy.on('b', () => {});
    expect(proxy.getSubscriptionCount()).toBe(2);
    proxy.cleanup();
    expect(proxy.getSubscriptionCount()).toBe(0);
  });

  it('filter delegates to switchboard.filter directly', () => {
    expect(proxy.filter).toBe(mockSwitchboard.filter);
  });
});

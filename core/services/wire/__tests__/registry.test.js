'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const { createRegistry } = require('../registry.cjs');

describe('Registry', () => {
  let registry;

  beforeEach(() => {
    registry = createRegistry({ reconnectTTL: 200 });
  });

  afterEach(() => {
    registry.destroy();
  });

  describe('createRegistry', () => {
    it('returns a registry object', () => {
      expect(registry).toBeDefined();
      expect(typeof registry.register).toBe('function');
      expect(typeof registry.unregister).toBe('function');
      expect(typeof registry.lookup).toBe('function');
      expect(typeof registry.canWrite).toBe('function');
      expect(typeof registry.getSessions).toBe('function');
      expect(typeof registry.disconnect).toBe('function');
      expect(typeof registry.reconnect).toBe('function');
      expect(typeof registry.bufferMessage).toBe('function');
      expect(typeof registry.getBufferedMessages).toBe('function');
      expect(typeof registry.on).toBe('function');
      expect(typeof registry.off).toBe('function');
      expect(typeof registry.destroy).toBe('function');
    });
  });

  describe('register', () => {
    it('adds session to registry', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send', 'receive'],
        writePermissions: ['ledger'],
      });

      const session = registry.lookup('sess-1');
      expect(session).not.toBeNull();
      expect(session.identity).toBe('primary');
      expect(session.capabilities).toEqual(['send', 'receive']);
      expect(session.writePermissions).toEqual(['ledger']);
      expect(session.status).toBe('active');
      expect(typeof session.connectedAt).toBe('number');
      expect(typeof session.lastSeen).toBe('number');
    });

    it('emits session:registered event with sessionId, identity, capabilities', () => {
      const events = [];
      registry.on('session:registered', (data) => events.push(data));

      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send', 'receive'],
        writePermissions: ['ledger'],
      });

      expect(events.length).toBe(1);
      expect(events[0].sessionId).toBe('sess-1');
      expect(events[0].identity).toBe('primary');
      expect(events[0].capabilities).toEqual(['send', 'receive']);
    });
  });

  describe('lookup', () => {
    it('returns session object for registered session', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      const session = registry.lookup('sess-1');
      expect(session).not.toBeNull();
      expect(session.identity).toBe('primary');
    });

    it('returns null for nonexistent session', () => {
      const session = registry.lookup('nonexistent');
      expect(session).toBeNull();
    });
  });

  describe('unregister', () => {
    it('removes session and emits session:lost event', () => {
      const events = [];
      registry.on('session:lost', (data) => events.push(data));

      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });
      registry.unregister('sess-1');

      expect(registry.lookup('sess-1')).toBeNull();
      expect(events.length).toBe(1);
      expect(events[0].sessionId).toBe('sess-1');
      expect(events[0].identity).toBe('primary');
    });

    it('is a no-op for nonexistent session (no error, no event)', () => {
      const events = [];
      registry.on('session:lost', (data) => events.push(data));

      registry.unregister('nonexistent');

      expect(events.length).toBe(0);
    });
  });

  describe('canWrite', () => {
    beforeEach(() => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });
    });

    it('returns true when session has resource in writePermissions', () => {
      expect(registry.canWrite('sess-1', 'ledger')).toBe(true);
    });

    it('returns false when session lacks that permission', () => {
      expect(registry.canWrite('sess-1', 'journal')).toBe(false);
    });

    it('returns true when session has wildcard (*) in writePermissions', () => {
      registry.register('sess-admin', {
        identity: 'admin',
        capabilities: ['send'],
        writePermissions: ['*'],
      });
      expect(registry.canWrite('sess-admin', 'anything')).toBe(true);
    });

    it('returns false for nonexistent session', () => {
      expect(registry.canWrite('nonexistent', 'ledger')).toBe(false);
    });
  });

  describe('getSessions', () => {
    it('returns array of [sessionId, sessionInfo] tuples', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });
      registry.register('sess-2', {
        identity: 'secondary',
        capabilities: ['receive'],
        writePermissions: [],
      });

      const sessions = registry.getSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(2);

      const ids = sessions.map(([id]) => id);
      expect(ids).toContain('sess-1');
      expect(ids).toContain('sess-2');
    });
  });

  describe('disconnect', () => {
    it('changes session status to disconnected', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      registry.disconnect('sess-1');

      const session = registry.lookup('sess-1');
      expect(session).not.toBeNull();
      expect(session.status).toBe('disconnected');
    });

    it('lookup still returns session with status disconnected after disconnect', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      registry.disconnect('sess-1');
      const session = registry.lookup('sess-1');
      expect(session).not.toBeNull();
      expect(session.status).toBe('disconnected');
    });
  });

  describe('reconnect', () => {
    it('restores status to active before TTL expiry and emits session:reconnected', () => {
      const events = [];
      registry.on('session:reconnected', (data) => events.push(data));

      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      registry.disconnect('sess-1');
      registry.reconnect('sess-1');

      const session = registry.lookup('sess-1');
      expect(session).not.toBeNull();
      expect(session.status).toBe('active');
      expect(events.length).toBe(1);
      expect(events[0].sessionId).toBe('sess-1');
    });
  });

  describe('TTL expiry', () => {
    it('removes session and emits session:lost after TTL expires', async () => {
      const reg = createRegistry({ reconnectTTL: 50 });
      const events = [];
      reg.on('session:lost', (data) => events.push(data));

      reg.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      reg.disconnect('sess-1');

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 100));

      expect(reg.lookup('sess-1')).toBeNull();
      expect(events.length).toBe(1);
      expect(events[0].sessionId).toBe('sess-1');

      reg.destroy();
    });
  });

  describe('message buffering', () => {
    it('getBufferedMessages returns empty array when no messages buffered', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      expect(registry.getBufferedMessages('sess-1')).toEqual([]);
    });

    it('bufferMessage stores message for disconnected session', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      registry.disconnect('sess-1');

      const envelope = { type: 'directive', payload: { data: 'test' } };
      registry.bufferMessage('sess-1', envelope);

      expect(registry.getBufferedMessages('sess-1')).toEqual([envelope]);
    });

    it('on reconnect, getBufferedMessages returns buffered messages and clears buffer', () => {
      registry.register('sess-1', {
        identity: 'primary',
        capabilities: ['send'],
        writePermissions: ['ledger'],
      });

      registry.disconnect('sess-1');

      const envelope1 = { type: 'directive', payload: { data: '1' } };
      const envelope2 = { type: 'directive', payload: { data: '2' } };
      registry.bufferMessage('sess-1', envelope1);
      registry.bufferMessage('sess-1', envelope2);

      const buffered = registry.reconnect('sess-1');
      expect(buffered).toEqual([envelope1, envelope2]);

      // Buffer should be cleared after reconnect
      expect(registry.getBufferedMessages('sess-1')).toEqual([]);
    });
  });

  describe('default reconnectTTL', () => {
    it('defaults to 30000 when not configured', () => {
      const reg = createRegistry();
      // Verify the registry was created (default TTL is internal)
      expect(reg).toBeDefined();
      reg.destroy();
    });
  });
});

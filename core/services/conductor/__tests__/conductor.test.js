'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { isOk, isErr, unwrap, ok } = require('../../../../lib/index.cjs');

/**
 * Creates a mock Switchboard that records emit calls.
 * @returns {Object} Mock switchboard with getCalls() for inspection
 */
function createMockSwitchboard() {
  const calls = [];
  return {
    emit(eventName, payload) { calls.push({ eventName, payload }); },
    on() { return () => {}; },
    off() {},
    filter() { return ok(undefined); },
    init() { return ok(undefined); },
    start() { return ok(undefined); },
    stop() { return ok(undefined); },
    healthCheck() { return ok({ healthy: true, name: 'switchboard' }); },
    getCalls() { return calls; }
  };
}

const { createConductor } = require('../conductor.cjs');

describe('Conductor', () => {
  let conductor;
  let mockSwitchboard;

  beforeEach(() => {
    mockSwitchboard = createMockSwitchboard();
    const result = createConductor();
    expect(isOk(result)).toBe(true);
    conductor = unwrap(result);
  });

  describe('contract validation', () => {
    it('createConductor() returns Ok with frozen object', () => {
      const result = createConductor();
      expect(isOk(result)).toBe(true);
      expect(Object.isFrozen(unwrap(result))).toBe(true);
    });

    it('result contains all required methods', () => {
      const required = [
        'init', 'start', 'stop', 'healthCheck',
        'composeUp', 'composeDown', 'composeStatus',
        'checkDependencies', 'isDockerAvailable'
      ];
      for (const method of required) {
        expect(typeof conductor[method]).toBe('function');
      }
    });
  });

  describe('lifecycle', () => {
    it('init({ switchboard }) initializes successfully', () => {
      const result = conductor.init({ switchboard: mockSwitchboard });
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
    });

    it('healthCheck returns { healthy: true, name: "conductor" } after start()', () => {
      conductor.init({ switchboard: mockSwitchboard });
      conductor.start();
      const result = conductor.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('conductor');
    });

    it('healthCheck returns { healthy: false } before start()', () => {
      conductor.init({ switchboard: mockSwitchboard });
      const result = conductor.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(false);
      expect(health.name).toBe('conductor');
    });

    it('healthCheck includes dockerAvailable boolean', () => {
      conductor.init({ switchboard: mockSwitchboard });
      conductor.start();
      const result = conductor.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(typeof health.dockerAvailable).toBe('boolean');
    });

    it('stop() returns Ok(undefined)', () => {
      conductor.init({ switchboard: mockSwitchboard });
      conductor.start();
      const result = conductor.stop();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBeUndefined();
    });
  });

  describe('Docker availability (D-07)', () => {
    it('isDockerAvailable() returns Ok(boolean)', () => {
      conductor.init({ switchboard: mockSwitchboard });
      const result = conductor.isDockerAvailable();
      expect(isOk(result)).toBe(true);
      expect(typeof unwrap(result)).toBe('boolean');
    });

    it('isDockerAvailable() returns Ok(false) when Docker not found', () => {
      // Inject _dockerAvailable override for testing
      conductor.init({ switchboard: mockSwitchboard, _dockerAvailable: false });
      const result = conductor.isDockerAvailable();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toBe(false);
    });
  });

  describe('Docker Compose lifecycle (D-06)', () => {
    describe('when Docker is available', () => {
      beforeEach(() => {
        conductor.init({ switchboard: mockSwitchboard });
        conductor.start();
      });

      // These tests only run if Docker is actually available in the environment
      // They validate the compose interface contract
      it('composeUp returns Ok or Err (interface test)', () => {
        const dockerResult = conductor.isDockerAvailable();
        const dockerAvailable = unwrap(dockerResult);

        if (!dockerAvailable) {
          console.warn('Docker not available -- skipping composeUp live test');
          return;
        }

        // If Docker is available, composeUp should return a Result
        const result = conductor.composeUp('/nonexistent/docker-compose.yml');
        // It will likely fail because the file doesn't exist, but it should return a Result
        expect(result.ok !== undefined || result.error !== undefined).toBe(true);
      });

      it('composeDown returns Ok or Err (interface test)', () => {
        const dockerResult = conductor.isDockerAvailable();
        const dockerAvailable = unwrap(dockerResult);

        if (!dockerAvailable) {
          console.warn('Docker not available -- skipping composeDown live test');
          return;
        }

        const result = conductor.composeDown('/nonexistent/docker-compose.yml');
        expect(result.ok !== undefined || result.error !== undefined).toBe(true);
      });

      it('composeStatus returns Ok or Err (interface test)', () => {
        const dockerResult = conductor.isDockerAvailable();
        const dockerAvailable = unwrap(dockerResult);

        if (!dockerAvailable) {
          console.warn('Docker not available -- skipping composeStatus live test');
          return;
        }

        const result = conductor.composeStatus('/nonexistent/docker-compose.yml');
        expect(result.ok !== undefined || result.error !== undefined).toBe(true);
      });
    });

    describe('graceful degradation (Docker unavailable)', () => {
      beforeEach(() => {
        conductor.init({ switchboard: mockSwitchboard, _dockerAvailable: false });
        conductor.start();
      });

      it('composeUp returns Err(DOCKER_UNAVAILABLE) when Docker not installed', () => {
        const result = conductor.composeUp('/some/docker-compose.yml');
        expect(isErr(result)).toBe(true);
        expect(result.error.code).toBe('DOCKER_UNAVAILABLE');
      });

      it('composeDown returns Err(DOCKER_UNAVAILABLE) when Docker not installed', () => {
        const result = conductor.composeDown('/some/docker-compose.yml');
        expect(isErr(result)).toBe(true);
        expect(result.error.code).toBe('DOCKER_UNAVAILABLE');
      });

      it('composeStatus returns Err(DOCKER_UNAVAILABLE) when Docker not installed', () => {
        const result = conductor.composeStatus('/some/docker-compose.yml');
        expect(isErr(result)).toBe(true);
        expect(result.error.code).toBe('DOCKER_UNAVAILABLE');
      });
    });
  });

  describe('dependency health checks', () => {
    beforeEach(() => {
      conductor.init({ switchboard: mockSwitchboard });
      conductor.start();
    });

    it('checkDependencies() returns Ok with structured dependency report', () => {
      const result = conductor.checkDependencies();
      expect(isOk(result)).toBe(true);

      const deps = unwrap(result);
      expect(deps).toHaveProperty('bun');
      expect(deps).toHaveProperty('git');
      expect(deps).toHaveProperty('duckdb');
      expect(deps).toHaveProperty('disk');
      expect(deps).toHaveProperty('docker');
    });

    it('checkDependencies().bun.version matches current Bun version', () => {
      const result = conductor.checkDependencies();
      const deps = unwrap(result);
      expect(deps.bun.available).toBe(true);
      expect(deps.bun.version).toBe(Bun.version);
    });

    it('checkDependencies().git.available is true (git is installed)', () => {
      const result = conductor.checkDependencies();
      const deps = unwrap(result);
      expect(deps.git.available).toBe(true);
      expect(typeof deps.git.version).toBe('string');
      expect(deps.git.version.length).toBeGreaterThan(0);
    });

    it('checkDependencies().duckdb has loadable boolean', () => {
      const result = conductor.checkDependencies();
      const deps = unwrap(result);
      expect(typeof deps.duckdb.loadable).toBe('boolean');
    });

    it('checkDependencies().disk has available boolean', () => {
      const result = conductor.checkDependencies();
      const deps = unwrap(result);
      expect(typeof deps.disk.available).toBe('boolean');
    });

    it('checkDependencies().docker has available boolean', () => {
      const result = conductor.checkDependencies();
      const deps = unwrap(result);
      expect(typeof deps.docker.available).toBe('boolean');
    });
  });

  describe('event emission', () => {
    describe('when Docker is available', () => {
      beforeEach(() => {
        conductor.init({ switchboard: mockSwitchboard });
        conductor.start();
      });

      it('composeUp emits infra:compose-up via Switchboard when Docker is available', () => {
        const dockerResult = conductor.isDockerAvailable();
        const dockerAvailable = unwrap(dockerResult);

        if (!dockerAvailable) {
          console.warn('Docker not available -- skipping event emission test');
          return;
        }

        // Use a real compose file path -- the event should be emitted regardless of command success
        conductor.composeUp('/test/docker-compose.yml');

        const calls = mockSwitchboard.getCalls();
        const upEvent = calls.find(c => c.eventName === 'infra:compose-up');
        expect(upEvent).toBeDefined();
        expect(upEvent.payload.composePath).toBe('/test/docker-compose.yml');
      });

      it('composeDown emits infra:compose-down via Switchboard when Docker is available', () => {
        const dockerResult = conductor.isDockerAvailable();
        const dockerAvailable = unwrap(dockerResult);

        if (!dockerAvailable) {
          console.warn('Docker not available -- skipping event emission test');
          return;
        }

        conductor.composeDown('/test/docker-compose.yml');

        const calls = mockSwitchboard.getCalls();
        const downEvent = calls.find(c => c.eventName === 'infra:compose-down');
        expect(downEvent).toBeDefined();
        expect(downEvent.payload.composePath).toBe('/test/docker-compose.yml');
      });
    });

    describe('when Docker is not available', () => {
      it('composeUp does NOT emit events when Docker unavailable', () => {
        conductor.init({ switchboard: mockSwitchboard, _dockerAvailable: false });
        conductor.start();

        conductor.composeUp('/test/docker-compose.yml');

        const calls = mockSwitchboard.getCalls();
        const upEvent = calls.find(c => c.eventName === 'infra:compose-up');
        expect(upEvent).toBeUndefined();
      });

      it('composeDown does NOT emit events when Docker unavailable', () => {
        conductor.init({ switchboard: mockSwitchboard, _dockerAvailable: false });
        conductor.start();

        conductor.composeDown('/test/docker-compose.yml');

        const calls = mockSwitchboard.getCalls();
        const downEvent = calls.find(c => c.eventName === 'infra:compose-down');
        expect(downEvent).toBeUndefined();
      });
    });
  });
});

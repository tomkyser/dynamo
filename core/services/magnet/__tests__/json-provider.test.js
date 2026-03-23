'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isOk, isErr, unwrap } = require('../../../../lib/index.cjs');
const { createLathe } = require('../../lathe/lathe.cjs');
const { createJsonProvider } = require('../json-provider.cjs');
const { STATE_PROVIDER_SHAPE } = require('../provider.cjs');

let tmpDir;
let lathe;
let statePath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-magnet-jp-'));
  statePath = path.join(tmpDir, 'state.json');
  const latheResult = createLathe();
  expect(isOk(latheResult)).toBe(true);
  lathe = unwrap(latheResult);
  lathe.init();
  lathe.start();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('JSON Provider', () => {
  describe('contract validation', () => {
    it('createJsonProvider returns Ok with frozen object', () => {
      const result = createJsonProvider({ lathe, filePath: statePath });
      expect(isOk(result)).toBe(true);
      expect(Object.isFrozen(unwrap(result))).toBe(true);
    });

    it('provider validates against STATE_PROVIDER_SHAPE', () => {
      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      for (const method of STATE_PROVIDER_SHAPE.required) {
        expect(typeof provider[method]).toBe('function');
      }
    });

    it('returns Err when lathe is missing', () => {
      const result = createJsonProvider({ filePath: statePath });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('MISSING_DEPENDENCY');
    });

    it('returns Err when filePath is missing', () => {
      const result = createJsonProvider({ lathe });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('MISSING_DEPENDENCY');
    });
  });

  describe('load', () => {
    it('returns default empty state when file does not exist', async () => {
      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      const result = await provider.load();
      expect(isOk(result)).toBe(true);
      const state = unwrap(result);
      expect(state).toEqual({ global: {}, session: {}, module: {} });
    });

    it('returns parsed state when file exists with valid JSON', async () => {
      const existingState = {
        global: { version: '1.0' },
        session: { 's1': { tab: 'chat' } },
        module: {}
      };
      fs.writeFileSync(statePath, JSON.stringify(existingState, null, 2));

      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      const result = await provider.load();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toEqual(existingState);
    });

    it('falls back to .bak file when primary file has invalid JSON', async () => {
      const bakState = {
        global: { recovered: true },
        session: {},
        module: {}
      };
      // Write invalid JSON to primary file
      fs.writeFileSync(statePath, '{ corrupt data !!!');
      // Write valid state to backup
      fs.writeFileSync(statePath + '.bak', JSON.stringify(bakState, null, 2));

      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      const result = await provider.load();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toEqual(bakState);
    });

    it('returns empty state when both primary and .bak files have invalid JSON', async () => {
      fs.writeFileSync(statePath, '{ corrupt !!!');
      fs.writeFileSync(statePath + '.bak', '{ also corrupt !!!');

      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      const result = await provider.load();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result)).toEqual({ global: {}, session: {}, module: {} });
    });
  });

  describe('save', () => {
    it('save with flush:true writes state to disk as formatted JSON', async () => {
      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      const state = { global: { key: 'value' }, session: {}, module: {} };
      const result = await provider.save(state, { flush: true });
      expect(isOk(result)).toBe(true);

      const onDisk = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(onDisk).toEqual(state);
    });

    it('save with flush:true creates .bak file before writing', async () => {
      // Write initial state
      const initial = { global: { initial: true }, session: {}, module: {} };
      fs.writeFileSync(statePath, JSON.stringify(initial, null, 2));

      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      const updated = { global: { updated: true }, session: {}, module: {} };
      await provider.save(updated, { flush: true });

      // .bak should have the initial state
      const bakContent = JSON.parse(fs.readFileSync(statePath + '.bak', 'utf8'));
      expect(bakContent).toEqual(initial);

      // Primary file should have the updated state
      const primaryContent = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(primaryContent).toEqual(updated);
    });

    it('debounced save: calling save() multiple times rapidly results in one disk write', async () => {
      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));

      // Call save rapidly without flush:true
      provider.save({ global: { call: 1 }, session: {}, module: {} });
      provider.save({ global: { call: 2 }, session: {}, module: {} });
      const lastPromise = provider.save({ global: { call: 3 }, session: {}, module: {} });

      // File should NOT exist yet (debounced)
      expect(fs.existsSync(statePath)).toBe(false);

      // Wait for debounce to complete
      await lastPromise;

      // Now file should have the last state
      const onDisk = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(onDisk).toEqual({ global: { call: 3 }, session: {}, module: {} });
    });

    it('save with flush:true writes immediately even if debounced save is pending', async () => {
      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));

      // Start a debounced save
      provider.save({ global: { debounced: true }, session: {}, module: {} });

      // Immediately flush a different state
      const state = { global: { flushed: true }, session: {}, module: {} };
      await provider.save(state, { flush: true });

      // File should have the flushed state, not the debounced one
      const onDisk = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(onDisk).toEqual(state);
    });
  });

  describe('clear', () => {
    it('clear removes scope key from state and saves', async () => {
      const state = {
        global: { key: 'value' },
        session: { 's1': { tab: 'chat' } },
        module: { reverie: { active: true } }
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      const provider = unwrap(createJsonProvider({ lathe, filePath: statePath }));
      await provider.clear('session');

      const onDisk = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(onDisk.session).toEqual({});
      expect(onDisk.global).toEqual({ key: 'value' });
      expect(onDisk.module).toEqual({ reverie: { active: true } });
    });
  });
});

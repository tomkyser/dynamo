'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { parseSimpleFlags, readTriadFile } = require('./dynamo.cjs');

describe('bin/dynamo.cjs thin client', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-thin-'));
    // Create .dynamo dir so discoverRoot can find it
    fs.mkdirSync(path.join(tmpDir, '.dynamo'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('parseSimpleFlags', () => {
    it('extracts --json flag', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', 'status', '--json']);
      expect(flags.json).toBe(true);
    });

    it('extracts --raw flag', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', 'status', '--raw']);
      expect(flags.raw).toBe(true);
    });

    it('extracts --help flag', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', '--help']);
      expect(flags.help).toBe(true);
    });

    it('extracts --confirm flag', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', 'reset', '--confirm']);
      expect(flags.confirm).toBe(true);
    });

    it('extracts --dry-run flag', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', 'backfill', '--dry-run']);
      expect(flags.dryRun).toBe(true);
    });

    it('extracts multiple flags', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', 'status', '--json', '--help']);
      expect(flags.json).toBe(true);
      expect(flags.help).toBe(true);
    });

    it('returns empty object when no flags', () => {
      const flags = parseSimpleFlags(['node', 'dynamo.cjs', 'status']);
      expect(Object.keys(flags).length).toBe(0);
    });
  });

  describe('readTriadFile', () => {
    it('returns null when file missing', () => {
      const result = readTriadFile(tmpDir);
      expect(result).toBeNull();
    });

    it('returns parsed JSON when file exists', () => {
      const triadData = { triadId: 'abc-1234', faceSessionIdentity: 'face-id-1' };
      fs.writeFileSync(
        path.join(tmpDir, '.dynamo', 'active-triad.json'),
        JSON.stringify(triadData)
      );
      const result = readTriadFile(tmpDir);
      expect(result).toEqual(triadData);
    });

    it('returns null when file is invalid JSON', () => {
      fs.writeFileSync(
        path.join(tmpDir, '.dynamo', 'active-triad.json'),
        'not valid json'
      );
      const result = readTriadFile(tmpDir);
      expect(result).toBeNull();
    });
  });

  describe('structural verification', () => {
    it('bin/dynamo.cjs does NOT contain require core/core.cjs or bootstrap', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      expect(content).not.toContain("require('../core/core.cjs')");
      expect(content).not.toContain('bootstrap()');
      expect(content).not.toContain('bootstrap(');
    });

    it('bin/dynamo.cjs contains require daemon-lifecycle', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      expect(content).toContain("require('../core/daemon-lifecycle.cjs')");
    });

    it('bin/dynamo.cjs is under 150 lines', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(150);
    });

    it('implements all 7 off-ramp states', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      // State 1: no_pid_file -> silent {}
      expect(content).toContain('no_pid_file');
      // State 2: stale_pid -> stderr warning
      expect(content).toContain('stale_pid');
      // State 5: success -> stdout response
      expect(content).toContain('resp.text()');
      // State 6: daemon error -> stderr error
      expect(content).toContain('hook error');
      // State 7: dev bypass
      expect(content).toContain('DYNAMO_DEV_BYPASS');
    });

    it('has start command that calls spawnDaemon and waitForHealth', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      expect(content).toContain('spawnDaemon');
      expect(content).toContain('waitForHealth');
    });

    it('has stop command that POSTs to /shutdown', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      expect(content).toContain('/shutdown');
    });

    it('has status command that GETs /health', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      expect(content).toContain('/health');
    });

    it('has reverie kill that does NOT require daemon', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      // handleReverieKill uses execSync directly, not daemon fetch
      expect(content).toContain('handleReverieKill');
      expect(content).toContain('execSync');
    });

    it('default command forwards to POST /cli', () => {
      const content = fs.readFileSync(path.join(__dirname, 'dynamo.cjs'), 'utf-8');
      expect(content).toContain('/cli');
    });
  });
});

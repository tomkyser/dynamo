'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isOk, isErr, unwrap, ok } = require('../../../../lib/index.cjs');
const { createLathe } = require('../../lathe/lathe.cjs');
const { createForge } = require('../forge.cjs');

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

/**
 * Initializes a real git repo in the given directory with an initial commit.
 * @param {string} dir - Directory to initialize
 */
function initGitRepo(dir) {
  Bun.spawnSync(['git', 'init'], { cwd: dir, stdout: 'ignore', stderr: 'ignore' });
  Bun.spawnSync(['git', 'config', 'user.email', 'test@test.com'], { cwd: dir, stdout: 'ignore', stderr: 'ignore' });
  Bun.spawnSync(['git', 'config', 'user.name', 'Test'], { cwd: dir, stdout: 'ignore', stderr: 'ignore' });
  fs.writeFileSync(path.join(dir, 'initial.txt'), 'initial content');
  Bun.spawnSync(['git', 'add', '.'], { cwd: dir, stdout: 'ignore', stderr: 'ignore' });
  Bun.spawnSync(['git', 'commit', '-m', 'initial commit'], { cwd: dir, stdout: 'ignore', stderr: 'ignore' });
}

let tmpDir;
let lathe;
let mockSwitchboard;
let forge;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-test-'));
  initGitRepo(tmpDir);
  lathe = unwrap(createLathe());
  mockSwitchboard = createMockSwitchboard();
  forge = unwrap(createForge());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Forge', () => {
  describe('contract validation', () => {
    it('createForge() returns Ok with frozen object', () => {
      const result = createForge();
      expect(isOk(result)).toBe(true);
      expect(Object.isFrozen(unwrap(result))).toBe(true);
    });

    it('result contains all required methods', () => {
      const f = unwrap(createForge());
      const required = [
        'init', 'start', 'stop', 'healthCheck',
        'status', 'commit', 'branch', 'tag', 'log', 'resetTo',
        'submoduleAdd', 'submoduleUpdate', 'submoduleRemove', 'sync'
      ];
      for (const method of required) {
        expect(typeof f[method]).toBe('function');
      }
    });
  });

  describe('lifecycle', () => {
    it('init({ repoPath, lathe, switchboard }) initializes successfully', () => {
      const result = forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      expect(isOk(result)).toBe(true);
    });

    it('init() without repoPath returns Err(INIT_FAILED)', () => {
      const result = forge.init({ lathe, switchboard: mockSwitchboard });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INIT_FAILED');
    });

    it('healthCheck() returns { healthy: true, name: forge } after start()', () => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();
      const result = forge.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.healthy).toBe(true);
      expect(health.name).toBe('forge');
    });

    it('healthCheck() includes gitAvailable: true', () => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();
      const result = forge.healthCheck();
      expect(isOk(result)).toBe(true);
      const health = unwrap(result);
      expect(health.gitAvailable).toBe(true);
    });

    it('healthCheck() returns healthy:false before start()', () => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      const result = forge.healthCheck();
      expect(isOk(result)).toBe(true);
      expect(unwrap(result).healthy).toBe(false);
    });

    it('stop() returns Ok and sets healthy to false', () => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();
      const stopResult = forge.stop();
      expect(isOk(stopResult)).toBe(true);
      const health = unwrap(forge.healthCheck());
      expect(health.healthy).toBe(false);
    });
  });

  describe('git operations', () => {
    beforeEach(() => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();
    });

    describe('status', () => {
      it('returns Ok({ clean: true, files: [] }) on clean repo', () => {
        const result = forge.status();
        expect(isOk(result)).toBe(true);
        const s = unwrap(result);
        expect(s.clean).toBe(true);
        expect(s.files).toEqual([]);
      });

      it('returns Ok({ clean: false, files: [...] }) with uncommitted changes', () => {
        fs.writeFileSync(path.join(tmpDir, 'new-file.txt'), 'content');
        const result = forge.status();
        expect(isOk(result)).toBe(true);
        const s = unwrap(result);
        expect(s.clean).toBe(false);
        expect(s.files.length).toBeGreaterThan(0);
        expect(s.files[0].file).toBe('new-file.txt');
      });
    });

    describe('commit', () => {
      it('commits staged changes and returns Ok({ hash })', () => {
        fs.writeFileSync(path.join(tmpDir, 'commit-test.txt'), 'data');
        Bun.spawnSync(['git', 'add', '.'], { cwd: tmpDir });
        const result = forge.commit('test message');
        expect(isOk(result)).toBe(true);
        const val = unwrap(result);
        expect(typeof val.hash).toBe('string');
        expect(val.hash.length).toBeGreaterThan(0);
      });

      it('returns Err(NOTHING_TO_COMMIT) on clean repo', () => {
        const result = forge.commit('empty commit');
        expect(isErr(result)).toBe(true);
        expect(result.error.code).toBe('NOTHING_TO_COMMIT');
      });
    });

    describe('branch', () => {
      it('returns Ok(currentBranchName) when called without arguments', () => {
        const result = forge.branch();
        expect(isOk(result)).toBe(true);
        const branchName = unwrap(result);
        expect(typeof branchName).toBe('string');
        // Default branch from git init is usually main or master
        expect(branchName.length).toBeGreaterThan(0);
      });

      it('creates and returns Ok(newBranchName) when called with a name', () => {
        const result = forge.branch('new-branch');
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBe('new-branch');

        // Verify we are now on the new branch
        const current = forge.branch();
        expect(unwrap(current)).toBe('new-branch');
      });
    });

    describe('tag', () => {
      it('creates tag and returns Ok(tagName)', () => {
        const result = forge.tag('v1.0');
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBe('v1.0');
      });

      it('returns Err(TAG_EXISTS) on duplicate tag', () => {
        forge.tag('v1.0');
        const result = forge.tag('v1.0');
        expect(isErr(result)).toBe(true);
        expect(result.error.code).toBe('TAG_EXISTS');
      });
    });

    describe('log', () => {
      it('returns Ok([array of { hash, message, date }]) limited to N entries', () => {
        // Create a few more commits
        for (let i = 0; i < 3; i++) {
          fs.writeFileSync(path.join(tmpDir, `log-test-${i}.txt`), `content ${i}`);
          Bun.spawnSync(['git', 'add', '.'], { cwd: tmpDir });
          Bun.spawnSync(['git', 'commit', '-m', `commit ${i}`], { cwd: tmpDir });
        }

        const result = forge.log(2);
        expect(isOk(result)).toBe(true);
        const entries = unwrap(result);
        expect(entries.length).toBe(2);
        expect(typeof entries[0].hash).toBe('string');
        expect(typeof entries[0].message).toBe('string');
        expect(typeof entries[0].date).toBe('string');
      });
    });

    describe('resetTo', () => {
      it('resets to a specific commit', () => {
        // Get current commit hash
        const logResult = forge.log(1);
        const initialHash = unwrap(logResult)[0].hash;

        // Create a new commit
        fs.writeFileSync(path.join(tmpDir, 'reset-test.txt'), 'will be reset');
        Bun.spawnSync(['git', 'add', '.'], { cwd: tmpDir });
        Bun.spawnSync(['git', 'commit', '-m', 'to be reset'], { cwd: tmpDir });

        // Reset back
        const result = forge.resetTo(initialHash);
        expect(isOk(result)).toBe(true);

        // Verify we are back at the initial commit
        const afterLog = forge.log(1);
        expect(unwrap(afterLog)[0].hash).toBe(initialHash);
      });
    });
  });

  describe('submodule operations', () => {
    let bareRepoDir;

    beforeEach(() => {
      // Create a bare repo to serve as submodule source
      bareRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-bare-'));
      Bun.spawnSync(['git', 'init', '--bare'], { cwd: bareRepoDir, stdout: 'ignore', stderr: 'ignore' });

      // Create a temporary repo, commit something, and push to the bare repo
      const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-source-'));
      initGitRepo(sourceDir);
      Bun.spawnSync(['git', 'remote', 'add', 'origin', bareRepoDir], { cwd: sourceDir, stdout: 'ignore', stderr: 'ignore' });
      Bun.spawnSync(['git', 'push', 'origin', 'HEAD'], { cwd: sourceDir, stdout: 'ignore', stderr: 'ignore' });
      fs.rmSync(sourceDir, { recursive: true, force: true });

      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();
    });

    afterEach(() => {
      fs.rmSync(bareRepoDir, { recursive: true, force: true });
    });

    it('submoduleAdd(url, path) adds a submodule', () => {
      const result = forge.submoduleAdd(bareRepoDir, 'vendor/sub');
      expect(isOk(result)).toBe(true);
      // Verify .gitmodules exists
      expect(fs.existsSync(path.join(tmpDir, '.gitmodules'))).toBe(true);
    });

    it('submoduleUpdate() updates all submodules', () => {
      forge.submoduleAdd(bareRepoDir, 'vendor/sub');
      Bun.spawnSync(['git', 'add', '.'], { cwd: tmpDir });
      Bun.spawnSync(['git', 'commit', '-m', 'add submodule'], { cwd: tmpDir });
      const result = forge.submoduleUpdate();
      expect(isOk(result)).toBe(true);
    });

    it('submoduleRemove(path) removes a submodule', () => {
      forge.submoduleAdd(bareRepoDir, 'vendor/sub');
      Bun.spawnSync(['git', 'add', '.'], { cwd: tmpDir });
      Bun.spawnSync(['git', 'commit', '-m', 'add submodule'], { cwd: tmpDir });
      const result = forge.submoduleRemove('vendor/sub');
      expect(isOk(result)).toBe(true);
    });
  });

  describe('sync operations', () => {
    it('sync(srcDir, destDir) copies files from source to destination via Lathe', async () => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();

      // Create source directory with files
      const srcDir = path.join(tmpDir, 'src');
      const destDir = path.join(tmpDir, 'dest');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'a.txt'), 'file a');
      fs.writeFileSync(path.join(srcDir, 'b.txt'), 'file b');

      const result = await forge.sync(srcDir, destDir);
      expect(isOk(result)).toBe(true);
      const val = unwrap(result);
      expect(val.filesCopied).toBe(2);

      // Verify files exist at destination
      expect(fs.readFileSync(path.join(destDir, 'a.txt'), 'utf8')).toBe('file a');
      expect(fs.readFileSync(path.join(destDir, 'b.txt'), 'utf8')).toBe('file b');
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      forge.init({ repoPath: tmpDir, lathe, switchboard: mockSwitchboard });
      forge.start();
    });

    it('commit emits git:committed via Switchboard', () => {
      fs.writeFileSync(path.join(tmpDir, 'event-test.txt'), 'data');
      Bun.spawnSync(['git', 'add', '.'], { cwd: tmpDir });
      forge.commit('event test');

      const calls = mockSwitchboard.getCalls();
      const commitEvent = calls.find(c => c.eventName === 'git:committed');
      expect(commitEvent).toBeDefined();
      expect(typeof commitEvent.payload.hash).toBe('string');
      expect(commitEvent.payload.message).toBe('event test');
    });

    it('tag emits git:tagged via Switchboard', () => {
      forge.tag('v2.0');

      const calls = mockSwitchboard.getCalls();
      const tagEvent = calls.find(c => c.eventName === 'git:tagged');
      expect(tagEvent).toBeDefined();
      expect(tagEvent.payload.tag).toBe('v2.0');
    });
  });
});

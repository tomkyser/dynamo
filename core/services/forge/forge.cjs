'use strict';

const path = require('node:path');
const { ok, err, createContract } = require('../../../lib/index.cjs');

/**
 * Contract shape defining all required methods for the Forge service.
 * @type {{ required: string[], optional: string[] }}
 */
const FORGE_SHAPE = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'status', 'commit', 'branch', 'tag', 'log', 'resetTo',
    'submoduleAdd', 'submoduleUpdate', 'submoduleRemove', 'sync'
  ],
  optional: ['stageAll', 'stageFiles', 'deleteTag', 'pull']
};

/**
 * Creates a new Forge git operations service instance.
 *
 * Forge wraps the git CLI via Bun.spawnSync for synchronous git commands,
 * providing status, commit, branch, tag, log, submodule management, and
 * repo-to-deploy file sync. It follows the established service factory
 * pattern with lifecycle methods and options-based DI.
 *
 * Security: GIT_TERMINAL_PROMPT=0 and stdin:'ignore' prevent git from
 * hanging on credential prompts in headless environments.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createForge() {
  /** @type {boolean} */
  let _started = false;
  /** @type {string|null} */
  let _repoPath = null;
  /** @type {Object|null} */
  let _lathe = null;
  /** @type {Object|null} */
  let _switchboard = null;

  /**
   * Executes a git command synchronously via Bun.spawnSync.
   *
   * @param {string[]} args - Git subcommand and arguments (e.g., ['status', '--porcelain'])
   * @param {string} [cwd] - Override working directory (defaults to _repoPath)
   * @returns {import('../../../lib/result.cjs').Result<string>} Ok(stdout) or Err with details
   */
  function _runGit(args, cwd) {
    const result = Bun.spawnSync(['git', ...args], {
      cwd: cwd || _repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdin: 'ignore',
    });
    const stdout = result.stdout.toString().trim();
    if (!result.success) {
      const stderr = result.stderr.toString().trim();
      return err('GIT_FAILED', `git ${args[0]} failed: ${stderr}`, {
        command: ['git', ...args],
        exitCode: result.exitCode,
        stdout,
      });
    }
    return ok(stdout);
  }

  /**
   * Initialize the Forge service with required dependencies.
   *
   * @param {Object} options - Initialization options
   * @param {string} options.repoPath - Absolute path to the git repository root
   * @param {Object} [options.lathe] - Lathe service instance for file operations (sync)
   * @param {Object} [options.switchboard] - Switchboard service instance for event emission
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function init(options) {
    if (!options || !options.repoPath) {
      return err('INIT_FAILED', 'repoPath is required', { provided: options ? Object.keys(options) : [] });
    }

    _repoPath = options.repoPath;
    _lathe = options.lathe || null;
    _switchboard = options.switchboard || null;

    // Verify git is available
    const gitCheck = _runGit(['--version']);
    if (!gitCheck.ok) {
      return err('INIT_FAILED', 'git is not installed or not accessible', { gitError: gitCheck.error });
    }

    return ok(undefined);
  }

  /**
   * Start the Forge service, enabling health check reporting.
   * @returns {import('../../../lib/result.cjs').Ok<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Forge service.
   * @returns {import('../../../lib/result.cjs').Ok<undefined>}
   */
  function stop() {
    _started = false;
    return ok(undefined);
  }

  /**
   * Check whether the Forge service is healthy.
   * Reports git availability alongside service started status.
   *
   * @returns {import('../../../lib/result.cjs').Ok<{ healthy: boolean, name: string, gitAvailable: boolean }>}
   */
  function healthCheck() {
    const gitResult = _runGit(['--version']);
    return ok({
      healthy: _started,
      name: 'forge',
      gitAvailable: gitResult.ok
    });
  }

  // ---- Git Operations ----

  /**
   * Get the current working tree status.
   *
   * @returns {import('../../../lib/result.cjs').Result<{ clean: boolean, files: Array<{ status: string, file: string }> }>}
   */
  function status() {
    const result = _runGit(['status', '--porcelain']);
    if (!result.ok) return result;

    const output = result.value;
    if (!output) {
      return ok({ clean: true, files: [] });
    }

    const files = output.split('\n').map(line => ({
      status: line.slice(0, 2).trim(),
      file: line.slice(3)
    }));

    return ok({ clean: false, files });
  }

  /**
   * Stage all changes in the working tree.
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function stageAll() {
    return _runGit(['add', '-A']);
  }

  /**
   * Stage specific files.
   * @param {string[]} files - Array of file paths to stage
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function stageFiles(files) {
    return _runGit(['add', '--', ...files]);
  }

  /**
   * Commit staged changes with the given message.
   *
   * @param {string} message - Commit message
   * @returns {import('../../../lib/result.cjs').Result<{ hash: string }>}
   */
  function commit(message) {
    const result = _runGit(['commit', '-m', message]);
    if (!result.ok) {
      const errorMsg = result.error.message || '';
      const stdout = (result.error.context && result.error.context.stdout) || '';
      if (errorMsg.includes('nothing to commit') || errorMsg.includes('nothing added to commit') ||
          stdout.includes('nothing to commit') || stdout.includes('nothing added to commit')) {
        return err('NOTHING_TO_COMMIT', 'Nothing to commit -- working tree clean');
      }
      return result;
    }

    // Parse commit hash from output (e.g., "[main abc1234] commit message")
    const output = result.value;
    const hashMatch = output.match(/\[[\w/.-]+\s+([0-9a-f]+)\]/);
    const hash = hashMatch ? hashMatch[1] : '';

    // Emit event via switchboard
    if (_switchboard) {
      _switchboard.emit('git:committed', { hash, message });
    }

    return ok({ hash });
  }

  /**
   * Get current branch name, or create and switch to a new branch.
   *
   * @param {string} [name] - Branch name to create and checkout. If omitted, returns current branch name.
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function branch(name) {
    if (!name) {
      return _runGit(['branch', '--show-current']);
    }
    const result = _runGit(['checkout', '-b', name]);
    if (!result.ok) return result;
    return ok(name);
  }

  /**
   * Create a lightweight tag at the current HEAD.
   *
   * @param {string} name - Tag name
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function tag(name) {
    const result = _runGit(['tag', name]);
    if (!result.ok) {
      const errorMsg = result.error.message || '';
      if (errorMsg.includes('already exists')) {
        return err('TAG_EXISTS', `Tag '${name}' already exists`);
      }
      return result;
    }

    // Emit event via switchboard
    if (_switchboard) {
      _switchboard.emit('git:tagged', { tag: name });
    }

    return ok(name);
  }

  /**
   * Delete a lightweight tag.
   *
   * @param {string} name - Tag name to delete
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function deleteTag(name) {
    return _runGit(['tag', '-d', name]);
  }

  /**
   * Pull from a remote repository.
   *
   * @param {string} [remote='origin'] - Remote name
   * @param {string} [branch] - Branch name (omit for current branch)
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function pull(remote, branch) {
    const args = ['pull'];
    if (remote) args.push(remote);
    if (branch) args.push(branch);
    return _runGit(args);
  }

  /**
   * Get recent commit log entries.
   *
   * @param {number} [limit=10] - Maximum number of entries to return
   * @returns {import('../../../lib/result.cjs').Result<Array<{ hash: string, message: string, date: string }>>}
   */
  function log(limit) {
    const n = limit !== undefined ? limit : 10;
    const result = _runGit(['log', '--format=%H|%s|%aI', '-n', String(n)]);
    if (!result.ok) return result;

    const output = result.value;
    if (!output) return ok([]);

    const entries = output.split('\n').map(line => {
      const parts = line.split('|');
      return {
        hash: parts[0],
        message: parts[1],
        date: parts[2]
      };
    });

    return ok(entries);
  }

  /**
   * Hard-reset the working tree to a specific ref (commit hash, branch, tag).
   *
   * @param {string} ref - Git ref to reset to
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function resetTo(ref) {
    return _runGit(['reset', '--hard', ref]);
  }

  // ---- Submodule Operations ----

  /**
   * Add a git submodule to the repository.
   *
   * @param {string} url - URL or path to the submodule repository
   * @param {string} subPath - Relative path within the repo for the submodule
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function submoduleAdd(url, subPath) {
    return _runGit(['-c', 'protocol.file.allow=always', 'submodule', 'add', url, subPath]);
  }

  /**
   * Update all submodules recursively (init + update).
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function submoduleUpdate() {
    return _runGit(['-c', 'protocol.file.allow=always', 'submodule', 'update', '--init', '--recursive']);
  }

  /**
   * Remove a submodule from the repository.
   * Performs the full removal sequence: deinit, rm.
   *
   * @param {string} subPath - Relative path of the submodule to remove
   * @returns {import('../../../lib/result.cjs').Result<string>}
   */
  function submoduleRemove(subPath) {
    const deinit = _runGit(['submodule', 'deinit', '-f', subPath]);
    if (!deinit.ok) return deinit;

    const rm = _runGit(['rm', '-f', subPath]);
    return rm;
  }

  // ---- Sync Operations ----

  /**
   * Copy files from a source directory to a destination directory via Lathe.
   * Recurses into subdirectories. Creates destination directories as needed.
   *
   * @param {string} srcDir - Absolute path to source directory
   * @param {string} destDir - Absolute path to destination directory
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ filesCopied: number }>>}
   */
  async function sync(srcDir, destDir) {
    if (!_lathe) {
      return err('SYNC_FAILED', 'Lathe service not available -- cannot sync', { srcDir, destDir });
    }

    let filesCopied = 0;

    async function copyDir(src, dest) {
      const listResult = _lathe.listDir(src);
      if (!listResult.ok) return listResult;

      _lathe.mkdir(dest);

      for (const entry of listResult.value) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory) {
          const subResult = await copyDir(srcPath, destPath);
          if (!subResult.ok) return subResult;
        } else if (entry.isFile) {
          const readResult = await _lathe.readFile(srcPath);
          if (!readResult.ok) return readResult;
          const writeResult = await _lathe.writeFile(destPath, readResult.value);
          if (!writeResult.ok) return writeResult;
          filesCopied++;
        }
      }

      return ok(undefined);
    }

    const result = await copyDir(srcDir, destDir);
    if (!result.ok) return result;

    return ok({ filesCopied });
  }

  const impl = {
    init,
    start,
    stop,
    healthCheck,
    status,
    stageAll,
    stageFiles,
    commit,
    branch,
    tag,
    deleteTag,
    pull,
    log,
    resetTo,
    submoduleAdd,
    submoduleUpdate,
    submoduleRemove,
    sync
  };

  return createContract('forge', FORGE_SHAPE, impl);
}

module.exports = { createForge };

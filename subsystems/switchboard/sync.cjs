// Dynamo > Switchboard > sync.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const resolve = require('../../lib/resolve.cjs');
const { DYNAMO_DIR, output, error } = require(resolve('lib', 'core.cjs'));

// --- Constants ---

const { resolveRepoRoot } = require('../../lib/resolve.cjs');
const REPO_ROOT = resolveRepoRoot();
const LIVE_DIR = path.join(os.homedir(), '.claude', 'dynamo');
const SYNC_STAMP = path.join(REPO_ROOT, '.last-sync');

const SYNC_EXCLUDES = [
  '.env', '.env.example', '.venv', '__pycache__', 'sessions.json',
  'hook-errors.log', '.DS_Store', '.last-sync', 'node_modules',
  'config.json', 'tests'   // tests stay in repo only
];

const GLOB_EXCLUDES = ['*.pyc'];  // pattern-based excludes

// Six-subsystem sync pairs from layout.cjs (single source of truth)
const { getSyncPairs } = require('../../lib/layout.cjs');
const SYNC_PAIRS = getSyncPairs(REPO_ROOT, LIVE_DIR);

// --- Helpers ---

/**
 * Recursively walk a directory tree, returning { relativePath: { mtime, size } }.
 * Skips entries matching name-based excludes and glob-pattern excludes.
 */
function walkDir(dir, excludes, globExcludes, base, filesOnly) {
  base = base || dir;
  const files = {};

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return files;
  }

  for (const entry of entries) {
    const name = entry.name;

    // Skip name-based excludes
    if (excludes.indexOf(name) !== -1) continue;

    // Skip glob-pattern excludes (e.g., '*.pyc' -> endsWith('.pyc'))
    let globMatch = false;
    for (const pattern of globExcludes) {
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1);  // '.pyc'
        if (name.endsWith(ext)) {
          globMatch = true;
          break;
        }
      }
    }
    if (globMatch) continue;

    const fullPath = path.join(dir, name);

    if (entry.isDirectory()) {
      if (filesOnly) continue;  // Skip subdirectories in filesOnly mode
      const subFiles = walkDir(fullPath, excludes, globExcludes, base);
      Object.assign(files, subFiles);
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      const relPath = path.relative(base, fullPath);
      files[relPath] = { mtime: stat.mtimeMs, size: stat.size };
    }
  }

  return files;
}

/**
 * Compare source and destination file trees.
 * Returns { toCopy: [], toDelete: [] }.
 * toCopy: files in src missing from dst, or with different size/newer mtime.
 * toDelete: files in dst not present in src.
 * @param {Object} srcFiles - Source file map { relPath: { mtime, size } }
 * @param {Object} dstFiles - Destination file map { relPath: { mtime, size } }
 * @param {string} [srcDir] - Source directory path (enables content comparison)
 * @param {string} [dstDir] - Destination directory path (enables content comparison)
 */
function diffTrees(srcFiles, dstFiles, srcDir, dstDir) {
  const toCopy = [];
  const toDelete = [];

  // Files to copy: in src but missing/different in dst
  for (const relPath of Object.keys(srcFiles)) {
    if (!(relPath in dstFiles)) {
      toCopy.push(relPath);
    } else {
      const src = srcFiles[relPath];
      const dst = dstFiles[relPath];
      if (src.size !== dst.size || src.mtime > dst.mtime) {
        toCopy.push(relPath);
      } else if (srcDir && dstDir) {
        // Same size, dst is newer or equal mtime -- check actual content
        try {
          const srcBuf = fs.readFileSync(path.join(srcDir, relPath));
          const dstBuf = fs.readFileSync(path.join(dstDir, relPath));
          if (Buffer.compare(srcBuf, dstBuf) !== 0) {
            toCopy.push(relPath);
          }
        } catch (e) {
          // If read fails, assume different and copy
          toCopy.push(relPath);
        }
      }
    }
  }

  // Files to delete: in dst but not in src
  for (const relPath of Object.keys(dstFiles)) {
    if (!(relPath in srcFiles)) {
      toDelete.push(relPath);
    }
  }

  return { toCopy, toDelete };
}

/**
 * Detect conflicts: files that exist in both directories with different content.
 * Uses byte-by-byte comparison via Buffer.compare.
 * Returns list of conflicting relative paths.
 */
function detectConflicts(srcDir, dstDir, srcFiles, dstFiles) {
  const conflicts = [];

  for (const relPath of Object.keys(srcFiles)) {
    if (!(relPath in dstFiles)) continue;

    const srcEntry = srcFiles[relPath];
    const dstEntry = dstFiles[relPath];

    // Same size: compare content byte-by-byte
    if (srcEntry.size === dstEntry.size) {
      try {
        const srcBuf = fs.readFileSync(path.join(srcDir, relPath));
        const dstBuf = fs.readFileSync(path.join(dstDir, relPath));
        if (Buffer.compare(srcBuf, dstBuf) !== 0) {
          conflicts.push(relPath);
        }
      } catch (e) {
        // If we can't read, treat as conflict
        conflicts.push(relPath);
      }
    } else {
      // Different size = definitely different content = conflict
      conflicts.push(relPath);
    }
  }

  return conflicts;
}

/**
 * Copy files from srcDir to dstDir, creating parent directories as needed.
 */
function copyFiles(srcDir, dstDir, relativePaths) {
  for (const relPath of relativePaths) {
    const srcPath = path.join(srcDir, relPath);
    const dstPath = path.join(dstDir, relPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.copyFileSync(srcPath, dstPath);
  }
}

/**
 * Delete files from dstDir by relative path. Silently skips non-existent files.
 */
function deleteFiles(dstDir, relativePaths) {
  for (const relPath of relativePaths) {
    const fullPath = path.join(dstDir, relPath);
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      // File already gone -- no-op
    }
  }
}

/**
 * Read last sync timestamp from .last-sync file.
 */
function readLastSync() {
  try {
    return fs.readFileSync(SYNC_STAMP, 'utf8').trim();
  } catch (e) {
    return null;
  }
}

/**
 * Write current timestamp to .last-sync file.
 */
function writeLastSync() {
  fs.writeFileSync(SYNC_STAMP, new Date().toISOString() + '\n', 'utf8');
}

/**
 * Walk all sync pairs and return aggregated file maps for each direction.
 * For repo-to-live: repo files are source, live files are destination.
 * For live-to-repo: live files are source, repo files are destination.
 * Returns per-pair results: [{ pair, repoFiles, liveFiles }]
 */
function walkAllPairs() {
  const results = [];
  for (const pair of SYNC_PAIRS) {
    const repoFiles = walkDir(pair.repo, pair.excludes, GLOB_EXCLUDES, undefined, pair.filesOnly);
    const liveFiles = walkDir(pair.live, pair.excludes, GLOB_EXCLUDES, undefined, pair.filesOnly);
    results.push({ pair, repoFiles, liveFiles });
  }
  return results;
}

// --- Main command ---

async function run(args, pretty) {
  args = args || [];
  pretty = pretty || false;

  // Parse direction and flags
  let direction = null;
  let dryRun = false;
  let force = false;

  for (const arg of args) {
    if (arg === '--dry-run') { dryRun = true; }
    else if (arg === '--force') { force = true; }
    else if (arg === '--pretty') { pretty = true; }
    else if (!direction) { direction = arg; }
  }

  const validDirections = ['live-to-repo', 'repo-to-live', 'status'];
  if (!direction || validDirections.indexOf(direction) === -1) {
    error('Usage: dynamo sync <live-to-repo|repo-to-live|status> [--dry-run] [--force]');
    return;
  }

  // Walk all sync pairs
  const pairResults = walkAllPairs();

  // --- Status ---
  if (direction === 'status') {
    const pairs = [];
    let totalRtl = 0, totalLtr = 0;
    for (const { pair, repoFiles, liveFiles } of pairResults) {
      const repoToLive = diffTrees(repoFiles, liveFiles, pair.repo, pair.live);
      const liveToRepo = diffTrees(liveFiles, repoFiles, pair.live, pair.repo);
      const rtl = repoToLive.toCopy.length + repoToLive.toDelete.length;
      const ltr = liveToRepo.toCopy.length + liveToRepo.toDelete.length;
      totalRtl += rtl;
      totalLtr += ltr;
      pairs.push({
        label: pair.label,
        repo_to_live: repoToLive,
        live_to_repo: liveToRepo
      });
    }

    const result = {
      command: 'sync',
      subcommand: 'status',
      pairs,
      last_sync: readLastSync()
    };

    if (pretty) {
      process.stderr.write('Sync Status\n');
      for (const { pair } of pairResults) {
        process.stderr.write('  ' + pair.label + ': ' + pair.repo + ' <-> ' + pair.live + '\n');
      }
      process.stderr.write('  Last sync: ' + (result.last_sync || 'never') + '\n');
      process.stderr.write('  repo -> live: ' + totalRtl + ' changes\n');
      process.stderr.write('  live -> repo: ' + totalLtr + ' changes\n');
    }

    output(result);
    return;
  }

  // --- Sync (live-to-repo or repo-to-live) ---
  // Aggregate diffs and conflicts across all pairs
  const allToCopy = [];    // { relPath, srcDir, dstDir }
  const allToDelete = [];  // { relPath, dstDir }
  const allConflicts = [];

  for (const { pair, repoFiles, liveFiles } of pairResults) {
    let srcDir, dstDir, srcFileMap, dstFileMap;
    if (direction === 'live-to-repo') {
      srcDir = pair.live;  dstDir = pair.repo;
      srcFileMap = liveFiles;  dstFileMap = repoFiles;
    } else {
      srcDir = pair.repo;  dstDir = pair.live;
      srcFileMap = repoFiles;  dstFileMap = liveFiles;
    }

    const diff = diffTrees(srcFileMap, dstFileMap, srcDir, dstDir);

    for (const f of diff.toCopy) {
      allToCopy.push({ relPath: f, srcDir, dstDir, label: pair.label });
    }
    for (const f of diff.toDelete) {
      allToDelete.push({ relPath: f, dstDir, label: pair.label });
    }

    // Conflict detection (unless --force or --dry-run)
    if (!force && !dryRun) {
      const conflicts = detectConflicts(srcDir, dstDir, srcFileMap, dstFileMap);
      for (const c of conflicts) {
        allConflicts.push(pair.label + '/' + c);
      }
    }
  }

  // Handle conflicts
  if (allConflicts.length > 0) {
    const result = {
      command: 'sync',
      subcommand: direction,
      status: 'conflict',
      conflicts: allConflicts,
      message: 'Both sides have changes. Use --force to override or --dry-run to preview.'
    };

    if (pretty) {
      process.stderr.write('CONFLICT: Both sides have changes.\n');
      for (const c of allConflicts) {
        process.stderr.write('  ' + c + '\n');
      }
      process.stderr.write('Use --force to override.\n');
    }

    output(result);
    return;
  }

  // Dry run
  if (dryRun) {
    const filesToCopy = allToCopy.map(f => f.label + '/' + f.relPath);
    const filesToDelete = allToDelete.map(f => f.label + '/' + f.relPath);
    const result = {
      command: 'sync',
      subcommand: direction,
      direction: direction,
      dry_run: true,
      files_to_copy: filesToCopy,
      files_to_delete: filesToDelete,
      files_copied: 0,
      files_deleted: 0,
      conflicts: []
    };

    if (pretty) {
      process.stderr.write('DRY RUN: ' + direction + '\n');
      if (filesToCopy.length) {
        process.stderr.write('  Would copy:\n');
        for (const f of filesToCopy) process.stderr.write('    + ' + f + '\n');
      }
      if (filesToDelete.length) {
        process.stderr.write('  Would delete:\n');
        for (const f of filesToDelete) process.stderr.write('    - ' + f + '\n');
      }
      if (!filesToCopy.length && !filesToDelete.length) {
        process.stderr.write('  (no changes)\n');
      }
    }

    output(result);
    return;
  }

  // Execute sync across all pairs
  for (const f of allToCopy) {
    const srcPath = path.join(f.srcDir, f.relPath);
    const dstPath = path.join(f.dstDir, f.relPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.copyFileSync(srcPath, dstPath);
  }
  for (const f of allToDelete) {
    const fullPath = path.join(f.dstDir, f.relPath);
    try { fs.unlinkSync(fullPath); } catch (e) { /* no-op */ }
  }
  writeLastSync();

  const result = {
    command: 'sync',
    subcommand: direction,
    direction: direction,
    dry_run: false,
    files_copied: allToCopy.length,
    files_deleted: allToDelete.length,
    conflicts: []
  };

  if (pretty) {
    process.stderr.write('Sync complete: ' + direction + '\n');
    process.stderr.write('  Copied: ' + allToCopy.length + ' files\n');
    process.stderr.write('  Deleted: ' + allToDelete.length + ' files\n');
  }

  output(result);
}

module.exports = { run, walkDir, diffTrees, detectConflicts, copyFiles, deleteFiles, SYNC_PAIRS };

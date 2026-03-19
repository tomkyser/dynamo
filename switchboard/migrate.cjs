// Dynamo > Switchboard > migrate.cjs
'use strict';

const path = require('path');
const fs = require('fs');

const resolve = require('../lib/resolve.cjs');

// --- Semver comparison (self-contained; no cross-switchboard imports per codebase convention) ---

/**
 * Compare two X.Y.Z version strings numerically.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {number} 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

// --- Migration filename pattern ---

const MIGRATION_PATTERN = /^(\d+\.\d+\.\d+)-to-(\d+\.\d+\.\d+)\.cjs$/;

// --- Discovery ---

/**
 * Discover migration scripts in the given directory that fall within the version range.
 * Returns migrations sorted by source version (numerically, not alphabetically).
 *
 * @param {string} fromVersion - Current version (inclusive lower bound for migration source)
 * @param {string} toVersion - Target version (inclusive upper bound for migration target)
 * @param {string} [migrationsDir] - Directory containing migration scripts
 * @returns {Array<{from: string, to: string, path: string}>} Sorted migration descriptors
 */
function discoverMigrations(fromVersion, toVersion, migrationsDir) {
  migrationsDir = migrationsDir || path.join(__dirname, '..', 'dynamo', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir);
  const migrations = [];

  for (const file of files) {
    const match = file.match(MIGRATION_PATTERN);
    if (!match) continue;

    const migFrom = match[1];
    const migTo = match[2];

    // Include only migrations where:
    //   migFrom >= fromVersion  AND  migTo <= toVersion
    if (compareVersions(migFrom, fromVersion) >= 0 && compareVersions(migTo, toVersion) <= 0) {
      migrations.push({
        from: migFrom,
        to: migTo,
        path: path.join(migrationsDir, file)
      });
    }
  }

  // Sort by source version numerically
  migrations.sort((a, b) => compareVersions(a.from, b.from));

  return migrations;
}

// --- Execution ---

/**
 * Execute migration scripts in sequence from fromVersion to toVersion.
 * Aborts on first failure and returns error details.
 *
 * @param {string} fromVersion - Current version
 * @param {string} toVersion - Target version
 * @param {object} [options] - Execution options
 * @param {string} [options.migrationsDir] - Directory containing migration scripts
 * @param {string} [options.configPath] - Path to config.json (for test isolation)
 * @param {string} [options.settingsPath] - Path to settings.json (for test isolation)
 * @returns {Promise<{success: boolean, applied?: number, failedAt?: {from: string, to: string}, error?: string}>}
 */
async function runMigrations(fromVersion, toVersion, options = {}) {
  const migrations = discoverMigrations(fromVersion, toVersion, options.migrationsDir);

  if (migrations.length === 0) {
    return { success: true, applied: 0 };
  }

  for (const migration of migrations) {
    const mod = require(migration.path);
    try {
      await mod.migrate({
        configPath: options.configPath,
        settingsPath: options.settingsPath
      });
    } catch (e) {
      return {
        success: false,
        failedAt: { from: migration.from, to: migration.to },
        error: e.message
      };
    }
  }

  return { success: true, applied: migrations.length };
}

// --- Exports ---

module.exports = { discoverMigrations, runMigrations, compareVersions };

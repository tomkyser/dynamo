'use strict';

const { ok, err } = require('../../../lib/result.cjs');

/**
 * Forge versioning module — GitHub Releases API integration and semver comparison.
 *
 * Provides version parsing, comparison, release fetching, and release creation
 * using the GitHub REST API via the built-in fetch() API (zero dependencies).
 *
 * Design decision (D-12): Forge-based with GitHub REST API. Master branch creates
 * vX.Y.Z releases. Dev branch creates dev-X.Y.Z pre-releases. Auth token sourced
 * exclusively from environment variables (never config.json).
 *
 * Version format support:
 *   - Plain:     1.2.3
 *   - v-prefix:  v1.2.3
 *   - dev:       dev-1.2.3
 *   - D. tag:    D.1.2.3
 *   - dev--:     dev--1.2.3
 *
 * @module core/services/forge/versioning
 */

/**
 * Parses a version string into its semver components.
 *
 * Strips known prefixes (v, V, dev-, dev--, D.) before splitting on '.'.
 *
 * @param {string} str - Version string to parse
 * @returns {{ major: number, minor: number, patch: number }}
 */
function parseVersion(str) {
  // Strip leading prefixes: 'v', 'V', 'dev-', 'dev--', 'D.'
  const clean = str.replace(/^(dev--|dev-|[vVD]\.?)/, '');
  const parts = clean.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Compares two semver version strings.
 *
 * @param {string} a - First version string
 * @param {string} b - Second version string
 * @returns {-1|0|1} -1 if a < b, 0 if equal, 1 if a > b
 */
function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

/**
 * Fetches the latest release from a GitHub repository.
 *
 * Uses the GitHub REST API v3. Auth token is optional for public repos but
 * required for private repos and to avoid rate limits.
 *
 * @param {string} owner - Repository owner (user or org)
 * @param {string} repo - Repository name
 * @returns {Promise<import('../../../lib/result.cjs').Result<{tag: string, version: string, url: string, name: string, prerelease: boolean}>>}
 */
async function getLatestRelease(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'dynamo-platform',
  };

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const resp = await fetch(url, { headers });

    if (resp.status === 404) {
      return err('RELEASE_NOT_FOUND', 'No releases found');
    }

    if (!resp.ok) {
      return err('RELEASE_FETCH_FAILED', `GitHub API returned ${resp.status}`);
    }

    const data = await resp.json();
    return ok({
      tag: data.tag_name,
      version: data.tag_name.replace(/^v/, ''),
      url: data.html_url,
      name: data.name,
      prerelease: data.prerelease,
    });
  } catch (e) {
    return err('RELEASE_FETCH_FAILED', `Network error: ${e.message}`);
  }
}

/**
 * Creates a new release on a GitHub repository.
 *
 * Requires a GH_TOKEN or GITHUB_TOKEN environment variable for authentication.
 * Token is never read from config files — environment only.
 *
 * @param {string} owner - Repository owner (user or org)
 * @param {string} repo - Repository name
 * @param {string} tag - Tag name for the release (e.g., 'v1.0.0')
 * @param {Object} [options={}] - Release options
 * @param {string} [options.name] - Release title (defaults to tag)
 * @param {string} [options.body] - Release description markdown
 * @param {boolean} [options.prerelease] - Whether this is a pre-release
 * @param {boolean} [options.draft] - Whether to create as draft
 * @returns {Promise<import('../../../lib/result.cjs').Result<{tag: string, url: string, id: number}>>}
 */
async function createRelease(owner, repo, tag, options = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return err(
      'NO_AUTH_TOKEN',
      'GH_TOKEN or GITHUB_TOKEN environment variable required for creating releases'
    );
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/releases`;

  const body = {
    tag_name: tag,
    name: options.name || tag,
    body: options.body || '',
    prerelease: options.prerelease || false,
    draft: options.draft || false,
  };

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'dynamo-platform',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return err('RELEASE_CREATE_FAILED', `GitHub API returned ${resp.status}`);
    }

    const data = await resp.json();
    return ok({
      tag: data.tag_name,
      url: data.html_url,
      id: data.id,
    });
  } catch (e) {
    return err('RELEASE_CREATE_FAILED', `Network error: ${e.message}`);
  }
}

/**
 * Checks whether a newer version is available by comparing local vs remote versions.
 *
 * @param {string} localVersion - Currently installed version
 * @param {string} remoteVersion - Latest available version
 * @returns {boolean} true if remoteVersion is newer than localVersion
 */
function isNewerAvailable(localVersion, remoteVersion) {
  return compareVersions(localVersion, remoteVersion) < 0;
}

module.exports = { parseVersion, compareVersions, getLatestRelease, createRelease, isNewerAvailable };

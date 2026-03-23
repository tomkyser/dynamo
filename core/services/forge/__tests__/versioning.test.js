'use strict';

const { describe, it, expect, beforeEach, afterEach, mock } = require('bun:test');

describe('parseVersion', () => {
  const { parseVersion } = require('../versioning.cjs');

  it('parses plain semver string', () => {
    const v = parseVersion('1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('parses v-prefixed version', () => {
    const v = parseVersion('v1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('parses dev-prefixed version', () => {
    const v = parseVersion('dev-1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('parses D. tag-prefixed version', () => {
    const v = parseVersion('D.1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('handles version with only major.minor', () => {
    const v = parseVersion('1.2');
    expect(v).toEqual({ major: 1, minor: 2, patch: 0 });
  });
});

describe('compareVersions', () => {
  const { compareVersions } = require('../versioning.cjs');

  it('returns -1 when a < b (patch)', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('returns 1 when a > b (major)', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
  });

  it('returns 0 when versions are equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('handles v prefix', () => {
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
  });

  it('handles dev prefix', () => {
    expect(compareVersions('dev-1.0.0', 'dev-1.0.1')).toBe(-1);
  });

  it('compares minor versions correctly', () => {
    expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
    expect(compareVersions('1.3.0', '1.2.0')).toBe(1);
  });
});

describe('getLatestRelease', () => {
  const { getLatestRelease } = require('../versioning.cjs');

  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ok with release info on successful fetch', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            tag_name: 'v1.0.1',
            html_url: 'https://github.com/owner/repo/releases/tag/v1.0.1',
            name: 'Release v1.0.1',
            prerelease: false,
          }),
      })
    );

    const result = await getLatestRelease('owner', 'repo');
    expect(result.ok).toBe(true);
    expect(result.value.tag).toBe('v1.0.1');
    expect(result.value.version).toBe('1.0.1');
    expect(result.value.url).toBe('https://github.com/owner/repo/releases/tag/v1.0.1');
    expect(result.value.prerelease).toBe(false);
  });

  it('returns err RELEASE_NOT_FOUND on 404', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      })
    );

    const result = await getLatestRelease('owner', 'nonexistent');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('RELEASE_NOT_FOUND');
  });

  it('returns err RELEASE_FETCH_FAILED on network error', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Network timeout')));

    const result = await getLatestRelease('owner', 'repo');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('RELEASE_FETCH_FAILED');
    expect(result.error.message).toContain('Network timeout');
  });

  it('returns err RELEASE_FETCH_FAILED on non-404 HTTP error', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    const result = await getLatestRelease('owner', 'repo');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('RELEASE_FETCH_FAILED');
    expect(result.error.message).toContain('500');
  });
});

describe('createRelease', () => {
  const { createRelease } = require('../versioning.cjs');

  let originalFetch;
  let originalEnv;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    // Restore env
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    if (originalEnv.GH_TOKEN) process.env.GH_TOKEN = originalEnv.GH_TOKEN;
    if (originalEnv.GITHUB_TOKEN) process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN;
  });

  it('returns err NO_AUTH_TOKEN without auth token', async () => {
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;

    const result = await createRelease('owner', 'repo', 'v1.0.0');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('NO_AUTH_TOKEN');
  });

  it('returns ok with release info on successful POST', async () => {
    process.env.GH_TOKEN = 'test-token-123';

    globalThis.fetch = mock((url, opts) => {
      expect(opts.method).toBe('POST');
      expect(opts.headers['Authorization']).toBe('Bearer test-token-123');
      const body = JSON.parse(opts.body);
      expect(body.tag_name).toBe('v1.0.0');

      return Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            tag_name: 'v1.0.0',
            html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
            id: 12345,
          }),
      });
    });

    const result = await createRelease('owner', 'repo', 'v1.0.0');
    expect(result.ok).toBe(true);
    expect(result.value.tag).toBe('v1.0.0');
    expect(result.value.url).toBe('https://github.com/owner/repo/releases/tag/v1.0.0');
    expect(result.value.id).toBe(12345);
  });

  it('sets prerelease flag in request body when option provided', async () => {
    process.env.GH_TOKEN = 'test-token-123';

    globalThis.fetch = mock((url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.prerelease).toBe(true);

      return Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            tag_name: 'dev-1.0.0',
            html_url: 'https://github.com/owner/repo/releases/tag/dev-1.0.0',
            id: 12346,
          }),
      });
    });

    const result = await createRelease('owner', 'repo', 'dev-1.0.0', { prerelease: true });
    expect(result.ok).toBe(true);
  });

  it('returns err RELEASE_CREATE_FAILED on HTTP error', async () => {
    process.env.GH_TOKEN = 'test-token-123';

    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 422,
      })
    );

    const result = await createRelease('owner', 'repo', 'v1.0.0');
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('RELEASE_CREATE_FAILED');
  });
});

describe('isNewerAvailable', () => {
  const { isNewerAvailable } = require('../versioning.cjs');

  it('returns true when remote is newer', () => {
    expect(isNewerAvailable('1.0.0', '1.0.1')).toBe(true);
  });

  it('returns false when local is newer', () => {
    expect(isNewerAvailable('1.0.1', '1.0.0')).toBe(false);
  });

  it('returns false when versions are equal', () => {
    expect(isNewerAvailable('1.0.0', '1.0.0')).toBe(false);
  });
});

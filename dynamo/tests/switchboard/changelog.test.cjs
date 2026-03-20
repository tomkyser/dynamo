// Dynamo > Tests > Switchboard > changelog.test.cjs
'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MOD_PATH = path.join(__dirname, '..', '..', '..', 'subsystems', 'switchboard', 'update-check.cjs');
const { readChangelog } = require(MOD_PATH);

describe('readChangelog', () => {
  let tmpDir, changelogPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-changelog-'));
    changelogPath = path.join(tmpDir, 'CHANGELOG.md');
    fs.writeFileSync(changelogPath, [
      '# Changelog',
      '',
      '## [Unreleased]',
      '',
      '## [2.0.0] - 2026-04-01',
      '',
      '### Added',
      '- Feature X',
      '',
      '## [1.3.0] - 2026-03-20',
      '',
      '### Added',
      '- Feature Y',
      '',
      '## [1.2.0] - 2026-03-18',
      '',
      '### Fixed',
      '- Bug Z',
      ''
    ].join('\n'));
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts entries between current and latest', () => {
    const result = readChangelog('1.2.0', '2.0.0', { changelogPath });
    assert.ok(result.includes('Feature X'));
    assert.ok(result.includes('Feature Y'));
    assert.ok(!result.includes('Bug Z'));
  });

  it('returns empty string when file not found', () => {
    const result = readChangelog('1.0.0', '2.0.0', { changelogPath: '/nonexistent' });
    assert.strictEqual(result, '');
  });

  it('returns empty string when versions not found', () => {
    const result = readChangelog('0.5.0', '0.6.0', { changelogPath });
    assert.strictEqual(result, '');
  });

  it('extracts single version entry', () => {
    const result = readChangelog('1.2.0', '1.3.0', { changelogPath });
    assert.ok(result.includes('Feature Y'));
    assert.ok(!result.includes('Feature X'));
    assert.ok(!result.includes('Bug Z'));
  });

  it('returns empty string when current equals latest', () => {
    const result = readChangelog('2.0.0', '2.0.0', { changelogPath });
    assert.strictEqual(result, '');
  });
});

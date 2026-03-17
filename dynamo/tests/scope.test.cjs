// Dynamo > Tests > scope.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { SCOPE, SCOPE_PATTERN, validateGroupId, sanitize } = require(path.join(__dirname, '..', 'lib', 'ledger', 'scope.cjs'));

describe('SCOPE', () => {
  it('SCOPE.global equals "global"', () => {
    assert.strictEqual(SCOPE.global, 'global');
  });

  it('SCOPE.project("my-project") returns "project-my-project"', () => {
    assert.strictEqual(SCOPE.project('my-project'), 'project-my-project');
  });

  it('SCOPE.session("2026-01-01") returns "session-2026-01-01"', () => {
    assert.strictEqual(SCOPE.session('2026-01-01'), 'session-2026-01-01');
  });

  it('SCOPE.task("fix-auth") returns "task-fix-auth"', () => {
    assert.strictEqual(SCOPE.task('fix-auth'), 'task-fix-auth');
  });

  it('SCOPE.project sanitizes spaces to dashes', () => {
    assert.strictEqual(SCOPE.project('my project'), 'project-my-project');
  });
});

describe('SCOPE_PATTERN', () => {
  it('matches alphanumeric, dashes, and underscores', () => {
    assert.ok(SCOPE_PATTERN.test('global'));
    assert.ok(SCOPE_PATTERN.test('project-my-project'));
    assert.ok(SCOPE_PATTERN.test('session_123'));
    assert.ok(SCOPE_PATTERN.test('task-fix-auth'));
  });

  it('rejects colons', () => {
    assert.ok(!SCOPE_PATTERN.test('project:bad'));
  });

  it('rejects spaces', () => {
    assert.ok(!SCOPE_PATTERN.test('has space'));
  });
});

describe('validateGroupId', () => {
  it('accepts "global"', () => {
    assert.strictEqual(validateGroupId('global'), 'global');
  });

  it('accepts "project-test"', () => {
    assert.strictEqual(validateGroupId('project-test'), 'project-test');
  });

  it('accepts "session-123"', () => {
    assert.strictEqual(validateGroupId('session-123'), 'session-123');
  });

  it('rejects string containing colon', () => {
    assert.throws(
      () => validateGroupId('project:bad'),
      /contains characters outside/
    );
  });

  it('rejects empty string', () => {
    assert.throws(
      () => validateGroupId(''),
      /non-empty string/
    );
  });

  it('rejects non-string input (number)', () => {
    assert.throws(
      () => validateGroupId(42),
      /non-empty string/
    );
  });

  it('rejects non-string input (null)', () => {
    assert.throws(
      () => validateGroupId(null),
      /non-empty string/
    );
  });

  it('rejects non-string input (undefined)', () => {
    assert.throws(
      () => validateGroupId(undefined),
      /non-empty string/
    );
  });
});

describe('sanitize', () => {
  it('replaces spaces with dashes', () => {
    assert.strictEqual(sanitize('hello world'), 'hello-world');
  });

  it('strips leading/trailing dashes', () => {
    assert.strictEqual(sanitize('-hello-'), 'hello');
  });

  it('collapses multiple dashes', () => {
    assert.strictEqual(sanitize('hello---world'), 'hello-world');
  });

  it('returns "unknown" for empty result', () => {
    assert.strictEqual(sanitize('!!!'), 'unknown');
  });

  it('preserves underscores', () => {
    assert.strictEqual(sanitize('hello_world'), 'hello_world');
  });

  it('handles mixed special characters', () => {
    assert.strictEqual(sanitize('my@project#name'), 'my-project-name');
  });
});

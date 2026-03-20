// Dynamo > Tests > Reverie > dual-path.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const DUAL_PATH = path.join(__dirname, '..', '..', '..', 'subsystems', 'reverie', 'dual-path.cjs');

describe('Dual-Path Module', () => {

  // --- selectPath (PATH-01) ---

  describe('selectPath', () => {
    it('returns deliberation when explicitRecall is true regardless of other signals', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ explicitRecall: true, rateLimited: true, semanticShiftScore: 0.1 });
      assert.strictEqual(result, 'deliberation');
    });

    it('returns hot when rateLimited is true (except skip)', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ rateLimited: true, semanticShiftScore: 0.9, entityConfidence: 0.1 });
      assert.strictEqual(result, 'hot');
    });

    it('returns deliberation when semanticShiftScore exceeds shiftThreshold', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ semanticShiftScore: 0.5, shiftThreshold: 0.4 });
      assert.strictEqual(result, 'deliberation');
    });

    it('returns hot when semanticShiftScore is below shiftThreshold', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ semanticShiftScore: 0.3, shiftThreshold: 0.4 });
      assert.strictEqual(result, 'hot');
    });

    it('returns deliberation when entityConfidence is below confidenceThreshold', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ entityConfidence: 0.5, confidenceThreshold: 0.7 });
      assert.strictEqual(result, 'deliberation');
    });

    it('returns hot when entityConfidence is above confidenceThreshold', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ entityConfidence: 0.9 });
      assert.strictEqual(result, 'hot');
    });

    it('returns skip when needsInjection is false', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ needsInjection: false });
      assert.strictEqual(result, 'skip');
    });

    it('returns skip when predictionsMatch is true per D-12', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ predictionsMatch: true });
      assert.strictEqual(result, 'skip');
    });

    it('uses default shiftThreshold of 0.4 when not provided in options', () => {
      const { selectPath } = require(DUAL_PATH);
      // 0.5 > 0.4 default => deliberation
      const result = selectPath({ semanticShiftScore: 0.5 });
      assert.strictEqual(result, 'deliberation');
    });

    it('uses default confidenceThreshold of 0.7 when not provided in options', () => {
      const { selectPath } = require(DUAL_PATH);
      // 0.5 < 0.7 default => deliberation
      const result = selectPath({ entityConfidence: 0.5 });
      assert.strictEqual(result, 'deliberation');
    });

    it('returns hot as default when no signals trigger other paths', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ entityConfidence: 0.9, needsInjection: true });
      assert.strictEqual(result, 'hot');
    });

    it('predictionsMatch takes priority over explicitRecall (D-12 first in chain)', () => {
      const { selectPath } = require(DUAL_PATH);
      const result = selectPath({ predictionsMatch: true, explicitRecall: true });
      assert.strictEqual(result, 'skip');
    });
  });

  // --- detectSemanticShift (D-10, IV-09) ---

  describe('detectSemanticShift', () => {
    it('returns shifted false with overlapScore 1.0 when previousEntities is empty', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      const result = detectSemanticShift([{ name: 'config' }], []);
      assert.strictEqual(result.shifted, false);
      assert.strictEqual(result.overlapScore, 1.0);
    });

    it('returns high overlap for identical entity sets (>= 0.7)', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      const entities = [{ name: 'config' }, { name: 'deploy' }, { name: 'handler' }];
      const result = detectSemanticShift(entities, entities);
      assert.ok(result.overlapScore >= 0.7, `Overlap should be >= 0.7 for identical sets, got ${result.overlapScore}`);
      assert.strictEqual(result.shifted, false);
    });

    it('returns overlap near 0 and shifted true for completely different entity sets', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      const current = [{ name: 'alpha' }, { name: 'beta' }];
      const previous = [{ name: 'gamma' }, { name: 'delta' }];
      const result = detectSemanticShift(current, previous);
      assert.ok(result.overlapScore < 0.1, `Overlap should be near 0, got ${result.overlapScore}`);
      assert.strictEqual(result.shifted, true);
    });

    it('returns shifted false for partial overlap (30% shared) with default threshold 0.3', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      // 3 shared out of 10 unique = 0.3 overlap = NOT shifted (threshold is <0.3)
      const current = [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }];
      const previous = [{ name: 'c' }, { name: 'd' }, { name: 'e' }, { name: 'f' }, { name: 'g' }];
      // union = {a,b,c,d,e,f,g} = 7, intersection = {c,d,e} = 3, overlap = 3/7 ≈ 0.43
      const result = detectSemanticShift(current, previous);
      assert.strictEqual(result.shifted, false, 'Should not be shifted with overlap ~0.43 and threshold 0.3');
    });

    it('returns shifted true for low overlap (20% shared) with default threshold 0.3', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      // 1 shared out of 9 unique = ~0.11 overlap => shifted (below 0.3 threshold)
      const current = [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }];
      const previous = [{ name: 'e' }, { name: 'f' }, { name: 'g' }, { name: 'h' }, { name: 'i' }];
      // union = {a,b,c,d,e,f,g,h,i} = 9, intersection = {e} = 1, overlap = 1/9 ≈ 0.11
      const result = detectSemanticShift(current, previous);
      assert.strictEqual(result.shifted, true, 'Should be shifted with overlap ~0.11 and threshold 0.3');
    });

    it('is case-insensitive for entity name comparison', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      const current = [{ name: 'Config' }];
      const previous = [{ name: 'config' }];
      const result = detectSemanticShift(current, previous);
      assert.strictEqual(result.overlapScore, 1.0, 'Case-insensitive: Config and config should fully overlap');
      assert.strictEqual(result.shifted, false);
    });

    it('handles null previousEntities like empty array', () => {
      const { detectSemanticShift } = require(DUAL_PATH);
      const result = detectSemanticShift([{ name: 'a' }], null);
      assert.strictEqual(result.shifted, false);
      assert.strictEqual(result.overlapScore, 1.0);
    });
  });

  // --- detectExplicitRecall (D-11, IV-11) ---

  describe('detectExplicitRecall', () => {
    it('detects "do you remember the auth module?"', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('do you remember the auth module?'), true);
    });

    it('detects "what do you know about Dynamo?"', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('what do you know about Dynamo?'), true);
    });

    it('detects "have we discussed the config schema?"', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('have we discussed the config schema?'), true);
    });

    it('detects "remember when we fixed the dispatcher?"', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('remember when we fixed the dispatcher?'), true);
    });

    it('returns false for "implement the feature" (no recall pattern)', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('implement the feature'), false);
    });

    it('returns false for "create a remember function" (different context)', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('create a remember function'), false);
    });

    it('detects "recall the auth discussion"', () => {
      const { detectExplicitRecall } = require(DUAL_PATH);
      assert.strictEqual(detectExplicitRecall('recall the auth discussion'), true);
    });
  });

  // --- estimateTokens (IV-05) ---

  describe('estimateTokens', () => {
    it('returns 0 for empty string', () => {
      const { estimateTokens } = require(DUAL_PATH);
      assert.strictEqual(estimateTokens(''), 0);
    });

    it('returns approximately 2-3 for "hello world"', () => {
      const { estimateTokens } = require(DUAL_PATH);
      const result = estimateTokens('hello world');
      // "hello world" is 11 chars, ceil(11/4) = 3
      assert.ok(result >= 2 && result <= 3, `Expected 2-3, got ${result}`);
    });

    it('returns approximately 100 for 400-char string', () => {
      const { estimateTokens } = require(DUAL_PATH);
      const text = 'a'.repeat(400);
      const result = estimateTokens(text);
      assert.strictEqual(result, 100);
    });
  });

  // --- truncateToTokenLimit (IV-05) ---

  describe('truncateToTokenLimit', () => {
    it('returns text unchanged when within token limit', () => {
      const { truncateToTokenLimit } = require(DUAL_PATH);
      const text = 'short text';
      const result = truncateToTokenLimit(text, 100);
      assert.strictEqual(result, text);
    });

    it('truncates long text at sentence boundary', () => {
      const { truncateToTokenLimit } = require(DUAL_PATH);
      const text = 'First sentence. Second sentence. Third sentence is much longer and goes on and on.';
      // limit=10 => 40 chars target. "First sentence. Second sentence. " is ~33 chars
      const result = truncateToTokenLimit(text, 10);
      assert.ok(result.endsWith('.'), `Truncated text should end with period, got: "${result}"`);
      assert.ok(result.length <= 44, `Truncated text should be roughly limited, got ${result.length} chars`);
    });

    it('truncates at word boundary when no sentence boundary found', () => {
      const { truncateToTokenLimit } = require(DUAL_PATH);
      const text = 'one two three four five six seven eight nine ten eleven twelve thirteen';
      // limit=5 => 20 chars target, but no sentence boundary
      const result = truncateToTokenLimit(text, 5);
      assert.ok(result.length <= 24, `Truncated text should be limited, got ${result.length}`);
      assert.ok(!result.endsWith(' '), `Should not end with space, got: "${result}"`);
    });
  });

  // --- formatHotPathInjection (D-01, D-02, D-03) ---

  describe('formatHotPathInjection', () => {
    it('formats entities with contextual narrative tone', () => {
      const { formatHotPathInjection } = require(DUAL_PATH);
      const crossed = [
        { id: 'config', level: 0.8 }
      ];
      const state = {
        activation_map: {
          'config': {
            level: 0.8,
            sources: ['direct_mention'],
            last_activated: new Date().toISOString(),
            convergence_count: 2
          }
        }
      };
      const result = formatHotPathInjection(crossed, state);
      assert.ok(result !== null, 'Should return non-null for qualifying entities');
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.length > 0, 'Should return non-empty string');
    });

    it('wraps facts with adversarial framing qualifiers per D-03', () => {
      const { formatHotPathInjection } = require(DUAL_PATH);
      const crossed = [
        { id: 'dynamo', level: 0.9 }
      ];
      const state = {
        activation_map: {
          'dynamo': {
            level: 0.9,
            sources: ['direct_mention'],
            last_activated: new Date().toISOString(),
            convergence_count: 1
          }
        }
      };
      const result = formatHotPathInjection(crossed, state);
      assert.ok(result !== null, 'Should return non-null');
      const hasFraming = result.includes('from your experience') || result.includes('as you described it');
      assert.ok(hasFraming, `Should contain adversarial framing, got: "${result}"`);
    });

    it('respects token limit parameter', () => {
      const { formatHotPathInjection, estimateTokens } = require(DUAL_PATH);
      const crossed = [];
      for (let i = 0; i < 20; i++) {
        crossed.push({ id: `entity${i}`, level: 0.9 });
      }
      const state = { activation_map: {} };
      for (let i = 0; i < 20; i++) {
        state.activation_map[`entity${i}`] = {
          level: 0.9,
          sources: ['direct_mention'],
          last_activated: new Date().toISOString(),
          convergence_count: 1
        };
      }
      const result = formatHotPathInjection(crossed, state, { tokenLimit: 50 });
      if (result) {
        const tokens = estimateTokens(result);
        assert.ok(tokens <= 55, `Should respect token limit ~50, got ${tokens}`);
      }
    });

    it('returns null when no entities cross threshold', () => {
      const { formatHotPathInjection } = require(DUAL_PATH);
      const result = formatHotPathInjection([], {});
      assert.strictEqual(result, null);
    });
  });

  // --- adjustThreshold (D-09) ---

  describe('adjustThreshold', () => {
    it('returns currentThreshold when injection_history has fewer than 3 entries', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      const result = adjustThreshold(0.6, [{ acknowledged: true }, { acknowledged: false }]);
      assert.strictEqual(result, 0.6);
    });

    it('lowers threshold when acknowledgment rate > 0.7', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      const history = [
        { acknowledged: true }, { acknowledged: true }, { acknowledged: true },
        { acknowledged: true }, { acknowledged: false }
      ];
      // 4/5 = 0.8 > 0.7 => lower by 0.02
      const result = adjustThreshold(0.6, history);
      assert.ok(Math.abs(result - 0.58) < 0.001, `Should lower to ~0.58, got ${result}`);
    });

    it('raises threshold when acknowledgment rate < 0.3', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      const history = [
        { acknowledged: false }, { acknowledged: false }, { acknowledged: false },
        { acknowledged: false }, { acknowledged: true }
      ];
      // 1/5 = 0.2 < 0.3 => raise by 0.02
      const result = adjustThreshold(0.6, history);
      assert.ok(Math.abs(result - 0.62) < 0.001, `Should raise to ~0.62, got ${result}`);
    });

    it('never goes below 0.3', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      const history = [
        { acknowledged: true }, { acknowledged: true }, { acknowledged: true },
        { acknowledged: true }, { acknowledged: true }
      ];
      const result = adjustThreshold(0.3, history);
      assert.ok(result >= 0.3, `Should never go below 0.3, got ${result}`);
    });

    it('never goes above 0.9', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      const history = [
        { acknowledged: false }, { acknowledged: false }, { acknowledged: false },
        { acknowledged: false }, { acknowledged: false }
      ];
      const result = adjustThreshold(0.9, history);
      assert.ok(result <= 0.9, `Should never go above 0.9, got ${result}`);
    });

    it('does not change threshold when acknowledgment rate is between 0.3 and 0.7', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      const history = [
        { acknowledged: true }, { acknowledged: false }, { acknowledged: true },
        { acknowledged: false }, { acknowledged: true }
      ];
      // 3/5 = 0.6 => no change
      const result = adjustThreshold(0.6, history);
      assert.strictEqual(result, 0.6);
    });

    it('respects recentWindow option', () => {
      const { adjustThreshold } = require(DUAL_PATH);
      // 10 total entries but recentWindow=5 means only last 5 matter
      const history = [
        { acknowledged: true }, { acknowledged: true }, { acknowledged: true },
        { acknowledged: true }, { acknowledged: true },
        // last 5: all false => rate 0.0 < 0.3 => raise
        { acknowledged: false }, { acknowledged: false }, { acknowledged: false },
        { acknowledged: false }, { acknowledged: false }
      ];
      const result = adjustThreshold(0.6, history, { recentWindow: 5 });
      assert.ok(Math.abs(result - 0.62) < 0.001, `Should raise to 0.62 based on recent window, got ${result}`);
    });
  });

  // --- Module Exports ---

  describe('Module Exports', () => {
    it('exports all required functions', () => {
      const mod = require(DUAL_PATH);
      const expectedExports = [
        'selectPath', 'detectSemanticShift', 'detectExplicitRecall',
        'estimateTokens', 'truncateToTokenLimit', 'formatHotPathInjection',
        'adjustThreshold'
      ];
      for (const name of expectedExports) {
        assert.ok(typeof mod[name] === 'function', `Module should export ${name} as a function`);
      }
    });
  });
});

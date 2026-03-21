// Dynamo > Tests > Reverie > activation.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ACTIVATION_PATH = path.join(__dirname, '..', '..', '..', 'subsystems', 'reverie', 'activation.cjs');

describe('Activation Module', () => {

  // --- Entity Extraction (IV-02) ---

  describe('Entity Extraction', () => {
    it('extracts file paths from text', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('Check ./src/app.ts for errors');
      const filePath = results.find(e => e.type === 'filePaths');
      assert.ok(filePath, 'Should find a file path entity');
      assert.ok(filePath.name.includes('src/app.ts'), `File path should contain src/app.ts, got: ${filePath.name}`);
    });

    it('extracts function names from text', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('function loadConfig() runs');
      const fn = results.find(e => e.name === 'loadConfig' && e.type === 'functionNames');
      assert.ok(fn, 'Should find loadConfig as a function name');
    });

    it('extracts class names from text', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('The MCPClient class is used');
      const cls = results.find(e => e.name === 'MCPClient' && e.type === 'classNames');
      assert.ok(cls, 'Should find MCPClient as a class name');
    });

    it('extracts project names from text', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('dynamo handles Reverie hooks');
      const dynamo = results.find(e => e.name.toLowerCase() === 'dynamo' && e.type === 'projectNames');
      const reverie = results.find(e => e.name.toLowerCase() === 'reverie' && e.type === 'projectNames');
      assert.ok(dynamo, 'Should find dynamo as a project name');
      assert.ok(reverie, 'Should find reverie as a project name');
    });

    it('extracts technical terms from text', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('Fix the handler dispatch error');
      const handler = results.find(e => e.name.toLowerCase() === 'handler');
      const dispatch = results.find(e => e.name.toLowerCase() === 'dispatch');
      assert.ok(handler, 'Should find handler as a technical term');
      assert.ok(dispatch, 'Should find dispatch as a technical term');
    });

    it('completes entity extraction in under 5ms for 1000-char prompt', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      // Generate a realistic 1000-char engineering prompt
      const base = 'We need to implement the loadConfig() function in ./src/config/loader.ts to handle the MCPClient class initialization. ' +
        'The dynamo subsystem requires reverie to process hooks and dispatch activation events. ' +
        'Check the handler for sublimation injection patterns. Fix the error in the session state module. ' +
        'The deployment pipeline needs to compile the migration scripts before running the schema update. ' +
        'Consider refactoring the entity extraction to use a more efficient pattern matching algorithm. ';
      const prompt = base.repeat(3);
      assert.ok(prompt.length >= 1000, `Prompt should be >= 1000 chars, got ${prompt.length}`);

      // Warm up
      extractEntities(prompt);

      const start = performance.now();
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        extractEntities(prompt);
      }
      const elapsed = (performance.now() - start) / iterations;
      assert.ok(elapsed < 5, `Entity extraction should complete in under 5ms, took ${elapsed.toFixed(2)}ms`);
    });

    it('returns empty array for empty string', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('');
      assert.deepStrictEqual(results, []);
    });

    it('returns empty array for non-technical content', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('hello world');
      assert.deepStrictEqual(results, []);
    });

    it('increments count field for repeated occurrences', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const results = extractEntities('dynamo uses dynamo config and dynamo hooks');
      const dynamo = results.find(e => e.name.toLowerCase() === 'dynamo');
      assert.ok(dynamo, 'Should find dynamo');
      assert.ok(dynamo.count >= 3, `Count should be >= 3 for repeated dynamo, got ${dynamo.count}`);
    });

    it('strips system-reminder tags before extraction', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const input = 'fix the bug <system-reminder>UserPromptSubmit hook success: /private/tmp/claude-503/tasks/abc.output completed users library mobile</system-reminder>';
      const results = extractEntities(input);
      const paths = results.filter(e => e.type === 'filePaths' && e.name.includes('/private/tmp'));
      assert.strictEqual(paths.length, 0, 'Should not extract file paths from system-reminder blocks');
      const completed = results.find(e => e.name === 'completed');
      assert.strictEqual(completed, undefined, 'Should not extract "completed" from system-reminder');
    });

    it('strips task-notification tags before extraction', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const input = 'look at this <task-notification><output-file>/private/tmp/tasks/xyz.output</output-file><status>completed</status></task-notification>';
      const results = extractEntities(input);
      const paths = results.filter(e => e.type === 'filePaths' && e.name.includes('/private/tmp'));
      assert.strictEqual(paths.length, 0, 'Should not extract paths from task-notification');
    });

    it('strips dynamo-memory-context tags before extraction', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const input = 'check the config <dynamo-memory-context source="dynamo-hooks">From your experience, "completed" has come up repeatedly (7 times).</dynamo-memory-context>';
      const results = extractEntities(input);
      const completed = results.find(e => e.name === 'completed');
      assert.strictEqual(completed, undefined, 'Should not extract entities from dynamo-memory-context');
      const config = results.find(e => e.name.toLowerCase() === 'config');
      assert.ok(config, 'Should still extract entities from user text outside tags');
    });

    it('preserves user text around stripped system blocks', () => {
      const { extractEntities } = require(ACTIVATION_PATH);
      const input = 'fix dynamo <system-reminder>noise noise noise</system-reminder> and check reverie';
      const results = extractEntities(input);
      const dynamo = results.find(e => e.name.toLowerCase() === 'dynamo');
      const reverie = results.find(e => e.name.toLowerCase() === 'reverie');
      assert.ok(dynamo, 'Should extract dynamo from before the tag');
      assert.ok(reverie, 'Should extract reverie from after the tag');
    });
  });

  // --- stripSystemTags ---

  describe('stripSystemTags', () => {
    it('is exported from the module', () => {
      const { stripSystemTags } = require(ACTIVATION_PATH);
      assert.strictEqual(typeof stripSystemTags, 'function');
    });

    it('returns text unchanged when no system tags present', () => {
      const { stripSystemTags } = require(ACTIVATION_PATH);
      const input = 'just a normal prompt about dynamo';
      assert.strictEqual(stripSystemTags(input), input);
    });

    it('strips nested tags within system-reminder', () => {
      const { stripSystemTags } = require(ACTIVATION_PATH);
      const input = 'before <system-reminder><inner>data</inner></system-reminder> after';
      const result = stripSystemTags(input);
      assert.ok(!result.includes('inner'), 'Nested tags should be stripped');
      assert.ok(result.includes('before'), 'Text before should remain');
      assert.ok(result.includes('after'), 'Text after should remain');
    });
  });

  // --- Domain Frame Classification (IV-10) ---

  describe('Domain Frame Classification', () => {
    it('classifies engineering text correctly', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('implement the function and deploy');
      assert.strictEqual(result.current_frame, 'engineering');
    });

    it('classifies debugging text correctly', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('fix the error and debug the crash');
      assert.strictEqual(result.current_frame, 'debugging');
    });

    it('classifies architecture text correctly', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('design the architecture and refactor');
      assert.strictEqual(result.current_frame, 'architecture');
    });

    it('classifies social text correctly', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('remember my preference and workflow');
      assert.strictEqual(result.current_frame, 'social');
    });

    it('defaults to general for non-specific text', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('hello how are you today');
      assert.strictEqual(result.current_frame, 'general');
    });

    it('returns frame_confidence between 0 and 1', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('implement the function');
      assert.ok(result.frame_confidence >= 0, `Confidence should be >= 0, got ${result.frame_confidence}`);
      assert.ok(result.frame_confidence <= 1, `Confidence should be <= 1, got ${result.frame_confidence}`);
    });

    it('returns active_frames array with at least one element', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const result = classifyDomainFrame('implement the function');
      assert.ok(Array.isArray(result.active_frames), 'active_frames should be an array');
      assert.ok(result.active_frames.length >= 1, 'active_frames should have at least one element');
    });

    it('completes classification in under 1ms for 500-char prompt', () => {
      const { classifyDomainFrame } = require(ACTIVATION_PATH);
      const base = 'We need to implement the function and deploy it. Fix the error and debug the crash. ' +
        'Design the architecture and refactor the module. Remember my preference and workflow pattern. ';
      const prompt = base.repeat(5);
      assert.ok(prompt.length >= 500, `Prompt should be >= 500 chars, got ${prompt.length}`);

      // Warm up
      classifyDomainFrame(prompt);

      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        classifyDomainFrame(prompt);
      }
      const elapsed = (performance.now() - start) / iterations;
      assert.ok(elapsed < 1, `Classification should complete in under 1ms, took ${elapsed.toFixed(3)}ms`);
    });
  });

  // --- Sublimation Scoring (IV-04) ---

  describe('Sublimation Scoring', () => {
    it('returns 1.0 for perfect activation with all factors at max', () => {
      const { computeSublimationScore } = require(ACTIVATION_PATH);
      const score = computeSublimationScore(
        { level: 1.0 }, null, null, 0,
        { surpriseFactor: 1.0, relevanceRatio: 1.0, confidenceWeight: 1.0 }
      );
      assert.strictEqual(score, 1.0);
    });

    it('computes correct 5-factor product', () => {
      const { computeSublimationScore } = require(ACTIVATION_PATH);
      const score = computeSublimationScore(
        { level: 0.5 }, null, null, 0.5,
        { surpriseFactor: 0.8, relevanceRatio: 0.9, confidenceWeight: 0.8 }
      );
      const expected = 0.5 * 0.8 * 0.9 * 0.5 * 0.8;
      assert.ok(Math.abs(score - expected) < 0.0001, `Score should be ${expected}, got ${score}`);
    });

    it('returns 0 when cognitive load is 1.0', () => {
      const { computeSublimationScore } = require(ACTIVATION_PATH);
      const score = computeSublimationScore(
        { level: 1.0 }, null, null, 1.0,
        { surpriseFactor: 1.0, relevanceRatio: 1.0, confidenceWeight: 1.0 }
      );
      assert.strictEqual(score, 0);
    });

    it('computeSurprise returns 0.2 when entity is expected', () => {
      const { computeSurprise } = require(ACTIVATION_PATH);
      const surprise = computeSurprise(
        { name: 'dynamo' },
        { expected_topic: 'dynamo config' }
      );
      assert.strictEqual(surprise, 0.2);
    });

    it('computeSurprise returns 0.8 when entity is unexpected', () => {
      const { computeSurprise } = require(ACTIVATION_PATH);
      const surprise = computeSurprise(
        { name: 'stripe' },
        { expected_topic: 'dynamo config' }
      );
      assert.strictEqual(surprise, 0.8);
    });

    it('computeSurprise returns 0.5 when no predictions', () => {
      const { computeSurprise } = require(ACTIVATION_PATH);
      assert.strictEqual(computeSurprise({ name: 'anything' }, null), 0.5);
    });

    it('computeRelevance returns 0.9 when entity is in context', () => {
      const { computeRelevance } = require(ACTIVATION_PATH);
      const relevance = computeRelevance(
        { name: 'config' },
        'update the config module'
      );
      assert.strictEqual(relevance, 0.9);
    });

    it('computeRelevance returns 0.3 when entity is not in context', () => {
      const { computeRelevance } = require(ACTIVATION_PATH);
      const relevance = computeRelevance(
        { name: 'stripe' },
        'update the config module'
      );
      assert.strictEqual(relevance, 0.3);
    });

    it('computeRelevance returns 0.5 when no context', () => {
      const { computeRelevance } = require(ACTIVATION_PATH);
      assert.strictEqual(computeRelevance({ name: 'anything' }, null), 0.5);
    });
  });

  // --- Activation Propagation (IV-03) ---

  describe('Activation Propagation', () => {
    it('initializes anchor entities at level 1.0 with no graph data', () => {
      const { propagateActivation } = require(ACTIVATION_PATH);
      const anchors = [{ id: 'a' }, { id: 'b' }];
      const map = propagateActivation(anchors, null);
      assert.strictEqual(Object.keys(map).length, 2);
      assert.strictEqual(map['a'].level, 1.0);
      assert.strictEqual(map['b'].level, 1.0);
    });

    it('propagates activation to neighbors with decay factor', () => {
      const { propagateActivation } = require(ACTIVATION_PATH);
      const anchors = [{ id: 'a' }];
      const graphData = { 'a': [{ id: 'n1' }] };
      const map = propagateActivation(anchors, graphData, { decayFactor: 0.5 });
      assert.strictEqual(map['a'].level, 1.0);
      assert.strictEqual(map['n1'].level, 0.5);
    });

    it('applies convergence bonus for convergent paths', () => {
      const { propagateActivation } = require(ACTIVATION_PATH);
      const anchors = [{ id: 'a' }, { id: 'b' }];
      const graphData = {
        'a': [{ id: 'shared' }],
        'b': [{ id: 'shared' }]
      };
      const map = propagateActivation(anchors, graphData, { decayFactor: 0.5, convergenceBonus: 1.5 });
      // shared should have convergence bonus applied since it has convergence_count >= 2
      assert.ok(map['shared'].convergence_count >= 2, 'Shared neighbor should have convergence_count >= 2');
      assert.ok(map['shared'].level > 0.5, 'Convergent neighbor should have higher level than single propagation');
    });

    it('does not propagate below minThreshold', () => {
      const { propagateActivation } = require(ACTIVATION_PATH);
      const anchors = [{ id: 'a', level: 0.4 }];
      const graphData = { 'a': [{ id: 'n1' }] };
      const map = propagateActivation(anchors, graphData, { decayFactor: 0.5, minThreshold: 0.3 });
      // 0.4 * 0.5 = 0.2 which is below minThreshold 0.3
      assert.ok(!map['n1'], 'Neighbor should not be included below threshold');
    });

    it('clamps all levels to max 1.0', () => {
      const { propagateActivation } = require(ACTIVATION_PATH);
      const anchors = [{ id: 'a', level: 1.0 }, { id: 'b', level: 1.0 }];
      const graphData = {
        'a': [{ id: 'shared' }],
        'b': [{ id: 'shared' }]
      };
      const map = propagateActivation(anchors, graphData, { decayFactor: 0.9, convergenceBonus: 2.0 });
      assert.ok(map['shared'].level <= 1.0, `Level should be clamped to 1.0, got ${map['shared'].level}`);
    });

    it('applies domainFrameBonus to matching neighbors', () => {
      const { propagateActivation } = require(ACTIVATION_PATH);
      const anchors = [{ id: 'a' }];
      const graphData = { 'a': [{ id: 'n1', domain: 'engineering' }] };
      const mapWithBonus = propagateActivation(anchors, graphData, {
        decayFactor: 0.5,
        domainFrame: 'engineering',
        domainFrameBonus: 1.3
      });
      const mapWithout = propagateActivation(anchors, graphData, {
        decayFactor: 0.5,
        domainFrame: 'debugging',
        domainFrameBonus: 1.3
      });
      assert.ok(
        mapWithBonus['n1'].level > mapWithout['n1'].level,
        'Domain-matching neighbor should have higher level'
      );
    });
  });

  // --- Decay (IV-03) ---

  describe('Decay', () => {
    it('reduces levels by exponential decay factor based on minutes elapsed', () => {
      const { decayAll } = require(ACTIVATION_PATH);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString();
      const map = {
        'a': { level: 1.0, last_activated: tenMinutesAgo }
      };
      const decayed = decayAll(map, { decayRate: 0.1, now: new Date() });
      const expected = Math.exp(-0.1 * 10);
      assert.ok(Math.abs(decayed['a'].level - expected) < 0.01, `Level should be ~${expected.toFixed(4)}, got ${decayed['a'].level}`);
    });

    it('prunes entries below 0.01', () => {
      const { decayAll } = require(ACTIVATION_PATH);
      const longAgo = new Date(Date.now() - 120 * 60000).toISOString(); // 120 minutes ago
      const map = {
        'a': { level: 0.5, last_activated: longAgo }
      };
      const decayed = decayAll(map, { decayRate: 0.1, now: new Date() });
      assert.ok(!decayed['a'], 'Entry should be pruned when level drops below 0.01');
    });

    it('preserves levels for freshly activated entries', () => {
      const { decayAll } = require(ACTIVATION_PATH);
      const now = new Date();
      const map = {
        'a': { level: 0.8, last_activated: now.toISOString() }
      };
      const decayed = decayAll(map, { now });
      assert.ok(Math.abs(decayed['a'].level - 0.8) < 0.01, `Fresh entry should preserve level, got ${decayed['a'].level}`);
    });

    it('applies custom decay rate', () => {
      const { decayAll } = require(ACTIVATION_PATH);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const map = {
        'a': { level: 1.0, last_activated: fiveMinutesAgo }
      };
      const decayed = decayAll(map, { decayRate: 0.2, now: new Date() });
      const expected = Math.exp(-0.2 * 5);
      assert.ok(Math.abs(decayed['a'].level - expected) < 0.01, `Level should be ~${expected.toFixed(4)}, got ${decayed['a'].level}`);
    });
  });

  // --- Threshold Crossings ---

  describe('Threshold Crossings', () => {
    it('returns entries above threshold', () => {
      const { checkThresholdCrossings } = require(ACTIVATION_PATH);
      const map = {
        'a': { level: 0.8 },
        'b': { level: 0.3 },
        'c': { level: 0.6 }
      };
      const crossings = checkThresholdCrossings(map, 0.5);
      assert.strictEqual(crossings.length, 2);
      const ids = crossings.map(c => c.id);
      assert.ok(ids.includes('a'));
      assert.ok(ids.includes('c'));
      assert.ok(crossings.every(c => c.crossed === true));
    });

    it('returns empty array when all below threshold', () => {
      const { checkThresholdCrossings } = require(ACTIVATION_PATH);
      const map = {
        'a': { level: 0.2 },
        'b': { level: 0.1 }
      };
      const crossings = checkThresholdCrossings(map, 0.5);
      assert.deepStrictEqual(crossings, []);
    });
  });

  // --- updateActivation ---

  describe('updateActivation', () => {
    it('merges new entities into existing map', () => {
      const { updateActivation } = require(ACTIVATION_PATH);
      const existingMap = {
        'config': { level: 0.5, convergence_count: 1, last_activated: '2026-01-01T00:00:00Z', sources: ['direct_mention'] }
      };
      const newEntities = [
        { name: 'config', type: 'technicalTerms' },
        { name: 'deploy', type: 'technicalTerms' }
      ];
      const updated = updateActivation(existingMap, newEntities);
      assert.ok(updated['config'].convergence_count >= 2, 'Should increment convergence_count for existing entity');
      assert.ok(updated['deploy'], 'Should add new entity');
      assert.strictEqual(updated['deploy'].level, 1.0);
    });
  });

  // --- Spawn Budget (OPS-MON-01, OPS-MON-02) ---

  describe('Spawn Budget', () => {
    it('allows spawn with fresh state (remaining=20)', () => {
      const { checkSpawnBudget } = require(ACTIVATION_PATH);
      const state = { processing: {} };
      const config = {};
      const result = checkSpawnBudget(state, config);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, 20);
    });

    it('denies spawn after 20 recordSpawn calls', () => {
      const { checkSpawnBudget, recordSpawn } = require(ACTIVATION_PATH);
      const state = { processing: {} };
      const config = {};
      for (let i = 0; i < 20; i++) {
        recordSpawn(state);
      }
      const result = checkSpawnBudget(state, config);
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.remaining, 0);
    });

    it('denies spawn when rate_limited is true', () => {
      const { checkSpawnBudget, setRateLimited } = require(ACTIVATION_PATH);
      const state = { processing: {} };
      const config = {};
      setRateLimited(state, true);
      const result = checkSpawnBudget(state, config);
      assert.strictEqual(result.allowed, false);
    });

    it('resets counter on new day', () => {
      const { checkSpawnBudget } = require(ACTIVATION_PATH);
      const state = {
        processing: {
          spawn_tracker: { date: '2026-01-01', count: 15, rate_limited: false }
        }
      };
      const config = {};
      // Current date is not 2026-01-01, so counter should reset
      const result = checkSpawnBudget(state, config);
      assert.strictEqual(result.remaining, 20);
      assert.strictEqual(result.allowed, true);
    });

    it('uses config.reverie.operational.subagent_daily_cap when set', () => {
      const { checkSpawnBudget } = require(ACTIVATION_PATH);
      const state = { processing: {} };
      const config = { reverie: { operational: { subagent_daily_cap: 5 } } };
      const result = checkSpawnBudget(state, config);
      assert.strictEqual(result.remaining, 5);
    });

    it('recordSpawn increments count by 1', () => {
      const { recordSpawn } = require(ACTIVATION_PATH);
      const state = { processing: {} };
      recordSpawn(state);
      assert.strictEqual(state.processing.spawn_tracker.count, 1);
      recordSpawn(state);
      assert.strictEqual(state.processing.spawn_tracker.count, 2);
    });

    it('setRateLimited sets and clears the flag', () => {
      const { setRateLimited } = require(ACTIVATION_PATH);
      const state = { processing: {} };
      setRateLimited(state, true);
      assert.strictEqual(state.processing.spawn_tracker.rate_limited, true);
      setRateLimited(state, false);
      assert.strictEqual(state.processing.spawn_tracker.rate_limited, false);
    });
  });

  // --- Exports Verification ---

  describe('Module Exports', () => {
    it('exports all required functions and constants', () => {
      const mod = require(ACTIVATION_PATH);
      const expectedExports = [
        'extractEntities', 'propagateActivation', 'decayAll',
        'computeSublimationScore', 'computeSurprise', 'computeRelevance',
        'classifyDomainFrame', 'checkThresholdCrossings',
        'checkSpawnBudget', 'recordSpawn', 'setRateLimited',
        'updateActivation', 'PATTERNS', 'FRAME_KEYWORDS'
      ];
      for (const name of expectedExports) {
        assert.ok(mod[name] !== undefined, `Module should export ${name}`);
      }
    });

    it('PATTERNS contains all required keys', () => {
      const { PATTERNS } = require(ACTIVATION_PATH);
      const requiredKeys = ['filePaths', 'functionNames', 'classNames', 'projectNames', 'technicalTerms', 'camelCase', 'snakeCase'];
      for (const key of requiredKeys) {
        assert.ok(PATTERNS[key] instanceof RegExp, `PATTERNS.${key} should be a RegExp`);
      }
    });

    it('FRAME_KEYWORDS contains all required keys', () => {
      const { FRAME_KEYWORDS } = require(ACTIVATION_PATH);
      const requiredKeys = ['engineering', 'debugging', 'architecture', 'social'];
      for (const key of requiredKeys) {
        assert.ok(Array.isArray(FRAME_KEYWORDS[key]), `FRAME_KEYWORDS.${key} should be an array`);
      }
    });
  });
});

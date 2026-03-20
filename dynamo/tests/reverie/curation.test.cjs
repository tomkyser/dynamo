// Dynamo > Tests > Reverie > curation.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const CURATION_PATH = path.join(__dirname, '..', '..', '..', 'subsystems', 'reverie', 'curation.cjs');

describe('Reverie Curation Module', () => {

  // --- TOKEN_LIMITS ---

  describe('TOKEN_LIMITS', () => {
    it('session_start equals 500', () => {
      const { TOKEN_LIMITS } = require(CURATION_PATH);
      assert.strictEqual(TOKEN_LIMITS.session_start, 500);
    });

    it('mid_session equals 150', () => {
      const { TOKEN_LIMITS } = require(CURATION_PATH);
      assert.strictEqual(TOKEN_LIMITS.mid_session, 150);
    });

    it('urgent equals 50', () => {
      const { TOKEN_LIMITS } = require(CURATION_PATH);
      assert.strictEqual(TOKEN_LIMITS.urgent, 50);
    });
  });

  // --- curateForInjection ---

  describe('curateForInjection', () => {
    it('with entities and context, returns formatted string containing entity names', () => {
      const { curateForInjection } = require(CURATION_PATH);
      const entities = [
        { name: 'loadConfig', type: 'functionNames', activation: 0.8 },
        { name: 'state.cjs', type: 'filePaths', activation: 0.6 }
      ];
      const result = curateForInjection(entities, 'working on configuration', {});
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.includes('loadConfig'), 'Should contain entity name loadConfig');
    });

    it('output contains adversarial framing', () => {
      const { curateForInjection } = require(CURATION_PATH);
      const entities = [
        { name: 'MCPClient', type: 'classNames', activation: 0.7 }
      ];
      const result = curateForInjection(entities, 'working on MCP', {});
      assert.ok(typeof result === 'string', 'Should return a string');
      const hasFraming = result.includes('from your experience') || result.includes('as you described it');
      assert.ok(hasFraming, 'Output should contain adversarial framing qualifier');
    });

    it('output does not exceed mid_session token limit (150 tokens, ~600 chars)', () => {
      const { curateForInjection, TOKEN_LIMITS } = require(CURATION_PATH);
      // Create many entities to test truncation
      const entities = [];
      for (let i = 0; i < 20; i++) {
        entities.push({ name: `entity_${i}_with_long_name_for_testing`, type: 'functionNames', activation: 0.5 + (i * 0.02), context: 'This is a detailed context string that describes what this entity does and why it matters in the current work session context.' });
      }
      const result = curateForInjection(entities, 'test context', {});
      assert.ok(typeof result === 'string', 'Should return a string');
      const charLimit = TOKEN_LIMITS.mid_session * 4; // ~600 chars
      assert.ok(result.length <= charLimit, `Output should be under ${charLimit} chars, got ${result.length}`);
    });

    it('empty entities array returns null', () => {
      const { curateForInjection } = require(CURATION_PATH);
      const result = curateForInjection([], 'test context', {});
      assert.strictEqual(result, null);
    });

    it('null entities returns null', () => {
      const { curateForInjection } = require(CURATION_PATH);
      const result = curateForInjection(null, 'test context', {});
      assert.strictEqual(result, null);
    });
  });

  // --- formatBriefing ---

  describe('formatBriefing', () => {
    it('with session data and entities, returns narrative string', () => {
      const { formatBriefing } = require(CURATION_PATH);
      const sessionData = {
        project: 'dynamo',
        recent: ['Worked on hooks', 'Fixed activation module']
      };
      const entities = [
        { name: 'hooks', activation: 0.8 },
        { name: 'activation', activation: 0.6 }
      ];
      const result = formatBriefing(sessionData, entities, {});
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.length > 10, 'Should return a non-trivial string');
    });

    it('output contains project name when provided', () => {
      const { formatBriefing } = require(CURATION_PATH);
      const sessionData = { project: 'dynamo' };
      const result = formatBriefing(sessionData, [], {});
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.includes('dynamo'), 'Should contain project name');
    });

    it('output does not exceed session_start token limit (500 tokens, ~2000 chars)', () => {
      const { formatBriefing, TOKEN_LIMITS } = require(CURATION_PATH);
      const sessionData = {
        project: 'dynamo',
        recent: Array.from({ length: 50 }, (_, i) => `Session ${i}: Did extensive work on component ${i} involving multiple files and decisions about architecture, testing strategies, and deployment pipelines.`)
      };
      const entities = Array.from({ length: 30 }, (_, i) => ({
        name: `entity_${i}_with_extended_name`,
        activation: 0.9 - (i * 0.02)
      }));
      const result = formatBriefing(sessionData, entities, {});
      assert.ok(typeof result === 'string', 'Should return a string');
      const charLimit = TOKEN_LIMITS.session_start * 4; // ~2000 chars
      assert.ok(result.length <= charLimit, `Output should be under ${charLimit} chars, got ${result.length}`);
    });

    it('empty session data returns minimal default briefing', () => {
      const { formatBriefing } = require(CURATION_PATH);
      const result = formatBriefing({}, [], {});
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.length > 0, 'Should return a non-empty string');
    });
  });

  // --- formatSynthesis ---

  describe('formatSynthesis', () => {
    it('returns object with synthesis, session_name, self_model_updates, predictions fields', () => {
      const { formatSynthesis } = require(CURATION_PATH);
      const sessionData = { summary: 'Worked on curation module migration' };
      const state = {
        self_model: { injections_made: 5, acknowledged: 3 },
        activation_map: { entities: [{ name: 'curation', activation: 0.8 }] },
        domain_frame: { current_frame: 'development' }
      };
      const result = formatSynthesis(sessionData, state, {});
      assert.ok(typeof result === 'object', 'Should return an object');
      assert.ok('synthesis' in result, 'Should have synthesis field');
      assert.ok('session_name' in result, 'Should have session_name field');
      assert.ok('self_model_updates' in result, 'Should have self_model_updates field');
      assert.ok('predictions' in result, 'Should have predictions field');
    });

    it('synthesis field contains narrative text', () => {
      const { formatSynthesis } = require(CURATION_PATH);
      const sessionData = { summary: 'Built the Inner Voice cognitive pipeline' };
      const state = {
        self_model: { injections_made: 2, acknowledged: 1 },
        activation_map: { entities: [] },
        domain_frame: { current_frame: 'development' }
      };
      const result = formatSynthesis(sessionData, state, {});
      assert.ok(typeof result.synthesis === 'string', 'synthesis should be a string');
      assert.ok(result.synthesis.length > 10, 'synthesis should be non-trivial');
    });

    it('session_name is a short string (< 50 chars)', () => {
      const { formatSynthesis } = require(CURATION_PATH);
      const sessionData = { summary: 'Built the Inner Voice cognitive pipeline' };
      const state = {
        self_model: { injections_made: 0, acknowledged: 0 },
        activation_map: { entities: [] },
        domain_frame: { current_frame: 'general' }
      };
      const result = formatSynthesis(sessionData, state, {});
      assert.ok(typeof result.session_name === 'string', 'session_name should be a string');
      assert.ok(result.session_name.length < 50, `session_name should be < 50 chars, got ${result.session_name.length}`);
      assert.ok(result.session_name.length > 0, 'session_name should not be empty');
    });

    it('empty input returns minimal synthesis', () => {
      const { formatSynthesis } = require(CURATION_PATH);
      const result = formatSynthesis({}, {}, {});
      assert.ok(typeof result === 'object', 'Should return an object');
      assert.ok(typeof result.synthesis === 'string', 'synthesis should be a string');
      assert.ok(typeof result.session_name === 'string', 'session_name should be a string');
    });
  });

  // --- formatPreCompact ---

  describe('formatPreCompact', () => {
    it('returns compact summary string', () => {
      const { formatPreCompact } = require(CURATION_PATH);
      const state = {
        activation_map: {
          entities: [
            { name: 'hooks', activation: 0.8 },
            { name: 'state', activation: 0.6 },
            { name: 'old-thing', activation: 0.2 }
          ]
        },
        domain_frame: { current_frame: 'development' },
        processing: { deliberation_pending: false }
      };
      const result = formatPreCompact(state, {});
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.length > 0, 'Should be non-empty');
    });

    it('output prioritizes high-activation entities', () => {
      const { formatPreCompact } = require(CURATION_PATH);
      const state = {
        activation_map: {
          entities: [
            { name: 'high-priority', activation: 0.9 },
            { name: 'medium-priority', activation: 0.6 },
            { name: 'low-priority', activation: 0.2 }
          ]
        },
        domain_frame: { current_frame: 'development' },
        processing: {}
      };
      const result = formatPreCompact(state, {});
      assert.ok(result.includes('high-priority'), 'Should include high-activation entity');
      assert.ok(!result.includes('low-priority'), 'Should exclude low-activation entity (< 0.5)');
    });

    it('output does not exceed 200 tokens (~800 chars)', () => {
      const { formatPreCompact } = require(CURATION_PATH);
      const state = {
        activation_map: {
          entities: Array.from({ length: 50 }, (_, i) => ({
            name: `entity_${i}_with_a_very_long_descriptive_name_for_testing`,
            activation: 0.9 - (i * 0.01)
          }))
        },
        domain_frame: { current_frame: 'development' },
        processing: { deliberation_pending: true, deliberation_queue: Array.from({ length: 20 }, (_, i) => `item_${i}`) }
      };
      const result = formatPreCompact(state, {});
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.length <= 800, `Output should be under 800 chars, got ${result.length}`);
    });
  });

  // --- generateSessionName ---

  describe('generateSessionName', () => {
    it('returns short name (3-7 words) from summary', () => {
      const { generateSessionName } = require(CURATION_PATH);
      const result = generateSessionName('Implemented the curation module with template-based formatting for all injection types');
      assert.ok(typeof result === 'string', 'Should return a string');
      const wordCount = result.split(/\s+/).length;
      assert.ok(wordCount >= 3 && wordCount <= 7, `Should be 3-7 words, got ${wordCount}: "${result}"`);
    });

    it('empty summary returns timestamp-based name', () => {
      const { generateSessionName } = require(CURATION_PATH);
      const result = generateSessionName('');
      assert.ok(typeof result === 'string', 'Should return a string');
      assert.ok(result.startsWith('Session '), `Should start with "Session ", got: "${result}"`);
    });
  });

  // --- Module exports ---

  describe('Module exports', () => {
    it('exports all required functions and TOKEN_LIMITS', () => {
      const curation = require(CURATION_PATH);
      assert.ok(typeof curation.curateForInjection === 'function', 'Should export curateForInjection');
      assert.ok(typeof curation.formatBriefing === 'function', 'Should export formatBriefing');
      assert.ok(typeof curation.formatSynthesis === 'function', 'Should export formatSynthesis');
      assert.ok(typeof curation.formatPreCompact === 'function', 'Should export formatPreCompact');
      assert.ok(typeof curation.generateSessionName === 'function', 'Should export generateSessionName');
      assert.ok(typeof curation.TOKEN_LIMITS === 'object', 'Should export TOKEN_LIMITS');
    });
  });
});

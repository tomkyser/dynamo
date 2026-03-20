// Dynamo > Tests > Reverie > subagent.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const AGENT_PATH = path.join(__dirname, '..', '..', '..', 'cc', 'agents', 'inner-voice.md');

describe('Inner Voice Subagent Definition', () => {

  it('file exists at cc/agents/inner-voice.md', () => {
    assert.ok(fs.existsSync(AGENT_PATH), `File should exist at ${AGENT_PATH}`);
  });

  it('file contains YAML frontmatter delimited by ---', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    const lines = content.split('\n');
    assert.strictEqual(lines[0].trim(), '---', 'First line should be ---');
    const secondDelimiter = lines.slice(1).findIndex(l => l.trim() === '---');
    assert.ok(secondDelimiter > 0, 'Should have a second --- delimiter for frontmatter');
  });

  it('frontmatter contains model: field with a sonnet model identifier', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    const hasModel = /^model:\s+.*sonnet.*/mi.test(content);
    assert.ok(hasModel, 'Frontmatter should contain model: with sonnet identifier');
  });

  it('frontmatter contains tools: field that is an array', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    assert.ok(content.includes('tools:'), 'Frontmatter should contain tools: field');
    // YAML array syntax: lines starting with "  - "
    const toolLines = content.split('\n').filter(l => /^\s+-\s+(Read|Grep|Glob|Bash|Write|Edit|Agent)/.test(l));
    assert.ok(toolLines.length >= 4, `Should have at least 4 tool entries, found ${toolLines.length}`);
  });

  it('tools array includes Read, Grep, Glob, Bash', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    const requiredTools = ['Read', 'Grep', 'Glob', 'Bash'];
    for (const tool of requiredTools) {
      const pattern = new RegExp(`^\\s+-\\s+${tool}\\s*$`, 'm');
      assert.ok(pattern.test(content), `Tools should include ${tool}`);
    }
  });

  it('tools array does NOT include Write, Edit, or Agent (read-only constraint)', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    // Extract just the tools section (between "tools:" and the next field)
    const lines = content.split('\n');
    const toolsStart = lines.findIndex(l => /^tools:/.test(l));
    assert.ok(toolsStart >= 0, 'Should find tools: field');

    // Collect tool entries (lines starting with "  - " after tools:)
    const toolEntries = [];
    for (let i = toolsStart + 1; i < lines.length; i++) {
      if (/^\s+-\s+/.test(lines[i])) {
        toolEntries.push(lines[i].trim().replace(/^-\s+/, ''));
      } else if (/^\w/.test(lines[i])) {
        break; // Next field
      }
    }

    const forbidden = ['Write', 'Edit', 'Agent'];
    for (const tool of forbidden) {
      assert.ok(!toolEntries.includes(tool), `Tools should NOT include ${tool}`);
    }
  });

  it('frontmatter contains permissionMode: dontAsk', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    assert.ok(/^permissionMode:\s+dontAsk/m.test(content), 'Should contain permissionMode: dontAsk');
  });

  it('frontmatter contains maxTurns: field', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    assert.ok(/^maxTurns:\s+\d+/m.test(content), 'Should contain maxTurns: with a number');
  });

  it('system prompt body is non-empty and at least 200 characters', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    const lines = content.split('\n');
    const secondDelimiterIdx = lines.slice(1).findIndex(l => l.trim() === '---') + 1;
    const body = lines.slice(secondDelimiterIdx + 1).join('\n').trim();
    assert.ok(body.length >= 200, `System prompt body should be >= 200 chars, got ${body.length}`);
  });

  it('system prompt contains "Inner Voice" identifier', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    assert.ok(content.includes('Inner Voice'), 'System prompt should contain "Inner Voice"');
  });

  it('system prompt contains adversarial/counter-prompting instruction', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    const lower = content.toLowerCase();
    const hasExperience = lower.includes('experience') || lower.includes('described');
    assert.ok(hasExperience, 'System prompt should contain adversarial framing referencing "experience" or "described"');
  });

  it('file does NOT contain - Write in tools section', () => {
    const content = fs.readFileSync(AGENT_PATH, 'utf8');
    // Check that Write does not appear as a tool entry (only in disallowedTools)
    const lines = content.split('\n');
    const toolsStart = lines.findIndex(l => /^tools:/.test(l));
    const disallowedStart = lines.findIndex(l => /^disallowedTools:/.test(l));

    // Get tools between "tools:" and "disallowedTools:" (or next field)
    const endIdx = disallowedStart > toolsStart ? disallowedStart : lines.length;
    const toolSection = lines.slice(toolsStart, endIdx).join('\n');
    const writeInTools = /^\s+-\s+Write\s*$/m.test(toolSection);
    assert.ok(!writeInTools, 'Write should not be in the tools array');
  });
});

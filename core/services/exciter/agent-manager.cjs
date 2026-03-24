'use strict';

const path = require('node:path');
const { ok, err } = require('../../../lib/result.cjs');

/**
 * Serializes a frontmatter object to YAML-like format.
 * Simple key: value per line. Arrays become comma-separated. Booleans/numbers are raw.
 *
 * @param {Object} frontmatter - Key-value pairs for frontmatter
 * @returns {string} YAML-like frontmatter string (without --- delimiters)
 */
function serializeFrontmatter(frontmatter) {
  const lines = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: ${value.join(', ')}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * Parses a YAML-like frontmatter block from a markdown file content.
 * Splits on --- boundaries, extracts key: value pairs.
 *
 * @param {string} content - Raw file content
 * @returns {{ frontmatter: Object, body: string }} Parsed frontmatter and remaining body
 */
function parseFrontmatter(content) {
  const parts = content.split('---');
  if (parts.length < 3) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterRaw = parts[1].trim();
  const body = parts.slice(2).join('---').trim();
  const frontmatter = {};

  for (const line of frontmatterRaw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    let value = line.substring(colonIdx + 1).trim();

    // Parse booleans
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Parse numbers
    else if (!isNaN(value) && value !== '') value = Number(value);

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Creates an agent definition file manager.
 *
 * Manages the `.claude/agents/` directory, providing install, remove, list, and
 * get operations for agent definition files. Each agent is a markdown file with
 * YAML frontmatter and a body containing the agent's system prompt.
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.lathe - Lathe filesystem facade instance
 * @returns {Object} Manager with installAgent, removeAgent, listAgents, getAgent
 */
function createAgentManager(options) {
  const { lathe } = options;

  /**
   * Installs or updates an agent definition file.
   *
   * @param {string} agentName - The agent identifier (becomes filename without .md)
   * @param {Object} definition - Agent definition
   * @param {Object} definition.frontmatter - Key-value pairs for YAML frontmatter
   * @param {string} definition.body - Markdown body content (system prompt)
   * @param {string} agentsDir - Absolute path to the agents directory
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function installAgent(agentName, definition, agentsDir) {
    const filePath = path.join(agentsDir, agentName + '.md');
    const frontmatterStr = serializeFrontmatter(definition.frontmatter);
    const content = `---\n${frontmatterStr}\n---\n\n${definition.body}`;

    return lathe.writeFileAtomic(filePath, content);
  }

  /**
   * Removes an agent definition file.
   *
   * @param {string} agentName - The agent identifier
   * @param {string} agentsDir - Absolute path to the agents directory
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function removeAgent(agentName, agentsDir) {
    const filePath = path.join(agentsDir, agentName + '.md');
    const existsResult = lathe.exists(filePath);

    if (!existsResult.ok || !existsResult.value) {
      return err('AGENT_NOT_FOUND', `Agent "${agentName}" not found at ${filePath}`);
    }

    return lathe.deleteFile(filePath);
  }

  /**
   * Lists all agent definition files in the directory.
   *
   * @param {string} agentsDir - Absolute path to the agents directory
   * @returns {import('../../../lib/result.cjs').Result<Array<{name: string, path: string}>>}
   */
  function listAgents(agentsDir) {
    const listResult = lathe.listDir(agentsDir);

    if (!listResult.ok) {
      return ok([]);
    }

    const entries = listResult.value;
    const agents = [];

    for (const entry of entries) {
      // listDir may return strings or objects with .name
      const name = typeof entry === 'string' ? entry : entry.name;
      if (name.endsWith('.md')) {
        agents.push({
          name: name.replace(/\.md$/, ''),
          path: path.join(agentsDir, name),
        });
      }
    }

    return ok(agents);
  }

  /**
   * Reads and parses an agent definition file.
   *
   * @param {string} agentName - The agent identifier
   * @param {string} agentsDir - Absolute path to the agents directory
   * @returns {import('../../../lib/result.cjs').Result<{frontmatter: Object, body: string}>}
   */
  function getAgent(agentName, agentsDir) {
    const filePath = path.join(agentsDir, agentName + '.md');
    const readResult = lathe.readFile(filePath);

    if (!readResult.ok) {
      return err('AGENT_NOT_FOUND', `Agent "${agentName}" not found at ${filePath}`);
    }

    const parsed = parseFrontmatter(readResult.value);
    return ok(parsed);
  }

  return { installAgent, removeAgent, listAgents, getAgent };
}

module.exports = { createAgentManager };

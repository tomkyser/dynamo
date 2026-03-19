// Dynamo > Switchboard > diagnose.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const stages = require(path.join(__dirname, 'stages.cjs'));

const resolve = require('../lib/resolve.cjs');
const { output, error, MCPClient } = require(resolve('dynamo', 'core.cjs'));
const { formatDiagnoseReport } = require(path.join(__dirname, 'pretty.cjs'));

const { STAGE_NAMES } = stages;

// All 13 diagnostic stages with their dependency graph.
// dependsOn references stage names -- if any dependency is in the failed/skipped set, this stage is skipped.
// Stages 4, 10-13 receive the shared MCPClient via options.
const DIAGNOSE_STAGE_DEFS = [
  { fn: 'stageDocker',           name: 'Docker',            dependsOn: [],                           usesMcp: false },
  { fn: 'stageNeo4j',            name: 'Neo4j',             dependsOn: ['Docker'],                   usesMcp: false },
  { fn: 'stageGraphitiApi',      name: 'Graphiti API',      dependsOn: ['Docker', 'Neo4j'],          usesMcp: false },
  { fn: 'stageMcpSession',       name: 'MCP Session',       dependsOn: ['Docker', 'Graphiti API'],   usesMcp: true },
  { fn: 'stageEnvVars',          name: 'Env Vars',          dependsOn: [],                           usesMcp: false },
  { fn: 'stageEnvFile',          name: '.env File',         dependsOn: [],                           usesMcp: false },
  { fn: 'stageHookRegistrations', name: 'Hook Registrations', dependsOn: [],                         usesMcp: false },
  { fn: 'stageHookFiles',        name: 'Hook Files',        dependsOn: [],                           usesMcp: false },
  { fn: 'stageCjsModules',       name: 'CJS Modules',       dependsOn: [],                           usesMcp: false },
  { fn: 'stageMcpToolCall',      name: 'MCP Tool Call',      dependsOn: ['MCP Session'],             usesMcp: true },
  { fn: 'stageSearchRoundtrip',  name: 'Search Round-trip',  dependsOn: ['MCP Session'],             usesMcp: true },
  { fn: 'stageEpisodeWrite',     name: 'Episode Write',      dependsOn: ['MCP Session'],             usesMcp: true },
  { fn: 'stageCanaryWriteRead',  name: 'Canary Write/Read',  dependsOn: ['MCP Session'],             usesMcp: true }
];

/**
 * Run all 13 diagnostic stages with dependency-based skip logic and shared MCPClient.
 *
 * @param {string[]} args - CLI args (supports --verbose, --pretty)
 * @param {boolean} pretty - Pretty output flag (also checks args)
 * @param {boolean} _returnOnly - If true, return result instead of calling output() (for testing)
 * @returns {Promise<object>} Result object (only when _returnOnly is true)
 */
async function run(args = [], pretty = false, _returnOnly = false) {
  const verbose = args.includes('--verbose');
  const usePretty = pretty || args.includes('--pretty');

  const failedStages = new Set();  // Stage names that failed
  const skippedStages = new Set(); // Stage names that were skipped
  const stageResults = [];
  let mcpClient = null;

  try {
    for (let i = 0; i < DIAGNOSE_STAGE_DEFS.length; i++) {
      const def = DIAGNOSE_STAGE_DEFS[i];

      // Check if any dependency has failed or was skipped
      const failedDep = def.dependsOn.find(depName =>
        failedStages.has(depName) || skippedStages.has(depName)
      );

      if (failedDep !== undefined) {
        stageResults.push({
          name: def.name,
          status: 'SKIP',
          detail: `(skipped -- ${failedDep} failed)`
        });
        skippedStages.add(def.name);
        continue;
      }

      // Build options
      const opts = { verbose };
      if (def.usesMcp && mcpClient) {
        opts.mcpClient = mcpClient;
      }

      // Execute the stage function
      const stageFn = stages[def.fn];
      const result = await stageFn(opts);

      stageResults.push({
        name: def.name,
        status: result.status,
        detail: result.detail
      });

      if (result.status === 'FAIL') {
        failedStages.add(def.name);
      }

      // After MCP Session succeeds, create the shared client
      if (def.name === 'MCP Session' && result.status === 'OK') {
        try {
          mcpClient = new MCPClient();
        } catch (e) {
          // MCPClient creation failed -- downstream stages will create their own
        }
      }
    }
  } finally {
    if (mcpClient && typeof mcpClient.close === 'function') {
      try {
        await mcpClient.close();
      } catch (e) {
        // Cleanup errors are non-fatal
      }
    }
  }

  // Build summary
  const passed = stageResults.filter(s => s.status === 'OK' || s.status === 'WARN').length;
  const failed = stageResults.filter(s => s.status === 'FAIL').length;
  const skipped = stageResults.filter(s => s.status === 'SKIP').length;
  const total = stageResults.length;

  const result = {
    command: 'diagnose',
    timestamp: new Date().toISOString(),
    stages: stageResults,
    summary: {
      passed,
      failed,
      skipped,
      total,
      ok: failed === 0 && skipped === 0
    }
  };

  if (usePretty) {
    formatDiagnoseReport(result);
  }

  if (_returnOnly) {
    return result;
  }

  output(result);
}

module.exports = { run };

// Dynamo > Switchboard > health-check.cjs
'use strict';

const path = require('path');
const stages = require(path.join(__dirname, 'stages.cjs'));
const { output, error } = require(path.join(__dirname, '..', 'core.cjs'));
const { formatHealthReport } = require(path.join(__dirname, 'pretty.cjs'));

const {
  stageDocker, stageNeo4j, stageGraphitiApi, stageMcpSession,
  stageEnvVars, stageCanaryWriteRead,
  HEALTH_STAGES, STAGE_NAMES
} = stages;

// Health-check stage definitions (6 stages, ordered by HEALTH_STAGES indices).
// Each entry has: fn (stage function), name, dependsOn (indices within this array that must pass).
// Env Vars (index 4) has no dependencies -- it always runs.
const HEALTH_STAGE_DEFS = [
  { fn: 'stageDocker',         name: STAGE_NAMES[HEALTH_STAGES[0]], dependsOn: [] },         // 0: Docker
  { fn: 'stageNeo4j',          name: STAGE_NAMES[HEALTH_STAGES[1]], dependsOn: [0] },        // 1: Neo4j
  { fn: 'stageGraphitiApi',    name: STAGE_NAMES[HEALTH_STAGES[2]], dependsOn: [0, 1] },     // 2: Graphiti API
  { fn: 'stageMcpSession',     name: STAGE_NAMES[HEALTH_STAGES[3]], dependsOn: [0, 1, 2] },  // 3: MCP Session
  { fn: 'stageEnvVars',        name: STAGE_NAMES[HEALTH_STAGES[4]], dependsOn: [] },          // 4: Env Vars
  { fn: 'stageCanaryWriteRead', name: STAGE_NAMES[HEALTH_STAGES[5]], dependsOn: [0, 1, 2, 3] } // 5: Canary
];

/**
 * Run the 6-stage health check with cascading skip logic.
 *
 * @param {string[]} args - CLI args (supports --verbose, --pretty)
 * @param {boolean} pretty - Pretty output flag (also checks args)
 * @param {boolean} _returnOnly - If true, return result instead of calling output() (for testing)
 * @returns {Promise<object>} Result object (only when _returnOnly is true)
 */
async function run(args = [], pretty = false, _returnOnly = false) {
  const verbose = args.includes('--verbose');
  const usePretty = pretty || args.includes('--pretty');

  const failedIndices = new Set();
  const stageResults = [];

  for (let i = 0; i < HEALTH_STAGE_DEFS.length; i++) {
    const def = HEALTH_STAGE_DEFS[i];

    // Check if any dependency has failed
    const failedDep = def.dependsOn.find(depIdx => failedIndices.has(depIdx));
    if (failedDep !== undefined) {
      const failedName = HEALTH_STAGE_DEFS[failedDep].name;
      stageResults.push({
        name: def.name,
        status: 'SKIP',
        detail: `(skipped -- ${failedName} failed)`
      });
      continue;
    }

    // Execute the stage function (accessed via stages module for mockability)
    const stageFn = stages[def.fn];
    const result = await stageFn({ verbose });

    stageResults.push({
      name: def.name,
      status: result.status,
      detail: result.detail
    });

    if (result.status === 'FAIL') {
      failedIndices.add(i);
    }
  }

  // Build summary
  const nonSkipped = stageResults.filter(s => s.status !== 'SKIP');
  const passed = nonSkipped.filter(s => s.status === 'OK' || s.status === 'WARN').length;
  const total = nonSkipped.length;

  const result = {
    command: 'health-check',
    timestamp: new Date().toISOString(),
    stages: stageResults,
    summary: {
      passed,
      total,
      ok: passed === total
    }
  };

  if (usePretty) {
    formatHealthReport(result);
  }

  if (_returnOnly) {
    return result;
  }

  output(result);
}

module.exports = { run };

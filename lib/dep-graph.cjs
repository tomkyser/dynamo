// Dynamo > Lib > dep-graph.cjs
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Extract require() targets from a CJS source file.
 * Returns resolved file paths for local requires, skips node: built-ins and npm packages.
 * @param {string} filePath - Absolute path to .cjs file
 * @param {string} source - File contents
 * @returns {string[]} Array of required file paths (resolved, deduplicated)
 */
function extractRequires(filePath, source) {
  const requires = [];
  const dir = path.dirname(filePath);

  // Match require('...') with string literal argument
  const stringReqPattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = stringReqPattern.exec(source)) !== null) {
    const target = match[1];
    // Skip node: built-ins and bare module specifiers (no ./ or ../ or /)
    if (target.startsWith('node:') || (!target.startsWith('.') && !target.startsWith('/'))) {
      continue;
    }
    try {
      const resolved = require.resolve(path.resolve(dir, target));
      requires.push(resolved);
    } catch (e) {
      // Unresolvable -- skip (might be a conditional require)
    }
  }

  // Match require(path.join(__dirname, ...)) patterns
  const pathJoinPattern = /require\(\s*path\.join\(\s*__dirname\s*,\s*(['"][^'"]+['"](?:\s*,\s*['"][^'"]+['"])*)\s*\)\s*\)/g;
  while ((match = pathJoinPattern.exec(source)) !== null) {
    const argsStr = match[1];
    const argMatches = argsStr.match(/['"]([^'"]+)['"]/g);
    if (!argMatches) continue;
    const args = argMatches.map(s => s.slice(1, -1));
    try {
      const resolved = require.resolve(path.join(dir, ...args));
      requires.push(resolved);
    } catch (e) {
      // Unresolvable -- skip
    }
  }

  return [...new Set(requires)];
}

/**
 * Build a dependency graph for all .cjs files in given directories.
 * @param {string[]} dirs - Directories to scan
 * @param {Object} [options]
 * @param {string[]} [options.excludeDirs] - Directory names to skip
 * @param {string[]} [options.excludePatterns] - File suffix patterns to skip
 * @returns {Map<string, string[]>} Map of filePath -> [dependency file paths]
 */
function buildGraph(dirs, options = {}) {
  const excludeDirs = options.excludeDirs || ['tests', 'node_modules', '.planning', '.git'];
  const excludePatterns = options.excludePatterns || ['.test.cjs'];
  const graph = new Map();

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.cjs') && !excludePatterns.some(p => entry.name.endsWith(p))) {
        const source = fs.readFileSync(full, 'utf8');
        const deps = extractRequires(full, source);
        graph.set(full, deps);
      }
    }
  }

  for (const dir of dirs) {
    scanDir(dir);
  }
  return graph;
}

/**
 * Detect cycles in a dependency graph using DFS.
 * @param {Map<string, string[]>} graph - Dependency graph
 * @param {string[][]} [allowlist] - Known intentional cycles as arrays of file paths
 * @returns {string[][]} Array of cycle paths (each is an array of file paths forming the cycle)
 */
function detectCycles(graph, allowlist = []) {
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();

  function dfs(node, stack) {
    if (inStack.has(node)) {
      // Found a cycle -- extract it from stack
      const cycleStart = stack.indexOf(node);
      const cycle = stack.slice(cycleStart).concat(node);
      cycles.push(cycle);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (graph.has(dep)) { // Only follow edges within our graph
        dfs(dep, stack);
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  // Filter out allowlisted cycles
  return cycles.filter(cycle => !isAllowlisted(cycle, allowlist));
}

/**
 * Check if a cycle is covered by an allowlist entry.
 * @param {string[]} cycle - Cycle path (last element repeats first)
 * @param {string[][]} allowlist - Array of allowed cycle node sets
 * @returns {boolean}
 */
function isAllowlisted(cycle, allowlist) {
  // cycle has the form [A, B, ..., A] where first = last
  // Extract unique nodes (drop the repeated last element)
  const cycleNodes = new Set(cycle.slice(0, -1));
  return allowlist.some(allowed => {
    const allowedSet = new Set(allowed);
    if (allowedSet.size !== cycleNodes.size) return false;
    for (const f of allowed) {
      if (!cycleNodes.has(f)) return false;
    }
    return true;
  });
}

module.exports = { extractRequires, buildGraph, detectCycles };

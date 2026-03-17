// Dynamo > Switchboard > pretty.cjs
'use strict';

// Pretty formatter for CLI output.
// All output goes to stderr (stdout reserved for JSON per GSD convention).
// Uses ANSI color codes directly (no chalk dependency).

// --- ANSI color codes ---

const isTTY = process.stderr.isTTY;

const colors = {
  green: isTTY ? '\x1b[32m' : '',
  red: isTTY ? '\x1b[31m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  gray: isTTY ? '\x1b[90m' : '',
  bold: isTTY ? '\x1b[1m' : '',
  reset: isTTY ? '\x1b[0m' : ''
};

function colorForStatus(status) {
  switch (status) {
    case 'OK': return colors.green;
    case 'FAIL': return colors.red;
    case 'WARN': return colors.yellow;
    case 'SKIP': return colors.gray;
    default: return '';
  }
}

// --- Format functions ---

/**
 * Format a single stage result line.
 * @param {{ name: string, status: string, detail: string }} stage
 * @returns {string} Formatted line like "[OK  ]  Docker: Both containers running"
 */
function formatStageResult(stage) {
  const { name, status, detail } = stage;
  const padded = status.padEnd(4);
  const color = colorForStatus(status);
  return `${color}[${padded}]${colors.reset}  ${name}: ${detail}`;
}

/**
 * Format a full health check report (6 stages) and write to stderr.
 * @param {{ stages: Array<{ name: string, status: string, detail: string }>, summary: { passed: number, total: number, ok: boolean } }} result
 */
function formatHealthReport(result) {
  const lines = [];
  lines.push(`${colors.bold}=== Dynamo Health Check ===${colors.reset}`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push('');

  for (const stage of result.stages) {
    lines.push(formatStageResult(stage));
  }

  lines.push('');

  const { passed, total } = result.summary;
  if (result.summary.ok) {
    lines.push(`${colors.green}Result: ${passed}/${total} checks passed${colors.reset}`);
  } else {
    lines.push(`${colors.red}Result: ${passed}/${total} checks passed${colors.reset}`);
  }

  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * Format a full diagnostics report (13 stages) and write to stderr.
 * @param {{ stages: Array<{ name: string, status: string, detail: string }>, summary: { passed: number, total: number, ok: boolean } }} result
 */
function formatDiagnoseReport(result) {
  const lines = [];
  lines.push(`${colors.bold}=== Dynamo Diagnostics ===${colors.reset}`);
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push('');

  for (const stage of result.stages) {
    lines.push(formatStageResult(stage));
  }

  lines.push('');

  const { passed, total } = result.summary;
  if (result.summary.ok) {
    lines.push(`${colors.green}Result: ${passed}/${total} checks passed${colors.reset}`);
  } else {
    lines.push(`${colors.red}Result: ${passed}/${total} checks passed${colors.reset}`);
  }

  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * Format a sync report and write to stderr.
 * @param {{ direction: string, files_copied: number, files_deleted: number, dry_run: boolean, conflicts: Array }} result
 */
function formatSyncReport(result) {
  const lines = [];
  const arrow = result.direction === 'push' ? 'repo -> live' : 'live -> repo';
  lines.push(`${colors.bold}=== Dynamo Sync: ${arrow} ===${colors.reset}`);

  if (result.dry_run) {
    lines.push(`${colors.yellow}(dry run -- no changes made)${colors.reset}`);
  }

  lines.push(`Copied: ${result.files_copied} files`);
  lines.push(`Deleted: ${result.files_deleted} files`);

  if (result.conflicts && result.conflicts.length > 0) {
    lines.push('');
    lines.push(`${colors.yellow}Conflicts: ${result.conflicts.length}${colors.reset}`);
    for (const conflict of result.conflicts) {
      lines.push(`  - ${conflict}`);
    }
  }

  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * Format an install report and write to stderr.
 * @param {{ steps: Array<{ name: string, status: string, detail: string }> }} result
 */
function formatInstallReport(result) {
  const lines = [];
  lines.push(`${colors.bold}=== Dynamo Install ===${colors.reset}`);

  for (const step of result.steps) {
    lines.push(formatStageResult(step));
  }

  process.stderr.write(lines.join('\n') + '\n');
}

// --- Exports ---

module.exports = {
  formatStageResult,
  formatHealthReport,
  formatDiagnoseReport,
  formatSyncReport,
  formatInstallReport
};

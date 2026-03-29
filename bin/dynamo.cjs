#!/usr/bin/env bun
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { discoverRoot } = require('../lib/paths.cjs');
const { readDaemonFile, isDaemonRunning, spawnDaemon, waitForHealth } = require('../core/daemon-lifecycle.cjs');

function parseSimpleFlags(argv) {
  const flags = {};
  for (const a of argv) {
    if (a === '--json') flags.json = true;
    else if (a === '--raw') flags.raw = true;
    else if (a === '--help') flags.help = true;
    else if (a === '--confirm') flags.confirm = true;
    else if (a === '--dry-run') flags.dryRun = true;
  }
  return flags;
}

function readTriadFile(projectRoot) {
  try { return JSON.parse(fs.readFileSync(path.join(projectRoot, '.dynamo', 'active-triad.json'), 'utf-8')); }
  catch (_e) { return null; }
}

async function readStdin() {
  let input = '';
  const reader = Bun.stdin.stream().getReader();
  try { while (true) { const { done, value } = await reader.read(); if (done) break; input += new TextDecoder().decode(value); } }
  catch (_e) { /* stdin may be empty */ }
  return input;
}

function getRoot() {
  const r = discoverRoot(process.cwd());
  if (!r.ok) { process.stderr.write('Error: ' + r.error.message + '\n'); process.exit(1); }
  return r.value;
}

async function handleStart() {
  const root = getRoot();
  const s = isDaemonRunning(root);
  if (s.running) { process.stdout.write('Dynamo already running (PID ' + s.pid + ', port ' + s.port + ')\n'); process.exit(0); }
  const { logPath } = spawnDaemon(root, {});
  const h = await waitForHealth(9876, 5000);
  if (h.ok) { const d = readDaemonFile(root); process.stdout.write('Dynamo running (PID ' + (d ? d.pid : '?') + ', port ' + (d ? d.port : 9876) + ')\n'); process.exit(0); }
  process.stderr.write('Daemon failed to start. Check ' + logPath + '\n'); process.exit(1);
}

async function handleStop() {
  const root = getRoot(); const s = isDaemonRunning(root);
  if (!s.running) { process.stdout.write('Dynamo is not running.\n'); process.exit(0); }
  try { await fetch('http://localhost:' + s.port + '/shutdown', { method: 'POST' }); } catch (_e) { /* gone */ }
  const dl = Date.now() + 5000;
  while (Date.now() < dl) { if (!isDaemonRunning(root).running) break; await new Promise(r => setTimeout(r, 200)); }
  process.stdout.write('Dynamo stopped.\n'); process.exit(0);
}

async function handleStatus() {
  const root = getRoot(); const s = isDaemonRunning(root);
  if (!s.running) { process.stdout.write('Dynamo is not running.\n'); process.exit(0); }
  try {
    const d = await (await fetch('http://localhost:' + s.port + '/health')).json();
    process.stdout.write('Status: ' + d.status + '\nPID: ' + d.pid + '\nPort: ' + d.port + '\nUptime: ' + d.uptime_seconds + 's\n');
    if (d.modules && d.modules.length > 0) process.stdout.write('Modules: ' + d.modules.map(m => m.name + '(' + m.state + ')').join(', ') + '\n');
  } catch (e) { process.stderr.write('Error fetching health: ' + e.message + '\n'); process.exit(1); }
  process.exit(0);
}

async function handleHook() {
  if (process.env.DYNAMO_DEV_BYPASS === '1') { process.stdout.write('{}'); process.exit(0); } // State 7
  const hookType = process.argv[3] || 'unknown';
  const input = await readStdin();
  let payload;
  try { payload = input ? JSON.parse(input) : {}; } catch (_e) { process.stderr.write('Error: Invalid JSON on stdin\n'); process.exit(1); }
  const rootResult = discoverRoot(process.cwd());
  if (!rootResult.ok) { process.stdout.write('{}'); process.exit(0); }
  const root = rootResult.value; const s = isDaemonRunning(root);
  if (!s.running && s.reason === 'no_pid_file') { process.stdout.write('{}'); process.exit(0); } // State 1
  if (!s.running && s.reason === 'stale_pid') { process.stderr.write('Warning: Dynamo daemon had stale PID ' + s.pid + ' (cleaned up)\n'); process.exit(1); } // State 2
  const triad = readTriadFile(root);
  const env = { SESSION_IDENTITY: process.env.SESSION_IDENTITY || (triad && triad.faceSessionIdentity), TRIPLET_ID: process.env.TRIPLET_ID || (triad && triad.triadId) };
  try {
    const resp = await fetch('http://localhost:' + s.port + '/hook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: hookType, payload, env }) });
    if (!resp.ok) { process.stderr.write('Dynamo hook error (' + hookType + '): ' + (await resp.text()) + '\n'); process.exit(1); } // State 6
    process.stdout.write(await resp.text()); process.exit(0); // State 5
  } catch (e) { process.stderr.write('Dynamo hook error (' + hookType + '): ' + e.message + '\n'); process.exit(1); }
}

function handleReverieKill() {
  const { execSync } = require('node:child_process');
  const killed = [];
  for (const pat of ['relay-server\\.cjs', 'channel-server\\.cjs', 'dangerously-load-development-channels.*dynamo-wire']) {
    try {
      const out = execSync('ps aux | grep -E ' + JSON.stringify(pat) + ' | grep -v grep', { encoding: 'utf8', timeout: 5000 }).trim();
      if (!out) continue;
      for (const line of out.split('\n')) { const p = line.trim().split(/\s+/); const pid = parseInt(p[1], 10); if (pid && pid !== process.pid) { try { process.kill(pid, 'SIGTERM'); killed.push({ pid, desc: p.slice(10).join(' ').slice(0, 80) }); } catch (_e) { /* dead */ } } }
    } catch (_e) { /* no match */ }
  }
  if (killed.length === 0) process.stdout.write('No Reverie processes found\n');
  else { process.stdout.write('Killed ' + killed.length + ' process(es):\n'); for (const p of killed) process.stdout.write('  PID ' + p.pid + ' -- ' + p.desc + '\n'); }
  process.exit(0);
}

async function handleCli() {
  const root = getRoot(); const s = isDaemonRunning(root);
  if (!s.running) { process.stderr.write('Dynamo is not running. Start with: bun bin/dynamo.cjs start\n'); process.exit(1); }
  try {
    const r = await (await fetch('http://localhost:' + s.port + '/cli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: process.argv[2], args: process.argv.slice(3), flags: parseSimpleFlags(process.argv) }) })).json();
    process.stdout.write(r.output || ''); process.exit(r.exitCode || 0);
  } catch (e) { process.stderr.write('Error: ' + e.message + '\n'); process.exit(1); }
}

const cmd = process.argv[2];
if (cmd === 'reverie' && process.argv[3] === 'kill') handleReverieKill();
else if (cmd === 'start') handleStart();
else if (cmd === 'stop') handleStop();
else if (cmd === 'status') handleStatus();
else if (cmd === 'hook') handleHook();
else handleCli();

module.exports = { parseSimpleFlags, readTriadFile };

# Phase 11: REM Consolidation - Research

**Researched:** 2026-03-24
**Domain:** Three-tier consolidation pipeline, fragment promotion, Self Model conditioning, association index editorial, operational mode transitions
**Confidence:** HIGH (architecture) / MEDIUM (decay tuning, conditioning calibration)

## Summary

Phase 11 implements the final editorial gate in Reverie's memory system: the REM consolidation pipeline. Nothing enters long-term storage without passing through REM (REM-07). The pipeline has three tiers triggered by different lifecycle events: Tier 1 (PreCompact -- fast filesystem snapshot), Tier 2 (heartbeat-based idle detection -- provisional consolidation), and Tier 3 (Stop hook -- full editorial pass). The phase also delivers Self Model conditioning updates (SM-04), REM/Dormant operational modes (OPS-03/OPS-04), and the crash recovery mechanism for orphaned working fragments.

The codebase is well-prepared. Mode Manager already has `OPERATIONAL_MODES.REM` and `OPERATIONAL_MODES.DORMANT` as frozen constants with placeholder comments. FragmentWriter has atomic dual-provider writes suitable for promotion. The decay function (`computeDecay`, `shouldArchive`) is ready for Dormant maintenance. The conditioning schema has all required fields (`attention_biases`, `sublimation_sensitivity`, `recall_strategies`, `error_history`) as optional Zod fields ready for population. The Wire protocol already includes `MESSAGE_TYPES.HEARTBEAT`. Session Manager has ordered shutdown logic that Phase 11 extends with REM-mode transitions. Mind cycle's `processTurn` has a comment stub: "Phase 11 conditioning replaces this" for the behavioral directive slot.

The primary research gaps are the two EXPERIMENTAL flags: decay constant tuning (9.3) and taxonomy convergence signal for conditioning (9.6). Both are empirical tuning problems, not architectural unknowns. The recommendation is to build with configurable defaults and defer live tuning to post-deployment measurement. A simulation harness for decay is recommended but is a testing utility, not a gating dependency.

**Primary recommendation:** Build the REM pipeline as a new `rem-consolidator.cjs` component that orchestrates existing primitives (FragmentWriter for promotion, Self Model for conditioning, Association Index for editorial, Decay for maintenance). Extend Mode Manager and Session Manager with REM/Dormant transitions. Wire heartbeat for Tier 2 detection. All LLM-driven operations (retroactive evaluation, editorial pass, quality evaluation) run in-process on Secondary since Secondary is a full Claude Code session.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Tier 1 triage snapshots Mind state only (attention pointer, completed fragments in working/, active sublimation candidates, Self Model prompt state). No tracking of in-flight formation subagents. Fast and synchronous (filesystem writes only, no LLM calls).
- **D-02:** Tier 2 triggers via heartbeat-based detection. Primary sends periodic heartbeats to Secondary via Wire. When heartbeats stop, Secondary initiates Tier 2.
- **D-03:** If user returns mid-Tier-2 (heartbeats resume), abort and revert. Cancel provisional REM, discard all tentative promotions, fragments stay in working/.
- **D-04:** Tier 2 auto-promotes on completion. Once provisional REM finishes, results are the consolidation. No separate promotion step.
- **D-05:** Tier 3 triggers on explicit session end (Stop hook). No time pressure. Deep editorial pass.
- **D-06:** Retroactive evaluation is LLM-driven. Mind re-reads all session fragments with full session summary context.
- **D-07:** Fragment promotion gate: promote or discard. No archive path for REM-rejected fragments. Clean separation.
- **D-08:** Association index editorial pass is LLM-driven. Mind reviews domain pairs with high entity overlap for merge decisions.
- **D-09:** Recall meta-fragment creation during REM with full recall context.
- **D-10:** Conditioning fields update via EMA with configurable alpha (0.1-0.3). Single anomalous sessions wash out.
- **D-11:** Identity Core has hard floors. Personality traits never zero out or invert. Conditioning moves freely. Identity Core requires sustained evidence across multiple consolidation cycles.
- **D-12:** Entropy engine quality evaluation uses both behavioral signals and LLM reflection.
- **D-13:** REM mode uses in-process Secondary. Stop hook terminates Tertiary, then Primary ends. Secondary stays alive for REM. When done, Secondary terminates itself.
- **D-14:** Dormant mode decay maintenance -- Claude's discretion. Constraint: decay must eventually happen.
- **D-15:** Mode Manager transitions: sequential with crash fallback. Active -> REM (always) -> Dormant. No skipping REM. Crash fallback: orphaned working/ fragments trigger recovery REM on next SessionStart.

### Claude's Discretion
- Sublimation triage cap and criteria: Claude decides how many contributing sublimations become sublimation fragments per session and the signal-to-noise evaluation criteria. Constraint: signal/noise ratio per domain must update Conditioning's sublimation sensitivity thresholds.
- Dormant mode decay maintenance mechanism: Options include SessionStart-triggered catch-up or lightweight scheduled process.

### Deferred Ideas (OUT OF SCOPE)
- Self-Organizing Taxonomy (Phase 12, FRG-07) -- Phase 11 handles near-synonym merging only; full governance rules are Phase 12.
- Source-Reference Model (Phase 12, FRG-08) -- REM processes source-reference fragments like any other type.
- Mind-Controlled Dynamic Referential Framing (Backlog from Phase 10) -- Enabled by conditioning but not in scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REM-01 | Tier 1 triage on compaction events (fast working state preservation to Journal) | D-01: filesystem-only writes of attention pointer, completed fragments, sublimation candidates, Self Model prompt state. Extends existing PreCompact hook handler. |
| REM-02 | Tier 2 provisional REM on idle timeout (full consolidation flagged tentative) | D-02/D-03/D-04: Heartbeat-based detection via existing Wire HEARTBEAT message type. Abort-and-revert on user return. Auto-promote on completion. |
| REM-03 | Tier 3 full REM on explicit session end (deep editorial pass) | D-05/D-06: Stop hook triggers. LLM-driven retroactive evaluation in-process on Secondary. No time pressure. |
| REM-04 | Retroactive evaluation of session fragments against completed session arc | D-06: Mind re-reads all session fragments with full session summary. Updates relevance scores, attention tags, pointers retroactively. |
| REM-05 | Association index editorial pass (entity dedup, weight updates, domain boundary review) | D-08: LLM-driven editorial judgment on domain pairs. Operates on existing 12-table DuckDB schema. |
| REM-06 | Self Model conditioning update (attention biases, recall strategies, error history) | D-10/D-11/D-12: EMA accumulation with configurable alpha. Identity Core hard floors. Entropy engine quality evaluation with behavioral + LLM signals. |
| REM-07 | Working memory -> long-term memory gate (nothing enters consolidated storage without REM) | D-07/D-15: Promote or discard. No archive for rejected fragments. Crash fallback ensures gate is eventually enforced. |
| SM-04 | Conditioning -- attention biases, association priors, sublimation sensitivity, recall strategies, error history | D-10: EMA updates via Self Model setAspect(). conditioningSchema already has all fields as optional Zod fields. |
| OPS-03 | REM mode -- post-session consolidation, Secondary only | D-13: In-process Secondary runs REM. Tertiary and Primary terminated. Secondary terminates itself when done. |
| OPS-04 | Dormant mode -- no sessions, scheduled decay maintenance only | D-14/D-15: Decay maintenance via catch-up on next SessionStart (Claude's discretion). computeDecay() and shouldArchive() already implemented. |
</phase_requirements>

## Standard Stack

### Core (No new dependencies)

Phase 11 introduces zero new dependencies. All capabilities are built from existing Dynamo platform services and Reverie components.

| Component | Role in Phase 11 | Already Exists |
|-----------|-------------------|----------------|
| Wire (protocol.cjs) | HEARTBEAT message type for Tier 2 detection | Yes - MESSAGE_TYPES.HEARTBEAT exists |
| FragmentWriter | Fragment promotion (working/ -> active/) and discard | Yes - writeFragment, deleteFragment, updateFragment |
| Self Model (self-model.cjs) | Conditioning EMA updates via save/setAspect | Yes - conditioningSchema with all SM-04 fields |
| Entropy Engine | Session quality evaluation and sigma evolution | Yes - evolve() with quality-based sigma adjustment |
| Decay (decay.cjs) | Dormant maintenance computation | Yes - computeDecay, shouldArchive |
| Association Index | Editorial pass target (12 DuckDB tables) | Yes - all DDL defined |
| Mode Manager | REM/DORMANT mode transitions | Yes - constants defined, transitions placeholder |
| Session Manager | Stop hook -> REM transition orchestration | Yes - stop() with ordered shutdown |
| Mind Cycle | REM cognitive operations (Secondary in-process) | Yes - composeFacePrompt, processTurn |
| Switchboard | REM lifecycle events | Yes - standard event emission |
| Journal | Working fragment reads, triage state persistence | Yes - write, read, delete |
| Lathe | File operations for triage snapshots | Yes - writeFile, readFile |

### Alternatives Considered

None. Phase 11 is exclusively built from existing components. The user's locked decisions confirm this: "REM mode uses in-process Secondary" (D-13), meaning no new session types or external processes.

## Architecture Patterns

### Recommended Component Structure

```
modules/reverie/components/
  rem/
    rem-consolidator.cjs          # Top-level orchestrator (Tier 1/2/3 dispatch)
    triage.cjs                    # Tier 1: fast state snapshot to Journal
    provisional-rem.cjs           # Tier 2: provisional consolidation with abort
    full-rem.cjs                  # Tier 3: deep editorial pipeline
    retroactive-evaluator.cjs     # REM-04: re-evaluate fragments against session arc
    editorial-pass.cjs            # REM-05: association index editorial operations
    conditioning-updater.cjs      # SM-04/REM-06: EMA conditioning updates
    quality-evaluator.cjs         # D-12: behavioral + LLM session quality scoring
    heartbeat-monitor.cjs         # D-02: Wire heartbeat listener for Tier 2 trigger
    __tests__/
      rem-consolidator.test.js
      triage.test.js
      provisional-rem.test.js
      full-rem.test.js
      retroactive-evaluator.test.js
      editorial-pass.test.js
      conditioning-updater.test.js
      quality-evaluator.test.js
      heartbeat-monitor.test.js
```

### Pattern 1: REM Consolidator Orchestrator

**What:** Top-level component that dispatches to the correct tier based on trigger source. Injected into hook handlers and Mode Manager.

**When to use:** All REM invocations flow through the consolidator.

**Example:**
```javascript
'use strict';

function createRemConsolidator({
  triage,           // Tier 1 component
  provisionalRem,   // Tier 2 component
  fullRem,          // Tier 3 component
  modeManager,
  switchboard,
} = {}) {

  async function handleTier1(payload) {
    // PreCompact event -- fast, synchronous-like
    const result = await triage.snapshot(payload);
    if (switchboard) switchboard.emit('reverie:rem:tier1-complete', result);
    return result;
  }

  async function handleTier2() {
    // Heartbeat timeout -- provisional consolidation
    const result = await provisionalRem.run();
    if (switchboard) switchboard.emit('reverie:rem:tier2-complete', result);
    return result;
  }

  async function handleTier3(sessionSummary) {
    // Stop hook -- full REM pipeline
    // Mode Manager already transitioned to REM mode before this call
    const result = await fullRem.run(sessionSummary);
    if (switchboard) switchboard.emit('reverie:rem:tier3-complete', result);
    return result;
  }

  return Object.freeze({
    handleTier1,
    handleTier2,
    handleTier3,
  });
}
```

### Pattern 2: Fragment Promotion via FragmentWriter

**What:** Promotion from working/ to active/ uses the existing FragmentWriter pattern with updated lifecycle status.

**When to use:** During Tier 2 (auto-promote on completion) and Tier 3 (promote/discard gate).

**Design consideration:** FragmentWriter currently writes to working/ by default (`fragment._lifecycle || LIFECYCLE_DIRS.working`). Promotion needs to:
1. Read the existing fragment from working/
2. Update frontmatter (headers reflecting full session context per D-06)
3. Write the updated fragment to active/ (set `_lifecycle = LIFECYCLE_DIRS.active`)
4. Update Ledger `fragment_decay.lifecycle = 'active'`
5. Delete the working/ copy from Journal

This is a new `promoteFragment()` method on FragmentWriter (or a standalone promotion utility that composes FragmentWriter operations). The key constraint is Journal-first with Ledger rollback -- the same atomic pattern used for initial writes.

### Pattern 3: EMA Conditioning Update

**What:** Exponential moving average for conditioning field updates per D-10.

**When to use:** During every REM cycle for attention_biases, recall_strategies, sublimation_sensitivity, error_history.

**Example:**
```javascript
function emaUpdate(currentValue, sessionEvidence, alpha) {
  // alpha typically 0.1-0.3
  return currentValue * (1 - alpha) + sessionEvidence * alpha;
}

// For object-valued conditioning fields (e.g., attention_biases is a Record<string, number>)
function emaUpdateRecord(current, sessionEvidence, alpha) {
  const result = { ...current };
  for (const [key, sessionValue] of Object.entries(sessionEvidence)) {
    const currentValue = current[key] != null ? current[key] : 0.5; // Default midpoint
    result[key] = currentValue * (1 - alpha) + sessionValue * alpha;
  }
  return result;
}
```

### Pattern 4: Heartbeat Monitor for Tier 2

**What:** Secondary listens for Wire HEARTBEAT messages from Primary. When heartbeats stop arriving beyond a configurable timeout, Tier 2 initiates.

**When to use:** Continuous monitoring during active sessions.

**Design:**
```javascript
function createHeartbeatMonitor({ wire, switchboard, config } = {}) {
  const _timeout = config.heartbeat_timeout_ms || 60000; // 60s default
  let _lastHeartbeat = Date.now();
  let _timer = null;
  let _active = false;

  function onHeartbeat(envelope) {
    _lastHeartbeat = Date.now();
    // If Tier 2 was in progress and heartbeat resumes, abort
    if (switchboard) switchboard.emit('reverie:heartbeat:received', {});
  }

  function start() {
    _active = true;
    _timer = setInterval(function check() {
      const elapsed = Date.now() - _lastHeartbeat;
      if (elapsed > _timeout && _active) {
        if (switchboard) switchboard.emit('reverie:heartbeat:timeout', { elapsed });
      }
    }, 5000); // Check every 5s
  }

  function stop() {
    _active = false;
    if (_timer) clearInterval(_timer);
  }

  return Object.freeze({ onHeartbeat, start, stop });
}
```

Primary's hook handler sends heartbeats on every `UserPromptSubmit` (leveraging the existing turn-by-turn hook flow -- no new timer needed in Primary). Secondary's heartbeat monitor listens via Wire subscription.

### Pattern 5: Mode Transition Extension

**What:** Extend Mode Manager and Session Manager to support REM and Dormant mode transitions.

**Current state:**
- Mode Manager has `OPERATIONAL_MODES.REM` and `OPERATIONAL_MODES.DORMANT` as constants but `requestActive()` and `requestPassive()` are the only transition methods.
- Session Manager has `SESSION_STATES` but no REM-specific states.
- TRANSITIONS map has `STOPPED: []` (terminal state).

**What needs to change:**
1. Mode Manager: Add `requestRem(sessionSummary)` and `requestDormant()` methods.
2. Session Manager: The Stop hook currently calls `sessionManager.stop()` which transitions to STOPPED. Phase 11 changes this: Stop hook triggers REM mode instead of direct stop. Session Manager needs a `transitionToRem()` that stops Tertiary but keeps Secondary alive.
3. session-config.cjs TRANSITIONS: Add new valid transitions:
   - `ACTIVE -> SHUTTING_DOWN` stays
   - `PASSIVE -> SHUTTING_DOWN` stays
   - But `SHUTTING_DOWN -> STOPPED` needs an intermediate: `SHUTTING_DOWN -> REM` or a new state like `REM_PROCESSING`.

**Design recommendation:** Add `SESSION_STATES.REM_PROCESSING` as a new lifecycle state. The transition chain becomes:
```
Active/Passive -> SHUTTING_DOWN -> REM_PROCESSING -> STOPPED
```
Where `SHUTTING_DOWN` stops Tertiary, `REM_PROCESSING` runs the full REM pipeline on Secondary, and `STOPPED` is reached when Secondary terminates itself after REM completes.

### Anti-Patterns to Avoid

- **REM as a separate process:** Per D-13, REM runs in-process on Secondary. Do NOT spawn a new session for REM. Secondary is already a full Claude Code session with LLM capabilities.
- **Partial promotion:** Per D-07, fragments are either promoted or discarded. Never leave fragments in a half-promoted state. The FragmentWriter atomic pattern prevents this.
- **Direct Ledger writes from REM:** All Ledger mutations MUST go through Wire write coordinator, even during REM. The single-writer constraint (Pitfall 1) applies to all writes regardless of operational mode.
- **Blocking hook handlers with REM work:** The Stop hook must return quickly. REM processing happens asynchronously after the hook returns. D-13 specifies Secondary stays alive after Primary ends.
- **Skipping REM on crash:** Per D-15, crash recovery detects orphaned working/ fragments and runs recovery REM. Never allow working/ fragments to accumulate across sessions without REM processing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fragment file moves (working/ -> active/) | Custom fs.rename + Ledger update | FragmentWriter with lifecycle parameter | Atomic dual-provider guarantee prevents Pitfall 4 |
| Conditioning field math | Ad-hoc averaging per field | Centralized EMA utility with configurable alpha | DRY, testable, matches D-10 spec exactly |
| Heartbeat timing | Custom setInterval in Primary | Wire HEARTBEAT messages on UserPromptSubmit | Existing protocol, existing transport, no new timers in Primary |
| Session quality scoring | Single heuristic | Composite scorer (behavioral signals + LLM reflection per D-12) | Neither signal alone is sufficient |
| Mode state machine | Free-form if/else chains | Extend existing Mode Manager frozen API + session-config TRANSITIONS map | Validated pattern from Phase 10, prevents invalid transitions |
| Journal-Ledger consistency audit | Post-hoc reconciliation script | Built into every REM cycle per Pitfall 4 prevention | Continuous enforcement, not periodic cleanup |

**Key insight:** Phase 11's primary challenge is orchestration, not novel algorithms. Every building block (FragmentWriter, decay, association index, Self Model, Wire, Switchboard) already exists. The REM consolidator composes these primitives in a specific sequence with LLM-driven editorial decisions. The complexity is in the coordination, not the components.

## Common Pitfalls

### Pitfall 1: Fragment Promotion Breaks Journal-Ledger Consistency (Pitfall 4 Extension)

**What goes wrong:** During promotion, a fragment is moved from working/ to active/ in Journal but the Ledger lifecycle update fails. Recall then finds the fragment at the wrong path, or the fragment appears in both working/ and active/ queries.

**Why it happens:** Promotion involves two operations (Journal path change + Ledger status update) with no cross-system transaction. The same split-storage risk that motivated FragmentWriter applies to promotion.

**How to avoid:** Implement promotion as a FragmentWriter operation: (1) write fragment to active/ in Journal, (2) update `fragment_decay.lifecycle = 'active'` in Ledger via Wire, (3) only delete working/ copy after Ledger update confirms. If Ledger fails, delete the active/ copy (rollback). A fragment temporarily existing in both directories is safe (query by lifecycle status, not directory).

**Warning signs:** Fragments appearing in both working/ and active/ after REM. Fragment counts not matching between Journal directory listing and Ledger lifecycle query.

### Pitfall 2: REM Creates More Fragments Than It Removes (Pitfall 9)

**What goes wrong:** Meta-recall fragments (D-09) + consolidation fragments + sublimation fragments from triage can exceed the number of fragments pruned, causing unbounded growth.

**Why it happens:** Every recall event becomes a meta-recall fragment. Sessions with many recall events generate many new fragments during REM.

**How to avoid:** Per Pitfall 9 prevention: (1) Fragment budget per session -- cap net new consolidated fragments at a configurable limit (e.g., 20). (2) Meta-recall selectivity -- only create meta-recall fragments for high-significance recall events (changed conversation direction, high-rated reconstruction). (3) Track active fragment count and alert if growth rate exceeds threshold. (4) Sublimation triage cap (Claude's discretion area) should be conservative.

**Warning signs:** Active fragment count monotonically increasing with no plateau after ~10 sessions.

### Pitfall 3: Conditioning Trait Collapse (Pitfall 13)

**What goes wrong:** Over many sessions, EMA conditioning converges on a narrow personality. Traits with low user reinforcement decay toward zero. The Self Model becomes a caricature.

**Why it happens:** EMA naturally converges. If user sessions consistently reinforce the same traits, underrepresented traits drift toward zero.

**How to avoid:** Per D-11: (1) Identity Core hard floors -- no trait below configurable minimum (e.g., 0.1). (2) Diversity metric -- calculate trait variance across all dimensions during REM. If variance drops below threshold, slightly boost underrepresented traits. (3) Identity Core changes require N >= 5 consecutive sessions showing same pattern. (4) Conditioning fields (attention_biases, recall_strategies) move freely; only Identity Core has floors.

**Warning signs:** Standard deviation of trait weights decreasing monotonically across sessions.

### Pitfall 4: Tier 2 Race Condition with User Return

**What goes wrong:** Tier 2 provisional REM is in progress. User returns (heartbeats resume). Abort fires but a partial promotion has already written some fragments to active/. The system is in an inconsistent state.

**Why it happens:** Tier 2 operations are not atomic -- promotion happens fragment-by-fragment. An abort mid-sequence leaves some fragments promoted and some still in working/.

**How to avoid:** Per D-03: (1) Tier 2 marks all promotions as tentative until the entire batch completes. Use a Ledger column or a tentative flag in fragment frontmatter. (2) On abort, query all tentative-marked fragments and revert them (move back to working/, remove tentative flag). (3) On completion (D-04), remove tentative flags in one batch operation. This makes abort cheap and safe.

**Warning signs:** Fragments with `tentative: true` surviving across sessions (indicating incomplete abort).

### Pitfall 5: Heartbeat False Positives

**What goes wrong:** Network latency, Wire relay congestion, or Primary being busy with a long tool operation causes heartbeat delay that exceeds the timeout. Tier 2 triggers on a session that is still active.

**Why it happens:** The heartbeat timeout is a simple elapsed-time check. Long-running tool operations (e.g., a 30-second build command) naturally suppress hook events, which suppress heartbeats.

**How to avoid:** (1) Set heartbeat timeout conservatively (60-120 seconds, not 10-30 seconds). (2) Distinguish "no heartbeats at all" (session dead) from "heartbeat gap" (session busy). Use a two-threshold system: first threshold triggers a warning/probe, second threshold triggers Tier 2. (3) Tier 2 abort-and-revert (D-03) is the safety net -- even false positives are recoverable.

**Warning signs:** Tier 2 triggering during active sessions (detectable by heartbeat resumption after Tier 2 starts).

### Pitfall 6: Stop Hook Timing vs. REM Duration

**What goes wrong:** The Stop hook must return quickly (hooks are synchronous from Claude Code's perspective). But D-13 says Secondary stays alive after Primary ends for REM. If the Stop hook tries to wait for REM completion, it blocks the user.

**Why it happens:** The Stop hook fires when the user ends their session. They expect the terminal to close promptly. REM could take 30-120 seconds.

**How to avoid:** The Stop hook must: (1) Signal Mode Manager to transition to REM. (2) Fire-and-forget -- do NOT await REM completion. (3) Secondary runs REM asynchronously. The hook returns immediately. Secondary (as a separate process) continues running. When REM completes, Secondary terminates itself. This is the same fire-and-forget pattern used for sessionManager.start() in the SessionStart hook (Phase 10 established this pattern).

**Warning signs:** Stop hook taking more than 1 second to return.

## Code Examples

### Fragment Promotion Pattern

```javascript
// Source: Derived from existing FragmentWriter pattern in fragment-writer.cjs
async function promoteFragment(fragmentId, updatedFrontmatter, updatedBody) {
  // 1. Write to active/ directory in Journal
  updatedFrontmatter._lifecycle = LIFECYCLE_DIRS.active;
  const writeResult = await fragmentWriter.writeFragment(updatedFrontmatter, updatedBody);
  if (!writeResult.ok) return writeResult;

  // 2. Update lifecycle in Ledger via Wire
  const lifecycleEnvelope = createEnvelope({
    type: MESSAGE_TYPES.WRITE_INTENT,
    from: 'rem-consolidator',
    to: 'ledger',
    payload: {
      table: 'fragment_decay',
      data: [{ fragment_id: fragmentId, lifecycle: LIFECYCLE_DIRS.active }],
      operation: 'update',
    },
    urgency: URGENCY_LEVELS.ACTIVE,
  });
  if (!lifecycleEnvelope.ok) {
    // Rollback: delete active/ copy
    await journal.delete(fragmentId);
    return lifecycleEnvelope;
  }
  wire.queueWrite(lifecycleEnvelope.value);

  // 3. Delete working/ copy
  await journal.delete(fragmentId); // Deletes from working/ path

  return ok({ id: fragmentId, promoted: true });
}
```

### EMA Conditioning Update Pattern

```javascript
// Source: Derived from D-10 spec and conditioningSchema in schemas.cjs
const CONDITIONING_DEFAULTS = Object.freeze({
  ema_alpha: 0.15,                  // Default EMA alpha (0.1-0.3 range per D-10)
  identity_floor: 0.1,             // Hard floor for Identity Core traits per D-11
  identity_min_sessions: 5,        // Minimum sessions before Identity Core update per D-11
  diversity_threshold: 0.05,       // Minimum trait variance before intervention per Pitfall 13
});

function updateConditioning(currentConditioning, sessionEvidence, config) {
  const alpha = config.ema_alpha || CONDITIONING_DEFAULTS.ema_alpha;
  const updated = {};

  // Attention biases: EMA per domain
  updated.attention_biases = emaUpdateRecord(
    currentConditioning.attention_biases || {},
    sessionEvidence.attention_biases || {},
    alpha
  );

  // Sublimation sensitivity: EMA per domain
  updated.sublimation_sensitivity = emaUpdateRecord(
    currentConditioning.sublimation_sensitivity || {},
    sessionEvidence.sublimation_sensitivity || {},
    alpha
  );

  // Recall strategies: append new effective strategies, EMA their scores
  updated.recall_strategies = updateRecallStrategies(
    currentConditioning.recall_strategies || [],
    sessionEvidence.recall_strategies || [],
    alpha
  );

  // Error history: append session errors, cap at configurable max
  updated.error_history = appendErrors(
    currentConditioning.error_history || [],
    sessionEvidence.errors || [],
    config.max_error_history || 50
  );

  return updated;
}
```

### Heartbeat Emission from Primary Hook

```javascript
// Source: Derived from existing UserPromptSubmit handler in hook-handlers.cjs
// Add to handleUserPromptSubmit after the Wire snapshot send:
if (wireTopology && sessionManager && sessionManager.getState().state !== 'stopped') {
  try {
    wireTopology.send({
      from: 'primary',
      to: 'secondary',
      type: MESSAGE_TYPES.HEARTBEAT,
      urgency: URGENCY_LEVELS.BACKGROUND,
      payload: { timestamp: Date.now() },
    }).catch(function (_e) {
      // Heartbeat send failure is non-fatal
    });
  } catch (_e) {
    // Non-fatal
  }
}
```

### Crash Recovery on SessionStart

```javascript
// Source: Derived from D-15 crash fallback specification
async function checkOrphanedFragments(journal, dataDir) {
  // Scan working/ directory for fragment files not belonging to current session
  const workingPath = path.join(dataDir, 'data', 'fragments', 'working');
  const sessions = await lathe.readDir(workingPath);

  // Filter for session directories that are not the current session
  const orphanedSessions = sessions.filter(s => s !== currentSessionId);

  if (orphanedSessions.length > 0) {
    return { hasOrphans: true, sessions: orphanedSessions };
  }
  return { hasOrphans: false, sessions: [] };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple timer-based idle detection | Heartbeat-based three-state detection (D-02) | Phase 11 design decision | Distinguishes dead sessions from idle users from genuine ends |
| Archive path for low-quality fragments | Promote or discard only (D-07) | Phase 11 design decision | Cleaner separation -- rejected fragments never existed in long-term |
| Time-based provisional REM auto-promote | Complete-then-promote (D-04) | Phase 11 design decision | No second timer, no dangling provisional state |
| Kill-and-restart for REM | In-process Secondary continuation (D-13) | Phase 11 design decision | No serialization overhead, no new session spawn cost |

**Deprecated/outdated patterns within this codebase:**
- Mode Manager currently only supports Active/Passive transitions. Phase 11 extends to REM/Dormant.
- Session Manager `stop()` transitions directly to STOPPED. Phase 11 inserts REM_PROCESSING intermediate state.
- Stop hook calls `sessionManager.stop()` directly. Phase 11 changes flow: Stop hook -> mode transition -> REM processing -> then stop.
- Mind cycle's `directives.behavioral` is always `null` (comment: "Phase 11 conditioning replaces this"). Phase 11 populates this from conditioning data.

## Open Questions

1. **Heartbeat timeout duration**
   - What we know: Must be long enough to avoid false positives during long tool operations (30+ seconds). Must be short enough to detect dead sessions before the user starts a new one.
   - What's unclear: Optimal value depends on typical user behavior patterns.
   - Recommendation: Start at 90 seconds. Make configurable. The abort-and-revert mechanism (D-03) makes false positives recoverable.

2. **EMA alpha value selection**
   - What we know: D-10 specifies 0.1-0.3 range. Lower alpha = slower adaptation, more stable. Higher alpha = faster adaptation, more responsive.
   - What's unclear: Optimal per conditioning field type. Attention biases might need faster adaptation (alpha 0.2-0.3) while recall strategies need slower (alpha 0.1-0.15).
   - Recommendation: Start with alpha = 0.15 for all fields. Make per-field configurable. After 10+ sessions, analyze convergence patterns and adjust.

3. **Fragment budget per session**
   - What we know: Pitfall 9 warns about fragment growth. Meta-recall and sublimation triage both create fragments.
   - What's unclear: What is a reasonable net fragment growth cap?
   - Recommendation: Start with 20 net new consolidated fragments per session. Track actual growth and adjust. The cap should be a constant in constants.cjs for tuning.

4. **Decay constant tuning (EXPERIMENTAL 9.3)**
   - What we know: DECAY_DEFAULTS in constants.cjs: base_decay_rate=0.05, consolidation_protection=0.3, access_weight=0.1, archive_threshold=0.1.
   - What's unclear: Whether different fragment types need different curves. Source-reference fragments may need slower decay.
   - Recommendation: Use existing defaults for Phase 11. Add fragment-type-specific decay override capability (per-type decay rate map in constants.cjs). Build a simulation harness as a test utility to visualize survival curves. Defer live tuning to post-deployment measurement with real accumulated data.

5. **REM time budget**
   - What we know: Research SUMMARY.md recommends 120-second cap for Tier 3.
   - What's unclear: Whether this is sufficient for sessions with 40+ fragments and complex editorial decisions.
   - Recommendation: Implement time-boxing at 120 seconds. If time expires, complete current operation and defer remaining work. Log what was skipped. This is better than open-ended processing that could leave Secondary running for minutes.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | bunfig.toml (root: "./") |
| Quick run command | `bun test modules/reverie/components/rem/` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REM-01 | Tier 1 triage snapshots state on PreCompact | unit | `bun test modules/reverie/components/rem/__tests__/triage.test.js -x` | Wave 0 |
| REM-02 | Tier 2 triggers on heartbeat timeout, aborts on resume | unit | `bun test modules/reverie/components/rem/__tests__/provisional-rem.test.js -x` | Wave 0 |
| REM-03 | Tier 3 runs full pipeline on Stop | unit + integration | `bun test modules/reverie/components/rem/__tests__/full-rem.test.js -x` | Wave 0 |
| REM-04 | Retroactive evaluation updates fragment headers | unit | `bun test modules/reverie/components/rem/__tests__/retroactive-evaluator.test.js -x` | Wave 0 |
| REM-05 | Editorial pass deduplicates entities, updates weights | unit | `bun test modules/reverie/components/rem/__tests__/editorial-pass.test.js -x` | Wave 0 |
| REM-06 | Conditioning EMA updates with trait floors | unit | `bun test modules/reverie/components/rem/__tests__/conditioning-updater.test.js -x` | Wave 0 |
| REM-07 | Nothing promoted without REM, discard path works | integration | `bun test modules/reverie/components/rem/__tests__/full-rem.test.js -x` | Wave 0 |
| SM-04 | Conditioning fields populated after REM | unit | `bun test modules/reverie/components/rem/__tests__/conditioning-updater.test.js -x` | Wave 0 |
| OPS-03 | Mode Manager transitions to REM mode correctly | unit | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js -x` | Extend existing |
| OPS-04 | Dormant mode runs decay maintenance | unit | `bun test modules/reverie/components/rem/__tests__/rem-consolidator.test.js -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test modules/reverie/components/rem/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `modules/reverie/components/rem/__tests__/rem-consolidator.test.js` -- covers REM-01, REM-03, OPS-04
- [ ] `modules/reverie/components/rem/__tests__/triage.test.js` -- covers REM-01
- [ ] `modules/reverie/components/rem/__tests__/provisional-rem.test.js` -- covers REM-02
- [ ] `modules/reverie/components/rem/__tests__/full-rem.test.js` -- covers REM-03, REM-04, REM-07
- [ ] `modules/reverie/components/rem/__tests__/retroactive-evaluator.test.js` -- covers REM-04
- [ ] `modules/reverie/components/rem/__tests__/editorial-pass.test.js` -- covers REM-05
- [ ] `modules/reverie/components/rem/__tests__/conditioning-updater.test.js` -- covers REM-06, SM-04
- [ ] `modules/reverie/components/rem/__tests__/quality-evaluator.test.js` -- covers D-12
- [ ] `modules/reverie/components/rem/__tests__/heartbeat-monitor.test.js` -- covers D-02
- [ ] Extend `modules/reverie/components/modes/__tests__/mode-manager.test.js` -- covers OPS-03, OPS-04 transitions

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun, CJS format, `'use strict'` in every file
- **Module format:** `require()` / `module.exports` -- no ESM in source
- **No npm dependencies:** Phase 11 adds zero new packages
- **Engineering principles:** Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing
- **Options-based DI:** All new REM components take injected dependencies (validated v0 pattern)
- **Contract shapes:** SHAPE constant + createContract() for frozen APIs
- **Object.freeze():** All exported constants frozen for runtime immutability
- **Git:** Always push to origin after commits. User decides version increments.
- **GSD workflow:** All changes through GSD commands
- **Canonical docs:** `.claude/new-plan.md` and `.claude/reverie-spec-v2.md` are absolute canon
- **Data format:** JSON for structured data, Markdown for narrative
- **Testing:** `bun:test` (built-in), Jest-compatible API

## Sources

### Primary (HIGH confidence)
- `.claude/reverie-spec-v2.md` -- Sections 5.1-5.4 (REM), 7.3-7.4 (modes), 9.3 (decay), 9.6 (taxonomy)
- `.planning/phases/11-rem-consolidation/11-CONTEXT.md` -- All 15 locked decisions, discretion areas, deferred items
- `modules/reverie/components/modes/mode-manager.cjs` -- Existing Mode Manager with REM/DORMANT constants
- `modules/reverie/components/fragments/fragment-writer.cjs` -- Atomic dual-provider write pattern
- `modules/reverie/components/fragments/decay.cjs` -- computeDecay, shouldArchive
- `modules/reverie/components/fragments/association-index.cjs` -- 12-table DDL
- `modules/reverie/components/self-model/self-model.cjs` -- save/load/getAspect/setAspect
- `modules/reverie/components/self-model/entropy-engine.cjs` -- evolve() with quality-based sigma
- `modules/reverie/lib/schemas.cjs` -- conditioningSchema fields
- `modules/reverie/lib/constants.cjs` -- DECAY_DEFAULTS, LIFECYCLE_DIRS, FRAGMENT_TYPES
- `modules/reverie/hooks/hook-handlers.cjs` -- Stop, PreCompact hook handlers
- `modules/reverie/components/session/session-manager.cjs` -- stop() ordered shutdown
- `modules/reverie/components/session/session-config.cjs` -- SESSION_STATES, TRANSITIONS
- `modules/reverie/components/session/mind-cycle.cjs` -- Mind cognitive cycle
- `core/services/wire/protocol.cjs` -- MESSAGE_TYPES.HEARTBEAT exists

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` -- Pitfalls 4, 7, 9, 13 (directly relevant to Phase 11)
- `.planning/research/SUMMARY.md` -- Phase ordering rationale, REM time budget recommendation
- `.planning/REQUIREMENTS.md` -- REM-01 through REM-07, SM-04, OPS-03, OPS-04

### Tertiary (LOW confidence -- needs validation)
- Decay constant optimal values (EXPERIMENTAL 9.3) -- no empirical data, defaults are educated guesses
- Taxonomy convergence signal quality (EXPERIMENTAL 9.6) -- affects editorial pass domain merge decisions
- REM time budget sufficiency (120s cap) -- untested with real accumulated fragment volumes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all primitives exist and are verified against source code
- Architecture: HIGH -- component boundaries clear, integration points documented, patterns established in Phases 7-10
- Pitfalls: HIGH (critical: Pitfall 4 split-storage, Pitfall 9 growth) / MEDIUM (Pitfall 13 trait collapse, heartbeat false positives)
- Conditioning calibration: MEDIUM -- EMA math is straightforward but optimal alpha values are empirical
- Decay tuning: MEDIUM -- function exists and is tested, but parameter values need live measurement

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable -- all components are internal, no external API dependencies)

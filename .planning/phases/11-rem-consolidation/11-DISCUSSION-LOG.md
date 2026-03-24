# Phase 11: REM Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 11-rem-consolidation
**Areas discussed:** Tiered trigger model, REM editorial pipeline, Conditioning updates, REM + Dormant modes

---

## Tiered Trigger Model

### Tier 2 trigger mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Inactivity timer (Recommended) | Secondary monitors time since last Primary hook event. Configurable threshold. Simple, deterministic. | |
| Heartbeat-based | Primary sends periodic heartbeats via Wire. Tier 2 triggers when heartbeats stop. More robust. | ✓ |
| Hook-gap detection | Secondary counts elapsed time between hook events. Lightweight but can't distinguish "user thinking" from "user left". | |

**User's choice:** Heartbeat-based
**Notes:** Distinguishes dead session from idle user from genuine session end.

### Mid-Tier-2 user return

| Option | Description | Selected |
|--------|-------------|----------|
| Abort and revert (Recommended) | Cancel provisional REM, discard tentative promotions, fragments stay in working/. | ✓ |
| Absorb and continue | Keep already-promoted fragments, continue with hybrid state. | |
| Pause and defer | Freeze Tier 2 progress, resume from checkpoint on actual session end. | |

**User's choice:** Abort and revert (Recommended)
**Notes:** Clean state over partial consolidation.

### Tier 1 scope

| Option | Description | Selected |
|--------|-------------|----------|
| Mind state only (Recommended) | Snapshot only what Secondary already has. Formation subagents are fire-and-forget. | ✓ |
| Mind + pending formation | Also capture pending formation context and re-run on resume. | |

**User's choice:** Mind state only (Recommended)
**Notes:** Keeps Tier 1 fast and synchronous.

### Tier 2 promotion timeout

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-promote on completion | Once Tier 2 finishes, results ARE the consolidation. No second timer. | ✓ |
| Separate promotion timer | Results stay tentative for another window before promoting. | |

**User's choice:** Auto-promote on completion
**Notes:** Simplest model.

---

## REM Editorial Pipeline

### Retroactive evaluation approach

| Option | Description | Selected |
|--------|-------------|----------|
| LLM-driven re-evaluation (Recommended) | Mind re-reads all session fragments with session summary, updates scores via LLM judgment. | ✓ |
| Heuristic re-scoring | Deterministic based on access patterns. Cheaper but loses editorial quality. | |
| Hybrid | Heuristic first pass, LLM only on significantly shifted candidates. | |

**User's choice:** LLM-driven re-evaluation (Recommended)
**Notes:** Matches spec's editorial philosophy.

### Domain dedup approach

| Option | Description | Selected |
|--------|-------------|----------|
| LLM-driven merge decisions (Recommended) | Mind reviews domain pairs with high overlap, LLM decides merge/keep/flag. | ✓ |
| Embedding similarity threshold | Cosine threshold on domain name embeddings. May conflict with no-API constraint. | |
| You decide | Claude's discretion within platform capabilities. | |

**User's choice:** LLM-driven merge decisions (Recommended)
**Notes:** Editorial judgment, not string matching.

### Fragment promotion gate

| Option | Description | Selected |
|--------|-------------|----------|
| Promote or discard (Recommended) | REM promotes or deletes. If not endorsed, never existed in long-term storage. | ✓ |
| Promote or archive | Failed fragments go to archive/ instead of deletion. | |
| Promote, demote, or hold | Three outcomes including hold for re-evaluation next session. | |

**User's choice:** Promote or discard (Recommended)
**Notes:** Matches spec §5.4.

### Sublimation triage

| Option | Description | Selected |
|--------|-------------|----------|
| Top-N per session (Recommended) | Only top contributing sublimations become fragments. Configurable cap. | |
| All contributors | Every contributing sublimation becomes a fragment. | |
| You decide | Claude's discretion on cap and criteria. | ✓ |

**User's choice:** You decide
**Notes:** Constraint: signal/noise ratio per domain must update conditioning thresholds.

---

## Conditioning Updates

### Update conservatism model

| Option | Description | Selected |
|--------|-------------|----------|
| Exponential moving average (Recommended) | EMA with configurable alpha (0.1-0.3). Trends emerge over 5-10 sessions. | ✓ |
| Threshold + evidence count | Only changes after N consistent sessions. Binary. | |
| You decide | Claude's discretion. Constraints: conservative, gradual, trait floor protection. | |

**User's choice:** Exponential moving average (Recommended)
**Notes:** Natural washout of anomalous sessions.

### Trait floor protection

| Option | Description | Selected |
|--------|-------------|----------|
| Identity Core immutability (Recommended) | Identity Core fields have hard floors (bounded range). Conditioning moves freely. | ✓ |
| Per-field configurable bounds | Min/max per conditioning field. More granular but speculative. | |
| Minimum magnitude only | No field below absolute minimum. Simple but allows inversion. | |

**User's choice:** Identity Core immutability (Recommended)
**Notes:** Preserves "who" while letting "how" evolve.

### Entropy engine quality evaluation

| Option | Description | Selected |
|--------|-------------|----------|
| Session outcome signals (Recommended) | Behavioral proxies: engagement, recall usage, compliance, friction absence. | |
| LLM-driven reflection | Mind reflects on session quality and mood-state fit. | |
| Both combined | Behavioral signals (quantitative) + LLM reflection (qualitative). | ✓ |

**User's choice:** Both combined
**Notes:** Neither alone sufficient. Together provide robust signal.

---

## REM + Dormant Modes

### REM mode transition

| Option | Description | Selected |
|--------|-------------|----------|
| In-process REM (Recommended) | Secondary stays alive after Primary exits, runs REM in-process, then terminates. | ✓ |
| Spawned REM session | All sessions terminate, dedicated REM session spawns afterward. | |
| Background REM | Secondary detaches and runs in background. Risk of write conflicts. | |

**User's choice:** In-process REM (Recommended)
**Notes:** No new session needed, no state serialization handoff.

### Dormant decay trigger

| Option | Description | Selected |
|--------|-------------|----------|
| SessionStart-triggered catch-up (Recommended) | No between-session process. Next SessionStart runs retroactive decay. | |
| Scheduled background process | Cron job or Bun script runs decay periodically. | |
| You decide | Claude's discretion. Constraint: practical for Max user. | ✓ |

**User's choice:** You decide
**Notes:** Decay must eventually happen, mechanism should be practical.

### Mode transition enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential required (Recommended) | Active → REM → Dormant always. No skipping REM. | |
| Direct jumps allowed | Active → Dormant possible for crash recovery. Orphaned working/ stays. | |
| Sequential with crash fallback | Normal path sequential. Crash recovery detects orphaned working/ on next SessionStart. | ✓ |

**User's choice:** Sequential with crash fallback
**Notes:** REM-07 gate enforced strictly. Crash recovery runs REM before normal startup.

---

## Claude's Discretion

- Sublimation triage cap and criteria (within constraint that signal/noise ratio updates conditioning)
- Dormant mode decay maintenance mechanism (practical for Max user)

## Deferred Ideas

- Self-organizing taxonomy governance (Phase 12, FRG-07)
- Source-reference model (Phase 12, FRG-08)
- Mind-controlled dynamic referential framing (backlog from Phase 10)

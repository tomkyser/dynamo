# Phase 10: Three-Session Architecture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 10-three-session-architecture
**Areas discussed:** Session spawning, Mind scope in Phase 10, Tertiary sublimation, Referential framing

---

## Session Spawning

### Q1: What are Secondary and Tertiary sessions at runtime?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude Code sessions | Separate Claude Code instances spawned via Bun.spawn, connect to Wire as MCP channel clients | ✓ |
| Bun scripts (no Claude) | Plain Bun processes running CJS scripts, no LLM capabilities | |
| MCP server sessions | Secondary/Tertiary run as MCP servers, Primary connects as client | |

**User's choice:** Claude Code sessions (Recommended)
**Notes:** None

### Q2: Who owns the Session Manager?

| Option | Description | Selected |
|--------|-------------|----------|
| Reverie module | Lives in modules/reverie/components/session/, Reverie owns its topology | ✓ |
| Dynamo platform | Lives in core/services/ as a new platform service | |

**User's choice:** Reverie module (Recommended)
**Notes:** None

### Q3: How does the Session Manager spawn Claude Code instances?

| Option | Description | Selected |
|--------|-------------|----------|
| Bun.spawn + claude CLI | Session Manager calls Bun.spawn with claude CLI command | |
| Bun.spawn + custom entry | Spawns custom entry scripts, not Claude Code sessions | |
| You decide | Claude has discretion | |

**User's choice:** Other — "This seems like it should be a responsibility shared between Wire and Conductor or one of those two, no?"
**Notes:** User pushed back on Session Manager doing the spawning. Led to architectural clarification.

### Q4: Session Manager directs, Conductor spawns, Wire communicates?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — that split | Session Manager (WHAT), Conductor (HOW), Wire (COMMS) | ✓ |
| Conductor + Wire only | No Session Manager, orchestration in hook handlers | |
| Need to think more | Pause and return | |

**User's choice:** Yes — that split (Recommended)
**Notes:** This corrects the roadmap note that said "not Conductor." Conductor is the spawner but acts at Reverie's direction.

---

## Mind Scope in Phase 10

### Q1: What should Secondary (Mind) actually DO in Phase 10?

| Option | Description | Selected |
|--------|-------------|----------|
| Architecture + formation takeover | Takes over formation, composes Face prompt, manages attention, orchestrates recall | |
| Minimal viable Mind | Only composes Face prompts and forwards sublimations | |
| Full Mind minus REM | Everything except REM consolidation and taxonomy management | ✓ |

**User's choice:** Full Mind minus REM
**Notes:** Maximum validation of architecture. Attention, formation, recall, Self Model authority, directive generation, sublimation evaluation, subagent delegation all run.

### Q2: Does Secondary spawn subagents for formation or process inline?

| Option | Description | Selected |
|--------|-------------|----------|
| Secondary spawns subagents | Formation subagents run under Mind authority with richer context | ✓ |
| Inline Mind processing | Formation blocks other Mind activities | |
| You decide | Claude has discretion | |

**User's choice:** Secondary spawns subagents (Recommended)
**Notes:** None

### Q3: How does Secondary receive Primary's conversation context?

| Option | Description | Selected |
|--------|-------------|----------|
| Wire snapshots | Real-time forwarding via Wire, periodic | |
| Lithograph transcript reads | Reads Primary's transcript JSONL for full history | |
| Both — Wire for real-time, Lithograph for depth | Dual-path: Wire for essential signals, Lithograph for complex processing | ✓ |

**User's choice:** Both — Wire for real-time, Lithograph for depth
**Notes:** None

---

## Tertiary Sublimation

### Q1: How does Tertiary's continuous cycle work as a Claude Code session?

| Option | Description | Selected |
|--------|-------------|----------|
| Self-prompting loop | Each "turn" is one cycle, Tertiary triggers itself to continue | ✓ |
| Mind-driven polling | Secondary sends "scan now" directives on timer | |
| Hybrid script + Claude | Bun script manages timer, only invokes Claude when matches exceed threshold | |

**User's choice:** Self-prompting loop (Recommended)
**Notes:** None

### Q2: How should sublimation sensitivity be managed?

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic via Wire directives | Mind sends threshold updates when context shifts | ✓ |
| Fixed thresholds | Static defaults, tune empirically | |
| You decide | Claude has discretion | |

**User's choice:** Dynamic via Wire directives (Recommended)
**Notes:** None

### Q3: Should Tertiary's resonance scoring be deterministic or LLM-evaluated?

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic scoring | Composite scorer, no LLM call, fast and cheap | ✓ |
| LLM-evaluated resonance | Claude evaluates each cycle, richer but expensive | |
| You decide | Claude has discretion | |

**User's choice:** Deterministic scoring (Recommended)
**Notes:** None

---

## Referential Framing (CTX-02)

### Q1: How aggressive should the referential framing constraint be?

| Option | Description | Selected |
|--------|-------------|----------|
| Dual-mode | Constrains relational/behavioral but grants technical independence | |
| Full constraint | Primary defers to Mind for ALL decisions | ✓ (target) |
| Soft framing only | Advisory, Primary can override | |

**User's choice:** Other — "I want to go full #2, but I think we'll need to support #1 as well so we can tweak things."
**Notes:** Target is full constraint, but implementation must support dual-mode as calibration lever. Both modes required.

### Q2: How should the framing mode be configured?

| Option | Description | Selected |
|--------|-------------|----------|
| Mind-controlled | Mind decides framing intensity per-turn | |
| Static config | Set in Reverie config file, changed by user via CLI | ✓ |
| You decide | Claude has discretion | |

**User's choice:** Other — "Let's start with a config file with a backlog entry to consider the dynamism in the future"
**Notes:** Static config for now. Backlog entry for Mind-controlled dynamic framing as future enhancement.

### Q3: Template integration for referential framing prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate slot | Independent slot in Face prompt template, toggleable and sizable | ✓ |
| Integrated into Identity Frame | Woven into existing Identity Frame slot | |
| You decide | Claude has discretion | |

**User's choice:** Separate slot (Recommended)
**Notes:** Phase 8 D-01 already allocated ~100-200 tokens for Referential Framing slot.

---

## Claude's Discretion

- Session Manager state machine and lifecycle coordination
- Conductor's spawning interface for Claude Code sessions
- Wire connect handshake protocol
- Mind cognitive cycle structure
- Tertiary self-prompting mechanism
- Referential framing prompt exact wording
- Startup sequence timing budget
- Passive mode lightweight Secondary scope
- Go/no-go gate detection mechanism

## Deferred Ideas

- **Mind-controlled dynamic referential framing** — adjusts per-turn based on context. Future backlog item.
- **Active context sculpting** — Mind replaces stale transcript entries via Lithograph write ops. Enabled by Phase 10 but not in scope.

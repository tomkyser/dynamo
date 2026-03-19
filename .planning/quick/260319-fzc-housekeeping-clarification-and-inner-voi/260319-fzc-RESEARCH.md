# Quick Task 260319-fzc: Housekeeping, Clarification, and Inner Voice & Dynamo Architecture - Research

**Researched:** 2026-03-19
**Domain:** Architecture documentation, subsystem specification, roadmap restructuring
**Confidence:** HIGH

## Summary

This research supports a documentation and specification task -- not an implementation task. The deliverables are spec documents, a PRD, an abstract concept document, and a roadmap refactor. Research focused on four areas: (1) how to split the current codebase into the new six-subsystem architecture (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie), (2) Claude Code native feature patterns from GSD as architectural inspiration, (3) roadmap restructuring from multi-version to single-version milestoned delivery, and (4) subsystem specification document patterns.

**Primary recommendation:** Write specs top-down (Dynamo PRD first, then subsystem specs in dependency order: Terminus -> Ledger -> Assay -> Switchboard -> Reverie), with each spec following the INNER-VOICE-SPEC.md depth model but adapted to the subsystem's scope.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full specification-level documents with schemas, code examples, interface definitions, and rationale (INNER-VOICE-SPEC.md level of detail)
- Abstract Inner Voice doc is conceptual (platform/provider agnostic) but still detailed
- PRD is strategic but comprehensive
- Subsystem specs are detailed technical documents
- v1.3 becomes the target -- milestones within are numbered iterations (1.3-M1, 1.3-M2...) building toward 1.3 GA release
- v1.4, v1.5, and v2.0 items are generally folded INTO 1.3 as milestone iterations, NOT deferred
- User decides what (if anything) gets deferred -- default assumption is everything folds in
- Deferred items listed at end of doc with no assigned target version
- We do NOT plan beyond 1.3
- New subsystem boundaries: Ledger (construction), Assay (access), Terminus (infrastructure), Reverie (Inner Voice), Switchboard (dispatcher/hooks/events), Dynamo (system wrapper)

### Claude's Discretion
- Research depth for Reverie spec (one more round with adversarial steel man) -- will calibrate based on what's already established in INNER-VOICE-SYNTHESIS-RESEARCH.md
- Document ordering and dependency chain between the deliverables
- Level of GSD file updates needed to reflect the new architecture
- How to handle the Claude Code exclusivity constraint (minimize direct API dependence, use CC native features like agents/subagents/hooks/skills as the platform)

### Deferred Ideas (OUT OF SCOPE)
(none specified)
</user_constraints>

---

## 1. Subsystem Boundary Analysis

### Current Code -> New Subsystem Mapping

Analysis of the current codebase (9,253 LOC across 3 root directories) reveals clean separation lines for the six-subsystem architecture.

**Confidence: HIGH** -- based on direct source code analysis.

#### Current Ledger -> Splits Into Three Subsystems

| Current File | LOC | Current Function | New Subsystem | Rationale |
|-------------|-----|-----------------|---------------|-----------|
| `episodes.cjs` | 50 | Write episodes to Graphiti | **Ledger** (construction) | Data creation -- addEpisode writes data |
| `curation.cjs` | 130 | Haiku curation pipeline | **Ledger** (construction) / **Reverie** | Curation is data shaping; Inner Voice absorbs this function |
| `search.cjs` | 68 | Combined/fact/node search | **Assay** (access) | Pure read operations -- searchFacts, searchNodes, combinedSearch |
| `scope.cjs` | 35 | Scope constants/validation | **Dynamo** (shared) | Shared utility used by all subsystems |
| `sessions.cjs` | 220 | Session CRUD + naming | **Assay** (access) | Session listing/viewing is read access; session creation is borderline but belongs to Assay as the data access layer |
| `mcp-client.cjs` | 115 | MCP JSON-RPC transport | **Terminus** (infrastructure) | Transport/protocol layer -- the pipe to the data store |
| `graphiti/` (dir) | -- | Docker infra, compose, scripts | **Terminus** (infrastructure) | Storage backend infrastructure |
| `hooks/` (5 files) | ~400 | Hook handlers | **Switchboard** (hooks) / **Reverie** | Hook handlers are dispatching (Switchboard), but Inner Voice hook handlers belong to Reverie |

#### Current Switchboard -> Splits Across Two Subsystems

| Current File | LOC | Current Function | New Subsystem | Rationale |
|-------------|-----|-----------------|---------------|-----------|
| `stack.cjs` | 212 | Docker start/stop | **Terminus** (infrastructure) | Stack lifecycle is infrastructure |
| `health-check.cjs` | 120 | 6-stage health check | **Terminus** (infrastructure) | Infrastructure health monitoring |
| `diagnose.cjs` | 170 | 13-stage diagnostics | **Terminus** (infrastructure) | Deep infrastructure inspection |
| `verify-memory.cjs` | 330 | Pipeline verification | **Terminus** (infrastructure) | End-to-end infrastructure verification |
| `stages.cjs` | 480 | Shared diagnostic stages | **Terminus** (infrastructure) | Infrastructure diagnostic building blocks |
| `install.cjs` | 500 | Deployment installer | **Switchboard** (ops) | System orchestration operation |
| `sync.cjs` | 400 | Bidirectional sync | **Switchboard** (ops) | System management operation |
| `update.cjs` | 320 | Update/upgrade system | **Switchboard** (ops) | System management operation |
| `update-check.cjs` | 95 | Version check | **Switchboard** (ops) | System management operation |
| `migrate.cjs` | 130 | Migration harness | **Terminus** (infrastructure) | Schema/data evolution infrastructure |
| `pretty.cjs` | 145 | Output formatters | **Dynamo** (shared) | Shared utility |

#### Current Dynamo -> Stays + Absorbs Shared Utils

| Current File | Function | New Subsystem | Notes |
|-------------|----------|---------------|-------|
| `dynamo.cjs` | CLI router | **Dynamo** (interface) | Stays, routes to all subsystems |
| `core.cjs` | Shared substrate | **Dynamo** (shared) | Stays as shared resources |
| `config.json` | Runtime config | **Dynamo** (shared) | Stays |
| `VERSION` | Version | **Dynamo** (shared) | Stays |
| `hooks/dynamo-hooks.cjs` | Hook dispatcher | **Switchboard** (dispatcher) | Moves: hook dispatch is Switchboard's core function |
| `prompts/` | Curation prompts | **Reverie** (prompts) | Moves: prompt templates are Reverie's domain |
| `migrations/` | Migration scripts | **Terminus** (migrations) | Moves: data migrations are infrastructure |

### Interface Patterns Between Subsystems

Based on the current call graph and the target architecture, subsystem interfaces should follow this pattern:

```
Dynamo (CLI/API entry point)
  |-> routes commands to subsystems
  |-> exposes shared resources (core.cjs, config.json, scope.cjs, pretty.cjs)

Switchboard (dispatcher, hooks, events)
  |-> receives hook events from Claude Code
  |-> dispatches to Reverie for cognitive processing
  |-> dispatches to Ledger for data construction
  |-> manages install/sync/update lifecycle

Reverie (Inner Voice)
  |-> reads through Assay (query knowledge graph)
  |-> writes through Ledger (create episodes, update state)
  |-> uses Terminus transport (MCP client)
  |-> manages its own state files (inner-voice-state.json)

Ledger (construction)
  |-> writes through Terminus transport (MCP client)
  |-> does NOT read data (that is Assay's job)

Assay (access)
  |-> reads through Terminus transport (MCP client)
  |-> does NOT write data (that is Ledger's job)

Terminus (infrastructure)
  |-> owns MCP client, Docker stack, health checks
  |-> provides transport layer to Ledger and Assay
  |-> manages migrations, diagnostics
```

### The Target Directory Structure

Mapping the user's conceptual tree from PROJECT-UPDATE.md to concrete files:

```
dynamo/claude-code/           # [BASE PLATFORM]
  lib/                        # core.cjs, scope.cjs, pretty.cjs (shared substrate)
  shared/                     # config.json, VERSION, exposed resources
  health/                     # Top-level health command delegating to Terminus
  migrations/                 # Migration scripts (Terminus-managed)
  cc/                         # Claude Code specific integration
    hooks/                    # dynamo-hooks.cjs dispatcher + hook definitions
    agents/                   # inner-voice.md subagent definition
    skills/                   # (future: loadable capability modules)
    rules/                    # (future: project-specific rule files)
    prompts/                  # Curation, summary, IV prompts
    CLAUDE-TEMPLATE.MD        # Deployed CLAUDE.md template
    settings-hooks.json       # Hook definitions for settings.json
    dynamo-cc.cjs             # CC-specific integration module
  subsystems/
    switchboard/              # install.cjs, sync.cjs, update.cjs, update-check.cjs
    assay/                    # search.cjs, sessions.cjs (read operations)
    ledger/                   # episodes.cjs, curation.cjs (write/construct operations)
    terminus/                 # mcp-client.cjs, stack.cjs, health-check.cjs, diagnose.cjs, etc.
    reverie/                  # inner-voice.cjs, dual-path.cjs, activation.cjs, state files
  dynamo.cjs                  # CLI router entry point
  config.json
  VERSION
```

**Key architectural insight:** The `cc/` directory isolates all Claude Code platform-specific integration. This is the "platform adapter" pattern that enables future `/web`, `/api`, `/mcp` implementations without touching subsystem logic.

---

## 2. Claude Code Native Feature Patterns

### GSD as Architectural Reference

**Confidence: HIGH** -- based on direct examination of GSD installation at `~/.claude/get-shit-done/`.

GSD demonstrates four Claude Code native feature patterns that Dynamo should reference:

#### Pattern 1: Custom Subagent Definitions (`.claude/agents/*.md`)

GSD defines 16 specialized subagents, each as a Markdown file with YAML frontmatter:

```yaml
---
name: gsd-phase-researcher
description: Researches how to implement a phase...
tools: Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*
color: cyan
---
[System prompt as Markdown body]
```

**Key capabilities observed:**
- `tools` field specifies which tools the subagent can use (allowlist)
- `disallowedTools` field can restrict tools (blocklist -- not used by GSD but documented by CC)
- `color` field for visual identification in terminal
- `hooks` block (commented out in GSD) can attach per-subagent hooks
- `mcp__*` wildcard enables MCP server access for subagents
- Each agent has a focused role with clear input/output contract

**Relevance to Dynamo:** The `inner-voice.md` subagent definition (already designed in INNER-VOICE-SYNTHESIS-RESEARCH.md Track B Section 4) follows this exact pattern. Additional subagent definitions could be created for specialized Reverie processing modes.

#### Pattern 2: Workflow Orchestration via Command Files

GSD uses 44 workflow files in `~/.claude/get-shit-done/workflows/` that define slash commands (`/gsd:plan-phase`, `/gsd:execute-plan`, etc.). These orchestrate multi-step processes by:
- Spawning subagents with specific context
- Reading/writing state files between steps
- Chaining operations through file-based communication

**Relevance to Dynamo:** Dynamo can define its own slash commands for user-facing operations. Example: `/dynamo:voice-explain` could invoke a specialized subagent for Inner Voice debugging, `/dynamo:consolidate` could trigger REM consolidation.

#### Pattern 3: Hook-Based Event Processing

GSD installs hooks via agent definitions (the `hooks:` YAML block). Dynamo already uses this pattern extensively through `settings-hooks.json`. The existing 5-hook system (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop) is the foundation for all Reverie processing.

**Critical finding:** Command hooks can inject content into Claude's context via `additionalContext` in the hook JSON response. This is the mechanism that enables the Inner Voice hot path without subagent overhead. Already documented in INNER-VOICE-SYNTHESIS-RESEARCH.md.

#### Pattern 4: File-Based State Communication

GSD uses file-based state (STATE.md, PLAN.md, RESEARCH.md) to communicate between orchestrator and subagents. This is the same pattern Dynamo uses for `inner-voice-state.json` and the state bridge pattern (SubagentStop writes to file, next UserPromptSubmit reads it).

### What Can Be Done Natively vs. What Requires API Calls

| Capability | Claude Code Native? | Mechanism | API Required? |
|-----------|---------------------|-----------|---------------|
| Hook event processing | YES | Command hooks in settings.json | No |
| Context injection (hot path) | YES | `additionalContext` in hook response | No |
| Deep analysis (deliberation) | YES | Custom subagent with Sonnet model | No (subscription) / Yes (API plan) |
| REM consolidation | YES | Custom subagent at Stop event | No (subscription) / Yes (API plan) |
| Knowledge graph read/write | Partial | Via MCP client (already CJS) | Graphiti server (Docker) |
| Embedding computation | No | Requires model API | Yes (Graphiti handles this) |
| Session naming | Partial | Could use subagent | Currently uses OpenRouter Haiku |
| State persistence | YES | File I/O (JSON files) | No |
| Curation/formatting | YES | Subagent or hook + additionalContext | No (subscription) |

**Bottom line:** For Max subscription users, the only API dependency is the Graphiti MCP server (which runs locally via Docker). Deliberation, REM consolidation, curation, and session processing can all run through native Claude Code subagents at zero additional marginal cost. For API plan users, direct API calls remain the fallback for these operations.

---

## 3. Roadmap Restructuring

### Current Requirement Inventory

**Confidence: HIGH** -- based on direct analysis of MASTER-ROADMAP.md.

Current roadmap distributes ~50 requirements across 4 versions:

| Version | Req Count | Categories |
|---------|-----------|------------|
| v1.3 | 17 | CORTEX-01/02/03, MENH-01/02/06/07/10/11, MGMT-01/02/03/05/08/09/10/11, UI-08 |
| v1.4 | 9 | CORTEX-04/05/06, MENH-03/04/05/08, MGMT-06/07 |
| v1.5 | 10 | CORTEX-07/08/09, UI-01/02/03/04/05/06, MGMT-04 |
| v2.0 | 4 | CORTEX-10/11, MENH-09, UI-07 |
| **Total** | **40** | (excluding 10 shipped STAB requirements) |

### Folding Into v1.3 Milestones

The user wants everything folded into v1.3 as milestone iterations (1.3-M1, 1.3-M2...) with deferred items at the bottom.

**Dependency chain analysis (genuine prerequisites vs. parallelizable):**

```
TIER 0 (Infrastructure Foundation -- no dependencies)
  MENH-06/07 (transport + model flexibility) -- prerequisite for all CORTEX
  MGMT-01 (dependency management)
  MGMT-11 (SQLite session index)
  MGMT-08 (jailbreak protection)

TIER 1 (Core Intelligence -- depends on MENH-06/07)
  CORTEX-01 (Inner Voice basic)
  CORTEX-02 (Dual-path routing)
  CORTEX-03 (Cost monitoring)
  MGMT-05 (Hooks as primary behavior mechanism)
  MGMT-10 (Modular injection control)

TIER 2 (Management + Visibility -- depends on TIER 1)
  MGMT-02 (On-demand modules)
  MGMT-03 (Skill inference)
  UI-08 (Inline Dynamo visibility)
  MGMT-09 (Cognition patterns -- absorbed by CORTEX-01)
  MENH-01/02/10/11 (all absorbed by CORTEX-01/02)

TIER 3 (Advanced Intelligence -- depends on TIER 1 proving value)
  CORTEX-04 (Inner Voice advanced)
  CORTEX-05 (Enhanced Construction)
  CORTEX-06 (IV persistence advanced)
  MENH-03 (Memory synthesis/export)
  MENH-04 (Memory inference)
  MENH-08 (Local embeddings)
  MGMT-06/07 (Global/project preferences)

TIER 4 (Platform Expansion -- depends on TIER 3)
  MENH-05 (Flat file support)
  CORTEX-07 (Agent coordination)
  CORTEX-08 (Access Agent basic)
  CORTEX-09 (Connector framework)
  UI-01/02/03/04/05/06 (Dashboard suite)
  MGMT-04 (TweakCC)

TIER 5 (Advanced Capabilities -- depends on TIER 4)
  CORTEX-10 (Multi-agent deliberation)
  CORTEX-11 (Domain agent framework)
  UI-07 (Desktop/mobile)
  MENH-09 (Council-style deliberation -- absorbed by CORTEX-10)
```

### Recommended Milestone Structure

```
1.3-M1: Foundation and Infrastructure Refactor
  - Directory restructure to new 6-subsystem architecture
  - MENH-06/07 (transport flexibility, model selection)
  - MGMT-01 (dependency management)
  - MGMT-08 (jailbreak protection)
  - MGMT-11 (SQLite session index)

1.3-M2: Core Intelligence
  - CORTEX-01 (Inner Voice basic)
  - CORTEX-02 (Dual-path routing)
  - CORTEX-03 (Cost monitoring)
  - MGMT-05 (Hooks as primary behavior)
  - MGMT-10 (Modular injection control)

1.3-M3: Management and Visibility
  - MGMT-02 (On-demand modules)
  - MGMT-03 (Skill inference)
  - UI-08 (Inline visibility)

1.3-M4: Advanced Intelligence
  - CORTEX-04 (Inner Voice advanced)
  - CORTEX-05 (Enhanced Construction)
  - CORTEX-06 (IV persistence advanced)
  - MENH-08 (Local embeddings)
  - MGMT-06/07 (Global/project preferences)

1.3-M5: Platform Expansion
  - MENH-03 (Memory synthesis/export)
  - MENH-04 (Memory inference)
  - MENH-05 (Flat file support)
  - CORTEX-07 (Agent coordination)
  - CORTEX-08 (Access Agent basic)
  - CORTEX-09 (Connector framework)

1.3-M6: Dashboard and UI
  - UI-01 through UI-06 (Dashboard suite)
  - MGMT-04 (TweakCC)

1.3-M7: Advanced Capabilities
  - CORTEX-10 (Multi-agent deliberation)
  - CORTEX-11 (Domain agent framework)
  - UI-07 (Desktop/mobile)
```

**Note:** The user decides what to defer. Items most likely to be deferred (if any): UI-07 (desktop/mobile), CORTEX-10/11 (multi-agent deliberation, domain framework), MENH-05 (flat file support).

### Requirements Name Updates

All documents must consistently use the new subsystem names:

| Old Term | New Term | Context |
|----------|----------|---------|
| Ledger (general) | Ledger (construction only) | Data writing/creation |
| Ledger (search functions) | Assay | Data access/queries |
| Switchboard (stack/health/diag) | Terminus | Infrastructure management |
| Switchboard (install/sync/update) | Switchboard | System operations |
| Inner Voice / Cortex | Reverie | Cognitive processing subsystem |
| Ledger Cortex | (deprecated) | Replaced by Reverie + subsystem split |

---

## 4. Spec Document Patterns

### What the INNER-VOICE-SPEC.md Established

The existing INNER-VOICE-SPEC.md at 1,061 lines demonstrates the spec depth the user expects:

| Section | Content | Why It Works |
|---------|---------|-------------|
| Executive Summary | 2 paragraphs + key findings table | Orients reader immediately |
| What It IS | Role definition with comparison tables | Defines scope by contrast |
| Theory Foundation | 15 theories classified into PRIMARY/SECONDARY/TERTIARY | Justifies design decisions with sources |
| Mechanical Design | State schema (JSON), pipeline per hook, threshold formula | Concrete and implementable |
| Adversarial Analysis | 7 stress tests + failure mode taxonomy + risk register | Honest about limitations |
| Implementation Pathway | Per-milestone artifact lists with explicit NOT-in-scope | Prevents scope creep |
| Open Questions | Numbered with partial info + recommendations | Acknowledges gaps |

### Recommended Spec Template for New Subsystems

Each subsystem spec should include (adapting from INNER-VOICE-SPEC.md):

```markdown
# [Subsystem Name]: Specification

## 1. Executive Summary
- What this subsystem does (2-3 paragraphs)
- Key responsibilities table

## 2. Responsibilities and Boundaries
- What this subsystem owns
- What it explicitly does NOT own
- Interface contracts with adjacent subsystems

## 3. Architecture
- Module structure (file list with exports)
- State management (if applicable)
- Configuration surface

## 4. Interfaces
- Inbound: who calls this subsystem and how
- Outbound: what this subsystem calls
- Data contracts (JSON schemas for inter-subsystem communication)

## 5. Implementation Detail
- Per-module function signatures
- Processing pipelines (where applicable)
- Error handling patterns

## 6. Migration Path
- What moves from the current codebase
- Breaking changes
- Backward compatibility strategy

## 7. Open Questions
```

### Abstract vs. Platform-Specific Document Pattern

The user wants two levels of Reverie documentation:

1. **Abstract concept document** (platform/provider agnostic):
   - Describes the Inner Voice concept independent of Claude Code, Graphiti, or any specific LLM
   - Uses theoretical language: "the cognitive processing system," "the knowledge store," "the integration layer"
   - References cognitive science frameworks without implementation detail
   - Target audience: someone who wants to understand the concept for any platform
   - No JSON schemas, no file paths, no API references
   - Think: "What is the Inner Voice?" not "How do we build it?"

2. **Platform-specific Reverie spec** (Claude Code version):
   - References Claude Code hooks, subagents, settings.json, additionalContext
   - Includes concrete JSON schemas, file paths, CJS module signatures
   - References Graphiti, Neo4j, MCP client
   - Maps abstract concepts to concrete Claude Code mechanisms
   - Think: "How do we build the Inner Voice on Claude Code?"

The abstract document should be written FIRST, then the platform spec references it.

### Reverie Research Depth Assessment

The existing INNER-VOICE-SYNTHESIS-RESEARCH.md is comprehensive. It includes:
- 7 concepts analyzed with GO/NO-GO verdicts (5 HIGH confidence, 2 MEDIUM)
- Revised processing pipelines per hook type
- IV Memory schema (concrete JSON)
- REM consolidation mapping to hook events
- Cost projections for both API and subscription users
- Hybrid architecture definition (CJS hooks + custom subagent)

**Assessment:** One more adversarial pass is warranted but should be narrow -- focus on:
1. The six-subsystem boundary impact on the hybrid architecture
2. Whether the directory restructure changes any interface assumptions
3. The Claude Code exclusivity constraint (are there any remaining API dependencies that could be eliminated?)

A full re-do of the steel-man analysis is NOT needed. The existing analysis is thorough and recent (2026-03-19).

### Dynamo PRD Structure

The PRD should be strategic, covering:

```markdown
# Dynamo: Product Requirements Document (Claude Code Edition)

## 1. Vision and Purpose
## 2. Platform Architecture (the cc/ adapter pattern)
## 3. Subsystem Overview (6 subsystems, responsibilities, boundaries)
## 4. User Value Proposition
## 5. Feature Roadmap (folded v1.3 milestones)
## 6. Non-Functional Requirements (latency, cost, self-manageability)
## 7. Constraints and Principles
## 8. Success Metrics
```

---

## Document Ordering and Dependencies

The deliverables should be produced in this order, based on dependency analysis:

| # | Document | Depends On | Rationale |
|---|----------|-----------|-----------|
| 1 | Abstract Inner Voice Concept | Nothing | Platform-agnostic foundation, no dependencies |
| 2 | Dynamo PRD | Abstract IV (#1) | Strategic context for all specs; references IV at conceptual level |
| 3 | Terminus Spec | PRD (#2) | Infrastructure layer defined first -- all other subsystems depend on it |
| 4 | Ledger Spec | PRD (#2), Terminus (#3) | Construction layer uses Terminus transport |
| 5 | Assay Spec | PRD (#2), Terminus (#3) | Access layer uses Terminus transport |
| 6 | Switchboard Spec | PRD (#2) | Dispatcher/ops layer -- lightweight, mostly reorganizing existing code |
| 7 | Reverie Spec | Abstract IV (#1), PRD (#2), Assay (#5), Ledger (#4) | Most complex spec; reads through Assay, writes through Ledger |
| 8 | Master Roadmap Refactor | PRD (#2), All Specs | Informed by all specs; restructures requirements into 1.3-M* milestones |
| 9 | GSD Planning File Updates | Roadmap (#8) | Reflects the new architecture in PROJECT.md, STATE.md, etc. |

**Note:** Documents 3-6 (subsystem specs) can be written in parallel once the PRD is done. The Reverie spec (#7) requires the others to define its interfaces.

---

## GSD File Update Assessment

The following GSD planning files need updates:

| File | Update Needed | Scope |
|------|-------------|-------|
| `.planning/PROJECT.md` | Major | New subsystem names, updated architecture section, new decisions, updated constraints |
| `.planning/STATE.md` | Minor | Updated "Current Position" and "Accumulated Context" sections |
| `README.md` | Major | Architecture diagram, directory structure, subsystem descriptions all change |
| `MASTER-ROADMAP.md` | Complete rewrite | Fold all versions into 1.3 milestones |
| Global `CLAUDE.md` (`~/.claude/CLAUDE.md`) | Moderate | Update component architecture table, add new subsystem commands |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, v22+) |
| Config file | None (built-in, no config needed) |
| Quick run command | `node --test dynamo/tests/*.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |

### Phase Requirements -> Test Map

This is a documentation task, not an implementation task. No new code is being written, so no new tests are required. Existing 374 tests remain the validation baseline.

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| N/A | Documents are well-formed | Manual review | Spec documents reviewed for consistency, completeness |
| N/A | Roadmap requirements add up | Manual verify | All ~40 active requirements accounted for in new structure |
| N/A | Subsystem boundaries consistent | Manual verify | Same file never assigned to two subsystems |

### Wave 0 Gaps

None -- this is a documentation task. Existing test infrastructure covers all phase requirements. No new test files needed.

---

## Sources

### Primary (HIGH confidence)
- Direct source code analysis of `/dynamo/`, `/ledger/`, `/switchboard/` directories (current codebase)
- `.planning/research/INNER-VOICE-SYNTHESIS-RESEARCH.md` (latest steel-man analysis, 2026-03-19)
- `.planning/research/INNER-VOICE-SPEC.md` (mechanical specification, 2026-03-18)
- `MASTER-ROADMAP.md` (current roadmap with all requirement IDs)
- `.planning/research/LEDGER-CORTEX-ANALYSIS.md` (component verdicts)
- GSD plugin installation at `~/.claude/get-shit-done/` (agent, workflow, template patterns)
- Claude Code agent definitions at `~/.claude/agents/gsd-*.md` (16 subagent definitions examined)

### Secondary (MEDIUM confidence)
- `.planning/research/LEDGER-CORTEX-BRIEF.md` (strategic context)
- `.planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md` (draft roadmap, used as baseline)
- `.planning/PROJECT-UPDATE.md` (task definition with conceptual tree)

## Metadata

**Confidence breakdown:**
- Subsystem boundaries: HIGH -- based on direct code analysis, every file mapped
- Claude Code patterns: HIGH -- based on direct examination of GSD installation
- Roadmap restructuring: HIGH -- based on dependency chain analysis of existing requirements
- Spec document patterns: HIGH -- based on existing INNER-VOICE-SPEC.md as exemplar

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (specifications, not implementation -- longer validity)

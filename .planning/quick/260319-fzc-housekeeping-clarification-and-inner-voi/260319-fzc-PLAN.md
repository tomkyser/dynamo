---
phase: 260319-fzc
plan: 01-05
type: execute
description: "Housekeeping, clarification, and Inner Voice & Dynamo Architecture — research, spec docs, PRD generation, and roadmap refactor"
plans:
  - id: "260319-fzc-01"
    wave: 1
    depends_on: []
    files_modified:
      - ".planning/research/INNER-VOICE-ABSTRACT.md"
      - ".planning/research/DYNAMO-PRD.md"
    autonomous: true
    requirements: ["ABSTRACT-IV", "DYNAMO-PRD"]
    must_haves:
      truths:
        - "Abstract Inner Voice document exists and contains zero references to Dynamo, Claude Code, Graphiti, or any specific platform/provider"
        - "Abstract document defines the Inner Voice concept through cognitive science frameworks with sufficient depth for any platform to implement"
        - "Dynamo PRD exists covering vision, 6-subsystem architecture, platform adapter pattern, feature roadmap, non-functional requirements, and success metrics"
        - "PRD references the abstract Inner Voice at conceptual level without duplicating mechanical detail"
      artifacts:
        - path: ".planning/research/INNER-VOICE-ABSTRACT.md"
          provides: "Platform-agnostic Inner Voice concept document"
          contains: "cognitive processing system"
        - path: ".planning/research/DYNAMO-PRD.md"
          provides: "Strategic product requirements document for Dynamo Claude Code edition"
          contains: "Subsystem Overview"
      key_links:
        - from: ".planning/research/DYNAMO-PRD.md"
          to: ".planning/research/INNER-VOICE-ABSTRACT.md"
          via: "conceptual reference to abstract Inner Voice"
          pattern: "INNER-VOICE-ABSTRACT"

  - id: "260319-fzc-02"
    wave: 2
    depends_on: ["260319-fzc-01"]
    files_modified:
      - ".planning/research/TERMINUS-SPEC.md"
      - ".planning/research/SWITCHBOARD-SPEC.md"
    autonomous: true
    requirements: ["TERMINUS-SPEC", "SWITCHBOARD-SPEC"]
    must_haves:
      truths:
        - "Terminus spec covers MCP client, Docker stack, health checks, diagnostics, migrations, and verify-memory as its domain"
        - "Switchboard spec covers install, sync, update, update-check as its domain plus hook dispatcher"
        - "Both specs define inbound/outbound interfaces and migration paths from current codebase"
        - "No file is assigned to both Terminus and Switchboard"
      artifacts:
        - path: ".planning/research/TERMINUS-SPEC.md"
          provides: "Data Infrastructure Layer specification"
          contains: "Migration Path"
        - path: ".planning/research/SWITCHBOARD-SPEC.md"
          provides: "Dispatcher, hooks, and operations specification"
          contains: "Migration Path"
      key_links:
        - from: ".planning/research/TERMINUS-SPEC.md"
          to: ".planning/research/DYNAMO-PRD.md"
          via: "subsystem boundary reference"
          pattern: "Dynamo PRD"
        - from: ".planning/research/SWITCHBOARD-SPEC.md"
          to: ".planning/research/DYNAMO-PRD.md"
          via: "subsystem boundary reference"
          pattern: "Dynamo PRD"

  - id: "260319-fzc-03"
    wave: 2
    depends_on: ["260319-fzc-01"]
    files_modified:
      - ".planning/research/LEDGER-SPEC.md"
      - ".planning/research/ASSAY-SPEC.md"
    autonomous: true
    requirements: ["LEDGER-SPEC", "ASSAY-SPEC"]
    must_haves:
      truths:
        - "Ledger spec covers data construction only: episodes.cjs write operations, curation pipeline"
        - "Assay spec covers data access only: search.cjs, sessions.cjs read operations"
        - "Ledger writes through Terminus transport; Assay reads through Terminus transport"
        - "Neither Ledger nor Assay directly access the other's domain"
      artifacts:
        - path: ".planning/research/LEDGER-SPEC.md"
          provides: "Data Construction Layer specification"
          contains: "Migration Path"
        - path: ".planning/research/ASSAY-SPEC.md"
          provides: "Data Access Layer specification"
          contains: "Migration Path"
      key_links:
        - from: ".planning/research/LEDGER-SPEC.md"
          to: ".planning/research/TERMINUS-SPEC.md"
          via: "transport dependency"
          pattern: "Terminus"
        - from: ".planning/research/ASSAY-SPEC.md"
          to: ".planning/research/TERMINUS-SPEC.md"
          via: "transport dependency"
          pattern: "Terminus"

  - id: "260319-fzc-04"
    wave: 3
    depends_on: ["260319-fzc-01", "260319-fzc-02", "260319-fzc-03"]
    files_modified:
      - ".planning/research/REVERIE-SPEC.md"
    autonomous: true
    requirements: ["REVERIE-SPEC"]
    must_haves:
      truths:
        - "Reverie spec applies the abstract Inner Voice concept to Dynamo's Claude Code platform specifically"
        - "Reverie spec references concrete Claude Code mechanisms: hooks, subagents, settings.json, additionalContext"
        - "Reverie spec defines interfaces with Assay (read), Ledger (write), and Terminus (transport)"
        - "Reverie spec incorporates all surviving Synthesis v2 concepts (1, 4, 5, 7) with correct GO/CONDITIONAL GO/DEFER assignments"
        - "Reverie spec includes hybrid architecture: CJS command hooks for hot path + custom subagent for deliberation"
      artifacts:
        - path: ".planning/research/REVERIE-SPEC.md"
          provides: "Inner Voice subsystem specification for Claude Code platform"
          contains: "Hybrid Architecture"
      key_links:
        - from: ".planning/research/REVERIE-SPEC.md"
          to: ".planning/research/INNER-VOICE-ABSTRACT.md"
          via: "applies abstract to platform"
          pattern: "INNER-VOICE-ABSTRACT"
        - from: ".planning/research/REVERIE-SPEC.md"
          to: ".planning/research/ASSAY-SPEC.md"
          via: "read interface"
          pattern: "Assay"
        - from: ".planning/research/REVERIE-SPEC.md"
          to: ".planning/research/LEDGER-SPEC.md"
          via: "write interface"
          pattern: "Ledger"

  - id: "260319-fzc-05"
    wave: 4
    depends_on: ["260319-fzc-04"]
    files_modified:
      - "MASTER-ROADMAP.md"
      - ".planning/PROJECT.md"
      - ".planning/STATE.md"
    autonomous: true
    requirements: ["ROADMAP-REFACTOR", "GSD-UPDATES"]
    must_haves:
      truths:
        - "MASTER-ROADMAP.md uses 1.3-M1 through 1.3-M7 milestone numbering with no v1.4/v1.5/v2.0 sections"
        - "All ~40 active requirements are accounted for in 1.3-M* milestones or deferred section"
        - "Deferred items listed at end with no assigned target version"
        - "New subsystem names (Ledger, Assay, Terminus, Reverie, Switchboard, Dynamo) used consistently"
        - "PROJECT.md reflects the 6-subsystem architecture and target directory structure"
        - "STATE.md reflects current position and accumulated context from this task"
      artifacts:
        - path: "MASTER-ROADMAP.md"
          provides: "Refactored roadmap with v1.3 milestoned iterations"
          contains: "1.3-M1"
        - path: ".planning/PROJECT.md"
          provides: "Updated project documentation"
          contains: "Assay"
        - path: ".planning/STATE.md"
          provides: "Updated project state"
          contains: "260319-fzc"
      key_links:
        - from: "MASTER-ROADMAP.md"
          to: ".planning/research/DYNAMO-PRD.md"
          via: "roadmap implements PRD feature list"
          pattern: "1.3-M"
---

<objective>
Produce the complete specification document suite for Dynamo's six-subsystem architecture evolution, culminating in a refactored master roadmap.

Purpose: Transform the accumulated research (Inner Voice synthesis, steel-man analysis, Ledger Cortex analysis, roadmap drafts) into authoritative specification documents that define the target architecture, subsystem boundaries, and milestoned delivery plan for v1.3.

Output: 9 documents across 5 plans — 1 abstract concept doc, 1 PRD, 5 subsystem specs, 1 refactored roadmap, and GSD planning file updates.
</objective>

<execution_context>
@/Users/tom.kyser/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tom.kyser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT-UPDATE.md
@.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-CONTEXT.md
@.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-RESEARCH.md
@.planning/research/INNER-VOICE-SYNTHESIS-RESEARCH.md
@.planning/research/INNER-VOICE-SPEC.md
@.planning/research/INNER-VOICE-SYNTHESIS-v2.md
@.planning/research/LEDGER-CORTEX-ANALYSIS.md
@.planning/research/LEDGER-CORTEX-BRIEF.md
@.planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md
@MASTER-ROADMAP.md
@README.md
</context>

<!-- ============================================================ -->
<!-- PLAN 01 (Wave 1): Abstract Inner Voice + Dynamo PRD          -->
<!-- ============================================================ -->

<plan id="260319-fzc-01">

## Plan 01: Abstract Inner Voice Concept + Dynamo PRD

**Wave:** 1 (no dependencies)
**Context budget:** ~40% (2 large documents, high synthesis)

<tasks>

<task type="auto">
  <name>Task 1: Write Abstract Inner Voice Concept Document</name>
  <files>.planning/research/INNER-VOICE-ABSTRACT.md</files>
  <action>
Create a platform-agnostic, provider-agnostic document that defines the Inner Voice concept at a theoretical level. This document should be readable by someone who has never heard of Dynamo, Claude Code, or Graphiti.

**Structure (adapt from INNER-VOICE-SPEC.md depth model):**

1. **Executive Summary** (2-3 paragraphs) — What the Inner Voice is: a continuous parallel cognitive process running alongside an active AI session. Define it through the dual-process model, sublimation model, and experiential processing concept.

2. **The Problem It Solves** — The subjective attention problem. Current AI memory systems treat conversation as an objective artifact. The Inner Voice constructs the user's subjective attention point. Use theoretical language: "the cognitive processing system," "the knowledge store," "the integration layer" — NO platform-specific references.

3. **Cognitive Theory Foundation** — Distill the 15 theories from INNER-VOICE-SPEC.md Section 3 into platform-agnostic descriptions. Classify into PRIMARY (7), SECONDARY (5), TERTIARY/SUPPORTING (3). For each: what it is, what it produces in the system, why it is load-bearing. Use tables for clarity.

4. **Architectural Principles** — The 10 design principles from INNER-VOICE-SPEC.md Section 3.5 expressed without implementation detail. "Most processing stays invisible" not "hook output stays empty." "Speak when surprised, not when scheduled" not "semantic shift triggers injection."

5. **The Sublimation Model** — How the Inner Voice selectively surfaces insights. Activation cascading, threshold mechanisms, convergent activation, temporal dynamics. Describe the composite threshold function conceptually without JSON schemas or file paths.

6. **The Dual-Path Architecture** — Hot path (fast, deterministic, cheap) vs. deliberation path (slow, intelligent, expensive). Explain why this is the critical cost-control mechanism. No specific model names (no "Haiku" or "Sonnet").

7. **The REM Consolidation Model** — Three-tier consolidation mapped to session lifecycle events abstractly. Triage (context loss events), provisional (idle), full (session end). Working memory to long-term memory gate.

8. **The Three-Tier Memory Architecture** — Knowledge graph (structured relationships), data lake (raw history), metacognitive memory (the Inner Voice's own processing products). Explain the compounding effect.

9. **Adversarial Analysis** — Condense INNER-VOICE-SPEC.md Section 5 into platform-agnostic stress tests. Key failure modes (false positive injection, confidently wrong, over-sublimation) with mitigations. Risk register without implementation specifics.

10. **Open Questions** — Theoretical open questions that any implementation would face.

**CRITICAL CONSTRAINTS:**
- ZERO references to: Dynamo, Claude Code, Graphiti, Neo4j, CJS, hooks, JSON, Anthropic, Claude, OpenRouter, Haiku, Sonnet, Opus, MCP, Docker
- Use generic terms: "the host AI session," "the knowledge store," "the processing event," "the session lifecycle event," "the cognitive processing engine"
- Target audience: someone who wants to understand the concept to build it on ANY platform
- Depth level: INNER-VOICE-SPEC.md quality but conceptual, not mechanical
- Length: ~600-800 lines (substantial but not implementation-heavy)

**Sources to synthesize from:**
- INNER-VOICE-SPEC.md Sections 1-5 (strip platform specifics)
- INNER-VOICE-SYNTHESIS-v2.md Sections 1, 3, 4, 5, 6 (theoretical frameworks)
- INNER-VOICE-SYNTHESIS-RESEARCH.md Track A (surviving concepts at conceptual level)
- LEDGER-CORTEX-BRIEF.md "The Inner Voice" section (vision framing)
  </action>
  <verify>
    <automated>grep -c -i -E "dynamo|claude code|graphiti|neo4j|\.cjs|hooks\.|json schema|anthropic|haiku|sonnet|opus|mcp|docker|openrouter" .planning/research/INNER-VOICE-ABSTRACT.md | grep -q "^0$" && echo "PASS: No platform references" || echo "FAIL: Platform references found"</automated>
  </verify>
  <done>INNER-VOICE-ABSTRACT.md exists in .planning/research/, contains zero platform/provider-specific references, and defines the complete Inner Voice concept through cognitive science frameworks at specification-level depth.</done>
</task>

<task type="auto">
  <name>Task 2: Write Dynamo PRD (Claude Code Edition)</name>
  <files>.planning/research/DYNAMO-PRD.md</files>
  <action>
Create a strategic but comprehensive Product Requirements Document for Dynamo as a Claude Code platform.

**Structure (from RESEARCH.md Section 4):**

1. **Vision and Purpose**
   - What Dynamo is: a Claude Code power-user platform for persistent memory and self-management
   - The evolution: from hook-driven memory pipeline to six-subsystem cognitive architecture
   - Claudia-aware design principle (design for extensibility, build for now)
   - Core value: every capability must be self-manageable by Claude Code without manual user config file edits

2. **Platform Architecture**
   - The `cc/` adapter pattern from PROJECT-UPDATE.md conceptual tree
   - Full target directory structure (from RESEARCH.md Section 1)
   - Platform adapter explanation: `cc/` isolates Claude Code integration; future `/web`, `/api`, `/mcp` implementations possible without touching subsystem logic
   - Shared substrate: `lib/` (core.cjs, scope.cjs, pretty.cjs), `shared/` (config.json, VERSION)

3. **Subsystem Overview**
   - Six subsystems with responsibilities and boundaries table:
     - **Dynamo**: System wrapper — CLI router, shared resources, API surface, MCP server
     - **Switchboard**: Dispatcher — hook routing, install/sync/update lifecycle, internal I/O, events
     - **Ledger**: Data Construction — episode creation, curation pipeline, data writing
     - **Assay**: Data Access — search, session queries, data reading
     - **Terminus**: Data Infrastructure — MCP transport, Docker stack, health/diagnostics, migrations
     - **Reverie**: Inner Voice — cognitive processing, dual-path routing, activation management, REM consolidation
   - Interface pattern diagram (who calls whom, data flow direction)
   - Boundary rules: Ledger does NOT read (Assay's job), Assay does NOT write (Ledger's job), Reverie reads through Assay and writes through Ledger

4. **User Value Proposition**
   - Current value (v1.2.1): automatic context injection, prompt augmentation, change tracking, session summarization
   - v1.3 value: intelligent context-aware injection replacing mechanical curation, dual-path cost control, self-model persistence
   - Future value: narrative briefings, relationship modeling, observation synthesis, agent coordination

5. **Feature Roadmap** (high-level, detailed version in MASTER-ROADMAP.md)
   - Summarize the 1.3-M1 through 1.3-M7 milestone structure from RESEARCH.md Section 3
   - Each milestone: 1-2 sentence description + key requirements
   - Reference MASTER-ROADMAP.md for full requirement details

6. **Non-Functional Requirements**
   - Latency: Hot path <500ms, deliberation <2s, session start <4s
   - Cost: Subscription users ~$0.37/day, API users ~$1.98/day (v1.3)
   - Self-manageability: install, configure, update, troubleshoot without manual config edits
   - Zero external dependencies: no npm, no package.json — pure Node.js built-ins + CJS
   - Security: jailbreak/hijacking protection, toggle gate, graceful degradation
   - Testing: 374+ tests, node:test built-in framework, tmpdir isolation

7. **Constraints and Principles**
   - Dual-path is non-negotiable
   - Prove before scaling (each milestone gates the next)
   - Agents are expensive; functions are cheap
   - Claudia-aware, not Claudia-scoped
   - Claude Code (Max subscription) as the platform — minimize additional API dependence
   - Hybrid architecture: CJS command hooks for hot path + custom subagents for deliberation

8. **Success Metrics**
   - Injection relevance rate (% of injections user references in subsequent prompts)
   - Silence accuracy (% of non-injection decisions that were correct)
   - Cost per session within budget
   - Hot path latency <500ms p95
   - Feature flag rollback to classic curation if quality regresses

**Sources to synthesize from:**
- PROJECT-UPDATE.md (conceptual tree, objectives)
- RESEARCH.md (subsystem boundary analysis, directory structure, roadmap structure)
- INNER-VOICE-SYNTHESIS-RESEARCH.md (cost projections, hybrid architecture)
- LEDGER-CORTEX-ANALYSIS.md (go/no-go verdicts, Option C recommendation)
- LEDGER-CORTEX-BRIEF.md (vision, Claudia context)
- MASTER-ROADMAP.md (current requirements)
- README.md (current capabilities)

Reference the Abstract Inner Voice document: "See INNER-VOICE-ABSTRACT.md for the platform-agnostic concept definition."
  </action>
  <verify>
    <automated>grep -c "Subsystem Overview" .planning/research/DYNAMO-PRD.md | grep -qv "^0$" && grep -c "1.3-M" .planning/research/DYNAMO-PRD.md | grep -qv "^0$" && echo "PASS: PRD has subsystem overview and milestone references" || echo "FAIL: Missing key PRD sections"</automated>
  </verify>
  <done>DYNAMO-PRD.md exists in .planning/research/, covers all 8 sections, defines the 6-subsystem architecture with boundaries, references the abstract Inner Voice document, and includes the milestoned feature roadmap summary.</done>
</task>

</tasks>

<verification>
- INNER-VOICE-ABSTRACT.md contains zero platform-specific references (verified by grep)
- DYNAMO-PRD.md contains all 8 sections with subsystem overview and milestone structure
- Both documents are in .planning/research/ directory
- Abstract document is referenced by PRD
</verification>

<success_criteria>
Two foundation documents exist that all subsequent specs reference: the platform-agnostic Inner Voice concept and the platform-specific Dynamo PRD with 6-subsystem architecture definition.
</success_criteria>

<output>
After completion, create `.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-01-SUMMARY.md`
</output>

</plan>

<!-- ============================================================ -->
<!-- PLAN 02 (Wave 2): Terminus + Switchboard Specs               -->
<!-- ============================================================ -->

<plan id="260319-fzc-02">

## Plan 02: Terminus + Switchboard Subsystem Specs

**Wave:** 2 (depends on Plan 01 — PRD defines boundaries)
**Context budget:** ~35% (2 specs, clear module mapping from research)

<tasks>

<task type="auto">
  <name>Task 1: Write Terminus Specification</name>
  <files>.planning/research/TERMINUS-SPEC.md</files>
  <action>
Create a detailed technical specification for Terminus, the Data Infrastructure Layer.

**Use the spec template from RESEARCH.md Section 4 with INNER-VOICE-SPEC.md depth:**

1. **Executive Summary** — What Terminus does: owns all data infrastructure — transport, storage backend, health monitoring, diagnostics, and data migrations. It is the pipe between subsystems and the knowledge graph.

2. **Responsibilities and Boundaries**
   - **Owns:** MCP client (JSON-RPC transport to Graphiti), Docker stack lifecycle (start/stop), 6-stage health check, 13-stage diagnostics, pipeline verification (verify-memory), migration harness and scripts, shared diagnostic stages
   - **Does NOT own:** What data to write (Ledger's job), what data to read (Assay's job), when to write/read (Reverie/Switchboard decide), CLI routing (Dynamo's job), install/sync/update (Switchboard's job)
   - Interface contracts: Terminus provides transport functions that Ledger and Assay call; Terminus provides health/diagnostic functions that Switchboard/Dynamo call

3. **Architecture**
   - Module structure with current file -> new location mapping:
     - `ledger/mcp-client.cjs` -> `subsystems/terminus/mcp-client.cjs`
     - `switchboard/stack.cjs` -> `subsystems/terminus/stack.cjs`
     - `switchboard/health-check.cjs` -> `subsystems/terminus/health-check.cjs`
     - `switchboard/diagnose.cjs` -> `subsystems/terminus/diagnose.cjs`
     - `switchboard/verify-memory.cjs` -> `subsystems/terminus/verify-memory.cjs`
     - `switchboard/stages.cjs` -> `subsystems/terminus/stages.cjs`
     - `switchboard/migrate.cjs` -> `subsystems/terminus/migrate.cjs`
     - `dynamo/migrations/` -> `migrations/` (Terminus-managed)
     - `ledger/graphiti/` -> referenced by Terminus (Docker infra stays in graphiti/)
   - State management: Terminus is stateless — it provides transport, not state
   - Configuration surface: `graphiti.mcp_url`, `graphiti.health_url`, `timeouts.*`

4. **Interfaces**
   - **Inbound:** Ledger calls `addEpisode()` through Terminus MCP client; Assay calls `search()`, `getEntity()` through Terminus MCP client; Switchboard calls `startStack()`, `stopStack()`; Dynamo CLI calls `healthCheck()`, `diagnose()`, `verifyMemory()`, `migrate()`
   - **Outbound:** Terminus calls Graphiti MCP server via JSON-RPC/SSE; Terminus calls Docker via `docker compose` CLI
   - Data contracts: MCP JSON-RPC request/response schemas (already defined by Graphiti protocol)

5. **Implementation Detail**
   - MCPClient class: methods, connection lifecycle, SSE parsing, timeout handling
   - Stack management: start with health wait, stop with graceful shutdown
   - Health check: 6 stages (Docker, Neo4j, API, MCP, env, canary)
   - Diagnostics: 13 stages (comprehensive system inspection)
   - Migration harness: version comparison, sequential execution, boundary filtering

6. **Migration Path**
   - Files moving from `switchboard/` to `subsystems/terminus/`: stack.cjs, health-check.cjs, diagnose.cjs, verify-memory.cjs, stages.cjs, migrate.cjs
   - Files moving from `ledger/`: mcp-client.cjs
   - Breaking changes: import paths change for all consumers
   - Backward compatibility: During migration, old paths can re-export from new locations

7. **Open Questions**
   - SQLite session index (MGMT-11) — does this belong to Terminus or Assay?
   - Graphiti Docker infra directory — stays at `graphiti/` or moves under Terminus?

**Sources:** RESEARCH.md Section 1 (file mapping table), README.md (current architecture), LEDGER-CORTEX-ANALYSIS.md Section 6 (Infrastructure Agent verdict — deterministic tooling, NOT LLM agent)
  </action>
  <verify>
    <automated>grep -c "Migration Path" .planning/research/TERMINUS-SPEC.md | grep -qv "^0$" && grep -c "mcp-client" .planning/research/TERMINUS-SPEC.md | grep -qv "^0$" && echo "PASS: Terminus spec has migration path and MCP client" || echo "FAIL: Missing key sections"</automated>
  </verify>
  <done>TERMINUS-SPEC.md exists with 7 sections, maps all current infrastructure files to the new subsystem, defines transport interfaces for Ledger and Assay, and includes migration path.</done>
</task>

<task type="auto">
  <name>Task 2: Write Switchboard Specification</name>
  <files>.planning/research/SWITCHBOARD-SPEC.md</files>
  <action>
Create a detailed technical specification for Switchboard, the Dispatcher and Operations Layer.

**Use the spec template from RESEARCH.md Section 4:**

1. **Executive Summary** — What Switchboard does: owns hook dispatching, system lifecycle operations (install/sync/update), and event routing. It is the nervous system connecting Claude Code events to subsystem handlers.

2. **Responsibilities and Boundaries**
   - **Owns:** Hook dispatcher (dynamo-hooks.cjs), install lifecycle, bidirectional sync, update/upgrade system, update-check, hook event routing, settings-hooks.json management
   - **Does NOT own:** What hooks DO with events (handlers belong to their subsystems — Reverie owns Inner Voice hooks, Ledger owns capture hooks), data transport (Terminus), data access (Assay), data construction (Ledger), health checks (Terminus — Switchboard calls them but doesn't own them)
   - **Key distinction:** Switchboard DISPATCHES hook events to handlers but does NOT implement the handler logic. The handler for UserPromptSubmit lives in Reverie (Inner Voice processing), not in Switchboard.

3. **Architecture**
   - Module structure:
     - `dynamo/hooks/dynamo-hooks.cjs` -> `cc/hooks/dynamo-hooks.cjs` (dispatcher)
     - `switchboard/install.cjs` -> `subsystems/switchboard/install.cjs`
     - `switchboard/sync.cjs` -> `subsystems/switchboard/sync.cjs`
     - `switchboard/update.cjs` -> `subsystems/switchboard/update.cjs`
     - `switchboard/update-check.cjs` -> `subsystems/switchboard/update-check.cjs`
   - Hook event flow: Claude Code -> settings.json -> dynamo-hooks.cjs (Switchboard dispatcher) -> route to handler (in Ledger/Reverie/etc.)
   - Configuration: `settings-hooks.json`, `CLAUDE-TEMPLATE.MD`

4. **Interfaces**
   - **Inbound:** Claude Code sends hook events via stdin JSON; Dynamo CLI routes install/sync/update/toggle commands
   - **Outbound:** Switchboard dispatches to Reverie (UserPromptSubmit, SessionStart, Stop, PreCompact), Ledger (PostToolUse capture), Terminus (health checks during install)
   - Event routing table: which hook event goes to which subsystem handler

5. **Implementation Detail**
   - Dispatcher: stdin parse, toggle gate, project detection, scope build, handler routing
   - Install: 6-step deployment (copy, config, merge settings, register MCP, retire legacy, health check)
   - Sync: bidirectional with content-based comparison (Buffer.compare), per-pair excludes, dry-run
   - Update: backup, pull, migrate, verify, auto-rollback on failure
   - The `cc/` directory: hooks/, agents/, skills/, rules/, prompts/, CLAUDE-TEMPLATE.MD, settings-hooks.json, dynamo-cc.cjs

6. **Migration Path**
   - Hook dispatcher moves from `dynamo/hooks/` to `cc/hooks/`
   - Operations stay in `subsystems/switchboard/`
   - Breaking changes: dispatcher path in settings.json must be updated
   - Agent definitions (`.claude/agents/inner-voice.md`) are managed through `cc/agents/`

7. **Open Questions**
   - Should Switchboard own the `cc/` directory entirely, or should `cc/` be a peer of subsystems?
   - Hook handler registration — static (settings-hooks.json) vs. dynamic (subsystems register their own handlers)?

**Sources:** RESEARCH.md Section 1 (file mapping), README.md (current hook system), INNER-VOICE-SYNTHESIS-RESEARCH.md Track B Section 4 (hook handler pattern, subagent definition)
  </action>
  <verify>
    <automated>grep -c "Migration Path" .planning/research/SWITCHBOARD-SPEC.md | grep -qv "^0$" && grep -c "dispatcher" .planning/research/SWITCHBOARD-SPEC.md | grep -qv "^0$" && echo "PASS: Switchboard spec has migration path and dispatcher" || echo "FAIL: Missing key sections"</automated>
  </verify>
  <done>SWITCHBOARD-SPEC.md exists with 7 sections, distinguishes dispatching from handler implementation, maps current files to new locations, and includes the cc/ adapter pattern.</done>
</task>

</tasks>

<verification>
- Both specs define clear ownership boundaries with no file overlap
- Both specs include migration paths from current codebase
- Terminus covers all infrastructure files; Switchboard covers all operations files
- Interface contracts between subsystems are consistent
</verification>

<success_criteria>
Terminus and Switchboard specs exist with clear boundaries. Infrastructure (transport, health, diagnostics) lives in Terminus. Operations (install, sync, update) and dispatching live in Switchboard.
</success_criteria>

<output>
After completion, create `.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-02-SUMMARY.md`
</output>

</plan>

<!-- ============================================================ -->
<!-- PLAN 03 (Wave 2): Ledger + Assay Specs                       -->
<!-- ============================================================ -->

<plan id="260319-fzc-03">

## Plan 03: Ledger + Assay Subsystem Specs

**Wave:** 2 (depends on Plan 01 — PRD defines boundaries; parallel with Plan 02)
**Context budget:** ~35% (2 specs, clean read/write split from research)

<tasks>

<task type="auto">
  <name>Task 1: Write Ledger Specification (Data Construction)</name>
  <files>.planning/research/LEDGER-SPEC.md</files>
  <action>
Create a detailed technical specification for Ledger in its NARROWED scope: Data Construction Layer only.

**Use the spec template from RESEARCH.md Section 4:**

1. **Executive Summary** — What Ledger does NOW vs. what it becomes. Currently Ledger owns all memory operations (search, episodes, curation, sessions, hooks, MCP client). In the new architecture, Ledger narrows to data CONSTRUCTION only — writing, creating, and shaping data. Search/sessions move to Assay. MCP client moves to Terminus.

2. **Responsibilities and Boundaries**
   - **Owns:** Episode creation (addEpisode), curation pipeline (Haiku-based formatting of data for write), data shaping before write, PostToolUse capture logic (the handler that decides WHAT to capture from file changes)
   - **Does NOT own:** Search (Assay), session queries (Assay), MCP transport (Terminus), hook dispatching (Switchboard), cognitive processing (Reverie)
   - **Important clarification on Reverie boundary:** Reverie's curation.cjs (Inner Voice curation) absorbs current curation.cjs. Ledger retains basic write-side formatting only. The intelligence of "what to curate and how" moves to Reverie.

3. **Architecture**
   - Module structure:
     - `ledger/episodes.cjs` -> `subsystems/ledger/episodes.cjs` (stays, data creation)
     - `ledger/curation.cjs` -> split: write formatting stays in Ledger; intelligent curation moves to Reverie
   - Ledger calls Terminus transport functions for all graph writes
   - Ledger does NOT import from Assay — write operations never need read operations within Ledger's boundary

4. **Interfaces**
   - **Inbound:** Reverie calls Ledger to write episodes, update entities, store observations; Switchboard dispatches PostToolUse events to Ledger's capture handler
   - **Outbound:** Ledger calls Terminus MCP client for graph write operations
   - Data contracts: Episode schema (content, scope, metadata), entity update schema

5. **Implementation Detail**
   - `addEpisode(content, scope, metadata)` — creates a Graphiti episode via Terminus
   - PostToolUse capture handler: extracts file change summary, calls `addEpisode`
   - Write-side formatting: minimal shaping of data before write (not the LLM curation — that's Reverie)

6. **Migration Path**
   - `ledger/episodes.cjs` -> `subsystems/ledger/episodes.cjs` (minor: import path change)
   - `ledger/curation.cjs` -> SPLIT: basic write formatting to `subsystems/ledger/format.cjs`, intelligent curation to `subsystems/reverie/curation.cjs`
   - `ledger/search.cjs` -> MOVES to Assay entirely
   - `ledger/sessions.cjs` -> MOVES to Assay entirely
   - `ledger/scope.cjs` -> MOVES to `lib/scope.cjs` (shared utility)
   - `ledger/mcp-client.cjs` -> MOVES to Terminus
   - `ledger/hooks/` -> handlers move to their owning subsystems (capture-change stays with Ledger, others move to Reverie)
   - Breaking changes: All consumers of `ledger/search.cjs` must update imports to Assay

7. **Open Questions**
   - Does Ledger own the observation write path (CORTEX-05), or does Reverie own it and call Ledger?
   - Does Ledger retain any curation intelligence, or does ALL curation move to Reverie?

**Sources:** RESEARCH.md Section 1 (Ledger split table), CONTEXT.md (Ledger narrows to Data Construction Layer)
  </action>
  <verify>
    <automated>grep -c "Migration Path" .planning/research/LEDGER-SPEC.md | grep -qv "^0$" && grep -c "episodes" .planning/research/LEDGER-SPEC.md | grep -qv "^0$" && echo "PASS: Ledger spec has migration and episodes" || echo "FAIL: Missing key sections"</automated>
  </verify>
  <done>LEDGER-SPEC.md exists defining Ledger as construction-only, with clear boundary (no search, no sessions), migration path for all departing modules, and interface contracts with Terminus and Reverie.</done>
</task>

<task type="auto">
  <name>Task 2: Write Assay Specification (Data Access)</name>
  <files>.planning/research/ASSAY-SPEC.md</files>
  <action>
Create a detailed technical specification for Assay, the new Data Access Layer split from Ledger.

**Use the spec template from RESEARCH.md Section 4:**

1. **Executive Summary** — What Assay is: a NEW subsystem created by splitting read operations out of Ledger. Assay owns all data access — queries, search, session retrieval, entity inspection. It is the read-side counterpart to Ledger's write-side.

2. **Responsibilities and Boundaries**
   - **Owns:** Combined/fact/node search (from search.cjs), session listing/viewing/labeling/backfill (from sessions.cjs), entity and edge inspection
   - **Does NOT own:** Writing data (Ledger), transport (Terminus), cognitive processing (Reverie), curation/formatting for injection (Reverie)
   - **Key principle:** Assay is a pure read layer. It never modifies the knowledge graph. All write operations go through Ledger.

3. **Architecture**
   - Module structure:
     - `ledger/search.cjs` -> `subsystems/assay/search.cjs` (combined, fact, node search)
     - `ledger/sessions.cjs` -> `subsystems/assay/sessions.cjs` (session CRUD + naming)
   - Assay calls Terminus transport functions for all graph reads
   - Assay does NOT import from Ledger

4. **Interfaces**
   - **Inbound:** Reverie calls Assay for knowledge graph queries (activation map population, entity lookup, relationship traversal); Dynamo CLI routes search/recall/edge/session commands to Assay; SessionStart handler (in Reverie) calls Assay for context retrieval
   - **Outbound:** Assay calls Terminus MCP client for graph read operations
   - Data contracts: Search request/response schemas, session listing schema, entity detail schema

5. **Implementation Detail**
   - `combinedSearch(query, scope)` — returns ranked entities + facts
   - `searchFacts(query, scope)` — relationship-only search
   - `searchNodes(query, scope)` — entity-only search
   - `listSessions(scope)` — session index queries
   - `viewSession(id)` — full session retrieval
   - `labelSession(id, label)` — session metadata update (NOTE: this is a write — determine if this stays in Assay or moves to Ledger)
   - `backfillSessions()` — batch session naming via Haiku

6. **Migration Path**
   - `ledger/search.cjs` -> `subsystems/assay/search.cjs` (direct move, function signatures unchanged)
   - `ledger/sessions.cjs` -> `subsystems/assay/sessions.cjs` (direct move, but session CREATION during Stop hook may need to stay with Ledger or Reverie)
   - Import path updates: all consumers change from `require('../ledger/search')` to `require('../subsystems/assay/search')`
   - The `core.cjs` re-exports (loadSessions, listSessions) update their source to Assay

7. **Open Questions**
   - Session creation (new session record at SessionStart) — is this an Assay operation (it manages sessions) or a Ledger operation (it creates data)?
   - Session labeling and backfill involve writes — should these stay in Assay for cohesion or move to Ledger for write-boundary purity?
   - Does Assay own the SQLite session index (MGMT-11) since it manages session queries?

**Sources:** RESEARCH.md Section 1 (Assay file mapping), CONTEXT.md (Assay is Data Access Layer split from Ledger)
  </action>
  <verify>
    <automated>grep -c "Migration Path" .planning/research/ASSAY-SPEC.md | grep -qv "^0$" && grep -c "search" .planning/research/ASSAY-SPEC.md | grep -qv "^0$" && echo "PASS: Assay spec has migration and search" || echo "FAIL: Missing key sections"</automated>
  </verify>
  <done>ASSAY-SPEC.md exists defining Assay as the new read-only data access layer, with migration path from Ledger, search and session interfaces, and clear boundary with Ledger's write operations.</done>
</task>

</tasks>

<verification>
- Ledger spec covers ONLY write operations (episodes, capture, formatting)
- Assay spec covers ONLY read operations (search, sessions, entity inspection)
- No file is claimed by both Ledger and Assay
- Both reference Terminus as their transport layer
- Migration paths account for every file currently in ledger/
</verification>

<success_criteria>
Ledger and Assay specs exist with a clean read/write split. Every current file in ledger/ has a defined destination (Ledger, Assay, Terminus, Reverie, or shared lib). Interface contracts are consistent with Terminus spec.
</success_criteria>

<output>
After completion, create `.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-03-SUMMARY.md`
</output>

</plan>

<!-- ============================================================ -->
<!-- PLAN 04 (Wave 3): Reverie Spec                               -->
<!-- ============================================================ -->

<plan id="260319-fzc-04">

## Plan 04: Reverie (Inner Voice) Subsystem Spec

**Wave:** 3 (depends on Plans 01-03 — needs PRD + all other subsystem specs for interface definitions)
**Context budget:** ~40% (1 complex spec, most content-heavy deliverable)

<tasks>

<task type="auto">
  <name>Task 1: Write Reverie Specification</name>
  <files>.planning/research/REVERIE-SPEC.md</files>
  <action>
Create the most detailed specification in the suite: Reverie, the Inner Voice subsystem applied to the Dynamo/Claude Code platform. This document applies the abstract Inner Voice concept (INNER-VOICE-ABSTRACT.md) to Dynamo's concrete architecture.

**Structure — follows spec template but deeper than other subsystem specs:**

1. **Executive Summary** — Reverie is the Inner Voice realized on the Claude Code platform. It is the cognitive processing engine that replaces Haiku curation with context-aware, personality-driven memory injection. Reference INNER-VOICE-ABSTRACT.md for the platform-agnostic concept.

2. **Responsibilities and Boundaries**
   - **Owns:** Cognitive processing pipeline, dual-path routing, activation map management, self-model and relationship model, injection formatting, Inner Voice state files, custom subagent definition, REM consolidation, hook handler logic for UserPromptSubmit/SessionStart/Stop/PreCompact
   - **Does NOT own:** Data transport (Terminus), raw data writes (Ledger), raw data reads (Assay), hook dispatching (Switchboard), CLI routing (Dynamo)
   - **Reads through Assay:** graph queries, entity lookups, session data
   - **Writes through Ledger:** episode creation, entity updates, observation storage
   - **Uses Terminus transport:** MCP client for direct graph operations when Ledger/Assay abstractions are insufficient

3. **Architecture**
   - Module structure from INNER-VOICE-SYNTHESIS-RESEARCH.md Track B Section 4:
     - `subsystems/reverie/inner-voice.cjs` — core processing logic (pipeline orchestrator)
     - `subsystems/reverie/dual-path.cjs` — hot/deliberation path routing and scoring
     - `subsystems/reverie/activation.cjs` — activation map management and spreading activation
     - `subsystems/reverie/curation.cjs` — intelligent curation (absorbed from Ledger)
     - `cc/agents/inner-voice.md` — custom subagent definition
     - `cc/hooks/iv-subagent-start.cjs` — SubagentStart handler
     - `cc/hooks/iv-subagent-stop.cjs` — SubagentStop handler
     - `cc/prompts/` — curation and IV prompt templates (moved from dynamo/prompts/)
   - State files: `inner-voice-state.json` (operational), `inner-voice-deliberation-result.json` (state bridge), `inner-voice-memory.json` (v1.4)

4. **The Hybrid Architecture** (from corrected Concept 7)
   - **Hot path (CJS command hooks, <500ms):** Deterministic processing + `additionalContext` injection. No LLM call. INNER-VOICE-SYNTHESIS-RESEARCH.md Track B Section 4 hot path definition.
   - **Deliberation path (custom subagent, 2-10s):** Main session spawns `inner-voice` subagent. SubagentStart hook injects state. Subagent processes. SubagentStop writes results to state file. Next UserPromptSubmit reads and injects.
   - **State bridge pattern:** SubagentStop cannot inject into parent context (GitHub #5812). Workaround via file-based state bridge with processing flag.
   - **API plan fallback:** Direct HTTP API calls for users not on subscription plan.
   - **Rate limit degradation:** Fall back to hot-path-only when rate-limited.

5. **Processing Pipelines Per Hook** — Full pipeline definitions from INNER-VOICE-SYNTHESIS-RESEARCH.md Track B Section 1:
   - UserPromptSubmit: LOAD -> EMBED -> CLASSIFY domain -> DETECT shift -> UPDATE activation -> DECIDE path -> EXECUTE injection -> UPDATE state -> RETURN
   - SessionStart: LOAD -> CLASSIFY -> ASSESS -> GENERATE briefing -> UPDATE -> RETURN
   - Stop (REM Tier 3): LOAD -> SYNTHESIZE -> RETROACTIVE EVAL (v1.4) -> OBSERVATION (v1.4) -> CASCADE (v1.4) -> UPDATE models -> WRITE IV memory (v1.4) -> PERSIST
   - PreCompact (REM Tier 1): LOAD -> PERSIST state -> PERSIST models -> PERSIST pending -> WRITE frame state -> GENERATE compact summary -> OUTPUT
   - PostToolUse: LOAD -> EXTRACT -> UPDATE activation -> QUEUE -> PERSIST

6. **Sublimation Threshold Mechanism** — From INNER-VOICE-SPEC.md Section 4.4:
   - Composite formula: `sublimation_score = activation_level * surprise_factor * relevance_ratio * (1 - cognitive_load_penalty) * confidence_weight`
   - Factor definitions and ranges
   - Threshold adaptation (metacognitive adjustment)

7. **State Management** — From INNER-VOICE-SPEC.md Section 4.2 + SYNTHESIS-RESEARCH Track B Section 2:
   - `inner-voice-state.json` full schema (self_model, relationship_model, activation_map, pending_associations, injection_history, predictions)
   - `inner-voice-memory.json` schema for v1.4 (sublimation_outcomes, frame_productivity, chain_evaluations, cascading_tags)
   - Operational state vs. IV memory boundary

8. **Custom Subagent Definition** — From SYNTHESIS-RESEARCH Track B Section 4:
   - Full YAML frontmatter for `~/.claude/agents/inner-voice.md`
   - Model: sonnet, tools: Read/Grep/Glob/Bash, disallowedTools: Write/Edit/Agent
   - permissionMode: dontAsk, maxTurns: 10, memory: user
   - System prompt structure

9. **Surviving Synthesis v2 Concepts Integration**
   - Concept 1 (Frame-First Pipeline): CONDITIONAL GO — v1.3 keyword classification, v1.4 embedding
   - Concept 4 (IV Memory): CONDITIONAL GO — v1.4, schema defined in Section 7
   - Concept 5 (REM Consolidation): GO — v1.3 basic, v1.4 full, mapped in Section 5
   - Concept 7 (Hybrid Architecture): CONDITIONAL GO — defined in Section 4
   - Concept 2 (User-Relative Definitions): DEFER to v1.4
   - Concept 3 (Variable Substitution): NO-GO, replaced by adversarial counter-prompting
   - Concept 6 (Scalar Compute): CONDITIONAL GO — v1.4 with graph density threshold

10. **Cost Model** — From SYNTHESIS-RESEARCH Track B Section 6:
    - Daily cost tables for API plan users and subscription plan users
    - v1.3 vs v1.4 projections
    - Key insight: subscription users $0.37/day, API users $1.98/day

11. **Migration Path**
    - Hook handlers move from `ledger/hooks/` to Reverie ownership (but dispatching stays with Switchboard)
    - Curation pipeline moves from `ledger/curation.cjs` to `subsystems/reverie/curation.cjs`
    - New files created: inner-voice.cjs, dual-path.cjs, activation.cjs, state files, subagent definition
    - Prompt templates move from `dynamo/prompts/` to `cc/prompts/`

12. **Adversarial Analysis** — Condensed from INNER-VOICE-SPEC.md Section 5:
    - Failure mode taxonomy (7 modes with severity and mitigation)
    - Risk register (10 risks)
    - Special treatment: "Confidently wrong" failure mode

13. **Open Questions**

**CRITICAL:** This is the PLATFORM-SPECIFIC spec. Unlike INNER-VOICE-ABSTRACT.md, this document MUST reference concrete Claude Code mechanisms: hooks, subagents, settings.json, additionalContext, CJS modules, JSON schemas, file paths. It applies the abstract to Dynamo.

**Sources (read all before writing):**
- .planning/research/INNER-VOICE-ABSTRACT.md (just created in Plan 01 — the abstract this applies)
- .planning/research/DYNAMO-PRD.md (just created — subsystem boundaries)
- .planning/research/ASSAY-SPEC.md (Plan 03 — read interfaces Reverie uses)
- .planning/research/LEDGER-SPEC.md (Plan 03 — write interfaces Reverie uses)
- .planning/research/TERMINUS-SPEC.md (Plan 02 — transport interfaces)
- .planning/research/INNER-VOICE-SYNTHESIS-RESEARCH.md (steel-man analysis, all track B sections)
- .planning/research/INNER-VOICE-SPEC.md (existing mechanical specification — the primary source)
- .planning/research/INNER-VOICE-SYNTHESIS-v2.md (theoretical extensions)
  </action>
  <verify>
    <automated>grep -c "Hybrid Architecture" .planning/research/REVERIE-SPEC.md | grep -qv "^0$" && grep -c "additionalContext" .planning/research/REVERIE-SPEC.md | grep -qv "^0$" && grep -c "Migration Path" .planning/research/REVERIE-SPEC.md | grep -qv "^0$" && echo "PASS: Reverie spec has hybrid architecture, CC mechanisms, and migration" || echo "FAIL: Missing key sections"</automated>
  </verify>
  <done>REVERIE-SPEC.md exists as the most detailed subsystem spec, covering hybrid architecture, all 5 processing pipelines, state management schemas, custom subagent definition, surviving Synthesis v2 concept integration, cost model, and migration path. References concrete Claude Code mechanisms throughout.</done>
</task>

</tasks>

<verification>
- Reverie spec references INNER-VOICE-ABSTRACT.md as its conceptual foundation
- Reverie spec references Assay (read), Ledger (write), Terminus (transport) interfaces
- Hybrid architecture (CJS hooks + custom subagent) is fully defined
- All 5 hook processing pipelines are specified
- State schemas include both operational and v1.4 IV memory
- Cost projections for both billing models included
</verification>

<success_criteria>
Reverie spec is the authoritative implementation reference for the Inner Voice on Claude Code. It applies the abstract concept to Dynamo's specific architecture, defines all interfaces with other subsystems, and incorporates all surviving research findings.
</success_criteria>

<output>
After completion, create `.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-04-SUMMARY.md`
</output>

</plan>

<!-- ============================================================ -->
<!-- PLAN 05 (Wave 4): Roadmap Refactor + GSD Updates             -->
<!-- ============================================================ -->

<plan id="260319-fzc-05">

## Plan 05: Master Roadmap Refactor + GSD Planning File Updates

**Wave:** 4 (depends on Plan 04 — needs all specs to inform roadmap structure)
**Context budget:** ~35% (roadmap rewrite + 2 planning file updates)

<tasks>

<task type="auto">
  <name>Task 1: Refactor MASTER-ROADMAP.md</name>
  <files>MASTER-ROADMAP.md</files>
  <action>
Completely rewrite MASTER-ROADMAP.md to fold v1.3/v1.4/v1.5/v2.0 into a single v1.3 with milestoned iterations. This is a FULL REWRITE, not an incremental edit.

**Structure:**

1. **Header and Meta**
   - Title: "Dynamo Master Roadmap"
   - Last updated: 2026-03-19
   - Explain: v1.3 is the target release. Milestones within (1.3-M1 through 1.3-M7) are iterations building toward 1.3 GA. We do not plan beyond 1.3.

2. **Completed Milestones** (collapsed, same as current)
   - v1.0, v1.1, v1.2, v1.2.1 — all shipped

3. **v1.3 Milestone Iterations** — Use the structure from RESEARCH.md Section 3:

   **1.3-M1: Foundation and Infrastructure Refactor**
   - Directory restructure to 6-subsystem architecture (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)
   - MENH-06/07 (transport flexibility, model selection)
   - MGMT-01 (dependency management)
   - MGMT-08 (jailbreak protection)
   - MGMT-11 (SQLite session index)
   - Goal: Infrastructure ready for intelligence layer

   **1.3-M2: Core Intelligence**
   - CORTEX-01 (Inner Voice basic — 7 PRIMARY theories, hybrid architecture)
   - CORTEX-02 (Dual-path routing — deterministic sublimation threshold)
   - CORTEX-03 (Cost monitoring)
   - MGMT-05 (Hooks as primary behavior mechanism)
   - MGMT-10 (Modular injection control)
   - Goal: Inner Voice operational, replacing Haiku curation

   **1.3-M3: Management and Visibility**
   - MGMT-02 (On-demand modules)
   - MGMT-03 (Skill inference)
   - UI-08 (Inline visibility)
   - MGMT-09 (Human cognition patterns — absorbed by Inner Voice)
   - Goal: System is self-managing and visible

   **1.3-M4: Advanced Intelligence**
   - CORTEX-04 (Inner Voice advanced — 5 SECONDARY theories, narrative briefings, relationship modeling)
   - CORTEX-05 (Enhanced Construction — observation synthesis, consolidation)
   - CORTEX-06 (IV persistence advanced — graph-backed, IV memory schema)
   - MENH-08 (Local embeddings)
   - MGMT-06/07 (Global/project preferences)
   - Goal: Inner Voice at full capability with metacognitive self-correction

   **1.3-M5: Platform Expansion**
   - MENH-03 (Memory synthesis/export)
   - MENH-04 (Memory inference)
   - MENH-05 (Flat file support)
   - CORTEX-07 (Agent coordination)
   - CORTEX-08 (Access Agent basic — codebase indexer)
   - CORTEX-09 (Connector framework)
   - Goal: Platform supports external data sources and agent coordination

   **1.3-M6: Dashboard and UI**
   - UI-01 through UI-06 (Dashboard suite)
   - MGMT-04 (TweakCC)
   - Goal: Visual interface for memory system

   **1.3-M7: Advanced Capabilities**
   - CORTEX-10 (Multi-agent deliberation)
   - CORTEX-11 (Domain agent framework)
   - Goal: Multi-agent reasoning and Claudia-aware extensibility

4. **Requirement Index** — Full table with updated milestone column (1.3-M1 through 1.3-M7)
   - Use the NEW subsystem names consistently (Ledger=construction, Assay=access, Terminus=infrastructure, Reverie=Inner Voice, Switchboard=dispatcher/ops)
   - Update CORTEX-01 description to include hybrid architecture and surviving Synthesis v2 concepts
   - Mark absorbed requirements clearly

5. **Deferred Items** — Listed at end with NO assigned target version:
   - UI-07 (Desktop/mobile) — deferred, requires web dashboard as foundation
   - Any items the user decides to defer (default assumption per CONTEXT.md: everything folds in, user decides what to defer)

6. **Guiding Principles** — Updated from current, incorporating:
   - All existing principles
   - New: "Hybrid architecture for cost optimization" (CJS hooks + subagents)
   - New: "Six-subsystem boundary integrity" (respect read/write/transport/dispatch/cognition/system boundaries)
   - Use new subsystem names throughout

**CRITICAL CONSTRAINTS:**
- v1.3 is the ONLY planned version. No v1.4, v1.5, v2.0 sections.
- Items previously in v1.4/v1.5/v2.0 are folded into 1.3-M* milestones per the research analysis.
- The user decides what (if anything) gets deferred — default is everything folds in.
- All ~40 active requirement IDs must appear either in a 1.3-M* milestone or in the deferred section.
- New subsystem names used consistently (no "Cortex" or "Ledger Cortex" — those are deprecated).
  </action>
  <verify>
    <automated>grep -c "1.3-M1" MASTER-ROADMAP.md | grep -qv "^0$" && grep -c "1.3-M7" MASTER-ROADMAP.md | grep -qv "^0$" && ! grep -q "### v1.4" MASTER-ROADMAP.md && ! grep -q "### v1.5" MASTER-ROADMAP.md && ! grep -q "### v2.0" MASTER-ROADMAP.md && echo "PASS: Roadmap uses M1-M7 with no v1.4/v1.5/v2.0 sections" || echo "FAIL: Roadmap structure incorrect"</automated>
  </verify>
  <done>MASTER-ROADMAP.md is fully rewritten with 1.3-M1 through 1.3-M7 milestone structure, all ~40 active requirements assigned, deferred items at end, new subsystem names used consistently, no v1.4/v1.5/v2.0 sections.</done>
</task>

<task type="auto">
  <name>Task 2: Update GSD Planning Files</name>
  <files>.planning/PROJECT.md, .planning/STATE.md</files>
  <action>
Update the GSD planning files to reflect the new 6-subsystem architecture.

**PROJECT.md updates:**
1. Read the current `.planning/PROJECT.md` first.
2. Update the architecture section to reflect the 6-subsystem model:
   - Dynamo (system wrapper), Switchboard (dispatcher/ops), Ledger (data construction), Assay (data access), Terminus (data infrastructure), Reverie (Inner Voice)
3. Add the target directory structure from PROJECT-UPDATE.md conceptual tree.
4. Update the subsystem description table — replace the current 3-subsystem (Dynamo/Ledger/Switchboard) model with 6-subsystem model.
5. Add decisions from this task:
   - [260319-fzc]: Six-subsystem architecture (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)
   - [260319-fzc]: v1.3 milestoned delivery (1.3-M1 through 1.3-M7)
   - [260319-fzc]: Hybrid architecture for Reverie (CJS hooks + custom subagent)
   - [260319-fzc]: Platform adapter pattern (cc/ directory isolates Claude Code specifics)
   - [260319-fzc]: Abstract Inner Voice concept doc separated from platform spec
6. Update constraints to include: Claude Code (Max subscription) as platform, minimize additional API dependence.
7. Update the "Current Focus" to reference v1.3 milestoned delivery.

**STATE.md updates:**
1. Read current `.planning/STATE.md`.
2. Add this quick task to the "Quick Tasks Completed" table:
   - `260319-fzc | Housekeeping, clarification, and Inner Voice & Dynamo Architecture | 2026-03-19 | [commit] | | [link]`
3. Update "Current Position" to reflect that architecture docs are complete and next step is implementation planning.
4. Add key decisions to the Decisions section:
   - [260319-fzc]: Six-subsystem architecture replacing three-subsystem model
   - [260319-fzc]: v1.3 milestoned delivery (1.3-M1 through M7), no planning beyond 1.3
   - [260319-fzc]: Hybrid Reverie architecture (CJS command hooks + custom subagent)
5. Update "Current focus" line in Project Reference section.
  </action>
  <verify>
    <automated>grep -c "Assay" .planning/PROJECT.md | grep -qv "^0$" && grep -c "Terminus" .planning/PROJECT.md | grep -qv "^0$" && grep -c "Reverie" .planning/PROJECT.md | grep -qv "^0$" && grep -c "260319-fzc" .planning/STATE.md | grep -qv "^0$" && echo "PASS: Planning files updated with new subsystems" || echo "FAIL: Missing new subsystem references"</automated>
  </verify>
  <done>PROJECT.md reflects the 6-subsystem architecture with target directory structure, new decisions, and updated constraints. STATE.md includes this task in completed quick tasks and records key architectural decisions.</done>
</task>

</tasks>

<verification>
- MASTER-ROADMAP.md uses only 1.3-M* milestone numbering
- All ~40 active requirements are accounted for (in milestones or deferred)
- No v1.4/v1.5/v2.0 sections exist
- New subsystem names used consistently in all three files
- PROJECT.md reflects 6-subsystem architecture
- STATE.md records this task and its decisions
</verification>

<success_criteria>
The roadmap is refactored to a single v1.3 with milestoned iterations. Planning files reflect the new architecture. All documents are consistent in naming and structure.
</success_criteria>

<output>
After completion, create `.planning/quick/260319-fzc-housekeeping-clarification-and-inner-voi/260319-fzc-05-SUMMARY.md`
</output>

</plan>

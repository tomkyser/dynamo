# Quick Task 260319-fzc: Housekeeping, clarification, and Inner Voice & Dynamo Architecture — Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Task Boundary

Research, spec docs, PRD generation, and roadmap refactor for Dynamo's architecture evolution. Includes abstract Inner Voice doc, unified Reverie spec, updated Dynamo PRD, subsystem spec docs (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie), GSD planning file updates, and master roadmap restructuring.

Reference: .planning/PROJECT-UPDATE.md (source of truth for objectives)

</domain>

<decisions>
## Implementation Decisions

### Document Depth
- Full specification-level documents with schemas, code examples, interface definitions, and rationale (INNER-VOICE-SPEC.md level of detail)
- Abstract Inner Voice doc is conceptual (platform/provider agnostic) but still detailed
- PRD is strategic but comprehensive
- Subsystem specs are detailed technical documents

### Roadmap Restructuring Model
- v1.3 becomes the target — milestones within are numbered iterations (1.3-M1, 1.3-M2...) building toward 1.3 GA release
- v1.4, v1.5, and v2.0 items are generally folded INTO 1.3 as milestone iterations, NOT deferred
- User decides what (if anything) gets deferred — default assumption is everything folds in
- Deferred items listed at end of doc with no assigned target version
- We do NOT plan beyond 1.3

### New Subsystem Boundaries (Renaming + Splitting)
- **Ledger** remains but narrows to Data Construction Layer
- **Assay** is new — Data Access Layer split from what was in Ledger (queries, search, retrieval)
- **Terminus** is new — Data Infrastructure Layer split from Ledger/Switchboard (storage, graph DB, migrations, health)
- **Reverie** is the Inner Voice subsystem (rebranded from "Inner Voice" / "Cortex" naming)
- **Switchboard** stays as Dispatcher, hooks, internal I/O, events
- **Dynamo** stays as overall system wrapper (interface, utilities, API, MCP server, skills, shared resources)

### Claude's Discretion
- Research depth for Reverie spec (one more round with adversarial steel man) — will calibrate based on what's already established in INNER-VOICE-SYNTHESIS-RESEARCH.md
- Document ordering and dependency chain between the deliverables
- Level of GSD file updates needed to reflect the new architecture
- How to handle the Claude Code exclusivity constraint (minimize direct API dependence, use CC native features like agents/subagents/hooks/skills as the platform)

</decisions>

<specifics>
## Specific Ideas

- Reference GSD plugin (https://github.com/gsd-build/get-shit-done) for inspiration on Claude Code feature usage patterns
- The conceptual tree from PROJECT-UPDATE.md defines the target directory structure
- API-based LLM calls limited to underlying infrastructure only (Graphiti, embeddings) — goal is minimal additional API dependence
- Claude Code (Max subscription) is the platform — subagent-based processing preferred over direct API calls
- New requirement names: Assay, Terminus, Reverie must be reflected consistently across all docs

</specifics>

<canonical_refs>
## Canonical References

- .planning/PROJECT-UPDATE.md — Task definition and objectives (source of truth)
- .planning/research/INNER-VOICE-SYNTHESIS-RESEARCH.md — Latest research and steel-man analysis
- .planning/research/INNER-VOICE-SYNTHESIS-v2.md — Previous synthesis
- .planning/research/INNER-VOICE-SPEC.md — Current mechanical specification
- MASTER-ROADMAP.md — Current roadmap to be refactored
- .planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md — Draft roadmap
- .planning/research/LEDGER-CORTEX-ANALYSIS.md — Component analysis
- .planning/research/LEDGER-CORTEX-BRIEF.md — Strategic context
- README.md — Current project readme

</canonical_refs>

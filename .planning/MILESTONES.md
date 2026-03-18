# Milestones

## v1.2.1 Stabilization and Polish (Scoping)

**Status:** Scoped, not yet started
**Requirements:** 10 (STAB-01 through STAB-10)
**Dependencies:** v1.2 (CJS substrate complete, feature parity achieved)

**Goal:** Close the gaps between v1.2's CJS rewrite and v1.3's intelligence work. The foundation is solid but public-facing artifacts (README, repo identity, docs) and operational concerns (update system, legacy cleanup, CLAUDE.md integration, toggles) were not addressed in v1.2. This milestone ensures Dynamo is properly branded, fully documented, easy to update, that the architecture is captured for continuity, and that dev toggles exist for safe development.

**Requirements:**
- STAB-01: README and rebranding pass
- STAB-02: Archive legacy Python/Bash system
- STAB-03: Exhaustive documentation
- STAB-04: Dynamo CLI integration in CLAUDE.md
- STAB-05: Update/upgrade system
- STAB-06: Architecture and design decision capture
- STAB-07: Fix Neo4j admin browser connectivity
- STAB-08: Directory structure refactor
- STAB-09: Component scope refactor
- STAB-10: Global on/off and dev mode toggles

---

## v1.2 Dynamo Foundation (Shipped: 2026-03-18)

**Phases completed:** 4 phases, 12 plans
**Commits:** 29 feat/test | **Production LOC:** 3,585 CJS | **Test LOC:** 3,382 CJS
**Timeline:** 2026-03-17 to 2026-03-18

**Key accomplishments:**
- Rewrote entire Python/Bash foundation to Node/CJS architecture with 272 passing tests
- Built CJS shared substrate (core.cjs) with config loading, MCP client, scope validation, health guard
- Migrated all 5 hook handlers to CJS dispatcher with full behavioral parity to Python/Bash system
- Created unified CLI router (dynamo.cjs) dispatching 12 commands across Ledger and Switchboard
- Built installer with settings.json merge, Python retirement to graphiti-legacy/, and rollback capability
- Produced Master Roadmap assigning 26 deferred requirements to v1.3-v2.0 milestones

---

## v1.1 Fix Memory System (Shipped: 2026-03-17)

**Phases completed:** 4 phases, 8 plans
**Commits:** 34 | **Files changed:** 44 | **Lines:** +7,579
**Timeline:** 2026-03-16 to 2026-03-17

**Key accomplishments:**
- Diagnosed root causes: server-level GRAPHITI_GROUP_ID override forcing all writes to global scope; API v1.21.0 echoing requested group_id but storing differently
- Fixed hook reliability: rewrote all 3 write hooks with foreground execution, error propagation, file logging, and 5s timeout
- Built session management: 6 new subcommands (list, view, label, backfill, index, generate-name) with two-phase auto-naming via Haiku
- Created verification tools: verify-memory quick pass/fail (6 checks), diagnose.py extended to 13 stages, health-check.py for pipeline monitoring
- Published and synced: sync-graphiti.sh for bidirectional sync, updated installer, README for GitHub visitors

---

## v1.0 Research and Ranked Report (Shipped: 2026-03-17)

**Phases completed:** 3 phases, 8 plans
**Timeline:** 2026-03-16 to 2026-03-17

**Key accomplishments:**
- Established vetting protocol with 4 binary hard gates and anti-features list
- Assessed 5 named MCP/tool candidates plus creative and technical writing tools
- Documented GSD framework lifecycle and global scope coexistence strategy
- Researched memory browsing, session visibility, and identified Graphiti hook gaps
- Produced ranked report with 5 primary + 2 conditional tool recommendations

---

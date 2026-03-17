# Requirements: Claude Code Global Setup Enhancers

**Defined:** 2025-03-16
**Core Value:** Every recommended tool must be self-manageable by Claude Code without manual user config file edits

## v1.0 Requirements (Complete)

All v1.0 requirements shipped. See MILESTONES.md for details.

- [x] **DOCS-01**: Context7 MCP assessment
- [x] **DOCS-02**: WPCS Skill assessment
- [x] **DEVT-01**: GitHub MCP assessment
- [x] **DEVT-02**: Playwright MCP assessment
- [x] **DEVT-03**: Sequential Thinking MCP assessment
- [x] **WRIT-01**: Creative writing tools research
- [x] **WRIT-02**: Technical writing tools research
- [x] **GMGR-01**: GSD self-management lifecycle
- [x] **GMGR-02**: Coexistence strategy
- [x] **MEMO-01**: Memory browsing interface research
- [x] **MEMO-02**: Session management visibility research
- [x] **MEMO-03**: Hook gap analysis
- [x] **INFR-01**: Vetting protocol
- [x] **INFR-02**: Anti-features list
- [x] **INFR-03**: Self-management lifecycle per tool
- [x] **DLVR-01**: Ranked report
- [x] **DLVR-02**: Context cost estimates
- [x] **DLVR-03**: Security assessments

## v1.1 Requirements

Requirements for Fix Memory System milestone. Each maps to roadmap phases.

### Diagnostics

- [x] **DIAG-01**: Root cause identified for why hooks display success but fail to persist data to Graphiti
- [x] **DIAG-02**: Root cause identified for why project-scoped memories are not stored
- [x] **DIAG-03**: Reusable health check command verifies the full memory pipeline (hooks -> graphiti-helper.py -> Graphiti API -> Neo4j)

### Hook Reliability

- [ ] **HOOK-01**: Hooks persist data to Graphiti or visibly fail — no silent phantom writes
- [ ] **HOOK-02**: Hook failures produce visible error output the user can see
- [ ] **HOOK-03**: Hook-level logging captures errors for post-mortem debugging

### Session Management

- [ ] **SESS-01**: User can list all sessions chronologically via Claude Code
- [ ] **SESS-02**: User can select and view a specific session's content
- [ ] **SESS-03**: User can manually rename/label a session
- [ ] **SESS-04**: Sessions auto-generate meaningful names (not raw timestamps)

### Verification

- [ ] **VRFY-01**: Memory system proven working end-to-end across sessions and projects
- [ ] **VRFY-02**: Reusable verification mechanism confirms the system is healthy on demand

### Sync

- [ ] **SYNC-01**: All memory system fixes reflected in this repo's publishable artifacts
- [ ] **SYNC-02**: Automated or semi-automated mechanism to sync between live ~/.claude implementation and this repo

## Future Requirements

Identified in v1.0 research (MEMO-03 Hook Gaps), deferred beyond v1.1:

### Hook Enhancements

- **HKENH-01**: Bash tool error capture (PostToolUse hook with exit_code != 0 filtering)
- **HKENH-02**: Semantic diff summaries on file changes (richer than path-only capture)
- **HKENH-03**: Active task state injected at SessionStart
- **HKENH-04**: Targeted unresolved-questions capture at PreCompact
- **HKENH-05**: Cross-scope promotion (project preferences -> global when project-agnostic)

### Memory Quality

- **MQUAL-01**: Context quality feedback loop (track retrieval frequency for pruning)
- **MQUAL-02**: Re-evaluate mcp-neo4j-cypher when stars >= 1,000

### Web Research & Scraping

- **WEBS-01**: Evaluate Brave Search MCP after v1 tools are in use
- **WEBS-02**: Evaluate Firecrawl MCP after v1 tools are in use

### WordPress-Specific

- **WPRD-01**: Evaluate WordPress MCP Adapter after WP 7.0 core integration (April 2026)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Memory system redesign | Fix first, redesign later — diagnostic-first milestone |
| New MCP tools for memory | Use existing Graphiti MCP tools; no new memory tool installs |
| Real-time chat/notification for errors | Visible error output in Claude Code session is sufficient |
| TodoWrite capture hook | Requires empirical testing of CC hook API; deferred to future |
| Creative writing tools | Flagged in v1.0 research; separate concern from memory system |
| Per-project tool configuration | Everything lives in global scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DIAG-01 | Phase 4 | Complete |
| DIAG-02 | Phase 4 | Complete |
| DIAG-03 | Phase 4 | Complete |
| HOOK-01 | Phase 5 | Pending |
| HOOK-02 | Phase 5 | Pending |
| HOOK-03 | Phase 5 | Pending |
| SESS-01 | Phase 6 | Pending |
| SESS-02 | Phase 6 | Pending |
| SESS-03 | Phase 6 | Pending |
| SESS-04 | Phase 6 | Pending |
| VRFY-01 | Phase 7 | Pending |
| VRFY-02 | Phase 7 | Pending |
| SYNC-01 | Phase 7 | Pending |
| SYNC-02 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2025-03-16*
*Last updated: 2026-03-16 after v1.1 roadmap creation*

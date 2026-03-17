# Roadmap: Claude Code Global Setup Enhancers

## Milestones

- ✅ **v1.0 Research and Ranked Report** - Phases 1-3 (shipped 2026-03-17)
- 🚧 **v1.1 Fix Memory System** - Phases 4-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Research and Ranked Report (Phases 1-3) — SHIPPED 2026-03-17</summary>

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Methodology** - Establish vetting criteria and anti-features list before evaluating any tool
- [x] **Phase 2: Research** - Produce individual assessments of all candidate tools and document existing setup
- [x] **Phase 3: Synthesis** - Compile findings into ranked report with full self-management lifecycle documentation (completed 2026-03-17)

### Phase 1: Methodology
**Goal**: The vetting criteria and anti-features list exist, so every subsequent tool assessment applies consistent, documented standards
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02
**Success Criteria** (what must be TRUE):
  1. A documented vetting protocol exists with programmatic criteria: GitHub stars threshold, commit recency window (30 days), security check procedure, self-management capability test
  2. An anti-features list exists naming every disqualified tool category with explicit reasoning for each exclusion
  3. Any tool assessment produced in Phase 2 can be evaluated by applying only Phase 1 criteria, with no judgment calls required
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Write vetting protocol (decision-tree gates, scorecard template, tier criteria) and anti-features list (named exclusions, category rules)

### Phase 2: Research
**Goal**: Individual assessments of all candidate tools exist, plus documentation of the existing setup (GSD, Graphiti, memory system)
**Depends on**: Phase 1
**Requirements**: DOCS-01, DOCS-02, DEVT-01, DEVT-02, DEVT-03, WRIT-01, WRIT-02, GMGR-01, GMGR-02, MEMO-01, MEMO-02, MEMO-03
**Success Criteria** (what must be TRUE):
  1. Each of the five named candidates (Context7, GitHub MCP, Playwright MCP, Sequential Thinking MCP, WPCS Skill) has a written assessment covering GitHub activity, stars, self-management capability, install method, and context cost
  2. Writing tools research exists — at least one vetted candidate in each category (creative writing, technical writing) or a documented finding that no viable candidates exist
  3. GSD framework self-management lifecycle is documented (install, update, troubleshoot steps Claude Code can execute without user touching config files)
  4. All three memory system topics are addressed: a browsing interface approach, a session management visibility approach, and identified Graphiti hook gaps
**Plans:** 6/6 plans executed

Plans:
- [x] 02-01-PLAN.md — Assess Context7 MCP, WPCS Skill, and GitHub MCP (named assessments batch A)
- [x] 02-02-PLAN.md — Assess Playwright MCP and Sequential Thinking MCP (named assessments batch B)
- [x] 02-03-PLAN.md — Discover and assess creative and technical writing tools
- [x] 02-04-PLAN.md — Research memory browsing, session visibility, and hook gap analysis
- [x] 02-05-PLAN.md — Document GSD lifecycle runbook and global scope coexistence strategy
- [x] 02-06-PLAN.md — Cross-cutting review of all deliverables for Phase 3 readiness

### Phase 3: Synthesis
**Goal**: A single ranked report exists that gives the user everything needed to make an informed install decision for each candidate
**Depends on**: Phase 2
**Requirements**: INFR-03, DLVR-01, DLVR-02, DLVR-03
**Success Criteria** (what must be TRUE):
  1. A ranked report in markdown lists 5-8 final recommendations with categories, pros/cons, and explicit pass/fail against the Phase 1 vetting criteria
  2. Every recommended tool includes a context cost estimate (token overhead)
  3. Every recommended tool includes a security assessment result (mcp-scan output or equivalent)
  4. Every recommended tool includes a self-management lifecycle section (install, configure, update, troubleshoot commands Claude Code can run)
**Plans:** 1/1 plans complete

Plans:
- [x] 03-01-PLAN.md — Write ranked report with prerequisites, 5 primary + 2 conditional tool recommendations, supplementary findings appendix, and cap math summary

</details>

### 🚧 v1.1 Fix Memory System (In Progress)

**Milestone Goal:** The Graphiti memory system works end-to-end — hooks persist data, failures surface visibly, sessions are navigable, and fixes are reflected in the publishable repo.

- [ ] **Phase 4: Diagnostics** - Map the exact failure point where hooks appear to work but data never reaches Graphiti
- [ ] **Phase 5: Hook Reliability** - Fix hooks so data persists or failures surface visibly — no more silent phantom writes
- [ ] **Phase 6: Session Management** - Make sessions navigable: list, view, label, and auto-name
- [ ] **Phase 7: Verification and Sync** - Prove the system works end-to-end and publish fixes back to this repo

## Phase Details

### Phase 4: Diagnostics
**Goal**: The exact failure point in the hook → graphiti-helper.py → Graphiti API → Neo4j pipeline is identified for both silent write failures and missing project-scoped memories
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: DIAG-01, DIAG-02, DIAG-03
**Success Criteria** (what must be TRUE):
  1. User can run a single health check command and see the status of every component in the memory pipeline (hook execution, graphiti-helper.py response, Graphiti API reachability, Neo4j connectivity)
  2. The specific step where hook output disappears — between hook invocation and Neo4j write — is documented with evidence (log output, error messages, or traced call)
  3. The reason project-scoped memories are not stored (wrong group_id format, missing parameter, API error swallowed) is identified and documented
**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — Build diagnostic probe script testing 10 pipeline stages independently; run probes and document root causes for silent write failures (DIAG-01) and missing project-scoped memories (DIAG-02)
- [ ] 04-02-PLAN.md — Build reusable health check command with stage-by-stage pipeline status and canary write/read round-trip (DIAG-03); user verification of all findings

### Phase 5: Hook Reliability
**Goal**: Hooks either persist data to Graphiti successfully or produce visible error output — no operation can silently fail
**Depends on**: Phase 4
**Requirements**: HOOK-01, HOOK-02, HOOK-03
**Success Criteria** (what must be TRUE):
  1. User can trigger a hook and observe either a confirmation that data was written or an explicit error message in the Claude Code session
  2. A log file captures hook errors with enough detail (timestamp, hook name, error type) to diagnose failures after the fact
  3. Running the Phase 4 health check after a hook fires shows data actually present in Neo4j, not just a success status message
**Plans**: TBD

Plans:
- [ ] 05-01: Apply fixes to hook scripts — add error propagation, visible failure output, and file-based logging; validate against Phase 4 failure points

### Phase 6: Session Management
**Goal**: The user can browse, view, label, and auto-name sessions through Claude Code without touching raw Neo4j or config files
**Depends on**: Phase 5
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04
**Success Criteria** (what must be TRUE):
  1. User can ask Claude Code to list all sessions and receive a chronological list with identifiers
  2. User can ask Claude Code to show the content of a specific session and receive the stored episodes
  3. User can assign a human-readable label to a session and retrieve it by that label later
  4. Sessions created after this phase are auto-named with a meaningful description rather than a raw timestamp
**Plans**: TBD

Plans:
- [ ] 06-01: Implement session listing and viewing via Graphiti MCP tools; implement session labeling and auto-naming

### Phase 7: Verification and Sync
**Goal**: The memory system is proven working across sessions and projects, and all fixes are reflected in this repo's publishable artifacts
**Depends on**: Phase 6
**Requirements**: VRFY-01, VRFY-02, SYNC-01, SYNC-02
**Success Criteria** (what must be TRUE):
  1. User can store a memory in one session, start a new session, and retrieve that memory — verified with actual evidence (Graphiti output), not status messages
  2. User can run the verification mechanism on demand and receive a clear pass/fail result for the full memory system
  3. All hook scripts, helper files, and configuration changes from Phases 4-6 are present in this repo and match the live ~/.claude implementation
  4. A sync procedure exists so future changes to ~/.claude/graphiti/ can be reflected in this repo without manual file-by-file copying
**Plans**: TBD

Plans:
- [ ] 07-01: End-to-end verification across sessions and projects; create reusable verification mechanism
- [ ] 07-02: Sync live ~/.claude implementation to repo; document or automate future sync procedure

## Progress

**Execution Order:**
Phases execute in numeric order: 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Methodology | v1.0 | 1/1 | Complete | 2026-03-16 |
| 2. Research | v1.0 | 6/6 | Complete | 2026-03-16 |
| 3. Synthesis | v1.0 | 1/1 | Complete | 2026-03-17 |
| 4. Diagnostics | v1.1 | 0/2 | Not started | - |
| 5. Hook Reliability | v1.1 | 0/1 | Not started | - |
| 6. Session Management | v1.1 | 0/1 | Not started | - |
| 7. Verification and Sync | v1.1 | 0/2 | Not started | - |

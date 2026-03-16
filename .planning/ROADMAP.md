# Roadmap: Claude Code Global Setup Enhancers

## Overview

This research project moves in three phases: establish the vetting methodology before evaluating any tools, conduct all tool research and documentation in parallel, then synthesize findings into a lean final report. The constraint is a hard cap of 5-8 total global additions — every tool must earn its spot against objective criteria, not ecosystem hype.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Methodology** - Establish vetting criteria and anti-features list before evaluating any tool
- [ ] **Phase 2: Research** - Produce individual assessments of all candidate tools and document existing setup
- [ ] **Phase 3: Synthesis** - Compile findings into ranked report with full self-management lifecycle documentation

## Phase Details

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
**Plans:** 5/6 plans executed

Plans:
- [ ] 02-01-PLAN.md — Assess Context7 MCP, WPCS Skill, and GitHub MCP (named assessments batch A)
- [ ] 02-02-PLAN.md — Assess Playwright MCP and Sequential Thinking MCP (named assessments batch B)
- [ ] 02-03-PLAN.md — Discover and assess creative and technical writing tools
- [ ] 02-04-PLAN.md — Research memory browsing, session visibility, and hook gap analysis
- [ ] 02-05-PLAN.md — Document GSD lifecycle runbook and global scope coexistence strategy
- [ ] 02-06-PLAN.md — Cross-cutting review of all deliverables for Phase 3 readiness

### Phase 3: Synthesis
**Goal**: A single ranked report exists that gives the user everything needed to make an informed install decision for each candidate
**Depends on**: Phase 2
**Requirements**: INFR-03, DLVR-01, DLVR-02, DLVR-03
**Success Criteria** (what must be TRUE):
  1. A ranked report in markdown lists 5-8 final recommendations with categories, pros/cons, and explicit pass/fail against the Phase 1 vetting criteria
  2. Every recommended tool includes a context cost estimate (token overhead)
  3. Every recommended tool includes a security assessment result (mcp-scan output or equivalent)
  4. Every recommended tool includes a self-management lifecycle section (install, configure, update, troubleshoot commands Claude Code can run)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Methodology | 1/1 | Complete | 2026-03-16 |
| 2. Research | 5/6 | In Progress|  |
| 3. Synthesis | 0/TBD | Not started | - |

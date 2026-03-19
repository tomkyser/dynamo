---
phase: 260319-fzc
plan: "04"
subsystem: Reverie (Inner Voice)
tags: [specification, inner-voice, reverie, hybrid-architecture, cognitive-processing]
dependency_graph:
  requires:
    - INNER-VOICE-ABSTRACT.md
    - DYNAMO-PRD.md
    - TERMINUS-SPEC.md
    - SWITCHBOARD-SPEC.md
    - LEDGER-SPEC.md
    - ASSAY-SPEC.md
  provides:
    - REVERIE-SPEC.md
  affects:
    - MASTER-ROADMAP.md (requirement text updates needed)
    - INNER-VOICE-SPEC.md (superseded by REVERIE-SPEC.md for architecture reference)
tech_stack:
  patterns:
    - "Hybrid architecture: CJS command hooks + custom subagent"
    - "State bridge pattern: SubagentStop writes file, UserPromptSubmit reads"
    - "Composite sublimation threshold: 5-factor deterministic scoring"
    - "REM consolidation: Tier 1 (PreCompact) + Tier 3 (Stop)"
    - "Feature flag rollback: reverie.mode = classic|cortex"
key_files:
  created:
    - .planning/research/REVERIE-SPEC.md
decisions:
  - "Reverie reads through Assay and writes through Ledger -- never directly through Terminus for standard operations"
  - "Hot path targets <500ms with zero LLM calls when cached data available"
  - "Deliberation path uses custom subagent for subscription, direct API for API plan"
  - "State bridge pattern for SubagentStop-to-parent context gap (file-based, one-turn delay)"
  - "PostToolUse dispatched to BOTH Ledger (capture) and Reverie (activation update)"
  - "Feature flag (reverie.mode) enables instant rollback to classic Haiku curation"
  - "Subscription users pay $0.37/day (cheaper than current baseline) due to subagent inclusion"
metrics:
  duration: "8m 8s"
  completed: "2026-03-19T17:18:15Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 260319-fzc Plan 04: Reverie (Inner Voice) Subsystem Spec Summary

**One-liner:** Hybrid CJS+subagent Inner Voice spec with 5 processing pipelines, composite sublimation threshold, and dual cost model ($0.37/day subscription, $1.98/day API)

## What Was Done

### Task 1: Write Reverie Specification

Created REVERIE-SPEC.md (1,462 lines) as the most detailed subsystem specification in the suite. The document applies the platform-agnostic Inner Voice concept (INNER-VOICE-ABSTRACT.md) to Dynamo's concrete Claude Code architecture.

**Key sections delivered:**

1. **Executive Summary** -- Reverie as the cognitive processing engine replacing Haiku curation
2. **Responsibilities and Boundaries** -- complete ownership map with Assay/Ledger interface pattern
3. **Architecture** -- module structure, dependency graph, configuration surface, state management
4. **The Hybrid Architecture** -- CJS command hooks for hot path + custom subagent for deliberation, including the state bridge pattern, API plan fallback, and rate limit degradation
5. **Processing Pipelines Per Hook** -- all 5 hooks (UserPromptSubmit, SessionStart, Stop, PreCompact, PostToolUse) with step-by-step timing budgets
6. **Sublimation Threshold Mechanism** -- 5-factor composite formula with factor definitions and key properties
7. **State Management Deep Dive** -- operational state schema, deliberation result bridge, IV memory (v1.4), persistence guarantees, processing flag pattern
8. **Custom Subagent Definition** -- full YAML frontmatter + system prompt for inner-voice.md, SubagentStart and SubagentStop hook handlers with code examples
9. **Surviving Synthesis v2 Concepts** -- integration of concepts 1 (Frame-First), 4 (IV Memory), 5 (REM), 7 (Hybrid Subagent) with v1.3/v1.4 boundary assignments
10. **Cost Model** -- daily projections for both API and subscription billing models
11. **Migration Path** -- files moving to Reverie, new files created, breaking changes, feature flag
12. **Adversarial Analysis** -- 7 failure modes with mitigations, "confidently wrong" special treatment, CC platform constraints, subsystem boundary risks
13. **Open Questions** -- embedding model, subagent spawn trigger, graph density bootstrapping, evaluation metrics, prompt engineering quality

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- REVERIE-SPEC.md references INNER-VOICE-ABSTRACT.md as conceptual foundation (6 references)
- REVERIE-SPEC.md references Assay (26), Ledger (30), Terminus (9) interfaces
- Hybrid architecture (CJS hooks + custom subagent) fully defined with code examples
- All 5 hook processing pipelines specified with timing budgets
- State schemas include both operational (v1.3) and IV memory (v1.4)
- Cost projections for both subscription and API billing models included
- Adversarial analysis covers 7 failure modes and CC platform constraints

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: REVERIE-SPEC.md | f5d0287 | Reverie (Inner Voice) subsystem specification |

## Self-Check: PASSED

- [x] `.planning/research/REVERIE-SPEC.md` exists (1,462 lines)
- [x] Commit f5d0287 exists and contains the spec
- [x] All verification checks pass (hybrid architecture, CC mechanisms, migration path)

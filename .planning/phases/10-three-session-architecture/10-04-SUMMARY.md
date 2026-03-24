---
phase: 10-three-session-architecture
plan: 04
subsystem: session
tags: [mind-cycle, wire-topology, ack-protocol, cognitive-pipeline, formation, recall, sublimation]

# Dependency graph
requires:
  - phase: 10-01
    provides: SESSION_IDENTITIES, TOPOLOGY_RULES, DEFAULT_SESSION_CONFIG constants for topology validation
  - phase: 10-02
    provides: Sublimation loop config (getCycleConfig, sensitivity_threshold) and referential framing templates
  - phase: 09
    provides: Formation pipeline (prepareStimulus, processFormationOutput) and recall engine (recallPassive, recallExplicit)
  - phase: 03.1-wire
    provides: Wire service (send, subscribe, register), protocol (MESSAGE_TYPES, URGENCY_LEVELS)
provides:
  - createMindCycle factory for Secondary session cognitive processing cycle
  - processTurn pipeline (attention -> formation -> recall -> directive generation)
  - processSublimation for Tertiary candidate evaluation with sensitivity filtering and intake cap
  - composeFacePrompt with template composer delegation and referential framing
  - createWireTopology factory for topology-validated Wire communication
  - validateRoute enforcing hub-spoke Primary<->Secondary<->Tertiary rules
  - sendWithAck for reliable delivery of critical messages with timeout-based resend
  - subscribe with topology filtering on incoming messages
affects: [10-05-session-manager, 11-rem-consolidation, 12-backfill-formation]

# Tech tracking
tech-stack:
  added: []
  patterns: [mind-cognitive-cycle, wire-topology-enforcement, ack-protocol-reliable-delivery, recall-keyword-detection]

key-files:
  created:
    - modules/reverie/components/session/mind-cycle.cjs
    - modules/reverie/components/session/__tests__/mind-cycle.test.js
    - modules/reverie/components/session/wire-topology.cjs
    - modules/reverie/components/session/__tests__/wire-topology.test.js
  modified: []

key-decisions:
  - "Mind cognitive cycle uses formationPipeline.prepareStimulus for attention worthiness check -- empty user_prompt in stimulus indicates below-threshold"
  - "RECALL_KEYWORDS regex triggers explicit recall path alongside passive recall for keywords like remember, recall, what did, last time"
  - "Wire topology subscribe takes both sessionId and subscriberIdentity for topology-aware filtering"
  - "ACK protocol uses _pendingAcks Map with timer-based timeout and Promise resolution for async ACK wait"
  - "Behavioral directives in processTurn set to null -- Phase 11 conditioning replaces static defaults"

patterns-established:
  - "Mind cycle as frozen orchestrator: processTurn/processSublimation/composeFacePrompt/getState/drainSublimations"
  - "Wire topology wrapper: validateRoute before send, _handleIncomingAck for ACK resolution, subscribe with topology filtering"
  - "ACK-required determination: type in ACK_REQUIRED_TYPES AND urgency in ACK_REQUIRED_URGENCIES"
  - "Sublimation queue with drainSublimations pattern for batch processing by formation pipeline"

requirements-completed: [SES-02, SES-04]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 10 Plan 04: Mind Cycle + Wire Topology Summary

**Secondary session cognitive cycle (attention/formation/recall/directives) with Wire topology enforcement and ACK protocol for reliable critical message delivery**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T22:11:34Z
- **Completed:** 2026-03-24T22:16:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Mind cognitive cycle orchestrates full D-04 pipeline: attention check, formation triggering, passive/explicit recall, face prompt composition with referential framing, sublimation evaluation with configurable intake cap
- Wire topology enforces strict hub-spoke routing (Primary<->Secondary<->Tertiary) with TOPOLOGY_VIOLATION errors for forbidden routes
- ACK protocol provides reliable delivery for context-injection/directive messages at urgent/directive urgency with timeout-based resend via relay fallback
- 38 tests passing across both modules, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Mind cognitive cycle orchestrator** - `d405bde` (test) + `abd6c47` (feat) [TDD]
2. **Task 2: Wire topology enforcement + ACK protocol** - `37e3ae3` (test) + `4123725` (feat) [TDD]

_Note: Both tasks used TDD with separate RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `modules/reverie/components/session/mind-cycle.cjs` - Secondary cognitive cycle: processTurn, processSublimation, composeFacePrompt, getState, drainSublimations
- `modules/reverie/components/session/__tests__/mind-cycle.test.js` - 19 tests for mind cycle pipeline
- `modules/reverie/components/session/wire-topology.cjs` - Topology validation, ACK protocol, topology-filtered subscribe, metrics
- `modules/reverie/components/session/__tests__/wire-topology.test.js` - 19 tests for topology enforcement and ACK

## Decisions Made
- Mind uses formationPipeline.prepareStimulus as the attention worthiness check -- an empty user_prompt in the returned stimulus indicates below-threshold (no separate attention gate call needed since prepareStimulus reads Self Model context)
- RECALL_KEYWORDS regex pattern detects explicit recall triggers (`remember`, `recall`, `what did`, `last time`, `we discussed`, `you said`)
- Wire topology subscribe method takes both sessionId (for wire.subscribe) and subscriberIdentity (for TOPOLOGY_RULES lookup) as separate parameters -- this is cleaner than looking up identity from session registry
- ACK protocol stores pending ACKs in a Map with timer-based timeout; the _handleIncomingAck method is exposed on the frozen API for test routing through subscribe
- Behavioral directives in processTurn return null -- Phase 11 conditioning will replace the static defaults from Phase 8

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all exports are fully functional with no placeholder data.

## Next Phase Readiness
- Mind cycle ready for Session Manager (Plan 05) to orchestrate as Secondary's processing center
- Wire topology ready for Session Manager to enforce communication rules at session startup
- drainSublimations pattern ready for formation pipeline consumption in active sessions
- composeFacePrompt ready to replace Phase 8 static behavioral directives when Secondary takes authority
- All 38 tests green across mind-cycle and wire-topology

## Self-Check: PASSED

All 4 created files verified present. All 4 commit hashes verified in git log.

---
*Phase: 10-three-session-architecture*
*Completed: 2026-03-24*

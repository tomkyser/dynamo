# Phase 8: Single-Session Personality Injection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 08-single-session-personality-injection
**Areas discussed:** Face prompt composition, Context budget strategy, Compaction survival, Hook wiring scope

---

## Face Prompt Composition

### Q1: How should the Face prompt be composed from Self Model state?

| Option | Description | Selected |
|--------|-------------|----------|
| Template-driven | Context Manager reads Self Model aspects and fills a structured prompt template with slots for each injection component. Deterministic, testable, fast (<50ms). | ✓ |
| Aspect concatenation | Read markdown body of each aspect file and concatenate with minimal framing. Less structured, faster to build. | |
| You decide | Claude has flexibility during planning. | |

**User's choice:** Template-driven
**Notes:** Previewed the 5-slot template structure (Identity Frame, Relational Context, Attention Directives, Behavioral Directives, Referential Framing).

### Q2: How should the composed Face prompt reach Primary's context?

| Option | Description | Selected |
|--------|-------------|----------|
| State file + hook read | Context Manager writes to well-known file; UserPromptSubmit hook reads synchronously and returns as systemMessage. Same file serves as warm-start cache. | ✓ |
| In-memory via Magnet | Store in Magnet module state. Faster but couples hook to Magnet availability. | |
| Direct composition in hook | Hook itself reads Self Model and composes. No intermediate file. | |

**User's choice:** State file + hook read
**Notes:** Matches the spec's Phase 10 design (Secondary writes, hook reads) -- only the writer changes.

### Q3: When does the Context Manager recompose the Face prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| On SessionStart + on context phase transition | Compose once, recompose on budget phase changes and after compaction. | ✓ |
| Every UserPromptSubmit | Recompose on every turn. Always fresh but burns CPU. | |
| On SessionStart only | Compose once, never update. | |

**User's choice:** On SessionStart + on context phase transition
**Notes:** Between transitions, same file read repeatedly -- no wasted work.

### Q4: For Phase 8 (no Secondary), should the Behavioral Directives slot be empty or seeded?

| Option | Description | Selected |
|--------|-------------|----------|
| Seeded with static defaults | Fill with sensible defaults from Self Model state. Overwritten by Secondary in Phase 10. | ✓ |
| Empty placeholder | Leave explicitly empty with comment marker. | |
| Omit the slot entirely | Don't include in Phase 8 template. | |

**User's choice:** Seeded with static defaults
**Notes:** Ensures full template structure is exercised and testable now.

---

## Context Budget Strategy

### Q1: Should the Self Model injection grow or shrink as context utilization increases?

| Option | Description | Selected |
|--------|-------------|----------|
| Research model: reinforce | Follow PITFALLS research. Injection gets LARGER at high utilization. Compress at 30%, reinforce at 75%+. | ✓ |
| Spec model: compress at high util | Follow spec as written. Full at 0-50%, minimal at 75-90%. | |
| Hybrid: compress then reinforce | Compress early, reinforce when erosion risk is high. | |

**User's choice:** Research model: reinforce
**Notes:** Previewed the 4-phase research-backed budget with specific token targets. Deliberate departure from spec Section 8.5.

### Q2: How should context utilization be estimated?

| Option | Description | Selected |
|--------|-------------|----------|
| Cumulative byte tracking | Track bytes from hook payloads, use bytes-to-tokens heuristic. | ✓ |
| Turn counter + heuristic | Estimate ~2K-5K tokens per turn. | |
| You decide | Claude picks measurement approach. | |

**User's choice:** Cumulative byte tracking
**Notes:** Hooks already receive the payloads needed.

### Q3: Should PostToolUse micro-nudges be part of Phase 8?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include in Phase 8 | Phase 8 is the validation phase -- testing with nudges gives empirical data. Active only in Phase 3 budget. | ✓ |
| Defer to Phase 10 | Keep Phase 8 focused on core mechanism. | |
| Stub only | Wire handler but no-op. | |

**User's choice:** Yes, include in Phase 8
**Notes:** Enables empirical measurement of re-anchoring effectiveness.

---

## Compaction Survival

### Q1: What should PreCompact do in single-session mode?

| Option | Description | Selected |
|--------|-------------|----------|
| Checkpoint + framing injection | Save checkpoint file + inject systemMessage framing how compaction should summarize. | ✓ |
| Framing injection only | Just inject the systemMessage. No checkpoint. | |
| You decide | Claude picks PreCompact behavior. | |

**User's choice:** Checkpoint + framing injection
**Notes:** Previewed checkpoint file contents and systemMessage text.

### Q2: After compaction, should next injection be full regardless of prior budget phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full reinjection | Reset budget to Phase 1. Treat post-compaction as mini-SessionStart. | ✓ |
| Resume at prior budget phase | Stay at whatever phase was active before compaction. | |
| You decide | Claude picks post-compaction strategy. | |

**User's choice:** Yes, full reinjection
**Notes:** Exploits the fact that compaction frees context space. PITFALLS research explicitly recommends this.

---

## Hook Wiring Scope

### Q1: What should hooks with no single-session behavior do?

| Option | Description | Selected |
|--------|-------------|----------|
| Event logging + metrics | All 8 hooks wired with real handlers. Future hooks log events and update context utilization metrics. | ✓ |
| Stub handlers that no-op | Wire all 8 with empty handlers. | |
| Wire only active hooks | Only wire the 5 hooks with Phase 8 behavior. | |

**User's choice:** Event logging + metrics
**Notes:** Every hook contributes to cumulative context estimate.

### Q2: How should the Stop hook handle session end?

| Option | Description | Selected |
|--------|-------------|----------|
| Persist warm-start cache + state snapshot | Write Face prompt to warm-start cache + save session-end state snapshot. | ✓ |
| Warm-start cache only | Just write the Face prompt. | |
| You decide | Claude picks Stop handler behavior. | |

**User's choice:** Persist warm-start cache + state snapshot
**Notes:** In Phase 11, REM processing replaces the simple snapshot.

### Q3: If no warm-start cache exists (first session), what happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Compose from cold-start Self Model | Run cold-start initialization, then compose Face prompt from fresh state. First turn always has personality. | ✓ |
| Inject nothing on first session | Skip injection until Context Manager composes. | |
| You decide | Claude picks first-session behavior. | |

**User's choice:** Compose from cold-start Self Model
**Notes:** Addresses PITFALLS Pitfall 6 (Session Startup Latency). Even sparse-default personality with entropy variance is better than no personality.

---

## Claude's Discretion

- Face prompt template exact wording and format
- Checkpoint file schema details
- Byte-to-token heuristic calibration
- Compaction detection mechanism
- PostToolUse micro-nudge phrasing
- Test harness design for personality persistence measurement

## Deferred Ideas

None -- discussion stayed within phase scope

# Phase 10: Three-Session Architecture - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove that Primary (Face), Secondary (Mind), and Tertiary (Subconscious) sessions can operate concurrently via Wire with acceptable latency and resource consumption on Claude Max — with Passive mode as the fallback if three sessions exceed subscription limits. This phase delivers: Session Manager orchestrating three Claude Code sessions (SES-01, SES-02, SES-03), Wire-based inter-session communication at all urgency levels (SES-04), full session lifecycle (SES-05), Active and Passive operational modes with automatic fallback (OPS-01, OPS-02), and referential framing prompt for Primary context authority (CTX-02). The Mind runs its full cognitive pipeline minus REM. This is the go/no-go gate for the three-session architecture.

</domain>

<decisions>
## Implementation Decisions

### Session Spawning
- **D-01:** Secondary and Tertiary are separate Claude Code sessions spawned via Bun.spawn (e.g., `claude --channel`). They connect to Primary's Wire relay as MCP channel clients. This aligns with the Channels PoC and keeps sessions as full Claude Code instances with LLM capabilities.
- **D-02:** Session Manager lives in Reverie (`modules/reverie/components/session/`). Reverie owns its session topology — Primary/Secondary/Tertiary is a Reverie-specific architecture, not a platform concern. Other modules could define different topologies.
- **D-03:** Three-way responsibility split:
  - **Session Manager** (Reverie) — directs WHAT to spawn, WHAT topology to enforce, WHICH aspect each session runs
  - **Conductor** (platform service) — executes process lifecycle: spawn, health monitor, stop, restart on failure
  - **Wire** (platform service) — handles communication: message routing, topology enforcement, urgency-level delivery, ACK protocol
  - This corrects the roadmap note ("not Conductor") — Conductor IS the spawner, but acts at Reverie's direction, not as the decision-maker about topology.

### Mind Scope in Phase 10
- **D-04:** Full Mind minus REM. Secondary runs the entire cognitive pipeline described in spec §4.3: attention management, fragment formation orchestration, recall via Assay, Self Model authority, directive generation to Primary, sublimation evaluation from Tertiary, subagent delegation. Only REM consolidation (Phase 11) and taxonomy self-organization (Phase 12) are excluded. Maximum validation of the architecture.
- **D-05:** Secondary spawns formation subagents (not inline processing). The Phase 9 intuitive inner voice framing stays but now runs under Mind authority with richer context — full Self Model state, attention pointer, Tertiary sublimations. Matches spec §4.5.
- **D-06:** Dual context feed for Secondary:
  - **Wire** for real-time snapshots — user prompts, tool use summaries, affective signals. Periodic, not every token. Low-latency essential signals.
  - **Lithograph** for depth — full transcript reads when Mind needs complete conversation context for complex processing (formation, recall reconstruction). Higher I/O cost, used selectively.

### Tertiary Sublimation
- **D-07:** Self-prompting loop model. Tertiary's system prompt instructs it to run one sublimation cycle, emit results via Wire, then trigger itself to continue. Each Claude Code "turn" is one cycle. Mind sends state updates (attention pointer, active domains, sensitivity thresholds) via Wire between cycles. The session sustains itself through self-triggering.
- **D-08:** Dynamic sensitivity via Wire directives. Mind sends sublimation sensitivity threshold updates to Tertiary when conversational context shifts. More sublimations bubble up during emotionally charged or associatively rich moments, fewer during routine technical work. Threshold adjusts between cycles.
- **D-09:** Deterministic resonance scoring. Uses the same composite scorer from Phase 9's recall engine — attention tag overlap, entity co-occurrence, temporal clustering, emotional valence matching. No LLM call needed. Fast, cheap, header-only matching per spec §4.4.

### Referential Framing (CTX-02)
- **D-10:** Target is full constraint — Primary defers to Mind directives for ALL decisions (relational, attentional, behavioral, AND technical). The Mind must be technically sophisticated enough to direct execution. However, the implementation MUST support dual-mode (relational-only constraint, technical execution independent) as a calibration lever. If full constraint degrades code quality, dial back to dual-mode without architectural changes.
- **D-11:** Static config file for framing mode initially. Framing intensity (full/dual/soft) set in Reverie config, changed by user via CLI. The Mind operates within the configured mode. Backlog entry for future: Mind-controlled dynamic framing intensity that adjusts per-turn based on conversational context.
- **D-12:** Separate template slot for referential framing in the Face prompt template. Phase 8 D-01 already allocated ~100-200 tokens for a Referential Framing slot (5th of 5 slots). This slot becomes active in Phase 10 with the actual framing prompt, independently toggleable and sizable per budget phase.

### Claude's Discretion
- Session Manager internal state machine and lifecycle coordination details
- Conductor's spawning interface expansion (how Reverie requests a Claude Code session vs a Docker container)
- Wire connect handshake protocol for session registration
- Mind's cognitive cycle structure (how it processes turns, prioritizes activities, schedules subagents)
- Tertiary self-prompting mechanism (exact tool call or trigger pattern for cycle continuation)
- Referential framing prompt exact wording (the authority model is decided; exact prompt engineering is implementation)
- Startup sequence timing budget and optimization
- Passive mode lightweight Secondary scope (what "reduced capacity" means concretely)
- Go/no-go gate detection mechanism (how resource limit exceeded is measured)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` — Architecture plan. Absolute canon. Service domains, IoC patterns, layer hierarchy.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Canon. Sections critical for Phase 10:
  - Section 4.1 (Topology) — Three-session architecture diagram, Wire communication paths
  - Section 4.2 (Primary Session / Face) — What Primary does/doesn't do, how Secondary influences it, urgency-level mechanisms, hook enforcement
  - Section 4.3 (Secondary Session / Mind) — Full Mind responsibilities, what it processes from Primary and Tertiary, what it sends to each
  - Section 4.4 (Tertiary Session / Subconscious) — Sublimation cycle (5 steps), what it does NOT do, sublimation characteristics
  - Section 4.5 (Subagent Usage) — Secondary and Tertiary subagent use cases, two-level delegation cap
  - Section 4.6 (Session Lifecycle) — Startup sequence, active session, compaction event, session end
  - Section 7 (Operational Modes) — Active (7.1), Passive (7.2), REM (7.3), Dormant (7.4)
  - Section 8.4 (Referential Framing Prompt) — Core framing principles, mechanical explanation, risk of over-constraining
  - Section 8.5 (Context Budget Management) — NOTE: Phase 8 uses RESEARCH thresholds, not spec thresholds
  - Section 9.4 (EXPERIMENTAL: Claude Max concurrent sessions) — Go/no-go gate for three-session architecture
  - Section 9.9 (EXPERIMENTAL: Referential framing effectiveness) — At what utilization does framing lose influence?

### Research
- `.planning/research/PITFALLS.md` — Critical pitfalls, especially Pitfall 2 (personality erosion at high utilization) and Pitfall 6 (session startup latency)
- `.planning/research/SUMMARY.md` — Research synthesis with phase ordering rationale
- `.planning/research/ARCHITECTURE.md` — Component responsibilities, session spawning approach

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 10 requirements: SES-01 through SES-05, OPS-01, OPS-02, CTX-02

### Prior Phase Context
- `.planning/phases/08-single-session-personality-injection/08-CONTEXT.md` — Phase 8 decisions:
  - D-01: Face prompt template with 5 slots (referential framing slot becomes active in Phase 10)
  - D-02: additionalContext delivery via state file + hook read (Phase 10 changes writer to Secondary)
  - D-04: Static behavioral directive defaults (Phase 10 replaces with dynamic Mind directives)
  - D-05/D-06: Research-backed budget phases (Secondary takes over budget management)
  - D-11/D-12/D-13: Hook wiring, warm-start, SessionStart
- `.planning/phases/09-fragment-memory-engine/09-CONTEXT.md` — Phase 9 decisions:
  - D-01/D-02: Turn-scoped background subagents as intuitive inner voice (migrates to Mind authority)
  - D-04 through D-07: Subjective/relational prompt engineering (preserved under Mind orchestration)
  - D-11/D-12: Hybrid recall paths (Mind orchestrates both in Phase 10)
- `.planning/phases/09.1-claude-code-integration-layer/09.1-CONTEXT.md` — Phase 9.1 decisions:
  - D-01: Lithograph full read/write (enables context sculpting under Mind control)
  - D-03: Session-scoped transcript_path injection (Lithograph receives path from SessionStart)
  - D-05: Exciter delegates to Armature for hooks (session hooks route through Exciter)
  - Deferred: active context sculpting (Phase 10 enables via Mind + Lithograph)

### Existing Code (read before modifying)
- `core/services/wire/` — Full Wire service: protocol.cjs (8 message types, 4 urgency levels), registry.cjs (session lifecycle), queue.cjs (priority queue), write-coordinator.cjs (WAJ + retry), relay-server.cjs, channel-server.cjs, transport.cjs + transports/
- `core/services/conductor/` — Infrastructure service. Process lifecycle management. Needs expansion to support Claude Code session spawning alongside Docker/MCP lifecycle.
- `modules/reverie/components/session/` — Empty (.gitkeep). Session Manager lives here.
- `modules/reverie/components/modes/` — Empty (.gitkeep). Operational mode implementations live here.
- `modules/reverie/components/context/context-manager.cjs` — Context Manager with budget tracker, template composer. Budget management migrates to Secondary authority.
- `modules/reverie/components/context/budget-tracker.cjs` — Budget phase state machine.
- `modules/reverie/components/context/template-composer.cjs` — Face prompt composition with 5 slots.
- `modules/reverie/hooks/hook-handlers.cjs` — All 8 hook handlers. Phase 10 modifies to forward context to Secondary via Wire.
- `modules/reverie/components/formation/` — Formation pipeline. Migrates from Primary-spawned subagents to Mind-spawned subagents.
- `modules/reverie/components/recall/` — Recall engine. Mind orchestrates in Phase 10.
- `modules/reverie/components/self-model/self-model.cjs` — Self Model manager. Secondary becomes authoritative owner.
- `core/services/assay/assay.cjs` — Federated search. Tertiary uses for sublimation index scans.
- `core/providers/lithograph/` — Transcript provider. Secondary uses for deep context reads.
- `core/services/exciter/` — Integration surface. Session hooks route through Exciter.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Wire service** (`core/services/wire/`): Full communication infrastructure — protocol with 8 message types and 4 urgency levels, session registry with lifecycle events and buffered reconnection, priority queue, write coordinator with WAJ. Ready for three-session use.
- **Context Manager** (`context/context-manager.cjs`): Budget tracker + template composer + orchestrator. Budget management migrates to Secondary authority; Context Manager becomes the execution layer that Secondary drives.
- **Formation Pipeline** (`formation/`): Complete pipeline from Phase 9 — attention gate, prompt templates, fragment assembler, formation pipeline orchestrator. Migrates to run under Mind's subagents instead of Primary's.
- **Recall Engine** (`recall/`): Both passive and explicit recall paths via Assay with composite scoring. Mind orchestrates in Phase 10.
- **Conductor** (`core/services/conductor/`): Infrastructure lifecycle management. Already manages MCP server lifecycle. Needs expansion for Claude Code session spawning.
- **Lithograph** (`core/providers/lithograph/`): Transcript JSONL read/write/query. Secondary uses for deep conversation context reads.
- **Exciter** (`core/services/exciter/`): Integration surface. Hook registration, agent definitions, settings management.

### Established Patterns
- **Options-based DI**: All new components take injected dependencies.
- **Contract shapes**: SHAPE constant + createContract() for frozen public APIs.
- **Event emission**: Switchboard-based events on state changes.
- **Wire protocol**: Typed envelopes with urgency routing, ACK for critical messages.
- **Session registry**: Register/unregister/lookup/disconnect/reconnect with TTL and buffering.

### Integration Points
- **SessionStart hook -> Session Manager**: Triggers three-session startup sequence.
- **Session Manager -> Conductor**: Requests Claude Code session spawning for Secondary and Tertiary.
- **Session Manager -> Wire**: Configures session topology and registers sessions.
- **Primary hooks -> Wire -> Secondary**: Real-time conversation snapshots forwarded to Mind.
- **Secondary -> Lithograph**: Deep transcript reads for formation and recall processing.
- **Secondary -> Wire -> Primary**: Face prompt updates, directives, recall products.
- **Secondary -> Wire -> Tertiary**: Attention pointer, active domains, sensitivity thresholds.
- **Tertiary -> Assay**: Header-level fragment index scans for sublimation.
- **Tertiary -> Wire -> Secondary**: Sublimation candidates with resonance scores.
- **Stop hook -> Session Manager**: Triggers shutdown sequence (Tertiary first, then Secondary).

</code_context>

<specifics>
## Specific Ideas

### Correcting the Roadmap Decision on Conductor
The roadmap said "Session spawning via Bun.spawn in Session Manager, not Conductor." The user corrected this during discussion: Conductor IS the spawner (process lifecycle is its domain), but acts at Reverie's direction. Session Manager owns the WHAT (topology, aspects), Conductor owns the HOW (spawn, monitor, stop). This is a clean separation of concerns that matches the architecture principles.

### Full Mind from Day One
The user chose "Full Mind minus REM" over a minimal viable Mind. This means Phase 10 validates the entire cognitive pipeline under real load, not just the session plumbing. Attention management, formation orchestration, recall, Self Model authority, directive generation, sublimation evaluation, and subagent delegation all run in Phase 10. This maximizes the go/no-go gate's signal — if the architecture can handle the full Mind, it can handle anything.

### Referential Framing: Full Constraint with Escape Hatch
The user wants full constraint (Primary defers to Mind for everything including technical decisions) but recognizes this might degrade code quality. The implementation must support dialing back to dual-mode (relational constraint only, technical execution independent). Starting with static config rather than dynamic Mind-controlled adjustment — the dynamic version is a backlog item.

### Self-Prompting Sublimation
Tertiary operates as a self-prompting Claude Code session — each "turn" is one sublimation cycle, and it triggers itself to continue. This exploits the Claude Code session model for continuous processing without requiring external timers. The Mind controls cycle parameters via Wire directives between cycles.

</specifics>

<deferred>
## Deferred Ideas

### Mind-Controlled Dynamic Referential Framing (Backlog)
Instead of static config for framing intensity, the Mind itself adjusts per-turn based on conversational context. Technical deep-dive? Loosen to dual-mode. Relational moment? Tighten to full. Natural fit for SM-04 Conditioning (Phase 11) once attention biases and recall strategies are available. **Add as backlog entry.**

### Active Context Sculpting
With Lithograph write ops and Mind authority, Secondary could replace stale transcript entries with Self Model-framed reconstructions. Budget tracker becomes an active controller. Deferred from Phase 9.1, enabled by Phase 10 architecture but not in scope.

</deferred>

---

*Phase: 10-three-session-architecture*
*Context gathered: 2026-03-24*

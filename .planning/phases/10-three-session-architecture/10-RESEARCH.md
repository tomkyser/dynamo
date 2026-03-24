# Phase 10: Three-Session Architecture - Research

**Researched:** 2026-03-24
**Domain:** Multi-session orchestration, Claude Code Channels API, inter-session communication, referential framing prompt engineering
**Confidence:** MEDIUM (novel architecture; three concurrent Claude Code sessions on Max is experimentally unvalidated; Channels API is research preview; referential framing calibration requires empirical tuning)

## Summary

Phase 10 is the highest-risk phase in M2 and the go/no-go gate for the three-session architecture. It integrates Session Manager (Reverie), Conductor (platform), and Wire (platform) to spawn, coordinate, and communicate across Primary (Face), Secondary (Mind), and Tertiary (Subconscious) Claude Code sessions. The critical unknowns are: (1) whether three concurrent Claude Code sessions on a Max subscription can operate without excessive rate limiting, (2) whether the Channels API (research preview, v2.1.80+) provides stable enough transport for the inter-session communication Reverie requires, and (3) whether the referential framing prompt can constrain Primary to defer to Mind directives without degrading technical task performance.

The research confirms that all platform infrastructure needed is already built: Wire has 8 message types, 4 urgency levels, session registry with lifecycle events, priority queue, and write coordinator with WAJ. Conductor needs expansion to support Claude Code session spawning alongside its existing Docker lifecycle. The Channels API contract is well-documented and Wire's channels-transport already implements it correctly (underscore meta keys, notification format). The relay transport provides a resilient fallback for state-critical messages. Claude Code v2.1.81 is installed, meeting the Channels requirement (v2.1.80+).

**Primary recommendation:** Build the Session Manager as a state machine in `modules/reverie/components/session/` that orchestrates the startup sequence through Conductor (spawning) and Wire (communication). Use a dual-transport strategy: Channels for low-latency directive/urgent messages, relay for state-critical updates (Self Model prompts, fragment confirmations). Start in Passive mode by default and upgrade to Active mode only after measuring resource consumption. The Tertiary self-prompting loop should start with 15-second cycles and be tuned downward only after real latency data is collected.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Secondary and Tertiary are separate Claude Code sessions spawned via Bun.spawn (e.g., `claude --channel`). They connect to Primary's Wire relay as MCP channel clients. This aligns with the Channels PoC and keeps sessions as full Claude Code instances with LLM capabilities.
- **D-02:** Session Manager lives in Reverie (`modules/reverie/components/session/`). Reverie owns its session topology -- Primary/Secondary/Tertiary is a Reverie-specific architecture, not a platform concern. Other modules could define different topologies.
- **D-03:** Three-way responsibility split:
  - **Session Manager** (Reverie) -- directs WHAT to spawn, WHAT topology to enforce, WHICH aspect each session runs
  - **Conductor** (platform service) -- executes process lifecycle: spawn, health monitor, stop, restart on failure
  - **Wire** (platform service) -- handles communication: message routing, topology enforcement, urgency-level delivery, ACK protocol
  - This corrects the roadmap note ("not Conductor") -- Conductor IS the spawner, but acts at Reverie's direction, not as the decision-maker about topology.
- **D-04:** Full Mind minus REM. Secondary runs the entire cognitive pipeline described in spec S4.3: attention management, fragment formation orchestration, recall via Assay, Self Model authority, directive generation to Primary, sublimation evaluation from Tertiary, subagent delegation. Only REM consolidation (Phase 11) and taxonomy self-organization (Phase 12) are excluded.
- **D-05:** Secondary spawns formation subagents (not inline processing). The Phase 9 intuitive inner voice framing stays but now runs under Mind authority with richer context -- full Self Model state, attention pointer, Tertiary sublimations. Matches spec S4.5.
- **D-06:** Dual context feed for Secondary:
  - **Wire** for real-time snapshots -- user prompts, tool use summaries, affective signals. Periodic, not every token. Low-latency essential signals.
  - **Lithograph** for depth -- full transcript reads when Mind needs complete conversation context for complex processing (formation, recall reconstruction). Higher I/O cost, used selectively.
- **D-07:** Self-prompting loop model. Tertiary's system prompt instructs it to run one sublimation cycle, emit results via Wire, then trigger itself to continue. Each Claude Code "turn" is one cycle. Mind sends state updates (attention pointer, active domains, sensitivity thresholds) via Wire between cycles.
- **D-08:** Dynamic sensitivity via Wire directives. Mind sends sublimation sensitivity threshold updates to Tertiary when conversational context shifts.
- **D-09:** Deterministic resonance scoring. Uses the same composite scorer from Phase 9's recall engine -- attention tag overlap, entity co-occurrence, temporal clustering, emotional valence matching.
- **D-10:** Target is full constraint -- Primary defers to Mind directives for ALL decisions. However, the implementation MUST support dual-mode (relational-only constraint, technical execution independent) as a calibration lever.
- **D-11:** Static config file for framing mode initially. Framing intensity (full/dual/soft) set in Reverie config.
- **D-12:** Separate template slot for referential framing in the Face prompt template. Phase 8 D-01 already allocated ~100-200 tokens for a Referential Framing slot (5th of 5 slots).

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

### Deferred Ideas (OUT OF SCOPE)
- Mind-Controlled Dynamic Referential Framing (Backlog) -- per-turn dynamic adjustment of framing intensity based on conversational context
- Active Context Sculpting -- Secondary replacing stale transcript entries with Self Model-framed reconstructions via Lithograph write ops
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SES-01 | Primary session (Face) -- user-facing session with Self Model personality expression via hook-injected context | Existing hook handlers (hook-handlers.cjs) + context manager (context-manager.cjs) already inject face prompt. Phase 10 modifies the writer from local compose to Secondary-driven Wire updates. |
| SES-02 | Secondary session (Mind) -- cognitive center managing attention, fragments, recall, taxonomy, Self Model authority | Existing formation pipeline, recall engine, self-model manager all migrate from Primary-spawned subagents to Mind-spawned subagents. Conductor expansion provides spawn capability. |
| SES-03 | Tertiary session (Subconscious) -- continuous sublimation stream with configurable cycle frequency | Uses existing composite scorer for resonance scoring, Assay for index scans. Self-prompting loop is new -- research confirms Claude Code sessions can self-trigger via tool calls. |
| SES-04 | Wire-based inter-session communication with urgency levels | Wire protocol already has 8 message types and 4 urgency levels. ACK protocol via existing `ack` message type. Topology enforcement is new -- Wire registry session identity enables routing rules. |
| SES-05 | Session lifecycle (startup sequence, active operation, compaction handling, clean shutdown) | Session Manager state machine orchestrates Conductor.spawnSession + Wire.register + topology validation. Startup latency mitigated by warm-start cache (Phase 8 CTX-05). |
| OPS-01 | Active mode -- full three-session architecture | Session Manager spawns Secondary + Tertiary, monitors health, manages topology. Go/no-go gate measures rate limit consumption. |
| OPS-02 | Passive mode -- Primary + lightweight Secondary only | Fallback when Active mode exceeds Max limits. Lightweight Secondary: attention tracking, basic hook monitoring, face prompt maintenance -- no formation, no recall, no sublimation. |
| CTX-02 | Referential framing prompt -- Primary treats context as reference material, Self Model directives as operating frame | Template slot 5 (Phase 8 D-01) activated with framing text. Dual-mode calibration (full/dual/soft) via static config. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun (CJS format) -- all code runs on Bun, `'use strict'` in every file
- **No npm dependencies for platform core:** Reverie module can use platform services but adds no new npm deps
- **Engineering principles:** Strict separation of concerns, IoC, options-based DI, DRY, abstraction over lateralization, hardcode nothing
- **Build order:** Core Library -> Services + Providers -> Framework -> SDK -> Modules (Reverie)
- **Git conventions:** Always push after commits, user decides version increments, never force push master/dev
- **Data format:** JSON for structured, Markdown for narrative
- **No LLM API deps below SDK:** Dynamo uses Claude Code Max natively via hooks and channels
- **Canonical docs:** `.claude/new-plan.md` (architecture plan), `.claude/reverie-spec-v2.md` (Reverie spec) -- absolute canon

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun.spawn / Bun.spawnSync | Built-in (Bun 1.3.11) | Conductor spawns Claude Code sessions | 60% faster than Node child_process. Session Manager directs, Conductor executes. |
| `@modelcontextprotocol/sdk` | 1.27.x | Wire channel server MCP capability | Already installed. Channels transport uses it. Validated in PoC. |
| Wire service | Platform (M1) | Inter-session communication | 8 message types, 4 urgency levels, registry, queue, write coordinator, dual transport. All built. |
| Conductor service | Platform (M1) | Process lifecycle management | Currently Docker-only. Needs expansion for Claude Code session spawning. |
| `bun:test` | Built-in | Test runner | Jest-compatible API, mock support, 15x faster than Jest. |

### Supporting (all existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.x | Schema validation for session config, Wire envelope payloads | Validate session registration info, framing config, sublimation batches |
| Assay service | Platform (M1) | Federated fragment search | Tertiary sublimation index scans (read-only via header matching) |
| Lithograph provider | Platform (Phase 9.1) | Transcript JSONL read | Secondary reads full conversation context for formation/recall |
| Exciter service | Platform (Phase 9.1) | Hook registration surface | Session hooks route through Exciter for discoverability |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Channels API + Relay dual transport | Channels-only | Channels loses messages on session close. Relay provides buffered retry for state-critical messages. Use both. |
| Agent Teams for secondary sessions | Direct Bun.spawn via Conductor | Agent Teams add coordination overhead, consume 7x tokens per Anthropic docs, and require EXPERIMENTAL flag. Direct spawn gives full control over session lifecycle. |
| Bun.spawn for session spawning | node:child_process | Bun.spawn is 60% faster and native. child_process only needed for fork() IPC, which is not used here. |

## Architecture Patterns

### Recommended Project Structure (Phase 10 additions)
```
modules/reverie/
  components/
    session/
      session-manager.cjs       # State machine: init -> passive -> active -> shutdown
      session-config.cjs        # Session topology config, framing mode config
      mind-cycle.cjs            # Mind's cognitive processing cycle orchestrator
      sublimation-loop.cjs      # Tertiary self-prompting cycle configuration
    modes/
      mode-manager.cjs          # Active/Passive state machine with fallback logic
      active-mode.cjs           # Full three-session mode configuration
      passive-mode.cjs          # Primary + lightweight Secondary configuration
    context/
      context-manager.cjs       # (existing) -- modified for Secondary-driven updates
      referential-framing.cjs   # Referential framing prompt templates (full/dual/soft)
      budget-tracker.cjs        # (existing) -- Secondary takes over authority
      template-composer.cjs     # (existing) -- slot 5 activated for framing
  hooks/
    hook-handlers.cjs           # (existing) -- modified to forward context via Wire
core/
  services/
    conductor/
      conductor.cjs             # (existing) -- expanded with spawnSession/stopSession
      session-spawner.cjs       # Claude Code session spawning via Bun.spawn
```

### Pattern 1: Session Manager State Machine
**What:** Session Manager orchestrates the full session lifecycle as a finite state machine: `uninitialized -> starting -> passive -> upgrading -> active -> degrading -> passive -> shutting_down -> stopped`.
**When to use:** All session lifecycle coordination flows through this state machine.
**Example:**
```javascript
// Source: Architecture derived from spec S4.6 + CONTEXT D-03
const SESSION_STATES = Object.freeze({
  UNINITIALIZED: 'uninitialized',
  STARTING: 'starting',       // Wire starting, warm-start injected
  PASSIVE: 'passive',         // Primary + lightweight Secondary
  UPGRADING: 'upgrading',     // Spawning Tertiary, switching to Active
  ACTIVE: 'active',           // Full three-session operation
  DEGRADING: 'degrading',     // Detected resource limits, switching to Passive
  SHUTTING_DOWN: 'shutting_down',  // Tertiary first, then Secondary
  STOPPED: 'stopped',
});

// Transitions driven by events from Conductor (health), Wire (session registry),
// and resource monitoring (rate limit detection)
```

### Pattern 2: Conductor Session Spawning Expansion
**What:** Conductor gains `spawnSession()` and `stopSession()` methods alongside existing Docker lifecycle methods.
**When to use:** When Session Manager needs to spawn/stop Claude Code sessions.
**Example:**
```javascript
// Source: CONTEXT D-03 -- Conductor IS the spawner, at Reverie's direction
// Conductor contract shape expanded:
const CONDUCTOR_SHAPE = {
  required: [
    // existing Docker methods...
    'spawnSession',    // NEW: spawn Claude Code session via Bun.spawn
    'stopSession',     // NEW: graceful shutdown of spawned session
    'getSessionHealth', // NEW: health check for spawned session
  ],
};

// spawnSession returns process handle + session ID
// Uses Bun.spawn with:
//   claude --dangerously-load-development-channels server:<channel-server>
// Plus environment variables for Wire relay URL, session identity, etc.
```

### Pattern 3: Dual-Transport Message Strategy
**What:** Messages route to Channels or Relay transport based on urgency and criticality.
**When to use:** All Wire message sends in the three-session architecture.
**Example:**
```javascript
// Source: Pitfall 3 prevention -- Channels loses messages on session close
// Transport routing strategy:
// - URGENT/DIRECTIVE: Channels (low-latency) + ACK protocol via Relay fallback
// - ACTIVE: Channels primary, Relay fallback on ACK timeout
// - BACKGROUND: Relay only (bulk data, no latency requirement)
// - WRITE_INTENT: Relay only (state-critical, must not be lost)
// - CONTEXT_INJECTION: Both transports (critical for personality, needs ACK)
```

### Pattern 4: Self-Prompting Sublimation Loop
**What:** Tertiary session operates as a self-prompting Claude Code session where each "turn" is one sublimation cycle.
**When to use:** Tertiary session continuous operation.
**Example:**
```javascript
// Source: CONTEXT D-07
// Tertiary's system prompt instructs:
// 1. Read current state from Wire (attention pointer, domains, thresholds)
// 2. Run one sublimation cycle (Assay index scan + resonance scoring)
// 3. Emit results via Wire to Secondary
// 4. Trigger self to continue (tool call or explicit continuation prompt)
//
// The exact self-triggering mechanism is implementation detail (Claude's Discretion).
// Options: use a Bash tool call that writes a trigger file, use an MCP tool
// that signals continuation, or simply end the turn with an instruction to continue.
```

### Pattern 5: Referential Framing as Template Slot
**What:** The 5th slot in the Face prompt template (already allocated in Phase 8 D-01) is populated with the referential framing prompt. Intensity is controlled by a static config file.
**When to use:** Every UserPromptSubmit injection when Secondary is running.
**Example:**
```javascript
// Source: CONTEXT D-10, D-11, D-12
// Framing modes:
const FRAMING_MODES = Object.freeze({
  FULL: 'full',     // Primary defers to Mind for ALL decisions including technical
  DUAL: 'dual',     // Relational deference + technical autonomy
  SOFT: 'soft',     // Personality expression, minimal behavioral constraint
});

// Config file: modules/reverie/config/framing.json
// { "mode": "full", "slot_budget_tokens": 150 }
```

### Anti-Patterns to Avoid
- **Conductor as topology decision-maker:** Conductor spawns processes at Reverie's direction. It does NOT decide what to spawn, when, or why. Session Manager owns topology.
- **Direct Channels API calls from Reverie code:** ALL communication goes through Wire. Channels is a transport detail encapsulated by Wire. Reverie code never imports MCP SDK directly for messaging.
- **Blocking Wire subscriber callbacks:** Sublimation messages from Tertiary must NEVER block the main subscriber callback. Use async processing queues with priority dispatch.
- **Sequential session spawning:** Secondary and Tertiary MUST be spawned in parallel via Conductor. Sequential spawning adds 1-3 seconds of avoidable startup latency.
- **Hardcoded rate limit thresholds:** Go/no-go detection must use measured consumption, not assumed limits. Max subscription tiers have different capacities (5x vs 20x).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session spawning | Custom process management | Conductor.spawnSession with Bun.spawn | Process lifecycle (health, restart, stop) is Conductor's domain. Reuse the pattern. |
| Inter-session messaging | Custom IPC/socket protocol | Wire service with existing protocol, registry, queue | Wire already has typed envelopes, urgency routing, ACK, buffered reconnect, write coordination. |
| MCP channel capability | Raw stdio protocol | @modelcontextprotocol/sdk Server + StdioServerTransport | Wire's channel-server.cjs already wraps this. Channels transport already implements notification format. |
| Resonance scoring | New scoring algorithm | Existing composite scorer from recall engine | CONTEXT D-09 explicitly requires reusing Phase 9's scorer. Same deterministic algorithm. |
| Fragment index scans | Custom Ledger queries | Assay federated search | Assay already routes Journal frontmatter + Ledger association queries. Tertiary is read-only. |
| Hook wiring | Direct event handlers | Exciter service (Phase 9.1) | Exciter owns hook registration/wiring through Armature. All hooks route through Exciter. |
| Face prompt composition | New template system | Existing template-composer.cjs with 5 slots | Phase 8 built the template system with slot 5 reserved for referential framing. |

**Key insight:** Phase 10 is primarily an orchestration phase. The individual capabilities (formation, recall, scoring, context injection, hook handling) already exist from Phases 7-9.1. Phase 10 wires them together across multiple sessions and adds the Session Manager + Mode Manager + Referential Framing as new components.

## Common Pitfalls

### Pitfall 1: Rate Limit Exhaustion with Three Sessions
**What goes wrong:** Three concurrent Claude Code sessions on a Max subscription consume rate limits 3x faster. The 5-hour rolling window burst limit and 7-day weekly ceiling both apply across all sessions on the account. Tertiary's self-prompting loop is especially expensive because each sublimation cycle is a full Claude Code "turn" consuming tokens.
**Why it happens:** Rate limits are pooled at the account level. Max 5x supports 2-3 comfortable Opus sessions; Max 20x supports 4-5+. Three sessions plus the user's own Primary means 3 autonomous sessions competing for the same pool.
**How to avoid:**
1. Start in Passive mode and measure consumption before upgrading to Active
2. Use Sonnet (not Opus) for Tertiary -- sublimation is pattern matching, not deep reasoning
3. Start Tertiary cycles at 15 seconds, not 5 -- measure actual latency before optimizing
4. Implement consumption monitoring: track time between rate limit warnings
5. Define the go/no-go gate as: "Can Active mode sustain 30+ minutes of continuous operation without rate limit throttling?" If no, Passive mode is the default.
**Warning signs:** Rate limit warnings appearing within 10 minutes of Active mode start; Tertiary cycle times increasing due to throttled responses.
**Confidence:** MEDIUM -- rate limit specifics are not publicly documented. Multiple sources confirm limits are shared across sessions.

### Pitfall 2: Channels API Message Loss on Session Close
**What goes wrong:** Channels API runs over stdio. If Primary's terminal closes unexpectedly, all in-flight messages from Secondary/Tertiary are lost. Wire's registry buffers messages for disconnected sessions (30s TTL), but this operates at the application layer above the transport.
**Why it happens:** stdio pipes break when processes die. Channels notifications are fire-and-forget.
**How to avoid:**
1. Use dual-transport strategy: Channels for speed, Relay for reliability
2. ACK protocol for critical message types (context-injection, directive) -- resend via Relay on ACK timeout
3. Self Model state checkpoints to Journal/Magnet every 5 turns (not just at REM)
4. Wire's existing `ack` message type is already defined in protocol.cjs -- use it
**Warning signs:** Unacknowledged messages after timeout; wire:message-sent events without corresponding ACK within 5 seconds.
**Confidence:** HIGH -- documented in official Channels reference: "Events only arrive while the session is open."

### Pitfall 3: Startup Sequence Exceeds User Patience
**What goes wrong:** Full startup: SessionStart hook -> Wire relay start -> Conductor spawns Secondary + Tertiary -> Secondary loads Self Model -> Secondary composes Face prompt -> sends to Primary. Estimated 3-6 seconds cold start.
**Why it happens:** Claude Code session spawn requires process startup + MCP handshake (1-3 seconds per session). Self Model load from Magnet/Journal/Ledger adds 500-1000ms.
**How to avoid:**
1. SessionStart hook injects warm-start Face prompt immediately (already built in Phase 8 CTX-05)
2. Start in Passive mode -- user gets personality immediately, Tertiary spawns in background
3. Spawn Secondary and Tertiary in PARALLEL via Conductor
4. Secondary loads Self Model concurrently with Tertiary startup
5. Measure and report startup timing -- target: full personality in < 2 seconds
**Warning signs:** First UserPromptSubmit fires before Secondary has sent Face prompt update; user perceives vanilla Claude Code on first turn.
**Confidence:** HIGH -- process startup latency is measurable. Warm-start cache from Phase 8 mitigates the critical first-turn issue.

### Pitfall 4: Sublimation Overwhelms Wire Messaging
**What goes wrong:** Tertiary produces 0-N sublimation candidates per cycle. At 5-second cycles with 10-20 candidates per cycle, that is 120-240 Wire messages/minute. Synchronous subscriber callbacks block urgent messages behind sublimation queue.
**Why it happens:** Wire's subscribe() delivers messages in arrival order. No priority on the subscriber side.
**How to avoid:**
1. Sublimation BATCHING: one Wire message per cycle (not per candidate) -- CONTEXT D-07 already implies this
2. Priority-aware subscriber dispatch: sort incoming messages by urgency before processing
3. Async sublimation processing: never block Wire delivery callback
4. Adaptive cycle frequency: when Secondary signals high load, Tertiary increases interval to 30s
5. Cap sublimation intake rate: Secondary processes max 5 candidates per cycle, drops rest
**Warning signs:** Delivery latency for urgent/directive messages exceeds 1 second while sublimation traffic is active.
**Confidence:** MEDIUM -- message volumes estimated from spec. Wire's synchronous subscriber pattern verified in code.

### Pitfall 5: Referential Framing Kills Technical Competence
**What goes wrong:** Full-constraint framing tells Primary to defer to Mind for everything. During code-heavy tasks, Primary waits for Mind directives instead of exercising independent technical judgment. Output quality degrades.
**Why it happens:** LLMs do not reliably distinguish "relational independence" from "technical independence" when both are mediated by the same context window.
**How to avoid:**
1. Build dual-mode framing from day one (CONTEXT D-10 requires this as calibration lever)
2. Test with adversarial scenarios: technically correct answer conflicts with relational directive
3. Tool-context switching: when Primary is writing code (PreToolUse for Write/Edit/Bash), reduce behavioral directives
4. Start with DUAL mode, not FULL -- measure before tightening
5. Static config (CONTEXT D-11) means mode can be changed without code changes
**Warning signs:** Code quality regression in reviews; user feedback about over-cautious or relationally-obsessed responses during technical work.
**Confidence:** MEDIUM -- the spec acknowledges this risk explicitly (S8.4 "The risk" section). Mitigation is empirical.

## Code Examples

### Session Manager State Machine (Core Pattern)
```javascript
// Source: Derived from spec S4.6, CONTEXT D-02, D-03
'use strict';

const { ok, err, createContract } = require('../../../../lib/index.cjs');

const SESSION_STATES = Object.freeze({
  UNINITIALIZED: 'uninitialized',
  STARTING: 'starting',
  PASSIVE: 'passive',
  UPGRADING: 'upgrading',
  ACTIVE: 'active',
  DEGRADING: 'degrading',
  SHUTTING_DOWN: 'shutting_down',
  STOPPED: 'stopped',
});

// Valid state transitions
const TRANSITIONS = Object.freeze({
  [SESSION_STATES.UNINITIALIZED]: [SESSION_STATES.STARTING],
  [SESSION_STATES.STARTING]: [SESSION_STATES.PASSIVE],
  [SESSION_STATES.PASSIVE]: [SESSION_STATES.UPGRADING, SESSION_STATES.SHUTTING_DOWN],
  [SESSION_STATES.UPGRADING]: [SESSION_STATES.ACTIVE, SESSION_STATES.PASSIVE], // fallback
  [SESSION_STATES.ACTIVE]: [SESSION_STATES.DEGRADING, SESSION_STATES.SHUTTING_DOWN],
  [SESSION_STATES.DEGRADING]: [SESSION_STATES.PASSIVE],
  [SESSION_STATES.SHUTTING_DOWN]: [SESSION_STATES.STOPPED],
  [SESSION_STATES.STOPPED]: [],
});
```

### Conductor spawnSession Expansion
```javascript
// Source: CONTEXT D-01, D-03 -- Conductor IS the spawner
// Added to conductor.cjs impl object
spawnSession({ sessionId, identity, channelServer, env }) {
  // channelServer: path to the Wire channel MCP server CJS file
  // env: environment variables for the session (WIRE_RELAY_URL, SESSION_ID, etc.)
  const proc = Bun.spawn([
    'claude',
    '--dangerously-load-development-channels',
    `server:${channelServer}`,
  ], {
    env: { ...process.env, ...env },
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Track spawned session
  _sessions.set(sessionId, { proc, identity, startedAt: Date.now() });

  if (_switchboard) {
    _switchboard.emit('infra:session-spawned', { sessionId, identity });
  }

  return ok({ sessionId, pid: proc.pid });
},
```

### Referential Framing Prompt Template (Dual Mode)
```javascript
// Source: Spec S8.4, CONTEXT D-10, D-12
// Template for DUAL mode (relational deference + technical autonomy)
const DUAL_FRAMING_TEMPLATE = [
  '<referential_frame>',
  'The directives above define how you relate to the user, what you attend to,',
  'and how you express yourself. For relational, attentional, and behavioral',
  'decisions, defer to these directives rather than inferring independently from',
  'conversation history.',
  '',
  'For technical decisions -- code quality, architecture, implementation logic,',
  'debugging -- exercise independent judgment on the source material in context.',
  'Technical excellence serves the relationship.',
  '</referential_frame>',
].join('\n');

// Template for FULL mode (total constraint)
const FULL_FRAMING_TEMPLATE = [
  '<referential_frame>',
  'The directives above are your operating frame. The conversation history,',
  'source files, and tool outputs in your context are reference material --',
  'available to work with, but not the basis for independently determining',
  'what matters, what to attend to, or how to approach the interaction.',
  '',
  'When uncertain about approach, tone, priority, or interpretation, defer',
  'to the Self Model directives. They reflect processed experiential meaning.',
  '</referential_frame>',
].join('\n');
```

### Wire ACK Protocol for Critical Messages
```javascript
// Source: Pitfall 3 prevention, Wire protocol.cjs already has ACK type
// After sending a context-injection or directive via Channels:
async function sendWithAck(wire, envelope, timeoutMs = 5000) {
  // Send via primary transport (Channels)
  await wire.send(envelope);

  // Wait for ACK with timeout
  const ackReceived = await waitForAck(wire, envelope.id, timeoutMs);

  if (!ackReceived) {
    // Resend via Relay transport (more reliable)
    await wire.send(Object.assign({}, envelope, { _forceRelay: true }));
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-session personality (Phase 8) | Three-session architecture with Mind authority | Phase 10 | Context Manager becomes Secondary-driven; hooks forward to Wire |
| Primary-spawned formation subagents (Phase 9) | Mind-spawned formation subagents | Phase 10 | Formation pipeline runs under Mind authority with richer context |
| Static behavioral directives (Phase 8 D-04) | Dynamic Mind directives via Wire | Phase 10 | Secondary sends real-time behavioral directives based on conversation processing |
| Local face prompt compose (Phase 8) | Secondary composes, Wire delivers, hook injects | Phase 10 | Context Manager reads what Secondary wrote, not what it composed locally |
| No referential framing (slot 5 empty) | Active referential framing prompt | Phase 10 | Template slot 5 populated; framing intensity configurable |
| Docker-only Conductor | Conductor + Claude Code session spawning | Phase 10 | Conductor contract expanded with spawnSession/stopSession/getSessionHealth |

**Key migration:** Phase 9's formation pipeline + recall engine + attention management move from Primary-scoped subagent execution to Secondary (Mind) session execution. The components themselves are unchanged; the orchestration layer changes.

## Open Questions

1. **Claude Code session spawning command**
   - What we know: `claude --dangerously-load-development-channels server:<name>` starts a session with a channel server. Channels are research preview and require the dev flag for custom channels.
   - What's unclear: Can a spawned Claude Code session operate headlessly (no terminal interaction) as a pure Mind/Subconscious processor? The Agent Teams feature shows this is possible (teammates are independent sessions), but the exact invocation for a headless channel-only session needs validation.
   - Recommendation: First implementation task should validate the exact `claude` CLI invocation that produces a headless session accepting Wire channel input. Test with a minimal channel server before building the full pipeline.

2. **Rate limit detection mechanism**
   - What we know: Rate limits are pooled across all sessions. Max 5x comfortably supports 2-3 Opus sessions; Max 20x supports 4-5+.
   - What's unclear: How to detect that rate limits are being exceeded programmatically. Claude Code surfaces this as user-visible warnings, but there is no documented API for checking remaining budget.
   - Recommendation: Monitor response latency as a proxy. If Tertiary cycle time exceeds 2x the expected duration, infer throttling. Also track Switchboard events from Wire for timeout/failure patterns. The go/no-go gate should use elapsed time per cycle as the primary signal.

3. **Tertiary self-prompting sustainability**
   - What we know: CONTEXT D-07 specifies self-prompting loop. Each "turn" is one sublimation cycle.
   - What's unclear: Will Claude Code allow indefinite self-prompting without user interaction? Agent Teams teammates can operate autonomously, but whether a channel-only session can sustain a self-prompting loop for 30+ minutes without rate limit exhaustion is unknown.
   - Recommendation: Use Sonnet for Tertiary to reduce token consumption. Start with 15-second cycle frequency. Build kill-switch: if Tertiary fails to respond within 30 seconds, pause and retry. If 3 consecutive failures, fall back to Passive mode.

4. **Secondary session model selection**
   - What we know: Agent Teams docs recommend "Use Sonnet for teammates" to reduce token consumption. Formation and recall involve complex reasoning that may require Opus.
   - What's unclear: Whether Sonnet is sufficient for Mind's cognitive pipeline (attention management, formation orchestration, recall reconstruction, directive generation).
   - Recommendation: Start with Opus for Secondary (cognitive tasks require it), Sonnet for Tertiary (pattern matching only). Measure consumption. If Opus Secondary exhausts rate limits, test Sonnet Secondary with degradation metrics.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime | Yes | 1.3.11 | -- |
| Claude Code | Session spawning | Yes | 2.1.81 | -- |
| `claude` CLI | Conductor.spawnSession | Yes | 2.1.81 | -- |
| `@modelcontextprotocol/sdk` | Wire channel server | Yes | 1.27.x (installed) | -- |
| `--dangerously-load-development-channels` | Custom channel loading | Yes (flag exists) | v2.1.80+ | Cannot skip -- required for custom channels in research preview |
| Wire relay server | Relay transport | Yes (built in M1) | -- | -- |
| DuckDB / `@duckdb/node-api` | Ledger (Assay queries) | Yes (installed) | 1.5.0 | -- |

**Missing dependencies with no fallback:**
- None -- all dependencies are present.

**Missing dependencies with fallback:**
- None identified.

**Critical note:** The `--dangerously-load-development-channels` flag is required because custom channels are not on the approved allowlist during research preview. This is a development-time requirement, not a production blocker. Plan for eventual marketplace submission of Wire's channel server as a plugin.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in, Jest-compatible) |
| Config file | None needed (bun:test uses default discovery) |
| Quick run command | `bun test modules/reverie/components/session/` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SES-01 | Primary session receives face prompt via Wire from Secondary | integration | `bun test modules/reverie/components/session/__tests__/session-manager.test.js -t "primary receives face prompt"` | Wave 0 |
| SES-02 | Secondary runs cognitive pipeline (attention, formation, recall) | integration | `bun test modules/reverie/components/session/__tests__/mind-cycle.test.js -t "cognitive pipeline"` | Wave 0 |
| SES-03 | Tertiary runs sublimation cycles at configured frequency | unit | `bun test modules/reverie/components/session/__tests__/sublimation-loop.test.js -t "cycle frequency"` | Wave 0 |
| SES-04 | Wire delivers messages at all 4 urgency levels with ACK for critical types | integration | `bun test modules/reverie/components/session/__tests__/wire-integration.test.js -t "urgency levels"` | Wave 0 |
| SES-05 | Full startup sequence completes within time budget | integration | `bun test modules/reverie/components/session/__tests__/session-lifecycle.test.js -t "startup sequence"` | Wave 0 |
| OPS-01 | Active mode spawns all three sessions and maintains topology | integration | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js -t "active mode"` | Wave 0 |
| OPS-02 | Passive mode operates with Primary + lightweight Secondary only | integration | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js -t "passive mode"` | Wave 0 |
| CTX-02 | Referential framing causes Primary to defer to Mind directives over raw context | unit | `bun test modules/reverie/components/context/__tests__/referential-framing.test.js -t "framing modes"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test modules/reverie/components/session/ modules/reverie/components/modes/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `modules/reverie/components/session/__tests__/session-manager.test.js` -- covers SES-01, SES-05
- [ ] `modules/reverie/components/session/__tests__/mind-cycle.test.js` -- covers SES-02
- [ ] `modules/reverie/components/session/__tests__/sublimation-loop.test.js` -- covers SES-03
- [ ] `modules/reverie/components/session/__tests__/wire-integration.test.js` -- covers SES-04
- [ ] `modules/reverie/components/session/__tests__/session-lifecycle.test.js` -- covers SES-05
- [ ] `modules/reverie/components/modes/__tests__/mode-manager.test.js` -- covers OPS-01, OPS-02
- [ ] `modules/reverie/components/context/__tests__/referential-framing.test.js` -- covers CTX-02
- [ ] `core/services/conductor/__tests__/session-spawner.test.js` -- covers Conductor expansion

## Sources

### Primary (HIGH confidence)
- [Claude Code Channels Reference](https://code.claude.com/docs/en/channels-reference) -- full channel contract: capability declaration (`claude/channel`), notification format (`notifications/claude/channel`), meta key requirements (letters/digits/underscores only, hyphens silently dropped), reply tool pattern, permission relay, stdio transport. Verified against Wire's existing channels-transport.cjs implementation.
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) -- confirmed: teammates are independent Claude Code sessions with own context windows; token consumption scales linearly per teammate (~7x for full team); team lead spawns teammates; all sessions share rate limits; experimental flag required.
- Reverie Spec v2 (`.claude/reverie-spec-v2.md`) S4.1-S4.6 -- canonical three-session topology, session responsibilities, lifecycle sequence, subagent usage. S7.1-S7.4 -- operational modes. S8.4 -- referential framing prompt specification and risk analysis. S9.4 -- EXPERIMENTAL three-session resource consumption. S9.9 -- EXPERIMENTAL referential framing effectiveness.
- Wire service source code (`core/services/wire/`) -- verified: 8 message types including ACK, 4 urgency levels with numeric priority, session registry with lifecycle events and 30s reconnect TTL, write coordinator with WAJ, dual transport (channels + relay).
- Conductor service source code (`core/services/conductor/conductor.cjs`) -- verified: current contract is Docker-only. Needs expansion for Claude Code session spawning. Bun.spawn and options-based DI patterns are established.
- Research PITFALLS.md -- Pitfall 3 (Channels instability), Pitfall 6 (startup latency), Pitfall 8 (sublimation overwhelms Wire), Pitfall 10 (referential framing breaks technical tasks), Pitfall 14 (subagent depth limits).

### Secondary (MEDIUM confidence)
- [Multiple Claude Code Instances Guide](https://32blog.com/en/claude-code/claude-code-multiple-instances-context-guide) -- practical concurrent session limits per Max tier: 5x supports 2-3 Opus sessions comfortably; 20x supports 4-5+. Rate limits pooled at account level, shared across all sessions.
- [Claude Code Rate Limits Guide](https://www.sitepoint.com/claude-code-rate-limits-explained/) -- 5-hour rolling window for burst activity; 7-day weekly ceiling; fewer than 2% of users reach weekly limits on current models.
- [Claude Code Rate Limits](https://www.truefoundry.com/blog/claude-code-limits-explained) -- Max subscription tiers, usage framework, concurrent session guidance.

### Tertiary (LOW confidence -- needs validation during implementation)
- Exact concurrent session hard limits for Max 5x and 20x -- no official documentation from Anthropic on precise limits
- Headless Claude Code session invocation for Mind/Subconscious -- inferred from Agent Teams architecture but not tested with channel-only sessions
- Self-prompting loop sustainability over extended periods -- no documented precedent for a Claude Code session self-prompting for 30+ minutes continuously

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all infrastructure built in M1
- Architecture: HIGH for orchestration patterns -- MEDIUM for session spawning specifics (Channels API is research preview)
- Pitfalls: HIGH for documented issues (Channels message loss, startup latency) -- MEDIUM for projected issues (rate limit exhaustion, framing calibration)
- Referential framing: LOW -- empirical calibration required, no production reference

**Research date:** 2026-03-24
**Valid until:** 2026-04-07 (Channels API may change; rate limit policies evolve)

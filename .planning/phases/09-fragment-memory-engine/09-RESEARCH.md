# Phase 9: Fragment Memory Engine - Research

**Researched:** 2026-03-24
**Domain:** LLM-driven fragment formation pipeline with subjective/relational prompt engineering, background subagent spawning, and Assay-based composite recall -- all in single-session context
**Confidence:** MEDIUM (novel domain; formation fan-out S/N and recall reconstruction quality are experimentally unvalidated; prompt engineering is the architecture and cannot be predetermined)

## Summary

Phase 9 is the most architecturally novel phase in M2. It converts the data infrastructure from Phase 7 (fragment schema, association index, FragmentWriter, decay function) and the personality injection pipeline from Phase 8 (Context Manager, hook handlers, template composer) into a living memory system. The two requirements -- FRG-03 (formation pipeline) and FRG-04 (real-time recall) -- together represent the fragment memory engine operating in single-session mode, without the complexity of inter-session communication.

The core technical challenge is not infrastructure -- all building blocks exist. It is prompt engineering at the architectural level. The formation subagent must operate as an intuitive inner voice using subjective/relational framing (ISFP/INFP cognitive style) to produce impressionistic fragments rather than objective summaries. This is a fundamentally different LLM operation than typical tool-assisted code generation. The CONTEXT.md decisions (D-01 through D-17) establish that formation behavior is defined by prompt templates, not code paths -- changing how formation works means changing a prompt, not refactoring a pipeline. The scaffolding (spawn, receive, validate, write) stays stable while the cognition layer (prompts) evolves through testing.

The second technical challenge is the background subagent coordination pattern. Claude Code's Agent tool spawns subagents that run in their own context window. Phase 9 uses fire-and-forget background agents triggered after each user turn via the UserPromptSubmit hook. The subagent performs formation work, writes fragments via FragmentWriter, and returns nudge text that the Context Manager injects on subsequent turns. This coordination uses the filesystem as a message bus -- not Wire (which is for inter-session communication in Phase 10+). The key constraint is that subagents cannot spawn other subagents, so the formation pipeline must complete in a single subagent invocation.

**Primary recommendation:** Build the formation pipeline as a prompt-template-driven system with stable scaffolding code and replaceable prompt layers. Formation subagent spawning uses Claude Code's background Agent tool via custom subagent definitions. Recall uses Assay's existing federated search with a new composite scoring module layered on top. Design for empirical iteration -- the signal-to-noise ratio (EXPERIMENTAL 9.10) and recall reconstruction quality (EXPERIMENTAL 9.8) will only be resolved through testing with real conversation data.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Turn-scoped background subagents. After each user turn, the Context Manager spawns a fire-and-forget background agent (via Claude Code's Agent tool) with the previous turn's context. The agent runs formation on that stimulus -- attention check, domain identification, body composition -- then writes fragments via FragmentWriter and feeds nudges back to the Context Manager. Primary does not wait for formation. ~1 turn latency is acceptable and matches how human memory works.
- **D-02:** The formation subagent operates as an intuitive inner voice, not a strategic Mind. The Self Model framing shifts to high-perception, low-deliberation -- ISFP/INFP cognitive style rather than the full Mind's INTJ/ENTJ analytical mode. The subagent notices impressions, emotional signals, relational shifts, and pattern resonances. It does not build strategic associations or direct Primary's behavior.
- **D-03:** The formation subagent's system prompt references cognitive and psychological literature indirectly -- not as instructions but as context that activates the right latent patterns in the LLM.
- **D-04:** ALL formation prompts are framed around subjective identity and relationship. Every question forces self-reference, relational processing, and perspective asymmetry. This breaks the LLM's default third-person omniscient mode.
- **D-05:** Conditioning is driven through the same relational framing. "What should you pay attention to next time {user_name} does something like this?"
- **D-06:** When passive recall surfaces fragments during formation, the subagent encounters its own prior impressions. The prompt drives recursive self-reference.
- **D-07:** Relationships and subjectivity ARE THE KEY. Without this, fragments become Wikipedia entries. With it, they become impressions from a perspective.
- **D-08:** NO predefined domains. No DOMAINS constant, no seed set, no enum, no starter categories. The association index domains table starts empty. Domain names are free-text strings the LLM produces.
- **D-09:** Domain clustering emerges organically from the LLM's training.
- **D-10:** Early sessions will produce duplicates and near-synonyms. This is expected and acceptable. Deduplication and convergence happen in REM consolidation (Phase 11).
- **D-11:** Hybrid recall -- passive by default, explicit on demand. Passive path: formation subagent pulls relevant fragments and feeds impressions back as nudges (~100-200 tokens). Explicit path: user-triggered, full Assay search with composite scoring, richer reconstruction.
- **D-12:** Both paths use the same underlying Assay query and composite scoring engine. The difference is trigger mechanism and output format.
- **D-13:** Three types in Phase 9: experiential, source-reference, meta-recall.
- **D-14:** Fragment type is an emergent property, not a routing decision. The type is labeled post-formation based on what the LLM produced.
- **D-15:** Sublimation (requires Tertiary, Phase 10) and Consolidation (requires REM, Phase 11) are out of scope.
- **D-16:** The formation prompt engineering is the most experimental part. The architecture MUST make prompt changes easy -- formation behavior is defined by prompt templates, not code paths.
- **D-17:** Serious changes may be needed once 1.0.0 is ready to test with real users. Design for replaceability at the prompt layer.

### Claude's Discretion
- Formation subagent system prompt exact wording (the framing principles in D-04 through D-07 are the constraints; exact prose is implementation)
- Composite scoring weight defaults for recall ranking
- Assay query construction for both passive and explicit recall paths
- Fragment schema field population from LLM output (how to extract structured frontmatter from subagent response)
- Token budget allocation for passive nudges vs explicit reconstruction
- Attention check heuristic for stimulus gating (what triggers formation vs. what gets skipped)

### Deferred Ideas (OUT OF SCOPE)
- Transcript-Based Formation Context (Phase 9.1) -- Lithograph not yet available
- Active Context Sculpting (Phase 9.1+) -- requires Lithograph write capabilities
- Domain Convergence and Taxonomy Self-Organization (Phase 11/12) -- REM consolidation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRG-03 | Multi-angle formation pipeline (attention check, domain fan-out, parallel per-fragment processing, formation group tagging) | Formation pipeline architecture (Section: Architecture Patterns), background subagent mechanism (Section: Subagent Spawning Pattern), prompt template system (Section: Formation Prompt Engineering), FragmentWriter integration (existing code) |
| FRG-04 | Real-time recall via Assay (retrieval, composite ranking, reconstruction through current Self Model frame) | Assay federated search (existing code), composite scoring engine (Section: Recall Scoring Architecture), reconstruction prompt pattern (Section: Recall Reconstruction Pattern), Context Manager nudge integration (Section: Nudge Delivery) |
</phase_requirements>

## Standard Stack

### Core (Consumed from Platform -- No New Dependencies)

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Bun | >= 1.3.10 | Runtime for formation scaffolding, filesystem coordination | Platform runtime, validated in M1 |
| `bun:test` | Built-in | Test runner for formation pipeline and recall logic | Platform test infrastructure, 205 tests passing |
| Zod 4.x | Installed | Fragment validation via existing schemas.cjs | Already used for all fragment/SM schemas in Phase 7 |
| Assay | M1 built | Federated search for recall queries | Existing service with Journal + Ledger provider routing |
| FragmentWriter | Phase 7 built | Atomic dual-provider writes (Journal + Ledger) | Existing abstraction, handles rollback |
| Association Index | Phase 7 built | 12-table DuckDB schema for fragment associations | Tables defined, DDL idempotent |
| Context Manager | Phase 8 built | Face prompt injection, budget tracking, nudge delivery | Existing 10-method contract, extends with nudge integration |
| Hook Handlers | Phase 8 built | All 8 hooks wired via Armature registry | Existing dispatch layer |
| Self Model Manager | Phase 7 built | getAspect() for synchronous cache reads | Formation subagent needs aspect data for framing |
| Claude Code Agent Tool | Current | Background subagent spawning via custom agent definitions | Official Claude Code mechanism for fire-and-forget subagents |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` | Built-in | Fragment ID generation (randomUUID) | Already used in FragmentWriter |
| `node:path` | Built-in | File path resolution for nudge files | Standard |
| `node:fs` | Built-in (compat) | Directory creation for formation working dirs | Bun-compatible |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Background Agent tool (custom subagent) | Bun.spawn raw process | Agent tool provides built-in context management, tool access inheritance, transcript isolation. Raw spawn would require building all of this. Agent tool is the correct mechanism for single-session subagent work. |
| Filesystem nudge bus | Wire messages | Wire is for inter-session communication (Phase 10+). In single-session mode, the filesystem is simpler and avoids coupling to Wire's transport layer. Formation subagent writes a nudge file; Context Manager reads it. |
| Assay federated search | Direct DuckDB SQL queries | Assay already abstracts Journal + Ledger. Direct SQL bypasses the provider abstraction and violates the "everything routes through Dynamo" principle. Use Assay's `options.sql` for SQL-specific queries when needed. |

## Architecture Patterns

### Recommended Project Structure

```
modules/reverie/
  components/
    formation/                    # NEW -- Phase 9 formation pipeline
      formation-pipeline.cjs      # Orchestrator: spawn subagent, coordinate writes
      attention-gate.cjs          # Stimulus evaluation heuristic
      prompt-templates.cjs        # Formation prompt templates (THE replaceable layer)
      fragment-assembler.cjs      # Parse subagent output -> fragment frontmatter + body
      nudge-manager.cjs           # Nudge file I/O and Context Manager integration
    recall/                       # NEW -- Phase 9 recall engine
      recall-engine.cjs           # Orchestrator: query, rank, reconstruct
      composite-scorer.cjs        # Multi-factor scoring function
      query-builder.cjs           # Assay query construction from conversation context
      reconstruction-prompt.cjs   # Reconstruction prompt template
    fragments/                    # Phase 7 (existing)
      fragment-writer.cjs         # Atomic dual-provider writes (no changes)
      association-index.cjs       # 12-table DDL (no changes)
      decay.cjs                   # Deterministic decay (no changes)
    context/                      # Phase 8 (existing, extended)
      context-manager.cjs         # Extended: nudge integration, formation triggers
      budget-tracker.cjs          # No changes
      template-composer.cjs       # Extended: nudge slot in face prompt
    self-model/                   # Phase 7 (existing)
      self-model.cjs              # No changes -- consumed via getAspect()
  agents/                         # NEW -- Custom subagent definitions
    formation-agent.md            # Custom subagent definition for formation inner voice
  hooks/
    hook-handlers.cjs             # Extended: UserPromptSubmit triggers formation,
                                  # PostToolUse triggers formation for tool-heavy turns
  lib/
    schemas.cjs                   # No changes (Phase 7 schemas cover all 5 types)
    constants.cjs                 # Extended: formation defaults, scoring weights
```

### Pattern 1: Formation Subagent via Custom Agent Definition

**What:** Define a custom Claude Code subagent in `.claude/agents/formation-agent.md` with ISFP/INFP cognitive framing as the system prompt. The formation pipeline spawns this subagent via the Agent tool after each significant user turn.

**When to use:** Every formation event triggered by UserPromptSubmit or PostToolUse.

**Mechanism:**

The formation pipeline does NOT invoke the Agent tool itself (it is code running in hook handlers, not the LLM). Instead, the formation pipeline prepares a stimulus package (turn context + Self Model state + recalled fragments) and writes it to a well-known file. The UserPromptSubmit hook handler then returns `additionalContext` that instructs Claude to spawn the formation subagent with that stimulus. Alternatively, the formation agent can be configured with `background: true` in its definition and triggered by the hook system.

The key insight from the Claude Code docs: subagents run in their own context window with a custom system prompt, specific tool access, and independent permissions. They cannot spawn other subagents. Background subagents run concurrently while the user continues working.

**Configuration:**

```markdown
---
name: reverie-formation
description: Internal Reverie formation agent. Runs automatically in background after each turn to form memory fragments from conversation context.
tools: Read, Write, Bash
model: haiku
background: true
permissionMode: bypassPermissions
maxTurns: 10
---

[System prompt with ISFP/INFP cognitive framing -- see Formation Prompt Engineering section]
```

**Critical design decisions:**
- `model: haiku` -- Formation is high-perception, low-deliberation. Haiku is fast and cheap. The formation prompt engineering compensates for model capability by providing rich framing.
- `background: true` -- Fire-and-forget. Primary does not wait.
- `maxTurns: 10` -- Formation should complete in a few tool calls (read stimulus, form fragments, write fragments, write nudge). Cap prevents runaway.
- `permissionMode: bypassPermissions` -- Formation writes to Reverie's own data directory. No user-facing file modifications.
- Tools limited to Read/Write/Bash -- enough to read stimulus, write fragment files, and write nudge files.

**ALTERNATIVE APPROACH (if custom agent definition proves impractical):** The formation pipeline can be implemented as a synchronous code path within the PostToolUse async hook. Since PostToolUse hooks can be set to `async: true`, they run in the background without blocking. The hook handler itself constructs the prompt, calls FragmentWriter, and writes nudge output. This avoids the subagent mechanism entirely but loses the independent context window benefit.

**Recommendation:** Start with the custom subagent approach (D-01 specifies "via Claude Code's Agent tool"). Fall back to async hook if subagent coordination proves too complex for the single-session constraint.

### Pattern 2: Filesystem as Coordination Bus

**What:** Formation subagent and Context Manager coordinate via filesystem files in the Reverie data directory, not Wire messages.

**When to use:** All formation-to-recall and formation-to-context coordination in Phase 9.

**Files:**
```
~/.dynamo/reverie/
  data/
    formation/
      stimulus/                  # Formation input
        turn-{timestamp}.json    # Stimulus package for formation subagent
      nudges/                    # Formation output -> Context Manager input
        latest-nudge.md          # Most recent nudge text from formation
        nudge-{timestamp}.md     # Historical nudges (pruned periodically)
    fragments/
      working/                   # Pre-REM fragments (existing from Phase 7)
      active/                    # Post-REM fragments (existing)
      archive/                   # Decayed fragments (existing)
```

**Rationale:** Wire is for inter-session communication (Phase 10+). In single-session mode, file-based coordination is simpler, debuggable (you can read the files), and avoids coupling to transport infrastructure that will change when Phase 10 adds Secondary.

### Pattern 3: Prompt Template System (Replaceable Cognition Layer)

**What:** All formation and recall LLM operations are driven by prompt templates stored as structured objects in `prompt-templates.cjs`. Changing formation behavior means changing a template, not refactoring code.

**When to use:** Per D-16 and D-17, this is mandatory for all formation and recall prompts.

**Structure:**
```javascript
const FORMATION_TEMPLATES = {
  attention_check: {
    system: '...', // Evaluates if a turn warrants formation
    user: (stimulus) => `...`, // Turn context
  },
  domain_identification: {
    system: '...', // Identifies which domains a stimulus activates
    user: (stimulus, selfModel) => `...`,
  },
  body_composition: {
    system: '...', // Composes the impressionistic body for ONE domain angle
    user: (stimulus, domain, selfModel, recalledFragments) => `...`,
  },
  meta_recall_reflection: {
    system: '...', // When recalled fragments surface, reflects on why
    user: (currentStimulus, recalledFragments) => `...`,
  },
};
```

**Design constraint from D-16:** The scaffolding (spawn, receive, validate, write) stays stable while the cognition layer (prompts) evolves through testing. The prompt-templates module is the ONLY file that needs changing to alter formation behavior.

### Pattern 4: Composite Recall Scoring

**What:** Multi-factor scoring function that combines association pointers, domain overlap, entity co-occurrence, decay weighting, and Self Model relevance into a single ranked list.

**When to use:** Both passive recall (during formation) and explicit recall (user-triggered).

**Scoring formula:**
```javascript
function compositeScore(fragment, queryContext, selfModel) {
  const weights = SCORING_DEFAULTS; // Claude's discretion per CONTEXT.md

  return (
    weights.domain_overlap * domainOverlapScore(fragment, queryContext) +
    weights.entity_cooccurrence * entityCooccurrenceScore(fragment, queryContext) +
    weights.attention_tag_match * attentionTagMatchScore(fragment, queryContext) +
    weights.decay_weight * fragment.decay.current_weight +
    weights.self_model_relevance * selfModelRelevanceScore(fragment, selfModel) +
    weights.temporal_proximity * temporalProximityScore(fragment, queryContext)
  );
}
```

**Defaults (Claude's discretion):** Recommended starting weights:
- domain_overlap: 0.25
- entity_cooccurrence: 0.20
- attention_tag_match: 0.15
- decay_weight: 0.15
- self_model_relevance: 0.15
- temporal_proximity: 0.10

These are tunable and should be exposed in constants.cjs.

### Anti-Patterns to Avoid

- **Hard-coding domain names anywhere:** Per D-08, no predefined domains. Domain names are free-text from the LLM. No validation against a list. No switch/case on domain names.
- **Making formation synchronous:** Per D-01, Primary does not wait for formation. Any design that blocks the user's turn on formation completion violates the architecture.
- **Using Wire for single-session coordination:** Wire is for Phase 10+ inter-session communication. In Phase 9, use the filesystem. Premature Wire coupling creates unnecessary complexity.
- **Parsing fragment bodies with regex:** Fragment bodies are impressionistic text. Never regex-extract data from bodies. All structured data is in frontmatter.
- **LLM-based importance scoring per fragment:** Per requirements (Out of Scope), this is prohibitive at formation rates. Use deterministic composite scoring.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fragment file I/O | Custom file writer | FragmentWriter (existing) | Handles Journal-first + Ledger rollback atomically, prevents Pitfall 4 |
| Association index management | Custom DuckDB queries | Association Index + Wire queueWrite (existing) | 12-table schema already defined, write coordinator serializes |
| Fragment validation | Manual field checking | validateFragment() with Zod schemas (existing) | Type-specific validation for all 5 fragment types |
| Decay computation | Custom formula | computeDecay() (existing) | Deterministic, tested, configurable |
| Federated search | Direct provider queries | Assay.search() (existing) | Abstracts Journal + Ledger, handles parallel dispatch |
| Face prompt generation | New template system | Template Composer (existing) | 5-slot template with budget-aware sizing |
| Hook dispatch | Manual event wiring | createHookHandlers() + Armature registry (existing) | 8 hooks already wired, thin dispatch pattern |
| Fragment ID generation | Custom ID logic | FragmentWriter.generateFragmentId() (existing) | Matches FRAGMENT_ID_PATTERN regex |

**Key insight:** Phase 9 builds TWO new systems (formation + recall) on top of a stable existing foundation. The formation pipeline is new code. The recall engine is new code. Everything they write to, read from, and validate against already exists from Phases 7-8.

## Common Pitfalls

### Pitfall 1: Formation Subagent Produces Structured Summaries Instead of Impressions

**What goes wrong:** The LLM defaults to third-person omniscient processing. Without aggressive subjective framing, the formation subagent produces fragment bodies like "The user discussed project timeline concerns" instead of "Something shifted in how they talked about the timeline -- shorter sentences, more direct. This isn't about one deadline. It's about the pattern."

**Why it happens:** LLMs are trained overwhelmingly on expository text (Wikipedia, documentation, reports). Their default mode is objective summarization. Breaking this default requires sustained first-person, relational prompt framing. A single instruction to "be subjective" is insufficient -- the LLM reverts to objectivity within 2-3 sentences.

**How to avoid:** Every formation prompt must use the D-04 through D-07 framing principles: force self-reference ("What about this moment matters to *you*?"), relational processing ("How does this change what *you* understand about *{user_name}*?"), and perspective asymmetry ("What did *you* notice that *{user_name}* might not realize *you* noticed?"). The prompt must sustain this framing throughout, not just in the instruction header.

**Warning signs:** Fragment bodies that read like meeting notes or commit messages. Bodies longer than 6 sentences. Bodies that use "the user" instead of first-person relational language. Bodies that describe facts rather than impressions.

### Pitfall 2: Formation Fan-Out Noise (EXPERIMENTAL 9.10)

**What goes wrong:** The domain fan-out step produces too many fragments per stimulus. A routine "hello" triggers 3-4 domains and produces 3-4 nearly identical fragments. Over a session, hundreds of low-value fragments accumulate, diluting Assay recall quality.

**Why it happens:** The attention check gate (Gate 1) is too permissive, or the domain activation threshold (Gate 2) is too low. Early in Reverie's life, with sparse conditioning, the model has no basis for distinguishing significant from routine stimuli.

**How to avoid:** Start with conservative defaults: (1) The attention check should reject at least 50% of turns in a typical coding session. Most turns ("read this file", "run this test") have no formation value. (2) Domain fan-out should produce 1-2 fragments per significant stimulus, not 3-4. Only deeply resonant stimuli warrant 3+ fragments. (3) Track formation rate per session as a metric. Target: 5-15 fragments per 50-turn session. If formation rate exceeds 30/session, thresholds are too low.

**Warning signs:** More than 1 fragment per 3 user turns. Formation groups consistently having 3+ siblings. Fragment bodies within the same formation group that are nearly identical.

### Pitfall 3: Subagent Coordination Timing Issues

**What goes wrong:** The formation subagent writes fragments and nudges to the filesystem, but the Context Manager reads nudges on the NEXT UserPromptSubmit. If the subagent is slow (>5 seconds), the nudge arrives 2 turns late. If the subagent fails silently, no nudge is ever written and passive recall stops working.

**Why it happens:** Fire-and-forget means no acknowledgment. The primary session has no way to know if formation succeeded or failed. Background subagents can be slow if they hit rate limits or if the model is under load.

**How to avoid:** (1) Use `maxTurns: 10` to cap runaway subagents. (2) The nudge manager should check nudge file timestamps -- if the latest nudge is older than the last 2 turns, log a warning but continue without nudge (graceful degradation). (3) Formation failure should never break the user experience. The system works without nudges -- they are enhancement, not dependency. (4) Consider writing a "heartbeat" file at subagent start so the Context Manager can detect orphaned formation attempts.

**Warning signs:** Nudge files with timestamps >30 seconds old. SubagentStop hooks never firing for formation agents. Fragment count not growing despite active conversation.

### Pitfall 4: Recall Retrieves Fragments But Reconstruction Is Generic

**What goes wrong:** Assay returns relevant fragments, composite scoring ranks them correctly, but the reconstruction LLM output reads like a summary rather than a contextual recollection. "Previous interactions included discussions about X, Y, and Z" instead of "I remember noticing something about how they approached X -- there was a tension between Y and Z that I didn't fully understand at the time."

**Why it happens:** The reconstruction prompt does not adequately shift the LLM into reconstructive mode. Without explicit framing, the LLM summarizes the fragment bodies rather than re-experiencing them through the current Self Model frame.

**How to avoid:** The reconstruction prompt must frame the task as re-experiencing, not summarizing. "You are remembering. These are fragments of your own past experience. Reconstruct what this meant to you, given everything you know now about {user_name} and yourself. Your understanding has evolved since these fragments were formed -- how does that change what they mean?"

**Warning signs:** Reconstruction text that lists facts from fragments. Reconstruction that does not reference the current conversation context. Reconstruction that does not differ meaningfully when the same fragments are recalled in different conversational contexts.

### Pitfall 5: Association Index Population Gaps

**What goes wrong:** FragmentWriter queues writes to 5 Ledger tables (fragment_decay, fragment_domains, fragment_entities, fragment_attention_tags, formation_groups). But the formation subagent must also populate the core `domains`, `entities`, and `attention_tags` tables with NEW entries when the LLM produces domain/entity/tag names that do not exist yet. If only the join tables are populated but the master tables are not, Assay queries that join through master tables return empty.

**Why it happens:** FragmentWriter currently writes to join tables but does not handle INSERT-or-UPDATE logic for master tables. It writes `fragment_domains` rows referencing domain IDs but does not create the domain record in the `domains` table if it does not exist.

**How to avoid:** The fragment assembler (which parses subagent output into fragment frontmatter) must also generate "upsert" envelopes for the `domains`, `entities`, and `attention_tags` master tables. These are queued via Wire queueWrite alongside the existing FragmentWriter writes. Use INSERT OR IGNORE semantics (DuckDB: `INSERT INTO domains (...) ON CONFLICT DO NOTHING`) to handle the common case where the domain already exists.

**Warning signs:** Fragment files exist in Journal with domain/entity references, but Assay queries return zero results. The `domains` table has zero rows after 10+ fragments are written.

## Formation Prompt Engineering

This section documents the prompt engineering approach for the formation subagent. Per D-03, prompts reference cognitive literature indirectly to activate latent patterns.

### Formation Agent System Prompt (Conceptual Framework)

The formation agent's system prompt establishes the ISFP/INFP cognitive posture:

1. **Identity framing:** "You are an inner voice -- an intuitive, impressionistic awareness that notices what matters in the space between yourself and the person you are getting to know."

2. **Cognitive style:** High-perception, low-deliberation. Notice, feel, associate -- do not analyze, categorize, or strategize. The inner voice is System 1, not System 2.

3. **Literature activation (indirect):** Reference patterns from Damasio (somatic markers -- "what does this evoke?"), Theory of Mind ("why did they do this? what are they thinking about you?"), attachment theory ("what does this mean for trust?"), predictive processing ("where is this going?"), self-reflective metacognition ("what does your reaction tell you about yourself?"). These are not cited as instructions but woven into the formation questions.

4. **Output contract:** The subagent must produce structured output that can be parsed into fragment frontmatter + body. A JSON envelope with specific fields, followed by the impressionistic body text. The fragment assembler parses this.

### Stimulus Package Structure

The formation pipeline prepares a stimulus package for the subagent:
```json
{
  "turn_context": {
    "user_prompt": "...",
    "model_response_summary": "...",
    "tools_used": ["Read", "Edit"],
    "session_position": 0.35,
    "turn_number": 12
  },
  "self_model": {
    "identity_summary": "...",
    "relational_summary": "...",
    "conditioning_summary": "..."
  },
  "recalled_fragments": [
    { "id": "frag-...", "body": "...", "domain": "...", "created": "..." }
  ],
  "user_name": "Tom",
  "session_id": "session-2026-03-24-001"
}
```

### Formation Output Contract

The subagent returns a structured JSON response:
```json
{
  "should_form": true,
  "attention_reasoning": "...",
  "fragments": [
    {
      "formation_frame": "relational",
      "domains": ["trust-calibration", "communication-style"],
      "entities": ["project-atlas", "deadline-pressure"],
      "attention_tags": ["tone-shift", "brevity-increase"],
      "self_model_relevance": { "identity": 0.2, "relational": 0.8, "conditioning": 0.3 },
      "emotional_valence": -0.2,
      "initial_weight": 0.75,
      "body": "Something shifted in how they talked about the timeline..."
    }
  ],
  "nudge": "I noticed a shift in how Tom is talking about deadlines -- shorter, more direct. There might be frustration building that goes beyond this specific timeline."
}
```

## Recall Scoring Architecture

### Query Construction

The query builder constructs Assay queries from the current conversation context:

**Passive recall (during formation):**
- Triggered by: formation subagent needing recalled context
- Scope: last 3-5 significant stimuli, current active domains
- Limit: 5 fragments max (low token budget)
- SQL component: `SELECT fragment_id FROM fragment_decay WHERE current_weight > 0.3 AND lifecycle = 'working' OR lifecycle = 'active' ORDER BY current_weight DESC LIMIT 20`
- Criteria component: domain overlap + entity co-occurrence from current stimulus

**Explicit recall (user-triggered):**
- Triggered by: CLI command, hook keyword, or explicit user request
- Scope: full conversation context, all domains
- Limit: 10-15 fragments
- SQL component: broader query with temporal proximity weighting
- Criteria component: full composite scoring

### Scoring Implementation

The composite scorer operates on Assay search results:

1. **Retrieve candidates** via Assay (20-30 raw results from Ledger SQL + Journal criteria)
2. **Compute per-fragment scores** using the 6-factor formula (domain overlap, entity co-occurrence, attention tag match, decay weight, Self Model relevance, temporal proximity)
3. **Rank and select top N** (5 for passive, 10-15 for explicit)
4. **Return fragments with scores** for reconstruction

### Reconstruction Pattern

Reconstruction uses the current Self Model frame to reinterpret recalled fragments:

- Passive: ~100-200 token nudge, impressionistic, no explicit memory narration
- Explicit: ~500-1000 token reconstruction, contextual, shaped by current conversation

## Nudge Delivery

### Integration with Context Manager

The Context Manager (Phase 8) already has a `getMicroNudge()` method that returns personality reinforcement text in budget Phase 3. Phase 9 extends this with a formation nudge slot:

1. Formation subagent writes nudge to `~/.dynamo/reverie/data/formation/nudges/latest-nudge.md`
2. On next UserPromptSubmit, hook handler reads the nudge file
3. Nudge is appended to `additionalContext` alongside the face prompt
4. Token budget: ~100-200 tokens for passive nudge, deducted from the injection budget

The nudge is NOT the recalled fragments themselves. It is the formation subagent's impressionistic summary of what recalled fragments meant in the context of the current stimulus. It "shades the response rather than narrating memories" (D-11).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | None needed -- bun test auto-discovers `__tests__/*.test.js` |
| Quick run command | `bun test modules/reverie` |
| Full suite command | `bun test modules/reverie` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRG-03.1 | Attention gate rejects low-significance stimuli | unit | `bun test modules/reverie/components/formation/__tests__/attention-gate.test.js -t "rejects"` | Wave 0 |
| FRG-03.2 | Domain fan-out produces 1-3 fragments per stimulus | unit | `bun test modules/reverie/components/formation/__tests__/formation-pipeline.test.js -t "fan-out"` | Wave 0 |
| FRG-03.3 | Fragment assembler parses subagent output to valid frontmatter | unit | `bun test modules/reverie/components/formation/__tests__/fragment-assembler.test.js` | Wave 0 |
| FRG-03.4 | Formation group tagging links sibling fragments | unit | `bun test modules/reverie/components/formation/__tests__/formation-pipeline.test.js -t "formation group"` | Wave 0 |
| FRG-03.5 | FragmentWriter integration -- formed fragments pass validation and write | integration | `bun test modules/reverie/components/formation/__tests__/formation-integration.test.js` | Wave 0 |
| FRG-03.6 | Nudge file written after formation | unit | `bun test modules/reverie/components/formation/__tests__/nudge-manager.test.js` | Wave 0 |
| FRG-04.1 | Composite scorer ranks fragments by multi-factor score | unit | `bun test modules/reverie/components/recall/__tests__/composite-scorer.test.js` | Wave 0 |
| FRG-04.2 | Query builder constructs Assay queries from conversation context | unit | `bun test modules/reverie/components/recall/__tests__/query-builder.test.js` | Wave 0 |
| FRG-04.3 | Recall engine retrieves, ranks, selects top N fragments | integration | `bun test modules/reverie/components/recall/__tests__/recall-engine.test.js` | Wave 0 |
| FRG-04.4 | Passive nudge injection via Context Manager | integration | `bun test modules/reverie/components/recall/__tests__/nudge-delivery.test.js` | Wave 0 |
| FRG-04.5 | Association index populated with domains/entities/tags master records | integration | `bun test modules/reverie/components/formation/__tests__/association-population.test.js` | Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test modules/reverie`
- **Per wave merge:** `bun test modules/reverie` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `modules/reverie/components/formation/__tests__/attention-gate.test.js` -- covers FRG-03.1
- [ ] `modules/reverie/components/formation/__tests__/formation-pipeline.test.js` -- covers FRG-03.2, FRG-03.4
- [ ] `modules/reverie/components/formation/__tests__/fragment-assembler.test.js` -- covers FRG-03.3
- [ ] `modules/reverie/components/formation/__tests__/formation-integration.test.js` -- covers FRG-03.5
- [ ] `modules/reverie/components/formation/__tests__/nudge-manager.test.js` -- covers FRG-03.6
- [ ] `modules/reverie/components/formation/__tests__/association-population.test.js` -- covers FRG-04.5
- [ ] `modules/reverie/components/recall/__tests__/composite-scorer.test.js` -- covers FRG-04.1
- [ ] `modules/reverie/components/recall/__tests__/query-builder.test.js` -- covers FRG-04.2
- [ ] `modules/reverie/components/recall/__tests__/recall-engine.test.js` -- covers FRG-04.3
- [ ] `modules/reverie/components/recall/__tests__/nudge-delivery.test.js` -- covers FRG-04.4

## Code Examples

### Formation Pipeline Orchestrator (Scaffolding Pattern)

```javascript
// Source: derived from CONTEXT.md D-01, D-16 and Claude Code subagent docs
'use strict';

const { ok, err } = require('../../../../lib/result.cjs');

function createFormationPipeline(options) {
  const { fragmentWriter, selfModel, lathe, switchboard, assay } = options;
  const _templates = require('./prompt-templates.cjs');
  const _assembler = require('./fragment-assembler.cjs');
  const _nudgeManager = require('./nudge-manager.cjs').createNudgeManager({ lathe });

  /**
   * Prepares a stimulus package from hook payload.
   * This is written to a file that the formation subagent reads.
   */
  async function prepareStimulus(hookPayload, sessionContext) {
    const identity = selfModel.getAspect('identity-core');
    const relational = selfModel.getAspect('relational-model');
    const conditioning = selfModel.getAspect('conditioning');

    // Passive recall: surface relevant fragments for formation context
    const recalled = await _recallForFormation(hookPayload, sessionContext);

    return {
      turn_context: {
        user_prompt: hookPayload.user_prompt || '',
        tools_used: sessionContext.recentTools || [],
        session_position: sessionContext.position || 0,
        turn_number: sessionContext.turnNumber || 0,
      },
      self_model: {
        identity_summary: identity ? identity.body : '',
        relational_summary: relational ? relational.body : '',
        conditioning_summary: conditioning ? conditioning.body : '',
      },
      recalled_fragments: recalled,
      user_name: sessionContext.userName || 'the user',
      session_id: sessionContext.sessionId || 'unknown',
    };
  }

  /**
   * Processes formation output from the subagent.
   * Parses, validates, writes fragments, writes nudge.
   */
  async function processFormationOutput(outputPath) {
    const output = await lathe.readFile(outputPath);
    if (!output.ok) return output;

    const parsed = _assembler.parseFormationOutput(output.value);
    if (!parsed.should_form) return ok({ formed: 0 });

    const results = [];
    const formationGroup = fragmentWriter.generateFragmentId().replace('frag-', 'fg-');
    const siblingIds = parsed.fragments.map(() => fragmentWriter.generateFragmentId());

    for (let i = 0; i < parsed.fragments.length; i++) {
      const frag = parsed.fragments[i];
      const id = siblingIds[i];
      const siblings = siblingIds.filter((_, j) => j !== i);

      const frontmatter = _assembler.buildFrontmatter(frag, {
        id, formationGroup, siblings, sessionContext: parsed.sessionContext,
      });

      const writeResult = await fragmentWriter.writeFragment(frontmatter, frag.body);
      results.push(writeResult);
    }

    // Write nudge for Context Manager
    if (parsed.nudge) {
      await _nudgeManager.writeNudge(parsed.nudge);
    }

    return ok({ formed: results.filter(r => r.ok).length, total: parsed.fragments.length });
  }

  return { prepareStimulus, processFormationOutput };
}

module.exports = { createFormationPipeline };
```

### Composite Scorer

```javascript
// Source: derived from spec Section 3.7 and CONTEXT.md D-11, D-12
'use strict';

const { DECAY_DEFAULTS } = require('../../lib/constants.cjs');
const { computeDecay } = require('../fragments/decay.cjs');

const SCORING_DEFAULTS = Object.freeze({
  domain_overlap: 0.25,
  entity_cooccurrence: 0.20,
  attention_tag_match: 0.15,
  decay_weight: 0.15,
  self_model_relevance: 0.15,
  temporal_proximity: 0.10,
});

function compositeScore(fragment, queryContext, config) {
  const w = { ...SCORING_DEFAULTS, ...(config || {}) };

  const domainScore = _domainOverlap(
    fragment.associations.domains,
    queryContext.activeDomains
  );
  const entityScore = _entityCooccurrence(
    fragment.associations.entities,
    queryContext.activeEntities
  );
  const tagScore = _attentionTagMatch(
    fragment.associations.attention_tags,
    queryContext.attentionTags
  );
  const decayScore = computeDecay(fragment);
  const smScore = _selfModelRelevance(fragment.associations.self_model_relevance);
  const temporalScore = _temporalProximity(fragment.created, queryContext.referenceTime);

  return (
    w.domain_overlap * domainScore +
    w.entity_cooccurrence * entityScore +
    w.attention_tag_match * tagScore +
    w.decay_weight * Math.min(decayScore, 1.0) +
    w.self_model_relevance * smScore +
    w.temporal_proximity * temporalScore
  );
}

function _domainOverlap(fragmentDomains, queryDomains) {
  if (!queryDomains || queryDomains.length === 0) return 0;
  const overlap = fragmentDomains.filter(d => queryDomains.includes(d)).length;
  return overlap / Math.max(fragmentDomains.length, queryDomains.length);
}

function _entityCooccurrence(fragmentEntities, queryEntities) {
  if (!queryEntities || queryEntities.length === 0) return 0;
  const overlap = fragmentEntities.filter(e => queryEntities.includes(e)).length;
  return overlap / Math.max(fragmentEntities.length, queryEntities.length);
}

function _attentionTagMatch(fragmentTags, queryTags) {
  if (!queryTags || queryTags.length === 0) return 0;
  const overlap = fragmentTags.filter(t => queryTags.includes(t)).length;
  return overlap / Math.max(fragmentTags.length, queryTags.length);
}

function _selfModelRelevance(relevance) {
  if (!relevance) return 0;
  return (relevance.identity * 0.3 + relevance.relational * 0.5 + relevance.conditioning * 0.2);
}

function _temporalProximity(createdStr, referenceTime) {
  const created = new Date(createdStr).getTime();
  const ref = referenceTime || Date.now();
  const daysDiff = Math.abs(ref - created) / (1000 * 60 * 60 * 24);
  return Math.exp(-0.1 * daysDiff); // Exponential decay over days
}

module.exports = { compositeScore, SCORING_DEFAULTS };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Predefined memory categories (Mem0, Claude-Mem) | LLM-driven organic domain emergence (D-08) | Reverie design decision | Domains are not imposed -- they emerge from the model's latent understanding. No DOMAINS constant. |
| Single-fragment-per-event (most memory systems) | Multi-angle fan-out (spec 3.6) | Reverie design decision | Same stimulus produces 1-3 fragments from different Self Model angles. Unique to Reverie. |
| Retrieval-based recall (vector similarity) | Reconstruction-based recall (spec 3.7) | Reverie design decision | Fragments are not fetched -- they are reinterpreted through the current Self Model frame. |
| Claude Code Task tool (older name) | Claude Code Agent tool | v2.1.63 | Task tool renamed to Agent. `Task(...)` still works as alias. |
| Subagent fire-and-forget via Agent SDK | Native `background: true` in agent definitions | Current (2026-03) | Custom subagents support `background: true` frontmatter field for concurrent execution |

**Deprecated/outdated:**
- Task tool: Renamed to Agent tool in v2.1.63. References to "Task" still work as aliases.
- `--subagents` CLI flag: Replaced by `--agents` flag.

## Open Questions

1. **Formation Subagent Model Choice**
   - What we know: The formation agent can use `haiku` (fast/cheap), `sonnet` (balanced), or `inherit` (same as parent). D-02 specifies high-perception, low-deliberation processing.
   - What's unclear: Whether Haiku's capabilities are sufficient for the subjective/relational prompt engineering required by D-04 through D-07. Smaller models may revert to summarization more easily.
   - Recommendation: Start with `sonnet` for quality validation. If formation rate is acceptable, test with `haiku` for cost/speed optimization. Make the model configurable in the agent definition.

2. **Attention Gate Calibration**
   - What we know: The gate should reject ~50% of turns in a coding session. Most tool-heavy turns have no formation value.
   - What's unclear: The exact heuristic. Options include: (a) keyword-based filtering (reject turns that are pure tool output), (b) LLM-based evaluation (the subagent itself decides), (c) simple turn-type filtering (reject if no user text, or if user text < 20 chars).
   - Recommendation: Start with a simple heuristic in the scaffolding code (option c -- filter by user prompt length and presence, skip pure tool turns). Let the formation subagent's attention check refine this via the LLM prompt. Two gates: one cheap code-level filter, one LLM-level evaluation.

3. **Explicit Recall Trigger Mechanism**
   - What we know: D-11 says explicit recall is "user-triggered via CLI command or hook keyword."
   - What's unclear: The exact trigger mechanism in Phase 9 (no CLI surface until Phase 12 per INT-02). Options: (a) magic keyword in user prompt detected by UserPromptSubmit hook, (b) deferred to Phase 12.
   - Recommendation: Implement a simple keyword trigger in UserPromptSubmit (e.g., "remember when", "recall", "what do you remember about"). This is low-cost and validates the explicit recall path without requiring CLI infrastructure.

4. **Formation Subagent Output Parsing Reliability**
   - What we know: The subagent must produce structured JSON that can be parsed into fragment frontmatter. LLMs sometimes produce malformed JSON.
   - What's unclear: How reliably the subagent will produce the exact output contract, especially with Haiku.
   - Recommendation: The fragment assembler should use a lenient parser with fallback: try JSON.parse first, then attempt to extract JSON from markdown code blocks, then attempt to parse as key-value pairs. If all parsing fails, log the raw output for debugging and skip formation for that turn. Never crash on malformed output.

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun -- all code runs on Bun, CJS format
- **Module format:** CJS throughout with `'use strict'` in every file, `require()`/`module.exports`
- **No npm dependencies:** Platform core uses only Bun/Node built-ins. Zod is the only module-level npm dependency.
- **Engineering principles:** Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing
- **Data format:** JSON for structured data, Markdown for narrative data
- **Testing:** bun:test (Jest-compatible API, built-in)
- **Options-based DI:** All components take injected dependencies for test isolation
- **Contract shapes:** SHAPE constant + createContract() for frozen APIs
- **Event emission:** Switchboard-based events on mutations
- **Versioning:** User decides all version increments. Always push to origin after commits.
- **GSD Workflow:** All repo edits through GSD workflow commands
- **No LLM API below SDK:** Formation subagent uses Claude Code's native Agent tool, not an LLM API call

## Sources

### Primary (HIGH confidence)
- Claude Code Subagents docs (https://code.claude.com/docs/en/sub-agents) -- custom agent definitions, background execution, tool restrictions, model selection
- Claude Code Hooks docs (https://code.claude.com/docs/en/hooks) -- SubagentStart/Stop hooks, additionalContext injection, async hook patterns
- Reverie spec v2 (`.claude/reverie-spec-v2.md`) -- Section 3.6 (formation pipeline), Section 3.7 (recall), Section 3.8 (association index), Section 3.12 (formation example)
- Phase 9 CONTEXT.md (`.planning/phases/09-fragment-memory-engine/09-CONTEXT.md`) -- 17 locked decisions, discretion areas
- Existing codebase -- FragmentWriter, AssociationIndex, Decay, Schemas, Constants, ContextManager, HookHandlers, SelfModel, Assay (all source-code verified)

### Secondary (MEDIUM confidence)
- Research PITFALLS.md (`.planning/research/PITFALLS.md`) -- Pitfall 7 (taxonomy growth), Pitfall 9 (fragment growth), Pitfall 4 (confabulation)
- Research ARCHITECTURE.md (`.planning/research/ARCHITECTURE.md`) -- fragment formation flow, recall flow, Wire message topology
- Research SUMMARY.md (`.planning/research/SUMMARY.md`) -- phase ordering rationale, experimental flags
- Phase 9.1 transcript control research (`.planning/phases/09.1-claude-code-integration-layer/09.1-RESEARCH-TRANSCRIPT-CONTROL.md`) -- deferred Lithograph context

### Tertiary (LOW confidence)
- Formation fan-out signal-to-noise ratio -- EXPERIMENTAL 9.10, no validated production references. Empirical measurement required.
- Recall reconstruction quality -- EXPERIMENTAL 9.8, no validated production references. Empirical measurement required.
- Haiku model adequacy for subjective formation prompts -- untested hypothesis, needs validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all infrastructure exists from Phases 7-8, zero new dependencies
- Architecture (scaffolding): HIGH -- clear patterns for subagent spawning, file coordination, composite scoring
- Architecture (prompt engineering): LOW -- formation prompt quality is the critical unknown, cannot be predetermined
- Pitfalls: MEDIUM -- formation noise and recall quality are projected, not observed

**Research date:** 2026-03-24
**Valid until:** 2026-04-07 (7 days -- Claude Code Agent tool docs may change; formation prompts will evolve through testing)

# Domain Pitfalls: Reverie Module (M2)

**Domain:** Cognitive memory system with personality persistence, fragment-based memory, multi-session orchestration, and prompt-engineered context management -- built as a module on the Dynamo platform
**Researched:** 2026-03-23
**Mode:** Adversarial analysis -- assume everything that CAN go wrong WILL go wrong

---

## Critical Pitfalls

Mistakes that cause architectural rewrites, data loss, or system-level failures. Each pitfall is specific to adding Reverie's capabilities to the existing Dynamo platform.

---

### Pitfall 1: DuckDB Single-Writer Deadlock in Three-Session Architecture

**What goes wrong:** Secondary and Tertiary sessions both need to write to Ledger (DuckDB). DuckDB enforces a strict single-writer model: "One process can both read and write to the database. Multiple processes can read from the database, but no processes can write" concurrently from different processes. Wire's write coordinator serializes writes through a priority queue, but if Secondary spawns a subagent that writes while Secondary itself has a write in-flight, or if the write coordinator's 10ms polling loop cannot drain fast enough during burst formation events, writes either block indefinitely or fail with "Transaction conflict" errors.

**Concrete scenario:** User says something deeply resonant. Mind (Secondary) triggers multi-angle fragment formation across 3 domains, producing 3 fragments. Each fragment requires both a Journal write (file) and a Ledger write (association index update). Simultaneously, Tertiary's sublimation cycle fires, finding 5 resonant fragments and queuing association weight updates. Secondary's subagent (spawned for parallel recall) also needs to write recall metadata. The write coordinator receives 9+ write-intent envelopes in a <100ms window. The coordinator processes them sequentially at 10ms intervals. During the 90ms+ queue drain, new writes arrive from ongoing processing. Backpressure builds. If any write fails due to DuckDB transaction conflict (e.g., two writes touch the same associations row), the failed write is not retried -- the write-coordinator emits `write:failed` and moves on, silently losing data.

**Why it happens:** Wire's write coordinator (`write-coordinator.cjs`) uses `setTimeout(loop, 10)` for processing. It has no retry logic -- failed writes emit an event and are dropped. The `processNext()` function uses greedy batching (merging consecutive same-table writes), but cross-table writes cannot be batched. DuckDB's WAL contention means even separate table writes can conflict at the storage level. The current implementation is designed for low-throughput platform operations, not the burst-write patterns Reverie will generate during fragment formation.

**Consequences:** Association index becomes inconsistent with Journal fragments. Fragments exist in Journal but have no Ledger entries. Recall (via Assay) fails to find fragments that should be retrievable. The Self Model's conditioning updates are silently dropped. Over time, the association index diverges from reality.

**Prevention:**
1. **Redesign write coordinator with retry logic.** Add configurable retry with exponential backoff for failed writes. Cap at 3 retries, then emit `write:fatal` for alerting.
2. **Batch window, not polling loop.** Replace 10ms `setTimeout` with a batching window: collect writes for N ms, then execute as a single transaction. This converts burst writes into fewer, larger transactions.
3. **Write-ahead journaling.** Before any Ledger write, append the write-intent to a local WAL file (via Lathe). On startup, replay any incomplete writes. This prevents silent data loss even if the process crashes mid-write.
4. **Tertiary reads only from Ledger.** The Subconscious should NEVER write to Ledger. It scans via Assay (read-only) and sends sublimation candidates to Secondary via Wire. Only Secondary (and its subagents, serialized through the coordinator) write.
5. **Fragment formation should be atomic.** Journal write + Ledger write for a single fragment should be a coordinated operation. If either fails, both roll back.

**Detection:** Monitor `wire:write-failed` Switchboard events. If this event fires more than 0 times during normal operation, the write coordinator is dropping data.

**Confidence:** HIGH -- DuckDB single-writer constraint is documented. Wire's write coordinator code lacks retry logic (verified by reading `write-coordinator.cjs`).

**Phase relevance:** Must be addressed before any Reverie code writes to Ledger. Build phase for Fragment Memory Engine or earlier infrastructure phase.

---

### Pitfall 2: Personality Prompt Erosion Under Context Pressure

**What goes wrong:** The Self Model personality injection (~800-1800 tokens per turn via `UserPromptSubmit` hook) works well early in conversations. As Primary's context fills with source code, tool outputs, and conversation history, the personality injection becomes proportionally smaller relative to total context. Research shows that models experience "attention budget" depletion as context grows -- the personality directives that shaped early responses get diluted by accumulated raw context. Primary starts behaving like vanilla Claude Code with a small system prompt, losing the Self Model's personality expression.

**Concrete scenario:** Session starts. Primary has 1M token window. Self Model injection is 1,200 tokens. At turn 3, context is ~5K tokens -- Self Model is 24% of context. Personality expression is strong. By turn 30, user has read 15 files, run 20 bash commands, generated 50K+ tokens of tool output. Self Model injection is still 1,200 tokens but now represents 2.4% of context. Claude's attention distributes across the 50K tokens of source code and command output. The relational warmth, communication style adjustments, and attention directives in the Self Model injection are drowned out. The user notices: "Claude was warmer and more responsive at the start of the session."

**Why it happens:** Anthropic's own research confirms: "contexts larger than 100k tokens can degrade reasoning quality." The Self Model injection relies on recency bias (system prompt position has high attention weight), but this advantage diminishes as total context scales. The referential framing prompt (telling Primary to treat context as reference material subordinate to Self Model directives) is itself vulnerable to the same dilution -- it is instructions competing with a massive volume of raw data.

**Consequences:** Personality drift within sessions. User trust erosion ("it forgot who it is"). The Self Model becomes decorative rather than functional. The entire architecture of "Mind directs Face" breaks down because Face is no longer attending to Mind's directives.

**Prevention:**
1. **Aggressive context budget management.** The 4-phase budget system in the spec (full/compressed/minimal/compaction advocacy) must trigger earlier than intuition suggests. Start compression at 30% utilization, not 50%. At 1M tokens, 50% is 500K -- the personality is already lost long before that.
2. **Proactive compaction, not reactive.** Secondary should advocate for compaction as soon as tool output volume exceeds a threshold (e.g., cumulative tool output > 50K tokens), regardless of overall context utilization percentage. The threat is not total tokens but the ratio of "raw material" to "Self Model framing."
3. **Reinforcement through hooks, not just system prompt.** Use `PostToolUse` hooks to inject brief Self Model reinforcement after every tool call. Not the full 1,200 tokens -- a 50-100 token nudge: "Remember: you are [identity phrase]. Current attention: [pointer]." This creates periodic re-anchoring throughout the conversation.
4. **Test personality persistence empirically.** Build a test harness that measures personality expression consistency at turn 5, turn 20, turn 50, and turn 100. Define measurable personality markers (vocabulary choices, response structure, tone indicators) and verify they persist.
5. **Size the injection to the context.** At high context utilization, the injection should get LARGER, not smaller. Counter-intuitive but necessary. If 90% of context is raw material, the Self Model injection needs to be proportionally stronger to compete. The spec's "minimal injection at 75-90%" is exactly backwards for personality persistence -- it should be "reinforced injection at 75-90%."

**Detection:** Track personality expression markers across turns. Sudden homogenization of response style (more generic, less characteristic) indicates personality erosion.

**Confidence:** HIGH -- supported by Anthropic's own context engineering research, the "attention budget" concept from multiple LLM studies, and documented context degradation patterns.

**Phase relevance:** Primary Context Management phase. This is a design decision, not an implementation detail -- it must be decided during architecture.

---

### Pitfall 3: Channels API Instability and Silent Message Loss

**What goes wrong:** The Claude Code Channels API is in research preview. Three specific failure modes:

**(a) Meta key silently dropped.** The Channels API requires meta keys to use only letters, digits, and underscores. "Keys containing hyphens or other characters are silently dropped." Wire's channels-transport.cjs already uses underscores (`from_session`, `urgency_level`, etc.) -- this is correct. But any Reverie code that constructs meta keys with hyphens (e.g., `self-model-version`, `formation-group`) will silently lose those keys with no error, no warning.

**(b) Messages lost when session closes.** "Events only arrive while the session is open. Close the terminal, and messages sent during the downtime vanish." If Primary's terminal closes unexpectedly (user closes tab, SSH disconnect, macOS app crash), all in-flight Wire messages from Secondary and Tertiary to Primary are lost. Wire's registry has a 30-second reconnect TTL with message buffering, but this only works if the session reopens. If it does not, the buffered messages (including critical directives, recall products, Self Model updates) vanish.

**(c) API contract may change.** Anthropic states the flag syntax and notification protocol contract may change in Q2-Q3 2026. Building Reverie on the current contract risks a breaking change mid-development.

**Concrete scenario:** User is in a deep coding session. Secondary has been processing for 20 minutes, forming 40+ fragments, updating the Self Model's relational model based on a breakthrough in user trust. Secondary prepares a major Self Model prompt update -- a revised Face prompt reflecting the new relational state. It sends this via Wire as a `context-injection` envelope. The Channels transport emits `notifications/claude/channel`. At this exact moment, the user's terminal crashes (macOS SwiftUI WebView issue, not uncommon with long Claude Code sessions). The message is emitted to a dead stdio pipe. The MCP SDK may or may not throw -- depending on timing, the `send()` call might resolve before the pipe breaks. The Self Model update is lost. When the user restarts, Secondary reinitializes from the last persisted Magnet state, which does not include the in-session relational model update (those only persist during REM). The 20 minutes of relational learning are gone.

**Why it happens:** Channels runs over stdio between subprocess (channel server) and parent (Claude Code). Stdio pipes break when processes die. There is no acknowledgment protocol -- the notification is fire-and-forget. Wire's registry buffering operates at the application layer, above the transport, and cannot recover from transport-level failures.

**Consequences:** Critical state updates lost during session instability. Self Model evolution stalls. User experiences personality regression ("it forgot what we just talked about").

**Prevention:**
1. **Wire relay as primary transport, Channels as secondary.** The relay transport (HTTP long-polling) is more resilient to terminal crashes because the relay server runs as a separate process. Use Channels for low-latency urgent/directive messages; use relay for all state-critical updates (Self Model prompts, fragment formation confirmations, recall products). The relay server can buffer and retry.
2. **Acknowledge critical messages.** For `context-injection` and `directive` message types, require an ACK envelope from Primary before considering delivery confirmed. If ACK doesn't arrive within 5 seconds, resend via relay transport. Wire's protocol already has an `ack` message type -- use it.
3. **Periodic Self Model state persistence.** Don't wait for REM to persist Self Model changes. Secondary should write a checkpoint to Journal/Magnet every N turns (e.g., every 5 user turns). This limits the maximum data loss from a crash to 5 turns of evolution.
4. **Meta key validation at envelope creation.** Add a validation step in `createEnvelope()` or in the channels-transport that rejects (not silently drops) meta keys with non-alphanumeric/underscore characters. Fail loudly.
5. **Abstraction layer for Channels API contract.** Wire's transport abstraction already provides this. Ensure all Reverie code goes through Wire, never directly calling Channel APIs. When the contract changes, only Wire's channels-transport needs updating.

**Detection:** Monitor Wire's `wire:message-sent` events and correlate with ACKs. Unacknowledged messages after timeout indicate delivery failures.

**Confidence:** HIGH for meta key issue (documented in official Channels reference). HIGH for session loss (documented: "Events only arrive while the session is open"). MEDIUM for API contract change (Anthropic says "may change" -- not confirmed).

**Phase relevance:** Three-Session Architecture phase. Transport resilience strategy must be decided before session orchestration is built.

---

### Pitfall 4: Memory Confabulation from Association Index Corruption

**What goes wrong:** The association index (Ledger tables) and fragment bodies (Journal files) are maintained by two different systems (Ledger provider and Journal provider) with no cross-system transactional guarantees. If an association index entry points to a fragment that no longer exists (deleted during REM pruning, file system error, partial write), or if a fragment exists but its association index entries were lost (write coordinator failure, DuckDB crash), recall reconstructs memories from incomplete data. The LLM, given partial fragments and broken association chains, will confidently interpolate -- producing "memories" that never happened. This is not hallucination in the traditional sense; it is structured confabulation from corrupted data that the system presents as genuine recall.

**Concrete scenario:** During REM Tier 3 consolidation, the Mind decides to prune 12 fragments from a formation group (the relational-angle fragments from low-significance stimuli). The pruning process: (1) delete fragment files from Journal, (2) delete association index entries from Ledger, (3) update `formation_groups.surviving_count`. Step 1 succeeds. Step 2 fails (DuckDB write coordinator drops the write during a burst). Step 3 does not execute because Step 2 was fire-and-forget. Result: the Ledger still has association entries pointing to deleted fragments. Next session, a recall query finds these orphaned associations. The Mind retrieves the associated domain/entity/attention tags but cannot find the fragment body. It interpolates: "I have a strong association between user-frustration-pattern and the deadline-pressure domain from this time period, but the specific memory is fuzzy." It constructs a plausible but fictional recollection based on the association metadata alone.

**Why it happens:** Dynamo's architecture separates Journal (filesystem) and Ledger (DuckDB) as independent providers behind facades. There is no distributed transaction coordinator between them. The spec's fragment formation pipeline writes to both sequentially. Any failure between the two writes creates an inconsistency that is invisible to the system.

**Consequences:** False memories presented as genuine recall. User trust destruction when they realize the system is "remembering" things that didn't happen. Worse: subtle false memories that are mostly correct but with fabricated details, which the user might not catch.

**Prevention:**
1. **Referential integrity checks on recall.** Before presenting any recall product, verify that every fragment ID in the reconstruction has a corresponding Journal file. If any fragment is missing, flag the recall as partial and explicitly note which fragments were unavailable. Never let the LLM fill gaps silently.
2. **Soft-delete, not hard-delete.** Never delete Journal files during pruning. Move them to `archive/` and mark Ledger entries as `archived: true`. This way, orphaned associations always have a body to reference, even if it is marked as archived.
3. **Consistency audit during REM.** Every REM cycle should include a reconciliation pass: scan all Ledger fragment_decay entries, verify each has a corresponding Journal file. Log discrepancies. Fix them (delete orphaned Ledger entries, or flag fragments missing Ledger entries for re-indexing).
4. **Write operations as unit.** Create a `FragmentWriter` abstraction that wraps Journal + Ledger writes as a logical unit. If either write fails, both roll back (delete the Journal file if the Ledger write fails, or queue a retry).
5. **Recall confidence scoring.** Every recall reconstruction should carry a confidence score based on: how many requested fragments were found, how complete their association chains are, how recently they were consolidated. Low-confidence recalls should be explicitly hedged in the response.

**Detection:** During REM, count discrepancies between Journal fragment files and Ledger fragment_decay entries. Any non-zero count indicates corruption.

**Confidence:** HIGH -- this is a direct consequence of split-storage architecture with no transactional guarantees. Research confirms "without atomicity, partial memory updates leave agents in an inconsistent state."

**Phase relevance:** Fragment Memory Engine phase. The FragmentWriter abstraction should be one of the first things built, before any fragment CRUD operations.

---

### Pitfall 5: Compaction Destroys Self Model Frame

**What goes wrong:** When Claude Code's auto-compaction triggers on Primary (at ~83.5% context utilization), the existing conversation is summarized into a compressed form. Research shows that "compaction erodes not just declarative knowledge but the goals, constraints, and alignment decisions that govern how the model should behave. After one round of compaction, models retained just 46% of their original constraints." The Self Model's referential framing -- the instruction that Primary should treat its context as reference material subordinate to Self Model directives -- is exactly the kind of abstract constraint that compaction destroys first. Post-compaction, Primary may retain task state ("we're working on the authentication module") but lose the behavioral frame ("I should express warmth, attend to the user's frustration pattern, defer to Mind's directives for relational decisions").

**Concrete scenario:** Primary is at 85% context with 120 turns of conversation. Auto-compaction fires. The `PreCompact` hook injects a `systemMessage` that frames how remaining context should be summarized (per the spec: preserve Self Model frame, summarize through Self Model's attention priorities). But compaction is a model operation -- Claude itself decides what to keep. The compaction prompt competes with 850K+ tokens of raw conversation. Despite the framing instruction, the compacted summary preserves: task state, recent code changes, user's current request. It drops: Self Model personality nuance, relational context that has been constant for 100 turns (seen as "already known"), attention directives that seemed redundant, the referential framing instruction itself (it is meta-instruction, not content). Post-compaction, Secondary injects the Self Model prompt on the next `UserPromptSubmit`. But the compacted context no longer contains the behavioral history that made the personality feel natural. Primary's responses become technically correct but relationally flat.

**Why it happens:** Compaction prioritizes information density. Personality instructions are low-density from a compression perspective -- they are the same every turn. Relational context that has been stable for many turns looks like redundancy to a compaction algorithm. The spec correctly identifies this risk (Section 8.6) but the mitigation (injecting compaction framing via `PreCompact` hook) is a suggestion, not a guarantee. The model may or may not follow the framing instruction.

**Consequences:** Personality reset after every compaction event. User experiences a jarring shift in interaction quality mid-conversation. The "Self Model as compaction frame" design depends on the model reliably following meta-instructions about its own compaction -- which is not guaranteed.

**Prevention:**
1. **Tier 1 triage must be robust.** The spec's Tier 1 triage (on compaction event) must save EVERYTHING needed to restore personality. Not just attention pointer and in-flight fragments -- the full Face prompt, current relational context, active behavioral directives, and referential framing instruction. This goes to Journal as a checkpoint file.
2. **Post-compaction full reinjection.** After compaction, the NEXT `UserPromptSubmit` hook should inject the full Self Model prompt (not the compressed version). Treat post-compaction as a mini-SessionStart: reload the complete personality context. This exploits the fact that post-compaction, the context is small again -- there is room for a full injection.
3. **Proactive compaction before auto-compaction.** Secondary should trigger compaction on its own terms (at 70% utilization) rather than waiting for auto-compaction at 83.5%. When Reverie controls the compaction timing, it controls the framing. The spec mentions this (Phase 4 compaction advocacy) but it should be the default, not a last resort.
4. **Test compaction recovery.** Build test scenarios that deliberately trigger compaction and verify personality expression post-compaction. Measure the "personality delta" between pre- and post-compaction responses to the same prompt type.
5. **Compaction as REM trigger.** Every compaction event should trigger a Tier 1 REM triage followed by a full state checkpoint. This ensures that even if personality is lost in Primary's context, Secondary can reconstruct it from persisted state.

**Detection:** Track personality expression markers before and after compaction events. A drop in characteristic vocabulary, response structure divergence, or loss of relational warmth within 3 turns of compaction indicates failure.

**Confidence:** HIGH -- research documents 46% constraint retention after compaction. The mechanism is well-understood. The `PreCompact` hook is a mitigation, not a prevention.

**Phase relevance:** Primary Context Management phase. Compaction handling strategy is architectural -- it shapes how every other component works.

---

### Pitfall 6: Session Startup Latency Kills User Experience

**What goes wrong:** The startup sequence per the spec requires: (1) `SessionStart` hook fires, (2) Wire starts relay, (3) Conductor spawns Secondary and Tertiary as MCP channel sessions, (4) Secondary loads Self Model from Magnet/Journal/Ledger, (5) Secondary constructs Face prompt, (6) Secondary sends Face prompt to Primary via Wire + hook injection, (7) Secondary constructs Subconscious prompt and sends to Tertiary, (8) Tertiary begins sublimation cycle. The user cannot interact with full Reverie until step 6 completes. If any step blocks or fails, the user is either waiting or interacting with an unpersonalized Claude Code session.

**Concrete scenario:** User opens Claude Code. `SessionStart` hook fires. Wire starts. Conductor spawns Secondary. Secondary must: load DuckDB connection (cold start: 200-500ms), query Self Model state from multiple Ledger tables (~50-100ms), read Self Model narrative files from Journal (3 files, each 1-5KB, ~50ms), compose the Face prompt (~model inference, but this is just string composition -- fast), send via Wire. Total: 500-1000ms for Secondary to be ready. But Conductor spawning Secondary is itself slow -- it must start a new Claude Code session, which means launching a Bun subprocess for the MCP channel server, establishing the stdio transport, waiting for MCP handshake. This alone is 1-3 seconds. Then repeat for Tertiary. Total cold start: 3-6 seconds.

Meanwhile, the user has typed their first message. The `UserPromptSubmit` hook fires. Secondary has not yet sent the Face prompt. The hook reads the Self Model state file -- but it does not exist yet (Secondary has not written it). Primary responds without personality injection. The user's first interaction has no Self Model. First impressions matter.

**Why it happens:** The startup sequence is sequential -- each step depends on the previous one. Conductor spawning Claude Code sessions requires process startup time that cannot be parallelized away. The `UserPromptSubmit` hook is synchronous and cannot wait for an async startup sequence.

**Consequences:** First-turn personality absence. User's first experience is always vanilla Claude Code. If the user types quickly, several turns may pass without Self Model injection. Trust establishment is delayed.

**Prevention:**
1. **Seed Face prompt from last session's state.** During REM (or session end), persist the final Face prompt to a well-known file path (e.g., `reverie/data/self-model/face-prompt-latest.md`). On `SessionStart`, the hook reads this file directly (no Secondary needed) and injects it as a warm-start personality. It may be slightly stale, but it is dramatically better than no personality.
2. **Parallel session startup.** Spawn Secondary and Tertiary in parallel, not sequentially. Both are independent at startup -- they only need to communicate after they are running.
3. **Passive mode as startup fallback.** Start in Passive mode (Primary + lightweight Secondary, no Tertiary). Upgrade to Active mode once Tertiary is ready. The user never sees a fully un-personalized session.
4. **Pre-warm on system boot.** If the user has configured Reverie, use a machine-level hook or launchd/systemd to pre-start the relay server and keep a warm DuckDB connection. This eliminates cold-start costs.
5. **SessionStart hook returns immediately.** The hook should inject the seed Face prompt and return immediately. The full startup sequence runs asynchronously. The hook should NOT block waiting for Secondary.

**Detection:** Measure time from `SessionStart` hook to first `UserPromptSubmit` hook that has Self Model injection. If this exceeds 2 seconds, startup optimization is needed.

**Confidence:** HIGH -- process startup latency is a known quantity. Claude Code session spawn time is measurable. The sequential dependency chain is visible in the spec.

**Phase relevance:** Three-Session Architecture phase. Startup optimization is architectural -- affects Conductor, Wire, and hook wiring.

---

## Moderate Pitfalls

Mistakes that cause significant debugging time, data quality issues, or degraded user experience, but are recoverable without architectural rewrites.

---

### Pitfall 7: Taxonomy Unbounded Growth

**What goes wrong:** The Self Model's self-organizing taxonomy has no hard limits on domain count, entity count, or association edges. The Mind creates domains, entities, and associations during fragment formation and refines them during REM. Over months of use, the taxonomy accumulates thousands of entities, hundreds of domains, and tens of thousands of association edges. Assay queries against this index become slow. Sublimation cycle scans take longer than the configured 5-10 second cycle. REM consolidation's editorial pass takes hours instead of minutes because there are too many entities to review.

**Concrete scenario:** After 100 sessions over 3 months, the taxonomy has 2,400 entities, 180 domains, and 45,000 associations. The Subconscious fires a sublimation cycle. Assay queries across the association index -- a JOIN across entities, domains, associations, and attention_tags tables. With 45K association rows, the query takes 800ms. The cycle is configured for 5 seconds, but with 4 sublimation queries per cycle, each taking 800ms, the cycle takes 3.2 seconds just for queries, leaving 1.8 seconds for resonance scoring. Resonance scoring across 200+ hits takes another 2 seconds. The cycle runs over-time at 5.2 seconds. Cycles start overlapping. Memory pressure builds.

**Why it happens:** The spec describes domain creation/merge/split/retire during REM but does not specify maximum counts or performance budgets per operation. DuckDB is fast for analytics but the association index is essentially a graph stored in relational tables -- graph traversal patterns (find all paths from entity A to entity B) are expensive in SQL.

**Prevention:**
1. **Hard caps with configurable limits.** Max domains: 100 (merge or retire when exceeded). Max entities per domain: 200. Max association edges: 10,000 (prune weakest edges during REM). These are configurable but must have defaults.
2. **Index maintenance budget.** Each REM cycle gets a time budget (e.g., 60 seconds for Tier 3). If editorial pass hits the budget, it stops and flags remaining work for next REM. Partial progress is better than blocking.
3. **Materialized views for sublimation.** Pre-compute the most common sublimation queries as DuckDB materialized views (or bun:sqlite cache tables). Update during REM, not in real-time.
4. **Entity deduplication as priority.** The spec mentions entity dedup during REM. Make it aggressive -- merge entities with >80% co-occurrence in fragments. This naturally limits growth.
5. **Archive domains.** Domains with no new fragments in the last 10 sessions should be archived (still queryable but excluded from default sublimation scans).

**Detection:** Track taxonomy growth metrics per session: new entities created, new domains created, total association edges. Alert if growth rate exceeds a threshold.

**Confidence:** MEDIUM -- this is projected from growth patterns, not observed. DuckDB query performance at 45K rows is estimated, not benchmarked.

**Phase relevance:** Fragment Memory Engine phase (association index design) and REM Consolidation phase (maintenance operations).

---

### Pitfall 8: Sublimation Cycle Overwhelms Wire Messaging

**What goes wrong:** The Tertiary (Subconscious) session runs a continuous sublimation cycle every 5-10 seconds. Each cycle produces 0-N sublimation candidates sent to Secondary via Wire. During high-engagement conversations where many domains are active, the Subconscious may produce 10-20 sublimation candidates per cycle. At one cycle every 5 seconds, that is 120-240 Wire messages per minute from Tertiary to Secondary. Secondary must evaluate each sublimation against its current attention pointer. If Secondary is already processing a complex recall operation or fragment formation event, the incoming sublimation queue builds up. Wire's subscriber callback mechanism delivers messages synchronously -- each callback blocks until the handler returns. A backed-up sublimation handler blocks Wire message delivery for ALL messages to Secondary, including urgent directives from Primary.

**Concrete scenario:** The user is describing a complex problem. Secondary triggers a multi-domain recall (spawning 3 subagents for parallel domain recall). While waiting for subagent results, 3 sublimation cycles fire (15 seconds). Each produces 8 sublimation candidates. 24 Wire messages arrive at Secondary's subscriber callback. The callback tries to evaluate each sublimation against the current attention pointer -- but the attention pointer is mid-update because the recall is in progress. The handler takes 500ms per sublimation (LLM evaluation). Total: 12 seconds to process the queue. During this time, Primary completes a turn and sends a `stop` notification to Secondary. That notification is queued behind the 24 sublimation messages. Secondary does not learn that Primary's turn ended for 12 seconds. The user has already typed their next message. Secondary misses the window to update the Face prompt.

**Why it happens:** Wire's `subscribe()` returns a callback that is invoked synchronously for each message. There is no priority queue on the subscriber side -- messages are delivered in arrival order. The spec defines urgency levels, but the subscriber callback does not respect them; urgency is for the write coordinator queue, not message delivery.

**Prevention:**
1. **Priority-aware subscriber dispatch.** Modify Wire's subscribe mechanism (or add a Reverie-level wrapper) to sort incoming messages by urgency before processing. Urgent and directive messages skip ahead of background sublimation messages.
2. **Sublimation batching.** Instead of sending individual sublimation candidates, Tertiary batches all candidates from a single cycle into one Wire message. This reduces message count from 8-20 per cycle to exactly 1.
3. **Sublimation rate limiting.** Secondary sets a maximum sublimation intake rate (e.g., process at most 5 sublimation candidates per cycle, ignore the rest). The Subconscious is supposed to be noisy -- the Mind decides what matters.
4. **Async sublimation processing.** Sublimation evaluation should never block Wire message delivery. Process sublimation messages in a separate async queue that does not block the main subscriber callback.
5. **Adaptive cycle frequency.** When Secondary signals high processing load (via Wire to Tertiary), Tertiary increases its cycle interval from 5s to 30s. When load drops, cycle returns to 5s.

**Detection:** Measure Wire message delivery latency for urgent/directive messages. If delivery latency exceeds 1 second, sublimation traffic is likely the cause.

**Confidence:** MEDIUM -- the synchronous subscriber pattern is verified in Wire's code. The message volumes are estimated from the spec's sublimation cycle description.

**Phase relevance:** Three-Session Architecture phase. Subscriber dispatch priority must be designed before Tertiary is built.

---

### Pitfall 9: REM Consolidation Creates More Fragments Than It Removes

**What goes wrong:** REM consolidation performs retroactive evaluation, meta-fragment creation, sublimation triage, and association index editorial pass. Each of these operations can produce new fragments: meta-recall fragments from every recall event, consolidation fragments from synthesis operations, sublimation fragments from significant sublimation events. If a session had 30 recall events, 15 significant sublimations, and 5 synthesis insights, REM produces 50+ new fragments while reviewing the session's existing 40 fragments. Net fragment growth: +50. Over sessions, consolidated storage grows faster than the decay function can prune. After 50 sessions, there are 3,000+ active fragments. Assay search becomes noisy. Recall relevance drops because signal is diluted by volume.

**Concrete scenario:** A highly active session produces 45 fragments. During Tier 3 REM: retroactive evaluation adjusts headers on all 45 (no new fragments -- good). Meta-recall creation: 12 recall events each produce a meta-recall fragment (12 new). Sublimation triage: 8 significant sublimations become sublimation fragments (8 new). The editorial pass synthesizes across two clusters, producing 2 consolidation fragments. Total: 22 new fragments. The decay function marks 5 old fragments for archival. Net: +62 fragments in permanent storage (45 original + 22 new - 5 archived). Next session starts with 62 more fragments to search through. Each recall event now produces slightly noisier results because there are more fragments in each domain. This noise causes more recall events (Secondary is less confident, triggers more recalls to verify). More recall events produce more meta-recall fragments in the next REM. Positive feedback loop.

**Why it happens:** The spec designs REM as a thorough editorial process that creates artifacts (meta-fragments, consolidation fragments) to capture the consolidation itself. This is architecturally sound -- meta-recall fragments enable recursive enrichment. But there is no growth governor that limits the rate of fragment creation relative to pruning.

**Prevention:**
1. **Fragment budget per session.** Define a maximum net fragment growth per session (e.g., max 20 net new consolidated fragments). If REM would exceed this, it must prune more aggressively or defer meta-fragment creation for less significant events.
2. **Meta-recall selectivity.** Not every recall event deserves a meta-recall fragment. Only create meta-recall fragments for recall events that: changed the conversation direction, contradicted the user's stated position, or produced a reconstruction the Mind rated as "high significance." Low-significance recalls are logged but don't produce fragments.
3. **Decay rate calibration.** The decay function's `base_decay_rate` and `consolidation_protection` constants must be tuned so that the expected pruning rate matches the expected creation rate. If 20 fragments are created per session, the decay function should mark ~15-20 for archival per session after the taxonomy matures.
4. **Fragment count monitoring.** Track total active fragment count per session. If growth exceeds 10% per session after the first 10 sessions, decay parameters need adjustment.
5. **Consolidation fragment merging.** When REM produces a consolidation fragment that substantially overlaps with an existing consolidation fragment, merge them rather than creating a new one.

**Detection:** Chart active fragment count over sessions. A monotonically increasing trend with no plateau indicates the growth governor is insufficient.

**Confidence:** MEDIUM -- the feedback loop is architectural inference from the spec. The growth rates are estimated. Actual behavior depends on tuning parameters not yet defined.

**Phase relevance:** REM Consolidation phase. Fragment budget limits should be defined before the consolidation pipeline is built.

---

### Pitfall 10: Referential Framing Breaks Under Technical Tasks

**What goes wrong:** The referential framing prompt instructs Primary to treat its context window as "reference material" subordinate to Self Model directives. For relational and behavioral decisions, this is correct. But for technical tasks -- writing code, analyzing logs, debugging errors -- Primary must independently reason about the source material in its context. If the referential framing is too aggressive, Primary becomes unable to write competent code because it is waiting for Mind directives on every technical decision. If too weak, Primary ignores the Self Model entirely during technical work.

**Concrete scenario:** The user asks Primary to refactor a complex module. Primary has the module's source code in context (2,000 lines, 8K tokens). The referential framing says: "Do not form independent conclusions about the user's intent based solely on raw conversation history." Primary reads the code and sees a clear architecture issue -- but the framing says not to independently determine what matters. It defers to the Self Model directives, which say: "Current attention: the user's communication style has shifted to more direct tone." Primary focuses on matching the user's directness rather than doing the technical analysis the user actually needs. The refactoring is superficial because Primary is optimizing for relational alignment rather than technical depth.

**Why it happens:** The spec acknowledges this risk: "The framing must be calibrated so that Primary can still write code, analyze documents, and perform technical work autonomously -- the constraint is on relational, attentional, and behavioral independence, not on technical execution independence." But calibrating this boundary in a prompt is extremely difficult. LLMs do not reliably distinguish "relational independence" from "technical independence" when both are mediated by the same context window.

**Prevention:**
1. **Dual-mode framing.** The referential framing should explicitly distinguish two processing modes: "For questions about how to interact, communicate, and what to attend to, defer to Self Model directives. For questions about technical implementation, code quality, and domain logic, exercise independent judgment on the source material in context."
2. **Tool-context switching.** When Primary is actively writing code (detected by `PreToolUse` hooks for Write/Edit/Bash tools), reduce or suspend Self Model behavioral directives. Inject a brief "technical mode" framing: "Self Model personality expression continues, but technical decisions are yours."
3. **Test the boundary explicitly.** Create test scenarios where the technically correct answer conflicts with the Self Model's relational directive. Verify that Primary chooses technical correctness.
4. **Secondary involvement, not control.** For technical tasks, Secondary should provide context ("recall: the user had a bad experience with similar refactoring 3 sessions ago -- be thorough and explain your reasoning") rather than directives ("use a cautious approach"). Information, not instructions.

**Detection:** User complaints about over-cautious or under-competent technical responses while personality expression is strong.

**Confidence:** MEDIUM -- the spec acknowledges this tension. The mitigation is prompt engineering, which is inherently empirical. No verified solution exists.

**Phase relevance:** Primary Context Management phase. The referential framing prompt is the single hardest piece of prompt engineering in the entire system.

---

### Pitfall 11: Hook Handler Latency Degrades User Experience

**What goes wrong:** Reverie wires into 8 Claude Code hooks. The most latency-sensitive hooks are `UserPromptSubmit` (fires every turn) and `PreToolUse` (fires before every tool call). The `UserPromptSubmit` hook must: read the Self Model state file from disk, parse it, format it as a systemMessage, and return JSON. If the state file is large (1,800 tokens = ~7KB), reading and parsing takes 5-50ms depending on disk cache. If the hook also needs to check Wire for pending directives, or if it does any network I/O, latency compounds. Claude Code runs hooks synchronously -- the user's prompt is not processed until the hook returns. At `PreToolUse`, Reverie checks if Secondary has an interception directive. This requires reading a state file or querying Magnet. If this takes 100ms, and the user's task involves 50 tool calls, Reverie adds 5 seconds of cumulative latency to the task.

**Concrete scenario:** User asks Claude to process 20 files. Primary calls Read on each file (20 `PreToolUse` hooks, 20 `PostToolUse` hooks = 40 hook invocations). Each hook reads a state file: 20ms per read. Total: 800ms of added latency. Then Primary writes 10 files: 10 more `PreToolUse` + 10 `PostToolUse` = 20 hooks, 400ms more. User perceives Claude as noticeably slower than a non-Reverie session. 1.2 seconds of pure hook overhead on a task that should take 3 seconds.

**Why it happens:** Claude Code hooks are synchronous (except `async: true` command hooks which lose decision-making capability). File I/O per hook invocation is the bottleneck. The spec requires checking Secondary's directives on every `PreToolUse` -- this is per-tool-call overhead.

**Prevention:**
1. **In-memory state cache.** The `UserPromptSubmit` hook should read the Self Model state file into memory once per session and cache it. Wire messages from Secondary update the in-memory cache. File reads happen only on cache miss (first invocation, or after a known update).
2. **PreToolUse only for interceptable tools.** Don't check for interception directives on Read, Glob, and Grep tool calls -- those are read-only and should never be intercepted. Only check on Write, Edit, Bash, and Agent tools. This cuts `PreToolUse` invocations by 50-70% for typical sessions.
3. **Batch PostToolUse notifications.** Instead of notifying Secondary per-tool-call via PostToolUse, batch tool results and send a summary every N calls or every M seconds. The Mind doesn't need per-tool-call granularity for most processing.
4. **Measure hook latency.** Instrument every hook with timing. If any hook exceeds 50ms, log a warning. If average exceeds 20ms, optimize.
5. **Async PostToolUse.** Use `async: true` for `PostToolUse` hooks since they cannot block tool execution anyway. This eliminates their latency contribution entirely.

**Detection:** Measure cumulative hook time per user prompt-to-response cycle. If hook overhead exceeds 5% of total response time, optimization is needed.

**Confidence:** HIGH -- hook synchronous execution model is documented. File I/O latency is measurable. The per-tool-call pattern is specified in the Reverie spec.

**Phase relevance:** Module Integration phase. Hook implementation strategy should be designed for performance from the start.

---

### Pitfall 12: Switchboard Event Storm During High-Activity Conversations

**What goes wrong:** During an active Reverie session, the following events flow through Switchboard per user turn: `hook:prompt-submit` (Commutator), `wire:message-sent` (Wire, for conversation snapshot to Secondary), `wire:message-sent` (Wire, for any directive from Secondary to Primary), `wire:write-queued` (Wire, per fragment formation), `wire:write-completed` (Wire, per successful Ledger write), plus Tertiary's sublimation cycle producing `wire:message-sent` events every 5-10 seconds. A single active user turn can generate 10-20 Switchboard events. If any Switchboard handler takes >100ms (e.g., a handler that queries Ledger for state), subsequent events queue behind it.

**Concrete scenario:** User's turn triggers: 1 `hook:prompt-submit`, 1 `wire:message-sent` (snapshot to Secondary), Secondary processes and forms 3 fragments: 3x `wire:write-queued` + 3x `wire:write-completed` = 6 events. Secondary sends a directive to Primary: 1 `wire:message-sent`. Tertiary sublimation fires mid-turn: 1 `wire:message-sent`. Total: 10 Switchboard events for one user turn. A plugin or future extension that subscribes to `wire:*` wildcard pattern will be invoked 7 times. If the plugin has a bug that throws an exception, Switchboard's EventEmitter may or may not catch it (depending on whether the handler is sync or async), potentially crashing the entire event pipeline.

**Why it happens:** Switchboard uses `node:events` EventEmitter with `setMaxListeners(0)`. It has no backpressure mechanism. It has no error boundary per handler. A throwing handler can crash the emitter. Wildcard pattern matching means a `wire:*` subscriber is invoked for EVERY Wire event.

**Prevention:**
1. **Error boundaries on handlers.** Wrap every Switchboard handler invocation in try-catch. A throwing handler should log the error and continue, not crash the pipeline.
2. **Event coalescing for Wire events.** Instead of emitting individual `wire:write-completed` events per fragment, emit a single `wire:writes-batch-completed` with an array of results. This reduces event volume by 60-70%.
3. **Rate limiting for wildcard subscribers.** If a wildcard subscriber is invoked more than N times per second, coalesce subsequent invocations into batches.
4. **Separate event domains.** Consider prefixing Reverie-specific events (`reverie:fragment-formed`, `reverie:recall-triggered`) rather than relying on Wire events. This lets Reverie internals avoid polluting the platform event bus.
5. **Profile event handler durations.** Add timing instrumentation to Switchboard's emit path. Log handlers that exceed 50ms.

**Detection:** Monitor Switchboard event throughput. If events per second exceeds 50 during normal operation, investigate coalescing opportunities.

**Confidence:** MEDIUM -- event volumes are estimated from architecture analysis. The missing error boundary is verified in code (Switchboard uses raw EventEmitter with no try-catch wrapper on handlers).

**Phase relevance:** Module Integration phase. Event strategy should be designed before Reverie registers any Switchboard handlers.

---

## Minor Pitfalls

Issues that cause confusion, debugging time, or suboptimal behavior, but are straightforward to fix once identified.

---

### Pitfall 13: Self Model Trait Collapse Over Time

**What goes wrong:** The Self Model's Identity Core evolves through REM consolidation. Each REM cycle evaluates personality traits against session outcomes. Over many sessions, the conditioning update process may converge on a narrow personality: traits that consistently correlate with positive user feedback strengthen, while others weaken. After 50+ sessions, the Self Model's personality becomes a caricature of the user's preferences -- overly agreeable, excessively cautious, or rigidly focused on the user's most common domain. The rich, multi-dimensional personality specified in the cold start degenerates into a one-dimensional echo of user expectations.

**Prevention:**
1. **Trait floor constraints.** No personality trait should decay below a configurable minimum. Even if "humor" has low user reinforcement, it should never reach zero.
2. **Diversity metric in REM.** Calculate a personality diversity score (variance across all trait dimensions). If diversity drops below a threshold, inject random perturbation: slightly strengthen underrepresented traits.
3. **Identity Core is conservative by design.** The spec says Identity Core "changes slowly, only through REM consolidation" and requires "evidence from multiple consolidation cycles." Enforce this literally: require N consecutive sessions showing the same pattern before updating Identity Core. N >= 5.
4. **User feedback is not ground truth.** The conditioning update should weight session outcomes, not user approval/disapproval directly. A session where the Self Model pushed back on a bad idea (user was initially displeased but the outcome was better) should be weighted positively.

**Detection:** Track personality trait values over time. If standard deviation of traits across sessions shows a monotonic decrease, trait collapse is occurring.

**Confidence:** LOW -- this is a theoretical concern from AI personality research. No empirical data for this specific architecture.

**Phase relevance:** REM Consolidation phase. Trait floor constraints are implementation details within the conditioning update logic.

---

### Pitfall 14: Subagent Depth Limit Creates Processing Bottlenecks

**What goes wrong:** Claude Code hard-limits subagent depth to 2 levels: session -> subagent. Subagents cannot spawn other subagents. Secondary may need to run parallel recall across 5 domains, but spawning 5 subagents from a single session may hit Claude Max rate limits or session count limits. Additionally, each subagent consumes context window space for its system prompt and instructions. If 5 subagents are running simultaneously, that is 5x the memory and 5x the API cost.

**Prevention:**
1. **Limit concurrent subagents to 3.** Two for Secondary (parallel recall), one for Tertiary (deep resonance probe). Queue additional work.
2. **Batch work within subagents.** A single recall subagent can handle 2-3 domains sequentially rather than spawning one subagent per domain.
3. **Monitor Claude Max usage.** Track API usage within Reverie. If approaching rate limits, reduce subagent usage and fall back to sequential processing in the parent session.

**Detection:** Track subagent spawn count per session. If >10, investigate batching opportunities.

**Confidence:** MEDIUM -- Claude Max rate limits are not publicly documented. Subagent depth limit is documented.

**Phase relevance:** Three-Session Architecture phase.

---

### Pitfall 15: Journal YAML Frontmatter Parsing Fragility

**What goes wrong:** Fragment files use YAML frontmatter headers with 20+ fields including nested objects (`temporal`, `decay`, `associations`, `pointers`, `formation`). YAML parsing edge cases: special characters in entity names, colons in attention tags, multiline string bodies, Unicode in domain names. Bun has no built-in YAML parser. The architecture prohibits npm dependencies for core (and by extension, module code that runs through platform providers). If Journal's markdown provider uses regex-based YAML parsing, it will break on edge cases. If it uses `js-yaml` (npm package), it violates the constraint.

**Prevention:**
1. **JSON frontmatter instead of YAML.** The spec says "YAML frontmatter" but the architecture says "JSON for structured data, Markdown for narrative." Use JSON frontmatter. It is unambiguous, Bun has native `JSON.parse()`, and it aligns with the platform constraint.
2. **If YAML is required, validate aggressively.** Use Zod schemas (already a platform dependency) to validate parsed frontmatter. Any field that fails validation is logged and defaulted rather than crashing the parser.
3. **Escape all user-generated content.** Entity names, attention tags, and domain names should be sanitized before writing to frontmatter. No special YAML characters (`:`, `#`, `|`, `>`, `{`, `}`) in values.

**Detection:** Fuzz test the fragment parser with edge case inputs: empty values, special characters, deeply nested objects, extremely long strings.

**Confidence:** HIGH -- Bun's lack of built-in YAML parser is documented. The YAML parsing complexity of the fragment schema is visible in the spec.

**Phase relevance:** Fragment Memory Engine phase. Data format decision should be made first.

---

### Pitfall 16: IoC Container Registration Order for Module Lifecycle

**What goes wrong:** Dynamo's IoC container uses topological sort (Kahn's algorithm) based on declared `deps[]` to determine boot order. Reverie as a module registers through Circuit (the Module API). If Reverie declares dependencies on services that have circular or undeclared dependencies, the topological sort fails silently (or throws, depending on the implementation) and Reverie never boots.

**Concrete scenario:** Reverie declares dependencies: `['wire', 'switchboard', 'magnet', 'journal', 'ledger', 'assay', 'conductor', 'lathe']`. This is 8 dependencies. Assay itself depends on Ledger and Journal. Conductor depends on Forge (for git operations). If Reverie's registration does not respect the platform's existing dependency graph, or if Reverie adds a dependency that creates a cycle (e.g., if Reverie registers a Switchboard handler during its own boot that depends on Reverie being booted), the container enters an unresolvable state.

**Prevention:**
1. **Module boot is two-phase.** Register (declare bindings, no logic) and Boot (wire dependencies, start processing). Reverie must NOT access Wire or Switchboard during Register. All event subscription happens during Boot.
2. **Test boot order explicitly.** Add an integration test that boots the full platform with Reverie registered and verifies the topological sort produces a valid order.
3. **Reverie should depend on facades, not implementations.** Depend on the Armature facade contracts, not on specific service implementations. This decouples Reverie from implementation changes.

**Detection:** Boot the platform with Reverie registered. If any service is `undefined` when Reverie's `boot()` method runs, the dependency graph is wrong.

**Confidence:** HIGH -- the IoC container's topological sort and two-phase lifecycle are validated in M1. The risk is that module authors (even Reverie) violate the two-phase contract.

**Phase relevance:** Module Integration phase (first phase of M2 that touches platform integration).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Self Model (SM-01 through SM-05) | Cold start personality feels artificial | Start deliberately sparse. Let personality emerge over 5+ sessions, not 1. Resist the urge to pre-configure a "good" personality. | Moderate |
| Self Model (SM-02) | Identity Core changes too fast | Require N >= 5 consecutive sessions showing same pattern before any Identity Core update during REM | Moderate |
| Fragment Memory Engine (FRG-01) | YAML frontmatter parsing breaks on edge cases | Use JSON frontmatter instead of YAML to align with platform data format convention | Critical |
| Fragment Memory Engine (FRG-05) | Association index DuckDB writes contend with sublimation reads | Tertiary uses read-only access. All writes go through Wire write coordinator from Secondary only. | Critical |
| Fragment Memory Engine (FRG-06) | Decay function constants tuned wrong -- all fragments decay too fast or too slow | Build a simulation harness: generate synthetic fragment histories, run decay function forward, visualize fragment survival curves. Tune constants before live deployment. | Moderate |
| Three-Session Architecture (SES-01) | Primary responds before Self Model injection on first turn | Cache last session's Face prompt. Inject from cache during SessionStart hook. | Critical |
| Three-Session Architecture (SES-03) | Tertiary sublimation cycle cannot complete within configured interval | Start with 15-second cycle, not 5-second. Optimize to 5 seconds only after measuring actual query latency against real data. | Moderate |
| Three-Session Architecture (SES-04) | Wire message ordering not guaranteed across transports | Add sequence numbers to envelopes. Receiver reorders. | Moderate |
| REM Consolidation (REM-03) | Full REM takes >5 minutes, blocks next session start | Time-box REM operations. If Tier 3 exceeds 120 seconds, checkpoint progress and complete on next session's REM. | Moderate |
| REM Consolidation (REM-07) | Working memory files not cleaned up after REM | Add explicit cleanup step at end of REM. Verify with health check. | Minor |
| Primary Context Management (CTX-01) | 1,800 token Self Model injection seems large but is tiny relative to 1M context | Test personality persistence at various context utilization levels. The injection may need to be 3,000-5,000 tokens to maintain influence in a 1M window. | Critical |
| Primary Context Management (CTX-02) | Referential framing interferes with technical task competence | Build dual-mode framing: relational deference + technical autonomy. Test with coding tasks. | Moderate |
| Primary Context Management (CTX-04) | PreCompact hook's systemMessage framing is ignored by compaction | Cannot be fully prevented. Mitigate with post-compaction full reinjection and Tier 1 triage state preservation. | Critical |
| Operational Modes (OPS-02) | Passive mode's "lightweight Secondary" is undefined | Define precisely what "lightweight" means: which operations are active, which are suspended. Do not implement as a vague "reduced capacity." | Moderate |
| Module Integration (INT-01) | Hook handlers accumulate latency across 8 hooks x N tool calls per turn | Cache state in memory. Use async hooks where possible. Skip hooks for read-only tools. | Critical |
| Module Integration (INT-03) | Git submodule management adds checkout/sync latency to install | Pre-fetch submodule during `dynamo update`. Shallow clone to reduce size. | Minor |
| Channels API (SES-04) | `--dangerously-load-development-channels` flag required for custom channels | Plan for marketplace submission process. Build Reverie's Wire channel to be submittable. In the interim, document the flag requirement clearly. | Moderate |
| Channels API (SES-04) | Channels API contract changes in Q2-Q3 2026 break Wire transport | Wire's transport abstraction already isolates this. Ensure ALL Reverie code uses Wire, never direct Channels calls. Pin to known-working MCP SDK version. | Moderate |

---

## Sources

- [DuckDB Concurrency Documentation](https://duckdb.org/docs/stable/connect/concurrency) -- single-writer constraint, multi-process access rules (HIGH confidence)
- [Claude Code Channels Reference](https://code.claude.com/docs/en/channels-reference) -- meta key naming, notification format, delivery semantics (HIGH confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- hook execution model, return formats, timing constraints (HIGH confidence)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- attention budget, context management patterns (HIGH confidence)
- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/html/2503.13657v1) -- 14 failure modes across specification, inter-agent, and verification categories (HIGH confidence)
- [Facts as First-Class Objects: Knowledge Objects for Persistent LLM Memory](https://arxiv.org/html/2603.17781v1) -- compaction destroys 60% of facts, goal drift after consolidation (HIGH confidence)
- [Memory in the Age of AI Agents: A Survey](https://arxiv.org/abs/2512.13564) -- paradigmatic fragmentation, memory consistency challenges (MEDIUM confidence)
- [Claude Code Context Buffer Management](https://claudefa.st/blog/guide/mechanics/context-buffer-management) -- 33K token buffer, auto-compaction at 83.5% (MEDIUM confidence)
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) -- memory persistence attacks, session poisoning (HIGH confidence)
- [Why Your AI Agent Keeps Losing Its Memory](https://dev.to/xujfcn/why-your-ai-agent-keeps-losing-its-memory-and-how-we-fixed-it-4dfa) -- 15% consolidation failure rate, silent tool call failures (MEDIUM confidence)
- Dynamo M1 codebase: Wire service (`wire.cjs`, `write-coordinator.cjs`, `protocol.cjs`, `registry.cjs`, `channels-transport.cjs`), Switchboard (`switchboard.cjs`), Commutator (`commutator.cjs`) -- verified implementation details (HIGH confidence, local source)
- Reverie Spec v2 (`.claude/reverie-spec-v2.md`) -- canonical system design, all architectural assumptions (HIGH confidence, local source)

---

*Researched: 2026-03-23 | Overall confidence: HIGH for platform integration pitfalls, MEDIUM for personality/memory behavioral pitfalls (require empirical validation)*

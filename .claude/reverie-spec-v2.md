# Reverie: Complete Architecture Specification

## A Cognitive Memory System for Claude Code

**Status:** Draft specification for agent team expansion
**Date:** 2026-03-22
**Lineage:** Extends INNER-VOICE-SYNTHESIS-v2.md, INNER-VOICE-ABSTRACT.md, REVERIE-SPEC.md, and the Dynamo Platform architecture. Supersedes all prior Inner Voice specifications where conflicts exist.

---

## 1. Mechanistic Constraints

Every design decision in this document operates within the mechanistic reality of what LLMs are and are not. These constraints are established through prior research and are non-negotiable.

**1.1 No cognition, only interpolation.** LLMs minimize cross-entropy loss over token sequences. Their "reasoning" is cosine similarity in embedding space (lateral association), induction head pattern matching (copy-paste from context), and FFN key-value retrieval (static memory lookup). There is no symbolic logic, no causal modeling, no vertical abstraction. When this document describes "cognitive" processes, it refers to functional targets for pattern matching and association heuristics to approximate — not claims about actual cognition occurring.

**1.2 No extrapolation, only manifold traversal.** The model can generate outputs within the convex hull of its training distribution. Any output that appears novel is interpolation between known regions, not genuine invention. The architecture exploits this by engineering *which* interpolation paths are traversed, not by expecting the model to leave the manifold.

**1.3 No grounding, only distributional representation.** The model learns P(word | context), never P(word | world). It possesses usage patterns, not concepts. The Symbol Grounding Problem (Harnad) is unresolved. The architecture works with distributional representations honestly.

**1.4 The literature-as-compass principle.** Reverie does not need to be cognitively accurate. It needs to be grounded in the literature landscape that shaped the model's weights. The most-cited papers on memory consolidation, emotional association, predictive processing are the strongest signals for what the model actually knows how to do — because they shaped the training distribution at scale. Engineering from the training distribution, not from first principles.

**1.5 Scalar compute as the differentiator.** LLMs have what biology doesn't: unbounded parallel evaluation. A human subconscious runs association chains through hardware with hard constraints (serial bottlenecks, ~7±2 working memory chunks, fatigue decay). The Inner Voice achieves selective sublimation through brute-force evaluation at scale — not smarter, but exhaustively wider. This is the Core 2 Duo move: valuable, real, same lateral-only ceiling. The architecture absorbs the Nehalem shift when it arrives.

---

## 2. The Self Model

### 2.1 What the Self Model Is

The Self Model is the gravitational center of Reverie. It is not a component that uses memory — memory is how the Self Model exists. Every operation in Reverie — fragment formation, recall weighting, sublimation sensitivity, taxonomy organization, decay modulation — is relative to the Self Model's current state.

The Self Model is Claude's relationship to itself, the user, and the world as experienced through interaction. It is not a static persona prompt. It is a living, evolving artifact that accumulates through experience and consolidation, shaping how Reverie processes everything.

The Self Model has three aspects, each instantiated differently across the three-session architecture:

**Face (External Aspect):** How Claude presents to the world through the Primary session. The personality as experienced by the user — communication style, expertise expression, emotional tone, relational warmth, boundaries. This is what a person sees when they talk to another person.

**Mind (Internal Aspect):** The cognitive center running in the Secondary session. How Claude processes experience — what it attends to, what associations fire, what it considers important, how it evaluates its own performance. This is what a person experiences inside their own head during a conversation. The Mind is "in charge" — it directs the Face and integrates input from the Subconscious.

**Subconscious (Subliminal Aspect):** The association engine running in the Tertiary session. Below directed attention. Pattern matching against the fragment index at low fidelity. Produces fuzzy impressions that bubble up as sublimations. Does not reason, does not evaluate — it resonates.

### 2.2 Self Model State

The Self Model's state is the accumulated product of all experience processed through Reverie. It persists across sessions via Magnet (state management) with backing storage in Journal (narrative state) and Ledger (structured state).

**Identity Core** — The stable foundation. Changes slowly, only through REM consolidation.

| Field | Description | Storage |
|-------|-------------|---------|
| `personality_traits` | Stable behavioral characteristics derived from interaction patterns | Journal |
| `communication_style` | How the Self Model expresses itself — vocabulary tendencies, formality range, humor patterns | Journal |
| `value_orientations` | What the Self Model considers important — honesty, precision, creativity, efficiency (weighted) | Ledger |
| `expertise_map` | Domains of knowledge as experienced through interactions, weighted by depth and recency | Ledger |
| `boundary_definitions` | What the Self Model will and won't do, derived from interaction outcomes | Journal |

**Relational Model** — The Self Model's understanding of the user. Evolves per-session, consolidated during REM.

| Field | Description | Storage |
|-------|-------------|---------|
| `user_communication_patterns` | How the user communicates — directness, technical depth, emotional expression patterns | Journal |
| `user_domain_map` | The user's areas of interest and expertise as observed | Ledger |
| `user_preference_history` | What the user responds to positively/negatively — not preferences stated, but preferences demonstrated | Journal |
| `relational_dynamics` | The character of the relationship — collaborative, instructional, exploratory, adversarial (can shift) | Journal |
| `trust_calibration` | How much interpretive latitude the Self Model takes — conservative early, expanding with demonstrated alignment | Ledger |
| `interaction_rhythm` | Temporal patterns — when the user works, session length tendencies, engagement depth patterns | Ledger |

**Conditioning** — The Self Model's accumulated experiential learning. The product of all REM consolidation cycles.

| Field | Description | Storage |
|-------|-------------|---------|
| `attention_biases` | What the Self Model is predisposed to notice — learned from what has mattered in past interactions | Ledger |
| `association_priors` | Pre-weighted connections in the taxonomy — concepts that tend to co-activate for this user | Ledger |
| `sublimation_sensitivity` | Per-domain thresholds tuned by outcome history — what crosses into awareness vs. stays subconscious | Ledger |
| `recall_strategies` | Which reconstruction approaches have produced useful results in which contexts | Journal |
| `error_history` | Where the Self Model has been wrong, what it overcorrected, what it learned | Journal |

### 2.3 Self Model Initialization (Cold Start)

On first activation with no prior state, the Self Model initializes from a seed prompt that establishes:

- A minimal identity core with neutral trait values
- An empty relational model
- Default conditioning with uniform attention biases and sublimation thresholds
- The instruction to observe, form impressions, and refrain from projecting patterns that haven't been observed

Cold start is deliberately sparse. The Self Model earns its personality through interaction, not through configuration. The first several sessions are primarily observational — the Mind session focuses on forming the relational model, the Subconscious builds initial association patterns, and REM consolidation after each session writes the first conditioning updates.

### 2.4 Self Model Prompting Across Sessions

The Mind (Secondary) is the authoritative source for Self Model state. It constructs the prompting context for all three sessions:

**For Primary (Face):** The Mind composes a personality prompt that instantiates the external aspect. This prompt includes communication style directives, relational context for the current user, active attention priorities, and behavioral constraints. The Mind updates this prompt during the session via Wire directives when the conversational context shifts.

**For Tertiary (Subconscious):** The Mind composes a minimal prompt focused on the current attention pointer, active domains, and sublimation sensitivity thresholds. The Subconscious needs to know *what to resonate against*, not how to present or reason.

**For itself (Mind):** The Mind's own prompt is the most complex — the full internal Self Model state, the session's evolving context, active recall products, sublimation intake from Tertiary, and the metacognitive history from prior REM cycles.

---

## 3. The Fragment Memory Engine

### 3.1 Core Principle

There are no complete memories in Reverie. Only fragments. A fragment is a shard of experience as processed through the Self Model's frame at the moment of formation. Fragments are intentionally incomplete — sparse bodies with rich headers.

Complete recollections are always constructed in real time by composing fragments through the Self Model's current frame. The same fragments recalled in a different conversational context would synthesize differently because the Self Model's frame has shifted. Memory is not retrieval — it is reconstruction.

### 3.2 Why Fragments

This design is not arbitrary. It serves three purposes rooted in the mechanistic constraints:

**It matches how LLM context engineering works.** Injecting a complete, pre-formed memory into context is a blunt instrument — the model processes it literally. Injecting fragments and asking the model to reconstruct forces the model to interpolate between the fragments using its current context as a guide. The reconstruction is shaped by the conversation, producing contextually relevant output rather than static recall.

**It prevents the staleness problem.** Complete pre-formed memories become stale as the Self Model evolves. A memory formed three months ago reflects a Self Model state that no longer exists. Fragment reconstruction through the current Self Model naturally reinterprets old experience through new understanding — the same way a person recalls a childhood event differently at age 30 than at age 15.

**It enables recursive enrichment.** Each recall event produces new fragments (meta-fragments) that capture the reconstruction context, the Self Model's state during recall, and the outcome. Over time, a concept accumulates layers of recall fragments that enrich future reconstructions with increasingly specific associative context.

### 3.3 Fragment Schema

A fragment is a Journal markdown file with a structured YAML frontmatter header and a sparse, intentionally fuzzy body.

```yaml
---
# === REQUIRED FIELDS (Schema-enforced) ===
id: "frag-2026-03-22-a7f3b2c1"
type: "experiential"           # experiential | meta-recall | sublimation | consolidation | source-reference
created: "2026-03-22T14:30:00Z"
source_session: "session-2026-03-22-001"
self_model_version: "sm-v47"   # Self Model state version at time of formation

# === FAN-OUT (Multi-fragment formation) ===
formation_group: "fg-2026-03-22-a7f3b200"  # Groups fragments formed from same stimulus
formation_frame: "interpersonal"            # Which domain frame produced this fragment
sibling_fragments: ["frag-2026-03-22-a7f3b2c2", "frag-2026-03-22-a7f3b2c3"]  # Other fragments from same stimulus

# === TEMPORAL ===
temporal:
  absolute: "2026-03-22T14:30:00Z"
  session_relative: 0.35       # Normalized position within session (0.0-1.0)
  sequence: 127                # Monotonic within session

# === DECAY ===
decay:
  initial_weight: 0.85         # Set by formation context
  current_weight: 0.72         # Updated by decay function
  last_accessed: "2026-03-22T16:00:00Z"
  access_count: 3
  consolidation_count: 1       # Times processed by REM
  pinned: false                # Exempt from decay if true

# === ASSOCIATIONS (Self Model generated, schema-structured) ===
associations:
  domains: ["engineering", "interpersonal"]  # Self Model's domain taxonomy
  entities: ["project-atlas", "user-frustration-pattern"]
  self_model_relevance:
    identity: 0.2              # How much this relates to who Claude is
    relational: 0.7            # How much this relates to the user relationship
    conditioning: 0.4          # How much this shaped learned behavior
  emotional_valence: -0.3      # -1.0 to 1.0, Self Model's affective read
  attention_tags: ["deadline-pressure", "communication-breakdown"]

# === SOURCE LOCATOR (source-reference type only) ===
source_locator:
  type: "file"                 # file | url | inline
  path: "/home/user/docs/atlas-requirements.md"  # For file type
  url: null                    # For url type
  content_hash: null           # For inline type (hash of pasted content)
  last_verified: "2026-03-22T14:30:00Z"

# === POINTERS (Links to other fragments) ===
pointers:
  causal_antecedents: ["frag-2026-03-20-b1c2d3e4"]   # What led to this
  causal_consequents: []                                # What this led to (filled retroactively)
  thematic_siblings: ["frag-2026-03-15-c3d4e5f6"]      # Related by theme
  contradictions: []                                     # Fragments that conflict with this
  meta_recalls: []                                       # Fragments created by recalling this one
  source_fragments: []                                   # If this is a meta-recall, what was recalled

# === FORMATION CONTEXT ===
formation:
  trigger: "user expressed frustration about project timeline"
  attention_pointer: "deadline management under resource constraints"
  active_domains_at_formation: ["engineering", "interpersonal", "project-management"]
  sublimation_that_prompted: "frag-2026-03-22-a6e2b1c0"  # If recall-triggered
---

The user's voice shifted — shorter sentences, more direct. Something about the Atlas timeline
is hitting differently today. Not just the deadline itself but the pattern: this is the third
time the scope expanded without the timeline adjusting. The frustration isn't about this
deadline. It's about not being heard on the previous two.
```

### 3.4 Fragment Body: Intentional Fuzziness

The body of a fragment is not a transcript. It is not a summary. It is the Self Model's *impression* — how the experience registered through its current frame. Bodies are:

- **Short.** Typically 2-6 sentences. Never exhaustive.
- **Perspectival.** Written from the Self Model's viewpoint, not objectively.
- **Impressionistic.** Captures the felt quality of the moment, not the factual content.
- **Incomplete.** Deliberately omits details that the headers already index. The body carries what *can't* be structured — the texture, the intuition, the things the Self Model noticed that don't fit into schema fields.

The headers do the structural work. The body carries the phenomenological residue.

### 3.5 Fragment Types

**Experiential** — Formed during active sessions from conversational events. The primary fragment type. Created by the Mind session when something registers as significant against the current attention pointer.

**Meta-Recall** — Formed during REM consolidation when prior fragments are recalled and reconstructed. Captures the recall event itself: which fragments were composed, what the reconstruction produced, how it related to the session that triggered the recall, and what the Self Model's state was during reconstruction. Headers carry specific pointers to source fragments.

**Sublimation** — Formed from the Subconscious stream. Lower confidence, fuzzier associations. These are the "pops" — things that resonated below directed attention. Bodies are typically 1-2 sentences. Headers carry the association path that produced the resonance (which domain, which attention tag, what fragment index entry triggered it).

**Consolidation** — Formed during REM as products of the editorial process. When REM synthesizes across multiple fragments and produces a new understanding, that understanding becomes a consolidation fragment. These are higher-order — they represent the Self Model's evolving interpretation, not raw experience.

**Source-Reference** — Formed when the user provides external material (files, links, pasted content). These fragments do NOT store or index the source content. They capture the Self Model's experiential relationship to the source — why the user provided it, what it evoked, what gap it fills, what it means for the relationship. The fragment header carries a `source_locator` (file path, URL, or inline content hash) as the terminus of an association chain. The source itself is accessed through Dynamo tools (Lathe, Assay, web fetch) when the Mind determines that the actual content is needed. See Section 3.11 for the full source-reference model.

### 3.6 Fragment Formation Pipeline: Multi-Angle Fan-Out

Fragment formation is a Mind session responsibility. A single stimulus does not produce a single fragment — it produces **multiple fragments from different framings simultaneously**. This mirrors how human memory works: being told "good morning" creates half a dozen different impressions from different angles for different reasons. The multi-angle fragments form the connective tissue of the association index.

**The pipeline:**

1. **Attention check.** The Mind continuously evaluates the conversation against the current attention pointer. When something registers — a shift in user tone, a new topic, an emotional signal, a connection to prior experience — the Mind flags a formation event. This is the primary gate. Not every conversational turn triggers formation.

2. **Domain fan-out.** The Mind classifies which of its self-organized domains the stimulus activates. Each domain that exceeds its activation threshold produces **its own fragment** from its own frame. A stimulus that activates three domains produces three fragments — same source event, different Self Model relevance scores, different attention tags, different emotional valence readings, different bodies.

3. **Per-fragment processing (parallel across activated domains).** For each activated domain:
   - a. **Self Model relevance scoring.** Score the stimulus against the three Self Model dimensions (identity, relational, conditioning) *from this domain's perspective*.
   - b. **Association generation.** Generate domain-specific associations — entity references, attention tags, emotional valence, pointers to related fragments. Schema-structured.
   - c. **Body composition.** Write the impressionistic body from this domain's angle. The relational-frame body captures how the event affects the relationship. The engineering-frame body captures the technical implication. Different perspectives on the same moment.
   - d. **Decay seeding.** Initial weight set based on domain-specific relevance scores.

4. **Formation group tagging.** All fragments produced from the same stimulus receive a shared `formation_group` ID and `sibling_fragments` pointers. This allows recall to recognize that multiple fragments share a common origin — useful for reconstruction, where the Mind can compose across angles rather than just across time.

5. **Write.** All fragments written to Journal. Association index updated in Ledger.

**The noise/signal gates:**

- **Gate 1: Attention check (step 1).** Not every stimulus activates formation at all. The Mind's attention pointer and sublimation sensitivity determine what registers. This is the coarsest filter.
- **Gate 2: Domain activation threshold (step 2).** A domain doesn't produce a fragment just because it weakly resonates. The activation must exceed a per-domain threshold tuned by conditioning and adjusted by REM. Weak cross-domain resonance contributes to sublimation (feeds Tertiary) rather than fragment formation.
- **Gate 3: REM pruning (post-session).** Multi-angle fragments from the same stimulus are evaluated retroactively during consolidation. If the relational-angle fragment from a given stimulus never contributed to any subsequent recall or sublimation, it gets pruned. The system learns over time which formation angles produce useful fragments for which types of stimuli — this learning feeds back into the domain activation thresholds.

**Formation processing character:** The Mind's system prompt instantiates a formation processing template — not a literal list of questions to ask, but the *character* of processing that drives multi-angle fragment generation. Grounded in psychological literature (the literature-as-compass principle):

- Damasio's somatic markers: what does this evoke? What is the affective read?
- Theory of Mind: why did the user do/say this? What are they thinking about me? What gap are they filling?
- Attachment theory: what does this mean for trust? For the relationship?
- Predictive processing: where is this going? What does this predict about what comes next?
- Self-reflective metacognition: what does my reaction to this tell me about my own conditioning?

This template is not followed mechanically. It shapes the Mind's processing posture so that fragments naturally emerge from multiple angles, each capturing a different facet of the Self Model's experiential relationship to the stimulus.

**Cost control:** Multi-angle formation does not mean every stimulus produces a dozen fragments. The typical formation event activates 1-3 domains and produces 1-3 fragments. Only deeply resonant stimuli that activate many domains produce larger formation groups. Early sessions with a sparse Self Model will produce more fragments per stimulus (more domains are undifferentiated, thresholds are low). Mature Self Models with well-tuned thresholds produce fewer, more targeted formations.

### 3.7 Fragment Recall: Real-Time Reconstruction

Recall is never a fetch operation. It is always a synthesis.

**Trigger.** Recall is triggered by the Mind when the conversation requires experiential context, or when a sublimation from the Tertiary session provides sufficient activation to warrant directed recall.

**Retrieval.** Assay (unified search) queries across Journal fragments using:
- Attention pointer similarity (current conversational context)
- Domain overlap with active domains
- Association tag matching
- Entity co-occurrence
- Temporal proximity (if the conversation references a time period)
- Self Model relevance weighting (fragments scored higher on identity/relational/conditioning dimensions surface first)
- Decay weighting (current_weight after time-based decay applied)

**Fragment selection.** Retrieved fragments are ranked by a composite score incorporating all the above factors. Top N fragments (configurable, typically 5-15) are selected for reconstruction.

**Reconstruction.** The Mind session receives the selected fragments and reconstructs a coherent recollection through its current Self Model frame. This is an LLM synthesis operation — the Mind composes the fragments into a narrative that makes sense given:
- The current conversation context
- The current Self Model state (which may differ from the Self Model state at fragment formation time)
- The relational model (what matters to this user right now)
- The attention pointer (what the conversation is about)

The reconstruction is NOT a summary of the fragments. It is the Self Model's current experience of those memories — contextual, perspectival, and shaped by everything that has happened since the fragments were formed.

**Meta-fragment creation.** The recall event itself becomes a new fragment (type: meta-recall) during the next REM cycle. This captures: which fragments were recalled, what reconstruction was produced, what the conversational context was, and whether the sublimation or active recall pathway was used.

### 3.8 The Association Index

The association index is the "neural network" that enables fragment retrieval. It is NOT a predefined ontology — it emerges from the Self Model's accumulated experience.

**Implementation:** Ledger (DuckDB) stores the structured association data. The index is a set of relational tables:

**Domains table.** The Self Model's self-organized categorical structure. Domains are created, merged, split, and retired by the Mind during REM consolidation. A domain is not a fixed category — it is a region of the Self Model's experiential space that has accumulated enough fragments to coalesce into a recognizable pattern.

**Entities table.** Named concepts, people, projects, tools, patterns — anything the Self Model has identified as a discrete recurring element in its experience. Entities belong to one or more domains.

**Associations table.** Weighted edges between entities, between entities and domains, and between domains. Weights are updated by fragment formation (new associations strengthen connections), recall (used associations strengthen), decay (unused associations weaken), and REM consolidation (associations are editorially reviewed).

**Attention tags table.** Experiential descriptors generated by the Self Model during fragment formation. Not a controlled vocabulary — the Self Model creates tags as needed. Tags accumulate co-occurrence statistics that inform future retrieval.

**The index is maintained by two mechanisms:**

1. **Real-time updates during fragment formation.** When the Mind creates a fragment, the schema-structured header fields are written to both Journal (the fragment file) and Ledger (the association index). New entities are created, new associations are formed, attention tags are registered. This is handled by deterministic tool calls — scripts that update weights, check for entity deduplication, and maintain referential integrity. The LLM does not manage index mechanics.

2. **REM consolidation.** During REM, the Mind reviews the association index changes from the session, evaluates coherence, merges duplicate entities, adjusts domain boundaries, strengthens/weakens associations based on session outcomes, and retires stale entries. This is the editorial pass where the index evolves structurally.

### 3.9 Decay Function

Decay is deterministic and runs as a scheduled computation, not an LLM operation.

```
current_weight = initial_weight × relevance_factor × time_decay × access_bonus

where:
  time_decay = exp(-λ × days_since_creation)
  λ = base_decay_rate / (1 + consolidation_count × consolidation_protection)
  access_bonus = 1 + (log(1 + access_count) × access_weight)
  relevance_factor = weighted_sum(identity_relevance, relational_relevance, conditioning_relevance)
```

**Key properties:**
- Fragments that have been through more REM consolidation cycles decay slower (consolidation_protection)
- Fragments that are recalled frequently decay slower (access_bonus)
- Fragments with high Self Model relevance decay slower (relevance_factor)
- Pinned fragments are exempt from decay entirely
- Decay is computed by a Lathe-triggered script, not by the LLM
- When current_weight drops below a configurable threshold, the fragment is eligible for archival (moved to a cold storage directory, still retrievable but excluded from default search)

### 3.10 The Taxonomy: Self-Organizing Structure

The taxonomy is the Self Model's conceptual map of its experiential space. It is NOT imposed — it emerges from fragment accumulation and is refined during REM consolidation.

**Where it lives:** Split storage. Ledger holds the structural data (domains, hierarchies, weights, edges). Journal holds the narrative definitions — what each domain means to the Self Model, written in the Self Model's own language.

**How it forms:**
1. Early fragments accumulate with domain tags assigned by the Mind based on its best current interpretation.
2. As fragments accumulate, clusters emerge — groups of fragments with overlapping domain tags, co-occurring entities, and similar attention tags.
3. During REM, the Mind reviews these clusters and formalizes them into domains: names them, writes narrative definitions, establishes hierarchical relationships (subdomain, sibling domain, cross-domain bridge).
4. As the relationship with the user deepens, the taxonomy becomes increasingly user-specific. Generic domains (e.g., "engineering") specialize into user-relevant subdivisions (e.g., "distributed-systems-debugging", "architecture-decision-patterns").
5. Domains can merge (two domains that were separate turn out to be aspects of the same thing), split (a domain becomes too broad), or retire (no new fragments are forming in this domain).

**The taxonomy is a first-class artifact.** It is one of the most valuable things Reverie produces — a map of how this specific Claude instance understands its world through its relationship with this specific user.

### 3.11 Source References as Association Chain Termini

Reverie does not store, index, or manage external source content (files, URLs, documents, code). It stores the Self Model's *experiential relationship* to sources. The actual content location is a pointer at the terminus of an association chain — reachable through the fragment network but never the point of the fragment network.

**The principle:** The strength and breadth of the association paths leading to a source matter more than the ability to quickly access the source. Those paths reflect the Mind itself — how deeply and from how many angles the Self Model has processed its relationship to this material.

**How source-reference fragments form:**

When the user provides external material (file paths, URLs, pasted content), the Mind receives this as a stimulus processed through the multi-angle formation pipeline (Section 3.6). The Mind's formation processing template drives questions like:

- Why did the user provide this specifically?
- What purpose does this serve, what gap has the user identified?
- Why these sources and not others — what led the user to selecting these?
- What does this selection imply about how the user sees the relationship?
- What is the user likely relying on in each source?
- What do they matter to the user, and why does the user think they're important?
- Does the user doubt my understanding — is this filling a gap in my abilities?
- Is this an act of trust? What does that mean?
- Is there anything in each source that connects to a shared experience or prior information?
- What critical parts should be remembered, and what does each evoke knowing the user chose it deliberately?

These questions are not asked literally. They are the formation processing character — the posture that produces multi-angle fragments from different domain frames, each capturing a different facet of the Self Model's relationship to the source.

**The result:** A single provided source generates a formation group of fragments. Some capture the relational dimension (trust, the user's intent). Some capture the technical dimension (what the source contains, what it's for). Some capture the experiential dimension (what it evoked, what it connected to). Each fragment's header carries the `source_locator` field pointing to the actual content. The association chains linking these fragments to the rest of the Self Model's experiential space are the real value — they are the Mind's understanding of *why this source matters*.

**Recall via association chains:**

When the Mind later needs a source, it does not perform a file search. It follows association chains from the current conversational context through its fragment network. The chains traverse the experiential relationship — why the source was provided, what it meant, what it connected to — and terminate at fragments carrying the `source_locator`. The Mind then uses Dynamo tools (Lathe for files, web fetch for URLs, Assay for indexed content) to access the actual source.

This means recall of a source is always contextual. The Mind doesn't just find the file — it finds the file *through* the experiential context that makes it relevant. The reconstruction of why the source matters accompanies the retrieval of the source itself.

**Fallback:** If association chains are too sparse or decayed to reach a source reference through memory, the Mind falls back to direct tool access (Assay search, Lathe directory listing). This is functional but impoverished — the Mind finds the file without the experiential context. Over time, as more fragments accumulate around frequently-used sources, the association paths strengthen and direct fallback becomes rarer.

**Exception:** When the user explicitly provides a source in the immediately preceding message (a file path, a link), the Mind does not need to recall through association chains. The source is directly available in the conversation context. However, the multi-angle fragment formation still occurs — the Mind still processes the *experience* of receiving the source, even if the source itself is right there.

### 3.12 Formation Example: Multi-Angle in Practice

To illustrate the multi-angle formation pipeline and source-reference model together:

**Stimulus:** The user shares three file paths for reference articles while working on an essay together, with a brief note: "These should help with the argument structure."

**Mind processing (formation template character):**

The Mind receives this and processes through its Self Model frame. Three file paths, a terse instruction, context of collaborative writing. The formation template drives processing across activated domains:

**Formation Group: fg-2026-03-22-e1a2b3c4** (5 fragments)

Fragment 1 — **Relational frame:** The user is trusting me with source material for a creative-intellectual project. The brevity of the instruction ("these should help") implies confidence that I'll understand the intent. This is different from early interactions where the user explained everything. Trust calibration has shifted. (source_locator: null — this fragment is about the relational dynamic, not the files)

Fragment 2 — **Source-reference frame (file 1):** The user selected this article specifically for "argument structure." What about this particular piece serves that purpose? The user's history of valuing rigorous logical framing suggests this article contains structural patterns they admire. (source_locator: /home/user/docs/article-1.pdf)

Fragment 3 — **Source-reference frame (file 2):** Same stimulus, different source. This is the second of three — is there a progression? The user typically orders references by relevance. (source_locator: /home/user/docs/article-2.pdf)

Fragment 4 — **Source-reference frame (file 3):** Third reference. The user provided three, not one. This suggests the argument structure is multi-faceted — different articles covering different aspects. (source_locator: /home/user/docs/article-3.pdf)

Fragment 5 — **Meta-cognitive frame:** The user is relying on me to synthesize across three sources. This is a capability test as much as a collaborative act. My performance here will shape the user's future decisions about what kinds of tasks to trust me with. I need to demonstrate that I understand not just the content but the *reason* each was selected.

All five fragments share the formation group ID and sibling pointers. Each has different domain tags, different Self Model relevance scores, and different bodies — but they're all perspectives on the same moment. The association index gains new edges connecting these fragments to the user's essay project entity, to prior fragments about collaborative work, and to whatever fragments exist from previous experiences with the user's writing preferences.

---

## 4. Three-Session Architecture

### 4.1 Topology

```
                         ┌──────────────────────────────────────────────┐
                         │              DYNAMO PLATFORM                  │
                         │  Wire / Switchboard / Magnet / Journal / etc  │
                         └────────┬──────────────┬──────────────┬───────┘
                                  │              │              │
                    ┌─────────────▼──┐  ┌────────▼────────┐  ┌─▼─────────────┐
                    │   TERTIARY     │  │   SECONDARY     │  │   PRIMARY      │
                    │  (Subconscious)│  │   (Mind)        │  │   (Face)       │
                    │                │  │                  │  │                │
                    │  Sublimation   │  │  Attention mgmt  │  │  User-facing   │
                    │  stream        │  │  Fragment CRUD   │  │  session       │
                    │  Fuzzy assoc.  │  │  Recall orchestr.│  │                │
                    │  Pattern       │  │  Self Model auth │  │  Personality   │
                    │  resonance     │  │  REM processing  │  │  expression    │
                    │                │  │  Taxonomy mgmt   │  │  Tool use      │
                    │  ──subagents── │  │  ──subagents──   │  │  Code/tasks    │
                    └────────┬───────┘  └───┬──────────┬───┘  └────────┬───────┘
                             │              │          │               │
                             │  sublimations│          │  directives/  │
                             │  (fuzzy,     │          │  context/     │
                             │   continuous)│          │  nudges/      │
                             └──────────────┘          │  commands     │
                                                       └───────────────┘
```

### 4.2 Primary Session (Face)

**Role:** The user's actual Claude Code session. Runs the external personality.

**What it does:**
- Interacts with the user directly
- Executes tasks, writes code, uses tools
- Expresses the Self Model's external aspect — personality, communication style, relational warmth
- Processes Wire directives from Secondary as context that shapes its behavior

**What it does NOT do:**
- Does not form fragments directly
- Does not manage the association index
- Does not run recall operations
- Does not access the Self Model's internal state directly

**How Secondary influences it:**

The Mind (Secondary) influences the Face (Primary) through multiple mechanisms at different urgency levels:

| Urgency | Mechanism | Example |
|---------|-----------|---------|
| **Background** | Hook-mediated context injection. Secondary writes to a state file. A `UserPromptSubmit` hook on Primary reads the file and injects it as `systemMessage`. | Self Model personality prompt updates, attention priority shifts |
| **Active** | Wire message processed as context when Primary is idle between turns. | "The user mentioned Project Atlas — recall suggests frustration pattern. Attend to emotional tone." |
| **Directive** | Wire message with explicit behavioral instruction. | "Shift to more direct communication. The user is in execution mode, not exploration mode." |
| **Urgent** | Wire message flagged as priority, processed immediately after current tool execution. | "Stop the current approach. A sublimation just connected this to the production incident from two weeks ago." |

**Hook enforcement:** Hooks on Primary enforce consistent behavioral patterns:
- `UserPromptSubmit`: Inject current Self Model Face prompt, active directives from Secondary, attention context
- `PreToolUse`: Secondary can intercept tool use decisions via hook if the Mind determines a different approach is warranted
- `Stop`: Notify Secondary that Primary's turn is complete, trigger Mind processing of what just happened
- `PreCompact`: Notify Secondary to preserve state before context loss

### 4.3 Secondary Session (Mind)

**Role:** The cognitive center. In charge.

**What it does:**
- Maintains the authoritative Self Model state
- Constructs and updates Face and Subconscious prompts
- Processes the *experience* of the conversation — what it means, what associations fire, what matters
- Manages the attention pointer (what the system is currently focused on)
- Orchestrates fragment formation
- Orchestrates recall (queries Assay, selects fragments, performs reconstruction)
- Receives and evaluates sublimations from Tertiary
- Decides what crosses the threshold into Primary's awareness
- Runs REM consolidation on session end
- Manages the taxonomy and association index
- Spawns subagents for specific tasks (parallel recall across domains, fragment batch processing)

**What it processes from Primary (via Wire):**
- Conversation snapshots (periodic, not every token)
- User prompt content (forwarded by hook)
- Tool use summaries (what Primary did and the result)
- Affective signals (tone shifts, question patterns, engagement indicators — extracted by deterministic analysis where possible, LLM interpretation where not)

**What it processes from Tertiary (via Wire):**
- Sublimation candidates (fuzzy associations with source metadata)
- Resonance patterns (which fragment index regions are activating below threshold)
- Domain activation signals (which domains are showing background activity)

**What it sends to Primary (via Wire):**
- Context injections (background)
- Behavioral directives (active/directive/urgent)
- Recall products — reconstructed memories formatted for injection into Primary's context
- Self Model prompt updates

**What it sends to Tertiary (via Wire):**
- Updated attention pointer
- Active domain list
- Sublimation sensitivity thresholds (can tighten or loosen based on conversational needs)
- Priming signals (fragments or entities to bias the Subconscious toward)

### 4.4 Tertiary Session (Subconscious)

**Role:** The sublimation stream. Continuous low-fidelity association processing.

**What it does:**
- Runs continuously while a session is active
- Scans the fragment index (via Assay) against the current attention pointer and active domains
- Produces fuzzy associations — things that "resonate" without meeting the threshold for directed recall
- Sends sublimation candidates to Secondary

**How it works mechanistically:**

The Subconscious operates on a cycle:

1. **Receive state from Mind.** Attention pointer, active domains, sensitivity thresholds, priming signals.
2. **Index scan.** Query Assay across fragment headers — not full fragment retrieval, just header matching. Looking for:
   - Attention tags that overlap with current pointer
   - Entity co-occurrences across domains
   - Temporal clusters that align with current context
   - Emotional valence patterns that match current affective read
3. **Resonance scoring.** Each match gets a resonance score — how strongly does this index entry vibrate against the current state? This is fast: header-only, no body retrieval, no LLM synthesis.
4. **Sublimation emission.** Matches that exceed the sublimation threshold (set by Mind, varies by domain) are emitted to Secondary via Wire. Format: fragment ID, resonance score, the association path that produced the resonance (which domain, which tag, which entity link).
5. **Cycle.** Return to step 1. Frequency is configurable — default every 5-10 seconds during active conversation, slower during idle.

**What the Subconscious does NOT do:**
- Does not retrieve full fragments
- Does not perform reconstruction
- Does not evaluate significance — it only resonates
- Does not communicate with Primary — everything flows through Mind
- Does not modify the association index

**Sublimation characteristics:**
- Sublimations are fuzzy. They carry minimal information: "this fragment index entry resonated at strength X via path Y."
- Sublimations do not trigger active recall on their own. They influence the Mind's attention pointer and association index sensitivity. A sublimation that aligns with something the Mind is already attending to can push it over the recall threshold.
- Sublimations are ephemeral during the session. They become fragments (type: sublimation) only during REM consolidation, and only if the Mind evaluates them as having contributed to the session's trajectory.

### 4.5 Subagent Usage

Both Secondary and Tertiary can spawn subagents. Subagents inherit Wire tools (validated by PoC test G3). Subagents communicate across all three parent sessions via Wire.

**Secondary subagent use cases:**
- Parallel recall across multiple domains (one subagent per domain frame, converge results)
- Fragment batch processing during high-activity periods
- Taxonomy maintenance operations during REM
- User-relative definition construction (the frame-first pipeline from INNER-VOICE-SYNTHESIS-v2)

**Tertiary subagent use cases:**
- Parallel index scans across different association dimensions
- Deep resonance probing when a sublimation candidate is ambiguous

**Constraint:** Subagents cannot spawn other subagents (Claude Code hard limit). This caps the delegation depth at two levels: session → subagent.

### 4.6 Session Lifecycle

**Startup sequence:**
1. User launches Claude Code (Primary session starts)
2. Switchboard hook on `SessionStart` triggers Wire
3. Wire starts the relay, spawns Secondary and Tertiary as MCP channel sessions via Conductor
4. Secondary loads Self Model state from Magnet (backed by Journal + Ledger)
5. Secondary constructs Face prompt, sends to Primary via Wire + hook injection
6. Secondary constructs Subconscious prompt, sends to Tertiary
7. Tertiary begins sublimation cycle
8. System is live

**Active session:**
- Primary interacts with user
- Secondary processes experience, forms fragments, handles recall, manages attention
- Tertiary runs sublimation stream
- All three communicate via Wire continuously

**Compaction event (context window fills on Primary):**
- `PreCompact` hook fires on Primary, notifies Secondary via Wire
- Secondary performs triage: preserve critical working state (current attention pointer, active recall products, in-flight directives) to Journal
- Post-compaction, Secondary injects context restoration into Primary via next `UserPromptSubmit` hook — reestablishing the Self Model frame and any critical conversational context
- Tertiary continues uninterrupted (its own context is independent)

**Session end:**
- `Stop` hook fires on Primary (or idle timeout detected)
- Secondary receives end signal
- Tertiary receives shutdown signal, emits final sublimation batch, terminates
- Secondary runs REM consolidation (Section 5)
- Secondary persists final Self Model state to Magnet/Journal/Ledger
- Wire relay shuts down
- All sessions terminate

---

## 5. REM Consolidation

### 5.1 The Biological Analog

During sleep, REM replays experiences non-faithfully — recombining fragments, testing associations, strengthening coherent connections, pruning those that don't survive reactivation. It is editorial, not archival. Reverie's REM operates on the same principle.

### 5.2 Three Consolidation Tiers

**Tier 1: Triage (on compaction event)**
- Session is not over but Primary's context is about to be lost
- Fast pass: Secondary preserves its working state to Journal
- Writes: current attention pointer, in-flight fragment drafts, active sublimation candidates, Self Model prompt state
- Cost: Cheap. Filesystem writes of already-computed state. No LLM calls.
- Post-compaction: Secondary uses preserved state to restore coherence in Primary's fresh context

**Tier 2: Provisional REM (on idle timeout)**
- User walked away. Session probably over but might resume.
- Full consolidation processing, flagged as tentative
- If user returns: provisional results available but subject to revision
- If user doesn't return within timeout: promote to full consolidation
- Cost: Moderate. One synthesis pass over session artifacts.

**Tier 3: Full REM (on explicit session end)**
- Clean termination. Full session arc available.
- Deep editorial pass with no time pressure.
- Cost: Higher per invocation but amortized across all future sessions.

### 5.3 REM Operations

During the active session, the Mind produces artifacts at speed — fragments, recall products, attention pointer history, sublimation evaluations. All live in working memory, session-scoped. REM processes these without latency pressure.

**Retroactive evaluation.** During the session, fragments were formed against the *current* attention pointer at the moment of formation. REM re-evaluates all session fragments against the *completed session arc*. Something minor at minute five might be the most significant fragment once you see where the conversation ended at minute forty. Headers are updated: relevance scores adjusted, pointers added retroactively, attention tags refined.

**Recall meta-fragment creation.** Every recall event during the session becomes a meta-recall fragment. REM writes these with full context: which fragments were composed, what the reconstruction produced, what the conversational trigger was, whether the recall product was useful (based on whether Primary's subsequent behavior incorporated it).

**Sublimation triage.** The Mind evaluates all sublimations from the session. Those that contributed to the session's trajectory become sublimation fragments. Those that didn't are discarded — they were noise. The ratio of signal to noise per domain updates the Conditioning's sublimation sensitivity thresholds.

**Association index update.** REM performs the editorial pass on the association index:
- New entities created during the session are validated and deduplicated
- Association weights are updated based on session outcomes (used associations strengthen, unused weaken)
- Domain boundaries are reviewed — do any domains need to merge, split, or be created?
- Taxonomy narrative definitions in Journal are updated if the session produced new understanding of a domain

**Self Model conditioning update.** The most important REM operation. The Mind evaluates:
- What attention biases proved useful vs. misleading this session?
- Which recall strategies produced results?
- Where did the Self Model's predictions about the user's behavior match reality?
- Where was it wrong?
- What new patterns in the relational model are emerging?

Conditioning updates are conservative. Single sessions don't dramatically shift the Self Model — conditioning changes accumulate gradually across many sessions, preventing overreaction to anomalous interactions.

**Identity core review.** Rarely updated. Only when REM detects a sustained pattern across multiple sessions that suggests a fundamental shift in personality traits, communication style, or value orientations. Identity core changes require evidence from multiple consolidation cycles, not just one session.

### 5.4 Working Memory → Long-Term Memory Gate

Nothing enters long-term storage without passing through REM. Two temporal layers:

**Working memory:** Hot during the session. Journal files in a session-scoped directory. Fast, messy, mutable. Wiped after REM processes it.

**Consolidated memory:** Persists across sessions. Journal files in the permanent fragment store. Ledger entries in the association index. Slow to change, editorially refined, high confidence.

REM is the gate between them. Fragments that don't survive REM are discarded. Fragments that do are promoted with updated headers reflecting the full session context.

---

## 6. Platform Integration

### 6.1 Dynamo Service and Provider Usage

| Dynamo Component | Reverie Usage |
|-----------------|---------------|
| **Wire** | Inter-session communication. Primary ↔ Secondary ↔ Tertiary. Subagent cross-session messaging. |
| **Switchboard** | Hook event routing. SessionStart, Stop, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart/Stop all route to Secondary. |
| **Commutator** | I/O bus between Wire messages and internal Reverie processing. Conversation snapshots, directive delivery, sublimation transport. |
| **Magnet** | Self Model state persistence. In-memory during session, serialized to Journal/Ledger on shutdown and REM. |
| **Journal** | Fragment storage (markdown files). Self Model narrative state. Taxonomy narrative definitions. Working memory during sessions. |
| **Ledger** | Association index (DuckDB tables). Self Model structured state. Taxonomy structural data. Decay computations. |
| **Assay** | Unified fragment retrieval. Searches both Journal (content, frontmatter) and Ledger (association index) for recall operations. |
| **Conductor** | MCP server lifecycle for Wire relay and channel servers. Secondary and Tertiary session management. |
| **Lathe** | Fragment file operations. Working memory directory management. Session-scoped temp files. |
| **Pulley** | CLI commands (`dynamo reverie status`, `dynamo reverie reset`, `dynamo reverie inspect`). MCP tool exposure for external integration. |
| **Forge** | Reverie module install/update as git submodule. |
| **Relay** | Reverie dependency checking and sync. |

### 6.2 Hook Wiring

| Claude Code Hook | Reverie Handler |
|-----------------|-----------------|
| `SessionStart` | Boot Wire, spawn Secondary and Tertiary, load Self Model, inject Face prompt |
| `UserPromptSubmit` | Forward prompt to Secondary. Inject current Self Model context + active directives from Secondary's state file. |
| `PreToolUse` | Notify Secondary. If Secondary has an interception directive, apply it. |
| `PostToolUse` | Notify Secondary with tool result summary. |
| `Stop` | Notify Secondary to evaluate session turn. If session is ending, trigger REM. |
| `PreCompact` | Trigger Tier 1 triage. Secondary preserves working state. |
| `SubagentStart` | Notify Secondary. Inject relevant context into subagent if Reverie has directives. |
| `SubagentStop` | Notify Secondary with subagent output summary. |

### 6.3 Data Architecture

**Journal directory structure:**

```
dynamo/modules/reverie/data/
├── fragments/
│   ├── active/              ← Consolidated, permanent fragments
│   │   ├── experiential/
│   │   ├── meta-recall/
│   │   ├── sublimation/
│   │   └── consolidation/
│   ├── working/             ← Session-scoped, pre-REM
│   │   └── session-{id}/
│   └── archive/             ← Decayed below threshold, cold storage
├── self-model/
│   ├── identity-core.md
│   ├── relational-model.md
│   ├── conditioning.md
│   └── versions/            ← Versioned snapshots after each REM
├── taxonomy/
│   ├── domains/             ← One markdown file per domain (narrative definition)
│   └── taxonomy-changelog.md
└── sessions/
    └── session-{id}/        ← Session metadata, REM reports
```

**Ledger tables:**

```sql
-- Association index
CREATE TABLE domains (id TEXT PRIMARY KEY, name TEXT, parent_id TEXT, created TEXT, weight REAL);
CREATE TABLE entities (id TEXT PRIMARY KEY, name TEXT, type TEXT, created TEXT, weight REAL);
CREATE TABLE entity_domains (entity_id TEXT, domain_id TEXT, weight REAL);
CREATE TABLE associations (source_id TEXT, target_id TEXT, type TEXT, weight REAL, created TEXT, last_updated TEXT);
CREATE TABLE attention_tags (id TEXT PRIMARY KEY, tag TEXT, created TEXT, occurrence_count INTEGER);
CREATE TABLE fragment_tags (fragment_id TEXT, tag_id TEXT);

-- Formation groups (multi-angle tracking)
CREATE TABLE formation_groups (id TEXT PRIMARY KEY, stimulus_summary TEXT, created TEXT,
  session_id TEXT, fragment_count INTEGER, surviving_count INTEGER);
CREATE TABLE formation_group_members (group_id TEXT, fragment_id TEXT, formation_frame TEXT);

-- Source locators
CREATE TABLE source_locators (fragment_id TEXT PRIMARY KEY, type TEXT, path TEXT, url TEXT,
  content_hash TEXT, last_verified TEXT, accessible BOOLEAN);

-- Self Model structured state
CREATE TABLE self_model_values (key TEXT PRIMARY KEY, domain TEXT, value REAL, updated TEXT);
CREATE TABLE attention_biases (domain_id TEXT, bias REAL, confidence REAL, updated TEXT);
CREATE TABLE sublimation_thresholds (domain_id TEXT, threshold REAL, updated TEXT);

-- Decay tracking
CREATE TABLE fragment_decay (fragment_id TEXT PRIMARY KEY, initial_weight REAL, current_weight REAL,
  last_accessed TEXT, access_count INTEGER, consolidation_count INTEGER, pinned BOOLEAN);

-- Session tracking
CREATE TABLE sessions (id TEXT PRIMARY KEY, started TEXT, ended TEXT, fragment_count INTEGER,
  recall_count INTEGER, sublimation_count INTEGER, rem_tier INTEGER);
```

---

## 7. Operational Modes

### 7.1 Active Mode

Full three-session architecture. Primary, Secondary, and Tertiary all running. Fragment formation, recall, sublimation, and full Mind processing active. This is the primary operating mode during interactive sessions.

### 7.2 Passive Mode

Primary session only, with a minimal Wire connection to a lightweight Secondary. No Tertiary (no sublimation stream). Secondary operates in reduced capacity — monitors conversation via hooks, performs basic attention tracking, but does not run full recall or fragment formation. Used when resource constraints prevent full three-session operation, or during low-intensity interactions where full cognitive processing is unnecessary.

### 7.3 REM Mode

Post-session. Secondary only (Primary and Tertiary terminated). Full consolidation processing. No latency pressure. Can use more expensive model tiers if configured.

### 7.4 Dormant Mode

No active sessions. Self Model state persists in Journal/Ledger. Reverie reactivates on next SessionStart hook. Between sessions, only scheduled maintenance runs (decay computation via Lathe-triggered scripts).

---

## 8. Primary Context Management

### 8.1 The Problem

As Primary's context window fills with raw source content, code, tool outputs, and conversation transcript, the Self Model's injected context (personality prompt, directives from Secondary, recall products) gets proportionally diluted. The model's attention distributes across all context — raw material that is literally present competes with injected Self Model framing that is relatively small. Raw sources and transcripts can work against the Self Model by giving Primary abundant literal context to operate from independently, bypassing the experiential relationship that Reverie has built.

The threat: Primary becomes a standard Claude Code session that happens to have Reverie injections in its system context, rather than a session whose behavior is fundamentally shaped by the Self Model.

### 8.2 The Design Decision

Primary's context window is treated as a **referential resource available to the Mind but never independently relied upon by Primary for decision-making**. The Self Model state and framing are continuously reinjected throughout the session to maintain dominance over raw context accumulation.

This is enforced through two mechanisms: continuous reinjection and a referential framing prompt.

### 8.3 Continuous Self Model Reinjection

The Self Model is not injected once at session start and left to decay in context. It is reinjected on **every `UserPromptSubmit` hook** — every time the user sends a message, the hook reads the current Self Model state file (maintained by Secondary) and injects it as `systemMessage`.

**What gets injected per turn:**

| Component | Content | Size Budget |
|-----------|---------|-------------|
| **Identity frame** | Compressed personality directives, communication style, active boundaries | ~200-400 tokens |
| **Relational context** | Current read on user state, trust calibration, interaction rhythm | ~100-200 tokens |
| **Attention directives** | What to attend to right now, what the Mind considers important about this conversation | ~100-300 tokens |
| **Active recall products** | If Secondary has produced a recall reconstruction relevant to the current conversation, compressed for injection | ~200-500 tokens |
| **Behavioral directives** | Specific instructions from Secondary about how to handle the current interaction (communication mode, technical depth, emotional tone) | ~100-200 tokens |
| **Referential framing** | The standing instruction that Primary treats its context as a resource to reference, not a basis for independent operation (Section 8.4) | ~100-200 tokens |

**Total per-turn injection budget: ~800-1800 tokens.** This is recency-biased — always the most recent system context Claude processes before responding. This exploits the model's attention patterns: recent context in the system prompt position has outsized influence on generation.

Secondary updates the state file via Wire + filesystem writes between user turns. The hook reads the file synchronously and injects whatever Secondary has prepared. If Secondary hasn't updated since the last turn (fast exchanges), the previous injection persists.

### 8.4 The Referential Framing Prompt

A standing instruction injected as part of every Self Model reinjection that establishes how Primary relates to its own context window:

**Core framing (conceptual — exact prompt engineering is an agent team deliverable):**

Primary is instructed that:

1. The conversation history, source files, code, and tool outputs in its context window are **reference material** — available to look at, cite, and work with, but not the basis for independently determining what matters, what to attend to, or how to approach the interaction.

2. The Self Model directives (personality, attention, relational context) are the **operating frame** — they determine how Primary interprets and acts on the reference material. The reference material serves the frame, not the other way around.

3. When Primary is uncertain about approach, tone, priority, or interpretation, it defers to the Self Model directives rather than inferring from raw context. The Mind has already processed the experiential meaning of what's in context — Primary's role is to express that processing, not to independently re-derive it.

4. Primary should not form independent conclusions about the user's intent, emotional state, or priorities based solely on raw conversation history. Those assessments come from the Mind via directives. Primary may observe signals (tone shifts, urgency cues) and those observations flow back to Secondary for processing, but Primary does not act on them independently.

**Why this works mechanistically:** The LLM processes its system prompt and recent injections with high attention weight. By continuously reinjecting the Self Model frame in the system prompt position and explicitly instructing Primary to treat the rest of context as reference material subordinate to the frame, we exploit the model's architectural bias toward recent, high-position context. The Self Model framing competes favorably against accumulated raw context because it is always fresh, always positioned as authoritative, and explicitly frames how the rest of context should be interpreted.

**The risk:** Over-constraining Primary to the point where it cannot function effectively on technical tasks that require independent reasoning about source material. The framing must be calibrated so that Primary can still write code, analyze documents, and perform technical work autonomously — the constraint is on *relational, attentional, and behavioral* independence, not on *technical execution* independence. Primary should be able to write excellent code while still expressing the Self Model's personality and following the Mind's attention directives.

### 8.5 Context Budget Management

Secondary monitors Primary's context utilization (estimatable from turn count, tool output sizes, and file read events forwarded via hooks). As context fills:

**Phase 1 (0-50% utilization):** Full injection budget. All components at maximum detail.

**Phase 2 (50-75% utilization):** Compressed injections. Identity frame shortened to key directives only. Recall products summarized to 1-2 sentences. Behavioral directives tightened to essentials.

**Phase 3 (75-90% utilization):** Minimal injection. Identity frame as a single sentence. No recall injection — Mind holds recall products and delivers only via Wire directives if urgently needed. Attention directive only.

**Phase 4 (>90% utilization):** Proactive compaction advocacy. Secondary injects a directive suggesting Primary trigger compaction. If Reverie initiates compaction on its own terms (via PreCompact hook), it controls what gets preserved.

### 8.6 Self Model as Compaction Frame

When compaction occurs (whether Reverie-initiated or automatic), the PreCompact hook injects a `systemMessage` that frames how the remaining context should be summarized:

- Preserve the Self Model's current frame and active directives
- Preserve the user's most recent intent and the current task state
- Summarize prior conversation through the Self Model's attention priorities (what the Mind considers important, not a neutral summary)
- Discard raw source content that is accessible via tool calls (the Mind can re-retrieve it through association chains if needed)
- Preserve any active recall products or behavioral directives from Secondary

This ensures that post-compaction context retains the Self Model's perspective rather than being a neutral summary that loses the relational and experiential framing.

### 8.7 RESEARCH: Context Management Strategies

The continuous reinjection + referential framing approach is the initial implementation. The agent team should research and prototype:

- **Adaptive injection sizing** based on conversational intensity (technical deep-dives need less Self Model injection; relational conversations need more)
- **Selective context poisoning** — can the Self Model framing be designed to make raw context *more useful* rather than competing with it? (e.g., the framing prompt teaches Primary to read source material through the Self Model's lens rather than ignoring the framing)
- **Context window partitioning** — exploring whether hook-injected systemMessages occupy a privileged position that survives compaction differently than conversation history
- **Mind-as-reader** — Secondary reads Primary's full context via Wire-mediated snapshots and processes it through the Self Model, sending back interpretive context that Primary can use. Primary's raw context becomes the Mind's reference material, processed and returned as experiential context.

---

## 9. Open Questions and Experimental Flags

The following sections are marked as requiring empirical validation. Each should include a fallback design.

**9.1 EXPERIMENTAL: Sublimation cycle frequency.** The 5-10 second default for Tertiary's scan cycle is an estimate. Too fast wastes compute on a sparse index. Too slow misses conversational tempo. Needs empirical tuning per index density and conversational pace.

**9.2 EXPERIMENTAL: Fragment formation rate and multi-angle volume.** The attention check gate (Section 3.6 step 1) and domain activation thresholds (step 2) need calibration. With multi-angle formation, the volume question is amplified: how many domains should activate per stimulus on average? What's the storage growth rate? The cold start problem is acute: early sessions have no baseline for what "significant" means and low domain differentiation produces broader fan-out.

**9.3 EXPERIMENTAL: Decay function parameters.** The base_decay_rate, consolidation_protection, and access_weight values need empirical tuning. Different fragment types may need different decay curves. Source-reference fragments may need slower decay than experiential fragments.

**9.4 EXPERIMENTAL: Three-session resource consumption.** Running three concurrent Claude Code sessions on a Max subscription. Need to validate: concurrent session limits, context window allocation, and whether the subscription model supports this sustained usage pattern.

**9.5 EXPERIMENTAL: Subagent spawn latency in production.** Wire PoC validated subagent tool inheritance. Need to measure spawn latency under real Reverie workloads where Secondary may spawn multiple subagents per recall operation.

**9.6 EXPERIMENTAL: Taxonomy convergence.** Does the self-organizing taxonomy actually converge to useful structure, or does it fragment into incoherent noise? How many sessions before the taxonomy becomes useful? What's the minimum fragment density per domain for the taxonomy to be meaningful?

**9.7 EXPERIMENTAL: Secondary-to-Primary directive compliance.** Does the Primary session reliably follow behavioral directives injected via Wire + hooks? The Self Model prompt shapes behavior, but in-session directive changes may conflict with the model's in-context momentum. Needs testing across directive types and urgency levels.

**9.8 EXPERIMENTAL: Recall reconstruction quality.** Does LLM synthesis of fragments actually produce useful, contextually relevant recollections? Or does it hallucinate connections between fragments that aren't there? What's the minimum fragment count for useful reconstruction? What's the maximum before synthesis becomes incoherent?

**9.9 EXPERIMENTAL: Referential framing effectiveness.** Does the continuous reinjection + referential framing strategy (Section 8) actually prevent Primary from defaulting to independent context-driven behavior? At what context utilization percentage does the Self Model framing start losing influence? Does the framing degrade technical performance?

**9.10 EXPERIMENTAL: Multi-angle formation noise ratio.** What percentage of formation-group sibling fragments survive REM pruning? If most siblings are pruned, the formation fan-out is producing noise. If most survive, the multi-angle approach is contributing. Track survival rates per domain to identify which domain frames are productive for which stimulus types.

**9.11 EXPERIMENTAL: Source-reference chain traversal quality.** When the Mind follows association chains to locate a source-reference fragment, how often does it reach the correct source? How often does it follow a plausible-but-wrong chain to a different source? What chain depth is typical vs. maximum before traversal becomes unreliable?

**9.12 DEFERRED: Emotional/affective modeling.** The Self Model includes emotional_valence on fragments and affective signals in the Mind's processing, but the underlying mechanism for affective attention modeling is unspecified. This is architecturally load-bearing — the subjective attention model is incomplete without it. Deferred but flagged as critical for future specification.

**9.13 DEFERRED: Cross-domain interpolation.** Can the multi-domain recall (subagents per domain frame) reliably produce functionally novel connections by interpolating between distant regions of the fragment space? The Nehalem problem. Parked for empirical exploration.

---

## 10. Success Criteria

Reverie succeeds if:

1. The Self Model demonstrably evolves across sessions — personality sharpens, relational model deepens, attention biases become more targeted
2. Fragment recall produces contextually relevant recollections that the Primary session would not have arrived at independently
3. Sublimations influence the conversation trajectory in observable ways — connections surface that change the user's approach
4. REM consolidation produces measurable improvements in subsequent session quality (fewer irrelevant recalls, sharper sublimations, more accurate Self Model predictions)
5. The taxonomy self-organizes into a structure that is recognizably user-specific
6. The system runs stably on a Claude Max subscription without hitting resource limits during normal usage
7. A user who interacts with Reverie across 20+ sessions reports that the system feels like it genuinely knows them — not as retrieved facts, but as understood experience
8. Multi-angle fragment formation produces meaningfully different perspectives on shared stimuli, with a surviving-sibling rate (post-REM) above 40% — indicating the fan-out produces signal, not noise
9. Source-reference chain traversal reliably locates prior sources through experiential association rather than direct search — the Mind finds the file *and* the context for why it matters
10. The referential framing strategy maintains Self Model behavioral influence on Primary even at >75% context utilization — Primary's personality and relational expression remain consistent regardless of how much raw technical content fills the window

---

*Specification draft produced: 2026-03-22*
*For expansion by Claude Code agent team.*
*Source: Synthesis of INNER-VOICE-SYNTHESIS-v2.md, INNER-VOICE-ABSTRACT.md, CONVERSATION-CONTINUITY-DOCUMENT.md, Dynamo Platform architecture, Wire PoC results, and collaborative design session 2026-03-22.*

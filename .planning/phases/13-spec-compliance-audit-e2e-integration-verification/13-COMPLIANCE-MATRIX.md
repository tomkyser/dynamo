# Compliance Matrix: Reverie Spec v2

## Status Legend
- **C** = Compliant
- **D** = Intentional Deviation (documented in STATE.md)
- **V** = Violation (fixed in this phase)
- **M** = Missing (scoped as follow-up)
- **NA** = Not applicable (informational section)
- **EXP** = Experimental (deferred to runtime validation)

## Section 1: Mechanistic Constraints

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| S1.1-S1.5 | 1.1-1.5 Mechanistic Constraints | NA | N/A | Philosophical grounding -- no implementation required | Informational only |

## Section 2: Self Model

*(Rows to be added by Plan 13-01)*

## Section 3: Fragment Memory Engine

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| S3.1 | 3.1 Core Principle | NA | N/A | Design rationale: "no complete memories, only fragments" -- philosophical grounding, no implementation required | Informational only |
| S3.2 | 3.2 Why Fragments | NA | N/A | Design rationale: context engineering match, staleness prevention, recursive enrichment -- philosophical grounding, no implementation required | Informational only |
| S3.3 | 3.3 Fragment Schema | C/D | modules/reverie/lib/schemas.cjs (lines 117-133), modules/reverie/lib/constants.cjs (lines 27-33, 79-89, 179-181) | All 8 field groups verified field-by-field: required fields (id, type, created, source_session, self_model_version), fan-out (formation_group, formation_frame, sibling_fragments), temporal (absolute, session_relative 0.0-1.0, sequence monotonic), decay (initial_weight, current_weight, last_accessed, access_count, consolidation_count, pinned), associations (domains, entities, self_model_relevance with identity/relational/conditioning, emotional_valence -1.0 to 1.0, attention_tags), source_locator (type file/url/inline, path, url, content_hash, last_verified), pointers (6 arrays: causal_antecedents, causal_consequents, thematic_siblings, contradictions, meta_recalls, source_fragments), formation (trigger, attention_pointer, active_domains_at_formation, sublimation_that_prompted). 88 tests in spec-fragments.test.cjs. | D: Spec says "YAML frontmatter" but implementation uses JSON frontmatter. Intentional per [Phase 07] STATE.md: "JSON frontmatter is a clean break from YAML." D: Zod 4 uses z.record(z.string(), schema) syntax per [Phase 07] STATE.md. origin field added between formation and source_locator per [Phase 12] STATE.md. |
| S3.4 | 3.4 Fragment Body: Intentional Fuzziness | C | modules/reverie/components/fragments/fragment-writer.cjs (line 218) | Body parameter passed as separate argument to writeFragment(), written to Journal as markdown body below frontmatter. Body is free-form text (not schema-validated), consistent with spec's "impressionistic" intent. | Body constraints (2-6 sentences, perspectival, impressionistic) are LLM prompt-level enforcement, not schema-level. |
| S3.5 | 3.5 Fragment Types | C | modules/reverie/lib/constants.cjs (lines 27-33), modules/reverie/lib/schemas.cjs (lines 140-172, 182-188) | All 5 types defined in FRAGMENT_TYPES constant (Object.freeze): experiential, meta-recall, sublimation, consolidation, source-reference. Type-specific schemas enforce constraints: meta-recall requires source_fragments in pointers, source-reference requires source_locator. SCHEMA_MAP dispatches validation per type. | |
| S3.8 | 3.8 The Association Index | C | modules/reverie/components/fragments/association-index.cjs (lines 19-169) | All 4 spec-required tables present in DDL: (1) domains table with id, name, description, weight, parent_domain_id, archived, (2) entities table with id, name, entity_type, occurrence_count, (3) associations table with weighted edges (source_id, target_id, source_type, target_type, weight, co_occurrence_count), (4) attention_tags table with tag, occurrence_count, co_occurrence_data. Total 12 tables include 8 join/support tables beyond spec's 4 core tables. Real-time updates verified via fragment-writer.cjs Wire envelope queuing. | 12 tables total exceeds spec's 4 -- additional tables are join tables and support structures (formation_groups, fragment_decay, source_locators, fragment_domains, fragment_entities, fragment_attention_tags, entity_domains, domain_relationships). |
| S3.9 | 3.9 Decay Function | C | modules/reverie/components/fragments/decay.cjs (lines 39-72), modules/reverie/lib/constants.cjs (lines 79-89) | Formula verified against spec with hand-computed values: current_weight = initial_weight * relevance_factor * time_decay * access_bonus. Components verified: (1) lambda = base_decay_rate / (1 + consolidation_count * consolidation_protection), (2) time_decay = exp(-lambda * days_since_creation), (3) access_bonus = 1 + (log(1 + access_count) * access_weight), (4) relevance_factor = weighted_sum(identity*0.3, relational*0.5, conditioning*0.2). Tested at t=0, t=7, with consolidation_count=2, with access_count=5. Pinned fragments exempt via shouldArchive(). Archive threshold = 0.1. | Deterministic computation, no LLM involvement per spec. |
| S3.11 | 3.11 Source References as Association Chain Termini | C | modules/reverie/lib/schemas.cjs (lines 74-80), modules/reverie/components/fragments/fragment-writer.cjs (lines 168-182) | source_locator schema matches spec: type (file/url/inline), path (nullable), url (nullable), content_hash (nullable), last_verified timestamp. Source-reference fragments require source_locator (enforced by refine). No content storage fields in schema (only pointers). source_locators Ledger table stores locator data separately for SQL queries. Fragment body carries experiential relationship per spec 3.4, not source content. | |
| S3.6 | 3.6 Fragment Formation Pipeline: Multi-Angle Fan-Out | C/D | formation-pipeline.cjs, attention-gate.cjs, prompt-templates.cjs, fragment-assembler.cjs | 5-step sequence verified: (1) attention gate evaluate(), (2) domain_identification template for fan-out, (3) body_composition template for per-fragment processing (SMR scoring, association gen, body composition, decay seeding), (4) formation_group ID + sibling_fragments pointers, (5) fragmentWriter.writeFragment + Wire master table upserts | D: Formation agents at .claude/agents/ not modules/reverie/agents/ (STATE.md Phase 09). D: Attention gate returns pure_tool_turn over empty_prompt when tools_used populated (STATE.md Phase 09). D: Master association tables populated via Wire upserts BEFORE fragment writes (STATE.md Phase 09, Pitfall 5). D: Formation behavior is prompt-driven per D-16 -- domain fan-out and per-fragment processing happen in LLM via templates, not as code-level logic. |
| S3.7 | 3.7 Fragment Recall: Real-Time Reconstruction | C/D | recall-engine.cjs, composite-scorer.cjs, query-builder.cjs, reconstruction-prompt.cjs | 4-step recall sequence verified: (1) trigger via recallPassive/recallExplicit, (2) Assay search with 6-factor composite scoring covering spec's 7 ranking dimensions, (3) top-N fragment selection (5 passive, 15 explicit -- configurable), (4) reconstruction via buildExplicitReconstruction through current Self Model frame. Meta-fragment metadata produced (fragment IDs + reconstruction prompt). | D: Spec lists 7 ranking dimensions; implementation has 6 factors -- "attention pointer similarity" subsumed into attention_tag_match (attention pointer represented as tags in data model). D: Same composite scorer instance for both passive and explicit paths (STATE.md Phase 09, D-12). |
| S3.10 | 3.10 The Taxonomy: Self-Organizing Structure | C | taxonomy-governor.cjs, formation-pipeline.cjs (domain creation) | All 5 lifecycle operations verified: (1) domain creation via formation pipeline Wire upserts, (2) domain merge via writeTaxonomyNarrative, (3) domain split via applyDomainSplit with parent-child hierarchy, (4) domain retirement via applyDomainRetire with archived flag, (5) split storage: Ledger for structural data (Wire envelopes), Journal for narrative definitions (fragmentWriter). Hard caps: 100 domains, 200 entities/domain, 10K edges. Cap pressure computation with 0.8 threshold. | |
| S3.12 | 3.12 Formation Example: Multi-Angle in Practice | C | formation-pipeline.cjs, fragment-assembler.cjs | Structural consistency verified: pipeline produces multi-fragment formation groups with different domain tags, shared formation_group ID, sibling_fragments pointers, emergent type classification (source-reference when source_locator present). The 5-fragment example (relational, source-reference x3, meta-cognitive) is structurally consistent with pipeline capabilities. | Illustrative example -- verified structural consistency, not literal output matching. |

## Section 4: Three-Session Architecture

*(Rows to be added by Plan 13-04)*

## Section 5: REM Consolidation

*(Rows to be added by Plan 13-05)*

## Section 6: Platform Integration

*(Rows to be added by Plan 13-06)*

## Section 7: Operational Modes

*(Rows to be added by Plan 13-06)*

## Section 8: Context Management

*(Rows to be added by Plan 13-07)*

## Section 9: Experimental Flags

*(Rows to be added as EXP entries by relevant plans)*

## Section 10: Success Criteria

*(Rows to be added by final verification plan)*

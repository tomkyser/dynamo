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

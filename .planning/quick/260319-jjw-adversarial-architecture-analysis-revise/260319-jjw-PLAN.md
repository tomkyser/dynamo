---
phase: quick-260319-jjw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-REPORT.md
autonomous: true
requirements: [QUICK-TASK]

must_haves:
  truths:
    - "Report steel-mans the current six-subsystem spec as challenger against the cognitive-layer model"
    - "Every component of both architectures is evaluated through the memory theory fidelity lens"
    - "Report surfaces genuine wins for each architecture without declaring a winner"
    - "Research findings (Vault challenge, consolidation-as-transformation, no unified search analog, spreading activation centrality, forgetting gap) are directly addressed"
    - "Deferred Journal is mentioned but not deeply evaluated"
    - "Report contains no verdict, no recommendation -- pure analysis"
  artifacts:
    - path: ".planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-REPORT.md"
      provides: "Unified adversarial architecture analysis report"
      min_lines: 400
  key_links:
    - from: "260319-jjw-REPORT.md"
      to: "260319-jjw-RESEARCH.md"
      via: "Cognitive science framework applied as evaluative lens"
      pattern: "multi-store|working memory|consolidation|spreading activation|dual-process|forgetting"
    - from: "260319-jjw-REPORT.md"
      to: "spec documents (REVERIE-SPEC.md, LEDGER-SPEC.md, etc.)"
      via: "Current spec architecture extracted and steel-manned"
      pattern: "read-write boundary|Reverie.*Assay|Ledger.*write-only|Terminus.*stateless"
    - from: "260319-jjw-REPORT.md"
      to: "260319-jjw-CONTEXT.md"
      via: "New cognitive-layer model components used as thesis under test"
      pattern: "Library.*Synix|Vault.*raw|Terminus.*ingestion|Journal.*deferred"
---

<objective>
Produce an adversarial architecture analysis comparing the proposed cognitive-layer subsystem model against the current six-subsystem specification, evaluated primarily through the lens of memory theory fidelity.

Purpose: The user is considering a significant architectural revision. This analysis must stress-test the new vision by steel-manning the current spec as challenger, surfacing where each architecture genuinely wins, and presenting tensions and trade-offs -- all without recommending either option.

Output: A single unified report at `.planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-REPORT.md`
</objective>

<execution_context>
@/Users/tom.kyser/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tom.kyser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-CONTEXT.md
@.planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Read and digest both architectures from canonical sources</name>
  <files>
    .planning/research/REVERIE-SPEC.md
    .planning/research/INNER-VOICE-ABSTRACT.md
    .planning/research/DYNAMO-PRD.md
    .planning/research/TERMINUS-SPEC.md
    .planning/research/SWITCHBOARD-SPEC.md
    .planning/research/LEDGER-SPEC.md
    .planning/research/ASSAY-SPEC.md
  </files>
  <action>
Read ALL seven spec files in full. These are the canonical source for the current six-subsystem architecture:

1. `.planning/research/REVERIE-SPEC.md` (1,462 lines) -- Reverie/Inner Voice subsystem. Focus on: dual-path architecture, activation maps, REM consolidation model, Reverie-reads-through-Assay-writes-through-Ledger pattern, cognitive theory mapping.
2. `.planning/research/INNER-VOICE-ABSTRACT.md` (471 lines) -- Platform-agnostic Inner Voice concept. Focus on: episodic buffer mapping, Somatic Marker Hypothesis as secondary theory, affect/valence tagging.
3. `.planning/research/DYNAMO-PRD.md` (441 lines) -- Product requirements. Focus on: subsystem boundary definitions, system-level concerns, the "Dynamo is the system wrapper" framing.
4. `.planning/research/TERMINUS-SPEC.md` (682 lines) -- Terminus subsystem. Focus on: "stateless transport pipe" framing, Docker/MCP infrastructure, what Terminus does NOT own (routing decisions, handler logic).
5. `.planning/research/SWITCHBOARD-SPEC.md` (819 lines) -- Switchboard subsystem. Focus on: dispatcher model, static hook handler routing, "dispatches but does not handle" boundary.
6. `.planning/research/LEDGER-SPEC.md` (682 lines) -- Ledger subsystem. Focus on: write-only boundary, "never reads the knowledge graph", episode construction, curation formatting.
7. `.planning/research/ASSAY-SPEC.md` (871 lines) -- Assay subsystem. Focus on: read-only boundary, search operations, session index, "reads but never writes" counterpart to Ledger.

Also re-read:
- `260319-jjw-CONTEXT.md` -- The new cognitive-layer model definition (Ledger as fast-recall trigger, Library/Synix, Vault, Assay/Hyperspell-v2 unified search, Terminus as ingestion pipeline, Journal/LangMem deferred, Reverie hot/passive modes, Switchboard as ops lifecycle).
- `260319-jjw-RESEARCH.md` -- Cognitive science memory theory framework (multi-store, working memory, levels of processing, consolidation, dual-process, spreading activation, adaptive forgetting, emotional memory, encoding specificity, reconsolidation).

While reading, build a mental model of:
- Where the current spec's boundaries genuinely serve cognitive fidelity (not just engineering cleanliness)
- Where the new model introduces components that have no cognitive analog (Vault) or improve cognitive mapping (Library tiers, Terminus-as-router)
- The five key tensions from the research: (a) Vault challenge, (b) consolidation-as-transformation vs compression, (c) no unified search analog, (d) spreading activation centrality, (e) forgetting gap in both architectures

Do NOT begin writing the report during this task. This is intake only.
  </action>
  <verify>All 7 spec files and both planning docs (CONTEXT.md, RESEARCH.md) have been read in full. Executor can articulate the key boundary rules of the current spec and the key component redefinitions in the new model.</verify>
  <done>All canonical sources loaded. Both architectures understood at the level of component boundaries, data flow patterns, and cognitive theory mappings.</done>
</task>

<task type="auto">
  <name>Task 2: Write the adversarial analysis report</name>
  <files>.planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-REPORT.md</files>
  <action>
Write a single unified adversarial analysis report. The report MUST:

**Framing and tone:**
- The new cognitive-layer model is the thesis under test. The current six-subsystem spec is the steel-manned challenger.
- Memory theory fidelity is the PRIMARY evaluation dimension. Technical feasibility, engineering cleanliness, and implementation cost are secondary and should be noted but not drive conclusions.
- Pure analysis. No verdict. No recommendation. No "overall winner." The user decides after reading.
- Full conversation context (tool research for Synix, Hyperspell-v2, LangMem; user's answers on Terminus routing, Vault independence, Ledger as fast-recall trigger, Journal deferral; the cognitive-layer data flow model) is treated as binding requirements for the new vision.
- Substantive cognitive science references but not academic -- cite the theory name and key insight, not full bibliographic entries.

**Required content (structure and ordering at Claude's discretion):**

A. **Architecture portraits.** Concise but complete description of each architecture's components, boundaries, and data flow. The reader should understand both models from this section alone without needing to read the spec files.

B. **Memory theory framework.** Establish the evaluative lens: which cognitive science models matter most, what properties they predict, and what "cognitive fidelity" means in this context. Draw from the RESEARCH.md findings but synthesize, don't copy.

C. **Component-by-component adversarial analysis.** For EACH component that differs between architectures, evaluate:
   - What cognitive mechanism does this component claim to model?
   - How does the current spec handle this function? Where does it genuinely succeed on memory theory grounds?
   - How does the new model handle this function? Where does it genuinely succeed on memory theory grounds?
   - Where does each architecture break or strain under the cognitive theory lens?
   - Steel-man the current spec's approach -- find the strongest argument FOR the current design, not just the weakest.

   Components to analyze (at minimum):
   - **Ledger:** Write-only data construction (current) vs fast-recall trigger layer (new). Short-term memory mapping, graph enrichment depth.
   - **Library (new only):** Long-term processed memory via Synix tiered compression. Does tiered compression map to consolidation, or is it just archival? Consolidation-as-transformation vs compression question.
   - **Vault (new only):** Raw artifact data lake. The central cognitive fidelity challenge. Extended Cognition thesis as counterargument. Does its presence undermine the theoretical coherence of the whole architecture?
   - **Assay:** Read-only graph queries (current) vs unified hybrid search across all stores (new). No unified search analog in cognition. Cross-system facilitation vs mechanism-specific retrieval.
   - **Terminus:** Stateless transport pipe (current) vs active ingestion pipeline (new). Automatic encoding parallels. Attentional bottleneck question. "Rules, not reasoning" routing.
   - **Reverie:** Integration function mapping to episodic buffer. Hot/passive modes (new) vs hot path/deliberation (current). Spreading activation centrality -- does the new model de-emphasize a fundamental cognitive mechanism?
   - **Switchboard:** Dispatcher (current) vs ops lifecycle manager (new). Minimal cognitive mapping in both.
   - **Journal (new, deferred):** Mention briefly. Emotional/subjective memory mapping. Note it is deferred and cannot be fully evaluated.

D. **Cross-cutting tensions.** Analyze dimensions that span multiple components:
   - **Theoretical coherence vs engineering pragmatism:** Current spec is tighter theoretically; new model adds engineering capability (Vault) that breaks coherence. Is coherence more valuable?
   - **Explicit tiering vs implicit enrichment:** New model makes memory tiers explicit by storage location AND processing depth; current uses implicit graph-structure depth. Which maps better to levels of processing?
   - **Forgetting gap:** Neither architecture adequately models adaptive forgetting. Surface as shared weakness.
   - **Spreading activation centrality:** Current spec makes activation maps first-class. New model may de-emphasize them. Is this a regression?
   - **Consolidation fidelity:** Both claim REM consolidation. Is either truly transformative (restructuring, generalizing, pruning) or merely archival (moving data between stores)?
   - **Dual-process handoff mechanism:** Signal-driven (cognitive fidelity) vs configuration-driven (engineering convenience)?

E. **Where each architecture genuinely wins.** Two distinct sections -- one for each architecture's strongest arguments. These should be the strongest case each side can make, not backhanded compliments. The reader should finish each section thinking "that's a real strength."

F. **Unresolved questions.** Questions the analysis cannot answer without more information or implementation experience. These should be genuine unknowns, not rhetorical devices.

**What the report must NOT contain:**
- A verdict, recommendation, or "overall assessment"
- Rankings, scores, or winner declarations
- Implementation timelines or effort estimates
- Suggestions for what to build next
- Deeply evaluating the deferred Journal beyond brief mention

**Formatting:**
- Markdown with clear headers
- Tables where they clarify comparisons
- Report title should include "Adversarial Architecture Analysis" and reference both architectures
- Include a metadata section at the end with analysis date and source document references
  </action>
  <verify>
    <automated>test -f ".planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-REPORT.md" && wc -l ".planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-REPORT.md" | awk '{if ($1 >= 400) print "PASS: " $1 " lines"; else print "FAIL: only " $1 " lines (minimum 400)"}'</automated>
  </verify>
  <done>
- Report file exists at the specified path
- Report is at least 400 lines (substantive analysis, not a summary)
- All 8 component analyses present (Ledger, Library, Vault, Assay, Terminus, Reverie, Switchboard, Journal)
- Cross-cutting tensions section addresses all 6 dimensions listed above
- Both "where each wins" sections present with genuine strengths
- No verdict, recommendation, or winner declaration anywhere in the report
- Memory theory fidelity is the primary evaluation dimension throughout
  </done>
</task>

</tasks>

<verification>
1. Report exists and is substantive (400+ lines)
2. Steel-manning present: current spec has genuine strengths articulated, not strawmanned
3. No verdict: grep for "recommend", "verdict", "winner", "should adopt", "better architecture" returns no prescriptive matches
4. All key tensions from research addressed: Vault challenge, consolidation-as-transformation, unified search analog, spreading activation centrality, forgetting gap
5. Memory theory is the primary lens throughout, not engineering convenience
</verification>

<success_criteria>
- Single unified report produced at 260319-jjw-REPORT.md
- Both architectures portrayed accurately from their canonical sources
- Adversarial structure maintained: new model tested, current spec steel-manned
- Research findings (cognitive science framework) applied as evaluative lens, not just cited
- User can read the report and form their own judgment without being led to a conclusion
</success_criteria>

<output>
After completion, create `.planning/quick/260319-jjw-adversarial-architecture-analysis-revise/260319-jjw-SUMMARY.md`
</output>

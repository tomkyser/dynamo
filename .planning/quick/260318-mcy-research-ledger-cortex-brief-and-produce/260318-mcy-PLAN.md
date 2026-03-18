---
phase: 260318-mcy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/research/LEDGER-CORTEX-ANALYSIS.md
  - .planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md
autonomous: true
requirements: [CORTEX-ANALYSIS]

must_haves:
  truths:
    - "Recommendation analysis covers all 21 research questions with steel-man then stress-test treatment"
    - "Go/no-go verdict exists for every Cortex component (Inner Voice, Access Agent, Construction Agent, Infrastructure Agent, Deliberation Protocol, Dual-Path)"
    - "Draft roadmap reflects Option C (phased integration) with CORTEX-01 through CORTEX-11 distributed across milestones"
    - "Requirements absorption mapping is validated (which existing requirements are absorbed, which stay independent)"
    - "Cost analysis presents realistic per-day and per-month projections for each milestone's Cortex scope"
  artifacts:
    - path: ".planning/research/LEDGER-CORTEX-ANALYSIS.md"
      provides: "Complete recommendation analysis with adversarial deliberation"
    - path: ".planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md"
      provides: "Concrete proposed roadmap revision reflecting Cortex phased integration"
  key_links:
    - from: ".planning/research/LEDGER-CORTEX-ANALYSIS.md"
      to: "MASTER-ROADMAP.md"
      via: "Analysis conclusions drive roadmap revision decisions"
    - from: ".planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md"
      to: ".planning/REQUIREMENTS.md"
      via: "Draft roadmap references all existing and new requirement IDs"
---

<objective>
Produce two polished, decision-ready documents from the completed Ledger Cortex research:

1. **LEDGER-CORTEX-ANALYSIS.md** -- A rigorous recommendation analysis that steel-mans then stress-tests every major Cortex component, validates requirement absorptions, presents cost analysis, and delivers clear go/no-go verdicts. This is the reasoning document the user reads to understand WHY.

2. **MASTER-ROADMAP-DRAFT-v1.3-cortex.md** -- A concrete, complete draft revision of the current MASTER-ROADMAP.md incorporating the Cortex vision via Option C (phased integration). This is the proposed result the user can adopt, modify, or reject.

Purpose: Transform exhaustive research into actionable decision artifacts. The research (260318-mcy-RESEARCH.md) contains all the raw analysis; these documents distill it into polished, structured outputs.

Output: Two markdown documents in `.planning/research/`
</objective>

<execution_context>
@/Users/tom.kyser/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tom.kyser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260318-mcy-research-ledger-cortex-brief-and-produce/260318-mcy-CONTEXT.md
@.planning/quick/260318-mcy-research-ledger-cortex-brief-and-produce/260318-mcy-RESEARCH.md
@.planning/research/LEDGER-CORTEX-BRIEF.md
@MASTER-ROADMAP.md
@.planning/REQUIREMENTS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Produce LEDGER-CORTEX-ANALYSIS.md -- the recommendation analysis document</name>
  <files>.planning/research/LEDGER-CORTEX-ANALYSIS.md</files>
  <action>
Create `.planning/research/LEDGER-CORTEX-ANALYSIS.md` -- a polished recommendation analysis document. This is NOT a copy of the research; it is a distilled, decision-ready analysis organized for clarity and action.

**Source material:** Read `.planning/quick/260318-mcy-research-ledger-cortex-brief-and-produce/260318-mcy-RESEARCH.md` for all raw research findings.

**Document structure (follow this exactly):**

1. **Header and metadata** -- Title, date, confidence level, document purpose statement
2. **Executive Summary** (1 page max) -- The bottom line: what the Cortex vision proposes, what's viable, what's not, and the recommended approach (Option C phased integration). Include the single most important insight (dual-path architecture).
3. **Technology Landscape** (brief) -- Summarize the verified technology capabilities: Claude Agent SDK, Graphiti, Hindsight, pricing. Focus on what matters for decisions, not exhaustive detail. The research doc has the detail.
4. **Component-by-Component Adversarial Analysis** -- This is the core section. For EACH of the 6 major components, use this exact format:
   - **Component name and one-line description**
   - **Steel-man** (2-3 paragraphs): Build the STRONGEST possible case FOR this component. Why it matters, what unique value it provides, what problems it solves that nothing else can.
   - **Stress-test** (numbered list): Actively try to break the argument. Real risks, failure modes, cost concerns, complexity issues, alternative approaches that are simpler.
   - **Verdict**: GO / CONDITIONAL GO / DEFER / NO-GO with specific conditions and timing.

   Components to analyze (in this order):
   a. Inner Voice (basic -- v1.3 scope)
   b. Dual-Path Architecture
   c. Cost Monitoring
   d. Construction Agent / Enhanced Construction
   e. Access Agent
   f. Infrastructure Agent
   g. Deliberation Protocol

5. **Requirements Impact** -- Two subsections:
   a. **Absorption validation table**: Each of the 7 existing requirements claimed to be absorbed, with validation verdict (VALID / PARTIALLY VALID / INVALID) and reasoning
   b. **New requirements assessment table**: Each of the 10 proposed new CORTEX requirements, with necessity rating (ESSENTIAL / USEFUL / DEFER / UNNECESSARY) and recommended milestone

6. **Milestone Impact Analysis** -- Three options (A, B, C) with risk assessment, throwaway work analysis, and clear recommendation for Option C with reasoning

7. **Cost Analysis** -- Current baseline costs, projected costs per milestone under Option C, monthly projections table, prompt caching impact

8. **Risk Register** -- Top 10 risks with impact, probability, and mitigation

9. **Go/No-Go Summary Table** -- Single table with all components, verdict, conditions, and timing

10. **Recommendation** -- Final 2-3 paragraphs summarizing the recommended path forward

**Critical quality requirements:**
- The steel-man sections must be genuinely compelling, not strawmen. A reader should finish the steel-man thinking "yes, we should build this" before the stress-test challenges it.
- The stress-test must be genuinely adversarial. Real risks, not softballs. If the honest answer is "this component is a bad idea," say so directly.
- Verdicts must be honest and specific. "GO with conditions" must list the actual conditions.
- The Infrastructure Agent verdict must be NO-GO as an agent (the research is unambiguous on this).
- Cost projections must use the actual pricing numbers from the research (Haiku $1/$5, Sonnet $3/$15, Opus $5/$25 per 1M tokens).
- Do NOT include the draft roadmap in this document. This document is analysis; the roadmap is a separate deliverable.
  </action>
  <verify>
    <automated>test -f ".planning/research/LEDGER-CORTEX-ANALYSIS.md" && echo "File exists" && wc -l ".planning/research/LEDGER-CORTEX-ANALYSIS.md" | awk '{if ($1 > 200) print "Length OK: "$1" lines"; else print "FAIL: too short ("$1" lines)"}'</automated>
  </verify>
  <done>LEDGER-CORTEX-ANALYSIS.md exists with complete adversarial analysis of all 7 components, requirements impact validation, milestone impact analysis, cost projections, risk register, and go/no-go summary table. Document is self-contained and decision-ready without needing to read the research document.</done>
</task>

<task type="auto">
  <name>Task 2: Produce MASTER-ROADMAP-DRAFT-v1.3-cortex.md -- the concrete roadmap revision</name>
  <files>.planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md</files>
  <action>
Create `.planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md` -- a complete, standalone draft revision of the Master Roadmap incorporating the Ledger Cortex vision via Option C (phased integration).

**Source material:** Read both:
- `MASTER-ROADMAP.md` (current roadmap -- the structural template)
- `.planning/quick/260318-mcy-research-ledger-cortex-brief-and-produce/260318-mcy-RESEARCH.md` (Part VIII has the draft roadmap outline)

**This document must be a COMPLETE roadmap** -- not a diff or a list of changes. It should be directly usable as a replacement for `MASTER-ROADMAP.md` if the user approves it. Copy the current roadmap's structure, preserve everything unchanged, and integrate the Cortex revisions.

**Specific requirements:**

1. **Header** -- Add a note at the top: "DRAFT -- Proposed revision incorporating Ledger Cortex (Option C: Phased Integration). See LEDGER-CORTEX-ANALYSIS.md for reasoning."

2. **Milestone Overview table** -- Updated with revised requirement counts and descriptions per milestone.

3. **Completed Milestones** -- Copy exactly from current roadmap (v1.0-v1.2 in collapsible section).

4. **v1.2.1 -- Stabilization and Polish** -- UNCHANGED from current roadmap. Copy exactly.

5. **v1.3 -- Intelligent Memory and Modularity** (REVISED):
   - Updated goal text reflecting Inner Voice and dual-path
   - [CORTEX] table with new/absorbed requirements: CORTEX-01, CORTEX-02, CORTEX-03, and the absorbed MENH-01, MENH-02, MENH-10, MENH-11, MGMT-09 (moved from v1.4)
   - Remaining management requirements table (MENH-06, MENH-07, MGMT-01/02/03/05/08/10/11, UI-08)
   - Mark each [CORTEX] change clearly so the user can see what's new

6. **v1.4 -- Memory Quality and Agent Foundation** (REVISED):
   - Updated goal reflecting advanced Inner Voice and observation synthesis
   - [CORTEX] table with CORTEX-04, CORTEX-05, CORTEX-06
   - Remaining requirements (MENH-03/04/05/08, MGMT-06/07)
   - Note MGMT-09 removal (moved to v1.3)

7. **v1.5 -- Dashboard, Visibility, and Agent Coordination** (REVISED):
   - Updated goal reflecting agent SDK integration
   - [CORTEX] table with CORTEX-07, CORTEX-08, CORTEX-09
   - Remaining UI requirements (UI-01 through UI-06, MGMT-04)

8. **v2.0 -- Advanced Capabilities** (REVISED):
   - [CORTEX] additions: CORTEX-10, CORTEX-11
   - MENH-09 noted as absorbed by CORTEX-10
   - UI-07 remains

9. **Updated Requirement Index** -- Full table of ALL requirement IDs (existing + new CORTEX-01 through CORTEX-11) with milestone assignments. Mark absorbed requirements with "(absorbed by CORTEX-XX)".

10. **Updated Guiding Principles** -- Add the 4 new Cortex-related principles:
    - Prove before scaling
    - Agents are expensive; functions are cheap
    - Dual-path is non-negotiable
    - Claudia-aware, not Claudia-scoped

11. **Change Log at bottom** -- List every specific change from the current roadmap:
    - Requirements moved between milestones
    - New CORTEX requirements added
    - Theme/goal text changes
    - Guiding principles additions

**Critical quality requirements:**
- Must be a COMPLETE, standalone document -- not a delta
- Must preserve the exact same structure and formatting conventions as the current MASTER-ROADMAP.md
- Every CORTEX change must be visually marked with `[CORTEX]` so the user can scan for what's new
- Requirement counts in the overview table must be accurate
- No requirement should be lost -- every current requirement must appear in the revised roadmap
- The footer/metadata should note this is a DRAFT pending user review
  </action>
  <verify>
    <automated>test -f ".planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md" && echo "File exists" && wc -l ".planning/research/MASTER-ROADMAP-DRAFT-v1.3-cortex.md" | awk '{if ($1 > 150) print "Length OK: "$1" lines"; else print "FAIL: too short ("$1" lines)"}'</automated>
  </verify>
  <done>MASTER-ROADMAP-DRAFT-v1.3-cortex.md exists as a complete standalone roadmap document. Contains all current requirements plus 11 new CORTEX requirements distributed across milestones. All changes marked with [CORTEX]. Requirement index is complete. Change log documents every modification from the current roadmap. Document is directly usable as a MASTER-ROADMAP.md replacement if approved.</done>
</task>

</tasks>

<verification>
1. Both files exist in `.planning/research/`
2. LEDGER-CORTEX-ANALYSIS.md contains adversarial analysis of all 7 components with steel-man/stress-test format
3. MASTER-ROADMAP-DRAFT-v1.3-cortex.md is a complete standalone roadmap (not a diff)
4. All 21 research questions are addressed in the analysis (directly or by component grouping)
5. All 7 claimed requirement absorptions are validated
6. All 10 proposed new CORTEX requirements are assessed
7. Go/no-go verdicts cover every component
8. Draft roadmap preserves all existing requirements and adds CORTEX-01 through CORTEX-11
9. Change log in draft roadmap documents every modification
</verification>

<success_criteria>
- LEDGER-CORTEX-ANALYSIS.md is a rigorous, honest, decision-ready analysis that a technical reader can use to make go/no-go decisions on each Cortex component
- MASTER-ROADMAP-DRAFT-v1.3-cortex.md is a complete roadmap the user can adopt, modify, or reject -- not a set of suggested changes
- Both documents leverage the research exhaustively without simply copying it
- The adversarial tone is genuine -- steel-mans are compelling, stress-tests are honest, and verdicts reflect actual risk assessment
</success_criteria>

<output>
After completion, create `.planning/quick/260318-mcy-research-ledger-cortex-brief-and-produce/260318-mcy-SUMMARY.md`
</output>

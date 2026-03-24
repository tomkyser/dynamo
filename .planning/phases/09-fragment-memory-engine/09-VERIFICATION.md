---
phase: 09-fragment-memory-engine
verified: 2026-03-24T18:15:00Z
status: passed
score: 2/2 success criteria verified
re_verification: false
gaps: []
human_verification:
  - test: "Invoke the formation subagent in a live session and observe it forms fragments"
    expected: "After a significant user turn, the reverie-formation subagent runs in background, writes to data/formation/output/latest-output.json, and handleSubagentStop reads and processes the output — fragments appear in ~/.dynamo/reverie/working/"
    why_human: "Requires a live Claude Code session to verify the full fire-and-forget subagent round-trip: stimulus write -> subagent spawn -> JSON output -> processFormationOutput -> fragment files on disk"
  - test: "Verify passive nudge shading in a live session"
    expected: "After formation completes, the next UserPromptSubmit reads the nudge via contextManager.getNudge() and appends '[Inner impression: ...]' to additionalContext, visibly influencing the next response"
    why_human: "Requires observing actual Claude behavior change in a live session — not verifiable programmatically"
  - test: "Verify explicit recall triggers on recall keywords in a live session"
    expected: "Prompts containing 'remember when', 'recall', or 'what do you remember' cause recallEngine.recallExplicit to fire and inject reconstruction text into additionalContext"
    why_human: "Requires a live session with real fragment data in Assay to produce a meaningful reconstruction — current tests use mocks"
---

# Phase 9: Fragment Memory Engine Verification Report

**Phase Goal:** Validate that multi-angle fragment formation and Assay-based recall produce useful memories in a single-session context before the complexity of inter-session communication is layered on
**Verified:** 2026-03-24T18:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Formation pipeline processes a stimulus through attention check gate, domain fan-out, and per-domain body composition, producing 1-3 fragments per stimulus with distinct formation group tags | VERIFIED | `formation-pipeline.cjs` wires attention-gate, fragment-assembler, formation group tagging with fg- prefix, caps at `FORMATION_DEFAULTS.max_fragments_per_stimulus` (3), sibling cross-referencing confirmed in tests |
| 2 | Recall via Assay returns ranked fragments using composite scoring (association pointers, domain overlap, entity co-occurrence, decay weighting, Self Model relevance) and reconstructs them through the current Self Model frame | VERIFIED | `recall-engine.cjs` calls `assay.search()` for both paths, routes results through `_scorer.rankFragments()` (6-factor composite score), and produces reconstruction via `_reconstructor.buildExplicitReconstruction()` with Self Model frame |

**Score:** 2/2 truths verified

### Required Artifacts (All 4 Plans)

#### Plan 01 — Formation Components

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `modules/reverie/components/formation/attention-gate.cjs` | Stimulus evaluation with two-gate filtering | VERIFIED | Exists, exports `createAttentionGate`, has `evaluate()` with empty/too_short/pure_tool_turn/passed results |
| `modules/reverie/components/formation/prompt-templates.cjs` | 4 formation + 2 reconstruction templates | VERIFIED | Exists, exports `FORMATION_TEMPLATES` (4 keys) and `RECONSTRUCTION_TEMPLATES` (2 keys), all Object.frozen |
| `modules/reverie/components/formation/fragment-assembler.cjs` | Parse subagent JSON into fragment frontmatter | VERIFIED | Exists, exports `createFragmentAssembler`, has `parseFormationOutput` and `buildFrontmatter` |
| `modules/reverie/components/formation/nudge-manager.cjs` | Filesystem nudge read/write coordination | VERIFIED | Exists, exports `createNudgeManager`, has `writeNudge` and `readLatestNudge` with staleness detection |
| `modules/reverie/lib/constants.cjs` | Extended with SCORING_DEFAULTS, FORMATION_DEFAULTS, NUDGE_DEFAULTS | VERIFIED | All 3 constants present, exported, SCORING_DEFAULTS weights sum to 1.0 |

#### Plan 02 — Recall Components

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `modules/reverie/components/recall/composite-scorer.cjs` | compositeScore() + rankFragments() for batch scoring | VERIFIED | Exists, exports `createCompositeScorer`, 6-factor scoring uses `fragment.decay.current_weight` directly (not calling computeDecay) |
| `modules/reverie/components/recall/query-builder.cjs` | Assay query construction for passive and explicit recall | VERIFIED | Exists, exports `createQueryBuilder`, `buildPassiveQuery` (limit 5) and `buildExplicitQuery` (limit 15) with correct SQL thresholds |
| `modules/reverie/components/recall/reconstruction-prompt.cjs` | Reconstruction prompts as subjective re-experiencing | VERIFIED | Exists, exports `createReconstructionPrompt`, passive nudge contains "shade"/"shading" language, explicit reconstruction contains "remembering"/"your" per D-04 |

#### Plan 03 — Orchestrators

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `modules/reverie/components/formation/formation-pipeline.cjs` | Formation orchestrator: prepareStimulus, processFormationOutput, getFormationStats | VERIFIED | Exists, exports `createFormationPipeline`, all 3 methods present, master association table population via Wire upserts before fragment writes |
| `modules/reverie/components/recall/recall-engine.cjs` | Recall orchestrator: recallPassive, recallExplicit, getRecallStats | VERIFIED | Exists, exports `createRecallEngine`, both paths use same `_scorer` instance per D-12 |

#### Plan 04 — Integration

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.claude/agents/reverie-formation.md` | Custom subagent with background: true, ISFP/INFP framing | VERIFIED | Exists at correct Claude Code discovery path, frontmatter has `name: reverie-formation`, `background: true`, `model: sonnet`, `maxTurns: 10`; system prompt uses "inner voice", "notice", "you" framing |
| `modules/reverie/hooks/hook-handlers.cjs` | Extended with formation triggers, nudge injection, subagent output processing, explicit recall | VERIFIED | `RECALL_KEYWORDS`, `FORMATION_AGENT_NAME` constants present; `prepareStimulus`, `processFormationOutput`, `recallExplicit`, `getNudge` all wired in handlers |
| `modules/reverie/components/context/context-manager.cjs` | Extended with getNudge() for passive nudge delivery | VERIFIED | `getNudge()` method present, `CONTEXT_MANAGER_SHAPE.optional` includes `'getNudge'`, calls `_nudgeManager.readLatestNudge()` |
| `modules/reverie/reverie.cjs` | Module entry point creates and wires all Phase 9 components | VERIFIED | Requires all 4 factories, creates fragmentWriter/nudgeManager/formationPipeline/recallEngine in `register()`, passes to hook handlers, returns `{ formation: true, recall: true }` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `fragment-assembler.cjs` | `schemas.cjs` | `validateFragment()` on assembled frontmatter | VERIFIED | Caller pattern — test file confirms `validateFragment` called on `buildFrontmatter` output, 13 test cases verify schema compliance |
| `nudge-manager.cjs` | `constants.cjs` | `NUDGE_DEFAULTS` for path and token budget | VERIFIED | Direct import confirmed: `const { DATA_DIR_DEFAULT, NUDGE_DEFAULTS } = require('../../lib/constants.cjs')` |
| `composite-scorer.cjs` | `constants.cjs` | `SCORING_DEFAULTS` import | VERIFIED | `const { SCORING_DEFAULTS } = require('../../lib/constants.cjs')` at line 25 |
| `composite-scorer.cjs` | `fragment.decay.current_weight` | Pre-computed field read directly | VERIFIED | `Math.min(typeof decay.current_weight === 'number' ? decay.current_weight : 0, 1.0)` at line 104 |
| `query-builder.cjs` | `assay.cjs` | Produces `{ criteria, providers?, options? }` shape | VERIFIED | Both `buildPassiveQuery` and `buildExplicitQuery` return objects with `criteria`, `options`, and `limit` fields |
| `formation-pipeline.cjs` | `fragment-writer.cjs` | `writeFragment()` for each formed fragment | VERIFIED | `fragmentWriter.writeFragment(frontmatter, frag.body)` at line 275 |
| `formation-pipeline.cjs` | `fragment-assembler.cjs` | `parseFormationOutput` and `buildFrontmatter` | VERIFIED | `_assembler.parseFormationOutput(rawOutput)` at line 232 |
| `formation-pipeline.cjs` | `nudge-manager.cjs` | `writeNudge` for passive recall delivery | VERIFIED | `await _nudgeManager.writeNudge(parsed.nudge)` at line 286 |
| `recall-engine.cjs` | `assay.cjs` | `search()` for fragment retrieval | VERIFIED | `await assay.search(query)` at lines 84 and 143 |
| `recall-engine.cjs` | `composite-scorer.cjs` | `rankFragments` for scoring and selection | VERIFIED | `_scorer.rankFragments(searchResult.value.results, queryContext, 5)` and `...15)` |
| `hook-handlers.cjs` | `formation-pipeline.cjs` | `prepareStimulus` in UserPromptSubmit, `processFormationOutput` in SubagentStop | VERIFIED | Both calls confirmed at lines 160 and 393 |
| `hook-handlers.cjs` | `recall-engine.cjs` | `recallExplicit` on keyword detection | VERIFIED | `recallEngine.recallExplicit(...)` at line 176, gated on `RECALL_KEYWORDS.test(promptText)` |
| `context-manager.cjs` | `nudge-manager.cjs` | `readLatestNudge` in `getNudge()` | VERIFIED | `await _nudgeManager.readLatestNudge()` at line 319 |
| `reverie.cjs` | `formation-pipeline.cjs` | `createFormationPipeline` in `register()` | VERIFIED | Imported at line 23, instantiated in `register()` at line 84 |
| `reverie.cjs` | `recall-engine.cjs` | `createRecallEngine` in `register()` | VERIFIED | Imported at line 24, instantiated in `register()` at line 90 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `recall-engine.cjs` | `searchResult` | `assay.search(query)` — federated search over Journal fragments + Ledger association index | In tests: mocked. In production: real Assay query through live providers | FLOWING in tests; production flow depends on Assay having fragment data (single-session context — fragments written by formation pipeline in same session) |
| `formation-pipeline.cjs` | `parsed` | `_assembler.parseFormationOutput(rawOutput)` — parses subagent JSON | Subagent output written by `reverie-formation` agent to filesystem, read by `handleSubagentStop` | FLOWING — data path from subagent JSON to `processFormationOutput` is complete |
| `context-manager.cjs` | `nudgeText` | `_nudgeManager.readLatestNudge()` — reads nudge file written by formation pipeline | File written by `_nudgeManager.writeNudge(parsed.nudge)` in `processFormationOutput` | FLOWING — filesystem coordination bus is complete end-to-end |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `createFormationPipeline` module loads without error | `node -e "const {createFormationPipeline} = require('./modules/reverie/components/formation/formation-pipeline.cjs'); console.log(typeof createFormationPipeline)"` | `function` | PASS |
| `createRecallEngine` module loads without error | `node -e "const {createRecallEngine} = require('./modules/reverie/components/recall/recall-engine.cjs'); console.log(typeof createRecallEngine)"` | `function` | PASS |
| `FORMATION_TEMPLATES` has all 4 required keys | `node -e "const {FORMATION_TEMPLATES} = require(...); console.log(Object.keys(FORMATION_TEMPLATES).join(','))"` | `attention_check,domain_identification,body_composition,meta_recall_reflection` | PASS |
| `RECONSTRUCTION_TEMPLATES` has 2 required keys | Same module, `RECONSTRUCTION_TEMPLATES` keys | `passive_nudge,explicit_reconstruction` | PASS |
| `SCORING_DEFAULTS` weights sum to exactly 1.0 | `node -e "const {SCORING_DEFAULTS} = require('./modules/reverie/lib/constants.cjs'); console.log(Object.values(SCORING_DEFAULTS).reduce((a,b)=>a+b,0))"` | `1` | PASS |
| All Phase 9 formation and recall tests pass | `bun test modules/reverie/components/formation/ modules/reverie/components/recall/` | 80 pass, 0 fail | PASS |
| Full Reverie test suite passes (no regressions) | `bun test modules/reverie/` | 297 pass, 0 fail | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FRG-03 | 09-01, 09-03, 09-04 | Multi-angle formation pipeline (attention check, domain fan-out, parallel per-fragment processing, formation group tagging) | SATISFIED | `attention-gate.cjs` (stimulus gate), `prompt-templates.cjs` (domain fan-out prompts per D-04/D-08), `formation-pipeline.cjs` (orchestrates parallel per-fragment body composition with formation group tagging), `hook-handlers.cjs` (UserPromptSubmit trigger), `.claude/agents/reverie-formation.md` (formation subagent) |
| FRG-04 | 09-02, 09-03, 09-04 | Real-time recall via Assay (retrieval, composite ranking, reconstruction through current Self Model frame) | SATISFIED | `composite-scorer.cjs` (6-factor deterministic ranking), `query-builder.cjs` (Assay-compatible queries for passive/explicit paths), `reconstruction-prompt.cjs` (Self Model-framed re-experiencing prompts), `recall-engine.cjs` (orchestrates full recall cycle), `hook-handlers.cjs` (keyword-triggered explicit recall) |

No orphaned requirements: only FRG-03 and FRG-04 are mapped to Phase 9 in REQUIREMENTS.md traceability table, and both are covered.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `reconstruction-prompt.cjs` | 46, 86 | `return null` | INFO | Expected null guards for empty fragment arrays — documented in plan, tested in 10 test cases. Not a stub. |

No blockers or warnings found. No TODO/FIXME/PLACEHOLDER markers in any Phase 9 production files. No hardcoded empty data that flows to rendering.

### Human Verification Required

#### 1. Full Formation Round-Trip in Live Session

**Test:** Start a Claude Code session with Reverie registered. Send a significant user message (30+ characters about a personal topic). Observe that `~/.dynamo/reverie/data/formation/stimulus/` gets a stimulus file written, the `reverie-formation` subagent fires in background, writes JSON to `~/.dynamo/reverie/data/formation/output/latest-output.json`, and `handleSubagentStop` processes the output — resulting in fragment files appearing in `~/.dynamo/reverie/working/`.
**Expected:** 1-3 fragment files created with valid JSON frontmatter, formation group tag shared among siblings, nudge file written at `~/.dynamo/reverie/data/formation/nudges/latest-nudge.md`
**Why human:** The fire-and-forget subagent spawn (via Agent tool in Primary session), file I/O coordination between sessions, and actual Ledger association index writes cannot be exercised without a running Claude Code session with Reverie registered. Tests use mocks for all external dependencies.

#### 2. Passive Nudge Shading Behavior

**Test:** After a formation cycle completes in a live session, send a follow-up user message. Verify that the response is visibly influenced by the nudge — Reverie's inner voice impression should subtly shade the response without explicitly narrating "I remember" or citing past context.
**Expected:** The `[Inner impression: ...]` block appears in `additionalContext` delivered via `UserPromptSubmit` hook, and Claude's response reflects the emotional register of the formation moment without breaking character
**Why human:** Quality of invisible shading (D-11) and the absence of "hollow empathy" patterns require subjective human judgment — no automated test can assess whether a response "feels" influenced vs. mechanically appended.

#### 3. Explicit Recall Quality with Real Fragment Data

**Test:** After 2+ formation cycles in a live session, send "what do you remember about [topic discussed earlier]?". Verify that `recallExplicit` fires (RECALL_KEYWORDS match), Assay returns real fragments, composite scorer ranks them meaningfully, and the reconstruction prompt generates a response framed as genuine re-experiencing rather than data retrieval.
**Expected:** `[Memory reconstruction: ...]` appears in additionalContext, Claude's response uses first-person re-experiencing language ("I noticed...", "What struck me was...") rather than database-style listing
**Why human:** Reconstruction quality (Research flag: EXPERIMENTAL 9.8) has no validated production references. The formation fan-out signal-to-noise ratio (Research flag: EXPERIMENTAL 9.10) can only be assessed with live formation data.

### Gaps Summary

No gaps. All automated verification checks passed. The phase goal — fragment formation and Assay-based recall operational in single-session context — is achieved at the code level. All 15 production files exist with substantive implementations, all key links are wired, all 297 Reverie tests pass with 0 failures. The 3 human verification items above are quality/integration checks for the live subagent coordination pattern, not missing implementations.

---

_Verified: 2026-03-24T18:15:00Z_
_Verifier: Claude (gsd-verifier)_

---
phase: quick
plan: 260318-gcj
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .planning/MILESTONES.md
  - .planning/REQUIREMENTS.md
  - .planning/PROJECT.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "STATE.md reflects v1.2.1 as the current milestone in planning status"
    - "ROADMAP.md has a proper v1.2.1 section with requirement listing"
    - "REQUIREMENTS.md contains all 14 new requirements (STAB-01 through STAB-10, MENH-10, MENH-11, MGMT-11, UI-08)"
    - "MILESTONES.md has a v1.2.1 entry"
    - "PROJECT.md Active requirements, Context, and Key Decisions reflect current state"
  artifacts:
    - path: ".planning/STATE.md"
      provides: "Current project state pointing to v1.2.1"
      contains: "milestone: v1.2.1"
    - path: ".planning/ROADMAP.md"
      provides: "Phase tracking with v1.2.1 detail"
      contains: "v1.2.1 Stabilization and Polish"
    - path: ".planning/REQUIREMENTS.md"
      provides: "Complete requirements registry with STAB and new v1.3 items"
      contains: "STAB-01"
    - path: ".planning/MILESTONES.md"
      provides: "Milestone history including v1.2.1"
      contains: "v1.2.1"
    - path: ".planning/PROJECT.md"
      provides: "Accurate project context"
      contains: "STAB-01"
  key_links: []
---

<objective>
Update all GSD planning documents to reflect the current project state after v1.2 completion and v1.2.1 scoping.

Purpose: The project has evolved through 3 milestones and is now scoping v1.2.1 (Stabilization and Polish). Five planning documents are stale -- they reference v1.2 as current, are missing 14 new requirements (STAB-01 through STAB-10, MENH-10/11, MGMT-11, UI-08), and lack key decisions about repo/branch renames and v1.2.1 insertion. RETROSPECTIVE.md was verified current and needs no changes.

Output: Five updated planning documents accurately reflecting v1.2.1 scoping state.
</objective>

<execution_context>
@/Users/tom.kyser/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tom.kyser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/MILESTONES.md
@MASTER-ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update state, milestone, and roadmap tracking docs</name>
  <files>.planning/STATE.md, .planning/MILESTONES.md, .planning/ROADMAP.md</files>
  <action>
Update three tracking documents to reflect v1.2.1 scoping:

**STATE.md changes:**
- Frontmatter: `milestone: v1.2.1`, `milestone_name: Stabilization and Polish`, `status: scoping`, `stopped_at: v1.2.1 milestone scoped, awaiting /gsd:new-milestone`, `last_activity: 2026-03-18 -- v1.2.1 scoped with 10 STAB requirements`
- Progress: `total_phases: 0`, `completed_phases: 0`, `total_plans: 0`, `completed_plans: 0`, `percent: 0`
- Current Position section: Update to reflect v1.2.1 is scoped but not yet started. Mention all 3 prior milestones shipped (11 phases, 24 plans). State that next step is `/gsd:new-milestone` to formally start v1.2.1.
- Session Continuity: Update stopped_at to reflect doc update activity.

**MILESTONES.md changes:**
- Add a new section at the TOP (before v1.2) for v1.2.1:
  - Title: `## v1.2.1 Stabilization and Polish (Scoping)`
  - Status: Scoped, not yet started
  - Requirements: 10 (STAB-01 through STAB-10)
  - Goal summary: Close gaps between v1.2 CJS rewrite and v1.3 intelligence work -- rebranding, docs, legacy cleanup, CLI integration, update system, architecture capture, Neo4j fix, directory/scope refactor, dev toggles
  - Dependencies: v1.2 (CJS substrate complete)

**ROADMAP.md changes:**
- In the Milestones section at top: expand the v1.2.1 one-liner to include requirement count: `**v1.2.1 Stabilization and Polish** -- 10 requirements (next)`
- Add a new v1.2.1 section below the collapsed v1.2 details block with:
  - Header: `### v1.2.1 Stabilization and Polish`
  - Status: Scoping -- phases and plans to be defined via `/gsd:new-milestone`
  - Requirements listed: STAB-01 through STAB-10 with brief names (source: MASTER-ROADMAP.md)
  - Goal: one-paragraph summary from MASTER-ROADMAP.md
- In the Progress table: Add a row for v1.2.1 showing milestone v1.2.1, Plans "TBD", Status "Scoping", Completed "-"
  </action>
  <verify>
    <automated>grep -c "v1.2.1" .planning/STATE.md .planning/MILESTONES.md .planning/ROADMAP.md | grep -v ":0$" | wc -l</automated>
    Expect: 3 (all three files contain v1.2.1 references). Additionally: `grep "milestone: v1.2.1" .planning/STATE.md` returns a match, `grep "STAB-01" .planning/ROADMAP.md` returns a match, `grep "Scoping" .planning/MILESTONES.md` returns a match.
  </verify>
  <done>STATE.md points to v1.2.1 with scoping status, MILESTONES.md has v1.2.1 entry, ROADMAP.md has detailed v1.2.1 section with all 10 STAB requirements listed.</done>
</task>

<task type="auto">
  <name>Task 2: Update requirements registry and project context</name>
  <files>.planning/REQUIREMENTS.md, .planning/PROJECT.md</files>
  <action>
Update two registry/context documents with new requirements and decisions:

**REQUIREMENTS.md changes:**

1. Add a new section between "v1.2 Requirements" and "Future Requirements" titled `## v1.2.1 Requirements` with subheader "Requirements for stabilization and polish of the v1.2 CJS foundation."

2. Under a `### Stabilization` subheader, add STAB-01 through STAB-10 as unchecked items following the existing format pattern (`- [ ] **STAB-XX**: description`). Use the names and rationale from MASTER-ROADMAP.md:
   - STAB-01: README and rebranding pass -- README reflects Dynamo identity, repo renamed on GitHub
   - STAB-02: Archive legacy Python/Bash system -- tag, branch, and remove from dev/master
   - STAB-03: Exhaustive documentation -- architecture, usage, CLI, hooks, config, dev guide
   - STAB-04: Dynamo CLI integration in CLAUDE.md -- complete operational instructions for Claude Code
   - STAB-05: Update/upgrade system -- version checks, migration, rollback
   - STAB-06: Architecture and design decision capture -- deep analysis of v1.0-v1.2 decisions
   - STAB-07: Fix Neo4j admin browser connectivity -- port 7475 not accessible
   - STAB-08: Directory structure refactor -- dynamo/, ledger/, switchboard/ as root-level directories
   - STAB-09: Component scope refactor -- honor Dynamo/Ledger/Switchboard boundaries in code
   - STAB-10: Global on/off and dev mode toggles -- disable hooks globally, dev override per-thread

3. In the "Future Requirements" section, add 4 new items to their respective subsections:
   - Under "### Memory Enhancement": Add MENH-10 (Dynamic curation depth) and MENH-11 (Proactive intelligent ingestion) after MENH-09
   - Under "### Management Enhancement": Add MGMT-11 (Session index refactor to SQLite) after MGMT-10
   - Under "### UI": Add UI-08 (Inline Dynamo visibility in Claude thread) after UI-07

4. Update the Traceability section:
   - Add a v1.2.1 traceability block (all STAB items unmapped to phases, status "Pending")
   - Update Coverage to note: "v1.2.1 requirements: 10 total, Mapped to phases: 0, Unmapped: 10 (awaiting milestone start)"

5. Update header metadata: `**Defined:** 2026-03-17` stays, add `**Last updated:** 2026-03-18`

**PROJECT.md changes:**

1. Active requirements section: Replace "(None -- next milestone requirements defined via `/gsd:new-milestone`)" with a list of STAB-01 through STAB-10 formatted as unchecked items (matching the Validated section pattern but without the checkmark). Brief one-line descriptions only.

2. Context section: Change "Future backlog (26 items across memory enhancement, management, UI)" to "Future backlog (36 items across stabilization, memory enhancement, management, UI)" -- the count is now 10 STAB + 11 MENH + 11 MGMT + 7 UI = 39... wait, let me recount. Actually count the full MASTER-ROADMAP: 10 STAB + 9 MENH + 10 MGMT + 7 UI = 36 items BUT 10 STAB are being actively addressed in v1.2.1, so the "future backlog" is the items beyond v1.2.1. The phrasing should say: "v1.2.1 has 10 stabilization requirements. Future backlog beyond v1.2.1: 26 items across memory enhancement, management, UI documented in MASTER-ROADMAP.md." This preserves accuracy -- the original 26 were the deferred items, and the 10 STAB are new additions for v1.2.1.

3. Key Decisions table: Add three new rows:
   - `| Repo renamed to "dynamo" on GitHub | Reflect Dynamo identity in repo name, not just internal naming | Pending |`
   - `| Branch renamed from main to master | Team convention preference; aligns with project terminology | Done |`
   - `| Insert v1.2.1 before v1.3 | Close stabilization gaps (docs, branding, legacy cleanup, toggles) before building intelligence layer | Done -- 10 STAB requirements scoped |`

4. Update the "Last updated" footer timestamp and note.
  </action>
  <verify>
    <automated>grep -c "STAB-01" .planning/REQUIREMENTS.md .planning/PROJECT.md | grep -v ":0$" | wc -l</automated>
    Expect: 2 (both files contain STAB-01). Additionally: `grep "MENH-10" .planning/REQUIREMENTS.md` returns a match, `grep "MGMT-11" .planning/REQUIREMENTS.md` returns a match, `grep "UI-08" .planning/REQUIREMENTS.md` returns a match, `grep "repo renamed" .planning/PROJECT.md` returns a match (case-insensitive).
  </verify>
  <done>REQUIREMENTS.md contains all 14 new requirement entries (10 STAB + MENH-10/11 + MGMT-11 + UI-08) with proper traceability. PROJECT.md Active section lists STAB-01 through STAB-10, Context reflects accurate backlog counts, Key Decisions includes repo rename, branch rename, and v1.2.1 insertion.</done>
</task>

</tasks>

<verification>
After both tasks complete, verify the full set of updates:

1. `grep "milestone: v1.2.1" .planning/STATE.md` -- confirms STATE points to v1.2.1
2. `grep -c "STAB-" .planning/REQUIREMENTS.md` -- should return 10+ (STAB-01 through STAB-10)
3. `grep -c "STAB-" .planning/PROJECT.md` -- should return 10+ (Active requirements)
4. `grep "MENH-10\|MENH-11\|MGMT-11\|UI-08" .planning/REQUIREMENTS.md` -- all 4 new future items present
5. `grep "v1.2.1" .planning/ROADMAP.md` -- v1.2.1 section exists
6. `grep "v1.2.1" .planning/MILESTONES.md` -- v1.2.1 entry exists
7. `grep "repo renamed\|branch renamed\|v1.2.1 before" .planning/PROJECT.md` -- all 3 new decisions present (case-insensitive grep with -i)
</verification>

<success_criteria>
All 5 planning documents accurately reflect the current project state:
- STATE.md: v1.2.1 milestone, scoping status
- ROADMAP.md: v1.2.1 section with 10 STAB requirements listed
- MILESTONES.md: v1.2.1 entry with scope and goals
- REQUIREMENTS.md: 14 new requirement entries (10 STAB, 4 v1.3 additions) with traceability
- PROJECT.md: Active requirements, accurate backlog counts, 3 new key decisions
- RETROSPECTIVE.md: Verified current, no changes needed
</success_criteria>

<output>
After completion, create `.planning/quick/260318-gcj-update-gsd-planning-docs-to-reflect-curr/260318-gcj-SUMMARY.md`
</output>

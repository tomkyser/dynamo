# Dynamo

## What This Is

A Claude Code power-user platform, Dynamo, comprising two systems: **Ledger** (memory — knowledge storage, retrieval, inference via Graphiti) and **Switchboard** (management — hooks, diagnostics, sync, stack, CLI). Built on a Node/CJS shared substrate at `~/.claude/dynamo/` with 272 passing tests. v1.0 researched and ranked tools. v1.1 diagnosed and fixed the memory system. v1.2 rewrote the entire foundation from Python/Bash to CJS with full feature parity.

## Core Value

Every capability must be self-manageable by Claude Code (install, configure, update, troubleshoot) without requiring manual user intervention in config files.

## Current Milestone: v1.2.1 Stabilization and Polish

**Goal:** Close the gaps between v1.2's CJS rewrite and v1.3's intelligence work — branding, documentation, legacy cleanup, directory restructure, dev toggles, and architecture capture.

**Target features:**
- Complete Dynamo rebranding (README, repo, docs, directory structure)
- Archive and remove legacy Python/Bash system
- Exhaustive documentation and CLAUDE.md integration
- Update/upgrade system for self-management
- Global on/off and dev mode toggles
- Neo4j admin browser fix
- Architecture and design decision capture for development continuity

## Requirements

### Validated

- ✓ Graphiti MCP for memory/knowledge graph — existing, fully operational
- ✓ DDEV + Docker local dev environment — existing
- ✓ GSD framework for project planning/execution — existing
- ✓ Vetting protocol with 4 binary hard gates — v1.0
- ✓ Anti-features list with named exclusions — v1.0
- ✓ Ranked report with 5 primary + 2 conditional tool recommendations — v1.0
- ✓ Root cause diagnosis of silent hook failures (GRAPHITI_GROUP_ID override) — v1.1
- ✓ Root cause diagnosis of missing project-scoped memories — v1.1
- ✓ Hook reliability: all hooks persist or visibly fail, with error logging — v1.1
- ✓ Session management: list, view, label, auto-name via CLI — v1.1
- ✓ Memory system verified end-to-end with verify-memory command — v1.1
- ✓ Bidirectional sync between live ~/.claude and this repo — v1.1
- ✓ CJS architectural foundation (shared substrate for Ledger + Switchboard) — v1.2
- ✓ Dynamo/Ledger/Switchboard branding and project restructure — v1.2
- ✓ Modular injection pattern established — v1.2
- ✓ Feature parity: existing hooks, session mgmt, health checks, sync on CJS — v1.2
- ✓ Master Roadmap: prioritize and assign backlog to v1.3-v2.0 — v1.2
- ✓ STAB-08: Directory structure refactor — v1.2.1 Phase 12
- ✓ STAB-09: Component scope refactor — v1.2.1 Phase 12
- ✓ STAB-10: Global on/off and dev mode toggles — v1.2.1 Phase 12
- ✓ STAB-02: Archive legacy Python/Bash system — Validated in Phase 13: Cleanup and Fixes
- ✓ STAB-07: Neo4j admin browser fix — Validated in Phase 13: Cleanup and Fixes
- ✓ STAB-01: README and rebranding pass — Validated in Phase 14: Documentation and Branding
- ✓ STAB-03: Exhaustive documentation — Validated in Phase 14: Documentation and Branding
- ✓ STAB-04: Dynamo CLI integration in CLAUDE.md — Validated in Phase 14: Documentation and Branding
- ✓ STAB-06: Architecture and design decision capture — Validated in Phase 14: Documentation and Branding

### Active (v1.2.1)

- STAB-05: Update/upgrade system

### Out of Scope

- Database/SQL access MCPs — not requested
- Real-time chat/notification for errors — visible error output is sufficient
- ESM modules — CJS is the standard in this ecosystem

## Context

Shipped v1.0 (research), v1.1 (memory fixes), and v1.2 (CJS rewrite) across 11 phases and 28 plans.
Phase 12 complete — repo restructured into 3 root directories (`dynamo/`, `ledger/`, `switchboard/`), boundary enforcement added, global toggle with blackout capability, all MCP tools wrapped as CLI commands.
Phase 13 complete — legacy Python/Bash system tagged (`v1.2-legacy-archive`), archived, and fully removed. Neo4j admin browser accessible at localhost:7475 with working Bolt connection.
Phase 14 complete — README rewritten (537 lines, Mermaid diagram, 25 CLI commands), CLAUDE.md template expanded with 20+ commands and troubleshooting, PROJECT.md expanded with 19 structured decision records, all 7 codebase maps rewritten for CJS architecture.
Tech stack: Node/CJS (dynamo/), Docker (Graphiti stack), Claude Haiku (session naming via OpenRouter).
Total project: ~7,000 LOC CJS (3,585 production + 3,382 test) plus prompts.
Python/Bash legacy retired to `~/.claude/graphiti-legacy/`.
v1.2.1 has 10 stabilization requirements (STAB-01 through STAB-10). Future backlog beyond v1.2.1: 26 items across memory enhancement, management, UI documented in MASTER-ROADMAP.md.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Research only, no install | User wants vetted list first, will install later | ✓ Good — clean separation |
| Global scope only | Tools should be universally available, not per-project | ✓ Good |
| Full lifecycle self-management | User never wants to manually edit config files | ✓ Good |
| Lean final list (5-8) | Quality over quantity | ✓ Good — 5+2 recommendations |
| Diagnostic-first milestone (v1.1) | Fix memory before adding features | ✓ Good — root causes found and fixed |
| Global scope + [project] content prefix | Graphiti v1.21.0 rejects colon in group_id | ✓ Good — workaround documented |
| Two-phase auto-naming via Haiku | Cost-efficient (~$0.001/call) with graceful degradation | ✓ Good |
| Foreground hook execution with 5s timeout | Error capture requires foreground; fast timeout prevents blocking | ✓ Good |
| Rebrand to Dynamo/Ledger/Switchboard | Separate memory from management for independent evolution | ✓ Good — clean architecture |
| CJS rewrite over Python/Bash | GSD-pattern CJS is proven, modular, testable; unifies tech stack | ✓ Good — 272 tests, feature parity |
| Feature parity before new features | Stable foundation first, new capabilities in v1.3+ | ✓ Good — foundation solid |
| Content-based sync (Buffer.compare) | More accurate than mtime-only conflict detection | ✓ Good |
| Options-based test isolation | Stage/module functions accept overrides for test isolation | ✓ Good — all tests use tmpdir |
| Settings.json backup before modification | Atomic write (tmp+rename) with .bak for rollback | ✓ Good — safe cutover |
| Graphiti MCP deregistered; CLI commands replace MCP tools | Toggle blackout requires all memory access through Dynamo CLI | ✓ Good — complete blackout when disabled |
| Repo renamed to "dynamo" on GitHub | Reflect Dynamo identity in repo name, not just internal naming | Done |
| Branch renamed from main to master | Team convention preference; aligns with project terminology | Done |
| Insert v1.2.1 before v1.3 | Close stabilization gaps (docs, branding, legacy cleanup, toggles) before building intelligence layer | Done -- 10 STAB requirements scoped |

## Decision Detail

### Decision: Research only, no install

**Context:** During v1.0 scoping (Phases 1-3), the user wanted to evaluate available Claude Code tools before committing to any. The project started as a research-first effort to vet and rank MCP tools, CLI integrations, and workflow utilities.

**Alternatives Considered:**
- Install tools directly: Jump straight to installation and test in production. Rejected because it risks polluting the global config with poorly vetted tools.
- Build from scratch: Write custom tools without surveying the landscape. Rejected because existing tools might already solve the problem.

**Constraints:**
- User wanted a vetted, ranked list before making any installation decisions

**Downstream Implications:**
- Created a clean separation between research phases (v1.0) and implementation phases (v1.1+)
- The ranked report became the foundation for all subsequent tool choices
- If reversed, would need to audit and potentially remove already-installed tools

### Decision: Global scope only

**Context:** During v1.0 methodology design (Phase 1), the question arose whether tools should be installed per-project or globally. The user's workflow spans many projects and they wanted consistent tooling everywhere.

**Alternatives Considered:**
- Per-project tool sets: Install tools per-project via local config. Rejected because it creates maintenance burden across many projects.
- Workspace-level: Use VS Code workspace settings. Rejected because Claude Code operates at the global ~/.claude/ level.

**Constraints:**
- Tools should be universally available, not per-project
- Claude Code's config lives at ~/.claude/ (global)

**Downstream Implications:**
- Everything installs to ~/.claude/, no per-project config files
- Scoping of memory content still exists (project-name prefix) but the tools themselves are global
- If reversed, would need per-project install/config mechanism

### Decision: Full lifecycle self-management

**Context:** This is the core project value, established from day one. The user never wants to manually edit config files, restart services, or debug hook registrations by hand.

**Alternatives Considered:**
- Manual config editing: User edits ~/.claude/settings.json and other files directly. Rejected as the primary anti-requirement.
- Partial automation: Automate install but require manual config tweaks. Rejected because it still leaves manual steps.

**Constraints:**
- User never wants to edit config files manually
- Every feature must have a CLI or automated path

**Downstream Implications:**
- Shapes the entire Switchboard component (install, sync, rollback, health-check, diagnose, verify-memory)
- Every new feature must include its own management story
- If reversed, would eliminate ~50% of the Switchboard codebase

### Decision: Lean final list (5-8)

**Context:** During v1.0 synthesis (Phase 3), the methodology called for quality over quantity. Rather than recommending every tool that passed vetting, the final report narrowed to the most impactful options.

**Alternatives Considered:**
- Comprehensive catalog: List all tools that passed any gate. Rejected because it doesn't help the user prioritize.
- Per-category recommendations: Top pick per category (memory, testing, etc.). Rejected because categories overlap.

**Constraints:**
- Quality over quantity -- each recommendation must clearly justify its inclusion

**Downstream Implications:**
- Produced 5 primary + 2 conditional recommendations
- The lean list focused subsequent phases on Graphiti (memory) as the highest-impact tool
- If reversed, would have spread effort across more tools with less depth

### Decision: Diagnostic-first milestone (v1.1)

**Context:** After v1.0 research, the memory system (Graphiti) was selected and installed but was silently failing. v1.1 was scoped to fix before building new features.

**Alternatives Considered:**
- Add features first: Build new capabilities on top of the broken system. Rejected because silent failures would compound.
- Rewrite immediately: Skip diagnostics and jump to CJS rewrite. Rejected because root causes were unknown.

**Constraints:**
- Can't build on a broken foundation -- need to understand what's failing and why

**Downstream Implications:**
- Root causes found: GRAPHITI_GROUP_ID override bug, colon separator rejection in Graphiti v1.21.0
- These findings directly informed v1.2's scope separation and CJS design
- If reversed, would have built features on a silently broken system

### Decision: Global scope + [project] content prefix

**Context:** During v1.1 debugging (Phases 4-5), the root cause of missing project-scoped memories was discovered: Graphiti v1.21.0 rejects colons in group_id. The original `project:name` format was invalid.

**Alternatives Considered:**
- Patch Graphiti: Modify the Graphiti server to accept colons. Rejected because it requires maintaining a fork.
- Use different separator in API: Pass colon-separated IDs through an encoding layer. Rejected because it adds complexity with no benefit.

**Constraints:**
- Cannot modify Graphiti server (external dependency)
- Must maintain project-level memory isolation

**Downstream Implications:**
- All scopes use dash separator: `project-name`, `session-timestamp`, `task-descriptor`
- Content tagged with `[project-name]` prefix for filtering within a scope
- Scope constants defined in `ledger/scope.cjs` enforce the pattern
- If reversed, would need to patch Graphiti or find another workaround

### Decision: Two-phase auto-naming via Haiku

**Context:** During Phase 9 session management implementation (09-02), sessions needed human-readable names. Manual naming was impractical, so an LLM-based auto-naming approach was designed.

**Alternatives Considered:**
- User-provided names only: Require the user to name every session. Rejected because it creates friction.
- GPT-based naming: Use OpenAI for naming. Rejected because OpenRouter provides cheaper access to Haiku.

**Constraints:**
- Cost-efficient naming (~$0.001/call via OpenRouter)
- Must degrade gracefully if OpenRouter is unavailable

**Downstream Implications:**
- Sessions auto-named on first prompt (quick name) and on Stop (refined name)
- Depends on OpenRouter API key in .env and `curation.model` config
- Backfill command (`dynamo session backfill`) available for unnamed sessions
- If reversed, sessions would have only timestamp-based IDs

### Decision: Foreground hook execution with 5s timeout

**Context:** During Phase 8-9 hook design, the question was whether hooks should run in the foreground (blocking) or background (fire-and-forget).

**Alternatives Considered:**
- Background/fire-and-forget for all hooks: Run hooks asynchronously without waiting. Rejected because error capture is impossible without foreground execution.
- No timeout: Let hooks run indefinitely in foreground. Rejected because it could block Claude Code.

**Constraints:**
- Error capture requires foreground execution (must catch and log failures)
- Must not block Claude Code (user experience priority)

**Downstream Implications:**
- All hooks always exit 0 -- errors are logged to hook-errors.log, never thrown
- 5-second timeout on stdin prevents hung hooks from blocking Claude Code
- Hook errors are silently logged, maintaining Claude Code responsiveness
- If reversed, would lose error visibility or risk blocking Claude Code

### Decision: Rebrand to Dynamo/Ledger/Switchboard

**Context:** During Phase 8 identity design, the project needed a name and component structure that separated concerns clearly.

**Alternatives Considered:**
- Keep "Graphiti Memory System" name: Continue using the Graphiti name for the whole system. Rejected because Graphiti is a dependency, not the project itself.
- Single monolithic name: One name for everything. Rejected because memory and management are distinct concerns.

**Constraints:**
- Separate memory from management for independent evolution
- Names should immediately communicate component responsibility

**Downstream Implications:**
- 3-directory architecture: `dynamo/` (orchestration), `ledger/` (memory), `switchboard/` (operations)
- Import boundaries enforced: no cross-imports between Ledger and Switchboard
- Naming conventions throughout codebase (files, functions, comments)
- If reversed, would collapse back to a monolithic structure with tangled concerns

### Decision: CJS rewrite over Python/Bash

**Context:** During Phase 8 foundation design, the entire system was implemented in Python scripts and Bash hooks. The decision was made to rewrite everything in Node.js CommonJS.

**Alternatives Considered:**
- Improve Python/Bash: Fix and extend the existing implementation. Rejected because two languages, fragile shell scripts, and venv dependency management were unsustainable.
- Migrate to ESM: Use modern ES Modules instead of CommonJS. Rejected because GSD framework, Claude Code hooks, and the ecosystem use CJS.
- Use TypeScript: Add type safety. Rejected because it adds a build step and compilation dependency.

**Constraints:**
- GSD-pattern CJS is proven in the Claude Code ecosystem
- Unifies tech stack (hooks, settings generation, CLI all in one language)
- Zero npm dependencies beyond js-yaml

**Downstream Implications:**
- node:test for testing (built-in, no test framework dependency), 272+ tests
- Full feature parity with legacy system achieved
- Every module uses the same patterns (switch/case router, options-based injection, JSON output)
- If reversed, would need to reintroduce Python, Bash, venv, and multi-language tooling

### Decision: Feature parity before new features

**Context:** During v1.2 scoping, the question was whether to add new features during the CJS rewrite or just replicate the existing functionality.

**Alternatives Considered:**
- Add new features during rewrite: Build new capabilities while porting. Rejected because it increases risk and makes it impossible to validate parity.
- Skip legacy features: Only implement the most-used features. Rejected because every existing feature was in use.

**Constraints:**
- Stable foundation first -- must prove the rewrite works before building on it

**Downstream Implications:**
- v1.2 is a pure rewrite with no new user-facing capabilities
- All new features deferred to v1.3+
- Enables clean "before/after" comparison for each ported feature
- If reversed, would have mixed new and ported features, making regression detection harder

### Decision: Content-based sync (Buffer.compare)

**Context:** During Phase 10 sync design, the bidirectional sync between repo and live deployment needed a reliable way to detect which files had changed.

**Alternatives Considered:**
- mtime-based comparison: Use file modification timestamps. Rejected because mtime is unreliable across git operations and different filesystems.
- Hash-based (SHA): Compute SHA hashes for comparison. Rejected as unnecessarily complex when Buffer.compare achieves the same result.

**Constraints:**
- Need accurate conflict detection without false positives
- Must handle three directory pairs (dynamo/, ledger/, switchboard/)

**Downstream Implications:**
- Sync never overwrites identical files (reduces unnecessary churn)
- Per-pair excludes array (e.g., tests excluded from dynamo/ sync) for clean iteration
- SYNC_PAIRS data structure in sync.cjs maps repo paths to deployed paths
- If reversed, would risk false-positive overwrites or missed changes

### Decision: Options-based test isolation

**Context:** During Phase 8 test design, a pattern was needed for testing CJS modules without module-level mocking frameworks.

**Alternatives Considered:**
- Module mocking: Use jest-style module mocks. Rejected because node:test doesn't have built-in mocking for require().
- Dependency injection containers: Use a DI framework. Rejected as overkill for this codebase size.
- Env var switching: Use environment variables to select test vs. production behavior. Rejected because it's fragile and leaks state.

**Constraints:**
- CJS doesn't have clean mock patterns like ESM
- Every test must be fully isolated (no shared state, no real filesystem side effects)

**Downstream Implications:**
- Every stage/module function accepts an options parameter with overrides
- All tests use tmpdir for filesystem operations -- never touch real ~/.claude/
- 100% test isolation achieved across 272+ tests
- If reversed, would need a mocking framework or accept flaky tests

### Decision: Settings.json backup before modification

**Context:** During Phase 10 install safety design, the installer modifies ~/.claude/settings.json to register hooks. This file contains user content beyond Dynamo's hooks.

**Alternatives Considered:**
- No backup: Overwrite settings.json without preserving the original. Rejected because it risks losing non-Dynamo user settings.
- Git-based rollback only: Rely on git to recover. Rejected because ~/.claude/ is not a git repo.

**Constraints:**
- User's settings.json has non-Dynamo content that must be preserved
- Install must be safely reversible

**Downstream Implications:**
- Atomic write pattern: write to tmp file then rename (prevents partial writes)
- .bak file created before every modification
- `dynamo rollback` command restores from .bak and undoes retirement
- If reversed, would risk corrupting user's settings.json on failed install

### Decision: Graphiti MCP deregistered; CLI wraps tools

**Context:** During Phase 12 toggle design, the global on/off toggle needed to provide complete blackout -- no memory access when disabled. The Graphiti MCP was registered directly in ~/.claude.json, bypassing the toggle.

**Alternatives Considered:**
- Keep MCP registered with toggle-aware wrapper: Wrap the MCP connection in a toggle check. Rejected because MCP registration is in a config file Claude Code reads directly -- no hook intercept point.
- Dual interface: Keep both MCP and CLI active. Rejected because it creates two paths that can diverge.

**Constraints:**
- Toggle blackout requires ALL memory access to go through Dynamo CLI
- MCP registered in ~/.claude.json is read by Claude Code directly, outside Dynamo's control

**Downstream Implications:**
- MCP removed from ~/.claude.json by installer
- All 9 MCP tools wrapped as CLI commands (search, remember, recall, edge, forget, clear, etc.)
- Complete blackout when disabled: `dynamo toggle off` stops all memory operations
- If reversed, would need to re-register MCP and maintain two access paths

### Decision: Repo renamed to "dynamo" on GitHub

**Context:** Before Phase 14, the GitHub repo was renamed from "my-cc-setup" to "dynamo" to reflect the project's identity after the v1.2 CJS rewrite established the Dynamo brand.

**Alternatives Considered:**
- Keep "my-cc-setup" name: Leave the original generic name. Rejected because it doesn't communicate what the project is.
- Use "claude-dynamo": More descriptive but longer. Rejected in favor of the shorter, cleaner "dynamo".

**Constraints:**
- Name should reflect Dynamo identity
- GitHub handles redirects from old name automatically

**Downstream Implications:**
- All documentation references updated to use "dynamo" repo name
- Local git remote already points to new URL (GitHub redirects old URLs)
- If reversed, would need to rename repo back and update all references

### Decision: Insert v1.2.1 before v1.3

**Context:** After v1.2 shipped, stabilization gaps were identified: outdated docs, legacy code still present, no toggles, no architecture capture. Rather than proceeding to v1.3 intelligence work, a v1.2.1 stabilization milestone was inserted.

**Alternatives Considered:**
- Go straight to v1.3 intelligence work: Start building new memory features immediately. Rejected because the foundation had documentation and cleanup gaps that would compound.

**Constraints:**
- Docs were outdated (still described Python/Bash system)
- Legacy code still present in the repo
- No global toggle mechanism existed
- Architecture decisions not captured for development continuity

**Downstream Implications:**
- 10 STAB requirements scoped (STAB-01 through STAB-10)
- 4 phases added (12-15): Structural Refactor, Cleanup and Fixes, Documentation and Branding, Update System
- Delays v1.3 intelligence work but provides a solid, documented, well-organized foundation
- If reversed, would build intelligence features on an undocumented, cluttered codebase

### Decision: Branch renamed from main to master

**Context:** Early in the project, the default branch was renamed from `main` to `master` to align with the user's convention preference.

**Alternatives Considered:**
- Keep main: Use the GitHub default branch name. Rejected because the user prefers `master`.

**Constraints:**
- Must align with the user's terminal and project terminology

**Downstream Implications:**
- All CI/CD references, documentation, and merge instructions use `master`
- Development workflow: work on `dev`, merge to `master` on milestone completion
- If reversed, would need to update all references back to `main`

### Decision: Structural refactors before documentation

**Context:** During v1.2.1 phase ordering, the question was whether to write documentation first or restructure code first. Documentation was placed after structural refactors (Phases 12-13 before 14).

**Alternatives Considered:**
- Docs first then refactor: Write documentation, then restructure and update docs again. Rejected because it creates double work -- docs would describe paths that change during refactoring.

**Constraints:**
- Documentation should describe the final state, not an intermediate state
- File paths referenced in docs must be stable

**Downstream Implications:**
- Phases 12-13 (refactor, cleanup) completed before Phase 14 (documentation)
- Documentation now describes stable, final file paths and directory structure
- If reversed, documentation would have needed a second pass after refactoring

## Constraints

- **Self-management**: Claude Code must be able to fully manage the tool lifecycle
- **Scope**: Global only — lives in ~/.claude or global config
- **Platform**: macOS (Darwin), zsh, Homebrew available
- **Architecture**: Node/CJS, zero npm dependencies beyond js-yaml
- **Testing**: node:test built-in, 100% test isolation via tmpdir
- **Component scope**: Dynamo (orchestration/CLI), Ledger (memory/knowledge), Switchboard (management/ops) — boundaries must be honored in design, code, and naming
- **Branch workflow**: Development on `dev` branch. Push to origin after commits. Merge dev → master and push on milestone completion only.
- **Disruption awareness**: Notify the user when testing or development will interrupt current usage of any part of Dynamo in the active thread or any other active Claude threads.

## Per-Phase Checklist

These items must be assessed during every phase's planning and execution. Not all will apply every phase — but each must be explicitly evaluated and addressed if affected.

- [ ] **User-facing docs and README**: Deep pass to assess what needs to be modified or added. Update as changes are made within the phase, not deferred.
- [ ] **Sync, install, and update scripts**: Deep pass to assess if affected by this phase's changes. Update if so.
- [ ] **Component scope adherence**: Verify that Dynamo/Ledger/Switchboard scope boundaries are honored in both design and naming. Flag violations and address in phase discussion.
- [ ] **CLAUDE.md and injectable templates**: Update to reflect current usage and rules of Dynamo and its systems (both passive and active). Include self-management instructions to keep Dynamo up to date.
- [ ] **Dynamo toggle awareness**: If a global on/off or dev mode toggle exists, ensure phase work respects it and updates toggle behavior if scope changes.

---
*Last updated: 2026-03-18 after Phase 14 Plan 02 (CLAUDE.md + PROJECT.md expansion)*

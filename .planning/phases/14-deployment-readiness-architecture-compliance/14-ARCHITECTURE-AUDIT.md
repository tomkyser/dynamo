# Architecture Compliance Audit -- Phase 14

**Audited:** 2026-03-27
**Scope:** Contract bypass, hardcoded values, engineering principle compliance
**Criteria:** ROADMAP Phase 14 Success Criteria #6
**Auditor:** Automated + manual code review

## Audit Results

### Contract Bypass Check

| Area | Files Checked | Violations | Details |
|------|---------------|------------|---------|
| Hook registration bypass | 124 | 0 | Searched all .cjs files for direct `require('./hooks')` or `require('../armature/hooks')` outside Armature/Exciter. Only legitimate consumers found: `core/armature/index.cjs`, `core/armature/lifecycle.cjs`, `core/services/exciter/exciter.cjs`. Modules access hooks exclusively through `exciter.registerHooks()`. |
| Settings.json direct writes | 124 | 0 | Searched for `writeFileSync.*settings.json`, `Bun.write.*settings.json`. No direct writes to `.claude/settings.json` outside Exciter's settings-manager. All settings mutations route through `exciterFacade.updateSettings()`. |
| Agent definition direct writes | 124 | 0 | Searched for `writeFileSync.*agents/`, `Bun.write.*agents/`. No direct writes to `.claude/agents/` outside Exciter's agent-manager. Agent definitions route through `exciter.installAgent()`. |
| Skill registration direct writes | 124 | 0 | Searched for `writeFileSync.*skills/`, `Bun.write.*skills/`. No direct writes to `.claude/skills/` outside Exciter's skill-manager. Skills route through `exciter.registerSkill()`. |
| Circuit direct import in modules | 52 | 0 | Searched all module .cjs files for `require('./circuit')` or `require('../sdk/circuit')`. Modules receive the Circuit API via the `register(facade)` callback parameter -- no direct imports. |

### Hardcoded Values Check

| Area | Files Checked | Violations | Details |
|------|---------------|------------|---------|
| Hardcoded file paths in modules | 52 | 0 | Searched module code for `/data/ledger.db`, `/data/journal`. No hardcoded provider paths found. All data paths flow through bootstrap config (`paths.root + '/data/...'`) or module constants (`DATA_DIR_DEFAULT`). |
| Hardcoded .claude/ paths in modules | 52 | 0 | Searched module code for `.claude/` references. One match in `skills/skill-content.test.cjs` (test mock path) -- legitimate. No production code hardcodes `.claude/` paths; all route through Exciter. |
| Magic numbers outside constants | 52 | 0 | Module constants centralized in `modules/reverie/lib/constants.cjs` with `Object.freeze()`. `DATA_DIR_DEFAULT`, `DECAY_DEFAULTS`, `FORMATION_DEFAULTS`, `NUDGE_DEFAULTS`, token budgets, and all numeric thresholds sourced from constants file. No inline magic numbers in production code. |
| process.argv in CLI handlers | 6 | 0 | Searched `modules/reverie/components/cli/*.cjs` for `process.argv`. Only comment references found (documentation noting process.argv is no longer used). All CLI handlers read from Pulley's `flags` parameter. |

### Engineering Principles Check

| Principle | Sample Files | Compliant | Notes |
|-----------|-------------|-----------|-------|
| Services do, Providers supply | `switchboard.cjs`, `wire.cjs`, `exciter.cjs`, `journal.cjs`, `ledger.cjs`, `lithograph.cjs` | Yes | Services contain operational logic (event dispatch, session lifecycle, hook wiring). Providers implement CRUD data access only (file read/write, SQL queries). No business logic in providers; no data persistence in services. |
| No LLM APIs below SDK | All `core/` (55 files) + `modules/reverie/` (52 files) | Yes | Searched for `openai`, `anthropic`, `api.openai.com`, `api.anthropic.com`, `chatgpt`. Only matches: test assertions verifying absence of LLM imports, and documentation comments referencing Anthropic research papers. Zero actual LLM API calls. |
| Factory functions return Result | `switchboard.cjs`, `wire.cjs`, `ledger.cjs`, `circuit.cjs`, `hooks.cjs` | Yes | All public factory functions use `ok()`/`err()` Result pattern from `lib/result.cjs`. Container lifecycle, SDK, and module registration all propagate Result types. |
| Inversion of Control | `core.cjs`, `reverie.cjs` | Yes | All dependencies injected via container registration (`mapDeps`) or factory options. Modules receive services through `facade.getService()`, never via direct `require()` of service internals. |
| Hardcode nothing | `core.cjs`, `reverie.cjs`, `constants.cjs` | Yes | Bootstrap paths from `discoverRoot()` + `createPaths()`. Module data dir from `DATA_DIR_DEFAULT` constant. Config from `loadConfig()`. Hook types enumerated from `HOOK_SCHEMAS`. No inline literal paths or magic values. |

## Summary

**Verdict:** PASS
**Violations found:** 0
**Violations requiring fix:** 0
**Deferred items:** None

The Dynamo platform's core value -- "Everything routes through Dynamo" -- holds across all audited components. No module bypasses Armature/Circuit contracts to access Claude Code surfaces directly. No hardcoded paths or values exist that should route through config/Magnet/providers. All engineering principles (separation of concerns, IoC, Result types, no LLM APIs below SDK) are compliant.

### Specific Compliance Evidence

1. **Hook registration:** Reverie registers all 8 hooks exclusively via `exciter.registerHooks()` (reverie.cjs:379). Exciter internally delegates to Armature's `createHookRegistry()`. No bypass.

2. **Settings.json:** Generated at bootstrap step 7.7 via `exciterFacade.updateSettings()` (core.cjs:248). Settings-manager handles deduplication and file I/O through Lathe. No bypass.

3. **CLI flags:** All CLI handlers (status, inspect, history, reset, backfill) read from Pulley's `flags` parameter. Zero `process.argv` usage in handler code (verified: only documentation comments reference it).

4. **Module isolation:** Reverie receives Circuit API via `register(facade)`. All service access through `facade.getService()`. No direct `require()` of platform internals from module code.

5. **Constants centralization:** All module constants in `modules/reverie/lib/constants.cjs` with `Object.freeze()`. No scattered magic numbers.

---
*Audit completed: 2026-03-27*
*Scope: 124 .cjs files across core/ and modules/reverie/*

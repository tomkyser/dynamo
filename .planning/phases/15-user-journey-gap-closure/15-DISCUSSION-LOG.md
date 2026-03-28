# Phase 15: User Journey Gap Closure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 15-user-journey-gap-closure
**Areas discussed:** Session start/stop commands, First-use onboarding flow, Skill content accuracy, Error path user experience, Formation agent accuracy, README/install docs, CLI help text quality, Validation suite coverage

---

## Session Start/Stop Commands

### How should session start/stop work?

| Option | Description | Selected |
|--------|-------------|----------|
| Implement real commands | Add `dynamo reverie start` and `dynamo reverie stop` as Pulley CLI commands | ✓ |
| Update skill to match reality | Remove start/stop references from /reverie skill, accept hook-only behavior | |
| Hybrid: commands + auto behavior | Implement commands AND keep automatic hook behavior | |

**User's choice:** Implement real commands
**Notes:** Commands give users explicit control over session mode transitions.

### What should `reverie start` do when already Passive?

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade to Active | If Passive, upgrade to Active (spawn Secondary+Tertiary). If Active, report state. | ✓ |
| No-op with status | Just show status if already running in any mode | |
| You decide | Claude decides based on Mode Manager patterns | |

**User's choice:** Upgrade to Active
**Notes:** Uses Mode Manager's existing requestActive() path.

### Should `reverie stop` trigger REM?

| Option | Description | Selected |
|--------|-------------|----------|
| Always trigger REM | Stop always runs Tier 3 full REM before shutdown | ✓ |
| Flag: --skip-rem | Default REM, but --skip-rem for quick shutdown | |
| You decide | Claude decides based on existing lifecycle | |

**User's choice:** Always trigger REM
**Notes:** Clean shutdown is the only shutdown. Matches Stop hook behavior.

---

## First-Use Onboarding Flow

### How should the first-time user discover Reverie?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent with status hint | Subtle hint in additionalContext on first UserPromptSubmit | |
| First-run welcome message | Brief welcome on first SessionStart when no Self Model exists | ✓ |
| README/docs only | No runtime discovery, user learns from documentation | |
| You decide | Claude decides the balance | |

**User's choice:** First-run welcome message
**Notes:** Fires once on cold start, flag persisted.

### Where should the welcome be delivered?

| Option | Description | Selected |
|--------|-------------|----------|
| additionalContext injection | Via UserPromptSubmit hook, consistent with all Reverie injection | ✓ |
| CLAUDE.md section | Write to .claude/CLAUDE.md on first run | |
| You decide | Claude decides mechanism | |

**User's choice:** additionalContext injection

### What should the welcome contain?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: what + how | 'Dynamo active with Reverie memory. /reverie to manage. /dynamo for status.' 3 lines max. | ✓ |
| Full orientation | Explain what Reverie does, current mode, all commands | |
| You decide | Claude decides content density | |

**User's choice:** Minimal: what + how

---

## Skill Content Accuracy

### How should skills be validated?

| Option | Description | Selected |
|--------|-------------|----------|
| Full rewrite of all 3 skills | Regenerate all skill .md files from CLI surface as ground truth | ✓ |
| Fix known gaps only | Fix /reverie start/stop references, leave others alone | |
| You decide | Claude audits and rewrites only broken skills | |

**User's choice:** Full rewrite of all 3 skills

### Should skills reference CLI commands directly?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct CLI references | Skills show exact CLI command: `bun bin/dynamo.cjs reverie status` | ✓ |
| Abstract actions | Skills describe actions without showing CLI | |
| You decide | Claude decides transparency level per skill | |

**User's choice:** Direct CLI references
**Notes:** Per Phase 12.1 D-03, skills are conversational wrappers over CLI.

---

## Error Path User Experience

### How thorough should error auditing be?

| Option | Description | Selected |
|--------|-------------|----------|
| User-facing errors only | Audit CLI output, hook stderr, skill-visible failures | ✓ |
| Comprehensive error audit | Audit every error path with structured codes and formatting | |
| You decide | Claude decides coverage level | |

**User's choice:** User-facing errors only

### Should errors include recovery suggestions?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always | Every user-visible error includes 'try this' suggestion | ✓ |
| For common errors only | Recovery suggestions for 5-10 most likely failures | |
| You decide | Claude decides which errors warrant suggestions | |

**User's choice:** Yes, always

---

## Formation Agent Accuracy

### How should the agent definition be validated?

| Option | Description | Selected |
|--------|-------------|----------|
| Audit and fix in-place | Compare agent .md against handleSubagentStop parsing, fix mismatches | ✓ |
| Full agent rewrite | Regenerate from formation pipeline interface | |
| You decide | Claude decides based on drift level | |

**User's choice:** Audit and fix in-place

---

## README/Install Documentation

### What should the README cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Install + quick start + skills | Prerequisites, install, first run behavior, skills, CLI commands | ✓ |
| Minimal install only | Just prerequisites and install steps | |
| You decide | Claude decides README scope | |

**User's choice:** Install + quick start + skills
**Notes:** README IS the onboarding document.

---

## CLI Help Text Quality

### Audit scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Audit as part of skill rewrite | Verify --help accuracy when rewriting skills with CLI references | ✓ |
| Standalone help audit | Separate pass through every command's help text | |
| You decide | Claude decides how to fold in help checks | |

**User's choice:** Audit as part of skill rewrite

---

## Validation Suite Coverage

### Should suite be updated?

| Option | Description | Selected |
|--------|-------------|----------|
| Add tests for new commands | Integration tests for start/stop and first-run welcome | ✓ |
| No validation changes | New commands get unit tests only | |
| You decide | Claude decides validation scope | |

**User's choice:** Add tests for new commands
**Notes:** Extend, don't rewrite. Phase 13 already did the comprehensive rewrite.

---

## Claude's Discretion

- Welcome message exact wording and cold-start detection mechanism
- Start command behavior from uninitialized state
- Stop command output format during REM
- Formation agent prompt adjustments (scope: fix mismatches only)
- README structure and section ordering
- Error message exact wording and formatting
- Validation test organization

## Deferred Ideas

None — discussion stayed within phase scope.

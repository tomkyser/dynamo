# Claude Code Global Setup Enhancers

## What This Is

A research project to identify, vet, and rank the best MCPs, CLI tools, and Claude Code plugins that enhance general-purpose Claude Code capabilities. The deliverable is a ranked report of 5-8 tools that are actively maintained, community-trusted, and can be fully self-managed by Claude Code — installed in the global `~/.claude` scope so they're available across all projects.

## Core Value

Every recommended tool must be self-manageable by Claude Code (install, configure, update, troubleshoot) without requiring manual user intervention in config files.

## Requirements

### Validated

- ✓ Graphiti MCP for memory/knowledge graph — existing, fully operational
- ✓ DDEV + Docker local dev environment — existing
- ✓ GSD framework for project planning/execution — existing

### Active

- [ ] Research MCP ecosystem for general capability enhancers (language refs, docs, linting, formatting)
- [ ] Research CLI tools Claude Code can leverage globally
- [ ] Research Claude Code plugins that add general capabilities
- [ ] Vet each candidate against trust criteria (GitHub stars, recent commits within past month, active community)
- [ ] Verify each candidate supports full lifecycle self-management by CC (install, configure, update, troubleshoot)
- [ ] Produce ranked report with categories, ratings, pros/cons, and final recommendations
- [ ] Final list is lean: 5-8 total additions max

### Out of Scope

- Memory/knowledge graph MCPs — already solved with Graphiti
- Project-specific or workflow-specific tools — this is general-purpose only
- Per-project configuration — everything lives in global scope (~/.claude)
- Database/SQL access MCPs — not requested
- Installation or configuration of chosen tools — research only, install later
- Abandoned tools — no updates within the past month disqualifies

## Context

- User is a full-stack developer, primarily WordPress/PHP projects on macOS
- Current setup: Claude Code with Graphiti MCP, GSD framework, DDEV/Docker, zsh shell, Homebrew
- Previously used superclaude framework and its bundled MCPs
- Happy with current memory setup — not looking for memory alternatives
- Looking for enhancers in categories like: language references, documentation lookup, linting, formatting, code quality, dev tooling
- All tools must be global-scope (not per-project)

## Constraints

- **Maintenance**: Tool must have commits within the past month (as of March 2026)
- **Trust**: Must have meaningful GitHub stars/community adoption
- **Self-management**: Claude Code must be able to fully manage the tool lifecycle (install, configure, update, troubleshoot) without user touching config files
- **Quantity**: Final recommendations capped at 5-8 tools
- **Scope**: Global only — lives in ~/.claude or global config, available to all projects
- **Platform**: macOS (Darwin), zsh, Homebrew available

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Research only, no install | User wants vetted list first, will install later | — Pending |
| Global scope only | Tools should be universally available, not per-project | — Pending |
| Full lifecycle self-management | User never wants to manually edit config files for these tools | — Pending |
| Lean final list (5-8) | Quality over quantity — only the best earn a spot | — Pending |

---
*Last updated: 2025-03-16 after initialization*

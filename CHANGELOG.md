# Changelog

All notable changes to Dynamo are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.3.0] - 2026-03-20

### Added
- Inner Voice cognitive pipeline (Reverie subsystem) with entity activation, spreading activation, sublimation threshold, and dual-path routing
- Subagent-based deliberation for session briefings, recall queries, and end-of-session synthesis
- Seven Reverie hook handlers replacing Ledger curation for all cognitive events
- `dynamo voice status` command for full Inner Voice state dump
- `dynamo voice explain` command showing last injection decision rationale
- `dynamo voice reset` command for partial state reset preserving activation map
- Bare `dynamo` CLI invocation via shell shim (no node prefix needed)
- CHANGELOG.md with version-tagged update notes

### Changed
- Curation processing migrated from OpenRouter/Haiku to native Claude Code subagent architecture
- Session naming uses deterministic keyword extraction (no external API dependency)
- Dispatcher always routes cognitive events to Reverie handlers (no mode switching)
- Install pipeline deploys Reverie modules and actively cleans up removed classic-mode files
- Sync pairs include Reverie subsystem for incremental sync

### Removed
- Classic Ledger curation path and all OpenRouter/Haiku dependencies
- `reverie.mode` configuration key (Reverie is always active when Dynamo is enabled)
- Five classic prompt templates (curation.md, precompact.md, prompt-context.md, session-name.md, session-summary.md)
- Ledger hook handlers (replaced by Reverie handlers)
- OPENROUTER_API_KEY health check requirement

## [1.2.1] - 2026-03-19

### Added
- Update system with automatic rollback on failure
- `dynamo check-update` and `dynamo update` commands
- Deployment pipeline fixes for reliable installs

### Fixed
- Sync pipeline reliability improvements
- Hook dispatcher edge cases

## [1.2.0] - 2026-03-18

### Added
- Dynamo branding and six-subsystem architecture
- Global toggle (dynamo toggle on/off)
- SQLite-based session storage
- 13-stage diagnostic system

### Changed
- Renamed from graphiti-memory to Dynamo
- Restructured into six subsystems: Switchboard, Assay, Ledger, Terminus, Reverie, Dynamo-meta

## [1.1.0] - 2026-03-17

### Added
- Memory system with knowledge graph integration
- Hook-based event processing (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop)
- Session management with search and labels

### Fixed
- Hook reliability and error handling
- Session management edge cases

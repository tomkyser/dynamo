---
phase: quick
plan: 260325-hcr
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/dynamo.cjs
  - package.json
  - README.md
autonomous: true
requirements: [HCR-01, HCR-02]

must_haves:
  truths:
    - "Running `bun bin/dynamo.cjs status` bootstraps the platform and prints status output"
    - "Running `bun bin/dynamo.cjs health` returns health report for all 10 services and 3 providers"
    - "README contains install prerequisites, clone, install, and run steps a new user can follow"
  artifacts:
    - path: "bin/dynamo.cjs"
      provides: "CLI executable entry point that bootstraps platform and delegates to Pulley"
      min_lines: 20
    - path: "README.md"
      provides: "Install and usage instructions"
      min_lines: 30
    - path: "package.json"
      provides: "bin field and scripts for running Dynamo"
      contains: "bin"
  key_links:
    - from: "bin/dynamo.cjs"
      to: "core/core.cjs"
      via: "require and bootstrap()"
      pattern: "require.*core/core.*bootstrap"
    - from: "bin/dynamo.cjs"
      to: "core/sdk/pulley/cli.cjs"
      via: "main(argv, pulley)"
      pattern: "main.*process\\.argv"
---

<objective>
Create the CLI executable entry point and README so Dynamo can actually be installed and run by a user.

Purpose: Right now, the platform has a full bootstrap (core.cjs), a CLI framework (Pulley), and CLI routing (cli.cjs), but there is NO executable entry point that ties them together. A user cloning this repo has no way to run `dynamo status` or any command. This plan creates the missing glue and documentation.

Note: Exciter is ALREADY registered in the bootstrap container (core/core.cjs lines 132-136). No wiring fix is needed there -- the registration is complete with correct deps (switchboard, lathe), tags, and mapDeps.

Output: bin/dynamo.cjs executable, updated package.json with bin+scripts, README.md with install/run steps.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@core/core.cjs (bootstrap -- require and call bootstrap(), get pulley from result)
@core/sdk/pulley/cli.cjs (main(argv, pulley) -- CLI routing, already handles output formatting)
@core/sdk/pulley/pulley.cjs (Pulley contract -- registerCommand, route, getCommands)
@core/sdk/pulley/platform-commands.cjs (6 registered commands: status, health, version, install, update, config)
@package.json (needs bin field and scripts)
@config.json (platform config)

<interfaces>
From core/core.cjs:
```javascript
async function bootstrap(options = {})
// Returns: Result<{container, lifecycle, config, paths, circuit, pulley, modules}>
// pulley is the Pulley contract instance with all platform commands already registered
module.exports = { bootstrap };
```

From core/sdk/pulley/cli.cjs:
```javascript
async function main(argv, pulley)
// argv: process.argv.slice(2)
// pulley: Pulley contract instance
// Handles routing, output formatting, stderr on error, sets process.exitCode on failure
module.exports = { main };
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CLI executable and wire package.json</name>
  <files>bin/dynamo.cjs, package.json</files>
  <action>
Create `bin/dynamo.cjs` as the top-level executable entry point. This file:

1. Add shebang `#!/usr/bin/env bun` followed by `'use strict';`
2. Require `bootstrap` from `../core/core.cjs`
3. Require `main` from `../core/sdk/pulley/cli.cjs`
4. Define an async `run()` function that:
   a. Calls `await bootstrap()` (no options -- uses default root discovery)
   b. If bootstrap fails, writes `Error: {error.message}` to stderr, sets `process.exitCode = 1`, and returns
   c. Extracts `pulley` from `bootstrapResult.value`
   d. Calls `await main(process.argv.slice(2), pulley)`
5. Calls `run()` at module level (fire-and-forget, errors already handled internally)
6. Do NOT call `process.exit()` -- let the event loop drain naturally (Bun handles this correctly)

Update `package.json` to add:
- `"bin": { "dynamo": "bin/dynamo.cjs" }` -- enables `bun link` for global `dynamo` command
- `"scripts": { "start": "bun bin/dynamo.cjs", "test": "bun test" }` -- convenience scripts

Do NOT add any npm dependencies. Do NOT change existing fields (name, version, main, dependencies, devDependencies).

Make bin/dynamo.cjs executable: `chmod +x bin/dynamo.cjs`
  </action>
  <verify>
    <automated>cd /Users/tom.kyser/Library/Mobile\ Documents/com~apple~CloudDocs/dev/dynamo && bun bin/dynamo.cjs version && bun bin/dynamo.cjs status && bun bin/dynamo.cjs health</automated>
  </verify>
  <done>
- `bun bin/dynamo.cjs version` outputs version string
- `bun bin/dynamo.cjs status` outputs service/provider counts
- `bun bin/dynamo.cjs health` outputs health report
- `bun bin/dynamo.cjs --help` outputs available commands
- package.json has bin field and scripts
  </done>
</task>

<task type="auto">
  <name>Task 2: Create README with install and run instructions</name>
  <files>README.md</files>
  <action>
Create `README.md` at project root with the following sections:

**Header:** `# Dynamo` with one-line description: "A self-contained development platform for Claude Code."

**Prerequisites:**
- Bun >= 1.2.3 (link to bun.sh)
- Claude Code with Max subscription (for Channels API and multi-session)
- Git (for submodule management)

**Install:**
```
git clone <repo-url> dynamo
cd dynamo
bun install
```

Optional global command:
```
bun link
```

**Quick Start:**
```
bun bin/dynamo.cjs status    # Platform status
bun bin/dynamo.cjs health    # Service health check
bun bin/dynamo.cjs version   # Version info
bun bin/dynamo.cjs config    # Show configuration
bun bin/dynamo.cjs --help    # All commands
```

If linked globally: `dynamo status`, `dynamo health`, etc.

**Architecture Overview:** Brief section listing the layer stack (Core Library -> Services + Providers -> Framework -> SDK -> Modules) with a pointer to `.claude/new-plan.md` for the full architecture document.

**Core Services:** Table listing all 10 services (Switchboard, Lathe, Commutator, Magnet, Conductor, Forge, Relay, Wire, Assay, Exciter) with their domain and one-line description.

**Core Providers:** Table listing all 3 providers (Ledger, Journal, Lithograph) with domain and description.

**Modules:** Mention Reverie as the first module, with pointer to `.claude/reverie-spec-v2.md`.

**Development:**
```
bun test                     # Run all tests
bun test --watch             # Watch mode
bun bin/dynamo.cjs health    # Verify platform health
```

**License:** Placeholder `[License TBD]`

Keep the README factual, concise, and actionable. No marketing language. No emojis. Reference the existing canonical docs (.claude/new-plan.md, .claude/reverie-spec-v2.md) rather than duplicating their content.
  </action>
  <verify>
    <automated>test -f /Users/tom.kyser/Library/Mobile\ Documents/com~apple~CloudDocs/dev/dynamo/README.md && wc -l < /Users/tom.kyser/Library/Mobile\ Documents/com~apple~CloudDocs/dev/dynamo/README.md</automated>
  </verify>
  <done>
- README.md exists at project root
- Contains Prerequisites, Install, Quick Start, Architecture, Services, Providers, Development sections
- All CLI examples use `bun bin/dynamo.cjs` syntax
- References canonical architecture docs, does not duplicate them
  </done>
</task>

</tasks>

<verification>
1. `bun bin/dynamo.cjs status` -- outputs platform status with service/provider counts
2. `bun bin/dynamo.cjs health` -- outputs health report for all registered components
3. `bun bin/dynamo.cjs --help` -- lists all available commands
4. `bun bin/dynamo.cjs version` -- outputs version string
5. README.md exists and contains install/run instructions
6. package.json has bin field pointing to bin/dynamo.cjs
</verification>

<success_criteria>
- A new user can clone the repo, run `bun install`, and execute `bun bin/dynamo.cjs status` to see the platform running
- All 6 platform commands (status, health, version, install, update, config) are accessible through the CLI entry point
- README provides clear path from clone to running platform
</success_criteria>

<output>
After completion, create `.planning/quick/260325-hcr-wire-exciter-into-bootstrap-container-cr/260325-hcr-SUMMARY.md`
</output>

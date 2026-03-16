# Phase 1: Methodology - Research

**Researched:** 2026-03-16
**Domain:** Documentation design — vetting protocol and anti-features list for MCP tool assessment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**GitHub Stars — Tiered by source:**
- Official vendor repos (GitHub, Microsoft, Anthropic, Brave, WordPress): 100+ stars minimum
- Established org repos (Upstash, Firecrawl, etc.): 500+ stars minimum
- Community/individual repos: 1,000+ stars minimum

**Commit Recency — Graduated window:**
- Preferred: Last commit within 30 calendar days of assessment date
- Acceptable: 31-90 days with a documented justification note (e.g., "stable release, no open security issues")
- Hard fail: Over 90 days since last commit — eliminated, no assessment

**Self-Management Capability — Full lifecycle (4 ops required):**
- Tool must support ALL four operations via commands CC can execute: install, configure, update, troubleshoot
- Failing any one operation = fails the self-management gate
- Commands documented from official docs (no verification at assessment time — this is research only)

**Security — Informational, not a hard gate:**
- Run mcp-scan (or equivalent) and document findings in the assessment
- Findings are presented in the Phase 3 ranked report for user decision
- No auto-disqualification based on security scan results

**Assessment Template Format:** Structured scorecard, ~1-2 pages per tool with mandatory sections: Identity, Pass/fail gates, Context cost estimate, Self-management commands, Security findings, Pros/cons, Verdict.

**Hard gates (binary — pass or eliminated):**
1. GitHub stars meets tiered threshold for source type
2. Last commit within 90 days (30 preferred)
3. Full lifecycle self-management (all 4 ops supported)
4. Does NOT duplicate a CC built-in capability (auto-disqualify if it does)

**Recommendation tiers (for tools that pass all gates):**
- INCLUDE — recommended for the final 5-8 tool set
- CONSIDER — viable but conditional (e.g., needs validation, overlaps with another tool)
- DEFER — valuable but not for v1 (timing, scope, or dependency issues)

**SSE transport:** Flagged as a deprecation risk in the assessment but NOT a hard disqualification gate. Tool is still assessed — the SSE risk is documented for the user's decision in Phase 3.

**Anti-Features List Structure:**
- Closed named list + category rules
- Every known anti-feature named explicitly with 2-3 sentence justification (what it does, why it looks appealing, why it's excluded, better alternative)
- Category rules defined for tools encountered during Phase 2 research

**Anti-feature categories:**
1. CC built-in duplication (auto-disqualify)
2. Abandoned/archived projects (hard fail on recency gate)
3. Out-of-scope for this project
4. Security/supply chain risk

**Community forks:** Assessed case-by-case. When an official vendor server exists and meets all gates, a fork must demonstrate clear, documented superiority to be preferred.

### Claude's Discretion

- WordPress/PHP relevance section: include in assessment template when it adds value for the specific tool, skip for obviously general-purpose tools
- Recommendation tier criteria: pre-define in methodology or leave to Phase 3 — whichever eliminates the most judgment calls from Phase 2
- Out-of-scope tools placement: anti-features list or separate section — whichever prevents scope creep most effectively

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Document vetting protocol — programmatic criteria (GitHub stars, commit recency, security, self-management capability) | All threshold values, gate logic, and scorecard structure are fully defined in CONTEXT.md decisions; FEATURES.md provides the raw data these thresholds were calibrated against |
| INFR-02 | Document anti-features list with reasoning (tools to explicitly avoid and why) | FEATURES.md anti-features table provides the named list with justifications; PITFALLS.md provides the reasoning categories; SUMMARY.md confirms which tools are CC built-in duplicates |
</phase_requirements>

---

## Summary

Phase 1 is a documentation-authoring task, not a research or implementation task. All threshold values, gate logic, and content have been decided in the CONTEXT.md discussion session. The research phase's job here is to confirm that the raw material exists to write both deliverables without invention, and to clarify what format decisions remain open to Claude's discretion.

The raw material is complete and high-confidence. FEATURES.md contains the named anti-features table with all required entries. PITFALLS.md provides the reasoning behind exclusion categories. SUMMARY.md captures the CC built-in capabilities that trigger the duplication gate. The prior research used GitHub API to verify all star counts and commit dates as of 2026-03-16, so the thresholds in CONTEXT.md are calibrated against real data, not estimates.

The one area requiring authoring judgment is the recommendation tier pre-definition. The discretion note allows either pre-defining INCLUDE/CONSIDER/DEFER criteria in Phase 1 or leaving tier assignment to Phase 3 synthesis. Research strongly supports pre-defining the criteria in Phase 1: leaving tier assignment undefined creates exactly the judgment calls that the "no judgment calls" success criterion is trying to eliminate. Pre-defined criteria should be documented in the vetting protocol so Phase 2 assessors know which tier to assign, making the Phase 3 report a tabulation rather than a deliberation.

**Primary recommendation:** Write both deliverables (vetting protocol + anti-features list) as discrete markdown files in `.planning/phases/01-methodology/`, sourcing all content from existing research. No new research or investigation is required for this phase.

---

## Standard Stack

### Core

This phase produces markdown documentation only. No libraries, packages, or dependencies.

| Asset | Location | Purpose | Source |
|-------|----------|---------|--------|
| Vetting protocol document | `.planning/phases/01-methodology/VETTING-PROTOCOL.md` | Defines hard gates, thresholds, scorecard template, and tier criteria | CONTEXT.md decisions |
| Anti-features list document | `.planning/phases/01-methodology/ANTI-FEATURES.md` | Named exclusion list + category rules for unlisted tools | FEATURES.md anti-features table + PITFALLS.md categories |

### Supporting Reference Files (read-only, not modified)

| File | Contents | Used For |
|------|----------|---------|
| `.planning/research/FEATURES.md` | Tool viability matrix, stars data, named anti-features table | Source content for anti-features list; star counts for threshold calibration evidence |
| `.planning/research/SUMMARY.md` | CC built-in tool list, recommended stack, anti-feature rationale | CC duplication gate — defines what "built-in capability" means |
| `.planning/research/PITFALLS.md` | Security risks, maintenance patterns, self-management failure modes | Anti-feature category reasoning; self-management gate definition |

---

## Architecture Patterns

### Recommended Document Structure

```
.planning/phases/01-methodology/
├── 01-CONTEXT.md          # (exists) User decisions
├── 01-RESEARCH.md         # (this file)
├── VETTING-PROTOCOL.md    # Deliverable 1 (INFR-01)
└── ANTI-FEATURES.md       # Deliverable 2 (INFR-02)
```

### Pattern 1: Vetting Protocol as a Decision Tree

**What:** The vetting protocol should read as a decision tree, not a prose description. Each gate is a yes/no question. Failure at any gate ends the assessment with a recorded reason. This eliminates interpretation variance between Phase 2 assessors.

**When to use:** Always — the "no judgment calls on hard gates" success criterion requires binary gates, not spectrum evaluations.

**Structure:**
```
Gate 1: Stars threshold (tiered by source type)
  → FAIL: Record "Stars: [count] below [tier] threshold of [required]" → ELIMINATED
  → PASS: Proceed to Gate 2

Gate 2: Commit recency
  → >90 days: Record "Last commit [date] — hard fail" → ELIMINATED
  → 31-90 days: Record "Last commit [date] — ACCEPTABLE with note: [justification]" → PROCEED WITH FLAG
  → ≤30 days: Record "Last commit [date] — PREFERRED" → PROCEED

Gate 3: Self-management (4 ops)
  → Missing any op: Record which op(s) failed → ELIMINATED
  → All 4 ops documented: PASS → Proceed to Gate 4

Gate 4: CC built-in duplication check
  → Duplicates built-in: Record which CC tool it duplicates → ELIMINATED
  → No duplication: PASS → Proceed to scorecard

Scorecard: Context cost, security scan, pros/cons, verdict tier
```

### Pattern 2: Anti-Features List as Two-Part Document

**What:** Part 1 is the named exclusion list — every currently-known tool that fails, with its justification. Part 2 is the category rules — logic for classifying tools not yet named.

**When to use:** Always. Two-part structure means Phase 2 researchers can check against the named list first (O(1) lookup) and fall through to category rules only for unlisted tools.

**Justification format per entry (from CONTEXT.md):**
Each named entry requires 2-3 sentences covering:
1. What the tool does (one sentence, neutral description)
2. Why it looks appealing (one sentence — what makes it a tempting choice)
3. Why it's excluded + the better alternative (one sentence)

### Pattern 3: Tier Criteria Pre-Definition

**What:** INCLUDE/CONSIDER/DEFER criteria defined in the vetting protocol with explicit conditions, so Phase 2 assessors assign tiers at assessment time rather than leaving them for Phase 3 synthesis.

**Recommended criteria:**

| Tier | Conditions |
|------|-----------|
| INCLUDE | Passes all 4 hard gates + fills a capability gap CC doesn't cover natively + no known overlap with another INCLUDE candidate |
| CONSIDER | Passes all 4 hard gates + provides value but overlaps with another INCLUDE candidate OR requires API key with potential cost implications OR scope is partially project-level rather than purely global |
| DEFER | Passes all 4 hard gates + genuinely valuable but has a timing dependency (e.g., awaiting WP 7.0), OR is a v2 requirement per REQUIREMENTS.md, OR adds value only after v1 tools are validated |

**Rationale:** Pre-defining these criteria in Phase 1 means Phase 2 assessments end with a declared tier, making Phase 3 a tabulation of pre-made calls rather than a fresh deliberation. This directly satisfies the "no judgment calls" success criterion for hard gates while preserving Claude's discretion for tier assignment within the documented framework.

### Pattern 4: WordPress/PHP Relevance Section (Discretionary)

**What:** An optional section in each scorecard labeled "WordPress/PHP Relevance" rating value for the project's primary tech stack.

**When to include:** Include it when the tool has specific, documentable value for PHP/WP work (e.g., Context7's library coverage for WP 6.x APIs, GitHub MCP's value for WP plugin repo management). Skip it for obviously general-purpose tools where the section would just say "general-purpose."

**Recommended default:** Include by default in the scorecard template as an optional field rather than a mandatory section, with a note: "Complete if tool has PHP/WP-specific value; omit if general-purpose with no stack-specific considerations."

### Anti-Patterns to Avoid

- **Prose-only gates:** Describing gates in narrative form ("The tool should have recent commits and good community adoption") introduces interpretation. Every gate must be a binary with specific numeric thresholds.
- **Merged documents:** Combining the vetting protocol and anti-features list into one file creates a document where Phase 2 researchers can't quickly check whether a tool is pre-excluded. Separate files enable O(1) lookup.
- **Tier ambiguity:** Leaving "INCLUDE vs CONSIDER" undefined in Phase 1 forces Phase 3 to re-evaluate every assessed tool from scratch. Pre-define the conditions.
- **Anti-features list without category rules:** A named-only list doesn't catch new tools discovered during Phase 2. Category rules are what make the list extensible.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Star count thresholds | Custom calibration methodology | Thresholds from CONTEXT.md (calibrated against FEATURES.md data) | Already decided; re-deriving wastes time and may contradict locked decisions |
| Anti-features content | Research new tools to exclude | FEATURES.md anti-features table | All currently-known anti-features are already documented with justifications |
| CC built-in capability list | Re-research CC's native tools | SUMMARY.md + FEATURES.md "Baseline" section | Both files contain the definitive list, sourced from official CC docs |
| Security check procedure | Design a new security audit framework | mcp-scan procedure (informational, not a gate — already decided) | CONTEXT.md locked this: security is informational only, not a hard gate |

**Key insight:** This phase codifies existing research findings into protocol documents. Every piece of content has a known source. The authoring task is structuring and clarifying, not discovering.

---

## Common Pitfalls

### Pitfall 1: Adding New Gates Not in CONTEXT.md

**What goes wrong:** During authoring, additional vetting criteria seem reasonable to add (e.g., "must have a CHANGELOG file", "npm download count threshold"). New gates bloat the protocol and may eliminate tools the user already decided to include.

**Why it happens:** Researching pitfalls surfaces many valid concerns. The temptation is to address them all with gates. But CONTEXT.md locked the gate set.

**How to avoid:** Stick strictly to the four hard gates in CONTEXT.md. Additional observations belong in the scorecard's pros/cons section, not as gates.

**Warning signs:** Draft protocol has more than 4 binary gates.

### Pitfall 2: Vague Self-Management Gate

**What goes wrong:** The protocol says "tool supports self-management" without specifying what that means, so Phase 2 assessors interpret it differently. One assessor counts "install works via CLI" as passing all 4 ops. Another requires documentation of all 4 explicitly.

**Why it happens:** CONTEXT.md specifies 4 ops (install, configure, update, troubleshoot) but doesn't define what "documented" means for each op.

**How to avoid:** The protocol must specify: "Self-management is PASSED only when all four operations have documented commands from official sources. Partial documentation = FAIL." The scorecard template should have four explicit rows (one per op) that must each be filled with a specific command.

**Warning signs:** Scorecard template has a single "self-management" row rather than four separate op rows.

### Pitfall 3: Anti-Features List Without a "Not Evaluated" Escape Hatch

**What goes wrong:** Out-of-scope tools (Jira MCP, database MCPs) end up listed as anti-features because there's no better place for them. The anti-features list grows to include tools that aren't anti-features — they're just out of scope. Phase 2 researchers become confused about whether "anti-feature" means "bad" or "not relevant."

**Why it happens:** CONTEXT.md left this to Claude's discretion: "anti-features list or separate 'Not Evaluated' section — whichever prevents scope creep most effectively."

**How to avoid:** Use a separate "Not Evaluated" section for out-of-scope tools. Reserve the anti-features list for tools that are in-scope for the assessment but fail on specific quality or safety grounds. This preserves the semantic distinction: anti-features = tools that look appealing but have a concrete disqualifying reason; not-evaluated = tools outside the project's scope entirely.

**Warning signs:** Anti-features list includes tools that were never candidates (Jira, Notion, database MCPs).

### Pitfall 4: Scorecard Template That Requires External Research to Complete

**What goes wrong:** The scorecard template has fields that require looking up information beyond what the protocol specifies (e.g., "competitive alternatives" or "ecosystem adoption trends"). Phase 2 assessors spend time on open-ended research instead of applying binary gates.

**Why it happens:** Comprehensive scorecards look more professional. The impulse is to include every potentially useful field.

**How to avoid:** Every scorecard field must be answerable by: (a) running a CLI command, (b) visiting a single specific URL, or (c) applying a rule from the vetting protocol. If completing a field requires judgment or research, it belongs in pros/cons (narrative section), not in a structured field.

**Warning signs:** Scorecard template has more than ~10 structured fields; any field description includes the word "evaluate" or "assess."

---

## Code Examples

This phase produces markdown documents, not code. The relevant "patterns" are document structures.

### Assessment Scorecard Template (Verified Structure from CONTEXT.md)

```markdown
## Tool Assessment: [Tool Name]

**Assessment Date:** [YYYY-MM-DD]
**Assessor:** Claude Code
**Source Repo:** [GitHub URL]

### Identity

| Field | Value |
|-------|-------|
| Name | [tool name] |
| Repo URL | [GitHub URL] |
| Stars | [count] (as of [date]) |
| Last Commit | [YYYY-MM-DD] |
| Transport Type | [stdio / http / sse] |
| Publisher | [vendor-official / established-org / community] |

### Hard Gate Results

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | [tier threshold] | [count] | PASS / FAIL |
| Commit Recency | ≤30 days preferred, ≤90 hard limit | [days ago] | PASS / ACCEPTABLE / FAIL |
| Self-Management: Install | Must have documented command | [command or MISSING] | PASS / FAIL |
| Self-Management: Configure | Must have documented command | [command or MISSING] | PASS / FAIL |
| Self-Management: Update | Must have documented command | [command or MISSING] | PASS / FAIL |
| Self-Management: Troubleshoot | Must have documented command | [command or MISSING] | PASS / FAIL |
| CC Duplication | Must not duplicate CC built-in | [duplicates X / no duplication] | PASS / FAIL |

**Gate Summary:** [ALL PASS → continue] / [FAILED: Gate N — reason → ELIMINATED]

### Context Cost Estimate

| Field | Value |
|-------|-------|
| Tool count exposed | [number] |
| Estimated token overhead | [~N tokens] |
| Source | [how measured] |

### Self-Management Commands

| Operation | Command | Source |
|-----------|---------|--------|
| Install | `[command]` | [official docs URL] |
| Configure | `[command]` | [official docs URL] |
| Update | `[command]` | [official docs URL] |
| Troubleshoot | `[command]` | [official docs URL] |

### Security Findings

**mcp-scan result:** [not yet run — Phase 3 / clean / [findings]]
**Known CVEs:** [none / list]
**Risk level:** [LOW / MEDIUM / HIGH]
**Notes:** [any specific concerns]

### WordPress/PHP Relevance
*(Complete if tool has PHP/WP-specific value; omit if general-purpose)*

[value description or omitted]

### Pros and Cons

**Pros:**
- [strength]

**Cons / Caveats:**
- [weakness or caveat]

### Verdict

**Tier:** [INCLUDE / CONSIDER / DEFER / ELIMINATED]
**Rationale:** [1-2 sentences applying tier criteria from vetting protocol]
```

### Anti-Features Entry Format (Verified from CONTEXT.md)

```markdown
### [Tool Name]

**Category:** [CC built-in duplication / Abandoned / Out-of-scope / Security risk]

[What it does — one neutral sentence.]
[Why it looks appealing — one sentence explaining the temptation.]
[Why it's excluded and the better alternative — one sentence.]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single star threshold for all tools | Tiered star thresholds by publisher type | Decided in CONTEXT.md session, 2026-03-16 | Vendor repos (GitHub, Microsoft) can qualify with lower counts; community repos face higher bar |
| Security as hard gate | Security as informational only | Decided in CONTEXT.md session, 2026-03-16 | No tool is auto-eliminated by mcp-scan findings; findings are presented to user in Phase 3 |
| SSE transport = hard disqualification | SSE transport = flagged risk, not hard gate | Decided in CONTEXT.md session, 2026-03-16 | Tools using SSE are still assessed; the deprecation risk is documented for user decision |

**Deprecated/outdated:**
- "Single threshold" star approach: Prior research used a single stars threshold without source-type tiering. The CONTEXT.md decisions replaced this with the tiered model. Any reference to a single threshold should be updated to the tiered system.

---

## Open Questions

1. **Tier criteria pre-definition vs. Phase 3 synthesis**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Whether pre-defining criteria in Phase 1 risks being too rigid for edge cases
   - Recommendation: Pre-define criteria in the vetting protocol (see Pattern 3 above). The "no judgment calls" success criterion is best served by pre-definition. If an edge case arises in Phase 2, the assessor records it in pros/cons and applies the closest matching tier with a note, rather than inventing criteria on the fly.

2. **Out-of-scope tools placement**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Whether out-of-scope tools in the anti-features list vs. a separate section makes a practical difference
   - Recommendation: Separate "Not Evaluated" section for out-of-scope tools (Jira MCP, database MCPs). The anti-features list should contain only tools that were in-scope candidates and failed for specific quality/safety reasons. This prevents scope creep by making "not evaluated" an explicit category that signals "don't investigate this," rather than a list of bad tools that implies investigation occurred.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — phase produces markdown documentation only |
| Config file | N/A |
| Quick run command | `ls ".planning/phases/01-methodology/" \| grep -E "VETTING-PROTOCOL|ANTI-FEATURES"` |
| Full suite command | Same as above |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | VETTING-PROTOCOL.md exists with all required sections | smoke | `test -f ".planning/phases/01-methodology/VETTING-PROTOCOL.md" && echo "EXISTS"` | Wave 0 |
| INFR-01 | Protocol contains 4 hard gates (stars, recency, self-management, CC duplication) | smoke | `grep -c "Gate" ".planning/phases/01-methodology/VETTING-PROTOCOL.md"` | Wave 0 |
| INFR-01 | Self-management section has all 4 ops as separate rows | smoke | `grep -E "Install\|Configure\|Update\|Troubleshoot" ".planning/phases/01-methodology/VETTING-PROTOCOL.md" \| wc -l` | Wave 0 |
| INFR-02 | ANTI-FEATURES.md exists with named entries | smoke | `test -f ".planning/phases/01-methodology/ANTI-FEATURES.md" && echo "EXISTS"` | Wave 0 |
| INFR-02 | Anti-features list contains all known named exclusions from FEATURES.md | manual-only | Human review against FEATURES.md anti-features table — no automated grep covers semantic completeness | N/A |
| INFR-02 | Category rules section exists in anti-features document | smoke | `grep -i "category" ".planning/phases/01-methodology/ANTI-FEATURES.md"` | Wave 0 |

**Manual-only justification (INFR-02 completeness):** Verifying that every named anti-feature from FEATURES.md appears in ANTI-FEATURES.md requires semantic matching between two documents. A grep command can confirm structure but cannot validate completeness of content. This check belongs in the Phase 1 verification step, not as an automated command.

### Sampling Rate

- **Per task commit:** `test -f ".planning/phases/01-methodology/VETTING-PROTOCOL.md" && test -f ".planning/phases/01-methodology/ANTI-FEATURES.md" && echo "both exist"`
- **Per wave merge:** Same as above — both files must exist
- **Phase gate:** Both files exist + human review of ANTI-FEATURES.md completeness before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test files needed — this phase produces markdown only. The "tests" above are existence checks runnable inline with Bash tool.
- [ ] No test framework install required.

*(Existing infrastructure: no code, no framework needed. All validation is file-existence smoke tests + human review.)*

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-methodology/01-CONTEXT.md` — All threshold values, gate logic, scorecard structure, anti-feature categories (read directly, 2026-03-16)
- `.planning/research/FEATURES.md` — Named anti-features table, star/commit data verified via GitHub API (read directly, 2026-03-16)
- `.planning/research/SUMMARY.md` — CC built-in tool list, recommended stack, architecture decisions (read directly, 2026-03-16)
- `.planning/research/PITFALLS.md` — Self-management failure modes, security risk categories, maintenance gate reasoning (read directly, 2026-03-16)
- `.planning/REQUIREMENTS.md` — INFR-01, INFR-02 requirement definitions (read directly, 2026-03-16)

### Secondary (MEDIUM confidence)
- None required — all phase content sourced from primary documents above

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Document structure: HIGH — directly derived from CONTEXT.md locked decisions with no ambiguity
- Content completeness: HIGH — all named anti-features exist in FEATURES.md; all gate thresholds in CONTEXT.md
- Tier pre-definition recommendation: MEDIUM — recommended based on "no judgment calls" success criterion, but this is Claude's discretion area

**Research date:** 2026-03-16
**Valid until:** N/A — phase produces static documents from locked decisions; no time-sensitive external data

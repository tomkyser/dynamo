## Creative Writing Tools — Discovery and Assessment

**Assessed:** 2026-03-16
**Assessor:** Claude Code
**Requirement:** WRIT-01

---

### Ecosystem Landscape

**FINDING: Writing MCPs are nearly absent. Viable writing tools for Claude Code are CC Skills (file-based), not MCP servers.**

A systematic search of the MCP ecosystem (MCP Registry, awesome-mcp-servers, GitHub topic searches) returns zero maintained, purpose-built creative writing MCP servers. The creative writing tool landscape for Claude Code consists entirely of:

1. **CC Skills (file-based)** — The dominant mechanism. Large skill aggregator repos (alirezarezvani/claude-skills, Jeffallan/claude-skills) contain writing-adjacent skills (marketing copy, content strategy). One dedicated creative writing skills repo (haowjy/creative-writing-skills) exists but is stale.
2. **Prompt libraries** — No maintained, widely-adopted prompt libraries for creative writing were found that pass gate thresholds.
3. **CLI tools** — No writing-specific CLI tools suitable for global CC integration were found.
4. **MCP servers** — None found with meaningful stars or maintenance.

This finding is consistent with the pre-research conclusion in `02-RESEARCH.md`: "Creative writing MCPs essentially do not exist as a category."

---

### Discovery Methodology

Searched the following sources on 2026-03-16:

| Source | Method | Writing-specific results |
|--------|--------|--------------------------|
| GitHub topic `claude-code-skills` + "writing" | `gh api search/repositories` | haowjy/creative-writing-skills (79 stars, stale), pavelkudrna83/creative-writing-skill (0 stars) |
| GitHub search "claude skills creative writing" | `gh api search/repositories` | haowjy/creative-writing-skills, tanaka-naoki/japanese-creative-writing (2 stars), pavelkudrna83/creative-writing-skill (0 stars) |
| GitHub search "claude-code skill writing content" | `gh api search/repositories` | aaron-he-zhu/seo-geo-claude-skills (401 stars, content writing), az9713/ai-co-writing-claude-skills (19 stars, stale), Jeffallan/writing-with-agents (4 stars) |
| alirezarezvani/claude-skills repo exploration | `gh api repos/…/contents` | marketing-skill directory: copywriting, content-creator, social-content, content-strategy, copy-editing |
| Jeffallan/claude-skills repo exploration | `gh api repos/…/contents/skills` | 66 dev-focused skills; no dedicated creative writing skill found |
| VoltAgent/awesome-agent-skills | `gh api repos/…/contents/README.md` | 549+ skills aggregator; writing skills not prominently listed |
| MCP server searches ("mcp server writing content creative") | `gh api search/repositories` | No results above 100 stars |

**Search scope:** MCPs, CC Skills, CC Plugins, CLI tools, prompt libraries. All categories searched per the locked decision.

---

### Top 5 Candidates

| # | Name | Type | Repo | Stars | Last Commit | Publisher | Relevance |
|---|------|------|------|-------|-------------|-----------|-----------|
| 1 | haowjy/creative-writing-skills | CC Skills | [haowjy/creative-writing-skills](https://github.com/haowjy/creative-writing-skills) | 79 | 2025-11-02 | Community | Dedicated creative writing skill set (brainstorming, prose, story critique, style) |
| 2 | alirezarezvani/claude-skills (marketing-skill subset) | CC Skills | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 5,387 | 2026-03-15 | Community | marketing-skill subdirectory: copywriting, content-creator, content-strategy, copy-editing, social-content |
| 3 | Jeffallan/claude-skills | CC Skills | [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | 6,845 | 2026-03-06 | Community | 66 skills; no dedicated creative writing skill; general code skills only |
| 4 | aaron-he-zhu/seo-geo-claude-skills | CC Skills | [aaron-he-zhu/seo-geo-claude-skills](https://github.com/aaron-he-zhu/seo-geo-claude-skills) | 401 | 2026-03-04 | Community | 20 SEO & content writing skills; content writing adjacent to professional creative writing |
| 5 | pavelkudrna83/creative-writing-skill | CC Skills | [pavelkudrna83/creative-writing-skill](https://github.com/pavelkudrna83/creative-writing-skill) | 0 | 2026-03-13 | Community | Dedicated creative writing assistant (writing craft, story skeleton, drafting, feedback) |

---

### Gate Evaluations

---

#### Candidate 1: haowjy/creative-writing-skills

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/haowjy/creative-writing-skills

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. No category rule match. Proceed to gate evaluation.

**Identity:**

| Field | Value |
|-------|-------|
| Name | haowjy/creative-writing-skills |
| Repo URL | https://github.com/haowjy/creative-writing-skills |
| Stars | 79 (as of 2026-03-16) |
| Last Commit | 2025-11-02 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Hard Gate Results:**

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | Community: 1,000 | 79 | **FAIL** |
| Commit Recency | ≤90 days hard limit | 134 days ago | **FAIL** |
| Self-Management: Install | — | Not evaluated (failed earlier gates) | — |
| Self-Management: Configure | — | Not evaluated | — |
| Self-Management: Update | — | Not evaluated | — |
| Self-Management: Troubleshoot | — | Not evaluated | — |
| CC Duplication | — | Not evaluated | — |

**Gate Summary:** FAILED Gate 1 (Stars: 79 below community threshold of 1,000) AND Gate 2 (Last commit 2025-11-02 — 134 days ago — hard fail >90 days) → **ELIMINATED**

**Verdict: ELIMINATED** — Both stars and recency gates fail. Despite being the only dedicated creative writing skills repo found, it does not meet maintenance thresholds. Do not recommend.

---

#### Candidate 2: alirezarezvani/claude-skills (marketing-skill subset)

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/alirezarezvani/claude-skills

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. No category rule match. Proceed to gate evaluation.

**Identity:**

| Field | Value |
|-------|-------|
| Name | alirezarezvani/claude-skills |
| Repo URL | https://github.com/alirezarezvani/claude-skills |
| Stars | 5,387 (as of 2026-03-16) |
| Last Commit | 2026-03-15 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Hard Gate Results:**

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | Community: 1,000 | 5,387 | **PASS** |
| Commit Recency | ≤30 days preferred | 1 day ago | **PASS — PREFERRED** |
| Self-Management: Install | Must have documented command | `git clone` / `/read path/to/SKILL.md` — documented in INSTALLATION.md | **PASS** |
| Self-Management: Configure | Must have documented command | No API keys required; skill files are plain markdown | **PASS** |
| Self-Management: Update | Must have documented command | `git pull` in cloned repo; documented in INSTALLATION.md | **PASS** |
| Self-Management: Troubleshoot | Must have documented command | `git status`, re-read SKILL.md — standard git file workflow | **PASS** |
| CC Duplication | Must not duplicate CC built-in | Skills provide specialized writing prompts/personas — CC has no built-in content writing capability | **PASS** |

**Gate Summary:** ALL PASS → Continue to scorecard.

**Context Cost Estimate:**

| Field | Value |
|-------|-------|
| Tool count exposed | 0 (no MCP tools; file-based skill loaded on demand) |
| Estimated token overhead | ~30–150 tokens per individual skill file loaded (file-based skills only load when explicitly read) |
| Source | CC Skills design: skills are markdown files, not persistent context unless invoked |

**Self-Management Commands:**

| Operation | Command | Source |
|-----------|---------|--------|
| Install | `git clone https://github.com/alirezarezvani/claude-skills.git ~/.claude/skills/alirezarezvani` | INSTALLATION.md |
| Configure | N/A — no API keys or env vars required | By design |
| Update | `cd ~/.claude/skills/alirezarezvani && git pull` | Standard git workflow, documented in INSTALLATION.md |
| Troubleshoot | `git log --oneline -5` and re-read SKILL.md to confirm content | Standard git file inspection |

**Creative Writing Coverage (professional content AND personal/fiction):**

Professional content (per locked decision — equal weight required):
- `marketing-skill/copywriting` — Marketing copy, ad copy
- `marketing-skill/content-creator` — Content creation pipeline
- `marketing-skill/content-strategy` — Content planning and strategy
- `marketing-skill/copy-editing` — Editing and refinement
- `marketing-skill/social-content` — Social media writing
- `marketing-skill/cold-email` — Email copywriting

Personal/fiction (per locked decision — equal weight required):
- **No dedicated fiction or storytelling skills found** in the repository. The marketing-skill subset is entirely professional/commercial writing. No narrative, worldbuilding, or fiction-focused skills exist.

**Pros:**
- Very large, actively maintained repo with 192+ skills
- Marketing/professional writing coverage is strong and practical
- Stars threshold easily met; recency is excellent (1 day ago)
- Self-management is straightforward git workflow

**Cons/Caveats:**
- Zero personal/fiction creative writing coverage — fails the "equal weight" requirement from locked decisions (WRIT-01 specifies equal weight for professional AND personal/fiction)
- Marketing skills are professional content writing, not storytelling or narrative craft
- Repo scope is broad (192+ skills across many domains); writing is a subset, not a focus
- No dedicated installation path for writing skills only

**Verdict:** The repo passes all gates but provides only half the required creative writing scope. It covers professional writing well but has no personal/fiction creative writing capability. Given the WRIT-01 requirement for equal weight coverage of both, this is a partial match only — strong for professional content writing use cases.

**Tier: CONSIDER** — Passes all gates. Provides strong professional writing support but does not cover personal/fiction creative writing as required by WRIT-01 equal-weight mandate. If recommended, user should be aware the fiction/narrative use case is not addressed.

---

#### Candidate 3: Jeffallan/claude-skills

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/Jeffallan/claude-skills

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. No category rule match. Proceed to gate evaluation.

**Identity:**

| Field | Value |
|-------|-------|
| Name | Jeffallan/claude-skills |
| Repo URL | https://github.com/Jeffallan/claude-skills |
| Stars | 6,845 (as of 2026-03-16) |
| Last Commit | 2026-03-06 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Hard Gate Results:**

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | Community: 1,000 | 6,845 | **PASS** |
| Commit Recency | ≤30 days preferred | 10 days ago | **PASS — PREFERRED** |
| Self-Management: Install | Must have documented command | `git clone` + `/read path/SKILL.md` per QUICKSTART.md | **PASS** |
| Self-Management: Configure | Must have documented command | No API keys; file-based | **PASS** |
| Self-Management: Update | Must have documented command | `git pull` — documented | **PASS** |
| Self-Management: Troubleshoot | Must have documented command | `git status`, re-read SKILL.md | **PASS** |
| CC Duplication | Must not duplicate CC built-in | Skills add specialized capability CC lacks | **PASS** |

**Gate Summary:** ALL PASS → Continue to scorecard.

**Creative Writing Coverage:**

- Repository exploration shows 66 skills: all are software development focused (angular-architect, api-designer, code-reviewer, etc.)
- **No creative writing skill found.** No content, copy, narrative, or fiction-related skills in the skills directory.
- wordpress-pro skill is present (adjacent to this project's stack) but provides no creative writing capability.

**Pros:**
- Highest star count of any CC Skills repo (6,845)
- Well maintained, 10 days since last commit
- Strong development skills if needed for other requirements

**Cons/Caveats:**
- Zero creative writing coverage — no writing-related skills at all
- Entirely a software development skills library

**Verdict: ELIMINATED FROM WRIT-01 SCOPE** — Passes all gates but has no creative writing content whatsoever. Including it in a creative writing recommendation would be misleading. Not suitable for WRIT-01.

Note: Jeffallan/claude-skills is assessed separately for technical writing (code-documenter skill) in TECHNICAL-WRITING.md.

---

#### Candidate 4: aaron-he-zhu/seo-geo-claude-skills

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/aaron-he-zhu/seo-geo-claude-skills

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. No category rule match. Proceed to gate evaluation.

**Identity:**

| Field | Value |
|-------|-------|
| Name | aaron-he-zhu/seo-geo-claude-skills |
| Repo URL | https://github.com/aaron-he-zhu/seo-geo-claude-skills |
| Stars | 401 (as of 2026-03-16) |
| Last Commit | 2026-03-04 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Hard Gate Results:**

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | Community: 1,000 | 401 | **FAIL** |
| Commit Recency | ≤30 days preferred | 12 days ago | PASS — PREFERRED (not evaluated beyond Gate 1) |
| Self-Management | — | Not evaluated | — |
| CC Duplication | — | Not evaluated | — |

**Gate Summary:** FAILED Gate 1 (Stars: 401 below community threshold of 1,000) → **ELIMINATED**

**Verdict: ELIMINATED** — Does not meet the 1,000-star community threshold. Despite relevant SEO + content writing skills (keyword research, content strategy, GEO optimization), stars gate prevents recommendation.

---

#### Candidate 5: pavelkudrna83/creative-writing-skill

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/pavelkudrna83/creative-writing-skill

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. Matches Category 2 (Abandoned/Archived) rule — 0 stars. Record and stop.

**Identity:**

| Field | Value |
|-------|-------|
| Name | pavelkudrna83/creative-writing-skill |
| Repo URL | https://github.com/pavelkudrna83/creative-writing-skill |
| Stars | 0 (as of 2026-03-16) |
| Last Commit | 2026-03-13 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Gate 1 Result:** Stars: 0 — below community threshold of 1,000 → **ELIMINATED**

**Note:** Despite recent commits (3 days ago) and an interesting interactive writing workflow based on René Nekuda's craft course (12 lessons), the 0-star count disqualifies this candidate. This is a brand-new repo with no adoption signal.

**Verdict: ELIMINATED** — Stars gate hard fail (0 stars vs. 1,000 community threshold).

---

### Recommendation

**Finding: No viable dedicated creative writing tool passes all gates.**

Gate evaluation results summary:

| Candidate | Gate 1 | Gate 2 | Gate 3 | Gate 4 | Outcome |
|-----------|--------|--------|--------|--------|---------|
| haowjy/creative-writing-skills | FAIL (79 stars) | FAIL (134 days) | — | — | ELIMINATED |
| alirezarezvani/claude-skills | PASS | PASS | PASS | PASS | CONSIDER (partial scope only) |
| Jeffallan/claude-skills | PASS | PASS | PASS | PASS | Out of scope for WRIT-01 (no writing content) |
| aaron-he-zhu/seo-geo-claude-skills | FAIL (401 stars) | — | — | — | ELIMINATED |
| pavelkudrna83/creative-writing-skill | FAIL (0 stars) | — | — | — | ELIMINATED |

**Three candidates fail at Gate 1.** One passes all gates (alirezarezvani/claude-skills) but provides only professional/commercial writing coverage with no personal/fiction capability — meeting only half of WRIT-01's equal-weight requirement. One passes all gates (Jeffallan/claude-skills) but has zero creative writing content.

**The only gate-passing candidate with writing content** (alirezarezvani/claude-skills) is a strong choice for professional content writing (copywriting, content strategy, social media) but provides no fiction/storytelling/narrative capability whatsoever.

**Conclusion:** No single tool passes all gates AND covers both creative writing dimensions (professional AND personal/fiction) as required by WRIT-01.

**Options for Phase 3:**

1. **Accept partial coverage:** Recommend alirezarezvani/claude-skills with explicit documentation that it covers professional writing only. User acknowledges the personal/fiction gap.
2. **Flag WRIT-01 for v2:** Document that the personal/fiction creative writing tool ecosystem for Claude Code is currently immature — the only dedicated tool (haowjy/creative-writing-skills) fails both stars and recency gates. Flag for v2 re-evaluation when the ecosystem matures.
3. **Combined approach:** Recommend alirezarezvani/claude-skills for professional writing scope (CONSIDER tier) and flag the personal/fiction dimension for v2 re-evaluation.

**Recommendation per protocol (do not force a recommendation for a tool that fails gates):** Flag WRIT-01 for v2 re-evaluation on the personal/fiction dimension. The professional writing scope can be partially addressed by alirezarezvani/claude-skills if the user wishes to proceed with partial coverage.

**Final verdict:**
- **Professional/commercial creative writing:** alirezarezvani/claude-skills — **CONSIDER** tier (passes all gates; covers copywriting, content creation, content strategy, social content; does not cover personal/fiction)
- **Personal/fiction creative writing:** No viable candidate — **gap flagged for v2**

> **v2 Flag:** WRIT-01 (personal/fiction creative writing) — no viable candidates found that pass all gates AND provide fiction/storytelling/narrative capabilities. The dedicated creative writing skills ecosystem is nascent (haowjy/creative-writing-skills fails both stars and recency gates; pavelkudrna83 is brand-new with 0 stars). Re-evaluate in v2 when haowjy/creative-writing-skills exceeds 1,000 stars and demonstrates ≤90-day commit recency, or when a new dedicated tool emerges.

---

*Research completed: 2026-03-16*
*Requirement: WRIT-01*
*Finding: Partial — professional writing partially covered (CONSIDER); personal/fiction — no viable candidate — flagged for v2*

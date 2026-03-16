## Technical Writing Tools — Discovery and Assessment

**Assessed:** 2026-03-16
**Assessor:** Claude Code
**Requirement:** WRIT-02

---

### Ecosystem Landscape

**FINDING: Writing MCPs are nearly absent. Viable technical writing tools for Claude Code are CC Skills (file-based), not MCP servers. Technical writing skills are better represented than creative writing in the CC Skills ecosystem.**

A systematic search of the MCP ecosystem finds zero maintained, purpose-built technical writing MCP servers. The technical writing tool landscape for Claude Code consists of:

1. **CC Skills (file-based)** — The dominant mechanism and the viable path. Multiple large skill repos contain documentation, API docs, and README writing skills:
   - `Jeffallan/claude-skills` — dedicated `code-documenter` skill covering docstrings, OpenAPI/Swagger, JSDoc, doc portals, user guides
   - `levnikolaevich/claude-code-skills` — extensive documentation pipeline (ln-100 through ln-160 series) covering all phases of project documentation with API docs generator
   - `alirezarezvani/claude-skills` — marketing/content writing subset, less relevant to technical documentation
2. **MCP servers** — No technical writing MCP servers found with viable star counts or maintenance status.
3. **CLI tools** — No dedicated technical writing CLI tools suitable for global CC integration were found.
4. **Prompt libraries** — No maintained, widely-adopted technical writing prompt libraries found above gate thresholds.

This finding confirms the pre-research conclusion from `02-RESEARCH.md`: "Technical writing skills are better represented than creative writing in the CC Skills ecosystem."

---

### Discovery Methodology

Searched the following sources on 2026-03-16:

| Source | Method | Technical writing results |
|--------|--------|---------------------------|
| alirezarezvani/claude-skills repo exploration | `gh api repos/…/contents` | marketing-skill: content/copy skills; no dedicated technical docs skill |
| Jeffallan/claude-skills skills directory | `gh api repos/…/contents/skills` | `code-documenter` skill (docstrings, OpenAPI, JSDoc, doc portals, user guides) |
| levnikolaevich/claude-code-skills repo exploration | `gh api repos/…/contents` | 100+ skills; ln-100-160 documentation pipeline; ln-775 API docs generator; ln-610-614 docs auditor pipeline |
| VoltAgent/awesome-agent-skills | `gh api repos/…/contents/README.md` | 549+ skills aggregator; NeoLabHQ/write-concisely not found as standalone repo |
| GitHub search "diataxis documentation claude skill" | `gh api search/repositories` | anivar/developer-docs-framework (1 star) — eliminated by stars gate |
| GitHub search "claude-code documentation writing skills" | `gh api search/repositories` | liamstar97/claude-code-doctrack-skill (1 star), imfurman/phaser-docs-engineer (1 star) — all eliminated by stars gate |
| MCP server searches ("technical writing documentation MCP") | `gh api search/repositories` | No results above 100 stars |

**Search scope:** MCPs, CC Skills, CC Plugins, CLI tools, prompt libraries. All categories searched per the locked decision.

---

### Top 5 Candidates

| # | Name | Type | Repo | Stars | Last Commit | Publisher | Relevance |
|---|------|------|------|-------|-------------|-----------|-----------|
| 1 | Jeffallan/claude-skills (code-documenter) | CC Skills | [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | 6,845 | 2026-03-06 | Community | Dedicated code-documenter skill: docstrings, OpenAPI/Swagger, JSDoc, doc portals, user guides, tutorials |
| 2 | levnikolaevich/claude-code-skills | CC Skills | [levnikolaevich/claude-code-skills](https://github.com/levnikolaevich/claude-code-skills) | 212 | 2026-03-16 | Community | Full documentation pipeline (ln-100-160 series): project docs, API docs generator, reference docs, docs auditor |
| 3 | alirezarezvani/claude-skills | CC Skills | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 5,387 | 2026-03-15 | Community | 192+ skills; technical docs less central; no dedicated documentation skill found |
| 4 | anivar/developer-docs-framework | CC Skills | [anivar/developer-docs-framework](https://github.com/anivar/developer-docs-framework) | 1 | 2026-03-02 | Community | DIATAXIS + 27 rules, 6 style guides (Google, Good Docs) — strong concept but 1 star |
| 5 | aaron-he-zhu/seo-geo-claude-skills | CC Skills | [aaron-he-zhu/seo-geo-claude-skills](https://github.com/aaron-he-zhu/seo-geo-claude-skills) | 401 | 2026-03-04 | Community | SEO + content writing; includes technical content strategy, keyword research |

---

### Gate Evaluations

---

#### Candidate 1: Jeffallan/claude-skills (code-documenter skill)

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/Jeffallan/claude-skills

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. No category rule match. Proceed to gate evaluation.

**Identity:**

| Field | Value |
|-------|-------|
| Name | Jeffallan/claude-skills (code-documenter skill) |
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
| Self-Management: Install | Must have documented command | `git clone https://github.com/Jeffallan/claude-skills.git ~/.claude/skills/jeffallan` then `/read skills/code-documenter/SKILL.md` — documented in QUICKSTART.md | **PASS** |
| Self-Management: Configure | Must have documented command | No API keys required; file-based skill | **PASS** |
| Self-Management: Update | Must have documented command | `cd ~/.claude/skills/jeffallan && git pull` — standard git workflow, documented | **PASS** |
| Self-Management: Troubleshoot | Must have documented command | `git log --oneline -5` and re-read SKILL.md | **PASS** |
| CC Duplication | Must not duplicate CC built-in | CC has no native documentation generation capability; Write/Edit tools write files but provide no documentation framework or structure guidance | **PASS** |

**Gate Summary:** ALL PASS → Continue to scorecard.

**Context Cost Estimate:**

| Field | Value |
|-------|-------|
| Tool count exposed | 0 (no MCP tools; file-based skill loaded on demand) |
| Estimated token overhead | ~30–150 tokens per skill file loaded; code-documenter SKILL.md is ~120 lines — approximately 80–100 tokens |
| Source | CC Skills design: loaded only when invoked via `/read` command |

**Self-Management Commands:**

| Operation | Command | Source |
|-----------|---------|--------|
| Install | `git clone https://github.com/Jeffallan/claude-skills.git ~/.claude/skills/jeffallan` | QUICKSTART.md |
| Configure | N/A — no API keys or env vars required | By design |
| Update | `cd ~/.claude/skills/jeffallan && git pull` | Standard git workflow |
| Troubleshoot | `git log --oneline -5 ~/.claude/skills/jeffallan` | Standard git inspection |

**Technical Writing Coverage (documentation, API docs, READMEs per locked decision):**

From code-documenter SKILL.md (verified via GitHub API):
- **Docstrings** — generates, formats, validates docstrings for any language
- **OpenAPI/Swagger specs** — creates API documentation specs
- **JSDoc annotations** — JavaScript/TypeScript API documentation
- **Documentation portals** — builds structured doc sites
- **User guides** — writes tutorials and getting-started guides
- **READMEs** — project README creation and formatting

**DIATAXIS framework:** Not explicitly referenced in code-documenter SKILL.md; skill focuses on code-adjacent docs (docstrings, API specs) rather than the four-quadrant DIATAXIS taxonomy (tutorials, how-to guides, reference, explanation).

**Security Findings:**
- mcp-scan result: N/A (file-based skill, not an MCP server)
- Known CVEs: none
- Risk level: LOW — plain markdown file, no code execution, no network access

**WordPress/PHP Relevance:** Jeffallan/claude-skills includes a `php-pro` and `wordpress-pro` skill. The code-documenter skill is language-agnostic and applies to PHP/WordPress documentation.

**Pros:**
- Highest star count of any CC Skills repo (6,845) — strong adoption signal
- Dedicated code-documenter skill covering all three required technical writing dimensions (documentation, API docs, READMEs)
- OpenAPI/Swagger spec generation directly relevant to API documentation requirement
- Well-maintained (10 days since last commit)
- Self-management is straightforward standard git workflow
- Zero context overhead unless explicitly invoked

**Cons/Caveats:**
- Scope is code-adjacent documentation; no DIATAXIS framework or prose-heavy technical writing guidance
- Skill covers developer-facing docs well but may not address user-facing narrative documentation
- Broad repo scope (66 skills); code-documenter is one of many — not a dedicated technical writing focus

**Verdict: INCLUDE** — Passes all gates. Dedicated code-documenter skill covers all three required WRIT-02 dimensions (documentation, API docs, READMEs). Highest stars in category, actively maintained, zero context cost. Best available candidate for technical writing.

---

#### Candidate 2: levnikolaevich/claude-code-skills

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/levnikolaevich/claude-code-skills

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. No category rule match. Proceed to gate evaluation.

**Identity:**

| Field | Value |
|-------|-------|
| Name | levnikolaevich/claude-code-skills |
| Repo URL | https://github.com/levnikolaevich/claude-code-skills |
| Stars | 212 (as of 2026-03-16) |
| Last Commit | 2026-03-16 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Hard Gate Results:**

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | Community: 1,000 | 212 | **FAIL** |
| Commit Recency | ≤30 days preferred | 0 days ago (today) | PASS — PREFERRED (not evaluated beyond Gate 1) |
| Self-Management | — | Not evaluated | — |
| CC Duplication | — | Not evaluated | — |

**Gate Summary:** FAILED Gate 1 (Stars: 212 below community threshold of 1,000) → **ELIMINATED**

**Verdict: ELIMINATED** — Stars gate hard fail. Despite having an impressive documentation pipeline (ln-100-160 series, API docs generator, docs auditor pipeline), the repo has only 212 stars — below the 1,000-star community threshold. The documentation capabilities are extensive and production-oriented, but adoption signal is insufficient for recommendation.

**Note for v2:** levnikolaevich/claude-code-skills is the most documentation-complete skills repo found. If it exceeds 1,000 stars in a future v2 assessment, it is the strongest candidate in this category by capability scope.

---

#### Candidate 3: alirezarezvani/claude-skills

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
| Self-Management: Install | Must have documented command | `git clone` + `/read path/SKILL.md` — documented in INSTALLATION.md | **PASS** |
| Self-Management: Configure | Must have documented command | No API keys required; file-based | **PASS** |
| Self-Management: Update | Must have documented command | `git pull` — documented | **PASS** |
| Self-Management: Troubleshoot | Must have documented command | `git status`, re-read SKILL.md | **PASS** |
| CC Duplication | Must not duplicate CC built-in | Skills add specialized capability CC lacks | **PASS** |

**Gate Summary:** ALL PASS → Continue to scorecard.

**Technical Writing Coverage:**

Repository exploration (via `gh api repos/…/contents`) shows directories: marketing-skill, business-growth, c-level-advisor, engineering-team, engineering, product-team, etc. No dedicated documentation, API docs, or README skills were found in the top-level structure. The `documentation` directory contains internal workflow files (GIST_CONTENT.md, WORKFLOW.md) rather than user-installable documentation skills.

**Assessment:** alirezarezvani/claude-skills passes all gates but provides no dedicated technical writing skills (documentation, API docs, READMEs). Its writing capabilities are focused on marketing/professional content. Not suitable as a primary technical writing solution.

**Pros:**
- Very large repo (5,387 stars), actively maintained
- Strong marketing/content writing coverage

**Cons/Caveats:**
- No technical documentation, API docs, or README skills found
- Documentation directory contains internal planning files, not installable skills

**Verdict: ELIMINATED FROM WRIT-02 SCOPE** — Passes all gates but has no technical writing content (documentation, API docs, READMEs). Including it in a technical writing recommendation would be misleading. Not suitable for WRIT-02.

Note: alirezarezvani/claude-skills is assessed for creative writing (CONSIDER tier) in CREATIVE-WRITING.md.

---

#### Candidate 4: anivar/developer-docs-framework

**Assessment Date:** 2026-03-16
**Source Repo:** https://github.com/anivar/developer-docs-framework

**ANTI-FEATURES PRE-FILTER:** Not on named exclusion list. Matches Category 2 (Abandoned/Archived) rule — 1 star. Record and stop.

**Identity:**

| Field | Value |
|-------|-------|
| Name | anivar/developer-docs-framework |
| Repo URL | https://github.com/anivar/developer-docs-framework |
| Stars | 1 (as of 2026-03-16) |
| Last Commit | 2026-03-02 |
| Type | CC Skills (file-based) |
| Publisher | community |

**Gate 1 Result:** Stars: 1 — below community threshold of 1,000 → **ELIMINATED**

**Note:** Despite promising capability description (DIATAXIS framework + 27 documentation rules + 6 style guides: Google, Good Docs), the repo has only 1 star. Recent last commit (14 days ago) but zero adoption signal. Not suitable for recommendation.

**Verdict: ELIMINATED** — Stars gate hard fail (1 star vs. 1,000 community threshold).

---

#### Candidate 5: aaron-he-zhu/seo-geo-claude-skills

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

**Verdict: ELIMINATED** — Stars gate hard fail. SEO/content writing scope is more adjacent to marketing writing than pure technical documentation.

---

### Recommendation

**Finding: One viable candidate passes all gates and covers WRIT-02 scope.**

Gate evaluation results summary:

| Candidate | Gate 1 | Gate 2 | Gate 3 | Gate 4 | Outcome |
|-----------|--------|--------|--------|--------|---------|
| Jeffallan/claude-skills (code-documenter) | PASS | PASS | PASS | PASS | **INCLUDE** |
| levnikolaevich/claude-code-skills | FAIL (212 stars) | — | — | — | ELIMINATED |
| alirezarezvani/claude-skills | PASS | PASS | PASS | PASS | Out of WRIT-02 scope (no technical docs content) |
| anivar/developer-docs-framework | FAIL (1 star) | — | — | — | ELIMINATED |
| aaron-he-zhu/seo-geo-claude-skills | FAIL (401 stars) | — | — | — | ELIMINATED |

**Recommendation: Jeffallan/claude-skills (code-documenter skill) — INCLUDE**

The `code-documenter` skill in Jeffallan/claude-skills is the strongest viable candidate. It:
- Passes all 4 hard gates
- Covers all three WRIT-02 dimensions: documentation (docstrings, user guides), API docs (OpenAPI/Swagger, JSDoc), and READMEs
- Has the highest star count of any CC Skills repo (6,845) — strongest adoption signal
- Is actively maintained (10 days since last commit)
- Carries zero context cost (file-based, loaded on demand)
- Is self-manageable by Claude Code via standard git commands

**Tier assignment: INCLUDE** — Passes all 4 hard gates, fills a capability gap CC doesn't cover natively (structured documentation generation with framework and format guidance), and no overlap with another INCLUDE candidate.

**Coverage gap to note:** The code-documenter skill is code-adjacent (docstrings, API specs, developer guides). For DIATAXIS-structured prose documentation or comprehensive style guide adherence beyond code, the ecosystem is currently underserved — anivar/developer-docs-framework has promising capability but 1 star. This is not a gap in the recommendation; it is contextual information for the user.

> **v2 Flag:** levnikolaevich/claude-code-skills is the most documentation-complete skills repo found (documentation pipeline, project docs, API docs, docs auditor) but fails Gate 1 at 212 stars. Re-evaluate in v2 if it exceeds 1,000 stars — it would be a CONSIDER tier addition alongside Jeffallan's code-documenter, providing orchestrated documentation workflows vs. targeted skill invocation.

---

*Research completed: 2026-03-16*
*Requirement: WRIT-02*
*Finding: Viable candidate found — Jeffallan/claude-skills (code-documenter skill) — INCLUDE tier*

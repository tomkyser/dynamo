# Phase 24: Cognitive Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-20
**Phase:** 24-cognitive-pipeline
**Areas discussed:** Injection voice & format, Curation migration scope, Silence vs. injection threshold, Deliberation budget

---

## Injection Voice & Format

### Voice Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Terse factual | Minimal prose, entity-focused. Like a heads-up display. | |
| Contextual narrative | Brief but conversational. Frames facts in context. | ✓ |
| Structured sections | Grouped by topic with headers. More organized for complex context. | |

**User's choice:** Contextual narrative
**Notes:** User reviewed ASCII previews of all three styles. Preferred the conversational framing over raw data or structured headers.

### Hot Path vs Deliberation Format

| Option | Description | Selected |
|--------|-------------|----------|
| Same format, different depth | Both use contextual narrative, can't tell which path generated it. | |
| Distinct formats | Hot path shorter/bullet-oriented, deliberation fuller paragraphs. | ✓ |
| Hot path minimal, deliberation rich | Override narrative tone for hot path speed. | |

**User's choice:** Distinct formats (Recommended)
**Notes:** None

### Adversarial Counter-Prompting

| Option | Description | Selected |
|--------|-------------|----------|
| Light framing | Wraps facts with "from user's experience" qualifiers. | ✓ |
| Explicit anti-drift guards | Includes explicit instructions to prevent expansion/interpretation. | |
| Structural separation | XML-like tags to separate facts from framing. | |

**User's choice:** Light framing (Recommended)
**Notes:** None

### Session Start Format

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct briefing format | Richer format with structured sections for session start. | |
| Same narrative format | Same contextual narrative, just longer (500 vs 150 tokens). | ✓ |
| Tiered by session gap | Adapts format based on time since last session. | |

**User's choice:** Same narrative format
**Notes:** User preferred consistency over specialized briefing treatment.

---

## Curation Migration Scope

### Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Full migration | All 5 prompts move to Reverie. OpenRouter removed entirely. | ✓ |
| Selective migration | Move 2 to Reverie, keep 3 in Ledger via OpenRouter. | |
| Migrate with OpenRouter fallback | Move all but keep OpenRouter as degradation fallback. | |

**User's choice:** Full migration (Recommended)
**Notes:** None

### Degradation Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Template fallback | Hot-path template formatting, timestamp-based naming. | ✓ |
| Queue and retry | Queue operations and retry on next event. | |
| Skip silently | No injection at all during degradation. | |

**User's choice:** Template fallback (Recommended)
**Notes:** None

### Agent Definition Location

| Option | Description | Selected |
|--------|-------------|----------|
| cc/agents/ | New directory following cc/ platform adapter pattern. | ✓ |
| subsystems/reverie/ | Co-locate with spawning code. | |

**User's choice:** cc/agents/ (Recommended)
**Notes:** None

### Existing Prompts

| Option | Description | Selected |
|--------|-------------|----------|
| Keep for classic mode | Classic mode still uses them via OpenRouter. Remove post-M2. | ✓ |
| Remove immediately | Clean break. Classic mode degrades. | |
| Copy to Reverie, remove originals | Reverie gets adapted versions. | |

**User's choice:** Keep for classic mode (Recommended)
**Notes:** None

---

## Silence vs. Injection Threshold

### Default Posture

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative | Fixed threshold at 0.6. Prefer silence over noise. | |
| Active | Lower threshold (~0.4). Inject more frequently. | |
| Adaptive from conservative | Start at 0.6, self-calibrate based on user acknowledgment. | ✓ |

**User's choice:** Adaptive from conservative
**Notes:** User wanted the system to learn from whether injections are acknowledged or ignored.

### Semantic Shift Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Keyword overlap | Compare entity sets between consecutive prompts. | ✓ |
| Entity category change | Detect when domain frame changes. | |
| Combined signals | Both keyword overlap AND frame change must agree. | |

**User's choice:** Keyword overlap (Recommended)
**Notes:** None

### Explicit Recall Bypass

| Option | Description | Selected |
|--------|-------------|----------|
| Broad sweep | Bypass threshold, surface all entities above 0.2 matching query. | |
| Targeted recall | Only match direct query terms, no fan-out. | |
| Recall + deliberation | Bypass threshold AND spawn deliberation subagent for deep query. | ✓ |

**User's choice:** Recall + deliberation
**Notes:** User considers explicit recall requests high-value moments worth spending a subagent spawn.

### Silence on Met Predictions

| Option | Description | Selected |
|--------|-------------|----------|
| Complete silence | Inject nothing when predictions match. Silence IS the signal. | ✓ |
| Minimal confirmation | Brief "[context aligned]" signal. ~10 tokens. | |
| Silent with state logging | No injection, but log reasoning internally for later inspection. | |

**User's choice:** Complete silence (Recommended)
**Notes:** None

---

## Deliberation Budget

### Budget Allocation

| Option | Description | Selected |
|--------|-------------|----------|
| Prioritized pools | Reserve slots by event type. Prevent starvation. | |
| First-come shared pool | All events share the same pool. Simpler. | |
| Weighted scoring | Events compete based on quality score. | |
| (User override) | No hard budget limit -- gather baseline data first. | ✓ |

**User's choice:** No hard budget enforcement (free-text override)
**Notes:** "we don't need a hard budget limit right now. we don't have a baseline to measure what is needed yet." User explicitly rejected all proposed allocation strategies in favor of gathering data first.

### Spawn Cap Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Track only, no cap | Count spawns, no enforcement. | |
| High soft cap | Default 50, warn in logs but don't hard-stop. | ✓ |
| Hard cap, high default | Default 50, degrade to hot-path-only if hit. | |

**User's choice:** High soft cap (Recommended)
**Notes:** None

### SessionStart Deliberation

| Option | Description | Selected |
|--------|-------------|----------|
| Always deliberate | Always spawn subagent for briefing. | ✓ |
| Conditional deliberation | Only if session gap >1 hour or significant state changes. | |
| No deliberation on start | Always hot-path template briefing. | |

**User's choice:** Always deliberate (Recommended)
**Notes:** None

### Stop Deliberation

| Option | Description | Selected |
|--------|-------------|----------|
| Always synthesize | Always spawn subagent for REM Tier 3. | ✓ |
| Conditional synthesis | Only if session had meaningful activity. | |
| You decide | Claude's discretion. | |

**User's choice:** Always synthesize (Recommended)
**Notes:** None

---

## Claude's Discretion

- PreCompact deliberation heuristic
- Keyword overlap threshold calibration
- Threshold adaptation speed
- Metacognitive adjustment range
- Hot-path template variable design
- Rate limit recovery timing

## Deferred Ideas

- Embedding-based semantic shift detection (M4)
- Narrative session briefings with relational framing (v1.4)
- Full REM consolidation (v1.4)
- OpenRouter sunset from classic mode (post-M2)
- Hard budget calibration (after Phase 25 hybrid mode baseline data)

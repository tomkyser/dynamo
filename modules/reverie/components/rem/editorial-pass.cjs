'use strict';

/**
 * Editorial Pass -- LLM-driven association index editorial operations.
 *
 * Per D-08: Mind reviews domain pairs with high entity overlap or semantic
 * similarity for merge decisions. LLM decides: merge, keep separate, or flag.
 * Also covers: entity dedup, association weight updates, domain boundary review,
 * taxonomy narrative updates in Journal.
 *
 * All Ledger mutations go through Wire write-intent envelopes -- never direct
 * Ledger access (Pitfall 1 compliance: single writer via Wire).
 *
 * Design: The editorial pass does NOT call the LLM directly. It composes
 * prompts and provides an apply function. The full-rem.cjs orchestrator
 * (Plan 05) feeds the prompts to Secondary's LLM context and passes
 * responses back. This keeps the pass testable without LLM mocks.
 *
 * Note: `composeEditorialPrompt` includes taxonomy narrative update
 * instructions for domain merge decisions, covering D-08's "taxonomy narrative
 * updates in Journal" intent. Full taxonomy governance (domain creation/split/
 * retire/hard caps) remains Phase 12 scope per deferred FRG-07.
 *
 * @module reverie/components/rem/editorial-pass
 */

const { ok, err } = require('../../../../lib/result.cjs');
const { createEnvelope, MESSAGE_TYPES, URGENCY_LEVELS } = require('../../../../core/services/wire/protocol.cjs');
const { LIFECYCLE_DIRS } = require('../../lib/constants.cjs');

// ---------------------------------------------------------------------------
// Prompt Composition
// ---------------------------------------------------------------------------

/**
 * Builds a structured prompt for LLM editorial review of the association index.
 *
 * Four editorial tasks:
 * 1. Entity dedup: near-duplicate entities
 * 2. Domain boundary review: domain pairs with high entity overlap
 * 3. Association weight updates: strengthen/weaken based on usage
 * 4. Taxonomy narrative updates: narrative notes for domain merge decisions
 *
 * @param {Array<Object>} domainPairs - Domain pairs with overlap scores
 * @param {Array<Object>} entityList - Entities with frequency counts
 * @param {Array<Object>} associationStats - Associations with access stats
 * @returns {string} Structured editorial prompt
 */
function composeEditorialPrompt(domainPairs, entityList, associationStats) {
  // Format entity list
  const entitySection = (entityList || []).map(e =>
    `- ${e.name} (id: ${e.id}, occurrences: ${e.occurrence_count || 0})`
  ).join('\n');

  // Format domain pairs
  const domainSection = (domainPairs || []).map(p => {
    const shared = (p.shared_entities || []).join(', ');
    return `- ${p.domain_a.name} (${p.domain_a.id}) <-> ${p.domain_b.name} (${p.domain_b.id}): overlap=${p.overlap_score}, shared entities: [${shared}]`;
  }).join('\n');

  // Format association stats
  const assocSection = (associationStats || []).map(a =>
    `- ${a.id}: ${a.source_id} -> ${a.target_id}, weight=${a.weight}, access_count=${a.access_count}, last_accessed=${a.last_accessed}`
  ).join('\n');

  return [
    'You are reviewing the association index for data quality. Four tasks:',
    '',
    '## 1. ENTITY DEDUP',
    'Review these entities for near-duplicates. Merge entities that refer to the same concept.',
    'Entities:',
    entitySection,
    '',
    '## 2. DOMAIN BOUNDARY REVIEW',
    'Review these domain pairs that have high entity overlap. Suggest merge, keep separate, or flag.',
    'Domain pairs:',
    domainSection,
    '',
    '## 3. ASSOCIATION WEIGHT UPDATE',
    'Review these association usage stats. Strengthen frequently used, weaken unused.',
    'Stats:',
    assocSection,
    '',
    '## 4. TAXONOMY NARRATIVE UPDATES',
    'For any domains you decide to merge, write a brief merge_narrative note (2-3 sentences) describing:',
    'the merge rationale, the scope of the surviving domain after merge, and any semantic nuance lost or preserved.',
    'These narratives will be stored as consolidation fragments in Journal for provenance tracking.',
    '',
    '## Response Format',
    'Respond in JSON:',
    '{',
    '  "entity_merges": [{ "keep": "entity_name", "merge": ["duplicate1", "duplicate2"] }],',
    '  "domain_decisions": [{ "domain_a": "...", "domain_b": "...", "action": "merge"|"keep"|"flag", "reason": "...", "merge_narrative": "..." }],',
    '  "weight_updates": [{ "association_id": "...", "new_weight": 0.0-1.0 }]',
    '}',
  ].join('\n');
}

/**
 * Parses the LLM editorial response into structured decisions.
 *
 * Extracts entity merges, domain decisions, and weight updates from JSON.
 * Handles malformed responses gracefully by returning empty arrays for
 * missing fields.
 *
 * @param {string} llmResponse - Raw LLM response text
 * @returns {{ entity_merges: Array, domain_decisions: Array, weight_updates: Array }}
 */
function parseEditorialResponse(llmResponse) {
  const empty = { entity_merges: [], domain_decisions: [], weight_updates: [] };

  if (!llmResponse || typeof llmResponse !== 'string') {
    return empty;
  }

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(llmResponse);
    return {
      entity_merges: Array.isArray(parsed.entity_merges) ? parsed.entity_merges : [],
      domain_decisions: Array.isArray(parsed.domain_decisions) ? parsed.domain_decisions : [],
      weight_updates: Array.isArray(parsed.weight_updates) ? parsed.weight_updates : [],
    };
  } catch (_e) {
    // Fall through to regex extraction
  }

  // Try extracting JSON object from text
  try {
    const match = llmResponse.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        entity_merges: Array.isArray(parsed.entity_merges) ? parsed.entity_merges : [],
        domain_decisions: Array.isArray(parsed.domain_decisions) ? parsed.domain_decisions : [],
        weight_updates: Array.isArray(parsed.weight_updates) ? parsed.weight_updates : [],
      };
    }
  } catch (_e) {
    // Fall through
  }

  return empty;
}

// ---------------------------------------------------------------------------
// Apply Functions
// ---------------------------------------------------------------------------

/**
 * Creates a write-intent envelope for a Ledger table operation.
 *
 * @param {string} table - Target Ledger table
 * @param {Array<Object>} data - Row data
 * @param {string} operation - Operation type (update, delete, insert)
 * @param {string} sessionId - Current session ID
 * @returns {import('../../../../lib/result.cjs').Result<Object>}
 */
function _createEditorialEnvelope(table, data, operation, sessionId) {
  return createEnvelope({
    type: MESSAGE_TYPES.WRITE_INTENT,
    from: sessionId || 'rem-editorial',
    to: 'ledger',
    payload: { table, data, operation },
    urgency: URGENCY_LEVELS.ACTIVE,
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an editorial pass instance with injected dependencies.
 *
 * @param {Object} options - Dependency injection options
 * @param {Object} options.wire - Wire service for write-intent envelopes
 * @param {Object} options.switchboard - Switchboard for event emission
 * @param {Object} options.fragmentWriter - FragmentWriter for narrative writes
 * @param {Object} [options.config] - Configuration overrides
 * @returns {Object} Editorial pass instance (frozen)
 */
function createEditorialPass(options = {}) {
  const _wire = options.wire;
  const _switchboard = options.switchboard;
  const _fragmentWriter = options.fragmentWriter;
  const _config = options.config || {};

  // -------------------------------------------------------------------------
  // Entity Dedup
  // -------------------------------------------------------------------------

  /**
   * Applies entity deduplication via Wire write-intent envelopes.
   *
   * For each merge: updates all rows in entities table where name matches
   * a duplicate to point to the kept entity. Updates fragment_entities rows
   * accordingly. All via Wire write-intent envelopes with ACTIVE urgency.
   *
   * @param {Array<Object>} entityMerges - Array of { keep, merge } specs
   * @param {string} sessionId - Current session ID
   * @returns {Promise<{ entities_deduped: number }>}
   */
  async function applyEntityDedup(entityMerges, sessionId) {
    let deduped = 0;

    for (const merge of entityMerges) {
      if (!merge.keep || !Array.isArray(merge.merge) || merge.merge.length === 0) {
        continue;
      }

      // Update fragment_entities: point duplicates to the kept entity
      for (const duplicate of merge.merge) {
        const feEnvelope = _createEditorialEnvelope(
          'fragment_entities',
          [{ old_entity_id: duplicate, new_entity_id: merge.keep }],
          'update',
          sessionId
        );
        if (feEnvelope.ok) {
          _wire.queueWrite(feEnvelope.value);
        }
      }

      // Mark duplicate entities as archived in entities table
      const entityEnvelope = _createEditorialEnvelope(
        'entities',
        merge.merge.map(name => ({ name, archived: true, merged_into: merge.keep })),
        'update',
        sessionId
      );
      if (entityEnvelope.ok) {
        _wire.queueWrite(entityEnvelope.value);
      }

      deduped++;
    }

    return { entities_deduped: deduped };
  }

  // -------------------------------------------------------------------------
  // Weight Updates
  // -------------------------------------------------------------------------

  /**
   * Applies association weight updates via Wire write-intent envelopes.
   *
   * Strengthens frequently used associations and weakens unused ones.
   *
   * @param {Array<Object>} weightUpdates - Array of { association_id, new_weight }
   * @param {string} sessionId - Current session ID
   * @returns {Promise<{ weights_updated: number }>}
   */
  async function applyWeightUpdates(weightUpdates, sessionId) {
    let updated = 0;

    for (const update of weightUpdates) {
      if (!update.association_id || typeof update.new_weight !== 'number') {
        continue;
      }

      const envelope = _createEditorialEnvelope(
        'associations',
        [{ id: update.association_id, weight: update.new_weight }],
        'update',
        sessionId
      );
      if (envelope.ok) {
        _wire.queueWrite(envelope.value);
        updated++;
      }
    }

    return { weights_updated: updated };
  }

  // -------------------------------------------------------------------------
  // Domain Merge
  // -------------------------------------------------------------------------

  /**
   * Applies domain merge decisions via Wire write-intent envelopes.
   *
   * For merge decisions: updates fragment_domains rows to point to the
   * surviving domain, deletes the merged domain from domains table. All via
   * Wire write-intent envelopes.
   *
   * For each merge with a merge_narrative: writes a consolidation-type
   * fragment to Journal via fragmentWriter. This creates the taxonomy
   * narrative record in Journal per D-08.
   *
   * @param {Array<Object>} domainDecisions - Array of domain decision objects
   * @param {string} sessionId - Current session ID
   * @returns {Promise<{ domains_merged: number, narratives_written: number }>}
   */
  async function applyDomainMerge(domainDecisions, sessionId) {
    let merged = 0;
    let narrativesWritten = 0;

    for (const decision of domainDecisions) {
      if (decision.action !== 'merge') {
        continue;
      }

      const survivingDomain = decision.domain_a;
      const mergedDomain = decision.domain_b;

      // Update fragment_domains: point merged domain rows to surviving domain
      const fdEnvelope = _createEditorialEnvelope(
        'fragment_domains',
        [{ old_domain_id: mergedDomain, new_domain_id: survivingDomain }],
        'update',
        sessionId
      );
      if (fdEnvelope.ok) {
        _wire.queueWrite(fdEnvelope.value);
      }

      // Mark merged domain as archived
      const domainEnvelope = _createEditorialEnvelope(
        'domains',
        [{ id: mergedDomain, archived: true, merged_into: survivingDomain }],
        'update',
        sessionId
      );
      if (domainEnvelope.ok) {
        _wire.queueWrite(domainEnvelope.value);
      }

      merged++;

      // Write taxonomy narrative consolidation fragment per D-08
      if (decision.merge_narrative && _fragmentWriter) {
        const fragmentId = _fragmentWriter.generateFragmentId();
        const now = new Date().toISOString();

        const narrativeFragment = {
          id: fragmentId,
          type: 'consolidation',
          created: now,
          source_session: sessionId || 'rem-editorial',
          self_model_version: 'sm-identity-v1',
          formation_group: `fg-editorial-${Date.now()}`,
          formation_frame: 'consolidation',
          sibling_fragments: [],
          temporal: {
            absolute: now,
            session_relative: 1.0,
            sequence: 0,
          },
          decay: {
            initial_weight: 0.6,
            current_weight: 0.6,
            last_accessed: now,
            access_count: 0,
            consolidation_count: 0,
            pinned: false,
          },
          associations: {
            domains: [survivingDomain],
            entities: [],
            self_model_relevance: { identity: 0.1, relational: 0.1, conditioning: 0.2 },
            emotional_valence: 0.0,
            attention_tags: ['taxonomy-merge', 'editorial'],
          },
          pointers: {
            causal_antecedents: [],
            causal_consequents: [],
            thematic_siblings: [],
            contradictions: [],
            meta_recalls: [],
            source_fragments: [],
          },
          formation: {
            trigger: `REM editorial pass - domain merge: ${mergedDomain} into ${survivingDomain}`,
            attention_pointer: 'taxonomy-merge',
            active_domains_at_formation: [survivingDomain],
            sublimation_that_prompted: null,
          },
          _lifecycle: LIFECYCLE_DIRS.active,
        };

        const writeResult = await _fragmentWriter.writeFragment(narrativeFragment, decision.merge_narrative);
        if (writeResult.ok) {
          narrativesWritten++;
        }
      }
    }

    // Emit event
    if (_switchboard && merged > 0) {
      _switchboard.emit('reverie:rem:domains-merged', {
        count: merged,
        narratives: narrativesWritten,
      });
    }

    return { domains_merged: merged, narratives_written: narrativesWritten };
  }

  // -------------------------------------------------------------------------
  // Orchestrator
  // -------------------------------------------------------------------------

  /**
   * Orchestrates the editorial pass over the association index.
   *
   * Composes the editorial prompt and returns it along with an apply function
   * that processes the LLM response. This prompt/apply separation keeps the
   * pass testable without LLM mocks.
   *
   * @param {Array<Object>} domainPairs - Domain pairs with overlap scores
   * @param {Array<Object>} entityList - Entities with frequency counts
   * @param {Array<Object>} associationStats - Associations with access stats
   * @returns {{ prompt: string, apply: Function }}
   */
  function run(domainPairs, entityList, associationStats) {
    const prompt = composeEditorialPrompt(domainPairs, entityList, associationStats);

    /**
     * Processes LLM response: parses decisions, applies entity dedup,
     * weight updates, and domain merges (with narrative writes).
     *
     * @param {string} llmResponse - LLM editorial response
     * @returns {Promise<{ entities_deduped: number, weights_updated: number, domains_merged: number, domains_reviewed: number, narratives_written: number }>}
     */
    async function apply(llmResponse) {
      const parsed = parseEditorialResponse(llmResponse);

      // Apply all three editorial operations
      const dedupResult = await applyEntityDedup(parsed.entity_merges, 'rem-session');
      const weightResult = await applyWeightUpdates(parsed.weight_updates, 'rem-session');
      const mergeResult = await applyDomainMerge(parsed.domain_decisions, 'rem-session');

      return {
        entities_deduped: dedupResult.entities_deduped,
        weights_updated: weightResult.weights_updated,
        domains_merged: mergeResult.domains_merged,
        domains_reviewed: parsed.domain_decisions.length,
        narratives_written: mergeResult.narratives_written,
      };
    }

    return { prompt, apply };
  }

  return Object.freeze({
    run,
    composeEditorialPrompt,
    parseEditorialResponse,
    applyEntityDedup,
    applyWeightUpdates,
    applyDomainMerge,
  });
}

module.exports = { createEditorialPass };

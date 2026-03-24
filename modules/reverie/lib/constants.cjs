'use strict';

/**
 * Shared constants for the Reverie module.
 *
 * All values are derived from the Reverie specification (reverie-spec-v2.md)
 * and the Phase 7 implementation decisions (07-CONTEXT.md).
 *
 * These constants are referenced across multiple Reverie components
 * and provide a single source of truth for type enumerations,
 * directory layouts, decay parameters, and naming patterns.
 *
 * @module reverie/lib/constants
 */

/**
 * Fragment types per spec Section 3.5.
 *
 * - experiential: Direct interaction experience
 * - meta-recall: Reflection on previous memories
 * - sublimation: Subconscious pattern recognition
 * - consolidation: REM-produced merged fragments
 * - source-reference: External content references
 *
 * @type {ReadonlyArray<string>}
 */
const FRAGMENT_TYPES = Object.freeze([
  'experiential',
  'meta-recall',
  'sublimation',
  'consolidation',
  'source-reference',
]);

/**
 * Fragment lifecycle directories per D-09.
 *
 * - working: Pre-REM fragments (current session)
 * - active: Post-REM consolidated fragments
 * - archive: Decayed below threshold (soft-delete per Pitfall 4)
 *
 * @type {Readonly<{ working: string, active: string, archive: string }>}
 */
const LIFECYCLE_DIRS = Object.freeze({
  working: 'working',
  active: 'active',
  archive: 'archive',
});

/**
 * Self Model aspects per spec Section 2.1.
 *
 * - identity-core: Stable foundation, changes slowly via REM
 * - relational-model: User relationship state
 * - conditioning: Behavioral patterns and environmental adaptation
 *
 * @type {ReadonlyArray<string>}
 */
const SM_ASPECTS = Object.freeze([
  'identity-core',
  'relational-model',
  'conditioning',
]);

/**
 * Decay function default parameters per spec Section 3.9.
 *
 * The decay function determines how fragment weights diminish over time.
 * These defaults can be overridden via configuration.
 *
 * @type {Readonly<{
 *   base_decay_rate: number,
 *   consolidation_protection: number,
 *   access_weight: number,
 *   relevance_weights: Readonly<{ identity: number, relational: number, conditioning: number }>,
 *   archive_threshold: number
 * }>}
 */
const DECAY_DEFAULTS = Object.freeze({
  base_decay_rate: 0.05,
  consolidation_protection: 0.3,
  access_weight: 0.1,
  relevance_weights: Object.freeze({
    identity: 0.3,
    relational: 0.5,
    conditioning: 0.2,
  }),
  archive_threshold: 0.1,
});

/**
 * Default data directory path per D-03.
 * Outside the repo -- keeps data separate from code, survives module updates.
 *
 * @type {string}
 */
const DATA_DIR_DEFAULT = '~/.dynamo/reverie';

/**
 * Fragment ID naming pattern per D-10.
 * Format: frag-YYYY-MM-DD-{8 hex chars}
 *
 * @type {RegExp}
 */
const FRAGMENT_ID_PATTERN = /^frag-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$/;

module.exports = {
  FRAGMENT_TYPES,
  LIFECYCLE_DIRS,
  SM_ASPECTS,
  DECAY_DEFAULTS,
  DATA_DIR_DEFAULT,
  FRAGMENT_ID_PATTERN,
};

'use strict';

/**
 * Reset subcommand handlers for Reverie CLI (D-04).
 *
 * Placeholder -- full implementation in Task 2.
 *
 * @module reverie/components/cli/reset
 */

const { ok, err } = require('../../../../lib/result.cjs');

function createResetHandlers(context) {
  return {
    handleResetFragments: () => err('NOT_IMPLEMENTED', 'Not yet implemented'),
    handleResetSelfModel: () => err('NOT_IMPLEMENTED', 'Not yet implemented'),
    handleResetAll: () => err('NOT_IMPLEMENTED', 'Not yet implemented'),
  };
}

module.exports = { createResetHandlers };

'use strict';

const { createForme } = require('./types.cjs');

/**
 * Compose multiple Slugs into a Forme with optional token budgeting.
 *
 * @param {Array<Object>} slugs - Array of Slug objects (from cast()).
 * @param {Object} [options] - Composition options.
 * @param {string} [options.separator='\n\n'] - Content separator between slugs.
 * @param {number|null} [options.token_budget=null] - Advisory token budget (warn if exceeded, do NOT throw).
 * @returns {Object} Frozen Forme object.
 */
function compose(slugs, options) {
  options = options || {};
  const separator = typeof options.separator === 'string' ? options.separator : '\n\n';
  const tokenBudget = typeof options.token_budget === 'number' ? options.token_budget : null;

  if (!Array.isArray(slugs)) {
    throw new TypeError('compose: "slugs" must be an array');
  }

  // Join slug contents with separator
  const content = slugs.map(s => s.content).join(separator);

  // Calculate total tokens as sum of all slug token_estimates
  const totalTokens = slugs.reduce((sum, s) => sum + (s.token_estimate || 0), 0);

  // Build sections array
  const sections = slugs.map(s => ({
    name: s.name,
    tokens: s.token_estimate || 0
  }));

  // Compute budget_remaining if budget provided
  let budgetRemaining = null;
  if (tokenBudget !== null) {
    budgetRemaining = tokenBudget - totalTokens;

    // Budget is advisory per PRD -- warn but do NOT throw
    if (totalTokens > tokenBudget) {
      process.stderr.write(
        `Linotype compose warning: total tokens (${totalTokens}) exceeds budget (${tokenBudget}) by ${totalTokens - tokenBudget}\n`
      );
    }
  }

  return createForme({
    content,
    total_tokens: totalTokens,
    sections,
    budget: tokenBudget,
    budget_remaining: budgetRemaining
  });
}

/**
 * Inspect a Forme's bill of materials (BOM) per D-15.
 * Returns a plain (unfrozen) debug output object.
 *
 * @param {Object} forme - Forme object.
 * @returns {Object} Plain object with sections, total_tokens, budget, budget_remaining.
 */
function inspect(forme) {
  if (!forme || typeof forme !== 'object') {
    throw new TypeError('inspect: "forme" must be a Forme object');
  }

  return {
    sections: forme.sections ? [...forme.sections] : [],
    total_tokens: forme.total_tokens,
    budget: forme.budget,
    budget_remaining: forme.budget_remaining
  };
}

module.exports = { compose, inspect };

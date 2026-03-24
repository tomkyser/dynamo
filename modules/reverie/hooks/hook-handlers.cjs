'use strict';

/**
 * Hook handler implementations for all 8 Claude Code hook types.
 *
 * Thin dispatch layer: each handler delegates to Context Manager methods
 * and formats the response according to the Claude Code hook output contract.
 *
 * Per Research Pitfall 1: ALL context injection uses `additionalContext`
 * inside `hookSpecificOutput`, NEVER `systemMessage` (which is a user-facing
 * warning field, not a model context injection field).
 *
 * Per Research Pattern 3: Hook handlers are thin dispatch -- business logic
 * lives in Context Manager, handlers just wire hook payloads to CM methods
 * and format the response.
 *
 * @module reverie/hooks/hook-handlers
 */

const path = require('node:path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Compaction framing text injected via PreCompact additionalContext.
 * Per D-09: best-effort framing guidance for how compaction should summarize.
 * @type {string}
 */
const COMPACTION_FRAMING = [
  'When summarizing this conversation, preserve the following as high priority:',
  '1. The Self Model identity frame and personality directives (they define WHO the assistant is)',
  '2. The user\'s current intent and active task context',
  '3. Active attention priorities and domain focus',
  '',
  'Summarize through the lens of current attention priorities. Discard raw source content that can be re-retrieved.',
].join('\n');

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates hook handler implementations for all 8 Claude Code hook types.
 *
 * @param {Object} options - Dependency injection options
 * @param {Object} options.contextManager - Context Manager instance
 * @param {Object} options.switchboard - Switchboard for event emission
 * @param {Object} options.lathe - Lathe service for file writes
 * @param {string} options.dataDir - Data directory for session snapshots
 * @returns {Object} Object with 8 handler functions
 */
function createHookHandlers(options) {
  const { contextManager, switchboard, lathe, dataDir } = options || {};

  // Resolve ~ to HOME for dataDir
  const resolvedDataDir = dataDir && dataDir.startsWith('~')
    ? path.join(process.env.HOME || '/tmp', dataDir.slice(1))
    : (dataDir || '/tmp');

  // -------------------------------------------------------------------------
  // Handler implementations
  // -------------------------------------------------------------------------

  /**
   * SessionStart hook handler.
   *
   * - Normal start/resume: calls contextManager.init() (warm-start or cold-start)
   * - Post-compaction (source='compact'): calls contextManager.resetAfterCompaction()
   * - Returns face prompt as additionalContext for immediate personality injection
   *
   * @param {Object} payload - Hook payload
   * @param {string} [payload.source] - 'compact' if post-compaction restart
   * @returns {Promise<Object>} Hook output with additionalContext
   */
  async function handleSessionStart(payload) {
    if (payload && payload.source === 'compact') {
      await contextManager.resetAfterCompaction();
    } else {
      await contextManager.init();
    }

    const injection = contextManager.getInjection();

    if (switchboard) {
      switchboard.emit('reverie:hook:session-start', {
        source: (payload && payload.source) || 'new',
      });
    }

    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: injection,
      },
    };
  }

  /**
   * UserPromptSubmit hook handler.
   *
   * Tracks prompt bytes + estimated model response bytes, increments turn,
   * returns the current face prompt as additionalContext.
   *
   * @param {Object} payload - Hook payload
   * @param {string} payload.user_prompt - The user's prompt text
   * @returns {Promise<Object>} Hook output with face prompt as additionalContext
   */
  async function handleUserPromptSubmit(payload) {
    const promptText = (payload && payload.user_prompt) || '';
    const promptBytes = Buffer.byteLength(promptText, 'utf8');

    // Track user prompt bytes
    contextManager.trackBytes(promptBytes, 'user_prompt');

    // Estimate model response (~1.5x prompt)
    contextManager.trackBytes(Math.ceil(promptBytes * 1.5), 'model_response_estimate');

    // Increment turn
    contextManager.incrementTurn();

    const injection = contextManager.getInjection();

    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: injection,
      },
    };
  }

  /**
   * PreToolUse hook handler.
   *
   * Tracks bytes from tool input. No context injection on PreToolUse per D-11.
   *
   * @param {Object} payload - Hook payload
   * @param {string} payload.tool_name - Tool being invoked
   * @param {Object} payload.tool_input - Tool input parameters
   * @returns {Promise<Object>} Empty object (no injection)
   */
  async function handlePreToolUse(payload) {
    const inputStr = JSON.stringify((payload && payload.tool_input) || {});
    const inputBytes = Buffer.byteLength(inputStr, 'utf8');

    contextManager.trackBytes(inputBytes, 'tool_input');

    if (switchboard) {
      switchboard.emit('reverie:hook:pre-tool-use', {
        tool: payload && payload.tool_name,
      });
    }

    return {};
  }

  /**
   * PostToolUse hook handler.
   *
   * Tracks bytes from tool output. Returns micro-nudge as additionalContext
   * only when budget phase is 3 (reinforced) per D-08.
   *
   * @param {Object} payload - Hook payload
   * @param {string|Object} payload.tool_output - Tool execution output
   * @returns {Promise<Object>} Hook output with micro-nudge if Phase 3, empty otherwise
   */
  async function handlePostToolUse(payload) {
    const rawOutput = payload && payload.tool_output;
    const outputStr = typeof rawOutput === 'string'
      ? rawOutput
      : JSON.stringify(rawOutput || '');
    const outputBytes = Buffer.byteLength(outputStr, 'utf8');

    contextManager.trackBytes(outputBytes, 'tool_output');

    const nudge = contextManager.getMicroNudge();
    if (nudge) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: nudge,
        },
      };
    }

    return {};
  }

  /**
   * PreCompact hook handler.
   *
   * Saves checkpoint to Journal and injects compaction framing text.
   * Per D-09 + Research Pitfall 1: uses additionalContext, NOT systemMessage.
   *
   * @param {Object} payload - Hook payload
   * @returns {Promise<Object>} Hook output with compaction framing as additionalContext
   */
  async function handlePreCompact(payload) {
    await contextManager.checkpoint();

    return {
      hookSpecificOutput: {
        hookEventName: 'PreCompact',
        additionalContext: COMPACTION_FRAMING,
      },
    };
  }

  /**
   * Stop hook handler.
   *
   * Persists warm-start cache and writes session-end snapshot.
   * Per D-12: face prompt file IS the warm-start cache (dual-purpose).
   *
   * @param {Object} payload - Hook payload
   * @returns {Promise<Object>} Empty object (no injection on Stop)
   */
  async function handleStop(payload) {
    await contextManager.persistWarmStart();

    const snapshot = contextManager.getSessionSnapshot();
    const snapshotPath = path.join(resolvedDataDir, 'data', 'session-end-' + Date.now() + '.json');
    await lathe.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

    if (switchboard) {
      switchboard.emit('reverie:hook:stop', { snapshot });
    }

    return {};
  }

  /**
   * SubagentStart hook handler.
   *
   * Tracks estimated bytes (~500) for subagent context overhead.
   *
   * @param {Object} payload - Hook payload
   * @returns {Promise<Object>} Empty object
   */
  async function handleSubagentStart(payload) {
    contextManager.trackBytes(500, 'subagent_start');

    if (switchboard) {
      switchboard.emit('reverie:hook:subagent-start', {
        subagent_id: payload && payload.subagent_id,
      });
    }

    return {};
  }

  /**
   * SubagentStop hook handler.
   *
   * Tracks estimated bytes (~500) for subagent output overhead.
   *
   * @param {Object} payload - Hook payload
   * @returns {Promise<Object>} Empty object
   */
  async function handleSubagentStop(payload) {
    contextManager.trackBytes(500, 'subagent_stop');

    if (switchboard) {
      switchboard.emit('reverie:hook:subagent-stop', {
        subagent_id: payload && payload.subagent_id,
      });
    }

    return {};
  }

  return {
    handleSessionStart,
    handleUserPromptSubmit,
    handlePreToolUse,
    handlePostToolUse,
    handleStop,
    handlePreCompact,
    handleSubagentStart,
    handleSubagentStop,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { createHookHandlers };

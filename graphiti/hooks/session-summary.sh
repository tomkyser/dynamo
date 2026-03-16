#!/usr/bin/env bash
# session-summary.sh — Summarize and store session in Graphiti on Stop
set -uo pipefail

HELPER="$HOME/.claude/graphiti/.venv/bin/python3 $HOME/.claude/graphiti/graphiti-helper.py"
INPUT=$(cat)

# CRITICAL: Guard against infinite loops
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

if ! $HELPER health-check 2>/dev/null; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
PROJECT=$($HELPER detect-project ${CWD:+--cwd "$CWD"} 2>/dev/null || echo "unknown")
SCOPE="global"
if [ "$PROJECT" != "unknown" ] && [ "$PROJECT" != "tom.kyser" ]; then
  SCOPE="project:${PROJECT}"
fi
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Generate session summary via Haiku
SUMMARY=$(echo "$INPUT" | $HELPER summarize-session 2>/dev/null || echo "")

if [ -n "$SUMMARY" ]; then
  # Store in project scope
  $HELPER add-episode \
    --text "Session summary (${TIMESTAMP}): ${SUMMARY}" \
    --scope "$SCOPE" \
    --source "session-hook" 2>/dev/null &

  # Store in session scope for fine-grained retrieval
  $HELPER add-episode \
    --text "Session summary: ${SUMMARY}" \
    --scope "session:${TIMESTAMP}" \
    --source "session-hook" 2>/dev/null &
fi

exit 0

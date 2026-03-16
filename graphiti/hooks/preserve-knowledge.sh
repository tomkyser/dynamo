#!/usr/bin/env bash
# preserve-knowledge.sh — Extract and preserve key knowledge before context compaction
set -uo pipefail

HELPER="$HOME/.claude/graphiti/.venv/bin/python3 $HOME/.claude/graphiti/graphiti-helper.py"
INPUT=$(cat)

if ! $HELPER health-check 2>/dev/null; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
PROJECT=$($HELPER detect-project ${CWD:+--cwd "$CWD"} 2>/dev/null || echo "unknown")
SCOPE="global"
if [ "$PROJECT" != "unknown" ] && [ "$PROJECT" != "tom.kyser" ]; then
  SCOPE="project:${PROJECT}"
fi

# Extract key knowledge via Haiku summarization
SUMMARY=$(echo "$INPUT" | $HELPER summarize-session 2>/dev/null || echo "")

if [ -n "$SUMMARY" ]; then
  # Store the extracted knowledge
  $HELPER add-episode \
    --text "Pre-compaction knowledge extract: ${SUMMARY}" \
    --scope "$SCOPE" \
    --source "precompact-hook" 2>/dev/null &

  # Re-inject critical context so Claude doesn't lose it
  echo "[PRESERVED CONTEXT]"
  echo "$SUMMARY"
fi

exit 0

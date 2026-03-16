#!/usr/bin/env bash
# prompt-augment.sh — Augment user prompts with relevant Graphiti memories
set -uo pipefail

HELPER="$HOME/.claude/graphiti/.venv/bin/python3 $HOME/.claude/graphiti/graphiti-helper.py"
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# Skip empty or very short prompts (slash commands, etc.)
if [ ${#PROMPT} -lt 15 ]; then
  exit 0
fi

# Health check — fail silently
if ! $HELPER health-check 2>/dev/null; then
  exit 0
fi

CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
PROJECT=$($HELPER detect-project ${CWD:+--cwd "$CWD"} 2>/dev/null || echo "unknown")

# Search project scope first, then global
RESULTS=""
if [ "$PROJECT" != "unknown" ] && [ "$PROJECT" != "tom.kyser" ]; then
  RESULTS=$($HELPER search --query "$PROMPT" \
    --scope "project:${PROJECT}" --limit 10 \
    --curate "$PROMPT" 2>/dev/null)
fi

# Also search global if project search was empty or found nothing relevant
if [ -z "$RESULTS" ] || [ "$RESULTS" = "No relevant memories found." ]; then
  RESULTS=$($HELPER search --query "$PROMPT" \
    --scope global --limit 10 \
    --curate "$PROMPT" 2>/dev/null)
fi

if [ -n "$RESULTS" ] && [ "$RESULTS" != "No relevant memories found." ]; then
  echo "[RELEVANT MEMORY]"
  echo "$RESULTS"
fi

exit 0

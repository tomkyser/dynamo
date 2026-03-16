#!/usr/bin/env bash
# session-start.sh — Bootstrap Claude Code session with Graphiti context
set -uo pipefail

HELPER="$HOME/.claude/graphiti/.venv/bin/python3 $HOME/.claude/graphiti/graphiti-helper.py"
INPUT=$(cat)
SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')

# Health check — fail gracefully
if ! $HELPER health-check 2>/dev/null; then
  echo "[Graphiti: server offline — no memory context available]"
  exit 0
fi

# Detect project
PROJECT=$($HELPER detect-project ${CWD:+--cwd "$CWD"} 2>/dev/null || echo "unknown")

echo "[GRAPHITI MEMORY CONTEXT]"
echo ""

# Global preferences
echo "## User Preferences"
PREFS=$($HELPER search --query "user preferences workflow coding style tools" \
  --scope global --limit 10 \
  --curate "Starting a ${SOURCE} session in project: ${PROJECT}" 2>/dev/null)
if [ -n "$PREFS" ]; then
  echo "$PREFS"
else
  echo "- No global preferences stored yet"
fi
echo ""

# Project context (if detected and not home dir)
if [ "$PROJECT" != "unknown" ] && [ "$PROJECT" != "tom.kyser" ]; then
  echo "## Project: ${PROJECT}"
  PROJ_CTX=$($HELPER search --query "architecture decisions conventions patterns requirements" \
    --scope "project:${PROJECT}" --limit 15 \
    --curate "Starting a ${SOURCE} session in project: ${PROJECT}" 2>/dev/null)
  if [ -n "$PROJ_CTX" ]; then
    echo "$PROJ_CTX"
  else
    echo "- No project context stored yet"
  fi
  echo ""

  # Recent session summaries
  echo "## Recent Sessions"
  SESSIONS=$($HELPER search --query "session summary accomplished decisions outcome" \
    --scope "project:${PROJECT}" --limit 5 \
    --curate "What happened in recent sessions for project: ${PROJECT}" 2>/dev/null)
  if [ -n "$SESSIONS" ]; then
    echo "$SESSIONS"
  else
    echo "- No recent session summaries yet"
  fi
fi

exit 0

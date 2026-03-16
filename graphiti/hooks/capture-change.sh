#!/usr/bin/env bash
# capture-change.sh — Store file change episodes in Graphiti (async, non-blocking)

HELPER="$HOME/.claude/graphiti/.venv/bin/python3 $HOME/.claude/graphiti/graphiti-helper.py"
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')

# Skip if server down
if ! $HELPER health-check 2>/dev/null; then
  exit 0
fi

PROJECT=$($HELPER detect-project ${CWD:+--cwd "$CWD"} 2>/dev/null || echo "unknown")
SCOPE="global"
if [ "$PROJECT" != "unknown" ] && [ "$PROJECT" != "tom.kyser" ]; then
  SCOPE="project:${PROJECT}"
fi

# Fire and forget — don't block editing
$HELPER add-episode \
  --text "File ${TOOL_NAME}: ${FILE_PATH}" \
  --scope "$SCOPE" \
  --source "change-hook" 2>/dev/null &

exit 0

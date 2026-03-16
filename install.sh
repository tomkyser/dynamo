#!/usr/bin/env bash
# install.sh — Install Graphiti memory system for Claude Code
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.claude/graphiti"

echo "=== Graphiti Memory System Installer ==="
echo ""

# --- Pre-flight checks ---
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required but not found."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required but not found. Install with: brew install jq"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 is required but not found."; exit 1; }

# Check for .env
if [ ! -f "$SCRIPT_DIR/graphiti/.env" ]; then
  if [ -f "$SCRIPT_DIR/graphiti/.env.example" ]; then
    echo "No .env found. Creating from .env.example..."
    cp "$SCRIPT_DIR/graphiti/.env.example" "$SCRIPT_DIR/graphiti/.env"
    echo "IMPORTANT: Edit $SCRIPT_DIR/graphiti/.env with your API keys before starting."
    echo ""
  else
    echo "ERROR: No .env or .env.example found in graphiti/"
    exit 1
  fi
fi

# --- Copy files ---
echo "Installing to $DEST ..."
mkdir -p "$DEST/hooks" "$DEST/curation"

cp "$SCRIPT_DIR/graphiti/docker-compose.yml" "$DEST/"
cp "$SCRIPT_DIR/graphiti/config.yaml" "$DEST/"
cp "$SCRIPT_DIR/graphiti/.env" "$DEST/"
cp "$SCRIPT_DIR/graphiti/graphiti-helper.py" "$DEST/"
cp "$SCRIPT_DIR/graphiti/requirements.txt" "$DEST/"
cp "$SCRIPT_DIR/graphiti/start-graphiti.sh" "$DEST/"
cp "$SCRIPT_DIR/graphiti/stop-graphiti.sh" "$DEST/"
cp "$SCRIPT_DIR/graphiti/curation/prompts.yaml" "$DEST/curation/"
cp "$SCRIPT_DIR/graphiti/hooks/"*.sh "$DEST/hooks/"

chmod +x "$DEST/start-graphiti.sh" "$DEST/stop-graphiti.sh" "$DEST/hooks/"*.sh
echo "  Files copied."

# --- Python venv ---
echo "Setting up Python virtual environment..."
if [ ! -d "$DEST/.venv" ]; then
  python3 -m venv "$DEST/.venv"
fi
"$DEST/.venv/bin/pip" install -q -r "$DEST/requirements.txt"
echo "  Python deps installed."

# --- Register MCP server ---
echo "Registering Graphiti MCP server in ~/.claude.json ..."
if command -v claude >/dev/null 2>&1; then
  # Check if already registered
  if [ -f "$HOME/.claude.json" ] && jq -e '.mcpServers.graphiti' "$HOME/.claude.json" >/dev/null 2>&1; then
    echo "  Already registered — skipping."
  else
    claude mcp add --transport http --scope user graphiti http://localhost:8100/mcp
    echo "  Registered."
  fi
else
  echo "  WARNING: 'claude' CLI not found. Register manually:"
  echo "    claude mcp add --transport http --scope user graphiti http://localhost:8100/mcp"
fi

# --- Print next steps ---
echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "  1. Verify your API keys in $DEST/.env"
echo ""
echo "  2. Merge hook config into ~/.claude/settings.json:"
echo "     Reference: $SCRIPT_DIR/claude-config/settings-hooks.json"
echo "     (Copy the 'hooks' and 'permissions' sections into your settings)"
echo ""
echo "  3. Update ~/.claude/CLAUDE.md with memory system rules:"
echo "     Reference: $SCRIPT_DIR/claude-config/CLAUDE.md.template"
echo ""
echo "  4. Start the stack:"
echo "     $DEST/start-graphiti.sh"
echo ""
echo "  5. Restart Claude Code to activate MCP tools and hooks."
echo ""

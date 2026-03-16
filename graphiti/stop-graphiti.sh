#!/usr/bin/env bash
# stop-graphiti.sh — Stop the Graphiti knowledge graph stack (preserves data)
set -euo pipefail

GRAPHITI_DIR="$HOME/.claude/graphiti"
cd "$GRAPHITI_DIR"

echo "Stopping Graphiti knowledge graph stack..."
docker compose down

echo "Graphiti stack stopped. Data volumes preserved."
echo "To also remove data: docker compose -f $GRAPHITI_DIR/docker-compose.yml down -v"

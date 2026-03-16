#!/usr/bin/env bash
# start-graphiti.sh — Start the Graphiti knowledge graph stack
set -euo pipefail

GRAPHITI_DIR="$HOME/.claude/graphiti"
cd "$GRAPHITI_DIR"

# Check if already running
if docker compose ps --status running 2>/dev/null | grep -q "graphiti-neo4j"; then
  echo "Graphiti stack is already running."
  docker compose ps
  exit 0
fi

echo "Starting Graphiti knowledge graph stack..."
docker compose up -d

echo ""
echo "Waiting for services to become healthy..."

# Wait for Neo4j
for i in $(seq 1 30); do
  if docker compose ps --status running 2>/dev/null | grep -q "graphiti-neo4j"; then
    break
  fi
  sleep 2
done

# Wait for MCP server
for i in $(seq 1 30); do
  if curl -sf http://localhost:8100/health >/dev/null 2>&1; then
    echo "Graphiti MCP server is healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Warning: MCP server health check timed out. Check logs with:"
    echo "  docker compose -f $GRAPHITI_DIR/docker-compose.yml logs graphiti-mcp"
    exit 1
  fi
  sleep 2
done

echo ""
docker compose ps
echo ""
echo "Graphiti is ready."
echo "  MCP endpoint: http://localhost:8100/mcp"
echo "  Neo4j browser: http://localhost:7475"

#!/usr/bin/env python3
"""
graphiti-helper.py — Bridge between Claude Code hooks and Graphiti MCP server.
Includes Haiku-powered context curation to prevent context bloat.

Usage:
  graphiti-helper.py health-check
  graphiti-helper.py detect-project [--cwd PATH]
  graphiti-helper.py search --query QUERY [--scope SCOPE] [--limit N] [--curate CONTEXT]
  graphiti-helper.py add-episode --text TEXT [--scope SCOPE] [--source SOURCE]
  graphiti-helper.py summarize-session [--scope SCOPE]
"""

import argparse
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

import httpx
import yaml

# --- Configuration ---

MCP_URL = os.environ.get("GRAPHITI_MCP_URL", "http://localhost:8100/mcp")
HEALTH_URL = os.environ.get("GRAPHITI_HEALTH_URL", "http://localhost:8100/health")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CURATION_MODEL = "anthropic/claude-haiku-4.5"
CURATION_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Load .env if keys not in environment
ENV_FILE = Path(__file__).parent / ".env"
if ENV_FILE.exists() and (not OPENROUTER_API_KEY or not ANTHROPIC_API_KEY):
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and value and key not in os.environ:
                os.environ[key] = value
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Load curation prompts
PROMPTS_FILE = Path(__file__).parent / "curation" / "prompts.yaml"
PROMPTS = {}
if PROMPTS_FILE.exists():
    PROMPTS = yaml.safe_load(PROMPTS_FILE.read_text()) or {}


# --- MCP Client ---

class MCPClient:
    """Lightweight MCP client for Graphiti's streamable HTTP transport."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=30.0)
        self.session_id = None

    def _initialize(self):
        """Initialize MCP session."""
        if self.session_id:
            return
        resp = self.client.post(
            self.base_url,
            json={"jsonrpc": "2.0", "method": "initialize", "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "graphiti-helper", "version": "1.0.0"}
            }, "id": 1},
            headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        )
        # Parse session ID from SSE or header
        self.session_id = resp.headers.get("mcp-session-id")
        # Send initialized notification
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self.session_id:
            headers["mcp-session-id"] = self.session_id
        self.client.post(
            self.base_url,
            json={"jsonrpc": "2.0", "method": "notifications/initialized"},
            headers=headers
        )

    def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call an MCP tool and return the result."""
        self._initialize()
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self.session_id:
            headers["mcp-session-id"] = self.session_id

        resp = self.client.post(
            self.base_url,
            json={
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments},
                "id": str(uuid.uuid4())
            },
            headers=headers
        )

        # Handle SSE response
        content_type = resp.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            return self._parse_sse(resp.text)
        else:
            try:
                return resp.json()
            except Exception:
                return {"error": f"Unexpected response: {resp.status_code}"}

    def _parse_sse(self, text: str) -> dict:
        """Parse SSE response to extract the JSON-RPC result."""
        for line in text.splitlines():
            if line.startswith("data:"):
                data = line[5:].strip()
                if data:
                    try:
                        parsed = json.loads(data)
                        if "result" in parsed or "error" in parsed:
                            return parsed
                    except json.JSONDecodeError:
                        continue
        return {"error": "No valid response in SSE stream"}

    def close(self):
        self.client.close()


# --- Curation (Haiku via OpenRouter) ---

def curate_results(memories: str, context: str, prompt_key: str = "curate_prompt_context",
                   project_name: str = "unknown", session_type: str = "startup") -> str:
    """Filter search results through Haiku for relevance."""
    if not OPENROUTER_API_KEY:
        return memories

    prompt_config = PROMPTS.get(prompt_key, {})
    system_prompt = prompt_config.get("system", "You are a context curator. Return only the most relevant items as concise bullets.")
    user_template = prompt_config.get("user", "CONTEXT: {prompt}\n\nMEMORIES:\n{memories}\n\nReturn only relevant items as bullets.")

    user_prompt = user_template.format(
        prompt=context,
        memories=memories,
        project_name=project_name,
        session_type=session_type,
        context=context
    )

    try:
        resp = httpx.post(
            CURATION_API_URL,
            json={
                "model": CURATION_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 500,
                "temperature": 0.3
            },
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            timeout=10.0
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        pass

    return memories


def summarize_text(text: str) -> str:
    """Summarize text through Haiku for session summaries."""
    if not OPENROUTER_API_KEY:
        return text[:500]

    prompt_config = PROMPTS.get("summarize_session", {})
    system_prompt = prompt_config.get("system", "You are a session summarizer. Create a concise summary.")
    user_template = prompt_config.get("user", "SESSION CONTEXT:\n{context}\n\nSummarize in 3-5 bullets.")

    user_prompt = user_template.format(context=text[:4000])

    try:
        resp = httpx.post(
            CURATION_API_URL,
            json={
                "model": CURATION_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 500,
                "temperature": 0.3
            },
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            timeout=15.0
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        pass

    return text[:500]


# --- Commands ---

def cmd_health_check():
    """Check if Graphiti MCP server is running."""
    try:
        resp = httpx.get(HEALTH_URL, timeout=3.0)
        if resp.status_code == 200:
            sys.exit(0)
    except Exception:
        pass
    sys.exit(1)


def cmd_detect_project(cwd: str = None):
    """Detect project name from current directory."""
    cwd = cwd or os.getcwd()

    # Try git remote
    try:
        result = subprocess.run(
            ["git", "-C", cwd, "config", "--get", "remote.origin.url"],
            capture_output=True, text=True, timeout=3
        )
        if result.returncode == 0 and result.stdout.strip():
            url = result.stdout.strip()
            name = url.rstrip("/").rsplit("/", 1)[-1]
            name = name.removesuffix(".git")
            print(name)
            return
    except Exception:
        pass

    # Try package.json
    pkg = Path(cwd) / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text())
            if "name" in data:
                print(data["name"])
                return
        except Exception:
            pass

    # Try composer.json
    composer = Path(cwd) / "composer.json"
    if composer.exists():
        try:
            data = json.loads(composer.read_text())
            if "name" in data:
                print(data["name"].split("/")[-1])
                return
        except Exception:
            pass

    # Try pyproject.toml name
    pyproject = Path(cwd) / "pyproject.toml"
    if pyproject.exists():
        try:
            text = pyproject.read_text()
            for line in text.splitlines():
                if line.strip().startswith("name"):
                    name = line.split("=", 1)[1].strip().strip('"').strip("'")
                    print(name)
                    return
        except Exception:
            pass

    # Try .ddev/config.yaml
    ddev = Path(cwd) / ".ddev" / "config.yaml"
    if ddev.exists():
        try:
            data = yaml.safe_load(ddev.read_text())
            if "name" in data:
                print(data["name"])
                return
        except Exception:
            pass

    # Fallback to directory name
    print(Path(cwd).name)


def cmd_search(query: str, scope: str = "global", limit: int = 10, curate: str = None):
    """Search Graphiti for relevant facts and nodes."""
    mcp = MCPClient(MCP_URL)
    results = []

    try:
        # Search facts (edges between entities)
        facts_resp = mcp.call_tool("search_memory_facts", {
            "query": query,
            "group_ids": [scope],
            "max_facts": limit
        })
        facts = _extract_content(facts_resp)
        if facts:
            results.append(facts)

        # Search nodes (entity summaries)
        nodes_resp = mcp.call_tool("search_nodes", {
            "query": query,
            "group_ids": [scope],
            "max_nodes": limit
        })
        nodes = _extract_content(nodes_resp)
        if nodes:
            results.append(nodes)

    except Exception as e:
        print(f"Search error: {e}", file=sys.stderr)
    finally:
        mcp.close()

    combined = "\n".join(results)

    if not combined.strip():
        return

    if curate:
        project = scope.split(":", 1)[-1] if ":" in scope else "general"
        combined = curate_results(combined, curate, project_name=project)

    print(combined)


def cmd_add_episode(text: str, scope: str = "global", source: str = "hook"):
    """Add an episode to the Graphiti knowledge graph."""
    mcp = MCPClient(MCP_URL)
    try:
        resp = mcp.call_tool("add_memory", {
            "name": source,
            "episode_body": text,
            "group_id": scope,
            "source": "text",
            "source_description": source
        })
        if "error" in resp:
            err = resp.get("error", {})
            if isinstance(err, dict):
                print(f"Add episode error: {err.get('message', err)}", file=sys.stderr)
            else:
                print(f"Add episode error: {err}", file=sys.stderr)
    except Exception as e:
        print(f"Add episode error: {e}", file=sys.stderr)
    finally:
        mcp.close()


def cmd_summarize_session(scope: str = "global"):
    """Read context from stdin and output a session summary."""
    text = sys.stdin.read()
    if not text.strip():
        return
    summary = summarize_text(text)
    print(summary)


# --- Helpers ---

def _extract_content(response: dict) -> str:
    """Extract text content from MCP tool response."""
    if "error" in response:
        return ""

    result = response.get("result", {})
    content = result.get("content", [])

    texts = []
    for item in content:
        if isinstance(item, dict) and item.get("type") == "text":
            texts.append(item["text"])

    return "\n".join(texts)


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Graphiti helper for Claude Code hooks")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    subparsers.add_parser("health-check", help="Check if Graphiti server is running")

    dp = subparsers.add_parser("detect-project", help="Detect project name from cwd")
    dp.add_argument("--cwd", default=None, help="Working directory (default: $PWD)")

    sp = subparsers.add_parser("search", help="Search the knowledge graph")
    sp.add_argument("--query", required=True, help="Search query")
    sp.add_argument("--scope", default="global", help="group_id scope")
    sp.add_argument("--limit", type=int, default=10, help="Max results")
    sp.add_argument("--curate", default=None, help="Context for Haiku curation filtering")

    ap = subparsers.add_parser("add-episode", help="Add an episode to the knowledge graph")
    ap.add_argument("--text", required=True, help="Episode text content")
    ap.add_argument("--scope", default="global", help="group_id scope")
    ap.add_argument("--source", default="hook", help="Source description")

    ss = subparsers.add_parser("summarize-session", help="Summarize session from stdin")
    ss.add_argument("--scope", default="global", help="group_id scope")

    args = parser.parse_args()

    if args.command == "health-check":
        cmd_health_check()
    elif args.command == "detect-project":
        cmd_detect_project(args.cwd)
    elif args.command == "search":
        cmd_search(args.query, args.scope, args.limit, args.curate)
    elif args.command == "add-episode":
        cmd_add_episode(args.text, args.scope, args.source)
    elif args.command == "summarize-session":
        cmd_summarize_session(args.scope)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

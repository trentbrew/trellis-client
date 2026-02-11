# @toolkit/trellis-mcp

MCP (Model Context Protocol) server that exposes the Trellis knowledge graph API as tools for AI agents. Works with **OpenCode**, **Claude Code**, **Gemini CLI**, and any MCP-compatible client.

## Architecture

```
Agent (OpenCode / Claude Code / Gemini CLI)
  ↓ MCP (stdio)
trellis-mcp server
  ↓ HTTP
Trellis dev server (localhost:4141)
  ↓ SSE
Browser UI (realtime updates)
```

## Tools

| Tool | Description |
|------|-------------|
| `query_graph` | Execute EQL-S queries |
| `get_node` | Fetch a single entity by ID |
| `get_nodes` | Batch fetch entities by IDs |
| `create_node` | Create a new entity |
| `update_node` | Update an existing entity |
| `delete_node` | Delete an entity |
| `link_nodes` | Create a semantic link between entities |
| `graph_health` | Health check (fact/link counts) |
| `get_schema` | List registered ontologies |
| `get_catalog` | EAV attribute catalog |
| `get_mutation_log` | Recent mutation history |

## Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Entity Types | `trellis://schema/entity-types` | Full type registry (classes, types, fields, projections) |

## Setup

### 1. Install dependencies

```bash
cd packages/trellis-mcp
pnpm install
```

### 2. Configure your agent

**Claude Code** (`.claude/settings.json`):
```json
{
  "mcpServers": {
    "trellis": {
      "command": "node",
      "args": ["packages/trellis-mcp/bin/serve.mjs"],
      "env": {
        "TRELLIS_API_URL": "http://localhost:4141",
        "TRELLIS_AGENT_ID": "claude-code"
      }
    }
  }
}
```

**OpenCode** (`.opencode.json`):
```json
{
  "mcp": {
    "trellis": {
      "command": "node",
      "args": ["packages/trellis-mcp/bin/serve.mjs"],
      "env": {
        "TRELLIS_API_URL": "http://localhost:4141",
        "TRELLIS_AGENT_ID": "opencode"
      }
    }
  }
}
```

**Gemini CLI** (`~/.gemini/settings.json`):
```json
{
  "mcpServers": {
    "trellis": {
      "command": "node",
      "args": ["/absolute/path/to/packages/trellis-mcp/bin/serve.mjs"],
      "env": {
        "TRELLIS_API_URL": "http://localhost:4141",
        "TRELLIS_AGENT_ID": "gemini"
      }
    }
  }
}
```

### 3. Install the Skill (Claude Code only)

The `SKILL.md` file teaches agents about the Trellis entity architecture. For Claude Code:

```bash
# Copy skill to Claude's skill directory
cp packages/trellis-mcp/SKILL.md .claude/skills/trellis-graph/SKILL.md
```

Or reference it in Claude Code's plugin system.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRELLIS_API_URL` | `http://localhost:4141` | Base URL of the running Trellis dev server |
| `TRELLIS_AGENT_ID` | `mcp` | Agent identifier for mutation attribution |

## How It Works

1. Agent calls an MCP tool (e.g. `create_node`)
2. MCP server translates to HTTP request → `POST /api/graph/mutate`
3. Trellis kernel processes the mutation
4. SSE event bus broadcasts to all connected clients
5. Browser UI updates in realtime

All mutations include the `agentId` so you can see in the mutation log who made each change.

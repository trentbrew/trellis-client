# Trellis — Claude Code Instructions

Read `AGENTS.md` in this repo root for the full Trellis agent reference.

## Quick Context

This is the **Trellis** monorepo — a personal knowledge graph platform. You have access to the graph via:

1. **MCP Server** (49 tools) — configured in `.claude/settings.json`. **Always prefer MCP tools over CLI for programmatic access.**
2. **CLI** — `just trellis <command>` (runs `node packages/trellis-cli/bin/trellis.mjs`). **Never pipe output — use built-in flags.**
3. **REST API** — `http://localhost:$TRELLIS_PORT/api/graph/*` — avoid direct use; prefer MCP tools.

## Your MCP Tools

If the MCP server is connected, you have these tools available:

| Tool | Purpose |
|------|---------|
| `get_graph_summary` | **Call this FIRST** — compact overview of health, types, ontologies, attributes, links, recent mutations |
| `query_graph` | EQL-S query (e.g. `FIND entity AS ?t WHERE ?t.type = "task"`) |
| `get_node` / `get_nodes` | Fetch entities by ID |
| `create_node` / `update_node` / `delete_node` | CRUD entities |
| `link_nodes` | Create semantic links between entities |
| `graph_health` | Quick liveness check (fact/link counts) |
| `get_schema` | Full ontology definitions (verbose — prefer `get_graph_summary`) |
| `get_catalog` | EAV attribute catalog (verbose — prefer `get_graph_summary`) |
| `get_mutation_log` | Recent mutation history |
| `get_ontology` | Fetch a single ontology by ID |
| `create_ontology` | Create a new entity type (auto-scaffolds UI) |
| `update_ontology` | Update an ontology's fields/version |
| `delete_ontology` | Remove an ontology |

## Key Rules

- **Dev server** is always on `localhost:$TRELLIS_PORT` — never start it yourself
- **Agent ID**: Use `"claude"` — it's set in your MCP config
- **Entity IDs**: Descriptive slugs like `entity:task-deploy-v2` (the `entity` namespace is historical — app code uses `entityId()` / `entityQuery()` helpers from `app/lib/tql-namespace.ts`)
- **Mutations are realtime**: Changes appear instantly in the browser via SSE
- **Always set a title**: Every entity needs `{ title: "..." }`
- **Link after creating**: Create both entities first, then link

## CLI Purity Rules (CRITICAL)

**NEVER pipe CLI output through `node -e`, `python -c`, `jq`, `awk`, or any inline script.**

The CLI has built-in flags for every common need:

```bash
# Orientation — call this FIRST
just trellis summary --pretty

# Queries with built-in formatting
just trellis query 'FIND entity AS ?e WHERE ?e.type = "task"' --pretty
just trellis query '...' --count                    # just the row count
just trellis query '...' --fields title,startDate --pretty  # specific columns
just trellis query '...'                            # raw JSON (machine-readable)

# Single entity
just trellis get entity:task-1 --pretty
```

**If you need to process query results programmatically, use your MCP tools instead:**
- `get_graph_summary` — orientation (call first)
- `query_graph` — returns structured JSON you can inspect directly
- `get_node` / `get_nodes` — fetch specific entities

**Forbidden patterns:**
- ❌ `just trellis query '...' | node -e "..."`
- ❌ `just trellis query '...' | python3 -c "..."`
- ❌ `just trellis query '...' 2>&1 | node -e "..."`
- ❌ Any command that pipes `just trellis` output into another program

**Allowed patterns:**
- ✅ `just trellis query '...' --pretty`
- ✅ `just trellis summary --pretty`
- ✅ Use MCP tools (`query_graph`, `get_node`, etc.) for programmatic access

## Ontology CRUD

You can create new entity types at runtime. They auto-appear in the UI:

```json
{
  "id": "trellis:schema/invoice",
  "version": "1.0.0",
  "fields": [
    { "name": "title", "valueType": "title", "required": true },
    { "name": "amount", "valueType": "number" },
    { "name": "dueDate", "valueType": "date" },
    { "name": "status", "valueType": "select", "selectOptions": ["pending", "paid", "overdue"] }
  ]
}
```

Field value types: `title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `people`, `files`, `checkbox`, `url`, `email`, `phone_number`, `relation`

## Full Reference

- `AGENTS.md` — Complete API reference, entity architecture, CLI commands
- `packages/trellis-mcp/SKILL.md` — Entity types, fields, linking, querying best practices

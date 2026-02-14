# Trellis — Claude Code Instructions

Read `AGENTS.md` in this repo root for the full Trellis agent reference.

## Quick Context

This is the **Trellis** monorepo — a personal knowledge graph platform. You have access to the graph via:

1. **MCP Server** (15 tools) — configured in `.claude/settings.json`
2. **CLI** — `just trellis <command>` (runs `node packages/trellis-cli/bin/trellis.mjs`)
3. **REST API** — `http://localhost:4141/api/graph/*`

## Your MCP Tools

If the MCP server is connected, you have these tools available:

| Tool | Purpose |
|------|---------|
| `query_graph` | EQL-S query (e.g. `FIND calendaritem AS ?t WHERE ?t.type = "task"`) |
| `get_node` / `get_nodes` | Fetch entities by ID |
| `create_node` / `update_node` / `delete_node` | CRUD entities |
| `link_nodes` | Create semantic links between entities |
| `graph_health` | Health check (fact count, link count) |
| `get_schema` | List all ontology definitions |
| `get_catalog` | EAV attribute catalog |
| `get_mutation_log` | Recent mutation history |
| `get_ontology` | Fetch a single ontology by ID |
| `create_ontology` | Create a new entity type (auto-scaffolds UI) |
| `update_ontology` | Update an ontology's fields/version |
| `delete_ontology` | Remove an ontology |

## Key Rules

- **Dev server** is always on `localhost:4141` — never start it yourself
- **Agent ID**: Use `"claude"` — it's set in your MCP config
- **Entity IDs**: Descriptive slugs like `calendaritem:task-deploy-v2` (the `calendaritem` namespace is historical — app code uses `entityId()` / `entityQuery()` helpers from `app/lib/tql-namespace.ts`)
- **Mutations are realtime**: Changes appear instantly in the browser via SSE
- **Always set a title**: Every entity needs `{ title: "..." }`
- **Link after creating**: Create both entities first, then link

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

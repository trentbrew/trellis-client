# @toolkit/trellis-cli

CLI for agents and humans to CRUD the Trellis graph with realtime sync.

## Quick Start

```bash
# From project root (requires dev server running on :$TRELLIS_PORT)
just trellis health

# Or directly
node --import tsx packages/trellis-cli/bin/trellis.mjs health
```

## Commands

| Command | Description |
|---|---|
| `trellis query <eqls>` | Execute an EQL-S query |
| `trellis get <entityId>` | Fetch a single node by ID |
| `trellis create --type <type> --id <id> [--data '{}']` | Create a new node |
| `trellis update <entityId> --type <type> --data '{}'` | Update an existing node |
| `trellis delete <entityId>` | Delete a node |
| `trellis link <e1> <relation> <e2>` | Link two nodes |
| `trellis watch` | Stream realtime mutation events (SSE) |
| `trellis health` | Health check |
| `trellis schema` | List ontologies |
| `trellis log` | Recent mutation log |

### Aliases

`q`=query, `g`=get, `c`=create, `u`=update, `d`=delete, `l`=link, `w`=watch, `h`=health, `s`=schema

## Flags

| Flag | Description |
|---|---|
| `--pretty` | Pretty-print JSON output |
| `--agent-id <name>` | Set agent ID for mutations (default: `cli`) |
| `--url <url>` | Override API base URL |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TRELLIS_API_URL` | `http://localhost:$TRELLIS_PORT` | Base URL of the Trellis API |
| `TRELLIS_PORT` | `1414` | Dev server port fallback when `TRELLIS_API_URL` is not set |
| `TRELLIS_AGENT_ID` | `cli` | Default agent identifier |

## Examples

```bash
# Query all tasks
just trellis query 'FIND entity AS ?e WHERE ?e.type = "task"' --pretty

# Create a task
just trellis create --type entity --id 'entity:my-task' \
  --data '{"type":"task","title":"Review PR","taskStatus":"pending","startDate":"2026-02-11","allDay":true,"priority":"high"}' \
  --agent-id cascade

# Watch for changes (great for agents)
just trellis-watch

# Get a specific node
just trellis get entity:task-1 --pretty

# Delete a node
just trellis delete entity:my-task --agent-id cleanup-bot
```

## SDK Usage

The `TrellisClient` class can also be imported directly.

> **Note:** The CLI/SDK uses the raw `entity` TQL storage namespace. In the Nuxt app code, use `entityId()` / `entityQuery()` helpers from `app/lib/tql-namespace.ts` instead.

```typescript
import { TrellisClient } from '@toolkit/trellis-cli'

const client = new TrellisClient({ agentId: 'my-agent' })

const tasks = await client.query('FIND entity AS ?e WHERE ?e.type = "task"')
await client.createNode('entity:new-task', 'entity', {
  type: 'task',
  title: 'Agent-created task',
  taskStatus: 'pending',
  startDate: '2026-02-11',
  allDay: true,
  priority: 'medium',
})

// Watch for mutations
const ac = client.watch((event) => {
  console.log('Mutation:', event.action, event.entityId)
})

// Stop watching
ac.abort()
```

## Architecture

```
Browser UI ──REST──▶ /api/graph/* ◀──REST── trellis CLI
     ▲                    │                      │
     │                    ▼                      │
     └──SSE── /api/graph/events ──SSE───────────┘
                    │
              TrellisKernel (SQLite)
```

When anyone (browser, CLI, agent) mutates the graph via REST, the server emits
an SSE event. All connected clients (browser + `trellis watch`) receive the
event and can react — the browser auto-refreshes its queries, agents can
process the change.

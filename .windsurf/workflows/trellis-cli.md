---
description: How to use the trellis CLI to CRUD graph data with realtime sync
---

# Trellis CLI Workflow

The `trellis` CLI lets agents and humans CRUD the TQL graph. Changes sync to the browser UI in realtime via SSE.

## Prerequisites

- Dev server running on `:4141` (`just dev-v2`)

## Quick Reference

```bash
# Health check
just trellis health --pretty

# Query all tasks
just trellis query 'FIND calendaritem AS ?e WHERE ?e.type = "task"' --pretty

# Get a specific node
just trellis get calendaritem:task-1 --pretty

# Create a node
just trellis create --type calendaritem --id 'calendaritem:my-id' \
  --data '{"type":"task","title":"My Task","taskStatus":"pending","startDate":"2026-02-11","allDay":true,"priority":"medium"}' \
  --agent-id cascade

# Update a node
just trellis update calendaritem:my-id --type calendaritem \
  --data '{"type":"task","title":"Updated Title","taskStatus":"in-progress","startDate":"2026-02-11","allDay":true,"priority":"high"}' \
  --agent-id cascade

# Delete a node
just trellis delete calendaritem:my-id --agent-id cascade

# Link two nodes
just trellis link calendaritem:task-1 relatedTo calendaritem:note-1

# Watch for realtime mutations (streams SSE events)
just trellis-watch

# List ontologies
just trellis schema --pretty

# View recent mutation log
just trellis log --pretty
```

## Ontology CRUD

```bash
# List all ontologies
just trellis ontology list --pretty

# Get a single ontology
just trellis ontology get 'trellis:schema/calendaritem' --pretty

# Create a new ontology (auto-scaffolds UI: sidebar, browse page, dialog)
just trellis ontology create --id 'trellis:schema/invoice' --version '1.0.0' \
  --fields '[{"name":"title","valueType":"title","required":true},{"name":"amount","valueType":"number"},{"name":"vendor","valueType":"rich_text"},{"name":"dueDate","valueType":"date"},{"name":"status","valueType":"select","selectOptions":["pending","paid","overdue"]}]' \
  --agent-id cascade

# Update an ontology (full replace)
just trellis ontology update 'trellis:schema/invoice' --version '1.1.0' \
  --fields '[{"name":"title","valueType":"title","required":true},{"name":"amount","valueType":"number"},{"name":"currency","valueType":"select","selectOptions":["USD","EUR","GBP"]},{"name":"vendor","valueType":"rich_text"},{"name":"dueDate","valueType":"date"},{"name":"status","valueType":"select","selectOptions":["pending","paid","overdue","cancelled"]}]'

# Add a field to an existing ontology
just trellis ontology add-field 'trellis:schema/invoice' \
  --field '{"name":"notes","valueType":"rich_text"}'

# Remove a field from an ontology
just trellis ontology remove-field 'trellis:schema/invoice' --field notes

# Delete an ontology
just trellis ontology delete 'trellis:schema/invoice' --agent-id cascade
```

### What Happens When You Create an Ontology

1. CLI sends `POST /api/graph/ontology` with schema payload
2. Server validates, calls `kernel.createOntology()`, persists as EAV facts
3. Server emits SSE event `{ action: "createOntology", type: "ontology" }`
4. Browser receives SSE → `useOntologyRegistry` re-fetches ontologies
5. Dynamic registry converts schema → `EntityTypeConfig` (infers entity class from fields)
6. Sidebar auto-shows the new type under the Types section
7. User clicks → navigates to `/browse/<type>` → browse page with appropriate views

**Zero code files edited. Zero server restarts.**

## Entity ID Convention

All entities use the `calendaritem:` TQL storage namespace prefix (historical) followed by the item ID:
- `calendaritem:task-1`
- `calendaritem:bm-1` (bookmarks)
- `calendaritem:note-1`
- `calendaritem:person-1`

> **In app code**, use `entityId()` / `entityQuery()` helpers from `app/lib/tql-namespace.ts` instead of hardcoding the prefix.

## Agent ID

Pass `--agent-id <name>` to track which agent made a mutation. This flows through to:
- TQL kernel's MiddlewareContext
- Mutation log (`just trellis log`)
- SSE events (visible in `just trellis-watch`)

## SDK Usage

Import `TrellisClient` from `@toolkit/trellis-cli` for programmatic access:

```js
import { TrellisClient } from '@toolkit/trellis-cli'
const client = new TrellisClient({ agentId: 'my-agent' })
// SDK uses the raw calendaritem namespace — app code should use tql-namespace helpers
await client.createNode('calendaritem:new', 'calendaritem', { type: 'task', title: 'Hello' })
```

## E2E Test

```bash
just trellis-test
```

Runs a full CRUD cycle: health → create → read → update → query → schema → delete → verify.

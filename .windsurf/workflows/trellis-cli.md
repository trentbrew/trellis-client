---
description: How to use the trellis CLI to CRUD graph data with realtime sync
---

# Trellis CLI Workflow

The `trellis` CLI lets agents and humans CRUD the TQL graph. Changes sync to the browser UI in realtime via SSE.

## Prerequisites

- Dev server running on `:$TRELLIS_PORT` (`just dev-v2`)

## Quick Reference

```bash
# Health check
just trellis health --pretty

# Query all tasks
just trellis query 'FIND entity AS ?e WHERE ?e.type = "task"' --pretty

# Get a specific node
just trellis get entity:task-1 --pretty

# Create a node
just trellis create --type entity --id 'entity:my-id' \
  --data '{"type":"task","title":"My Task","taskStatus":"pending","startDate":"2026-02-11","allDay":true,"priority":"medium"}' \
  --agent-id cascade

# Update a node
just trellis update entity:my-id --type entity \
  --data '{"type":"task","title":"Updated Title","taskStatus":"in-progress","startDate":"2026-02-11","allDay":true,"priority":"high"}' \
  --agent-id cascade

# Delete a node
just trellis delete entity:my-id --agent-id cascade

# Link two nodes
just trellis link entity:task-1 relatedTo entity:note-1

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
just trellis ontology get 'trellis:schema/entity' --pretty

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

All entities use the `entity:` TQL storage namespace prefix (historical) followed by the item ID:
- `entity:task-1`
- `entity:bm-1` (bookmarks)
- `entity:note-1`
- `entity:person-1`

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
// SDK uses the raw entity namespace — app code should use tql-namespace helpers
await client.createNode('entity:new', 'entity', { type: 'task', title: 'Hello' })
```

## Platform CRUD

Platform resources (orgs, apps, collections, pages, tags, workflows, settings) are managed via `/api/platform/*` routes.

```bash
# ── Workspace Context ──────────────────────────────────────────────────

# Create an org + app
just trellis org create --name "Media CMS" --slug media-cms --pretty
just trellis app create --name "Production" --icon "lucide:video" \
  --org-id platform:org/media-cms --pretty

# Set persistent context (saved to ~/.trellis/context.json)
just trellis context set --org-id platform:org/media-cms --app-id platform:app/production

# View current context
just trellis context --pretty

# ── Collections & Pages ────────────────────────────────────────────────

just trellis collection create --name "Episodes" --slug episodes --pretty
just trellis page create --title "Dashboard" --data-source show --layout grid --pretty

# ── Comments & Tags ────────────────────────────────────────────────────

just trellis comment add entity:task-1 --content "Reviewed and approved" --pretty
just trellis comment list entity:task-1 --pretty
just trellis tag create --name "Priority" --color "bg-red-500" --pretty
just trellis tag assign entity:task-1 --tags "priority,reviewed" --pretty

# ── Bulk Operations ────────────────────────────────────────────────────

just trellis bulk update \
  --query 'FIND entity AS ?t WHERE ?t.type = "task" AND ?t.taskStatus = "pending"' \
  --data '{"taskStatus":"in-progress"}' --pretty

just trellis bulk delete \
  --query 'FIND entity AS ?t WHERE ?t.type = "task" AND ?t.taskStatus = "completed"' \
  --pretty

# ── Workflows ──────────────────────────────────────────────────────────

just trellis workflow create --name "Auto-triage" \
  --trigger '{"type":"onCreate","entityType":"task"}' --pretty

# ── Settings ───────────────────────────────────────────────────────────

just trellis setting set theme dark --pretty
just trellis setting get theme --pretty
just trellis setting list --pretty

# ── Rich Text Body ─────────────────────────────────────────────────────

just trellis create --type entity --id entity:meeting-notes \
  --data '{"type":"note","title":"Meeting Notes"}' \
  --body '# Agenda\n- Review Q3 goals\n- Assign tasks' \
  --agent-id cascade
```

### Platform ID Conventions

| Resource | ID Format | Example |
|----------|-----------|---------|
| Organization | `platform:org/<slug>` | `platform:org/media-cms` |
| App/World | `platform:app/<slug>` | `platform:app/production` |
| Collection | `platform:collection/<slug>` | `platform:collection/episodes` |
| Page | `platform:page/<slug>-<ts>` | `platform:page/dashboard-mlx6yjnj` |
| Tag | `platform:tag/<slug>` | `platform:tag/priority` |
| Workflow | `platform:workflow/<slug>-<ts>` | `platform:workflow/auto-triage-mlx6yv0g` |
| Comment | `comment:<uuid>` | `comment:1890044d-...` |
| Setting | `platform:setting/<scope>/<key>` | `platform:setting/app/theme` |

### Idempotent Creates

`org create`, `app create`, `collection create`, and `tag create` are idempotent by slug. If the slug already exists, the existing record is returned with `"created": false`.

### Context Scoping

Commands that operate within an app (`collection`, `page`, `workflow`) read the app ID from `~/.trellis/context.json`. Override per-command with `--app <id>`. Similarly, `app list` reads the org from context, overridable with `--org <id>`.

## E2E Test

```bash
just trellis-test
```

Runs a full CRUD cycle: health → create → read → update → query → schema → delete → verify.

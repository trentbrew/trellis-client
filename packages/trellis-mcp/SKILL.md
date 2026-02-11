---
name: trellis-graph
description: >
  Skill for working with the Trellis knowledge graph — creating, querying,
  linking, and managing entities (tasks, events, notes, people, projects, etc.)
  using the TQL Graph API via MCP tools. Use this skill whenever the user asks
  you to interact with their Trellis data, create entities, query the graph,
  or manage relationships between entities.
---

# Trellis Graph Skill

Trellis is a personal knowledge graph where everything is an entity with typed
properties and semantic links. The graph powers a Nuxt web app running on
`localhost:4141` with realtime sync — any mutations you make via MCP tools
appear instantly in the browser UI.

## Entity Architecture

### Two-Axis Type System

Every entity has an **entity class** (structural shape) and an **entity type** (specific kind):

| Class | Description | Types |
|-------|-------------|-------|
| **temporal** | Has date/time span, lives on a calendar | task, event, trip, payment, appointment, reminder, deadline, milestone |
| **document** | Has rich content body | note, file, page, template, slide_deck, bookmark |
| **actor** | Represents a person/entity with identity | person, contact, organization, vendor |
| **container** | Groups/organizes other entities | project, folder, collection, goal |

### Common Fields (all entities)

- `id` — Unique string identifier (e.g. `"task-abc123"`)
- `type` — Entity type string
- `title` — Display name (required)
- `description` — Optional rich text
- `tags` — String array
- `owner` — User ID who owns the entity
- `involved` — Array of user IDs
- `category` — Optional classification string
- `references` — Array of `FileReference | EntityReference` objects
- `createdAt` / `updatedAt` — ISO 8601 timestamps

### Temporal Fields (temporal class only)

- `startDate` — `YYYY-MM-DD` (required for most temporal types)
- `endDate` — `YYYY-MM-DD` (optional, for multi-day items)
- `allDay` — Boolean
- `startTime` / `endTime` — `HH:mm` (when not all-day)
- `priority` — `critical | high | medium | low`
- `urgency` — `urgent | not-urgent`
- `taskStatus` — `pending | in-progress | on-track | due-soon | overdue | completed` (tasks only)
- `reminders` — Array of `{ id, timing, method }`
- `recurrence` — `{ frequency, interval?, weekdays?, endDate?, occurrences? }`

### Document Fields (document class only)

- `content` — HTML rich text body
- `pinned` — Boolean
- `url` — String (bookmarks only)
- `favicon` / `thumbnail` / `siteName` / `excerpt` — Bookmark metadata

### Actor Fields (actor class only)

- `email` / `phone` — Contact info
- `avatar` — URL
- `role` — String

### Container Fields (container class only)

- `children` — Array of child entity IDs
- `progress` — 0–1 float
- `status` — `active | archived | completed | on-hold`
- `parentId` — Optional parent container ID

## Creating Entities

Always use `create_node` with:
1. A descriptive, unique `entityId` (e.g. `"task-weekly-review"`, `"note-meeting-notes-feb10"`)
2. The correct `type` from the list above
3. A `data` object with at minimum `{ title: "..." }`

### Examples

**Create a task:**
```json
{
  "entityId": "task-review-pr-42",
  "type": "task",
  "data": {
    "title": "Review PR #42",
    "startDate": "2026-02-11",
    "priority": "high",
    "taskStatus": "pending",
    "tags": ["code-review", "frontend"]
  }
}
```

**Create a note:**
```json
{
  "entityId": "note-standup-feb10",
  "type": "note",
  "data": {
    "title": "Standup Notes — Feb 10",
    "content": "<p>Discussed MCP integration and skill system.</p>",
    "pinned": false,
    "tags": ["standup", "engineering"]
  }
}
```

**Create a person:**
```json
{
  "entityId": "person-jane-doe",
  "type": "person",
  "data": {
    "title": "Jane Doe",
    "email": "jane@example.com",
    "role": "Engineering Lead"
  }
}
```

**Create a project:**
```json
{
  "entityId": "project-mcp-integration",
  "type": "project",
  "data": {
    "title": "MCP Integration",
    "status": "active",
    "startDate": "2026-02-10",
    "endDate": "2026-03-01"
  }
}
```

## Linking Entities

Use `link_nodes` with semantic relation names:

| Relation | Meaning | Example |
|----------|---------|---------|
| `assignedTo` | Task/item → Person | task-1 → person-jane |
| `belongsTo` | Entity → Project/Folder | task-1 → project-mcp |
| `references` | Bidirectional reference | note-1 → task-2 |
| `dependsOn` | Task dependency chain | task-2 → task-1 |
| `parentOf` | Container hierarchy | project-1 → folder-1 |
| `childOf` | Inverse of parentOf | folder-1 → project-1 |

## Querying

Use `query_graph` with EQL-S syntax:

```
FIND tasks AS t WHERE t.priority = "high" RETURN t.title, t.startDate, t.taskStatus
```

```
FIND notes AS n RETURN n.title, n.updatedAt ORDER BY n.updatedAt DESC LIMIT 10
```

```
FIND projects AS p WHERE p.status = "active" RETURN p.title, p.progress
```

## Introspection

- `graph_health` — Quick check: status, fact count, link count
- `get_schema` — Full ontology definitions
- `get_catalog` — Attribute distributions (what data exists)
- `get_mutation_log` — Recent changes to the graph

## Ontology CRUD (Runtime Type Creation)

You can create new entity types at runtime using the ontology tools. When you create
an ontology, the new type **automatically appears** in the Trellis UI sidebar, browse
pages, and dialogs — zero code changes needed.

### Field Value Types (Notion-compatible)

`title`, `rich_text`, `number`, `select`, `multi_select`, `status`, `date`, `people`,
`files`, `checkbox`, `url`, `email`, `phone_number`, `relation`, `rollup`, `formula`

### Create an Ontology

```json
{
  "id": "trellis:schema/invoice",
  "version": "1.0.0",
  "fields": [
    { "name": "title", "valueType": "title", "required": true },
    { "name": "amount", "valueType": "number" },
    { "name": "vendor", "valueType": "rich_text" },
    { "name": "dueDate", "valueType": "date" },
    { "name": "status", "valueType": "select", "selectOptions": ["pending", "paid", "overdue"] }
  ]
}
```

### Entity Class Inference

The system infers entity class from fields:
- **temporal** — Has `startDate`, `endDate`, `dueDate`, `allDay`, etc.
- **document** — Has `content`, `pinned`, `body`, etc.
- **actor** — Has `email`, `phone`, `avatar`, `firstName`, etc.
- **container** — Default when no specific indicators found

### Update an Ontology

Use `update_ontology` with the full field list (replaces all existing fields).

### Delete an Ontology

Use `delete_ontology` — removes the type schema. Existing entities of that type remain
in the graph but the type disappears from the UI.

## Best Practices

1. **Always set a title** — Every entity needs at minimum a `title` field
2. **Use descriptive IDs** — `"task-deploy-v2"` not `"abc123"`
3. **Set dates as ISO strings** — `"2026-02-10"` for dates, `"14:30"` for times
4. **Link after creating** — Create both entities first, then link them
5. **Check before creating** — Use `query_graph` to avoid duplicates
6. **Use tags liberally** — Tags are the primary cross-cutting classification
7. **Mutations are realtime** — The browser UI updates instantly via SSE

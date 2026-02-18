- A personal knowledge graph platform
- Local-first with cloud sync capabilities
- Notion-like interface with powerful underlying graph
- Has entity types, ontologies, TQL query language
- Supports temporal, document, actor, and container entity classes
- Has calendar, tasks, notes, projects, people, etc.
- Desktop app via Tauri + web app
- Very builder/developer-focused

=============================================

# Integration Ontology & Data Pipeline

Design and implement a graph-native Integration entity type that connects external services to Workflows, Feed, and Database.

---

## Current State

**No Integration ontology exists.** Here's what we have today:

| Layer | What Exists | Gap |
|-------|-------------|-----|
| **Composable** | `useIntegrations.ts` — 18 hardcoded `IntegrationDefinition`s (Airtable, Slack, Notion, etc.) + `ConnectedIntegration` runtime type | All state is ephemeral — `ref()` only, lost on refresh |
| **Settings UI** | `/settings/integrations` — category tabs, config form, `IntegrationCard` / `IntegrationConfigForm` components | Config is never persisted to TQL or InstantDB |
| **Feed** | `/workspace/feed.vue` — `FeedSource` interface, 7 source pills, `itemSource()` stub returns `'manual'` always | No real source resolution; ready but not wired |
| **Workflows** | `WorkflowTrigger = 'manual' \| 'schedule' \| 'webhook' \| 'event'` — Vue Flow editor + TQL engine execution | No `'integration'` trigger; no integration node kind |
| **Core Ontology** | `core:Workflow` exists (name, trigger, steps, active) | No `core:Integration` or `core:Connector` type |
| **System Ontologies** | 25 entity types in `tql-ontologies.ts` | None for integration |

---

## Proposed Architecture

### Two New Ontologies

#### 1. `trellis:schema/integration` (system tier, container class)

Represents a **connected external service instance** — the "Slack connection" or "Notion sync". Each is a first-class entity in the graph.

```
Fields:
  title           title       (required) — Display name ("My Notion Sync")
  description     rich_text   — What this integration does
  provider        select      — Provider ID ("notion", "slack", "airtable", etc.)
  category        select      — data | auth | communication | storage | automation | analytics
  status          status      — available | configuring | connected | error | disabled
  authType        select      — oauth | api_key | webhook | none
  configJson      rich_text   — Encrypted/serialized config blob (keys, tokens, base IDs)
  webhookUrl      url         — Inbound webhook endpoint (generated per integration)
  syncDirection   select      — import | export | bidirectional
  syncInterval    number      — Sync interval in ms (0 = realtime)
  lastSyncAt      date        — Last successful sync timestamp
  lastError       rich_text   — Last error message (cleared on success)
  docsUrl         url         — Link to provider API docs
  icon            rich_text   — Icon name (e.g. "simple-icons:notion")
  color           rich_text   — Tint color
```

**Links:**
- `belongsTo` → Organization (scoped to workspace)
- `triggeredBy` / `triggers` → Workflow (bi-directional)

**Why container class?** An integration "contains" its events/synced data — it groups related inbound items.

#### 2. `trellis:schema/integration_event` (system tier, temporal class)

Represents a **single inbound data item** from an external source — a Slack message, a Notion page update, a webhook payload. These are what populate the Feed.

```
Fields:
  title           title       (required) — Event summary
  description     rich_text   — Event detail / body
  eventType       select      — message | update | create | delete | webhook | sync | error
  provider        select      — Same provider enum as integration
  sourceId        rich_text   — External ID (Notion page ID, Slack message ts, etc.)
  sourceUrl       url         — Deep link back to the external item
  payload         rich_text   — Raw JSON payload (for debugging / advanced use)
  processedAt     date        — When Trellis processed this event
  startDate       date        — When the external event occurred (temporal axis)
```

**Links:**
- `belongsTo` → Integration (which service produced this)
- `references` → Entity (if the event was mapped to an existing entity, e.g. a synced task)

---

## Implementation Phases

### Phase 1: Ontology + Persistence (backend)

**Files to create/modify:**

1. **`server/utils/tql-ontologies.ts`** — Add `integrationOntology` and `integrationEventOntology` to `entityTypeOntologies` registry
2. **`app/types/entity.ts`** — Add `IntegrationItem` and `IntegrationEventItem` interfaces, add to `ContainerEntity` / `TemporalEntity` unions, add type guards
3. **`app/config/entityRegistry.ts`** — Register both types (icon, color, projections, dialog shell, search fields)

**Result:** Both types appear in `/database`, are queryable via EQL-S, and support CRUD via CLI/MCP.

### Phase 2: Settings Page → Graph Persistence

**Files to modify:**

1. **`app/composables/useIntegrations.ts`** — Refactor `connectedIntegrations` from `ref<ConnectedIntegration[]>` to TQL-backed entities via `useEntities()`. Keep the static `availableIntegrations` catalog as-is (it's the "marketplace" of available providers).
2. **`app/pages/settings/integrations.vue`** — Wire CRUD through `useEntities().create/update/remove` instead of local array mutations. "Connect" creates an `integration` entity; "Disconnect" deletes it.

**Result:** Connected integrations persist across refreshes, appear in Database, are linkable to workflows/entities.

### Phase 3: Feed Source Resolution

**Files to modify:**

1. **`app/pages/workspace/feed.vue`** — Replace stubbed `itemSource()` with real resolution:
   - Check entity for `sourceIntegration` link → resolve provider name
   - Check entity for `source` field (new field on `EntityItemBase`) → fallback
   - Default to `'manual'`
2. **`app/types/entity.ts`** — Add optional `source?: string` and `sourceIntegrationId?: string` fields to `EntityItemBase`
3. **Feed source pills** — Dynamically build from connected integrations (query `type = "integration" AND status = "connected"`) instead of hardcoded array

**Result:** Feed items show real source badges; source filter pills reflect actual connected services.

### Phase 4: Workflow Integration Trigger

**Files to modify:**

1. **`app/types/database.ts`** — Add `'integration'` to `WorkflowTrigger` union. Add `'integration'` to `WorkflowNodeKind` union.
2. **`app/composables/useWorkflowEditor.ts`** — Add `flowIntegration` node type mapping. Add integration node to palette.
3. **`app/composables/useWorkflowExecution.ts`** — Map `'integration'` kind to TQL `'Tool'` node with integration-specific execution logic.
4. **`server/api/graph/[...path].ts`** (or new endpoint) — Webhook receiver that creates `integration_event` entities and optionally triggers linked workflows.

**Result:** Workflows can be triggered by integration events; visual editor shows integration nodes.

### Phase 5: Integration Dialog & Detail UX

**Files to create:**

1. **`app/components/entity/panels/IntegrationContent.vue`** — Content panel showing: connection status indicator, provider card, config fields, sync history, linked workflows, recent events timeline
2. **`app/components/entity/panels/IntegrationEventContent.vue`** — Content panel showing: event payload viewer (JSON tree), source link, linked entity preview
3. **Wire into `EntityContentPanel.vue`** — Add `integration` and `integration_event` to panel map

**Result:** Clicking an integration in Database/sidebar opens a rich detail view.

---

## Data Flow Diagram

```
External Service (Notion, Slack, etc.)
        │
        ▼
  Webhook / Poll / OAuth Sync
        │
        ▼
  ┌─────────────────────┐
  │  integration_event   │  ← TQL entity (temporal class)
  │  entity created       │
  └────────┬────────────┘
           │ belongsTo
           ▼
  ┌─────────────────────┐
  │  integration         │  ← TQL entity (container class)
  │  (e.g. "My Notion") │
  └────────┬────────────┘
           │ triggers (link)
           ▼
  ┌─────────────────────┐
  │  workflow             │  ← Existing workflow system
  │  (optional)           │
  └────────┬────────────┘
           │ creates/updates
           ▼
  ┌─────────────────────┐
  │  entity               │  ← Task, Note, Person, etc.
  │  (with source link)   │
  └───────────────────────┘
           │
           ▼
        Feed page resolves source → shows provider badge
```

---

## UX Considerations

- **Settings page** remains the primary "connect/disconnect" surface — but now backed by real entities
- **Database** auto-scaffolds browse views for both types (table, list, card-grid)
- **Feed** dynamically populates source pills from connected integrations
- **Workflow editor** gains an "Integration" node type in the palette — drag onto canvas, configure which integration + event types to listen for
- **Entity dialogs** can show "Source: Notion" badge in properties row when an entity was synced from an integration
- **Graph explorer** visualizes integration → entity edges

## Questions to Resolve Before Starting

1. **Credential storage** — `configJson` as encrypted rich_text in TQL is a placeholder. For production, should we use server-side encrypted storage (env vars / Vault) instead of graph storage? (I'd recommend a hybrid: metadata in TQL, secrets in server-side secure storage.)
2. **Webhook endpoint pattern** — One global `/api/webhooks/:integrationId` route, or per-provider routes (`/api/webhooks/slack`, `/api/webhooks/notion`)?
3. **Sync execution** — Should sync logic live in Nitro server tasks (cron), Trigger.dev jobs, or the TQL workflow engine?
4. **Priority** — Should we start with Phase 1+2 (ontology + persistence) and defer the feed/workflow wiring, or go end-to-end for one provider first (e.g. webhooks only)?

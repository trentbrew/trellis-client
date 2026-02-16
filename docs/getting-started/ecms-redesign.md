# Trellis Web App

The primary web app for the **Trellis knowledge graph** platform — not a toolkit sandbox.

This codebase is optimized for:

- **Template-driven iteration** (fast changes from a single canonical configuration)
- **Demoability** (seedable, repeatable scenarios)
- **Artifact generation** (decision docs, implications, design guidelines, feedback notes)

It contains a working implementation of a **graph-driven architecture** (JSON-LD) and a growing set of ECMS-shaped domain concepts.

---

## Overview

The Trellis web app is the place to prototype (and stress test) next‑generation knowledge graph workflows. It is intentionally designed to move quickly and to produce reusable decisions and patterns that can later be migrated into production apps.

**Primary outputs:**

- **Working flows** that can be demoed end-to-end (facility selection, tasks, scheduled tasks, templates, permits, etc.)
- **Canonical config & schema** that encode product structure (routes, types, fields, projections)
- **Artifacts** (ADR-style decisions, design guidelines, implications, refactor plans)

### Relationship to Other Apps

| App                 | Purpose                                      | Tech Stack                 | Status             |
| ------------------- | -------------------------------------------- | -------------------------- | ------------------ |
| **trellis-web** (this) | Primary Trellis knowledge graph web app       | Nuxt 4, InstantDB, JSON-LD | Active Development |
| **ecms**                 | Legacy environmental compliance management       | Vue 3, Firebase, Firestore | Production                                           |
| **tri**                  | Toxic Release Inventory (EPA Form R/A) reporting | Vue 3, Firebase, Postgres  | Production                                           |
| **ui**                   | Shared component library (169+ pages)            | Vue 3                      | Production-grade component library (not the sandbox) |

### Strategic Roadmap

The Trellis web app aims to:

1. **Act as the single “design surface”** for the Trellis knowledge graph platform
2. **Consolidate** core concepts across ECMS + TRI into one cohesive UX shell
3. **Enable high-velocity iteration** via a canonical configuration + seeded demo data
4. **Generate durable artifacts**: decisions, implications, guidelines, and implementation notes

**Non-goals (for this repo):** production-hardening, perfect backend parity, long-term API stability.

## Operating Model

**What belongs here**

- **End-to-end demos** of future workflows (even if the backend is mocked/seeded)
- **Canonical configuration** that defines the product surface area (routes, types, fields, projections)
- **Fast iteration utilities** (seed scripts, validation scripts, demo “scenarios”)
- **Artifacts** that capture product + engineering decisions

**What does not belong here**

- Long-lived production APIs with stability guarantees
- Deep, irreversible migrations without a clear transition plan back into production apps
- One-off UI explorations that don’t produce a reusable decision/artifact

**Where artifacts live**

- `docs/VISION.md` and `docs/REFACTOR_PLAN.md`
  - Historical context from earlier iterations (RasterTV / cablecast-proxy planning; not the current focus)
- `docs/GRAPH_DRIVEN_PAGES_IMPLEMENTATION.md`
  - Implementation plan + rationale for graph-driven pages
- `docs/notes/`
  - Architecture notes, decisions, seeding notes, route organization decisions
- `docs/paper/`
  - Longer-form writeups (architecture, ontology, implications)
- `NOTES.md`, `SCRATCH.md`
  - Working notes / drafts

---

## Tech Stack

- **Nuxt 4**: Modern Vue.js meta-framework
- **Vue 3**: Progressive JavaScript framework
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **InstantDB**: Real-time database and auth
- **JSON-LD**: Semantic configuration for graph-driven architecture
- **Vue Flow**: Node-based flow visualization
- **Monaco Editor**: Code editing
- **Playwright**: E2E testing
- **Vitest**: Unit testing

---

## Graph-Driven Architecture

The most distinctive feature of ecms-redesign is its **graph-driven architecture**, which uses JSON-LD to define the entire application structure declaratively.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    app-config.jsonld                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Types     │  │   Fields    │  │   Routes & Projections  │  │
│  │ (rdfs:Class)│  │ (app:Field) │  │      (app:Route)        │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
    ┌─────────────────────────────────────────────────────┐
    │              lib/appConfig.ts                       │
    │   Parses JSON-LD → Builds type/field/route maps     │
    └─────────────────────────┬───────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │          composables/useGraphDrivenPage.ts          │
    │   - Resolves route → entity type                    │
    │   - Builds schema from type fields                  │
    │   - Determines available projections (views)        │
    │   - Loads data via useFacilityEntities              │
    └─────────────────────────┬───────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────┐
    │              Page Components                        │
    │   Render dynamically based on config:               │
    │   - Table, Kanban, Calendar, List views            │
    │   - Schema-driven forms                            │
    │   - Type-aware detail sheets                       │
    └─────────────────────────────────────────────────────┘
```

### Key Files

| File                                     | Purpose                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `app/config/app-config.jsonld`           | Central graph config (~3000 lines): types, fields, routes, projections, themes |
| `app/lib/appConfig.ts`                   | Parses JSON-LD, provides lookup functions for types/fields/routes              |
| `app/lib/projections.ts`                 | Builds view mode options based on schema requirements                          |
| `app/composables/useGraphDrivenPage.ts`  | Main composable orchestrating graph-driven pages                               |
| `app/composables/useFacilityEntities.ts` | Fetches entity data, maps to JSON-LD types                                     |
| `instant.schema.ts`                      | InstantDB schema with ECMS entities (tasks, generators, facilities, etc.)      |

### Entity Type Hierarchy

The JSON-LD config defines a type hierarchy:

```
type:Thing
├── type:Person → type:User
├── type:Organization → type:Facility
├── type:Task
│   └── type:ExternalTask
├── type:TaskGenerator
├── type:TaskTemplate
├── type:Folder
├── type:Document
│   ├── type:Permit
│   └── type:Report
├── type:Event
├── type:Payment
├── type:Deadline
└── type:Reminder
```

### Projection System

Views (projections) are schema-aware:

- **Table**: Always available
- **Kanban**: Requires `select` field
- **Calendar**: Requires `date` field
- **List**: Always available
- **Spreadsheet**, **Graph**, **Timeline**: Planned

---

## Architecture Implications (and how to keep this agent-friendly)

This repo currently mixes two approaches:

- **Graph-driven** (schema/route/view driven by `app-config.jsonld` via `useGraphDrivenPage`)
- **Traditional page/component patterns** (page-level mock data, bespoke composables per view)

That hybrid model is a major source of entropy:

- **Two sources of truth** (JSON-LD config vs. component code) drift over time.
- **Partial adoption** makes it hard to know the “right way” to add a page.
- **Agentic coding risk**: LLMs default to legacy patterns (handcrafted pages, local state) unless the repo’s conventions are extremely explicit.

### The goal for this sandbox

Optimize for **high-velocity, spec-driven changes** that are easy for a coding agent to apply consistently.

### Proposed “Architecture Contract”

**1) Single canonical definition of the product surface**

- **Routes, navigation, titles, permissions**: `app/config/app-config.jsonld`
- **Entity types + fields + view availability**: `app/config/app-config.jsonld`
- **InstantDB schema** (when persisting): `instant.schema.ts`

**2) Pages should be renderers, not authors**

- Page components should prefer `useGraphDrivenPage(...)` and render configured projections.
- Avoid embedding static mock datasets inside page components.

**3) Demo data should come from a single layer**

- Seed/demo data belongs in one place and should be reusable across pages.
- Today, `useFacilityEntities.ts` reads seed data (fallback) and stubs persistence.
- If a page needs mock data, the path should be:
  - seed generator/composable → entity repo/composable → page renderer

**4) Spec-first workflow**

Before implementing a new capability, capture it as a spec artifact so changes stay consistent:

- Add/update a short decision/spec doc under `docs/notes/`
- Encode the UI surface in `app-config.jsonld` (route + type + fields)
- Implement/extend the data layer composable(s)
- Only then add/modify view components

The template in `NOTES.md` (“Proposed route structure”) is a good starting point for these specs.

**5) Make the config verifiable**

- Route validation: `scripts/validate-routes.ts`
- Basic config sanity check: `scripts/verify-app-config.ts`

### Golden Path: shipping a change (spec-driven)

When you want a new page / workflow / entity change, prefer this sequence:

1.  **Write the spec first**
    - Add a short doc under `docs/notes/` describing:
      - purpose
      - route(s)
      - roles/permissions
      - entities + fields
      - demo scenario(s)
      - implications / tradeoffs
    - Use the template in `NOTES.md` (“Proposed route structure”) as a starting point.

2.  **Encode the UI surface in the graph**
    - Update `app/config/app-config.jsonld`:
      - route node(s)
      - type node(s) / field refs
      - projectionTypes (views)

3.  **Update the data layer (one place)**
    - If it’s demo-only, update the seed generator/composable and any entity mapping.
    - If it needs persistence, update `instant.schema.ts` and the InstantDB adapter.

4.  **Render via the graph-driven page path**
    - Prefer `useGraphDrivenPage(...)` so the page stays a renderer.
    - Avoid page-local mock data (it will drift).

5.  **Validate**
    - Run `pnpm validate:routes`
    - Run `pnpm test`

---

## Project Structure

```
ecms-redesign/v1/
├── app/
│   ├── components/       # 517 Vue components
│   │   └── views/        # TableView, BoardView, CalendarView, etc.
│   ├── composables/      # 36 composables
│   │   ├── useGraphDrivenPage.ts
│   │   ├── useFacilityEntities.ts
│   │   ├── useInstantData.ts
│   │   └── useRoutes.ts
│   ├── config/
│   │   └── app-config.jsonld  # Graph configuration
│   ├── lib/
│   │   ├── appConfig.ts       # JSON-LD parser
│   │   └── projections.ts     # View mode builder
│   ├── pages/            # 55 page files (dynamic routes)
│   ├── types/
│   │   ├── database.ts   # Schema types
│   │   └── ecms/         # ECMS domain types (10 files)
│   └── data/             # Seed data
├── instant.schema.ts     # InstantDB schema
├── server/               # API routes
├── tests/                # Playwright + Vitest tests
├── scripts/              # Seed + validation + maintenance scripts
└── docs/                 # Documentation (decisions, guidelines, implications)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (required)

This repo enforces `pnpm` via a `preinstall` guard.

### Installation

```bash
# From repo root
cd apps/web

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

The app runs at `http://localhost:4141`

### Development Scripts

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `pnpm dev`        | Start dev server (port 4141)                              |
| `pnpm build`      | Production build                                          |
| `pnpm test`       | Run Vitest tests                                          |
| `pnpm lint`       | Run ESLint                                                |
| `pnpm check`      | Canonical fast loop: lint + unit tests + route validation |
| `pnpm check:full` | Slower loop: `pnpm check` + `nuxt build`                  |
| `pnpm typecheck`  | Optional strict typecheck (`nuxi typecheck`)              |
| `pnpm format`     | Format with Prettier                                      |
| `pnpm seed:demo`  | Seed demo data                                            |

---

## Key Features

### Implemented

- ✅ Graph-driven page configuration via JSON-LD
- ✅ Multi-projection views (Table, Kanban, Calendar)
- ✅ ECMS task management (3-tier: Template → Generator → Task)
- ✅ Facility hierarchy navigation
- ✅ Role-based route filtering
- ✅ Demo user switching
- ✅ Dark/Light mode theming
- ✅ Command palette navigation
- ✅ Scheduled tasks (TaskGenerators) management

### In Progress

- 🔄 InstantDB persistence (currently using seed data)
- 🔄 AI-powered task suggestions
- 🔄 Permit indexing workflow

### Planned

- 📋 TRI chemical tracking integration
- 📋 Method 9 opacity observations
- 📋 KPI dashboards
- 📋 Full audit logging
- 📋 Notification digests

---

## Opportunities for Improvement

### 1. **Complete InstantDB Integration**

Currently, CRUD operations in `useFacilityEntities.ts` are stubbed with TODOs:

```typescript
// Lines 351, 361, 366 - all have "TODO: Persist to InstantDB"
```

**Action**: Implement actual InstantDB mutations.

### 2. **Consolidate Data Fetching Patterns**

Multiple composables handle data differently:

- `useInstantData.ts` (25KB) - general InstantDB queries
- `useFacilityEntities.ts` (11KB) - ECMS-specific entities
- `useCollectionData.ts` (7KB) - collection-based data

**Action**: Consider unifying into a single data layer abstraction.

### 2.1 **Eliminate hybrid page-level mock data**

For this sandbox’s purpose (template-driven iteration + agentic coding), page components should not be inventing their own mock datasets.

**Action**: Migrate remaining pages to:

- route/type config in `app-config.jsonld`
- data via a single entity repo/composable
- rendering via `useGraphDrivenPage`

### 3. **Type Duplication Between instant.schema.ts and types/ecms/**

The `instant.schema.ts` defines entities, but `types/ecms/*.ts` also defines similar TypeScript interfaces. These should be generated from a single source.

**Action**: Auto-generate TypeScript types from InstantDB schema or JSON-LD.

---

## Redundancies Identified

### 1. **Duplicate Route Definitions**

Routes are defined in both:

- `app-config.jsonld` (canonical source)
- `app/config/routes.ts` (legacy, partially used)

**Recommendation**: Fully migrate to JSON-LD, remove legacy routes.ts

### 2. **Multiple Entity Normalization Layers**

- `useFacilityEntities.ts` has `normalizeTask()`, `normalizeEntity()`
- `useInstantData.ts` has its own normalization
- Seed data has raw format

**Recommendation**: Single normalization layer at data access boundary.

### 3. **Icon Registries**

Icons defined in:

- `app-config.jsonld` (ui:IconRegistry)
- `lib/ontology.ts` (statusColors with icons)
- Inline in components

**Recommendation**: Consolidate to JSON-LD registry.

### 4. **Projection Labels/Icons**

Defined in both:

- `lib/projections.ts` (hardcoded maps)
- `app-config.jsonld` (ui:Projection nodes)

**Recommendation**: Use JSON-LD as single source.

---

## ECMS Data Model

The app implements the ECMS 3-tier task system:

```
TaskTemplate (corporate-level blueprints)
    │
    ├── schedules: ScheduleTemplate[]
    ├── customFieldDefinitions: TaskCustomField[]
    └── facilities: FacilityID[]
            │
            ▼
TaskGenerator (facility-level schedules)
    │
    ├── schedule: Schedule (cron-like)
    ├── owner: UID
    └── involved: UID[]
            │
            ▼
Task (individual instances)
    │
    ├── dueAt: ISO8601Date
    ├── completedAt: timestamp
    ├── customFieldValues: Record<string, any>
    └── comments: Comment[]
```

See `ECMS_DATA_GUIDE.md` for detailed data model documentation.

---

## Related Documentation

- `ECMS_DATA_GUIDE.md` - Complete ECMS data model reference
- `QUICK_REFERENCE.md` - Developer quick reference
- `SIDEBAR_SECTIONS_GUIDE.md` - Navigation configuration
- `docs/GRAPH_DRIVEN_PAGES_IMPLEMENTATION.md` - Graph-driven pages plan + rationale
- `docs/notes/` - Architecture notes + decisions
- `docs/paper/` - Longer-form writeups (architecture/ontology/implications)
- `docs/` - Additional documentation

---

## License

MIT License - see LICENSE.md

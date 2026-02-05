# Toolkit UI Monorepo

A **pnpm workspace monorepo** containing:

1. **`@toolkit/ui`** (apps/v1): Production-grade Vue 3 component library with 90+ accessible, themeable UI components
2. **`@toolkit/sandbox`** (apps/v2): ECMS Redesign sandbox (Nuxt 4) for prototyping the unified Toolkit platform

---

## Quick Start

```bash
# With Nix (recommended)
nix develop
just install

# Without Nix
pnpm install
```

### Development

```bash
# Start component library (v1)
just dev-v1          # or: pnpm --filter @toolkit/ui dev

# Start Nuxt sandbox (v2)
just dev-v2          # or: pnpm --filter @toolkit/sandbox dev

# Start both
just dev-all
```

### Available Commands

```bash
just              # Show all commands
just install      # Install dependencies
just build        # Build all packages
just test         # Run tests
just lint         # Run linting
just clean        # Clean node_modules and build artifacts
just reset        # Clean and reinstall
```

---

## Technology Stack

### v1 - Component Library

| Category       | Technology                     |
| -------------- | ------------------------------ |
| **Framework**  | Vue 3.5+ with Composition API  |
| **Build Tool** | Vite (with Rolldown-Vite)      |
| **Styling**    | Tailwind CSS v4                |
| **Components** | Reka UI (headless primitives)  |
| **State**      | Pinia                          |
| **Forms**      | VeeValidate + Zod              |
| **Tables**     | TanStack Table, DataTables.net |
| **Charts**     | ApexCharts                     |
| **Icons**      | Lucide Vue, Iconify            |
| **Testing**    | Vitest + Vue Test Utils        |

### v2 - ECMS Redesign Sandbox

| Category               | Technology                         |
| ---------------------- | ---------------------------------- |
| **Framework**          | Nuxt 4                             |
| **Language**           | TypeScript                         |
| **Styling**            | Tailwind CSS v4                    |
| **Database**           | InstantDB (real-time)              |
| **Architecture**       | JSON-LD graph-driven configuration |
| **Flow Visualization** | Vue Flow                           |
| **Code Editor**        | Monaco Editor                      |
| **E2E Testing**        | Playwright                         |
| **Unit Testing**       | Vitest                             |

---

## Architecture Highlights

### Graph-Driven Architecture (v2)

The most distinctive feature is the **JSON-LD graph-driven architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    app-config.jsonld (80KB)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Types     │  │   Fields    │  │   Routes & Projections  │  │
│  │ (rdfs:Class)│  │ (app:Field) │  │      (app:Route)        │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
    ┌─────────────────────────────────────────────────────────┐
    │              lib/appConfig.ts                           │
    │   Parses JSON-LD → Builds type/field/route maps         │
    └─────────────────────────┬───────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │          composables/useGraphDrivenPage.ts              │
    │   - Resolves route → entity type                        │
    │   - Builds schema from type fields                      │
    │   - Determines available projections (views)            │
    │   - Loads data via useFacilityEntities                  │
    └─────────────────────────┬───────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │              Page Components                            │
    │   Render dynamically based on config:                   │
    │   - Table, Kanban, Calendar, List views                │
    │   - Schema-driven forms                                │
    │   - Type-aware detail sheets                           │
    └─────────────────────────────────────────────────────────┘
```

### ECMS Three-Tier Task System

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
    └── customFieldValues: Record<string, any>
```

---

## File Structure

```
.
├── flake.nix                # Nix dev shell
├── package.json             # Workspace root
├── pnpm-workspace.yaml      # Workspace config
├── justfile                 # Task runner commands
│
├── apps/
│   ├── v1/                  # @toolkit/ui - Component Library
│   │   ├── src/
│   │   │   ├── components/  # 928 items (90+ UI components)
│   │   │   ├── composables/ # 11 composables
│   │   │   └── pages/       # 169 documentation pages
│   │   └── package.json
│   │
│   └── v2/                  # @toolkit/sandbox - Nuxt App
│       ├── app/
│       │   ├── components/  # 526 items
│       │   ├── composables/ # 36 composables
│       │   └── pages/       # 56 page files
│       ├── content/docs     # → symlink to /docs
│       └── package.json
│
├── packages/
│   ├── types/               # @toolkit/types - Shared TypeScript types
│   └── utils/               # @toolkit/utils - Shared utilities
│
├── tooling/
│   ├── eslint/              # Shared ESLint config
│   └── typescript/          # Base tsconfig
│
└── docs/                    # Consolidated documentation
    ├── getting-started/
    ├── architecture/
    ├── data/
    ├── components/
    ├── implementation/
    ├── planning/
    ├── research/
    └── notes/
```

---

## Key Metrics

| Metric              | v1        | v2                   |
| ------------------- | --------- | -------------------- |
| **Components**      | 928 items | 526 items            |
| **Composables**     | 11        | 36                   |
| **Pages**           | 169       | 56                   |
| **Dependencies**    | 62        | 55                   |
| **Dev Server Port** | default   | Dynamic (from graph) |
| **Package Manager** | pnpm      | pnpm                 |

---

## User Roles (v2)

| Role               | Description      | Hierarchy Level |
| ------------------ | ---------------- | --------------- |
| `super_admin`      | Super Admin      | Highest         |
| `corporate_admin`  | Corporate Admin  | 2nd             |
| `admin`            | Admin            | 3rd             |
| `facility_manager` | Facility Manager | 4th             |
| `developer`        | Developer        | 5th             |
| `guest`            | Guest (default)  | Lowest          |

---

## Related Applications

| App                    | Purpose                                | Tech Stack                 | Status             |
| ---------------------- | -------------------------------------- | -------------------------- | ------------------ |
| **ecms-redesign** (v2) | Primary sandbox for unified platform   | Nuxt 4, InstantDB, JSON-LD | Active Development |
| **ui** (v1)            | Shared component library (90+ pages)   | Vue 3                      | Production-grade   |
| **ecms** (production)  | Legacy environmental compliance        | Vue 3, Firebase, Firestore | Production         |
| **tri** (production)   | Toxic Release Inventory (EPA Form R/A) | Vue 3, Firebase, Postgres  | Production         |

---

## Documentation

All documentation is consolidated in the `/docs` directory and served via Nuxt Content in v2:

| Category            | Description                                |
| ------------------- | ------------------------------------------ |
| **getting-started** | Quick start guides and setup instructions  |
| **architecture**    | JSON-LD, graph-driven pages, system design |
| **data**            | ECMS data models, seeding, schema docs     |
| **components**      | Component library docs and usage guides    |
| **implementation**  | Formulas, theming, migrations              |
| **planning**        | Vision, roadmaps, architectural decisions  |
| **research**        | Academic papers and research               |
| **notes**           | Working notes, scratch files, devlogs      |

Access docs in the v2 app at `/docs` or browse the `/docs` directory directly.

---

## License

MIT License - see docs/LICENSE.md

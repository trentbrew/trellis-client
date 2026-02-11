/**
 * Slide Deck Seed Data
 *
 * Translates the Trellis pitch deck (docs/planning/PITCH_DECK.md) into
 * structured slide records that the SlideDeckProjection can render.
 *
 * Each slide is a DatabaseRecord-compatible object with fields matching
 * the slide-deck ontology: order, title, subtitle, body, layout, background, media, speakerNotes.
 */

export interface SlideRecord {
  id: string
  fields: {
    order: number
    title: string
    subtitle: string
    body: string
    layout: 'title' | 'section' | 'content' | 'split' | 'quote' | 'image' | 'blank'
    background: string
    media: string
    speakerNotes: string
  }
}

export const TRELLIS_PITCH_DECK_SLIDES: SlideRecord[] = [
  {
    id: 'slide-cover',
    fields: {
      order: 0,
      title: 'Trellis',
      subtitle: 'A semantic operating system for knowledge work.',
      body: '',
      layout: 'title',
      background: '',
      media: '',
      speakerNotes: 'Opening slide. Let the tagline breathe.',
    },
  },
  {
    id: 'slide-problem',
    fields: {
      order: 1,
      title: 'The Problem',
      subtitle: 'Your work is trapped in silos.',
      body: `- The average knowledge worker uses **9+ apps** daily — Notion, Linear, Asana, Figma, Slack, Google Docs...
- Data is **locked in proprietary formats** with no interoperability
- AI assistants can't reason across tools — they see pixels, not meaning
- Context switching costs **$450B/year** in lost productivity
- Collaboration requires **cloud vendors** that own your data

**The deeper issue:** Today's tools capture *what* happened — but never *why*.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'Emphasize the "why" gap. Decision traces are the key insight.',
    },
  },
  {
    id: 'slide-insight',
    fields: {
      order: 2,
      title: 'The Insight',
      subtitle: '',
      body: `"The next trillion-dollar platforms are systems of record for **decisions**, not just objects."`,
      layout: 'quote',
      background: '',
      media: '',
      speakerNotes: 'Pause here. Let the quote land. Then transition to: every app is really just Data → Transform → View.',
    },
  },
  {
    id: 'slide-intro',
    fields: {
      order: 3,
      title: 'Introducing Trellis',
      subtitle: 'NixOS for knowledge work',
      body: `| Concept | Traditional Apps | Trellis |
|---------|-----------------|---------|
| **Data** | Locked in app databases | Open JSON-LD graph you own |
| **Views** | Hard-coded screens | Declarative projections |
| **AI** | Bolted-on copilot | First-class user — NL compiles to Datalog |
| **Collaboration** | Cloud vendor required | P2P sync, offline-first |
| **Config** | Scattered settings | Single \`.trellis\` file |`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'This table is the core value prop. Walk through each row.',
    },
  },
  {
    id: 'slide-how-it-works',
    fields: {
      order: 4,
      title: 'How It Works',
      subtitle: 'Everything is a node in a graph.',
      body: `\`\`\`
.trellis config → Kernel (semantic engine) → Projections (UI)
\`\`\`

\`\`\`
Project ──contains──▸ Task
Task ──assigned_to──▸ Person
Person ──created──▸ File
File ──referenced_in──▸ Project
\`\`\`

**One schema, infinite views.** The same data renders as a card grid, a table, a timeline, a dashboard, or a force-directed graph — without writing new code.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'Emphasize the graph model and projection multiplicity.',
    },
  },
  {
    id: 'slide-entity-system',
    fields: {
      order: 5,
      title: 'The Entity System',
      subtitle: 'Four classes cover all knowledge work.',
      body: `| Class | What It Is | Examples |
|-------|-----------|----------|
| **Temporal** | Has a time span, lives on a calendar | Task, event, trip, payment, deadline, milestone |
| **Document** | Has rich content, no inherent time | Note, file, page, template |
| **Actor** | Represents a person or organization | Person, contact, organization, vendor |
| **Container** | Groups and organizes other entities | Project, folder, collection, goal |

Schema-driven — no hard-coded UI per type.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'The two-axis system: class determines chrome, type determines content panels.',
    },
  },
  {
    id: 'slide-tql',
    fields: {
      order: 6,
      title: 'TQL — The Knowledge Engine',
      subtitle: 'EAV-based Datalog with append-only persistence.',
      body: `- **Event-sourced** — every mutation is a timestamped operation in an append-only log
- **Queryable** — find patterns across files, sessions, decisions, and changes
- **Self-healing** — detects and repairs its own infrastructure failures
- **AI-native** — natural language compiles to structured queries

\`\`\`datalog
% Find all people working on projects due this week
responsible_for(Person, Project) :-
  task(Task),
  assigned_to(Task, Person),
  part_of(Task, Project),
  due_date(Project, Date),
  within(Date, this_week).
\`\`\``,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'The Datalog example shows the expressiveness of the query language.',
    },
  },
  {
    id: 'slide-context-graph',
    fields: {
      order: 7,
      title: 'Context Graph',
      subtitle: 'Decisions, not just objects.',
      body: `| What Others Capture | What Trellis Captures |
|--------------------|-----------------------|
| Ticket status changed | *Why* it changed, who approved, what precedent existed |
| File was edited | *What context* was gathered, *which policies* applied |
| Meeting happened | *Decisions made*, action items linked to their rationale |

**Decision traces** are first-class entities — linked, queryable, and precedent-aware.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'This is the differentiator. Nobody else captures the "why" graph.',
    },
  },
  {
    id: 'slide-living-docs',
    fields: {
      order: 8,
      title: 'Living Documentation',
      subtitle: 'Docs that write themselves.',
      body: `- **9 auto-generated doc modules** — Changelog, Decisions, Roadmap, Spec, Conventions, and domain-specific docs
- **Manual sections preserved** — hand-written content survives regeneration
- **Scope-aware** — glob patterns tie each doc module to the code it covers
- **Versioned with git** — docs amend into the triggering commit

A JSON-LD ontology declares what documentation should exist, and a post-commit hook regenerates only the sections affected by each change.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'This is already built and working. 100 tests passing.',
    },
  },
  {
    id: 'slide-architecture',
    fields: {
      order: 9,
      title: 'Architecture',
      subtitle: 'Five clean layers — each independently testable.',
      body: `\`\`\`mermaid
graph TD
  subgraph User["USER LAYER"]
    UI["Nuxt / Tauri"]
    VF["Vue Flow Graph"]
    DB["Dashboard"]
    PR["Projections"]
  end

  subgraph Projection["PROJECTION LAYER"]
    CG["Card Grid"]
    TBL["Table"]
    TL["Timeline"]
    KB["Kanban"]
    GR["Graph"]
  end

  subgraph Logic["LOGIC LAYER"]
    FM["Formulas"]
    RU["Rollups"]
    AI_P["AI Properties"]
  end

  subgraph Kernel["KERNEL LAYER"]
    QC["Query Compiler"]
    SV["Schema Validator"]
    AR["AI Router"]
  end

  subgraph Storage["STORAGE LAYER"]
    EAV["EAV Store"]
    SQ["SQLite"]
    OL["Append-Only Op Log"]
    P2P["P2P Sync"]
  end

  User --> Projection
  Projection --> Logic
  Logic --> Kernel
  Kernel --> Storage
\`\`\``,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'Five clean layers. Each one is independently testable. This diagram is rendered by Mermaid.js.',
    },
  },
  {
    id: 'slide-tech-stack',
    fields: {
      order: 10,
      title: 'Tech Stack',
      subtitle: '',
      body: `| Layer | Technology |
|-------|-----------|
| **Frontend** | Nuxt 3, Vue 3, TailwindCSS, shadcn/ui, Vue Flow |
| **Runtime** | Bun (hooks, scripts, CLI) |
| **Data Format** | JSON-LD (self-describing, linked-data semantics) |
| **Query Engine** | TQL — EAV Datalog with JSONL persistence |
| **Sync** | InstantDB (current), Iroh P2P (planned) |
| **Native** | Tauri (planned — 3MB binary, OS integration) |
| **AI** | Claude / OpenAI for NL queries + semantic properties |`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'All modern, all open. No vendor lock-in in the stack itself.',
    },
  },
  {
    id: 'slide-market',
    fields: {
      order: 11,
      title: 'Market Opportunity',
      subtitle: '$45B+ TAM',
      body: `| Competitor | What They Miss |
|-----------|---------------|
| **Notion** | Proprietary data, no semantic layer, AI is an add-on |
| **Linear** | Single-domain (engineering), no graph, no extensibility |
| **Obsidian** | Files, not entities — no structured queries, no collaboration |
| **Coda/Airtable** | Spreadsheet metaphor — not a semantic graph |

**Trellis sits at the intersection** of structured data, rich documents, and semantic reasoning — with AI as a first-class citizen.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'Combined TAM of project management, note-taking, and knowledge management.',
    },
  },
  {
    id: 'slide-gtm',
    fields: {
      order: 12,
      title: 'Go-to-Market',
      subtitle: '',
      body: `### Phase 1 — Developer Tool (Now)
- Open-source TQL engine + hooks system
- CLI-first workflow for teams already using git
- Living documentation as the entry point

### Phase 2 — Vertical SaaS
- ECMS (Environmental Compliance Management) as the first vertical
- Prove the "one graph, many projections" thesis in a regulated domain

### Phase 3 — Platform
- Trellis App Builder — end users define schemas, projections, and workflows
- Marketplace for ontologies and projections
- P2P sync for teams that need data sovereignty`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'Three clear phases. We are in Phase 1.',
    },
  },
  {
    id: 'slide-traction',
    fields: {
      order: 13,
      title: 'Traction & Status',
      subtitle: '',
      body: `- **Entity system** — 4 classes, 20+ types, schema-driven property fields
- **TQL kernel** — Append-only JSONL, hash-chained ops, snapshot compaction
- **Hooks pipeline** — 8 lifecycle events, self-healing, guard policies
- **Living docs** — 9 auto-generated modules, 100 tests passing
- **Dashboard** — Real-time stats, charts, and interactive widgets
- **Graph visualization** — Ontology schema visualizer with Vue Flow
- **Slide Deck projection** — You're looking at it right now.`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'The last bullet is the mic drop — this presentation IS the product.',
    },
  },
  {
    id: 'slide-ask',
    fields: {
      order: 14,
      title: 'The Ask',
      subtitle: '',
      body: `- **Use of funds:** Engineering (kernel + native app), design (projection library), first vertical pilot
- **Timeline:** V1 public beta in 6 months
- **Goal:** Prove that declarative, semantic workspaces are the future of knowledge work`,
      layout: 'content',
      background: '',
      media: '',
      speakerNotes: 'Customize this slide per audience: seed round, grant, partnership, or pilot.',
    },
  },
  {
    id: 'slide-vision',
    fields: {
      order: 15,
      title: 'The Vision',
      subtitle: '',
      body: `Same \`.trellis\` config = same workspace, anywhere.

Your work environment becomes **reproducible, auditable, and portable** — like infrastructure-as-code, but for everything you do.

**Data you own. Views that adapt. AI that understands.**`,
      layout: 'quote',
      background: '',
      media: '',
      speakerNotes: 'End with conviction. Let the tagline echo.',
    },
  },
]

/**
 * Returns the pitch deck as a JSON-LD string compatible with the
 * SlideDeckProjection's content parser.
 */
export function getTrellisPitchDeckContent(): string {
  return JSON.stringify(
    {
      '@context': {
        '@vocab': 'https://platform-sandbox.dev/ontology/slide-deck#',
      },
      '@type': 'SlideDeck',
      '@graph': TRELLIS_PITCH_DECK_SLIDES,
    },
    null,
    2,
  )
}

/**
 * Schema definition for a slide deck collection.
 * Can be used when creating a new slide-deck collection programmatically.
 */
export const SLIDE_DECK_SCHEMA_FIELDS = [
  { id: 'field-order', name: 'order', type: 'number' as const, required: true, order: 0 },
  { id: 'field-title', name: 'title', type: 'text' as const, required: false, order: 1 },
  { id: 'field-subtitle', name: 'subtitle', type: 'text' as const, required: false, order: 2 },
  { id: 'field-body', name: 'body', type: 'text' as const, required: false, order: 3 },
  {
    id: 'field-layout',
    name: 'layout',
    type: 'select' as const,
    required: true,
    order: 4,
    options: [
      { value: 'title', color: '#6366f1' },
      { value: 'section', color: '#8b5cf6' },
      { value: 'content', color: '#3b82f6' },
      { value: 'split', color: '#06b6d4' },
      { value: 'quote', color: '#f59e0b' },
      { value: 'image', color: '#10b981' },
      { value: 'blank', color: '#6b7280' },
    ],
  },
  { id: 'field-background', name: 'background', type: 'text' as const, required: false, order: 5 },
  { id: 'field-media', name: 'media', type: 'url' as const, required: false, order: 6 },
  { id: 'field-speakerNotes', name: 'speakerNotes', type: 'text' as const, required: false, order: 7 },
]

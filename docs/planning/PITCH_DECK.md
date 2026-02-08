# Trellis — Pitch Deck

> A semantic operating system for knowledge work.

---

## Slide 1: The Problem

**Your work is trapped in silos.**

- The average knowledge worker uses **9+ apps** daily — Notion, Linear, Asana, Figma, Slack, Google Docs...
- Data is **locked in proprietary formats** with no interoperability
- AI assistants can't reason across tools — they see pixels, not meaning
- Context switching costs **$450B/year** in lost productivity (Harvard Business Review)
- Collaboration requires **cloud vendors** that own your data

**The deeper issue:** Today's tools capture *what* happened (the ticket, the doc, the task) — but never *why* (the decision traces, the context, the precedent).

---

## Slide 2: The Insight

> "The next trillion-dollar platforms are systems of record for **decisions**, not just objects."
> — Gupta & Garg, *Context Graphs*

Every app is really doing one thing:

```
Data (JSON) → Transform (logic) → View (UI)
```

**What if we made this explicit?** Instead of installing apps, you define **schemas** and **projections**. Instead of files scattered across folders, you have a **unified semantic graph**.

---

## Slide 3: Introducing Trellis

**Trellis is NixOS for knowledge work** — a declarative workspace where data controls the UI, not the other way around.

| Concept | Traditional Apps | Trellis |
|---------|-----------------|---------|
| **Data** | Locked in app databases | Open JSON-LD graph you own |
| **Views** | Hard-coded screens | Declarative projections (table, kanban, timeline, graph...) |
| **AI** | Bolted-on copilot | First-class user — NL compiles to Datalog |
| **Collaboration** | Cloud vendor required | P2P sync, offline-first |
| **Config** | Scattered settings | Single `.trellis` file — reproducible, version-controlled |

---

## Slide 4: How It Works

```
.trellis config → Kernel (semantic engine) → Projections (UI)
```

**Everything is a node in a graph.** Projects, tasks, files, people, events — all queryable through one interface.

```
Project ──contains──▸ Task
Task ──assigned_to──▸ Person
Person ──created──▸ File
File ──referenced_in──▸ Project
```

**One schema, infinite views.** The same data renders as a card grid, a table, a timeline, a dashboard, or a force-directed graph — without writing new code.

---

## Slide 5: The Entity System

Four entity classes cover all knowledge work:

| Class | What It Is | Examples |
|-------|-----------|----------|
| **Temporal** | Has a time span, lives on a calendar | Task, event, trip, payment, deadline, milestone |
| **Document** | Has rich content, no inherent time | Note, file, page, template |
| **Actor** | Represents a person or organization | Person, contact, organization, vendor |
| **Container** | Groups and organizes other entities | Project, folder, collection, goal |

Each class determines structural behavior (dialog shell, properties, projections). Each **type** within a class adds domain-specific fields. Schema-driven — no hard-coded UI per type.

---

## Slide 6: TQL — The Knowledge Engine

**Trellis Query Language** is an EAV-based Datalog engine with append-only persistence.

- **Event-sourced** — every mutation is a timestamped operation in an append-only log
- **Queryable** — find patterns across files, sessions, decisions, and changes
- **Self-healing** — detects and repairs its own infrastructure failures
- **AI-native** — natural language compiles to structured queries

```datalog
% Find all people working on projects due this week
responsible_for(Person, Project) :-
  task(Task),
  assigned_to(Task, Person),
  part_of(Task, Project),
  due_date(Project, Date),
  within(Date, this_week).
```

---

## Slide 7: Context Graph — Decisions, Not Just Objects

Trellis captures **why**, not just **what**:

| What Others Capture | What Trellis Captures |
|--------------------|-----------------------|
| Ticket status changed | *Why* it changed, who approved, what precedent existed |
| File was edited | *What context* was gathered, *which policies* applied |
| Meeting happened | *Decisions made*, action items linked to their rationale |

**Decision traces** are first-class entities — linked, queryable, and precedent-aware. The system *learns* from its own patterns.

---

## Slide 8: Living Documentation

Docs that write themselves. A JSON-LD ontology declares what documentation should exist, and a post-commit hook regenerates only the sections affected by each change.

- **9 auto-generated doc modules** — Changelog, Decisions, Roadmap, Spec, Conventions, and domain-specific docs
- **Manual sections preserved** — hand-written content survives regeneration
- **Scope-aware** — glob patterns tie each doc module to the code it covers
- **Versioned with git** — docs amend into the triggering commit

---

## Slide 9: Architecture

```
┌─────────────────────────────────────────────────┐
│  USER LAYER — Nuxt/Tauri (web + native)         │
│  └─ Vue Flow graph · Dashboard · Projections    │
├─────────────────────────────────────────────────┤
│  PROJECTION LAYER — Declarative views           │
│  Card Grid · Table · Timeline · Kanban · Graph  │
├─────────────────────────────────────────────────┤
│  LOGIC LAYER — Formulas, rollups, AI properties │
├─────────────────────────────────────────────────┤
│  KERNEL LAYER — TQL semantic engine             │
│  Query compiler · Schema validator · AI router  │
├─────────────────────────────────────────────────┤
│  STORAGE LAYER — Local-first persistence        │
│  EAV store · SQLite · Append-only op log · P2P  │
└─────────────────────────────────────────────────┘
```

---

## Slide 10: Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Nuxt 3, Vue 3, TailwindCSS, shadcn/ui, Vue Flow |
| **Runtime** | Bun (hooks, scripts, CLI) |
| **Data Format** | JSON-LD (self-describing, linked-data semantics) |
| **Query Engine** | TQL — EAV Datalog with JSONL persistence |
| **Sync** | InstantDB (current), Iroh P2P (planned) |
| **Native** | Tauri (planned — 3MB binary, OS integration) |
| **AI** | Claude / OpenAI for NL queries + semantic properties |

---

## Slide 11: Market Opportunity

**$45B+** — Combined TAM of project management, note-taking, and knowledge management tools.

| Competitor | What They Miss |
|-----------|---------------|
| **Notion** | Proprietary data, no semantic layer, AI is an add-on |
| **Linear** | Single-domain (engineering), no graph, no extensibility |
| **Obsidian** | Files, not entities — no structured queries, no collaboration |
| **Coda/Airtable** | Spreadsheet metaphor — not a semantic graph |

**Trellis sits at the intersection** of structured data (Airtable), rich documents (Notion), and semantic reasoning (knowledge graphs) — with AI as a first-class citizen, not a bolt-on.

---

## Slide 12: Go-to-Market

### Phase 1 — Developer Tool (Now)
- Open-source TQL engine + hooks system
- CLI-first workflow for teams already using git
- Living documentation as the entry point

### Phase 2 — Vertical SaaS
- ECMS (Environmental Compliance Management) as the first vertical
- Facility task management, compliance tracking, permit workflows
- Prove the "one graph, many projections" thesis in a regulated domain

### Phase 3 — Platform
- Trellis App Builder — end users define schemas, projections, and workflows
- Marketplace for ontologies and projections
- P2P sync for teams that need data sovereignty

---

## Slide 13: Traction & Status

- **Entity system** — 4 classes, 20+ types, schema-driven property fields
- **TQL kernel** — Append-only JSONL, hash-chained ops, snapshot compaction
- **Hooks pipeline** — 8 lifecycle events, self-healing, guard policies
- **Living docs** — 9 auto-generated modules, 100 tests passing
- **Dashboard** — Real-time stats, charts, and interactive widgets
- **Graph visualization** — Ontology schema visualizer with Vue Flow

---

## Slide 14: The Ask

**[Customize: Seed round / Grant / Partnership / Pilot customer]**

- **Use of funds:** Engineering (kernel + native app), design (projection library), first vertical pilot
- **Timeline:** V1 public beta in [X] months
- **Goal:** Prove that declarative, semantic workspaces are the future of knowledge work

---

## Slide 15: The Vision

> Same `.trellis` config = same workspace, anywhere.

Your work environment becomes **reproducible, auditable, and portable** — like infrastructure-as-code, but for everything you do.

**Data you own. Views that adapt. AI that understands.**

---

*trellis.dev*

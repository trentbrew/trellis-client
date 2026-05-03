# Trellis — Vision

> _"The semantic web was right. Just at the wrong scale."_

---

## 30-Second Version

Trellis is a personal-scale semantic graph. Every piece of information you own — tasks, notes, people, files, events, bookmarks — is a **node**. The relationships between them are **edges**. A local AI can query, reason over, and explain the whole thing. Your data stays yours, structured by you, readable by machines.

This is the unfinished business of the semantic web, made practical at the only scale where coordination is tractable: **one person, one evolving ontology, one system that knows what you mean**.

---

## The Thesis

The fragmentation of personal computing — tasks in one app, notes in another, people in a third — is not a workflow problem. It is a data model problem. Trellis solves it by treating everything as a unified graph: **files as persistence, graph as index, views as queries rendered**.

When the data model _is_ the product, the frontend and backend become indistinguishable. There is no translation layer. There is no impedance mismatch. There is only the graph, and views over it.

---

## First Principles

### 1. Everything is a node

Files, blocks, entities, projections, agent actions, relationships — all nodes. There is no "files vs. database" distinction. The uniform model is not a constraint; it is the source of simplicity.

> _Test: Can this be represented as a TQL entity with typed properties and edges? If yes, it belongs in the graph._

### 2. The editor is the substrate

The rich text editor is not a feature of notes. It is the universal body for **all** entity types. Every entity — task, project, person, budget — has the same structure: properties + editor canvas. The canvas hosts blocks. Blocks are nodes. Tables are layout primitives. Table cells contain blocks. Projection blocks are live graph queries rendered inline.

A dashboard is a document. A slide deck is a document. A template is a document. The editor is the app.

> _Test: Does this require a bespoke UI surface, or can it be expressed as an editor block?_

### 3. Views are queries

Every visual representation — list, table, calendar, kanban, gantt, graph — is a query over the same underlying data. Switching views does not move data; it re-renders the same graph through a different lens. Infinite nesting is possible because every projection block is itself a query, composable with any other.

> _Test: Is this a new data structure, or a new rendering of existing structure?_

### 4. Emergent schema

Structure is discovered through use, not imposed upfront. Ontologies grow from what is actually in the graph. The system must accommodate free-form entry that progressively formalizes — not rigid schema that must be satisfied before data can exist.

> _Test: Can a user start with no schema and arrive at useful structure through natural use?_

### 5. Inspectable reasoning

When the AI acts, its actions are graph facts — not black-box outputs. "Why did it do that?" is answered by traversing the graph, not by reading a narrative. Agent mutations appear in the same SSE stream as human mutations. The audit trail is the data layer.

> _Test: Can a user contest, correct, or extend any AI-produced output by editing data?_

### 6. Ownership by construction

Backup is copying a folder. Migration is exporting files. Interoperability is possible because the data is in open formats (JSON-LD, JSONL). Local-first is not a feature toggle — it is the architectural default. Cloud sync is additive, not foundational.

> _Test: If the cloud disappeared, would the user still own and control their data?_

---

## The Product Pattern

Turtlestack — the platform layer beneath Trellis — describes three modes of interaction with the graph:

| Mode            | What it is                                                            | Trellis expression                             |
| --------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| **World**       | End-user interaction: browse, ask, compose                            | Entity dialogs, projections, editor, feed      |
| **Forge**       | Structure-making: define ontologies, build templates, publish schemas | Database route, ontology CRUD, template blocks |
| **Observatory** | Provenance inspection: audit trail, graph health, agent reasoning     | Graph explorer, mutation log, activity sidebar |

Every feature belongs to one of these modes. Features that blur all three simultaneously are a design smell.

---

## The Decision Filter

Before any major implementation decision, ask:

1. **Does this move toward "everything is a node," or away from it?**
   Bespoke systems (the grid dashboard builder, per-type content panels) move away. Generalizing through blocks and projections moves toward.

2. **Does this make the AI more inspectable, or less?**
   Features that surface graph traversals, link AI actions to entity mutations, or show provenance increase trust. Features that hide reasoning in opaque outputs erode it.

3. **Does this preserve ownership, or compromise it?**
   Local-first defaults, open formats, no required accounts — these preserve it. Proprietary storage, mandatory cloud sync, lock-in patterns — these compromise it.

---

## What Trellis Is Not

- **Not a productivity app** that happens to have a graph underneath. The graph is the point.
- **Not a Notion clone**. Notion's blocks are content. Trellis's blocks are _queries_. The difference is everything.
- **Not an AI assistant** that answers questions. An AI system that makes its reasoning auditable.
- **Not schema-first**. Ontologies emerge from data, not the reverse.
- **Not cloud-dependent**. Local runs fully. Cloud is optional federation.

---

## The Thread

Tim Berners-Lee's semantic web (2001) envisioned data with meaning, linked by identifiers, queryable by machines. It failed at the global scale because it required coordination that no single actor could impose.

Trellis is the personal-scale answer: one user, one evolving ontology, linked data that derives meaning locally before selectively sharing. The coordination problem shrinks from "the entire internet" to "one person's life." At that scale, it is not only tractable — it is natural.

Every table cell that contains a live projection of related entities IS a SPARQL query rendered inline. The difference is that it is actually usable by a person who has never heard of SPARQL.

That is the vision. Every implementation decision should serve it.

---

_Source: `docs/research/` — the Filegraph paper this system was built from._

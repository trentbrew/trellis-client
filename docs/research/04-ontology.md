# 4. Ontology Design

Filegraph’s ontology is not an academic exercise; it is the contract that makes three things work at once:

- The vault stays **file-native** and human-editable.
- The graph stays **queryable** as a small set of composable primitives.
- The agent stays **inspectable**, because its reasoning can be expressed as explicit traversals over named predicates.

In this paper, “ontology” includes:

- **Identity conventions** (how we name files and entities)
- **Type vocabulary** (what kinds of nodes exist)
- **Predicate vocabulary** (what relationships we store and query)
- **Bridging rules** (how external schemas map into the local graph)

## 4.1 Design principles

Filegraph’s ontology is guided by four constraints.

- **Minimal core**: a small number of stable node types and predicates that everything else composes from.
- **Bridge to standards**: align with widely-used vocabularies (e.g., schema.org) where it improves interoperability.
- **Extensible by users**: allow new domains (finance, calendar, inbox, custom collections) without changing the core runtime.
- **Pragmatic over complete**: prefer conventions that are easy to maintain in plain files over maximal expressiveness.

 <!-- TABLE IDEA: “Ontology principles” table (principle → what it means in practice → tradeoff). -->

## 4.2 Core ontology

### 4.2.1 Identity: two ID systems on purpose

Filegraph intentionally uses two identity schemes:

- **Filesystem entities** get stable opaque IDs (e.g., `file:<uuid>`). Files need stable identity across renames and moves.
- **Domain entities** (people, projects, tasks, etc.) use human-readable IDs of the form `namespace:slug:index` (e.g., `person:sarah:001`). These IDs are designed to be:
  - readable in prose
  - safe to type
  - stable across refactors
  - parseable by tooling

This is a “pragmatic compromise” between global IRIs and local ergonomics: we treat `person:sarah:001` as the canonical identifier inside the vault, while still leaving a clean path to JSON-LD export.

```mermaid
flowchart LR
  P[Filesystem path\n@notes/weekly.note\n(or any file)] --> F[file:<uuid>\nopaque, stable across rename]
  D[Domain record in .data\n@entities/people.data] --> E[person:sarah:001\nhuman-readable, stable in prose]
  F -->|ref:mentions / fs:contains| F2[Graph edges]
  E -->|data:references / ref:links| F2
```

### 4.2.2 Namespace registry as single source of truth

A key lesson from early prototypes was that ontology is not just predicates; it also includes **where entities live**.

Filegraph maintains a namespace registry mapping each entity ID prefix to its canonical file location. For example:

- `person:*` lives in `@entities/people.data`
- `proj:*` lives in `@entities/projects.data`
- `acc:*` lives in `@finance/accounts.data`

This design (formalized in RFC-002) provides:

- **Single source of truth per entity type**
- A deterministic answer to “where should this entity be created?”
- Faster resolution for links and backlinks

```mermaid
flowchart TD
  A[Entity reference\n"proj:website-redesign:001"] --> B[extractNamespace()\n"proj"]
  B --> C[NAMESPACE_FILES\nproj → @entities/projects.data]
  C --> D[Read source file\n@entities/projects.data]
  D --> E[Locate item by id\nproj:website-redesign:001]
```

 <!-- FIGURE IDEA: Screenshot of the namespace registry source (`src/lib/namespaces.ts`) highlighting the single-source-of-truth mapping. -->

### 4.2.3 Core node types

At the conceptual level, Filegraph treats everything as a node. A minimal “type lattice” looks like:

```turtle
@prefix fg: <https://filegraph.dev/ontology#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

fg:Node
fg:File        rdfs:subClassOf fg:Node .
fg:Directory   rdfs:subClassOf fg:Node .
fg:Entity      rdfs:subClassOf fg:Node .
fg:Agent       rdfs:subClassOf fg:Node .
fg:Memory      rdfs:subClassOf fg:Node .
fg:Query       rdfs:subClassOf fg:Node .
```

In the current implementation, these types are often implicit (e.g., inferred from a file extension, vault location, or entity namespace). The key is that the runtime only needs a small number of stable distinctions:

- “is this a file/folder?”
- “is this an entity with a stable ID?”
- “is this derived state?”

### 4.2.4 Core predicates

The core predicate set is intentionally small, and biased toward what must be queryable and explainable.

 <!-- TABLE IDEA: Core predicate glossary (predicate → definition → example triple → who produces it (filesystem/parser/AI/user)). -->

### Filesystem predicates

- `fs:contains` — directory containment edges (folder → child)
- `fg:path` — absolute or vault-relative path

These enable a graph view over the filesystem without requiring any content parsing.

### Reference predicates (universal linking)

Filegraph’s linking system treats references as first-class edges derived from file content:

- `ref:links` — explicit links (e.g., wikilinks like `[[...]]`)
- `ref:mentions` — weaker mentions (e.g., backtick entity mentions)
- `data:references` — references found inside structured `.data` files

This taxonomy matters because it preserves intent: a link created explicitly in prose is different from a reference discovered in a JSON field.

### Provenance and synthesis predicates

To make AI-generated structure inspectable, the ontology needs to model provenance:

- `fg:derivedFrom` — derived fact → source artifact (file, message, tool call)
- `fg:observedBy` — which agent asserted a derived fact
- `fg:confidence` — confidence score for synthesized edges (0–1)

### Attention and UX predicates

Some predicates exist primarily to support a “knowledge OS” experience:

- `fg:lastAccessed`
- `fg:accessCount`
- `fg:inWorkspace`
- `fg:pinned`

These are not “semantic web” concerns, but they are essential if the graph is also a user interface substrate.

## 4.3 Bridging strategy

The core challenge of interoperability is that different sources describe the same concept with different predicates.

- Email systems might use “sender” and “recipient”.
- Calendar systems use “organizer”, “attendee”.
- Project tools use “assignee”, “owner”, “lead”.

Filegraph’s strategy is:

- Store extracted entities in a local, ergonomic form (e.g., `person:*`, `proj:*`).
- Map external schemas to a small stable set of graph predicates.
- Preserve source-specific detail as needed, but keep the primary query surface small.

Concretely, this can be represented as JSON-LD contexts or mapping tables that translate external fields into Filegraph predicates.

 <!-- FIGURE IDEA: A concrete “mapping table” visual (email/calendar/task fields → fg:* predicates) for readers who prefer tabular representations to JSON. -->

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "fg": "https://filegraph.dev/ontology#",
    "sender": { "@id": "schema:sender", "fg:mapsTo": "fg:mentions" },
    "assignee": { "@id": "schema:assignee", "fg:mapsTo": "fg:relatedTo" }
  }
}
```

The important point is architectural: mapping exists so that the graph can remain **query-stable** even when upstream data sources change.

## 4.4 What we would change

A few ontology lessons surfaced quickly in practice:

- The initial “generic” ontology was too vague; real usage benefits from more domain-specific predicates (finance and calendar especially).
- Confidence scoring needs calibration and decay policies; otherwise the graph accumulates “zombie edges” that look true but are stale.
- Provenance should be more granular than “this came from a file”; we often want “this came from line N” or “this was asserted by tool call X.”
- Ontology evolution needs a first-class story: deprecations, migrations, and versioning for predicates and entity schemas.

A few alternative ontology directions are also worth calling out. These are not “missed features” so much as different bets we could make in a next iteration:

- **IRI-first (JSON-LD-native) identifiers**: represent every node as a full IRI (`fg:person:sarah:001`, `fg:file:<uuid>`) and treat human-readable IDs as display aliases. This increases interoperability and reduces impedance when exporting to RDF, at the cost of ergonomics.
- **Per-entity files instead of per-type collections**: store each entity as its own file (e.g., `@entities/person:sarah:001.data`) and let collections be derived indexes. This improves merge behavior and provenance locality, but increases file counts and requires stronger indexing discipline.
- **Schema-first property typing**: define property types explicitly (string/number/date/ref/list) and enforce them at write time. This makes queries and UI rendering more reliable, but reduces the “emergent schema” feel unless the system supports gradual typing.
- **Named graphs / statement-level provenance**: model provenance as first-class structure (e.g., statement objects or RDF-star style annotations) so every derived fact can carry `source`, `agent`, `timestamp`, and `confidence`. This makes the agent more inspectable, but introduces a more complex data model.
- **Split “reference links” from “semantic relations” more aggressively**: keep `ref:*` purely as “textual reference edges,” and move domain meaning into explicit predicates (e.g., `proj:lead`, `task:assignee`) with clear schemas. This can reduce ontology drift, but demands better tooling for users to author relations.

---

## References (placeholder)

- schema.org vocabulary. [TODO]
- JSON-LD 1.1 specification. [TODO]
- RDF 1.1 Concepts and Abstract Syntax. [TODO]

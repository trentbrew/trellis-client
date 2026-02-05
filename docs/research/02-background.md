# 2\. Background & Related Work

This section surveys the existing ideas Filegraph builds on—knowledge graphs, semantic web standards, declarative query systems, local-first storage, and AI tooling—and clarifies what is missing when you try to combine them into a personal-scale system.

## 2.1 Knowledge graphs

“Knowledge graph” is an overloaded term. In enterprise settings it typically means a graph database populated with entities and relationships, often used for search, recommendations, or data integration. In personal knowledge tooling it often means a graph-shaped view over documents and links.

In practice, most systems land in one of these buckets:

- **Enterprise graph databases**: Neo4j, Amazon Neptune, TigerGraph, JanusGraph. These excel at large-scale traversal and analytics, but they are operationally heavyweight and typically assume a server + centralized database model.
- **Knowledge bases / public graphs**: Wikidata, DBpedia, Google Knowledge Graph. These succeed because they centralize data and can enforce curation workflows.
- **Personal knowledge tools**: Roam Research, Obsidian, Logseq. These popularized “backlinks” and graph navigation, but their underlying model is usually document-centric (notes as the primitive) rather than fact-centric (triples as the primitive).

<!-- TABLE IDEA: Comparison matrix of representative systems (Neo4j/Neptune vs Obsidian/Logseq vs Wikidata) along axes: deployment, source-of-truth, identity, query surface, interoperability, typical scale. -->

<!-- CITATION NEEDED: Reference a survey or comparison of knowledge graph systems -->

Filegraph’s core claim is not that graphs are new; it is that **the missing substrate for personal computing is a graph that is (a) local-first, (b) derived from files, and (c) queryable as structured**

**facts, not just documents**.

## 2.2 Semantic web technologies

The semantic web produced two ideas that remain extremely useful:

- **Triples as a universal representation**: (subject, predicate, object) facts provide a compact “assembly language” for meaning.
- **Shared vocabularies and identifiers**: IRIs (and the linked data mindset) provide interoperability across domains.

However, the ecosystem also accumulated complexity that makes it unfriendly for product builders:

- **RDF tooling friction**: historically centered around RDF/XML and specialized stores.
- **SPARQL’s ergonomics**: powerful, but verbose and difficult to embed as an everyday query surface.
- **Ontology coordination**: global coordination is hard; even within a single organization, schema churn is constant.

<!-- FIGURE IDEA: One small “stack” illustration of the semantic web toolchain (RDF/OWL/SPARQL + triple stores) vs a pragmatic product-builder stack (JSON/TypeScript + Datalog-ish queries). -->

<!-- CITATION NEEDED: Reference a critique of the semantic web’s complexity or a proposal for simplification -->

Filegraph keeps the parts that compose well with software engineering:

- **JSON-LD as a pragmatic interchange**: close to normal JSON, but with a path to RDF/linked data when needed.
- **A small core ontology** (`fg:`) that can map onto existing vocabularies like schema.org.

And it intentionally avoids semantic-web ambitions that are not needed for the prototype:

- **Full OWL reasoning** (and the complexity it brings).
- **Global publish-and-consume linked data** as a requirement.

The working hypothesis is that linked data is more viable when the coordination problem is local: **one user, one vault, one evolving ontology**.

## 2.3 Datalog and declarative queries

Filegraph’s query layer is inspired by Datalog systems that treat data as immutable facts and queries as declarative patterns.

Several systems demonstrate why this model works:

- **Datomic**: popularized immutable facts, “time travel” queries, and a Datalog query surface suitable for application developers. It is influential, but proprietary and server-oriented.
- **DataScript**: brought a Datomic-style model into the browser, showing that Datalog queries can feel like a normal app primitive.
- **XTDB**: explored bitemporal data and document + Datalog hybrids.
- **Soufflé**: demonstrated that Datalog can be compiled into fast execution plans, but is aimed more at static analysis and research pipelines than interactive application UX.

<!-- SIDEBAR IDEA: A tiny “Datalog in practice” callout with a 6–10 line example query and the shape of the returned bindings. -->

<!-- CITATION NEEDED: Reference a survey or comparison of Datalog systems -->

Filegraph borrows the core affordances:

- **Facts as the unit of computation** (EAV / triples).
- **Pattern-matching queries** that compose into joins.
- **Incremental / subscription-style evaluation** as the long-term goal.

The gap it targets is practical: most Datalog systems are either:

- **Not TypeScript-native**, making it awkward to integrate into modern web UIs.
- **Not designed for filesystem-derived data**, where updates arrive as file events and the “database” is a directory.

## 2.4 Local-first software

Local-first software argues that users should own their data, apps should work offline, and synchronization should be an implementation detail rather than a dependency.

The modern local-first toolbox includes:

- **CRDT frameworks**: Automerge, Yjs, and related approaches that support merge without central coordination.
- **SQLite as an application file format**: a de facto standard for “database-as-a-file.”
- **Sync layers for relational data**: cr-sqlite, ElectricSQL, and similar systems that treat SQL as the storage/query substrate.

A tempting alternative is to treat spreadsheets and CSV as the “universal database.” CSV is wonderfully portable, but it is a poor substrate for semantic relationships:

- It has **no stable identifiers** or referential integrity; relationships degrade into “stringly-typed” conventions.
- It has **no native types** (beyond strings) and no principled way to represent nested or multi-valued fields.
- It pushes you toward **denormalization** and duplication, which makes provenance and updates brittle.
- It turns merges and evolution into folklore: rename a column, reorder rows, or change a delimiter and you silently break downstream meaning.

Filegraph aligns strongly with the local-first ethos, but diverges on the query substrate:

- SQL is excellent for tables, but awkward for graph traversal as a first-class interaction.
- A graph-oriented query layer makes backlink-style navigation, provenance inspection, and relationship queries feel native.

In other words: **Filegraph is “local-first” not just in storage, but in the mental model**. The user’s vault is the canonical artifact; everything else is derived.

## 2.5 AI and structured data

Contemporary AI tooling makes it tempting to treat “RAG” as the universal answer: embed documents, retrieve chunks, and let an LLM summarize. This works well for many tasks, but it has structural limitations:

- **RAG retrieves text, not relationships**. It can answer “what does this document say,” but struggles to build durable, queryable structure across many documents.
- **Function calling enables tool use, but not memory by default**. Tools are invoked for a single response; without a structured substrate, the system forgets what it learned.

In parallel, there is growing interest in combining LLMs with knowledge graphs. Much of that work is enterprise-focused (data catalogs, customer graphs, compliance), and typically assumes a centralized database.

Filegraph’s approach is to make the graph the stable substrate, and use AI for what it is now uniquely good at:

- **Extraction**: turning messy text and files into candidate facts.
- **Resolution**: mapping ambiguous mentions (“Tyler”, “Atlas”) onto stable entity IDs.
- **Planning**: translating natural language questions into structured graph queries.

The key product-level difference is inspectability: in Filegraph, the agent’s “reasoning” is not just a text explanation; it can be represented as **explicit tool calls and graph traversals**.

## 2.6 Positioning

Filegraph sits at the intersection of four mature ideas:

- **Files as the persistence layer** (user ownership, interoperability, git-friendly workflows)
- **Triples / EAV as the internal representation** (compact, flexible facts)
- **Datalog-inspired querying** (declarative traversal and composition)
- **AI as an extractor and query planner** (turning unstructured files into structured, inspectable operations)

```mermaid
flowchart TB A[Files\npersistence + ownership] --> FG[Filegraph\npersonal-scale semantic graph] B[Triples / EAV\nfacts + links] --> FG C[Datalog-style queries\ncomposable traversal] --> FG D[AI tool use\nextraction + planning] --> FG
```

<!-- FIGURE IDEA: Replace/augment this positioning with a 2×2 quadrant or Venn-style illustration for blog/paper layouts where Mermaid is not ideal. -->

<!-- CITATION NEEDED: Reference a positioning or comparison of Filegraph with adjacent tools -->

Compared to adjacent tools:

- **Versus note-first graph tools (Obsidian/Logseq/Roam)**: Filegraph treats documents as just one node type among many; the primary abstraction is facts + links, not pages.
- **Versus graph databases (Neo4j/Neptune)**: Filegraph is local-first and file-native, and it treats the filesystem as the canonical store rather than a database as the source of truth.
- **Versus RAG-first “chat over your docs” systems**: Filegraph aims for durable structure and inspectable reasoning, not just better retrieval.

The hypothesis of this paper is that the semantic web’s vision becomes practical when:

- The coordination problem is local (a single user’s vault).
- The representation is pragmatic (JSON-LD-shaped data in plain files).
- The query interface is developer-friendly (Datalog-like patterns, not SPARQL-first).
- AI is used as a structure extractor and planner, with outputs that can be audited.

---

## References (placeholder)

- Tim Berners-Lee et al., “The Semantic Web” (Scientific American, 2001). \[TODO\]
- RDF / JSON-LD specifications. \[TODO\]
- SPARQL specification. \[TODO\]
- Datomic documentation / papers on immutable facts and Datalog query. \[TODO\]
- DataScript project. \[TODO\]
- XTDB project. \[TODO\]
- Automerge and Yjs (CRDT frameworks). \[TODO\]
- cr-sqlite, ElectricSQL (local-first relational sync). \[TODO\]
- Wikidata / DBpedia (public knowledge graphs). \[TODO\]
- Neo4j / Amazon Neptune (graph databases). \[TODO\]

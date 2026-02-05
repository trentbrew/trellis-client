# 6. Evaluation

This section evaluates Filegraph as implemented today. The goal is not to claim production readiness, but to report what the prototype concretely validates, what surprised us in practice, and what remains unresolved.

We structure the evaluation around the five thesis claims stated in Section 1.

<!-- TABLE IDEA: “Thesis claim → Evidence → Current status → Next validation” summary table (fits well right after this intro). -->

## 6.1 What we validated (mapped to the thesis claims)

### Claim 1: Filesystem-backed semantic graphs are viable at personal scale

We validated that indexing a vault directory into a stable graph representation is mechanically reliable:

- The system can scan a vault, assign stable file IDs, and materialize a usable EAV graph.
- Derived artifacts can be re-generated from files, and the system can avoid obvious “indexing eats its own tail” feedback loops.

Evidence (prototype-level):

- The benchmark harness (`pnpm bench:tql`) provides reproducible scan-time instrumentation.
- The demo vault benchmark snapshot in Section 5.5 is best interpreted as an instrumentation sanity-check.

Limits:

- The next meaningful validation target is a real personal vault (order-of-magnitude ~10k files / ~50k derived facts), where incremental update behavior, memory footprint, and query latencies become the dominant constraints.

### Claim 2: AI can reliably extract structure from unstructured data

We validated that the “AI extraction → graph facts” loop is a viable interaction model:

- The agent can be constrained to operate through explicit tools.
- Extracted structure can be persisted as facts/links in a way that is inspectable and editable.

Limits:

- “Reliably” is currently bounded by:
  - prompt/ontology clarity,
  - entity resolution and identity drift,
  - and lack of statement-level provenance for every derived fact.

### Claim 3: Datalog-style queries provide the right abstraction for traversal

We validated the utility of declarative, pattern-based graph access even when implemented with simple primitives:

- Many user questions reduce to a small set of graph operations (e.g., backlinks, neighbors, attribute filters).
- A thin EAV substrate supports multiple UI projections without bespoke per-feature state.

Limits:

- The prototype does not yet provide a polished human-facing query language, query optimization, or incremental evaluation.
- As graphs grow, the lack of indexes and planning infrastructure becomes a central bottleneck.

### Claim 4: Inspectable AI reasoning builds trust through transparency

We validated that tool-mediated reasoning creates an “evidence surface” that is fundamentally different from black-box chat:

- The system can show which tool was invoked, the exact arguments, and the structured result.
- This makes the agent’s behavior debuggable and, importantly, contestable.

Evidence:

- The concrete `query_graph` example in Section 5.3.4 demonstrates the inspectability contract.

Limits:

- True auditability depends on provenance: without consistent statement-level traceability (what source produced which fact, when, and by which derivation), the trust surface is still incomplete.

### Claim 5: File-native persistence enables ownership, interoperability, and simplicity

We validated the ergonomic upside of “files as the source of truth”:

- Backups and portability are straightforward.
- Derived artifacts living in the vault make the system easier to reason about and inspect.

Limits:

- File-native persistence alone does not solve:
  - collaboration/sync,
  - permission boundaries,
  - or schema migration/ontology evolution.

## 6.2 What surprised us (emergent insights)

A few insights were only obvious after building and using the prototype:

- Natural language + search-style interactions are often preferred over graph visualization for day-to-day work.
- Treating “everything as a node” (files, entities, and even agent actions) simplifies the mental model and the implementation.
- File-native persistence is not just a storage choice; it becomes a product feature (inspectability, ownership, portability).
- Embeddings appear more immediately useful for retrieval/search than for hard identity resolution.
- The agent’s memory being queryable (as data, not just chat history) is more powerful than expected for debugging and iteration.

<!-- FIGURE IDEA: A single annotated screenshot of the “inspectable reasoning” UI used during testing, paired with one short anecdote. -->

## 6.3 Open questions

These are the hard problems we have not solved in the prototype.

### 6.3.1 Provenance and derived-fact auditability

- How should every derived fact be traced back to sources, timestamps, and derivation steps?
- What is the right UX for inspecting, disputing, and editing derived structure?

### 6.3.2 Versioning, epochs, and temporal queries

- The prototype can rebuild the graph, but does not yet provide robust time-travel semantics.
- What should the model be for “the graph as of time T,” and how should users branch/rollback?

### 6.3.3 Ontology evolution and migration

- Adding new predicates/types is easy.
- Changing them safely requires a migration story, deprecation warnings, and compatibility affordances.

### 6.3.4 Collaboration and sync

- The system works as a single-user local-first prototype.
- Multi-user collaboration implies CRDT-style conflict resolution and careful merge semantics for graph artifacts.

### 6.3.5 Permissions and capability boundaries

- Graph traversal permissions are subtle (if A links to B, do you implicitly gain access to B?).
- This becomes central for any multi-tenant or shared-vault model.

### 6.3.6 Embedding drift and reproducibility

- Re-embedding with a different model changes similarity edges and can change results.
- What should be versioned, and how do we preserve reproducibility across epochs?

## 6.4 Early user feedback (informal)

We have collected early feedback during informal testing. Before publication, these should be replaced with dated, attributable notes (or an anonymized summary) gathered under a consistent study protocol.

<!-- LAYOUT IDEA: Render 2–3 quotes as pullquotes/callouts with a short label (role/context) to break up the text visually. -->

- [TODO: Insert verbatim quote] Users valued that the system “understands” notes beyond backlinks.
- [TODO: Insert verbatim quote] Users reacted strongly to the ability to ask “why?” and see tool outputs.
- [TODO: Insert verbatim quote] Users liked that the system is “just files” and inspectable with normal tools.
- [TODO: Insert verbatim quote] Some users found graph visualization less useful than expected.
- [TODO: Insert verbatim quote] Users asked for broader ingestion (e.g., email/calendar) once the core loop is present.

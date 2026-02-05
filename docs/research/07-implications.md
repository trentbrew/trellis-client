# 7. Implications & future work

This section sketches what Filegraph’s prototype implies beyond the immediate implementation: for AI-native applications, for personal computing, for the semantic web, and for Turtlestack as a generalized platform.

## 7.1 Implications for AI-native applications

### 7.1.1 From “chatbots” to tool-using systems with inspectable evidence

The prototype suggests a pragmatic pattern for AI-native software: constrain models to operate through explicit tools that produce structured outputs, then treat those outputs as first-class objects in the product.

In Filegraph, this yields an important inversion:

- Instead of “the model answered, trust it,” the system can show the exact query/tool calls the model executed.
- “Why did you do that?” becomes a question answerable by graph inspection, not post-hoc narrative.

This approach does not make an AI system correct by default, but it makes it debuggable. It creates a new affordance: users can contest the evidence rather than argue about the wording of an answer.

<!-- FIGURE IDEA: Screenshot of an agent tool-call trace (call → JSON args → JSON result) with a one-line caption (“evidence, not vibes”). -->

### 7.1.2 Memory as data, not as a prompt

A recurrent limitation in agent systems is that their “memory” is either:

- implicit (hidden inside model weights),
- ephemeral (in the chat transcript),
- or approximate (vector retrieval over text chunks).

Filegraph’s framing treats memory as queryable structure: facts and links with stable identifiers. This implies:

- agent behavior can be inspected and corrected by editing data, not by re-prompting indefinitely,
- and multiple tools (UI views, queries, rules, agent loops) can share the same substrate.

### 7.1.3 Practical safety: constraining capability boundaries

Tool mediation provides a natural surface for capability boundaries:

- Tools define what the model is allowed to do.
- Structured results define what the model is allowed to claim as “evidence.”

This is a product-level safety primitive: it does not solve alignment, but it reduces the degrees of freedom available to a model in a concrete software system.

## 7.2 Implications for personal computing

### 7.2.1 A personal vault as a semantic substrate

At a personal scale, the filesystem is already the universal persistence layer. The missing layer is not storage, but semantic organization:

- folders are good for containment,
- but they are not good for expressing relationships.

Filegraph suggests a model in which:

- files remain the canonical artifacts,
- and the graph is a materialized index that makes relationships queryable.

This pushes personal computing toward a new default interaction:

- not “find the file,”
- but “ask the system a question about your data, and inspect the evidence.”

### 7.2.2 Ownership and interoperability as defaults

File-native persistence has a second-order implication: the system can be designed for user ownership by construction.

- Backup is copying a folder.
- Migration is exporting files.
- Interop is possible because artifacts are inspectable and representable in standard formats.

The prototype does not yet implement full interchange (e.g., JSON-LD export/import as a polished feature), but the architecture creates a plausible path where interoperability is not an afterthought.

## 7.3 Implications for the semantic web (“right vision, wrong scale”)

Filegraph supports a specific interpretation of the semantic web’s history:

- The semantic web’s core vision (data with explicit meaning, linked by identifiers, queryable by machines) appears correct.
- Its failure mode was largely sociotechnical: global coordination, schema agreement, and heavyweight tooling.

A personal-scale semantic graph changes the coordination problem:

- one user,
- one evolving ontology,
- one set of tools.

Interoperability can then be additive rather than foundational:

- adopt shared vocabularies where they help (schema.org, Dublin Core),
- translate when needed,
- federate only when desired.

In other words: linked data may be viable when the “publish to the world” requirement is replaced with “derive meaning locally, then selectively share.”

## 7.4 Turtlestack (platform extraction)

Filegraph is a product-shaped prototype. Turtlestack is the platform-shaped extraction: the minimum general runtime that enables others to build the same class of system.

<!-- FIGURE IDEA: A clean block diagram (non-Mermaid) of the Turtlestack stack (storage/graph engine/query/provenance/tools/UI) for publication layouts. -->
<!-- TABLE IDEA: Comparison table: Filegraph (product) vs Turtlestack (platform) vs PocketBase (analogy), focusing on “single binary”, “persistence substrate”, “query model”, “realtime”, “AI/tooling”. -->

### 7.4.1 The platform idea

A useful way to describe Turtlestack is:

- a local-first semantic runtime
- with a small, explicit ontology surface
- a query engine
- and an agent/tool substrate
- packaged as a reusable core (not a single application).

Forge/World/Observatory generalize as a product pattern:

- **World**: end-user interaction with the graph (browse + ask)
- **Forge**: editing the ontology/rules and publishing structure
- **Observatory**: inspecting provenance, health, and behavior

### 7.4.2 What would change in a platform extraction

A platform extraction implies prioritizing concerns that the prototype can defer:

- **Provenance and derivation tracking** as a first-class runtime feature.
- **A real query engine** (planning, indexing, incremental evaluation).
- **Permission boundaries** suitable for multi-user and multi-tenant contexts.
- **Schema evolution tooling** (migrations and compatibility affordances).

The prototype provides evidence that the product loop is meaningful; the platform version would be justified only if external builders can reuse the substrate across multiple domains.

## 7.5 Future work (near-term)

Near-term work implied by the prototype’s current gaps includes:

- A human-facing query surface (whether TQL syntax, UI builders, or both).
- Statement-level provenance and a UX for disputing/editing derived facts.
- Performance validation on realistic personal vault sizes (order-of-magnitude ~10k files).
- Sync/collaboration semantics for federated graphs.
- Better ingestion connectors (email, calendar, browser history) while preserving local-first constraints.

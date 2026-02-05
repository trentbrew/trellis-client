# Filegraph: A Local-First Semantic Graph for AI-Native Applications

## Paper Outline

### Abstract (150-200 words)

- The fragmentation problem: personal data scattered across silos
- Current tools force false choices: structure vs flexibility vs connections
- AI assistants are powerful but stateless, can't reason persistently over user data
- Filegraph: a local-first knowledge graph indexed from the filesystem, queryable by AI
- Key contributions: unified data model, inspectable AI reasoning, file-native persistence
- Results: working prototype demonstrating feasibility of semantic graphs at personal scale

---

## 1\. Introduction

### 1.1 The Problem

- **Data fragmentation**: Files, emails, notes, calendar events live in separate silos
- **Tool limitations**:
  - Notion: structured but proprietary, cloud-dependent
  - Obsidian: flexible but unstructured, limited querying
  - Traditional filesystems: no semantic understanding

- **AI gap**: Current assistants can't maintain persistent, queryable knowledge about your data
- **Semantic web failure**: The vision was right, but global coordination failed

### 1.2 Why Now?

- Local-first movement: users want data ownership
- AI capabilities: LLMs can extract structure from unstructured data
- JSON-LD maturity: practical semantic web without the baggage
- Datalog renaissance: Datomic, XTDB showing declarative queries work

### 1.3 Thesis Statement

> A local-first semantic graph, indexed from your filesystem, with a Datalog-inspired query layer and AI agent that reasons over inspectable structure, provides the missing infrastructure for AI-native personal computing.

### 1.4 Key Insights

1.  **Everything is a node**: Files, entities, relationships, agent actions
2.  **Files as persistence**: The filesystem is the source of truth, graph is the index
3.  **Inspectable AI**: Agent reasoning becomes auditable graph traversals
4.  **Emergent schema**: Structure discovered through extraction, not imposed upfront

### 1.5 Contributions

- Architecture for filesystem-backed semantic graphs
- Ontology design balancing flexibility and interoperability
- Query language (TQL) combining Datalog patterns with practical ergonomics
- Working implementation demonstrating viability at personal scale

---

## 2\. Background & Related Work

### 2.1 Knowledge Graphs

- **Enterprise**: Neo4j, Amazon Neptune, knowledge bases
- **Personal**: Roam Research, Obsidian, Logseq
- **Gap**: No solution combines local-first + semantic + AI-queryable

### 2.2 Semantic Web Technologies

- **RDF/JSON-LD**: What worked (interoperability) vs what didn't (complexity)
- **SPARQL**: Powerful but verbose, steep learning curve
- **Why it failed**: Required global coordination, heavyweight tooling
- **What to keep**: IRIs for predicates, linked data principles

### 2.3 Datalog & Declarative Queries

- **Datomic**: Immutable facts, time-travel queries, but proprietary
- **DataScript**: In-browser, but limited to ClojureScript
- **Souffle**: Fast but C++-focused, not user-facing
- **Gap**: No accessible Datalog for TypeScript/web developers

### 2.4 Local-First Software

- **CRDTs**: Automerge, Yjs - conflict-free replication
- **cr-sqlite**: SQLite with CRDT support
- **ElectricSQL**: Postgres sync to local SQLite
- **Gap**: All SQL-based, graph queries awkward

### 2.5 AI + Structured Data

- **RAG**: Retrieval-augmented generation, but unstructured
- **Function calling**: Tool use, but stateless
- **Knowledge graphs + LLMs**: Emerging area, mostly enterprise-focused
- **Gap**: No personal-scale system where AI reasons over user's semantic graph

### 2.6 Positioning

Filegraph sits at the intersection:

- Local-first (like Obsidian) + Semantic (like RDF) + AI-native (like modern assistants)
- Files (ownership) + Graphs (connections) + Datalog (queries) + LLMs (extraction)

---

## 3\. Architecture

### 3.1 Overview

```
┌─────────────────────────────────────────────┐
│         Natural Language Interface          │
│              (AI Agent)                     │
├─────────────────────────────────────────────┤
│            Query Layer (TQL)                │
│       Datalog-inspired pattern matching     │
├─────────────────────────────────────────────┤
│           Inference Layer                   │
│    Rules Engine │ Embeddings │ Formulas     │
├─────────────────────────────────────────────┤
│          Triple Store (EAV)                 │
│         JSON-LD compatible facts            │
├─────────────────────────────────────────────┤
│         Filesystem Persistence              │
│    .data files │ .note files │ .canvas      │
└─────────────────────────────────────────────┘
```

### 3.2 The Graph Model

- **Everything is a node**: Files, entities, relationships, memories, agent actions
- **EAV triples**: Entity-Attribute-Value with IRI predicates
- **JSON-LD compatible**: Facts can be exported as valid linked data
- **The graph file**: `graph.jsonld` as canonical state (or distributed across `.data` files)

### 3.3 Indexing Pipeline

```
File Change → Extract Facts → Resolve Entities → Generate Embeddings → Update Graph
```

**Entity Extraction**:

- LLM scans file content for entities (people, projects, organizations)
- Extracts structured data into JSON-LD format
- Example: Email mentions "Tyler" → `person:tyler:001`

**Entity Resolution**:

- Fuzzy matching on names/identifiers
- Embedding similarity for disambiguation
- User confirmation for uncertain matches

**Incremental Updates**:

- Filesystem watcher detects changes
- Only affected facts recomputed
- Epochs for versioning and time-travel queries

### 3.4 Query Layer (TQL)

**Design Goals**:

- Datalog's declarative power
- TypeScript-friendly syntax
- Type inference from schema

**Example Query**:

```typescript
// Find all tasks assigned to people who work on the Atlas project
const tasks = db.query(({ task, person, project }) => {
  task.assignedTo(person);
  person.worksOn(project);
  project.name('Atlas');
  return { task, person };
});
```

**Compilation**:

- Pattern matching → join plan
- Incremental evaluation for subscriptions
- Query optimization based on cardinality estimates

### 3.5 The AI Agent

**Tool Manifest**:

- Derived from ontology: every predicate becomes a potential tool
- `resolve_entity`, `search_vault`, `query_graph`, `read_file`, `write_file`

**Reasoning as Graph Operations**:

- Natural language → TQL query
- Results → structured response
- Agent actions stored as facts (auditable)

**Example**:

```
User: "Who is working on the Atlas project?"
Agent:
  1. Resolves "Atlas project" → entity:proj:atlas:001
  2. Queries: ?person worksOn entity:proj:atlas:001
  3. Returns: Sarah Chen, Tyler Johnson
  4. Stores: agent:query:123 { query: "...", results: [...] }
```

### 3.6 File Types & Persistence

**Why files, not a database?**

- User ownership: backup = copy folder
- Tool interoperability: edit with any text editor
- Version control: git works natively
- Transparency: inspect data without special tools

**File Types**:

- `.note` - Markdown prose with frontmatter
- `.data` - Structured JSON-LD entities
- `.canvas` - Visual graph layouts
- `graph.jsonld` - Materialized view (optional)

**Example** `.data` **file**:

```json
{
  "@context": "https://filegraph.dev/context.jsonld",
  "@id": "fg:person:trent-brew:001",
  "@type": ["fg:Entity", "schema:Person"],
  "schema:name": "Trent Brew",
  "schema:email": "trent@example.com",
  "fg:mentions": [{ "@id": "fg:file:/Users/trent/notes/meeting.md" }]
}
```

---

## 4\. Ontology Design

### 4.1 Design Principles

- **Minimal core**: Small set of essential types and predicates
- **Bridge to standards**: Map to schema.org, Dublin Core, etc.
- **Extensible**: Users can define custom types
- **Pragmatic**: Only include what's needed, avoid over-engineering

### 4.2 Core Ontology (fg:)

```turtle
@prefix fg: <https://filegraph.dev/ontology#> .
@prefix schema: <https://schema.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Core Types
fg:Node           # Abstract base - everything is a node
fg:File           rdfs:subClassOf fg:Node .
fg:Directory      rdfs:subClassOf fg:Node .
fg:Entity         rdfs:subClassOf fg:Node .  # Extracted entities
fg:Agent          rdfs:subClassOf fg:Node .  # AI or human
fg:Memory         rdfs:subClassOf fg:Node .  # Agent's saved context
fg:Query          rdfs:subClassOf fg:Node .  # Saved queries

# Core Predicates
fg:path           # File system path
fg:contains       # Directory → children
fg:mentions       # File → Entity (extracted reference)
fg:relatedTo      # Entity → Entity (with confidence)
fg:derivedFrom    # Provenance chain
fg:observedBy     # Which agent asserted this fact
fg:confidence     # 0-1 score for synthesized edges

# Attention & Intent
fg:lastAccessed
fg:accessCount
fg:inWorkspace    # User-defined grouping
fg:pinned

# Bridging
fg:sameAs         # Equivalent to external entity
fg:context        # Points to external @context
```

### 4.3 Bridging Strategy

**Problem**: Different data sources use different vocabularies

- Email: `schema:sender`
- Company API: `mycompany:author`
- Calendar: `cal:organizer`

**Solution**: Map external predicates to fg: predicates

```json
{
  "@context": {
    "sender": { "@id": "schema:sender", "fg:mapsTo": "fg:mentions" },
    "author": { "@id": "dc:creator", "fg:mapsTo": "fg:mentions" }
  }
}
```

### 4.4 What We'd Change

- Initial design too generic, needed more domain-specific types
- Confidence scores on edges need better calibration
- Provenance tracking could be more granular
- Need better story for ontology versioning

---

## 5\. Implementation

### 5.1 Technology Stack

- **Graph Engine**: Rust/WASM for performance, compiled to WebAssembly
- **Shell**: Tauri (Rust + web) - local-first without Electron bloat
- **Frontend**: React + TypeScript - views over the graph
- **Query Engine**: Custom TQL interpreter, incremental evaluation
- **Embeddings**: Local models (nomic-embed-text) via Ollama
- **LLM**: Gemini 2.0 Flash for entity extraction and agent reasoning

### 5.2 Key Design Decisions

**Why Rust for the graph engine?**

- Performance: millions of facts, sub-millisecond queries
- WASM target: runs in browser or desktop
- Type safety: graph operations are complex, need strong types

**Why Tauri over Electron?**

- Smaller binary: ~10MB vs ~100MB
- Native performance: no Chromium overhead
- Security: sandboxed by default

**Why files over database?**

- User ownership and transparency
- Tool interoperability (git, grep, editors)
- Simpler backup and sync story

### 5.3 What Worked

**1\. The unified data model**

- "Frontend and backend feel indistinguishable"
- No impedance mismatch between UI state and graph state
- Reactive queries: UI updates automatically when facts change

**2\. Real-time indexing**

- Filesystem watcher + incremental updates = always current
- Sub-second latency from file save to graph update

**3\. Inspectable AI reasoning**

- Agent's "thoughts" are graph traversals
- "Why did you suggest this?" → show the query path
- Builds trust through transparency

**4\. File-native persistence**

- Users understand "it's just files"
- Backup = copy folder, no special tools needed
- Can edit `.data` files manually if needed

### 5.4 What Was Hard

**1\. Entity resolution**

- "Tyler" in email vs "Tyler Johnson" in contact vs "tyler@company.com"
- Fuzzy matching + embeddings helps but not perfect
- Still requires user confirmation for ambiguous cases

**2\. Performance at scale**

- Prototype works great with 1000s of entities
- Unclear how it scales to 100k+ (full email archive)
- Need better indexing strategies for large graphs

**3\. UI for graph navigation**

- Graph visualization looks cool but hard to navigate
- Users prefer search + natural language over visual graph
- Need better affordances for discovering connections

**4\. Ontology evolution**

- Adding new types/predicates is easy
- Changing existing ones breaks queries
- Need migration strategy for schema changes

**5\. Permission model**

- Graph traversal permissions get complex fast
- "If I can see A, and A links to B, can I see B?"
- Punted on this for prototype, but critical for multi-user

### 5.5 Performance Characteristics

- **Indexing**: ~500 files/second on M1 Mac
- **Query latency**: <10ms for simple patterns, <100ms for complex
- **Memory**: ~50MB for 10k entities + 50k facts
- **Startup**: <1s cold start, <100ms warm

---

## 6\. Evaluation & Lessons Learned

### 6.1 What We Validated

✅ **Filesystem-backed graphs are viable** at personal scale  
✅ **AI can extract structure** from unstructured data reliably  
✅ **Datalog-style queries** are learnable and powerful  
✅ **Inspectable reasoning** builds user trust  
✅ **Local-first** doesn't sacrifice functionality

### 6.2 What Surprised Us

- Users prefer natural language over visual graph navigation
- The "everything is a node" model simplifies architecture dramatically
- File-native persistence is a killer feature (users love "it's just files")
- Embeddings are more useful for search than for entity resolution
- The agent's memory being queryable is more powerful than expected

### 6.3 Open Questions

**1\. How should epochs/versioning work?**

- Current: simple timestamp-based epochs
- Need: proper temporal queries, branching, rollback

**2\. What's the right permission model?**

- Graph traversal permissions are complex
- Need something simpler than full graph ACLs
- Maybe: capability-based, scoped to workspaces

**3\. How do you handle ontology evolution?**

- Adding types/predicates is easy
- Changing them breaks existing queries
- Need: migration system, deprecation warnings

**4\. What's the sync story for collaboration?**

- Single-user prototype works great
- Multi-user needs CRDT-style conflict resolution
- How do you merge graphs from different users?

**5\. How do embeddings drift affect queries?**

- Re-embedding with new model changes similarity edges
- Queries return different results across epochs
- Need: versioned embeddings, confidence decay

### 6.4 User Feedback (Early Testing)

- "It's like Obsidian but it actually understands my notes"
- "The AI can explain why it suggested something - that's huge"
- "I love that it's just files, I can grep my knowledge graph"
- "The graph view is pretty but I never use it"
- "Wish it could index my email automatically"

---

## 7\. Implications & Future Work

### 7.1 For AI-Native Applications

**The inspectable reasoning model**:

- AI actions become auditable facts in the graph
- "Why did you do that?" → graph traversal, not post-hoc rationalization
- Builds trust through transparency

**Structured memory**:

- Agent's context is queryable, not opaque
- Can debug AI behavior by inspecting its knowledge
- Enables collaborative AI that shares understanding

### 7.2 For Personal Computing

**Your data as a queryable graph**:

- Not just files in folders, but interconnected knowledge
- Query across all your data: "What projects mention Tyler?"
- The OS understands semantic relationships

**User ownership**:

- Local-first: your data, your machine, your control
- Interoperable: export as JSON-LD, import into other tools
- Transparent: inspect and modify without special tools

### 7.3 For the Semantic Web

**Maybe the vision was right, just at the wrong scale**:

- Global semantic web failed (coordination problem)
- Personal semantic web might succeed (no coordination needed)
- Interoperability through shared vocabularies (schema.org)
- Federation when you want it, not required

### 7.4 Turtlestack: The Platform Extraction

**The vision**: What if this was a runtime others could build on?

```
┌─────────────────────────────────────────────┐
│         Turtlestack Admin UI                │
│  Ontology Editor │ Graph Browser │ Agents  │
├─────────────────────────────────────────────┤
│              API Layer                      │
│    JSON-LD in/out │ TQL │ Subscriptions    │
├─────────────────────────────────────────────┤
│           Turtlestack Core                  │
│  Triple Store │ Embeddings │ Rules Engine  │
├─────────────────────────────────────────────┤
│      Single Binary / Container              │
│      `turtlestack serve --port 8080`        │
└─────────────────────────────────────────────┘
```

**What developers would get**:

- Define ontology, get typed queries automatically
- Write Datalog rules, get incremental evaluation
- Upload files, get embeddings and extraction
- Register AI tools, get agent reasoning

**The Pocketbase comparison**:

- Pocketbase: "SQLite + auth + realtime + files in one binary"
- Turtlestack: "Semantic graph + AI + embeddings + files in one binary"

**Open questions**:

- Multi-tenancy with shared ontologies
- Permission boundaries on graph traversal
- Consistency during rule evaluation
- Embedding drift across epochs

### 7.5 Broader Impact

- **Knowledge work**: Tools that understand context, not just keywords
- **AI safety**: Inspectable reasoning vs black-box decisions
- **Data ownership**: Users control their knowledge graphs
- **Interoperability**: Shared vocabularies enable tool ecosystems

---

## 8\. Conclusion

### 8.1 Summary

We presented Filegraph, a local-first semantic graph for AI-native applications. Key contributions:

1.  **Architecture**: Filesystem-backed triple store with Datalog queries
2.  **Ontology**: Minimal core bridging to standard vocabularies
3.  **AI Integration**: Inspectable reasoning over structured knowledge
4.  **Validation**: Working prototype demonstrating viability at personal scale

### 8.2 The Core Insight

> When the data model is the product—when "frontend" is views over the graph and "backend" is mutations to the graph—the boundary dissolves. There's no impedance mismatch, no translation layer where bugs hide.

### 8.3 What's Next

1.  **Study the prototype**: Get it in users' hands, learn what works
2.  **Write this paper**: Clarify thinking, identify improvements
3.  **Rebuild from scratch**: Apply lessons to clean implementation
4.  **Extract the platform**: Turtlestack as infrastructure for others

### 8.4 Final Thought

The semantic web vision wasn't wrong—it was just too ambitious. A personal semantic graph, indexed from your filesystem, queryable by AI, might be the right scale for linked data to finally work.

---

## References

\[To be filled in with proper citations\]

- Datomic, DataScript, XTDB (Datalog systems)
- JSON-LD, RDF, SPARQL specs
- Local-first software principles
- Obsidian, Roam, Notion (knowledge tools)
- RAG, function calling papers
- Semantic web history and critiques

---

## Appendices

### A. TQL Language Reference

\[Syntax, semantics, examples\]

### B. Ontology Specification

\[Complete fg: ontology in Turtle\]

### C. Example Queries

\[Real-world query patterns\]

### D. Performance Benchmarks

\[Detailed measurements\]

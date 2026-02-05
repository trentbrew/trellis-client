# 1\. Introduction

## 30-second version

> Filegraph turns your filesystem into a queryable knowledge graph. Files are nodes, relationships are edges, and a local AI agent can reason over the whole thing. Your data stays on your machine as plain files—backup is just copying a folder. This paper describes the architecture, what worked, what didn't, and why personal-scale semantic graphs might finally make linked data practical.

## The Fragmentation Problem

Your knowledge is scattered. Emails in Gmail. Notes in Obsidian. Tasks in Notion. Files in Finder. Calendar events in Google Calendar. Each tool excels at its domain, but they don't talk to each other. When you need to answer "What projects is Tyler working on?" you're opening five apps, searching five times, and manually connecting the dots in your head.

```mermaid
flowchart LR Q[Question\n"What projects is Tyler working on?"] --> U[You] U --> G[Gmail] U --> N[Notes] U --> T[Tasks] U --> F[Finder] U --> C[Calendar] G -->|context stays local| X[Manual stitching\nin your head] N -->|context stays local| X T -->|context stays local| X F -->|context stays local| X C -->|context stays local| X
```

<!-- FIGURE IDEA: A small screenshot montage of the “silo” tools (mail, notes, tasks, files, calendar) to visually reinforce fragmentation. -->

This isn't just inconvenient—it's a fundamental limitation of how we've built personal computing. Our tools treat data as isolated silos. A file is just a file. An email is just an email. The connections between them—the fact that this email mentions that project, which involves these people, who are working on those tasks—exist only in your memory.

## The AI Promise and Its Limitations

Large language models promised to change this. Ask ChatGPT "What projects is Tyler working on?" and it will... hallucinate. It doesn't know Tyler. It doesn't know your projects. It can't read your emails or notes or files. It's powerful but stateless—every conversation starts from scratch.

You can feed it context through RAG (retrieval-augmented generation), but that's just fancy search. The AI retrieves relevant documents, reads them, and answers. It doesn't _understand_ the relationships. It doesn't know that Tyler works for TechStart Inc., which is the client for the Chinese Learning App project, which has a milestone due next week. That structure exists in your data, but current AI tools can't see it.

## What If Your Filesystem Was a Knowledge Graph?

This is the question that led to Filegraph. What if, instead of files in folders, your computer understood your data as an interconnected graph? What if:

- Every file, email, note, and calendar event was a **node**

- Relationships between them—mentions, references, authorship, timestamps—were **edges**

- An AI agent could **query** this graph to answer questions

- The agent's reasoning was **inspectable**: not a black box, but a traversal you could examine

- All of this ran **locally**, on your machine, with your data in files you own

Not a cloud service. Not a proprietary format. Just your files, indexed into a semantic graph, queryable by an AI that can explain its reasoning.

```mermaid
flowchart TD V[Vault\nplain files in a folder] --> I[Indexing\nscan + incremental updates] I --> G[Graph index\nEAV facts + links] G --> Q[Query/Tool surface\nresolve_entity / query_graph / ...] Q --> A[Agent + UI\nanswers + inspectable evidence]
```

<!-- FIGURE IDEA: Screenshot of the Filegraph UI answering a question, with the evidence/tool trace visible (to make “inspectable” concrete). -->

## The Semantic Web's Unfinished Vision

This isn't a new idea. The semantic web, proposed by Tim Berners-Lee in 2001, envisioned exactly this: data with meaning, linked across the web, queryable by machines. It gave us RDF (Resource Description Framework), JSON-LD (JSON for Linked Data), and SPARQL (the query language for semantic data).

But the semantic web failed. Or rather, it succeeded in narrow domains (Google's Knowledge Graph, Wikidata) but never became the universal fabric of the web. Why? Because it required global coordination. Every website would need to publish semantic data. Every organization would need to agree on vocabularies. The bootstrapping problem was insurmountable.

**The insight**: Maybe the semantic web was right, just at the wrong scale. Not the entire internet, but your personal data. Not global coordination, but local extraction. Not heavyweight RDF/XML, but pragmatic JSON-LD. Not SPARQL's verbosity, but Datalog's elegance.

## Why Now?

Three trends converge to make this possible:

1.  **Local-first software**: Users want data ownership. Tools like Obsidian, Logseq, and Notion's offline mode show that local-first isn't just viable—it's desirable. CRDTs (Conflict-free Replicated Data Types) solve sync. SQLite proves databases can be files.

2.  **AI capabilities**: LLMs can extract structure from unstructured text. "Tyler is working on the Atlas project" becomes a machine-readable fact: `person:tyler worksOn project:atlas`. Entity extraction, once a research problem, is now a commodity.

3.  **Datalog's renaissance**: Datomic showed that Datalog—a declarative query language from the 1980s—is perfect for modern apps. Immutable facts, time-travel queries, reactive subscriptions. XTDB, DataScript, and others are bringing Datalog to new platforms.

The pieces exist. No one has assembled them into a coherent system for personal computing.

## Thesis

**We present Filegraph: a local-first semantic graph indexed from the filesystem, with a Datalog-inspired query language and an AI agent that reasons over inspectable structure.**

Filegraph demonstrates that:

1.  **Filesystem-backed semantic graphs are viable** at personal scale (thousands of entities, tens of thousands of facts)

2.  **AI can reliably extract structure** from unstructured data (emails, notes, documents)

3.  **Datalog-style queries** provide the right abstraction for graph traversal

4.  **Inspectable AI reasoning** builds trust through transparency

5.  **File-native persistence** enables ownership, interoperability, and simplicity

This isn't just a better note-taking app. It's a different model for personal computing: **your data as a queryable graph you own, with an AI that can explain its reasoning**.

## Non-Goals

Filegraph is intentionally scoped. In its current form, it does **not** aim to:

- **Replace your filesystem**. It indexes folders and files; it does not introduce a new storage layer.

- **Require cloud connectivity**. The core system is designed to run locally with local AI.

- **Enforce a single schema upfront**. The system is built to support emergent structure and incremental formalization.

- **Solve multi-user collaboration** (yet). Sync and conflict-resolution are future work.

- **Implement full semantic-web reasoning**. The focus is pragmatic JSON-LD + graph traversal, not OWL-complete inference.

## Key Insights

Through building and using Filegraph, we discovered several non-obvious insights:

- **Everything is a node**: Files, entities, relationships, memories, even agent actions. This uniform model simplifies the architecture dramatically. There's no "files vs. database" distinction—files _are_ the database.

- **Files as persistence, graph as index**: The filesystem is the source of truth. The graph is a materialized view, rebuilt from files on startup. This inverts the typical model (database as truth, files as export) and enables radical simplicity: backup is `cp -r`, version control is `git`, editing is any text editor.

- **Inspectable AI reasoning**: When the agent answers "Tyler is working on the Atlas project," it's not generating text—it's traversing the graph. You can ask "Why?" and see the query path: `person:tyler → worksOn → project:atlas`. This transparency builds trust in a way RAG-based systems can't match.

- **Emergent schema**: You don't define a schema upfront. The AI extracts entities from your data. The schema emerges from what's actually there. This is the opposite of traditional databases (schema first, data second) and more aligned with how knowledge actually works.

- **The frontend and backend feel indistinguishable**: When the data model is the product—when "frontend" is views over the graph and "backend" is mutations to the graph—the boundary dissolves. There's no impedance mismatch, no translation layer where bugs hide. It's all just graph operations.

## Contributions

This paper makes the following contributions:

1.  **Architecture**: A design for filesystem-backed semantic graphs with incremental indexing, entity resolution, and embedding-based similarity

2.  **Query Language**: TQL (Traversable Query Language), a Datalog-inspired DSL with TypeScript-friendly syntax and type inference

3.  **Ontology**: A minimal core ontology (`fg:`) that bridges to standard vocabularies (schema.org, Dublin Core) while remaining practical

4.  **AI Integration**: A model for inspectable AI reasoning where agent actions are facts in the graph, making the AI's "thinking" auditable

5.  **Implementation**: A working prototype (Filegraph) demonstrating viability at personal scale, with performance measurements and user feedback

6.  **Lessons Learned**: Honest reflection on what worked, what didn't, and open questions for future work

## Roadmap

The rest of this paper is organized as follows:

- **Section 2** surveys related work in knowledge graphs, semantic web technologies, Datalog systems, local-first software, and AI + structured data, positioning Filegraph at their intersection.

- **Section 3** describes the architecture: the graph model, indexing pipeline, query layer, AI agent, and file-native persistence strategy.

- **Section 4** details the ontology design: the core `fg:` vocabulary, bridging strategy to external ontologies, and design decisions.

- **Section 5** covers implementation: the technology stack, key design decisions, what worked, what was hard, and performance characteristics.

- **Section 6** evaluates the system: what we validated, what surprised us, open questions, and early user feedback.

- **Section 7** explores implications for AI-native applications, personal computing, and the semantic web, and sketches Turtlestack—a platform extraction of these ideas.

- **Section 8** concludes with a summary and next steps.

---

## A Note on Terminology

Throughout this paper, we use several terms that may be unfamiliar:

- **Triple**: A fact in the form (subject, predicate, object), e.g., `(person:tyler, worksOn, project:atlas)`

- **EAV**: Entity-Attribute-Value, equivalent to triples but emphasizing the database perspective

- **IRI**: Internationalized Resource Identifier, a URI that can include Unicode characters

- **JSON-LD**: JSON for Linked Data, a way to express RDF triples in JSON format

- **Datalog**: A declarative query language, subset of Prolog, designed for databases

- **Local-first**: Software that works offline-first, with data stored locally and optionally synced

- **CRDT**: Conflict-free Replicated Data Type, data structures that can be merged without conflicts

- **RAG**: Retrieval-Augmented Generation, where an LLM retrieves documents before answering

We'll define these more precisely as they arise, but this glossary provides a quick reference.

---

_Next: Section 2 - Background & Related Work_

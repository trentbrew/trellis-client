Some thoughts on optimal codebase architecture to optimize for coding agents:

## The core insight

Coding agents aren't humans. They don't "browse" a codebase — they search, read, and patch it. The optimal architecture minimizes the tokens an agent needs to consume before it can act correctly, and maximizes the probability that a local change is a correct global change.

## Key architectural principles

High cohesion, low coupling (but literally). This has always been good advice, but agents make it load-bearing. When an agent needs to fix a bug or add a feature, it should ideally only need to understand one module. Every cross-module dependency is a context window tax. Concretely: prefer colocation (component + styles + tests + types in the same directory) over separation by kind (all styles in /styles, all tests in /tests).
Explicit contracts at boundaries. Agents do well with typed interfaces, schema files, and explicit API contracts. If the relationship between two modules is defined in a schema (TypeScript types, JSON Schema, OpenAPI spec, or — in your world — JSON-LD shapes), an agent can read the contract without reading the implementation. This is where your instinct toward JSON-LD as single source of truth generating types, schemas, and pages is genuinely ahead of the curve.

Flat over deep. Deep nesting forces agents to hold more path context and makes file discovery harder. A flatter module structure with descriptive names (invoice-processor/, tri-report-builder/) beats src/modules/core/domain/services/processors/.

Convention over configuration, but documented convention. Agents thrive on predictable patterns. If every feature module has index.ts, types.ts, [name].test.ts, and README.md, the agent can navigate by pattern rather than by search. The critical addition: a lightweight ARCHITECTURE.md or CONVENTIONS.md at the repo root that an agent can read first. Think of it as the system prompt for your codebase.

Small, pure, testable units. Pure functions with explicit inputs/outputs are dramatically easier for agents to reason about than stateful classes with implicit dependencies. An agent can verify a pure function by reading its signature and running its tests. A stateful service requires understanding initialization order, lifecycle, and mutation patterns — all of which are expensive in tokens.

Schema-driven everything. This is where your TQL/trellis instincts really pay off. When the data model is the source of truth and everything else (UI, validation, API routes, migrations) is derived from it, an agent only needs to understand the schema layer to make correct changes that cascade. This is the difference between "change the schema and regenerate" vs. "find every place this field appears across 40 files."
Practical patterns that help agents
Dependency injection over imports. When dependencies are injected (or at least centralized in a composition root), an agent can swap, mock, or trace them without rewriting import trees.
Colocated tests. foo.ts next to foo.test.ts means the agent finds the test immediately and can verify its changes. Tests also serve as executable documentation — they're the most reliable "examples" an agent can read.
README-per-module. A short markdown file in each module explaining its purpose, key types, and invariants gives the agent a compressed understanding without reading every file. This is cheap to maintain and disproportionately valuable.

Monorepo with clear package boundaries. A well-structured monorepo (with Nx, Turborepo, or your Nix + pnpm approach) gives agents clear dependency graphs and scoped build/test commands. The agent can run nx test invoice-processor rather than guessing what to test.
Semantic commit conventions and linear history. When an agent reads git history (or is asked to continue someone's work), conventional commits (fix(tri-report):, feat(filegraph):) make the history parseable. Linear history (rebase, no merge commits) reduces noise.

The meta-pattern: make the implicit explicit

The unifying theme is that everything agents struggle with is implicit knowledge — conventions only in people's heads, relationships only visible by tracing code, invariants only documented in someone's mental model. The optimal codebase for agents is one where a new human developer could also onboard fast, because the same things that help agents (explicit contracts, documented conventions, colocated context, schema-driven derivation) also help humans.
This is actually the thesis behind your AX work: the agent experience isn't opposed to the developer experience — it's the developer experience taken seriously. A codebase that's genuinely good for agents is one that's been forced to make its architecture honest.

One thing worth noting: this maps cleanly onto your substrate/trellis model. The "substrate" is the raw codebase files. The "trellis" is the semantic layer — the schemas, contracts, READMEs, conventions docs, and type definitions that give meaning to the structure. Agents navigate the trellis; they only drop into the substrate when they need to make a specific change. The better the trellis, the less substrate the agent needs to read.
Want to dig into any of these — particularly how this maps onto Filegraph's architecture or the TQL workspace patterns?

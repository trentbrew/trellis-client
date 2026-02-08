# Documentation Ontology & Commit-Driven Doc Generation

A schema-driven documentation system where a declarative "trellis" defines the structure of project docs, and a post-commit hook regenerates only the sections affected by each commit.

---

## Problem

- `docs/` has 8 categories of **manually-written** markdown that drift from the code
- `tql-docs.ts` generates 5 files (CHANGELOG, DECISIONS, etc.) but only runs manually via `pnpm hq:docs`
- The kernel already tracks File, Change, Commit, Session entities — but nothing ties them to documentation structure
- No schema defines _what_ documentation should exist or _which code_ it covers

## Approach: The Doc Trellis

A **documentation ontology** — a JSON-LD schema file that declaratively defines:

- **DocModule** — a major area of the codebase (e.g., "TQL Hooks", "Entity System", "Theme Pipeline")
- **DocSection** — a section within a module's doc page (e.g., "API Surface", "Architecture", "Conventions")
- **Scope bindings** — glob patterns that tie each module to the files it covers

The trellis is the skeleton. Content grows along it as commits land.

### Entity Types

```
DocModule
  ├── id: string              # e.g., "doc:tql-hooks"
  ├── title: string           # "TQL Hooks"
  ├── description: string     # One-liner
  ├── sourceGlobs: string[]   # ["hooks/**/*.ts", "packages/tql/**"]
  ├── outputPath: string      # "docs/architecture/TQL_HOOKS.md"
  ├── status: enum            # draft | active | deprecated
  └── sections: DocSection[]

DocSection
  ├── heading: string         # "## Health Checks"
  ├── sourceHint: string      # "hooks/tql-heal.ts"
  ├── mode: enum              # auto | manual | hybrid
  │     auto   = fully regenerated from kernel data
  │     manual = preserved as-is, never overwritten
  │     hybrid = auto-generated scaffold + manual content block
  └── template: string        # Mustache/handlebars template for auto sections
```

### Example Trellis Entry

```jsonld
{
  "@id": "doc:tql-hooks",
  "@type": "DocModule",
  "title": "TQL Hooks Infrastructure",
  "sourceGlobs": ["hooks/*.ts", "hooks/__tests__/*.ts"],
  "outputPath": "docs/architecture/TQL_HOOKS.md",
  "status": "active",
  "sections": [
    { "heading": "Overview", "mode": "manual" },
    { "heading": "Registered Hooks", "mode": "auto", "sourceHint": ".windsurf/hooks.json" },
    { "heading": "Guard Rules", "mode": "auto", "sourceHint": "hooks/tql-guard.ts" },
    { "heading": "Self-Healing", "mode": "auto", "sourceHint": "hooks/tql-heal.ts" },
    { "heading": "Test Coverage", "mode": "auto", "sourceHint": "hooks/__tests__/" },
    { "heading": "CLI Scripts", "mode": "auto" }
  ]
}
```

## Pipeline

### Trigger: `post-commit` husky hook

```
git commit → husky post-commit → bun run hooks/tql-docs-sync.ts
```

1. **Diff** — `git diff --name-only HEAD~1 HEAD` → list of changed files
2. **Scope match** — for each DocModule, check if any changed files match `sourceGlobs`
3. **Regenerate** — for affected modules, re-render `auto` sections from kernel data; preserve `manual` sections verbatim
4. **Write** — output to `outputPath` (inside `docs/`)
5. **Stage** — auto-stage regenerated doc files for the next commit (or optionally amend)

### What "auto" sections can pull from

The kernel already has (via `tql-ingest.ts` and `tql-git.ts`):
- **File** entities with `path`, `language`, `readCount`, `writeCount`
- **Change** entities with `filePath`, `linesAdded`, `linesRemoved`, `timestamp`
- **Commit** entities with `hash`, `message`, `timestamp`, `filesChanged`
- **Action** entities with `actionType`, `data`
- **Session** entities with `trajectoryId`, `promptCount`

New queries for doc generation:
- "Which files in this module changed most recently?"
- "What's the test coverage for this module?" (files in `__tests__/` matching scope)
- "What decisions were made affecting this module?" (from archive-response)

## File Plan

| File | Purpose |
|------|---------|
| `.tql/docs.trellis.jsonld` | The ontology — declares all DocModules and their sections |
| `hooks/tql-docs-sync.ts` | Post-commit hook: diff-aware doc regeneration |
| `.husky/post-commit` | Wires the hook into git |
| `hooks/__tests__/tql-docs-sync.test.ts` | Tests for scope matching and section rendering |

## Implementation Steps

1. **Define the trellis schema** — create `.tql/docs.trellis.jsonld` with 3–4 initial DocModules covering the areas with the most structured data (TQL Hooks, Entity System, Theme, Data Layer)
2. **Build `tql-docs-sync.ts`** — the diff-aware generator with scope matching, section rendering, and manual-section preservation
3. **Wire husky `post-commit`** — uncomment/add the hook to run the sync
4. **Seed initial manual sections** — for modules that have existing `docs/` content, mark those sections as `manual` so they're preserved
5. **Add tests** — scope-matching logic, section rendering, manual-section preservation
6. **Run end-to-end** — make a commit and verify docs regenerate correctly

## Open Questions

1. **Output target** — Write directly into `docs/` (replacing manual docs gradually) or keep a separate `.tql/generated/docs/` tree? _Recommendation: write to `docs/` with `mode: manual` protecting hand-written content._
2. **Amend vs next-commit** — Should regenerated docs be amended into the triggering commit, or staged for the next commit? _Recommendation: stage for next commit (amend can cause issues with hooks re-firing)._
3. **Existing `tql-docs.ts`** — Merge its generators (CHANGELOG, DECISIONS, etc.) into the new trellis system, or keep them separate? _Recommendation: migrate them as DocModules with `mode: auto`._
4. **Trellis format** — JSON-LD (consistent with `.tql/`) or YAML (more readable)? _Recommendation: JSON-LD for consistency, but open to YAML if preferred._

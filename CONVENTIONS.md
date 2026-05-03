# Trellis — Conventions

> Repo-wide conventions. Per-package conventions live alongside their code.

---

## Where conventions are documented

| Scope                                | Source                                                            |
|--------------------------------------|-------------------------------------------------------------------|
| **Frontend (`apps/web/app/`)**       | [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md)    |
| **Local data adapter**               | [`apps/web/app/lib/instant-local/README.md`](./apps/web/app/lib/instant-local/README.md) |
| **CLI**                              | [`packages/trellis-cli/README.md`](./packages/trellis-cli/README.md) |
| **MCP**                              | [`packages/trellis-mcp/SKILL.md`](./packages/trellis-mcp/SKILL.md) |
| **Living docs (auto-generated)**     | [`living-docs/README.md`](./living-docs/README.md)                |

---

## Repo-wide rules

### Package management

- **pnpm only.** A `preinstall` guard rejects npm/yarn (`apps/web/package.json`).
- Workspace layout: `apps/*` and `packages/*` (see `pnpm-workspace.yaml`).
- Add new internal deps via `workspace:*` and `pnpm install`.

### Task runner

`just` is canonical (see [`justfile`](./justfile)). Equivalent commands work via `pnpm` if you prefer:

| `just`                  | `pnpm` equivalent                              |
|-------------------------|------------------------------------------------|
| `just dev`              | `pnpm --filter ./apps/web dev`                 |
| `just build`            | `pnpm -r build`                                |
| `just test`             | `pnpm -r --if-present test`                    |
| `just lint`             | `pnpm -r --if-present lint`                    |
| `just typecheck`        | `pnpm -r --if-present typecheck`               |
| `just trellis -- query …` | `node packages/trellis-cli/bin/trellis.mjs query …` |

> **Do not start the dev server yourself if one is already running.** Check `lsof -ti:$TRELLIS_PORT` first.

### Tests

**Tests are colocated next to the source they verify.** Canonical as of 2026-05-02.

```
foo.ts
foo.test.ts   ← right here, not in a parallel /tests/ tree
```

Vitest scans `apps/web/app/**/*.test.*` and `apps/web/server/**/*.test.*`. Playwright e2e specs live separately at `apps/web/tests/e2e/` and run via `pnpm test:e2e`.

Full rationale: [`apps/web/app/CONVENTIONS.md`](./apps/web/app/CONVENTIONS.md) → "Testing".

### Commits

- **Conventional commits** enforced by `commitlint` + `husky` pre-commit hooks.
- Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`.
- Common scopes: `agentize`, `campus`, `entities`, `dialogs`, `tql`, `mcp`, `cli`, `web`.

Examples:

```
refactor(agentize): phase 4 — colocate tests, remove duplicates
feat(campus): Workshop → Showroom artifact publish flow
fix(local mode): user identity handling
```

### Linting & formatting

- **ESLint 9** (flat config) with the Nuxt + TypeScript-ESLint preset.
- **Prettier** for formatting (`prettier --write` via `lint-staged`).
- Auto-runs on staged files via husky `pre-commit`.

### Branch & PR conventions

- Long-running feature branches: `feat/<short-name>` (e.g. `feat/campus-substrate`).
- One phase = one commit during the agentize cleanup pass (see [`docs/planning/`](./docs/planning) for the plan).

---

## Quarantine policy (`.archive/`)

The `.archive/` directory is **gitignored** and holds files removed from the working tree without losing them on disk. See [`.archive/2026-05-02-agentize/README.md`](./.archive/2026-05-02-agentize/README.md) (if present).

Conventions:

- Subdirectories named `YYYY-MM-DD-<batch-name>/`.
- Each batch has its own `README.md` documenting what's in it and how to restore.
- Restoration: `git mv .archive/<batch>/<subdir>/<file> <original/path>`.
- Removal from `.archive/` is intentionally a **separate decision** (not part of the move).

---

## Trellis-specific principles

These flow from [`PRINCIPLES.md`](./PRINCIPLES.md) and [`VISION.md`](./VISION.md):

1. **Everything is a node.** If a thing has identity, it belongs in TQL.
2. **The editor is the substrate.** Don't build bespoke UI surfaces when an editor block can do the job.
3. **Views are queries.** A new visual = a new projection over existing graph data, not a new data structure.
4. **Emergent schema.** Ontologies grow from use; don't gate-keep with rigid schemas upfront.
5. **Inspectable reasoning.** Agent actions are graph facts. Every mutation appears in the same SSE feed humans see.
6. **Ownership by construction.** Local-first by default. Open formats (JSON-LD, JSONL). Cloud is additive.

Apply the **decision filter** to any architectural choice:

1. Does this move toward "everything is a node," or away from it?
2. Does this make AI more inspectable, or less?
3. Does this preserve ownership, or compromise it?

---

## What NOT to do

- **Don't introduce a parallel test tree.** Keep tests colocated.
- **Don't hand-roll entity browse logic** in the frontend — use `useBrowsePage()`.
- **Don't hand-roll auto-save** — use `useAutoSave()`.
- **Don't add `as any` casts.** Fix the type instead. If a field is missing, add it to the interface.
- **Don't bypass the kernel.** All mutations go through `/api/graph/mutate` (or the CLI/MCP equivalent).
- **Don't restore `apps/web/@/`.** It was an unintegrated React TipTap template (now in `.archive/`). If TipTap features are needed, port them under `apps/web/app/lib/tiptap/` as Vue components.
- **Don't pollute the root with scratch MDs.** Use `.archive/` for batch-quarantines or `.notes/` for personal scratch.

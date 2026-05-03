# `hooks/`

Lifecycle hooks that connect external events (Windsurf agent activity, git operations, file changes) to the TQL knowledge graph. Hooks are the substrate that makes agent reasoning **inspectable** — every meaningful action becomes a graph fact.

> All hooks are TypeScript files runnable via `bun` (or `node` for the few that don't depend on `Bun.Glob`). They share a single kernel factory in `_kernel.ts` so they all read/write the same `.tql/` state.

---

## Hook catalog

### Shared infrastructure
| File              | Purpose                                                                           |
|-------------------|-----------------------------------------------------------------------------------|
| `_kernel.ts`      | Factory: opens the project's TQL kernel with consistent paths/backends.           |

### Response capture (Windsurf lifecycle)
| File                  | Purpose                                                                       |
|-----------------------|-------------------------------------------------------------------------------|
| `archive-response.ts` | Saves every Cascade response as a JSON-LD decision trace (audit + queryable). |
| `log-response.ts`     | Logs Cascade responses for compliance.                                        |
| `audit.ts`            | Logs code changes with a git-style diff summary.                              |
| `log.ts`              | Generic logger for all hook invocations (debug aid).                          |

### Security
| File                  | Purpose                                                                       |
|-----------------------|-------------------------------------------------------------------------------|
| `block-dangerous.ts`  | Blocks dangerous shell commands before they run.                              |

### TQL graph writers (the "HQ" suite)
| File                    | Purpose                                                                              |
|-------------------------|--------------------------------------------------------------------------------------|
| `tql-init.ts`           | Bootstraps `.tql/` for a new project.                                                |
| `tql-server.ts`         | Unified local server for the project brain.                                          |
| `tql-ingest.ts`         | Feeds Cascade events into the graph.                                                 |
| `tql-eval.ts`           | Realtime spiral detection + agent-alignment evaluation.                              |
| `tql-guard.ts`          | Enforces policies by querying the graph.                                             |
| `tql-task-update.ts`    | Auto-transitions task status based on Cascade activity.                              |
| `tql-task-check.ts`     | Surfaces the active task from the live graph.                                        |
| `tql-roadmap-check.ts`  | Surfaces milestone progress.                                                         |
| `tql-git.ts`            | Auto-commits `.tql/` state and tracks git operations.                                |
| `tql-heal.ts`           | Self-healing: detects and repairs TQL infrastructure issues.                         |
| `tql-compact.ts`        | Compacts the JSONL op log via snapshotting.                                          |
| `tql-export.ts`         | Exports kernel state to `.tql/client/state.json` for the frontend.                   |
| `tql-seed.ts`           | Seeds the graph with project tasks/features/milestones.                              |

### TQL graph readers (reports & dashboards)
| File                    | Purpose                                                                              |
|-------------------------|--------------------------------------------------------------------------------------|
| `tql-query.ts`          | Simple CLI: query the graph from the shell.                                          |
| `tql-status.ts`         | Terminal dashboard of project state.                                                 |
| `tql-insights.ts`       | Auto-generated analytics from the graph.                                             |
| `tql-standup.ts`        | Standup-ready notes generated from recent activity.                                  |
| `tql-devlog.ts`         | Daily narrative summaries.                                                           |
| `tql-demo.ts`           | Generates client-presentation scripts from the graph.                                |

### Documentation generators
| File                    | Purpose                                                                              |
|-------------------------|--------------------------------------------------------------------------------------|
| `tql-docs.ts`           | Generates structured documentation from the graph.                                   |
| `tql-docs-sync.ts`      | Diff-aware living-docs generator (writes `living-docs/`, runs on `post-commit`).     |

---

## Lifecycle integration

Hooks are wired up in two places:

| Trigger              | Hook(s)                            | Defined in                |
|----------------------|------------------------------------|---------------------------|
| `git commit`         | `tql-docs-sync.ts`, `tql-git.ts`   | `.husky/post-commit`      |
| Cascade response     | `archive-response.ts`, `log-response.ts`, `audit.ts` | `.windsurf/hooks.json` |
| Pre-shell-command    | `block-dangerous.ts`               | `.windsurf/hooks.json`    |
| Manual               | any hook                           | `bun run hooks/<name>.ts` |

The Windsurf hook configuration is project-scoped — see `.windsurf/` (gitignored personal settings may also affect behavior).

---

## Adding a new hook

1. Create `hooks/<name>.ts` (use `tql-status.ts` as a small reference, `tql-docs-sync.ts` for diff-aware patterns).
2. Import the shared kernel via `import { createKernel, TQL_DIR, PROJECT_ROOT } from './_kernel.js'`.
3. Keep side effects narrow: read the graph, write to `living-docs/`, write to `.tql/`, or print to stdout — but don't mutate workspace files unless that's the explicit purpose of the hook.
4. Add a doc comment at the top describing trigger and side effects.
5. If the hook should run in a Windsurf lifecycle phase, register it in `.windsurf/hooks.json`.
6. If the hook needs a corresponding test, add it under `hooks/__tests__/<name>.test.ts`.

---

## Tests

```bash
bun test hooks/__tests__/
# or, individually:
bun test hooks/__tests__/tql-docs-sync.test.ts
```

The existing tests focus on diff-detection logic, glob matching, and template merging.

---

## See also

- [`AGENTS.md`](../AGENTS.md) — Trellis agent instructions and the kernel API
- [`living-docs/README.md`](../living-docs/README.md) — what `tql-docs-sync.ts` produces
- [`packages/tql/`](../packages/tql) — the kernel hooks open via `_kernel.ts`
- [`.windsurf/workflows/`](../.windsurf/workflows) — slash-command workflows (a different surface than these hooks)

# ADR-002 — Kernel divergence audit (embedded vs published `trellis`)

**Date:** 2026-07-02  
**VCS:** TRL-15 (P3 wedge) · parent TRL-12  
**Compared:** `@turtle.tech/trellis-kernel` (monorepo embedded) vs `trellis@^3.2` (npm, trellis-node)

This audit informs post-P3 convergence. Verdicts: **port** | **keep embedded** | **drop** | **upstream**.

---

## Summary

| Surface | Embedded kernel | Published `trellis` | Verdict |
|---------|-----------------|---------------------|---------|
| EAV store / op-log | `TrellisKernel` + SQLite/JSONL backends | `TrellisDb` + sql.js/better-sqlite | **port** — client uses npm; server transitional |
| EQL-S query | `kernel.query()` / `/api/graph/query` | `db.query()` / WS subscribe | **port** — P3 starts with live entities |
| Graph CRUD | `createNode` / `updateNode` / `deleteNode` | `useMutation` / HTTP entities API | **port** — sidecar path proven on pages |
| Workspace config boot | `createWorkspaceConfig()` + `kernel.boot()` | Schema `defineType` + entity rows | **port** — P1 graph-residency done |
| App config read (client) | SSE + `/api/graph/config` snapshot | `trellis/vue` `useEntities` (P3) | **port** — dual-path shipped P3; kernel-bridge shipped TRL-16 |
| Ontology listing | `kernel.listOntologies()` | Schema registry + entity query | **keep embedded** until P3 browse cutover |
| Projections | `kernel.listProjections()` | Entity-backed `AppProjection` rows | **port** — seeded P1 |
| SSE mutation stream | `/api/graph/events` | WS `/realtime` diffs | **port** — sidecar WS for pages |
| Zone guard (advisory) | Nuxt `zone-guard.ts` | Not in npm engine | **keep embedded** until P2 moves to relay middleware |
| Campus zone stamping | Mutation headers + `data.zoneId` | Sidecar entities optional | **keep embedded** — P2 capability grants |
| VCS / issue tracking | `trellis-vcs` in monorepo hooks | `trellis/vcs` in npm | **upstream** — separate convergence track |
| Identity / Ed25519 signing | Partial in kernel events | `trellis/identity` | **port** — P2 join middleware |
| Realtime presence | `trellis/realtime` BC + relay | Same package | **port** — P0 zone rooms shipped |
| Vue bindings | None (composables wrap REST) | `trellis/vue`, `trellis/vue/typed` | **port** — P3 wedge |
| React / Svelte bindings | None | `trellis/react`, `trellis/svelte` | **drop** for this client |
| InstantDB / platform adapter | `DataAdapter` cloud/local | Not applicable | **keep embedded** — platform layer |
| MCP / CLI graph tools | `packages/trellis-cli` → embedded API | Could target sidecar URL | **keep embedded** short-term |
| Formula / analytics modules | In embedded fork | Not in npm 3.2 | **upstream** or **keep embedded** per file audit |
| Workflow engine | Embedded util | Not in npm 3.2 | **keep embedded** |
| Gmail / integrations seed | Nuxt server plugin | N/A | **keep embedded** |
| AGPL engine packaging | Private `@turtle.tech/*` | Published `trellis` AGPL | **accepted** per ADR D1 |

---

## Recommended next ports (post-P3)

1. ~~**Kernel-bridge `TrellisDb`** — SSE-backed shim so `trellis/vue` works without sidecar (`TRELLIS_SIDECAR=0`).~~ **Shipped TRL-16.**
2. ~~**Browse / `useTrellisEntities`** — Option B Phase 2; replace kernel SSE version bump pattern.~~ **Shipped TRL-17** (kernel-bridge `KernelBrowse` aggregate).
3. **Zone-gated relay join** — P2; move advisory guard to `trellis/realtime` middleware.
4. **File-by-file fork audit** — `packages/trellis-kernel` diff vs `trellis@3.2` for query optimizer, workflows.

---

## Non-goals of this audit

- Line-by-line diff count
- Iroh transport (P5+)
- Retiring MCP or CLI in this repo

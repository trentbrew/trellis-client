# Spec: ADR-002 ontology listing via graph schema registry (TRL-20)

**VCS:** TRL-20 (spec) · parent TRL-12 · proposal `WU-ADR002-ontology-registry-proposal.md`  
**Audit:** `docs/architecture/adr-002-kernel-fork-file-audit.md` § port queue  
**Builds on:** TRL-14 P1 seed (`trellis_schema`) · TRL-16 kernel-bridge · TRL-19a  
**Status:** queue-ready

---

## Problem

`GET /api/graph/ontologies` and `/summary` call `kernel.listOntologies()` — the in-memory map from `kernel.boot(workspaceConfig)`. P1 `seedAppConfigFromModules` already writes matching `trellis_schema` rows, and `buildAppConfigSnapshot` reads them for `/config`, but list endpoints ignore the graph.

## Goal

Single runtime read path: **graph `trellis_schema` entities** (+ module fallback when graph empty). Ontology CRUD mutates both kernel registry **and** graph entity so lists stay consistent.

## Non-goals

- Remove `trellis-ontologies.ts` (remains seed + empty-graph fallback)
- Client composable changes beyond transparent API parity
- Sidecar `AppSchema` live path (defer TRL-20b)
- `defineType` rewrite of system ontologies

---

## Architecture

```
server/lib/ontology-registry/
  graph-schema-registry.ts     # list / get from trellis_schema facts
  graph-schema-registry.test.ts
  parse-schema.ts              # configJson → SchemaDefinition + trellis/schema guard

server/lib/app-config-snapshot.ts
  → reuse graph-schema-registry for ontologies map (DRY)

server/api/graph/[...path].ts
  GET /ontologies, /schema, /summary  → listSchemasFromGraph(kernel)
  GET /ontology/:id                   → getSchemaFromGraph(kernel, id)
  POST|PUT|DELETE /ontology           → kernel CRUD + upsert/delete trellis_schema entity
```

### Read contract

```typescript
/** Primary: trellis_schema entities; fallback: createWorkspaceConfig().workspace.ontologies */
export function listSchemasFromGraph(kernel: TrellisKernel): SchemaDefinition[]

export function getSchemaFromGraph(
  kernel: TrellisKernel,
  schemaId: string,
): SchemaDefinition | undefined

export function schemasToRecord(
  schemas: SchemaDefinition[],
): Record<string, SchemaDefinition>
```

**Lookup key:** `schemaId` fact on entity (e.g. `trellis:schema/task`), not `ontology:task` entity id.

**Fallback:** When zero `trellis_schema` entities exist, return module ontologies from `createWorkspaceConfig()` (same rule as `buildAppConfigSnapshot` today).

### Write contract (CRUD dual-write)

After successful `kernel.createOntology` / `updateOntology` / `deleteOntology`:

| Op | Graph side-effect |
|----|-------------------|
| POST | `upsertTrellisSchemaEntity(kernel, schema)` — id `ontology:{slug}` |
| PUT | same upsert |
| DELETE | `deleteNode` on matching `trellis_schema` entity (by `schemaId` fact) |

Extract `upsertTrellisSchemaEntity` from `seed-app-config.ts` logic (shared slug rule: `schemaId.replace(/^trellis:schema\//, '').replace(/[:/]/g, '-')`).

Stamp `zoneId` / `facilityId` from `APP_CONFIG_ZONE_ID` / `APP_CONFIG_FACILITY_ID` (same as seed).

### npm `trellis/schema` usage

`parse-schema.ts` validates parsed JSON before returning:

- Required: `@id`, `@type`, `version`, `fields` array
- `import type { SchemaDefinition } from 'trellis/core'` for structural typing
- `import type {} from 'trellis/schema'` or use `defineType` output shape comment — **at least one** `trellis/schema` import in `ontology-registry/` for convergence AC

Invalid `configJson` on graph entities: skip row + `console.warn` (do not throw on list).

---

## Implementation slices

### Slice 1 — Graph registry module + tests

| File | Action |
|------|--------|
| `server/lib/ontology-registry/graph-schema-registry.ts` | **New** — list/get/record helpers |
| `server/lib/ontology-registry/parse-schema.ts` | **New** — parse + validate configJson |
| `server/lib/ontology-registry/graph-schema-registry.test.ts` | **New** — seeded kernel, fallback empty graph, get by schemaId |

### Slice 2 — DRY app-config-snapshot

| File | Action |
|------|--------|
| `server/lib/app-config-snapshot.ts` | Use `schemasToRecord(listSchemasFromGraph(kernel))` for `ontologies` field |

### Slice 3 — Graph API read paths

| File | Action |
|------|--------|
| `server/api/graph/[...path].ts` | Replace `kernel.listOntologies()` on GET `/ontologies`, `/schema`, `/summary` |
| same | Replace `kernel.getOntology()` on GET `/ontology/:id` with `getSchemaFromGraph` |

### Slice 4 — Graph API CRUD dual-write

| File | Action |
|------|--------|
| `server/lib/seed-app-config.ts` | Export `upsertTrellisSchemaEntity`, `deleteTrellisSchemaBySchemaId` |
| `server/api/graph/[...path].ts` | POST/PUT/DELETE ontology → dual-write helpers |

### Slice 5 — Docs

| File | Action |
|------|--------|
| `docs/sidecar-dev.md` | Note ontologies list from graph `trellis_schema` (not kernel map) |

---

## Acceptance criteria

1. `test:cd apps/web && pnpm vitest run server/lib/ontology-registry/` — pass
2. `test:cd apps/web && pnpm vitest run server/lib/app-config-snapshot.test.ts server/lib/seed-app-config.test.ts` — pass
3. **Grep:** `rg 'listOntologies' apps/web/server/api/graph` — **no matches**
4. **Grep:** `rg 'trellis/schema' apps/web/server/lib/ontology-registry` — at least one match
5. **Behavioral:** `just trellis ontology list --pretty` — returns ≥ system ontology count (task, note, …)
6. **Behavioral:** `curl -s localhost:$TRELLIS_PORT/api/graph/ontologies | jq '.ontologies | keys | length'` — same count as AC 5 (±0)
7. **Behavioral:** create custom ontology via CLI, re-list — appears in both CLI and `/api/graph/ontologies`
8. Scoped eslint on `server/lib/ontology-registry/` + touched graph API sections — 0 errors

**Manual AC:** `/ontologies` sidebar sections populate; `useOntologyRegistry` loads without console errors on `just run-kernel`.

---

## TRL-20b preview (defer)

- `useOntologyRegistry` kernel-bridge live path (`AppSchema` + SSE) when `TRELLIS_SIDECAR=0`
- Sidecar import of `trellis_schema` rows
- Retire module fallback once graph always seeded

---

## Handoff

```bash
trellis issue start TRL-20
trellis issue create -t "Impl: graph ontology registry (TRL-20)" -l impl --parent TRL-20 -S queue
```

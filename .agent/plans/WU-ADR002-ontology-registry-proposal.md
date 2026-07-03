# Proposal: ADR-002 ontology listing via graph schema registry (TRL-20)

**VCS:** TRL-20 · parent TRL-12 (ADR-002 epic)  
**Audit:** `docs/architecture/adr-002-kernel-fork-file-audit.md` port queue §2  
**Builds on:** TRL-14 (P1 graph-residency) · TRL-16/17 (kernel-bridge) · TRL-19a (kernel import stable)  
**Status:** queue-ready

---

## Problem

Ontology **listing** is split across two sources:

| Path | Source today |
|------|----------------|
| `GET /api/graph/ontologies` | `kernel.listOntologies()` (in-memory boot map) |
| `GET /api/graph/config` | `buildAppConfigSnapshot()` → graph `trellis_schema` entities |
| Boot seed | `trellis-ontologies.ts` → `createWorkspaceConfig()` + `seedAppConfigFromModules` |

P1 already seeds `trellis_schema` document entities (`ontology:*` ids, `configJson` payload). Runtime list endpoints still bypass the graph — CLI/MCP ontology CRUD and seeded graph rows can diverge.

## Goal

Make **graph-resident `trellis_schema` entities** the canonical runtime source for ontology **reads** on the Nuxt server. Align with npm `trellis/schema` types for validation. Keep `trellis-ontologies.ts` as **boot seed module only** (fork-extends per audit).

## Non-goals

- Deleting `trellis-ontologies.ts` or `createWorkspaceConfig()` (seed + fallback)
- Replacing embedded `TrellisKernel` (TRL-19b)
- Client `useOntologyRegistry` API changes (response shape frozen)
- Sidecar ontology import / live `trellis/vue` schema subscription (TRL-20b)
- Per-field `defineType` migration of all system ontologies

## Success

- `rg 'listOntologies' apps/web/server/api/graph` → empty
- `just trellis ontology list --pretty` matches graph-seeded schema count
- `/ontologies` sidebar loads from same data as `/api/graph/config` ontologies map

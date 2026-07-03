# Proposal: ADR-002 ontology registry live subscribe (TRL-20b)

**VCS:** TRL-20b (proposal) · parent TRL-12 (ADR-002 epic)  
**Builds on:** TRL-20 (graph ontology reads) · TRL-16 (kernel-bridge) · TRL-17 (browse live pattern)  
**Human decision:** proceed after TRL-21 ship — 2026-07-03  
**Status:** queue-ready

---

## Problem

TRL-20 made **server** ontology listing graph-canonical (`listSchemasFromGraph`). Client `useOntologyRegistry()` still refetches via HTTP + SSE invalidation:

```
useOntologyRegistry()
  └─ $fetch GET /api/graph/ontologies (or /config ontologies map)
  └─ SSE mutation → full refetch
```

Browse (`useTrellisEntities`) and app config (`useTrellisConfig`) already have **kernel-bridge live paths** on `just run-kernel`. Ontology sidebar, schema editor, and browse field metadata lag behind — extra round-trips and stale windows between SSE event and refetch.

## Goal

Add **kernel-bridge live subscribe** for ontology/schema entities on the default dev path (`TRELLIS_SIDECAR=0`), mirroring TRL-16/17:

1. Subscribe to `trellis_schema` entities (or synthetic `AppSchema` aggregate) via `TrellisDb`
2. `useOntologyRegistry()` reactive without full refetch on every SSE tick
3. **No regression** on sidecar path or embedded-only fallback

## Non-goals

- Server `listSchemasFromGraph` changes (TRL-20 done)
- Retiring `trellis-ontologies.ts` seed module
- TRL-19b full kernel swap
- Sidecar `TRELLIS_SIDECAR=1` ontology import (defer TRL-20c)
- Custom ontology CRUD UI changes (transparent if API shape frozen)

## Success criteria (human)

- `/ontologies` sidebar updates when CLI creates ontology — no manual refresh
- `useOntologyRegistry().serverTypes` reactive on kernel-bridge path
- `just run-kernel` + `pnpm check` green; existing ontology registry tests pass

---

## Handoff

```bash
# → architect spec TRL-20b
```

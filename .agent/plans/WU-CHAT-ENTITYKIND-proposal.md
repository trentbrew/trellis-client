# Proposal: Chat entityKind → type normalization (C2)

**Parent epic:** browse-convergence (orthogonal)  
**Status:** proposal — park Phase 3d until chat query path is understood

---

## Problem

Chat channels/messages use **`entityKind: channel | message`** in graph storage while browse/ontology uses **`data.type`**. They are excluded from unified browse via `routed: '/messages'` and `NON_BROWSE_SYSTEM_TYPES` — but agents querying `FIND entity WHERE ?e.type = "channel"` get empty results.

~105 channel entities exist with `entityKind` not `type`.

## Goal

Single query axis: **`data.type`** is canonical for all graph entities including chat.

## Options

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A — Dual-read** | Query layer maps `entityKind` ↔ `type` | No migration | Permanent complexity |
| **B — One-time backfill** | Update ops: set `data.type = entityKind` where missing | Clean queries | Op-log replay risk |
| **C — Ontology-only** | Keep storage; fix MCP/CLI query docs | Zero migration | User confusion remains |

**Recommend B** with kernel migration script + advisory guard on new writes.

## Scope (if approved)

1. Audit: count entities with `entityKind` but no `type`
2. Script: `backfill-entity-kind-to-type.ts` (--dry-run)
3. Server: on createNode for channel/message, stamp both fields (transition)
4. Remove `entityKind` from new writes after cutover date
5. Browse: keep `routed: '/messages'` — normalization ≠ browse inclusion

## Non-goals

- Merging `/messages` UI into `/workspace/browse`
- InstantDB chat tables (cloud mode separate)

## Next step

Human ack → architect spec → executor wedge (backend-only, no designer)

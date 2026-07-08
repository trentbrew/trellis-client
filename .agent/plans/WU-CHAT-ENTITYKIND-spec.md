# Spec: Chat entityKind → type normalization (C2)

**Parent epic:** browse-convergence (orthogonal)  
**Proposal:** `.agent/plans/WU-CHAT-ENTITYKIND-proposal.md`  
**Status:** architect spec — **human ack required** before live backfill

---

## Problem

Chat channels/messages persist **`entityKind: channel | message`** while browse, ontologies, and most agents query **`data.type`**. ~105 channel entities return empty for `FIND entity WHERE ?e.type = "channel"`.

Chat remains excluded from unified browse via `routed: '/messages'` — this wedge normalizes storage only.

## Goal

**`data.type` is canonical** for all graph entities. Queries and MCP tools work without dual-read shims.

## Decision

**Option B — one-time backfill** (recommended in proposal). Reject A (permanent dual-read) and C (docs-only).

---

## Implementation slices

### D-1 — Audit script (read-only)

**File:** `apps/web/scripts/backfill-entity-kind-to-type.ts` (shipped)

```bash
bun apps/web/scripts/backfill-entity-kind-to-type.ts --dry-run
bun apps/web/scripts/backfill-entity-kind-to-type.ts --agent-id cursor
```

- Scan `entityKind IN (channel, message)` via EQL-S
- Skip when `data.type` already matches
- Live mode: `updateNode` with `{ type: kind }` only (preserve other fields)
- Emit manifest JSON to stdout

### D-2 — Transition writes (server)

**Files:** `apps/web/app/composables/useChannels.ts`, `apps/web/app/composables/useChat.ts`

On create/update for channel/message:

```ts
data: { ...payload, type: 'channel', entityKind: 'channel' } // transition
```

After cutover date (T+14d from backfill): remove `entityKind` from new writes.

### D-3 — Query layer (optional, post-cutover)

Remove `entityKind` filters from `useChannels` / `useChat` EQL-S strings; use `?c.type = "channel"` instead.

**Non-blocking** — can ship after D-1 + D-2.

### D-4 — Rollback

Manifest lists every updated entityId. Rollback = set `type` removed or restored from manifest `previousType` via batch update script (not auto-generated — manual if needed).

---

## AC

- [ ] `--dry-run` count matches audit (~105 channels + messages)
- [ ] After live backfill: `FIND entity AS ?e WHERE ?e.type = "channel"` returns channels
- [ ] New channel create stamps both `type` and `entityKind` during transition
- [ ] `/messages` UI unchanged; browse still excludes channel/message

---

## Risks

| Risk | Mitigation |
|------|------------|
| Op-log replay duplicates | updateNode idempotent on same type |
| Cloud InstantDB chat separate | Out of scope — graph-only |
| Agents still query entityKind | Update SKILL.md + AGENTS.md after D-1 |

---

## Human gate

1. Run `--dry-run`, review counts
2. Approve live backfill window
3. Run live script with `--agent-id`
4. Verify sample queries in MCP
5. Schedule D-2 transition period end

**Do not** merge D-3 query rewrites until backfill verified in production graph.

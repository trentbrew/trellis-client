# WU-OPTION-B-001: Trellis-native realtime — page documents (Phase 1)

## Status

| Phase | Scope | State |
|-------|-------|-------|
| **0** | Sidecar proxy (`/api/trellis/*`), smoke scripts, `just sidecar-*` | **Landed** (uncommitted on `client-sdk`; smoke green) |
| **1** | Client ingress: WS truth + presence gossip for `/pages/[id]` | **This wedge** |
| **2** | Browse/collections/boards on same transport | Deferred |
| **3** | Cross-browser relay (`/rt`), room tenants | Deferred |

## Problem

Two tabs on the same page document (`/w/.../pages/:id`) do **not** sync today. The app runs **Option A**: embedded TQL kernel + SSE refetch via `useTrellisEntities`. The page editor intentionally ignores post-seed store updates (`_seededPageId` guard) to prevent save loops.

User expectation (validated against `fractal-playground` + `trellis-node/examples/universal-presence`): **no Y.js, no InstantDB**. Use the trellis-node split:

- **Graph = truth** — sidecar HTTP mutations + WS `/realtime` EQL subscriptions
- **Presence = gossip** — `trellis/realtime` (`joinPresence`, `RealtimeText`, BroadcastChannel same-browser; optional `/rt` relay later)

## Goals

1. When `TRELLIS_SIDECAR=1` and sidecar is running, **two tabs on the same page** see each other's **saved** title/description/content within ~1s (WS diff).
2. **Live typing** (content body) converges via `RealtimeText` over presence mesh — same browser multi-tab without relay.
3. **Option A unchanged** when `TRELLIS_SIDECAR` is off — embedded kernel path remains default.
4. Zero dependency on Y.js collab extensions or InstantDB rooms for this wedge.

## Non-goals (Phase 1)

- Full app cutover (browse grid, collections, platform settings)
- Cross-browser/device presence (relay on `:8231`) — document opt-in only
- Replacing embedded TQL kernel for CLI/MCP on `:1414`
- Character-perfect OT merge for TipTap — port fractal-playground pattern (debounced graph save + RealtimeText for textarea/rich-text draft layer)

## Reference implementations

| Source | What to port |
|--------|----------------|
| `fractal-playground/lib/trellis/provider.tsx` | HTTP proxy patch, guarded WS subscribe, direct WS origin |
| `fractal-playground/lib/trellis/offline-realtime.ts` | Sidecar health probe before WS |
| `fractal-playground/components/pages/page-editor.tsx` | `useEntity` + `mut.update()` truth path |
| `fractal-playground/lib/presence/*` | `joinPresence`, `PresenceRoom`, cell/text sync |
| `trellis-node/examples/universal-presence` | `RealtimeText`, caret presence wire format |
| `apps/web/docs/sidecar-dev.md` | Phase 0 proxy (already landed) |

## Technical constraints

1. **HTTP proxied, WS direct** — browsers connect WS to `TRELLIS_URL` (`:8230`), HTTP via Nuxt `/api/trellis` (fractal-playground pattern).
2. **`trellis` npm package** — installed `@3.2.3` lacks `trellis/vue` dist; trellis-node source has `trellis/vue` + `trellis/vue/typed`. Phase 1 must bump/link to a build that exports Vue hooks or vendor minimal composables from `trellis-node/src/vue`.
3. **Nuxt 4 / Vue 3** — use `trellis/vue` (`useRoom`, `useEntity`) not React provider; mirror provider wiring in a Nuxt plugin + `provide/inject`.
4. **Page entity model** — pages are `type: 'page'` entities in TQL graph (`usePageNotes` today); sidecar path must map to same IDs (`entity:…` or UUID slugs per existing data).
5. **Seed guard refactor** — replace blunt `_seededPageId` skip with origin-aware merge: apply remote WS diffs when `event.source !== self` and field not dirty/focused.

## Proposed slices (sequenced)

### Slice 1 — Trellis client shell (gated)

- Nuxt plugin: `TrellisProvider` when `runtimeConfig.trellisSidecar`
- Patch SDK `_fetch` → `/api/trellis` (reuse `entities-server` patterns)
- Install guarded subscribe (`offline-realtime` port)
- Runtime config: `trellisUrl`, `trellisApiKey`, `public.trellisWsUrl`
- Dev docs: two-terminal workflow (`sidecar-serve` + `TRELLIS_SIDECAR=1 pnpm dev`)

### Slice 2 — Page truth path

- Composable `useSidecarPage(pageId)` wrapping `useEntity` / `useMutation` from `trellis/vue/typed` (or equivalent)
- `/pages/[id].vue`: branch on `trellisSidecar` — sidecar hooks vs existing `usePageNotes` + `useAutoSave`
- Remote diff application for title, description, content, status, tags
- Debounced `mut.update()` on local edits (match fractal-playground debounce)

### Slice 3 — Presence gossip (pages)

- Port `joinPresence` lifecycle composable (`useJoinedRoom` pattern)
- Page-scoped room: `page:{pageId}` or `scopedPresenceRoom(org, pageId)`
- Replace `usePagePresence` InstantDB path with `trellis/realtime` when sidecar mode
- `RealtimeText` for `content` field live draft; carets via `setPresence({ caret, caretAt })`
- Same-browser multi-tab: BroadcastChannel (no relay required for AC)

## Acceptance criteria (Phase 1)

| ID | Criterion |
|----|-----------|
| AC-1 | `TRELLIS_SIDECAR=0`: existing Option A behavior unchanged; `pnpm test` + `pnpm build` green |
| AC-2 | `TRELLIS_SIDECAR=1` + sidecar running: `pnpm smoke:ws` + `pnpm smoke:sidecar` still pass |
| AC-3 | Two tabs, same page URL, sidecar mode: edit title in tab A → tab B title updates without refresh |
| AC-4 | Two tabs, same page URL, sidecar mode: type in content in tab A → tab B shows live draft via presence (before save) |
| AC-5 | After debounced save, both tabs converge to same persisted content (graph truth) |
| AC-6 | No `@instantdb/*` or Y.js collab imports added; presence uses `trellis/realtime` only |
| AC-7 | Document relay opt-in for cross-browser (`VITE_PRESENCE_RELAY_URL`) — not required for AC-3–5 |

## Risks

| Risk | Mitigation |
|------|------------|
| `trellis/vue` missing from published npm | Pin trellis-node build or workspace link; verify exports in AC-2 |
| Dual data paths (kernel vs sidecar) | Strict env gate; no mixed writes |
| Save loop on WS echo | Origin-aware merge + debounce; don't re-seed on self mutations |
| TipTap vs RealtimeText | Phase 1: plain content string + RealtimeText overlay; TipTap collab explicitly out of scope |

## Dependencies

- Phase 0 proxy routes (`apps/web/server/api/trellis/*`) — landed
- Sidecar `trellis db serve` on `:8230` — dev prerequisite
- trellis-node `trellis/vue` + `trellis/realtime` exports

## Handoff

**Next:** Architect → spec with file-level AC, test plan, and slice boundaries.  
**Skip designer** — UI is existing page chrome; presence cursors reuse fractal-playground overlay patterns (cohesion pass optional post-impl).

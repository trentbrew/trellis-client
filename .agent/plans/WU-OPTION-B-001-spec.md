# Spec: WU-OPTION-B-001 — Trellis-native page realtime (Phase 1)

**Parent:** `.agent/plans/WU-OPTION-B-001.md`  
**Role:** Architect spec (implementation-ready)  
**Stack:** Nuxt 4 / Vue 3 · `trellis@^3.3` (vue exports) · sidecar `:8230` · no Y.js · no InstantDB

---

## 1. Architecture

### 1.1 Two pipes (fractal-playground model)

```
┌─────────────────────────────────────────────────────────────┐
│ Browser tab                                                  │
│  pages/[id].vue                                              │
│    ├─ TRUTH: useEntity(PageType) + useMutation()            │
│    │         HTTP → /api/trellis/* → sidecar :8230           │
│    │         WS   → ws://localhost:8230/realtime (direct)    │
│    └─ GOSSIP: joinPresence + RealtimeText                    │
│              BroadcastChannel (same browser) or /rt relay    │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Transport | Durability |
|-------|-----------|------------|
| Graph truth | Sidecar HTTP + WS EQL subscribe | Op-log (sidecar DB) |
| Presence gossip | `trellis/realtime` | Ephemeral (+ optional relay replay) |

### 1.2 Mode gate

| `TRELLIS_SIDECAR` | Page route (`/pages/[id]`) | Browse / rest of app |
|-------------------|----------------------------|----------------------|
| `0` (default) | **Unchanged** — `usePageNotes` + kernel SSE | Kernel (`useTrellisEntities`) |
| `1` | **Sidecar path** — `useSidecarPage` + presence | **Unchanged** — still kernel (Phase 2) |

**Critical:** Sidecar DB (`.trellis-db/`) is **not** the embedded kernel (`.trellis/kernel.db`). A page UUID that exists only in the kernel will **not** load on the sidecar path until imported. Phase 1 ships wiring + dev import; full browse cutover is Phase 2.

### 1.3 Field mapping (PageItem ↔ sidecar schema)

| `PageItem` (apps/web) | Sidecar `PageType` field | Notes |
|-----------------------|--------------------------|-------|
| `title` | `title` | Direct |
| `content` | `body` | Map in adapter only |
| `description` | — | Phase 1: omit or store in `body` meta; **non-goal** unless trivial |
| `status`, `icon`, `folder`, `tags` | optional attrs | Pass through if sidecar entity supports; else kernel-only metadata until Phase 2 |

Define schema in `apps/web/app/lib/trellis-sidecar/schema/page.ts` mirroring fractal-playground `PageType` with `body` as rich_text HTML.

---

## 2. Dependency: `trellis` package with Vue exports

**Blocker:** `trellis@3.2.3` in `node_modules` has no `dist/vue/`.

**Resolution (pick one — Executor verifies in AC-2):**

1. **Preferred:** Bump `apps/web/package.json` → `"trellis": "^3.3.0"` (or latest publish that includes `./vue` and `./vue/typed` in `exports`).
2. **Fallback:** `pnpm.overrides` / `file:` link to local `trellis-node` build (`bun run build` in trellis-node, then `"trellis": "file:../../../TRELLIS/trellis-node"`).

**Verify before Slice 2:**

```bash
node -e "import('trellis/vue/typed').then(m => console.log(Object.keys(m)))"
```

---

## 3. Slice 1 — Trellis client shell

### 3.1 New files

| File | Purpose |
|------|---------|
| `apps/web/app/lib/trellis-sidecar/sidecar-probe.ts` | Client `GET /api/trellis/health` → `{ available }` |
| `apps/web/app/lib/trellis-sidecar/offline-realtime.ts` | Port `installSidecarGuard`, `createGuardedSubscribe` from fractal-playground |
| `apps/web/app/lib/trellis-sidecar/http-proxy.ts` | Patch `TrellisDb._fetch` → `/api/trellis` + Bearer from config |
| `apps/web/app/lib/trellis-sidecar/create-client.ts` | `createTrellisDb({ url: wsOrigin, apiKey })` + install patches |
| `apps/web/app/lib/trellis-sidecar/schema/page.ts` | `PageType` via `defineType` |
| `apps/web/app/composables/useTrellisSidecar.ts` | `enabled`, `client`, `available` refs |
| `apps/web/app/plugins/trellis-sidecar.client.ts` | Init client when `runtimeConfig.public.trellisSidecar` |

### 3.2 Runtime config (`nuxt.config.ts`)

```ts
runtimeConfig: {
  trellisSidecar: process.env.TRELLIS_SIDECAR === '1',
  trellisUrl: process.env.TRELLIS_URL ?? 'http://localhost:8230',
  trellisApiKey: process.env.TRELLIS_API_KEY ?? '',
  public: {
    trellisSidecar: process.env.TRELLIS_SIDECAR === '1',
    trellisWsUrl: process.env.TRELLIS_URL ?? 'http://localhost:8230',
    trellisApiKey: process.env.TRELLIS_API_KEY ?? '', // dev only; empty ok for local sidecar
    // existing public keys unchanged
  },
}
```

**WS rule:** HTTP via same-origin `/api/trellis`; WS connects to `public.trellisWsUrl` directly (cross-origin allowed).

### 3.3 Plugin behavior

1. If `!public.trellisSidecar` → no-op (provide `trellisSidecar: { enabled: false }`).
2. If enabled → `createTrellisDb`, `installHttpProxy`, `installSidecarGuard`, probe health.
3. `provide('trellisDb', client)` for composables.

### 3.4 Slice 1 AC

| ID | Criterion |
|----|-----------|
| S1-1 | `TRELLIS_SIDECAR=0`: plugin no-ops; no WS connection attempted |
| S1-2 | `TRELLIS_SIDECAR=1` + sidecar up: client probes health before WS |
| S1-3 | Sidecar down: subscribe callbacks receive empty snapshot (no throw, no reconnect storm) |
| S1-4 | `pnpm smoke:ws` + `pnpm smoke:sidecar` still pass |

---

## 4. Slice 2 — Page truth path

### 4.1 Composable: `useSidecarPage(pageId: Ref<string>)`

Location: `apps/web/app/composables/useSidecarPage.ts`

```ts
// Pseudocode contract
export function useSidecarPage(pageId: Ref<string>) {
  const db = useTrellisDb() // injected TrellisDb
  const { data: page, loading, error } = useEntity(db, PageType, pageId)
  const mut = useMutation(db, PageType)

  // Mapped view for Vue templates (PageItem shape)
  const pageItem = computed(() => page.value ? mapSidecarToPageItem(page.value) : undefined)

  async function update(partial: Partial<PageItem>) {
    await mut.update(pageId.value, mapPageItemToSidecar(partial))
  }

  return { page: pageItem, rawPage: page, loading, error, update }
}
```

**Remote merge (replaces `_seededPageId` blunt guard on sidecar path):**

| Field | Apply remote WS update when |
|-------|----------------------------|
| `title` | `!titleFocused` (mirror fractal-playground `page-editor.tsx`) |
| `content`/`body` | Handled by Slice 3 `RealtimeText`; graph value applied when editor not focused |
| `status`, `icon`, etc. | Always apply if not locally dirty (track per-field dirty set) |

Do **not** port `_seededPageId` to sidecar path — `useEntity` is the source of truth.

### 4.2 Page route changes

File: `apps/web/app/pages/pages/[id].vue`

```
if (useTrellisSidecar().enabled) {
  // branch: useSidecarPage, useTrellisPagePresence, usePageContentSync
} else {
  // existing usePageNotes + useAutoSave (unchanged)
}
```

**Scope:** Only fork the data/presence/save path. Keep layout, comments, references UI shared where possible.

**Save debounce:** 600ms for title/content graph writes (match fractal-playground `SAVE_DEBOUNCE_MS`).

### 4.3 Dev import script (kernel → sidecar)

File: `apps/web/scripts/import-pages-to-sidecar.mjs`

- Query kernel via `http://localhost:$TRELLIS_PORT/api/graph/query` for `type = "page"` (limit configurable).
- POST each to sidecar via `/api/trellis/entities` (when Nuxt proxy up) or direct `:8230/entities`.
- Map `content` → `body`, preserve `id` where sidecar accepts client ids.
- Document in `docs/sidecar-dev.md` under "Import kernel pages".

**Not required for AC-3** if e2e creates fresh pages in sidecar; required for manual dogfooding on existing UUIDs.

### 4.4 Slice 2 AC

| ID | Criterion |
|----|-----------|
| S2-1 | Sidecar mode: open `/pages/:id` for sidecar-native page loads title + body |
| S2-2 | Sidecar mode: edit title in tab A → tab B title updates ≤2s without refresh (AC-3) |
| S2-3 | Kernel mode: `/pages/:id` behavior identical to pre-change (regression) |
| S2-4 | No writes to kernel when `TRELLIS_SIDECAR=1` on page route |

---

## 5. Slice 3 — Presence gossip

### 5.1 New files (port from fractal-playground, Vue-adapted)

| File | Source reference |
|------|------------------|
| `apps/web/app/lib/presence/identity.ts` | `fractal-playground/lib/presence/identity.ts` |
| `apps/web/app/lib/presence/config.ts` | `relayUrl` from `import.meta.env.VITE_PRESENCE_RELAY_URL` |
| `apps/web/app/lib/presence/use-joined-room.ts` | `useJoinedPresenceRoom` → Vue composable |
| `apps/web/app/lib/presence/use-page-text-sync.ts` | Adapt `use-cell-text-sync.ts` for single `content` slot |
| `apps/web/app/lib/presence/text-editing.ts` | Port caret helpers from `universal-presence/shared/text.ts` |
| `apps/web/app/composables/useTrellisPagePresence.ts` | Wrap joined room; room id: `page:${pageId}` |

### 5.2 Presence room naming

```ts
const presenceRoom = `page:${pageId}` // scoped per page document
const peerId = `${sessionId}-${tabId}` // from sessionStorage, per fractal-playground identity
```

**Relay:** Optional `VITE_PRESENCE_RELAY_URL=ws://localhost:8231/rt` — document in `sidecar-dev.md`; AC-3–5 pass without relay (BroadcastChannel).

### 5.3 Content field: RealtimeText + graph truth

Pattern (fractal-playground spreadsheet cell):

1. **While editing:** `RealtimeText` on channel `page-text:${pageId}` broadcasts live draft.
2. **On debounced blur/idle:** `mut.update({ body: html })` persists to graph.
3. **Remote graph update:** Apply to editor when not focused and RealtimeText not active.
4. **TipTap:** Keep existing TipTap editor; wire `onUpdate` → RealtimeText diff + debounced save. **Do not** add `@tiptap/extension-collaboration` or Yjs.

### 5.4 Replace InstantDB in `usePagePresence` (sidecar branch only)

`apps/web/app/composables/usePagePresence.ts`:

- When `useTrellisSidecar().enabled` → delegate to `useTrellisPagePresence`.
- When disabled → keep existing local tab-only fallback (no behavior change).

### 5.5 Slice 3 AC

| ID | Criterion |
|----|-----------|
| S3-1 | Two tabs, sidecar mode: typing in content shows live draft in tab B before save (AC-4) |
| S3-2 | After debounced save, both tabs show same persisted content (AC-5) |
| S3-3 | `joinPresence` uses `trellis/realtime` only — no new `@instantdb/*` imports |
| S3-4 | `docs/sidecar-dev.md` documents relay opt-in (AC-7) |

---

## 6. Test plan

### 6.1 Automated

| Command | When |
|---------|------|
| `pnpm test` | Always — add `apps/web/app/lib/trellis-sidecar/*.test.ts` for guard/offline subscribe |
| `pnpm build` | AC-1 |
| `pnpm smoke:ws` | AC-2 (sidecar running) |
| `TRELLIS_SIDECAR=1 pnpm smoke:sidecar` | AC-2 |

### 6.2 E2E (new)

File: `apps/web/tests/e2e/sidecar-page-sync.spec.ts`

**Gated:** `test.skip(!process.env.TRELLIS_SIDECAR, 'requires sidecar mode')`

```ts
// Two browser contexts, same page URL
// 1. Context A creates page via API or UI
// 2. Context B navigates to same page
// 3. A edits title → B sees update
// 4. A types in content → B sees live text (data-testid hooks)
```

Add `data-testid="page-title"` and `data-testid="page-content-editor"` to sidecar branch if missing.

### 6.3 Manual QA checklist

1. `just sidecar-init && just sidecar-serve` (terminal 1)
2. `TRELLIS_SIDECAR=1 pnpm dev` (terminal 2)
3. Optional: `node scripts/import-pages-to-sidecar.mjs` for existing UUID
4. Open same page in two tabs → verify AC-3–5
5. Restart with `TRELLIS_SIDECAR` unset → verify Option A unchanged

---

## 7. Files touched (summary)

| Action | Path |
|--------|------|
| **Add** | `app/lib/trellis-sidecar/*` (5–7 modules) |
| **Add** | `app/lib/presence/*` (4–5 modules) |
| **Add** | `app/plugins/trellis-sidecar.client.ts` |
| **Add** | `app/composables/useTrellisSidecar.ts` |
| **Add** | `app/composables/useSidecarPage.ts` |
| **Add** | `app/composables/useTrellisPagePresence.ts` |
| **Add** | `scripts/import-pages-to-sidecar.mjs` |
| **Add** | `tests/e2e/sidecar-page-sync.spec.ts` |
| **Modify** | `app/pages/pages/[id].vue` (sidecar branch) |
| **Modify** | `app/composables/usePagePresence.ts` (delegate) |
| **Modify** | `nuxt.config.ts` (public runtime config) |
| **Modify** | `docs/sidecar-dev.md` (import + relay) |
| **Modify** | `package.json` (trellis version bump) |
| **Do not modify** | `useTrellisEntities`, kernel routes, Option A plugin |

---

## 8. Acceptance criteria (rollup)

Maps to parent WU-OPTION-B-001 AC-1–7:

| AC | Verification |
|----|--------------|
| AC-1 | `TRELLIS_SIDECAR=0`: `pnpm test && pnpm build`; page route unchanged |
| AC-2 | Smokes pass with sidecar up |
| AC-3 | E2E or manual: title sync across tabs |
| AC-4 | E2E or manual: live content draft via RealtimeText |
| AC-5 | E2E or manual: post-save convergence |
| AC-6 | Grep: no new yjs collab / instantdb in sidecar modules |
| AC-7 | `sidecar-dev.md` relay section |

**Executor gate:** All S1-* + S2-* + S3-* before marking impl complete.

---

## 9. Out of scope (explicit)

- Browse grid / `useTrellisEntities` sidecar cutover (WU-OPTION-B-002)
- Cross-browser relay implementation (document only)
- TipTap CRDT / Yjs
- InstantDB presence rooms
- Kernel ↔ sidecar live bidirectional sync
- Platform pages (`usePages` / Instant settings)

---

## 10. Implementation order

```
Slice 1 (shell) → Slice 2 (truth) → Slice 3 (presence) → e2e → docs
```

**Estimated files:** ~15 new, ~5 modified. **Risk hotspot:** trellis vue package resolution + TipTap/RealtimeText integration.

---

## 11. Open decisions (Executor may proceed with defaults)

| Decision | Default |
|----------|---------|
| trellis version vs file link | Try npm `^3.3.0` first |
| `description` field on sidecar pages | Omit in Phase 1; kernel-only |
| Import script | Ship as dev tool; not blocking AC |

No `BLOCKED` — defaults are sufficient.

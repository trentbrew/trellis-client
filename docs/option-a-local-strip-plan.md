# Option A — Local-Only Build (no InstantDB, no auth)

**Goal:** Ship `apps/web` (Nuxt 4 / Vue 3) as a single-user, local-first app on the
existing TQL kernel — no InstantDB cloud, no login/onboarding/permissions — matching
the "no Instant, no auth" posture of `fractal-playground`, while keeping the Nuxt stack
and the existing UI.

**Backend choice:** Keep the existing local backend (`instant-local` localStorage shim
for platform data + TQL kernel via `/api/graph/*` for entities/ontology). We are **not**
swapping in the published `trellis` package + sidecar — that is Option B, deferred.

---

## 1. Why this is mostly subtraction

`apps/web` already runs Instant-free and auth-free under `TRELLIS_DATA_MODE=local`,
which is the **default**:

- `app/plugins/instant.client.ts` only builds the InstantDB `CloudAdapter` when
  `dataMode === 'cloud' && instantAppId`. Otherwise it builds `LocalAdapter`, which
  imports **no `@instantdb`**.
- `LocalAdapter` (`app/lib/data-adapter/local-adapter.ts`): platform data → `instant-local`
  (localStorage InstaQL shim); entities/ontology → TQL kernel via `/api/graph/*`; auth →
  synthetic local user, no login.
- `app/middleware/permissions.global.ts` **early-returns in local mode** — zero gating.
- All components reach data through the `DataAdapter` interface via `useInstantDb()`.
  The backend is swappable behind one seam; components don't change.
- `@instantdb` is imported by only 8 files; the runtime-relevant ones
  (`cloud-adapter.ts`, the mode-gated plugin branch, `server/utils/instant-admin.ts`)
  are all cloud-only.

So the task is **delete the already-optional cloud branch and harden local mode as the
only mode**, not untangle a dependency.

---

## 2. Scope decisions (resolve before starting)

### 2.1 Cloud-coupled server features
Several server routes/utilities depend on Instant **admin** (cloud-only). In local mode
they are dead or broken and must be **dropped or stubbed**:

- `server/utils/instant-admin.ts` (delete)
- `server/utils/notification-email.ts`, `workflow-tools.ts`, `workflow-executor.ts`
  (import instant-admin → stub or remove)
- `server/api/{workflows,notifications,invite,integrations,agent,llm,chat}/*`
  (these are cloud/SaaS features: Gmail, Google Calendar, GitHub, workflows, invites)

**Decision needed:** which of these survive as local features?
- **Recommended default:** drop `invite`, `notifications`, `integrations`, `workflows`
  for the first cut (they are multi-user/cloud SaaS). Keep `graph`, `storage`, `platform`,
  and optionally `llm`/`chat`/`agent` if you want local AI (they need an API key, not Instant).

### 2.2 Multi-tenancy / orgs
Instant cloud carried org/app/membership. Local mode uses `instant-local` for platform
data and `useInstantData.ts` has an **auto-create org/app fallback**. For single-user
local we collapse to **one implicit workspace** — no org switching, no members.

### 2.3 Identity
One static local user (from `LocalAdapter.auth`). `demoUsers`/`switchUser` (dev multi-user
sim, used by `AppUserAvatar.vue`) → keep as dev-only or hardcode a single identity.

---

## 3. Target architecture (after)

```
Browser (Nuxt 4 SPA/SSR)
  └─ useInstantDb() → LocalAdapter (only adapter)
       ├─ platform data  → instant-local (localStorage)
       └─ entities/ont.   → /api/graph/* (Nitro) → TQL kernel (@turtle.tech/tql, SQLite)
  └─ auth = static local user (no login, no middleware gate)
```

No `@instantdb/*`, no `instant.schema.ts`/`instant.perms.ts`, no auth/onboarding/invite
pages, no permission middleware.

---

## 4. Work breakdown

### Phase 0 — Branch + baseline (0.5 day)
- [ ] Branch `feat/local-only` off current `apps/web`.
- [ ] Capture baseline: `pnpm --filter @trellis/web build` + `vitest run` green before changes.
- [ ] Confirm `TRELLIS_DATA_MODE` unset → app boots in local mode, basic flows work.

### Phase 1 — Pin local mode (0.5 day)
- [ ] `nuxt.config`: remove `instantAppId` (both private + `public`); hardcode
      `public.dataMode = 'local'` or delete the runtime knob entirely.
- [ ] `app/plugins/instant.client.ts`: delete the `cloud` branch + `createCloudAdapter`
      import + `instant.schema` import; always `createLocalAdapter`.
- [ ] Verify boot + console shows `DataAdapter active (mode: local …)`.

### Phase 2 — Remove InstantDB (1 day)
- [ ] Delete `app/lib/data-adapter/cloud-adapter.ts` (+ its test references).
- [ ] Delete `server/utils/instant-admin.ts`.
- [ ] Delete `instant.schema.ts`, `instant.perms.ts`.
- [ ] Remove deps: `@instantdb/core`, `@instantdb/admin`, `instant-cli` (root + web).
- [ ] `data-adapter/index.ts`: drop `createCloudAdapter` / `CloudAdapterOptions` exports.
- [ ] `data-adapter/types.ts`: trim cloud-only surface if desired (`_rawDb`, magic-code
      auth methods) — or leave as no-ops to minimize churn. **Prefer leaving the interface
      shape**; only delete the cloud *implementation*.
- [ ] Rebuild; fix import/type breakage (mechanical).

### Phase 3 — Neutralize auth (1–1.5 days)
- [ ] `useInstantAuth.ts`: return a static local user; `signOut` → no-op (or reset local
      store). Keep the same return shape so 53 consumers compile unchanged.
- [ ] `useUserRole.ts`: return a constant elevated role (`admin`/owner) so any residual
      role checks pass.
- [ ] Delete auth surface: `app/pages/auth/*`, `app/pages/onboarding.vue`,
      `app/pages/invite/*`, `app/pages/welcome/*`, `app/pages/workspace/welcome.vue`
      (keep welcome only if it's a useful empty-state landing).
- [ ] Delete `app/middleware/permissions.global.ts` (already no-ops in local mode; removing
      it drops the dead `~/lib/permissions` + `tql-routes` coupling).
- [ ] Fix root route / default redirect to land directly in the workspace (no auth gate).
- [ ] `AppUserAvatar.vue`: render the static user; gate `switchUser`/`demoUsers` behind
      `import.meta.dev` or remove.

### Phase 4 — Prune cloud-coupled server features (1–2 days, scope-dependent)
- [ ] Per §2.1 decision, delete/stub: `server/api/{invite,notifications,workflows,
      integrations}` and the utils that import instant-admin (`notification-email`,
      `workflow-tools`, `workflow-executor`).
- [ ] Remove now-dead client pages/components for dropped features (settings → members,
      integrations, marketplace, branding, etc.).
- [ ] Update nav/sidebar config (`app/config/routes`) to remove dropped routes.
- [ ] Keep `graph`, `storage`, `platform`; decide on `llm`/`chat`/`agent` (API-key only,
      no Instant).

### Phase 5 — Cleanup + verify (1 day)
- [ ] `validate:routes` script: update or relax for removed routes.
- [ ] `vitest run`: fix/remove `data-adapter.test.ts` cloud cases + auth tests.
- [ ] Grep sweep: `@instantdb`, `instantAppId`, `dataMode === 'cloud'`, `useUserRole`
      assumptions, `permissions.global` → all resolved.
- [ ] `pnpm --filter @trellis/web build` green; manual smoke of core flows
      (collections, graph, editor, boards) against local TQL kernel.
- [ ] Optional: bring in clean primitives from `realtime-nuxt/client-nuxt` (same
      reka-ui/ui-thing stack) where the stripped app left rough empty states.

---

## 5. Risk / watch-list

- **`useInstantData.ts` (1129 lines)** is the highest-risk file — it owns the org/app
  auto-create fallback and the platform query surface. Don't rewrite; just ensure the
  local single-workspace path is the only branch exercised.
- **Hidden cloud assumptions** in components (role gating, org switching, presence via
  `_rawDb`). Grep for `_rawDb`, `useUserRole`, org-slug routing (`/w/:orgSlug`).
- **`/w/:orgSlug` routing** — local single-tenant should drop the org prefix or pin a
  constant slug; check `getCleanPath` / router options.
- **Presence/collaboration** (tiptap `extension-collaboration`, yjs) — verify it doesn't
  silently depend on Instant rooms (`_rawDb`). If it does, it's out of scope for A (lands
  in B) — disable for the first cut.
- **Storage** — `/api/storage/init-local` must create the local files dir; confirm on a
  clean machine.

---

## 6. Effort estimate

| Phase | Est. |
|---|---|
| 0 Branch + baseline | 0.5d |
| 1 Pin local mode | 0.5d |
| 2 Remove InstantDB | 1d |
| 3 Neutralize auth | 1–1.5d |
| 4 Prune cloud server features | 1–2d |
| 5 Cleanup + verify | 1d |
| **Total** | **~5–6.5 days** |

Lower bound if we keep cloud-coupled routes as harmless dead code rather than excising
them; upper bound if we fully prune and tidy nav/empty states.

---

## 7. Definition of done

- App boots with no env vars, no login, straight into the workspace.
- No `@instantdb/*` in the dependency tree; `grep -r @instantdb app server` is clean.
- Core flows (collections, entities, graph, editor, boards) work against the local TQL
  kernel.
- `build` + `vitest run` green.
- Option B (swap to `trellis` pkg + sidecar) remains a clean future step behind the
  unchanged `DataAdapter` seam.

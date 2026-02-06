# Data Layer Architecture

## Overview

The application uses a **local-first InstantDB adapter** (`instant-local`) during development. This adapter provides the same API surface as `@instantdb/core`, enabling a seamless migration path to the real InstantDB cloud when ready.

## Current Stack

```
┌─────────────────────────────────────────────────────┐
│  Composables / Pages / Libs                         │
│  useInstantData · useCollectionData · useInstantAuth│
│  useUserRole · useTrellisAdapter · demoSeed · etc.  │
├─────────────────────────────────────────────────────┤
│  useInstantDb()  →  $instantDb (Nuxt plugin)        │
├─────────────────────────────────────────────────────┤
│  instant-local adapter                              │
│  ┌────────────┬────────────┬────────────┐           │
│  │  store.ts  │  query.ts  │   tx.ts    │           │
│  │  (Map +    │  (InstaQL  │  (Proxy tx │           │
│  │  localStorage)│  engine)│  builder)  │           │
│  └────────────┴────────────┴────────────┘           │
│  index.ts — createLocalInstantDB() factory          │
├─────────────────────────────────────────────────────┤
│  localStorage (persistence)                         │
└─────────────────────────────────────────────────────┘
```

## Key Files

| File                                  | Purpose                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/lib/instant-local/store.ts`      | In-memory `Map<ns, Map<id, entity>>` store with link tracking, subscription management, and `localStorage` persistence                                                     |
| `app/lib/instant-local/query.ts`      | InstaQL query engine — `where`, operators (`$in`, `$ne`, `$gt`, `$lt`, `$like`, `$isNull`), logical (`and`/`or`), `order`, `limit`/`offset`, nested association resolution |
| `app/lib/instant-local/tx.ts`         | Proxy-based transaction builder matching `db.tx.NS[id].action(data)` pattern, plus `processTransactions` for `create`/`update`/`merge`/`delete`/`link`/`unlink`            |
| `app/lib/instant-local/index.ts`      | `createLocalInstantDB()` factory — the public API entry point                                                                                                              |
| `app/plugins/instant.client.ts`       | Nuxt plugin that initializes the adapter and seeds ECMS + personal data                                                                                                    |
| `app/composables/useCalendarItems.ts` | Reactive composable for personal calendar items — `items`, `byType()`, `create()`, `update()`, `remove()`                                                                  |
| `app/lib/personalSeedData.ts`         | 25 seed calendar items (tasks, events, payments, notes) with relative dates                                                                                                |
| `instant.schema.ts`                   | Entity + link definitions (shared with future real InstantDB)                                                                                                              |

## API Contract

All consumers use these methods — they work identically with both the local adapter and the real InstantDB SDK:

```ts
// Reactive query (re-fires on relevant transacts)
const unsub = db.subscribeQuery(
  { goals: { $: { where: { status: 'active' } } } },
  (result) => {
    // result.data.goals = [...]
  },
);

// One-shot query
const { data } = await db.queryOnce({
  settings: { $: { where: { settingKey: 'theme' } } },
});

// Transactions (atomic)
await db.transact([
  db.tx.goals[id()].create({ title: 'New goal', priority: 1 }),
  db.tx.goals[existingId].update({ status: 'done' }),
  db.tx.goals[existingId].link({ todos: todoId }),
]);

// Auth
db.subscribeAuth((auth) => {
  /* auth.user */
});
await db.auth.signOut();
```

## Schema

Entity definitions live in `instant.schema.ts` at the project root. The schema uses a mock builder that mirrors InstantDB's `i.entity()` / `i.graph()` pattern. Key namespaces:

- **organizations** — Workspaces / tenants
- **applications** — Apps within an org
- **collections** — Data collections within an app
- **settings** — Key-value settings (user prefs, app config, schemas)
- **facilities** — ECMS physical locations
- **facilityMembers** — User ↔ facility role assignments
- **calendarItems** — Tasks, events, payments, notes (polymorphic)

## Migration Path

When ready to connect to InstantDB cloud:

1. `pnpm add @instantdb/core`
2. In `instant.client.ts`: replace `createLocalInstantDB()` with `init({ appId, schema })`
3. Remove dev-only helpers (`demoUsers`, `switchUser`, `_store`)
4. Delete `app/lib/instant-local/` directory
5. **Zero changes** to composables, pages, or libs

## Persistence Details

| Key                         | Contents                        |
| --------------------------- | ------------------------------- |
| `platform-sandbox:entities` | All entity data (JSON)          |
| `platform-sandbox:links`    | Bidirectional link graph (JSON) |
| `platform-sandbox:auth`     | Current demo user (JSON)        |

Writes are debounced (50ms). Call `db._store.clear()` in the browser console to reset.

## Related Documentation

- **[instant-local README](../../apps/web/app/lib/instant-local/README.md)** — Detailed adapter docs, query/tx examples, debugging tips
- **[ECMS Data Guide](../data/ECMS_DATA_GUIDE.md)** — ECMS-specific entity relationships
- **[Seeding](../data/SEEDING.md)** — Demo data seeding process

# instant-local — Local-First InstantDB Adapter

> Drop-in replacement for `@instantdb/core` that runs entirely in-memory with
> `localStorage` persistence. Zero network calls, zero server dependency.

## Why?

During early development we need a reliable, debuggable data layer that:

1. **Works offline** — no remote InstantDB instance required.
2. **Matches the real API** — composables, pages, and libs use the same
   `db.subscribeQuery` / `db.transact` / `db.tx` surface, so migration is
   a one-line swap.
3. **Persists across reloads** — data survives page refreshes via
   `localStorage`.
4. **Supports reactive subscriptions** — `subscribeQuery` re-fires whenever
   a `transact` touches a relevant namespace.

---

## File Structure

```
app/lib/instant-local/
├── store.ts    # In-memory Map store, links, subscriptions, localStorage I/O
├── query.ts    # InstaQL query engine (where, order, limit, associations)
├── tx.ts       # Proxy-based tx builder + transaction processor
├── index.ts    # createLocalInstantDB() factory — the public API
└── README.md   # You are here
```

## API Surface

The adapter exposes the same methods as a real InstantDB `db` instance:

| Method | Description |
|---|---|
| `db.subscribeQuery(query, cb)` | Reactive query — `cb` fires on initial data and after every relevant `transact` |
| `db.queryOnce(query)` | One-shot query — returns `Promise<{ data }>` |
| `db.transact(chunks)` | Apply transaction chunks atomically, persist, notify subscribers |
| `db.tx` | Proxy object: `db.tx.NS[id].create(data).link({label: targetId})` |
| `db.subscribeAuth(cb)` | Auth subscription — fires with `{ user }` |
| `db.auth.signOut()` | Sign out current user |
| `db.auth.signInWithIdToken(args)` | Sign in (demo mode) |
| `db.getAuth()` | Get current user (async) |
| `id()` | Generate a UUID (exported from index.ts) |

### Dev-only helpers (not in real InstantDB)

| Method | Description |
|---|---|
| `db.demoUsers` | Map of demo user objects (`superadmin`, `admin`, `manager`, `guest`) |
| `db.switchUser(key)` | Switch to a different demo user and reload |
| `db._store` | Direct access to the `LocalStore` instance (for seeding/debugging) |

---

## Query Engine (InstaQL)

Supports the same query language as InstantDB:

```ts
// Fetch all goals
db.queryOnce({ goals: {} })

// Where clause (equality)
db.queryOnce({ goals: { $: { where: { status: 'active' } } } })

// Where clause (operators)
db.queryOnce({ goals: { $: { where: { priority: { $gt: 2 } } } } })

// Logical operators
db.queryOnce({ goals: { $: { where: { or: [{ status: 'active' }, { priority: { $gte: 5 } }] } } } })

// Ordering + pagination
db.queryOnce({ goals: { $: { order: { createdAt: 'desc' }, limit: 10, offset: 20 } } })

// Nested associations (requires schema links)
db.queryOnce({ goals: { todos: {} } })
```

### Supported operators

| Operator | Description |
|---|---|
| `$in` | Value in array |
| `$ne` | Not equal |
| `$gt` / `$gte` | Greater than / greater-or-equal |
| `$lt` / `$lte` | Less than / less-or-equal |
| `$like` | SQL-like pattern (`%` = wildcard, `_` = single char) |
| `$isNull` | `true` = value is null/undefined, `false` = value exists |
| `and` | All conditions must match |
| `or` | Any condition must match |

---

## Transaction Proxy (InstaML)

Matches InstantDB's chainable transaction API:

```ts
import { id } from '~/lib/instant-local'

// Create
await db.transact([db.tx.goals[id()].create({ title: 'Ship v2', priority: 1 })])

// Update (upsert by default)
await db.transact([db.tx.goals[goalId].update({ title: 'Ship v2.1' })])

// Merge (deep object merge; null deletes keys)
await db.transact([db.tx.goals[goalId].merge({ metadata: { color: 'blue' } })])

// Delete
await db.transact([db.tx.goals[goalId].delete()])

// Link / Unlink (bidirectional via schema link definitions)
await db.transact([db.tx.goals[goalId].link({ todos: todoId })])
await db.transact([db.tx.goals[goalId].unlink({ todos: todoId })])

// Chaining
await db.transact([
  db.tx.goals[id()].create({ title: 'New goal' }).link({ todos: todoId }),
])

// Batch (atomic)
await db.transact([
  db.tx.goals[id()].create({ title: 'Goal A' }),
  db.tx.goals[id()].create({ title: 'Goal B' }),
  db.tx.todos[id()].create({ title: 'Todo 1' }),
])
```

---

## Plugin Usage

The adapter is initialized in `app/plugins/instant.client.ts`:

```ts
import { createLocalInstantDB } from '~/lib/instant-local'
import schema from '~~/instant.schema'

export default defineNuxtPlugin(() => {
  const db = createLocalInstantDB({
    storageKey: 'platform-sandbox',
    schema,       // only `links` are used — for association resolution
    verbose: false, // set true to log all operations
  })

  return { provide: { instantDb: db } }
})
```

Composables access it via:

```ts
const db = useInstantDb()  // returns $instantDb from Nuxt plugin
```

---

## Persistence

- **Entities** → `localStorage['platform-sandbox:entities']` (JSON)
- **Links** → `localStorage['platform-sandbox:links']` (JSON)
- **Auth** → `localStorage['platform-sandbox:auth']` (JSON)
- Writes are **debounced** (50ms) to batch rapid transacts.
- Call `db._store.clear()` to wipe all data and start fresh.

---

## Migration to Real InstantDB

When ready to connect to the real InstantDB cloud:

### 1. Install the SDK

```bash
pnpm add @instantdb/core
# or @instantdb/vue for Vue-specific helpers
```

### 2. Update the plugin

```diff
- import { createLocalInstantDB } from '~/lib/instant-local'
+ import { init } from '@instantdb/core'
  import schema from '~~/instant.schema'

  export default defineNuxtPlugin(() => {
-   const db = createLocalInstantDB({
-     storageKey: 'platform-sandbox',
-     schema,
-   })
+   const db = init({
+     appId: process.env.INSTANT_APP_ID!,
+     schema,
+   })

    return { provide: { instantDb: db } }
  })
```

### 3. Clean up

- Delete `app/lib/instant-local/` directory entirely.
- Remove `db.demoUsers` / `db.switchUser` references (dev-only helpers).
- Remove `db._store` references if any exist outside the plugin.

### 4. Zero consumer changes

All composables (`useInstantDb`, `useInstantAuth`, `useInstantData`,
`useCollectionData`, etc.), pages, and libs continue to work unchanged —
they only use the standard `db.subscribeQuery` / `db.transact` / `db.tx`
surface.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| `subscribeAuth` fires synchronously | Matches the pattern `useInstantAuth` depends on — callback must fire before the composable returns |
| `subscribeQuery` fires via microtask | Matches real InstantDB's async initial-data delivery |
| `update()` is upsert by default | Matches real InstantDB behavior; opt out with `{ upsert: false }` |
| `merge()` deep-merges; `null` deletes keys | Matches real InstantDB's merge semantics |
| Links are bidirectional | Uses schema `links` definitions to auto-create reverse links |
| Persistence is debounced 50ms | Prevents thrashing on batch transacts |
| No IndexedDB | localStorage is simpler and sufficient for dev; real InstantDB handles its own caching |

---

## Debugging

```ts
// In browser console:
const db = useNuxtApp().$instantDb

// Inspect all entities in a namespace
db._store.getAll('organizations')

// Inspect links
db._store.getLinks('goals', 'goal-123', 'todos')

// Enable verbose logging
// In instant.client.ts, set verbose: true

// Clear all data and start fresh
db._store.clear()
location.reload()
```

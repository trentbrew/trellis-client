# Dexie → InstantDB Migration Guide

## Why Remove Dexie?

We had a redundant architecture:

- **Dexie** (234 lines) - Local IndexedDB wrapper
- **InstantDB** - Configured but barely used
- **Manual sync** - Components manually synced Dexie → InstantDB
- **No reactivity** - Changes required manual refresh

InstantDB already provides:

- ✅ Local-first storage (IndexedDB internally)
- ✅ Real-time reactivity via subscriptions
- ✅ Optimistic updates
- ✅ Conflict resolution
- ✅ Cross-tab sync
- ✅ Offline support with automatic retry

## Migration Steps

### 1. Replace `useDatabase` with `useInstantData`

**Before:**

```typescript
const { collections: collectionApi, currentApp } = useDatabase();
const collection = await collectionApi.getBySlug(appId, slug);
// No reactivity - manual refresh needed
```

**After:**

```typescript
const { collections, getCollectionBySlug, updateCollection } = useInstantData();
const collection = computed(() =>
  getCollectionBySlug(currentApp.value.id, slug),
);
// ✨ Automatically reactive!
```

### 2. CRUD Operations Migration

**Before (Dexie):**

```typescript
await collectionApi.update(id, { title: 'New Title', icon: 'lucide:star' });
await routes.loadCollections(); // Manual refresh
```

**After (InstantDB):**

```typescript
await updateCollection(id, { title: 'New Title', icon: 'lucide:star' });
// UI updates automatically - no manual refresh needed!
```

### 3. Component Updates

**Collections Page:**

- Replace `collectionApi.getBySlug()` with `getCollectionBySlug()`
- Remove `loadCollection()` function
- Use `computed()` for reactive collection reference

**AppSidebar:**

- Remove `routes.loadCollections()` calls
- Collections automatically update from `useInstantData()`

**AppHeader:**

- Same pattern - use `getCollectionBySlug()` instead of manual queries

### 4. Remove Dexie Files

Delete:

- `app/lib/database.ts` (234 lines)
- `app/composables/useDatabase.ts` (156 lines)
- `app/plugins/database.client.ts`

Update `package.json`:

```bash
pnpm remove dexie
```

### 5. Update Middleware

**Before:**

```typescript
await db.clearAllTables()
await db.settings.put(...)
```

**After:**

```typescript
// InstantDB handles this automatically
// Just use transact() for writes
```

## Files to Update

### High Priority (Core Data)

- [ ] `app/pages/collections/[slug].vue` - Collection detail page
- [ ] `app/components/AppSidebar.vue` - Sidebar with collection list
- [ ] `app/components/AppHeader.vue` - Header with published toggle
- [ ] `app/composables/useRoutes.ts` - Route config with collections

### Medium Priority (Management)

- [ ] `app/components/CollectionCreateModal.vue` - Create collections
- [ ] `app/components/OrgSwitcher.vue` - Org management
- [ ] `app/components/AppSwitcher.vue` - App management

### Low Priority (Settings)

- [ ] `app/middleware/auth.global.ts` - Auth middleware
- [ ] `app/pages/onboarding.vue` - Onboarding flow

## Testing Checklist

After migration, verify:

- [ ] Changing collection icon updates sidebar immediately
- [ ] Changing collection title updates sidebar immediately
- [ ] Published toggle in header persists
- [ ] Pin button adds/removes from pinned section
- [ ] Changes sync across browser tabs in real-time
- [ ] Offline changes queue and sync when reconnected
- [ ] No Dexie imports remain in codebase

## Rollback Plan

If issues arise:

1. Revert `useInstantData.ts` changes
2. Restore `useDatabase.ts` from git
3. Re-add dexie dependency
4. File issue with details of what broke

## Benefits After Migration

1. **Real-time sync** - Icon/title changes appear everywhere instantly
2. **Simpler code** - ~400 lines of Dexie boilerplate removed
3. **Better DX** - No manual refresh calls needed
4. **Cross-tab sync** - Changes in one tab appear in others
5. **Offline-first** - InstantDB handles offline/online automatically

## Performance Notes

InstantDB subscriptions are efficient:

- Only queries data for current org/app
- Batches updates to minimize re-renders
- Uses IndexedDB cache for instant initial load
- WebSocket for real-time updates (falls back to polling)

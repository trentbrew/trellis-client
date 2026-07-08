# Spec: Browse Convergence Phase 3d — Collection record ETL + graph cutover

**Parent:** `.agent/plans/WU-BROWSE-P3-spec.md` · **Requires:** 3b-1 + 3c shipped  
**Status:** 3d-1 script shipped — **human ack required** before cutover

---

## Problem

InstantDB database collections store records as JSON-LD `trellis:Record` nodes in `collection.content`. User ontologies (3c) exist but **records are not graph entities** — browse at `/workspace/browse/:slug` shows ontology shell with 0 records unless entities were created separately.

## Goal

One-time (per collection) migration: JSON-LD records → `entity:` nodes typed per collection slug ontology. After cutover, collection page reads/writes via graph path; InstantDB `content` becomes read-only archive.

## Non-goals

- Removing InstantDB `collections` table (Phase 4+)
- Real-time bidirectional sync during migration
- Migrating non-`database` collection types

---

## Record mapping

| Source | Target |
|--------|--------|
| `trellis:record/{uuid}` `@id` | Manifest → `entity:{slug}-{shortId}` or preserve uuid suffix |
| JSON-LD field values | `data.{ontologyFieldName}` on entity |
| Collection slug | `data.type` = normalized ontology slug |
| Collection title field | `data.title` (required) |

Use manifest file: `{ collectionId, slug, records: [{ jsonLdId, entityId }] }`.

---

## Implementation slices

### 3d-1 — Migration script (read-only default)

**File:** `apps/web/scripts/migrate-collection-records-to-graph.ts`

```bash
bun apps/web/scripts/migrate-collection-records-to-graph.ts --collection-id <id> --dry-run
bun apps/web/scripts/migrate-collection-records-to-graph.ts --collection-id <id> --agent-id cursor
```

- Parse `collection.content` JSON-LD
- Map fields via `collection-schema-to-ontology` field names
- `--dry-run`: print counts + sample entity payloads
- Live: POST `/api/graph/mutate` createNode per record
- Write manifest to `.agent/migrations/collection-{id}.json`

### 3d-2 — Cutover flag

**File:** `apps/web/app/lib/instantDataMigrations.ts` or collection settings key `collection:{id}:migratedToGraph: true`

**File:** `apps/web/app/pages/collections/[slug].vue`

- When migrated: show banner "Records served from graph"; disable JSON-LD record edits
- Optional redirect to `/workspace/browse/{slug}` for record CRUD

### 3d-3 — Rollback doc

Document in AGENTS.md: restore from manifest + delete created entities by id list.

---

## AC

- [ ] `--dry-run` accurate record count
- [ ] Migrated collection entities queryable: `FIND entity AS ?e WHERE ?e.type = "{slug}"`
- [ ] InstantDB content untouched (archive)
- [ ] No auto-cutover — human sets flag after verifying manifest

---

## Risks

- Field name drift between JSON-LD keys and slugified ontology fields
- Duplicate migration without idempotent keys
- Large collections → batch mutate + progress log

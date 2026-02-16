# Global Undo/Redo Architecture

> **Status**: Design · **Author**: Cascade · **Date**: 2026-02-15

---

## Overview

A centralized, input-agnostic undo/redo system for Trellis using the **Command Pattern**. Every mutation — whether triggered by mouse, keyboard, or API — registers a reversible command with a global history manager. The history powers `⌘Z`/`⌘⇧Z` shortcuts, a visual History Panel, and optionally feeds into the persistent activity log.

---

## Goals

1. **Universal** — covers entity CRUD, page config, grid layout, and future mutation surfaces
2. **Input-agnostic** — mouse clicks, drag-drop, keyboard, programmatic calls all go through the same path
3. **Labeled** — every action has a human-readable description for UI display and toasts
4. **Visualizable** — powers a History Panel (like Photoshop) with click-to-jump
5. **Non-breaking** — existing composables opt in incrementally; no big-bang migration
6. **Scoped** — supports scope tags so context-specific undo is possible (e.g. grid-only undo when grid is focused)

---

## Architecture

```
  User action (mouse / keyboard / API / agent)
       │
       ▼
  Composable (useEntities, useGridLayout, usePages, ...)
       │
       ▼
  useCommandHistory.execute(command)
       │
       ├──→ command.execute()            ← performs the mutation
       ├──→ push to undoStack            ← powers ⌘Z / ⌘⇧Z
       ├──→ notify history panel          ← powers visual timeline
       └──→ (optional) write to          ← powers persistent activity log
            mutation log / SSE
```

### Three Tiers of History

| Tier | Scope | Storage | Purpose |
|------|-------|---------|---------|
| **Session** | Current tab, in-memory | `ref<Command[]>` | Instant ⌘Z/⌘⇧Z, History Panel |
| **Mutation Log** | All agents, all sessions | TQL `/api/graph/log` | Persistent audit trail |
| **Activity Feed** | Per-entity | Entity activity/comments | "Cascade moved this to Project X" |

Tier 1 is the core deliverable. Tiers 2–3 are opt-in extensions that read from the same command stream.

---

## Command Interface

```typescript
interface Command {
  /** Unique identifier */
  id: string

  /** Human-readable label, e.g. "Delete task: Deploy v2" */
  label: string

  /** Optional icon for History Panel, e.g. "lucide:trash-2" */
  icon?: string

  /** Scope tag for context-aware undo, e.g. "grid", "entity", "page" */
  scope?: CommandScope

  /** Optional entity ID for linking to activity feed */
  entityId?: string

  /** Agent or user who triggered this, e.g. "cascade", "user" */
  agentId?: string

  /** Timestamp (Date.now()) */
  timestamp: number

  /** Perform the mutation */
  execute: () => void | Promise<void>

  /** Reverse the mutation */
  undo: () => void | Promise<void>
}

type CommandScope = 'grid' | 'entity' | 'page' | 'global'
```

### Design Decisions

- **`execute` and `undo` are closures** — they capture all necessary state at creation time. No external state lookup needed during replay.
- **Commands are synchronous by default** — `Promise<void>` is supported for async mutations (API calls) but most local state changes are sync.
- **Labels are present-tense verbs** — "Move Tasks view to row 2" not "Moved Tasks view".
- **`scope`** enables context-aware behavior: when the grid editor is focused, ⌘Z could undo only grid actions. When nothing specific is focused, it undoes globally.

---

## Composable: `useCommandHistory`

```typescript
// composables/useCommandHistory.ts

const MAX_HISTORY = 100

// Singleton state (shared across all consumers via composable)
const commands = ref<Command[]>([])
const pointer = ref(-1) // index of last executed command

const canUndo = computed(() => pointer.value >= 0)
const canRedo = computed(() => pointer.value < commands.value.length - 1)

const lastCommand = computed(() =>
  pointer.value >= 0 ? commands.value[pointer.value] : null
)
const nextCommand = computed(() =>
  pointer.value < commands.value.length - 1
    ? commands.value[pointer.value + 1]
    : null
)

/** Execute a command and push it onto the history stack. */
function execute(cmd: Command): void {
  // Trim any redo history beyond current pointer
  commands.value = commands.value.slice(0, pointer.value + 1)

  // Execute the command
  cmd.execute()

  // Push onto stack
  commands.value.push(cmd)
  pointer.value++

  // Cap history size
  if (commands.value.length > MAX_HISTORY) {
    commands.value.shift()
    pointer.value--
  }
}

/** Undo the last executed command. */
function undo(scope?: CommandScope): void {
  if (!canUndo.value) return

  if (scope) {
    // Find the nearest command matching this scope
    for (let i = pointer.value; i >= 0; i--) {
      if (commands.value[i].scope === scope || !commands.value[i].scope) {
        commands.value[i].undo()
        // Move pointer and shift commands accordingly
        // (simplified — full impl handles non-contiguous scoped undo)
        pointer.value = i - 1
        return
      }
    }
  } else {
    commands.value[pointer.value].undo()
    pointer.value--
  }
}

/** Redo the next undone command. */
function redo(scope?: CommandScope): void {
  if (!canRedo.value) return

  if (scope) {
    for (let i = pointer.value + 1; i < commands.value.length; i++) {
      if (commands.value[i].scope === scope || !commands.value[i].scope) {
        commands.value[i].execute()
        pointer.value = i
        return
      }
    }
  } else {
    pointer.value++
    commands.value[pointer.value].execute()
  }
}

/** Jump to a specific point in history (click-to-jump). */
function jumpTo(targetIndex: number): void {
  if (targetIndex === pointer.value) return
  if (targetIndex < pointer.value) {
    // Undo forward commands in reverse order
    for (let i = pointer.value; i > targetIndex; i--) {
      commands.value[i].undo()
    }
  } else {
    // Redo commands in order
    for (let i = pointer.value + 1; i <= targetIndex; i++) {
      commands.value[i].execute()
    }
  }
  pointer.value = targetIndex
}

/** Clear all history (e.g. on page navigation). */
function clear(): void {
  commands.value = []
  pointer.value = -1
}

/** Read-only view of the history for the History Panel. */
const history = computed(() =>
  commands.value.map((cmd, i) => ({
    id: cmd.id,
    label: cmd.label,
    icon: cmd.icon,
    scope: cmd.scope,
    timestamp: cmd.timestamp,
    isCurrent: i === pointer.value,
    isUndone: i > pointer.value,
  }))
)
```

### Singleton Pattern

The composable uses module-level `ref`s so every consumer shares the same history. This is the standard Vue 3 pattern for global state without Pinia:

```typescript
export function useCommandHistory() {
  return {
    // State (read-only externally)
    history,
    canUndo,
    canRedo,
    lastCommand,
    nextCommand,

    // Actions
    execute,
    undo,
    redo,
    jumpTo,
    clear,
  }
}
```

---

## Integration Points

### 1. Grid Layout (`useGridLayout.ts`)

**Current**: Local undo/redo with JSON snapshot arrays.
**Migration**: Replace `_pushUndo()` calls with `commandHistory.execute()`.

```typescript
// Before (current snapshot approach)
function removeView(id: string): void {
  _pushUndo()
  views.value = views.value.filter((v) => v.id !== id)
  _compact()
  _persist()
}

// After (command pattern)
function removeView(id: string): void {
  const snapshot = JSON.parse(JSON.stringify(
    views.value.find(v => v.id === id)
  ))
  const viewIndex = views.value.findIndex(v => v.id === id)

  commandHistory.execute({
    id: crypto.randomUUID(),
    label: `Remove "${snapshot.title || snapshot.dataSource || 'view'}"`,
    icon: 'lucide:trash-2',
    scope: 'grid',
    timestamp: Date.now(),
    execute: () => {
      views.value = views.value.filter((v) => v.id !== id)
      _compact()
      _persist()
    },
    undo: () => {
      views.value.splice(viewIndex, 0, JSON.parse(JSON.stringify(snapshot)))
      _compact()
      _persist()
    },
  })
}
```

**All grid mutations to migrate:**
- `addView` / `addViewAt` / `addUnconfiguredView` — undo = remove the created view
- `removeView` — undo = re-insert the snapshot at original index
- `moveView` — undo = move back to original position
- `resizeView` — undo = resize back to original dimensions
- `updateView` — undo = restore previous field values
- `applyPreset` — undo = restore previous views array
- `clearAll` — undo = restore previous views array

### 2. Entity CRUD (`useEntities.ts` / `useTrellisEntities.ts`)

```typescript
// Create entity
function createEntity(entity: Entity): void {
  commandHistory.execute({
    id: crypto.randomUUID(),
    label: `Create ${entity.type}: "${entity.title}"`,
    icon: getEntityTypeConfig(entity.type)?.icon,
    scope: 'entity',
    entityId: entity.id,
    timestamp: Date.now(),
    execute: () => _doCreate(entity),
    undo: () => _doDelete(entity.id),
  })
}

// Delete entity
function deleteEntity(id: string): void {
  const snapshot = JSON.parse(JSON.stringify(
    entities.value.find(e => e.id === id)
  ))

  commandHistory.execute({
    id: crypto.randomUUID(),
    label: `Delete ${snapshot.type}: "${snapshot.title}"`,
    icon: 'lucide:trash-2',
    scope: 'entity',
    entityId: id,
    timestamp: Date.now(),
    execute: () => _doDelete(id),
    undo: () => _doCreate(snapshot),
  })
}

// Update entity field
function updateEntityField(id: string, field: string, newValue: any): void {
  const entity = entities.value.find(e => e.id === id)
  const oldValue = entity[field]

  commandHistory.execute({
    id: crypto.randomUUID(),
    label: `Update ${field} on "${entity.title}"`,
    scope: 'entity',
    entityId: id,
    timestamp: Date.now(),
    execute: () => _doUpdate(id, { [field]: newValue }),
    undo: () => _doUpdate(id, { [field]: oldValue }),
  })
}
```

### 3. Page Config (`usePages.ts`)

```typescript
function updatePageConfig(pageId: string, updates: Partial<PageConfig>): void {
  const page = pages.value.find(p => p.id === pageId)
  const oldValues = Object.fromEntries(
    Object.keys(updates).map(k => [k, page[k]])
  )

  commandHistory.execute({
    id: crypto.randomUUID(),
    label: `Update page "${page.title}"`,
    icon: 'lucide:file-edit',
    scope: 'page',
    timestamp: Date.now(),
    execute: () => _doUpdatePage(pageId, updates),
    undo: () => _doUpdatePage(pageId, oldValues),
  })
}
```

---

## Keyboard Shortcuts

### Current (GridEditor-scoped)

```typescript
// GridEditor.vue — handles ⌘Z / ⌘⇧Z for grid only
document.addEventListener('keydown', handleKeydown)
```

### Global (Migration)

Move keyboard handling to a **Nuxt plugin** or the **default layout** so it works everywhere:

```typescript
// plugins/commandHistory.client.ts  (or layouts/default.vue)
export default defineNuxtPlugin(() => {
  const { undo, redo } = useCommandHistory()

  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey
    if (!isMod || e.key.toLowerCase() !== 'z') return

    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if ((e.target as HTMLElement)?.isContentEditable) return

    e.preventDefault()
    e.shiftKey ? redo() : undo()
  })
})
```

### Scoped Undo (Future Enhancement)

When the grid editor is focused, ⌘Z could undo only `scope: 'grid'` commands. This requires tracking the active "undo context":

```typescript
const activeScope = ref<CommandScope | null>(null)

// Grid editor sets scope on focus
onFocus(() => activeScope.value = 'grid')
onBlur(() => activeScope.value = null)

// Keyboard handler uses scope if set
e.shiftKey ? redo(activeScope.value) : undo(activeScope.value)
```

---

## History Panel UI

A slide-out panel (or sidebar section) showing the action timeline.

### Wireframe

```
┌──────────────────────────────────────┐
│  History                    ✕ Clear  │
├──────────────────────────────────────┤
│                                      │
│  ● 🔀 Move "Tasks" to col 4         │ ← pointer (current)
│    12:15 PM · grid                   │
│                                      │
│  ○ 📐 Resize "Notes" to 6×2         │ ← undone (redo-able)
│    12:14 PM · grid                   │
│                                      │
│  ○ 🗑 Delete "Budget" view           │ ← undone (redo-able)
│    12:13 PM · grid                   │
│                                      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                      │
│  ✦ Add "Events" view                 │ ← past (executed)
│    12:12 PM · grid                   │
│                                      │
│  ✦ Create task: "Deploy v2"          │ ← past (executed)
│    12:10 PM · entity                 │
│                                      │
│  ✦ Update page title to "Movies"     │ ← past (executed)
│    12:08 PM · page                   │
│                                      │
└──────────────────────────────────────┘

● = current state (pointer)
○ = undone (above pointer — redo-able)
✦ = committed (below pointer — undo-able)

Click any entry to jump to that state.
```

### Component: `HistoryPanel.vue`

```vue
<script setup>
const { history, jumpTo, canUndo, canRedo, clear } = useCommandHistory()

const grouped = computed(() => {
  // Group by time bucket: "Just now", "1 min ago", "5 min ago", etc.
})
</script>

<template>
  <aside class="w-72 border-l overflow-y-auto">
    <div class="flex items-center justify-between p-3 border-b">
      <h3 class="text-sm font-medium">History</h3>
      <button @click="clear" class="text-xs text-muted-foreground">Clear</button>
    </div>
    <div class="divide-y">
      <button
        v-for="(entry, i) in history"
        :key="entry.id"
        class="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
        :class="{
          'bg-primary/5 border-l-2 border-primary': entry.isCurrent,
          'opacity-40': entry.isUndone,
        }"
        @click="jumpTo(i)">
        <div class="flex items-center gap-2">
          <Icon v-if="entry.icon" :name="entry.icon" class="h-3 w-3" />
          <span class="text-xs font-medium truncate">{{ entry.label }}</span>
        </div>
        <div class="text-[10px] text-muted-foreground mt-0.5">
          {{ formatTime(entry.timestamp) }} · {{ entry.scope }}
        </div>
      </button>
    </div>
  </aside>
</template>
```

### Toast Integration

Show a brief toast on undo/redo with the action label:

```typescript
import { toast } from 'vue-sonner'

function undo() {
  if (!canUndo.value) return
  const cmd = commands.value[pointer.value]
  cmd.undo()
  pointer.value--
  toast(`Undid: ${cmd.label}`, { duration: 2000 })
}

function redo() {
  if (!canRedo.value) return
  pointer.value++
  const cmd = commands.value[pointer.value]
  cmd.execute()
  toast(`Redid: ${cmd.label}`, { duration: 2000 })
}
```

---

## Command Batching

Some user actions trigger multiple mutations that should undo/redo as a single unit. For example, "Apply grid preset" replaces all views — undoing should restore all of them, not just one.

### Approach: Batch Commands

```typescript
interface BatchCommand extends Command {
  children: Command[]
}

function executeBatch(label: string, cmds: Command[]): void {
  const batch: Command = {
    id: crypto.randomUUID(),
    label,
    timestamp: Date.now(),
    execute: () => cmds.forEach(c => c.execute()),
    undo: () => [...cmds].reverse().forEach(c => c.undo()),
  }
  execute(batch)
}
```

Usage:

```typescript
// "Apply preset" creates multiple views — batch them
commandHistory.executeBatch('Apply preset: Dashboard', [
  { execute: () => addView(...), undo: () => removeView(...) },
  { execute: () => addView(...), undo: () => removeView(...) },
  { execute: () => addView(...), undo: () => removeView(...) },
])
```

---

## Activity Feed Integration (Tier 3)

Commands can optionally write to the entity activity feed for persistent history:

```typescript
function execute(cmd: Command): void {
  // ... (push to stack, etc.)

  // Optionally persist to activity feed
  if (cmd.entityId) {
    writeActivityEntry({
      entityId: cmd.entityId,
      action: cmd.label,
      agentId: cmd.agentId || 'user',
      timestamp: cmd.timestamp,
    })
  }
}
```

This means agent mutations (e.g. Cascade creating entities) also appear in the activity feed with proper attribution.

---

## Edge Cases

### Page Navigation
Clear session history when navigating to a different page (or keep a global history across pages — configurable).

```typescript
// Option A: Clear on navigation
watch(route, () => commandHistory.clear())

// Option B: Keep global history, scope-filter in UI
// History panel shows all; grid panel shows grid-scoped only
```

### Async Mutations
For mutations that involve API calls (entity CRUD via TQL), the `execute`/`undo` closures should be async and handle failures gracefully:

```typescript
execute: async () => {
  try {
    await api.createNode(entity)
  } catch (e) {
    toast.error('Failed to create entity')
    // Roll back the command from history
    pointer.value--
    commands.value.pop()
  }
}
```

### Concurrent Edits (Multi-Agent)
If another agent or browser tab mutates state while the user has undo history, undoing could produce conflicts. Mitigations:
- **Optimistic**: Undo applies the inverse; if it conflicts, show an error toast
- **Conservative**: Invalidate history entries that reference mutated entities
- **Recommended for v1**: Optimistic — simple and covers 95% of cases

### History Panel Memory
Cap at 100 commands (configurable). Old commands fall off the bottom of the stack.

---

## Migration Plan

### Phase 1: Foundation
1. Create `composables/useCommandHistory.ts` with the singleton composable
2. Create the global keyboard handler (Nuxt plugin or layout-level)
3. Migrate `useGridLayout` from local snapshot arrays to command pattern
4. Add toast feedback on undo/redo
5. Remove local `undoStack`/`redoStack` from `useGridLayout`

### Phase 2: Entity & Page Integration
6. Wrap entity CRUD mutations in commands (`useEntities` / `useTrellisEntities`)
7. Wrap page config mutations in commands (`usePages`)
8. Add batching support for compound operations

### Phase 3: History Panel
9. Build `HistoryPanel.vue` component
10. Add jump-to-state functionality
11. Integrate into the app layout (sidebar section or toolbar dropdown)

### Phase 4: Activity Feed (Optional)
12. Write command executions to the TQL mutation log
13. Surface in per-entity activity feeds
14. Add agent attribution

---

## File Structure (Planned)

```
composables/
  useCommandHistory.ts         ← singleton composable (Phase 1)

plugins/
  commandHistory.client.ts     ← global ⌘Z/⌘⇧Z handler (Phase 1)

components/
  layout/
    HistoryPanel.vue           ← visual timeline (Phase 3)
```

---

## Open Questions

1. **Scope behavior**: Should ⌘Z always undo globally, or should it be context-aware (grid undo when grid is focused)?
2. **Cross-page history**: Should navigating away clear history, or keep a global stack?
3. **History Panel placement**: Sidebar section? Floating panel? Toolbar dropdown?
4. **Persistence**: Should session history survive page refresh (localStorage)?
5. **Batch granularity**: Should "drag to new position" (which may trigger collision resolution on multiple views) be one command or multiple?

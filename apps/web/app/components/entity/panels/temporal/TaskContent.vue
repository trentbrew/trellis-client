<script lang="ts" setup>
  import type { ChecklistItem } from '~/types/calendarItem'
  import draggable from 'vuedraggable'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const isViewMode = computed(() => props.mode === 'view')
  const checklistCollapsed = ref(false)

  // ── Checklist helpers ─────────────────────────────────────────────────

  const checklist = computed<ChecklistItem[]>({
    get: () => item.value.checklist ?? [],
    set: (v) => { item.value.checklist = v },
  })

  /** Root-level items (no parent) sorted by order */
  const rootItems = computed(() =>
    checklist.value
      .filter((ci) => !ci.parentId)
      .sort((a, b) => a.order - b.order),
  )

  /** Children of a given parent, sorted by order */
  const childrenOf = (parentId: string): ChecklistItem[] =>
    checklist.value
      .filter((ci) => ci.parentId === parentId)
      .sort((a, b) => a.order - b.order)

  /** Whether a parent item has children */
  const hasChildren = (id: string): boolean =>
    checklist.value.some((ci) => ci.parentId === id)

  /** Count of completed / total for progress display */
  const completedCount = computed(() => checklist.value.filter((ci) => ci.completed).length)
  const progressPercent = computed(() =>
    checklist.value.length ? (completedCount.value / checklist.value.length) * 100 : 0,
  )

  /** Interpolate progress bar color from red (0%) → yellow (50%) → green (100%) */
  const progressColor = computed(() => {
    const p = progressPercent.value / 100
    if (p < 0.5) {
      // red → yellow
      const r = 239
      const g = Math.round(68 + (200 - 68) * (p * 2))
      const b = 68
      return `rgb(${r}, ${g}, ${b})`
    }
    // yellow → green
    const r = Math.round(239 - (239 - 34) * ((p - 0.5) * 2))
    const g = Math.round(200 + (197 - 200) * ((p - 0.5) * 2))
    const b = Math.round(68 - (68 - 94) * ((p - 0.5) * 2))
    return `rgb(${r}, ${g}, ${b})`
  })

  const addItem = (parentId?: string) => {
    const siblings = parentId
      ? checklist.value.filter((ci) => ci.parentId === parentId)
      : checklist.value.filter((ci) => !ci.parentId)
    const newItem: ChecklistItem = {
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      completed: false,
      order: siblings.length,
      parentId: parentId ?? null,
      collapsed: false,
    }
    item.value.checklist = [...checklist.value, newItem]

    // Auto-expand parent if collapsed
    if (parentId) {
      const parent = checklist.value.find((ci) => ci.id === parentId)
      if (parent?.collapsed) parent.collapsed = false
    }
  }

  /** Add a sibling item directly after a given item */
  const addItemAfter = (afterId: string) => {
    const ci = checklist.value.find((c) => c.id === afterId)
    if (!ci) return
    const parentId = ci.parentId ?? undefined
    const siblings = parentId
      ? checklist.value.filter((c) => c.parentId === parentId).sort((a, b) => a.order - b.order)
      : checklist.value.filter((c) => !c.parentId).sort((a, b) => a.order - b.order)
    const idx = siblings.findIndex((s) => s.id === afterId)
    // Shift orders of items after this one
    siblings.forEach((s, i) => { if (i > idx) s.order = s.order + 1 })
    const newItem: ChecklistItem = {
      id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      completed: false,
      order: ci.order + 1,
      parentId: parentId ?? null,
      collapsed: false,
    }
    item.value.checklist = [...checklist.value, newItem]
    nextTick(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-checklist-input]')
      const last = inputs[inputs.length - 1]
      if (last) last.focus()
    })
  }

  const removeItem = (id: string) => {
    // Remove item and all its children recursively
    const idsToRemove = new Set<string>()
    const collect = (targetId: string) => {
      idsToRemove.add(targetId)
      checklist.value.filter((ci) => ci.parentId === targetId).forEach((ci) => collect(ci.id))
    }
    collect(id)
    item.value.checklist = checklist.value.filter((ci) => !idsToRemove.has(ci.id))
  }

  const toggleCollapse = (id: string) => {
    const ci = checklist.value.find((c) => c.id === id)
    if (ci) ci.collapsed = !ci.collapsed
  }

  /** Indent item: make it a child of the previous sibling at the same level */
  const indentItem = (id: string) => {
    const ci = checklist.value.find((c) => c.id === id)
    if (!ci) return
    const siblings = ci.parentId
      ? checklist.value.filter((c) => c.parentId === ci.parentId).sort((a, b) => a.order - b.order)
      : rootItems.value
    const idx = siblings.findIndex((s) => s.id === id)
    if (idx <= 0) return // Can't indent the first sibling
    const newParent = siblings[idx - 1]
    if (!newParent) return
    ci.parentId = newParent.id
    ci.order = childrenOf(newParent.id).length
  }

  /** Outdent item: move it up one nesting level */
  const outdentItem = (id: string) => {
    const ci = checklist.value.find((c) => c.id === id)
    if (!ci || !ci.parentId) return // Already root level
    const parent = checklist.value.find((c) => c.id === ci.parentId)
    ci.parentId = parent?.parentId ?? null
    // Place after the old parent
    const newSiblings = ci.parentId
      ? checklist.value.filter((c) => c.parentId === ci.parentId).sort((a, b) => a.order - b.order)
      : rootItems.value
    const parentIdx = newSiblings.findIndex((s) => s.id === parent?.id)
    ci.order = parentIdx + 1
    // Re-index siblings after insertion
    const toReindex = ci.parentId
      ? checklist.value.filter((c) => c.parentId === ci.parentId && c.id !== ci.id).sort((a, b) => a.order - b.order)
      : checklist.value.filter((c) => !c.parentId && c.id !== ci.id).sort((a, b) => a.order - b.order)
    toReindex.splice(ci.order, 0, ci)
    toReindex.forEach((s, i) => { s.order = i })
  }

  /** Reorder root items after drag */
  const onRootDragEnd = () => {
    rootItems.value.forEach((ci, i) => { ci.order = i })
  }

  /** Reorder children after drag */
  const onChildDragEnd = (parentId: string) => {
    childrenOf(parentId).forEach((ci, i) => { ci.order = i })
  }

  /** Handle keyboard shortcuts on checklist input */
  const onChecklistKeydown = (e: KeyboardEvent, ci: ChecklistItem) => {
    // Ctrl+] to indent, Ctrl+[ to outdent (accessible alternative to Tab)
    if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      e.preventDefault()
      indentItem(ci.id)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '[') {
      e.preventDefault()
      outdentItem(ci.id)
    }
    if (e.key === 'Backspace' && !ci.label) {
      e.preventDefault()
      removeItem(ci.id)
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem(ci.parentId ?? undefined)
      // Focus the new input after next tick
      nextTick(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-checklist-input]')
        const last = inputs[inputs.length - 1]
        if (last) last.focus()
      })
    }
  }
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Checklist -->
    <div v-if="checklist.length || !isViewMode" class="p-4 space-y-2">
      <!-- Header: label left, progress + add button right -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
          @click="checklistCollapsed = !checklistCollapsed">
          <Icon
            :name="checklistCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'"
            class="h-3 w-3" />
          <span>Checklist</span>
          <span v-if="checklist.length" class="text-[10px] font-normal normal-case tracking-normal opacity-70">
            ({{ completedCount }}/{{ checklist.length }})
          </span>
        </button>
        <button
          v-if="!isViewMode"
          class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          @click="addItem()">
          <Icon name="lucide:plus" class="h-3 w-3" />
          Add
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="checklist.length && !checklistCollapsed" class="h-1 rounded-full bg-muted/40 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${progressPercent}%`, backgroundColor: progressColor }" />
      </div>

      <!-- Checklist items (collapsible) -->
      <div v-if="!checklistCollapsed" class="space-y-0.5">
        <!-- Root-level draggable list -->
        <draggable
          :list="rootItems"
          item-key="id"
          handle=".drag-handle"
          ghost-class="opacity-30"
          :animation="150"
          :disabled="isViewMode"
          @end="onRootDragEnd">
          <template #item="{ element: ci }">
            <div>
              <!-- Root item row -->
              <div class="group flex items-center gap-1.5 w-fit rounded-md hover:bg-muted/30 transition-colors py-0.5 pr-1">
                <!-- Drag handle -->
                <div
                  v-if="!isViewMode"
                  class="drag-handle shrink-0 w-4 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
                  <Icon name="lucide:grip-vertical" class="h-3 w-3 text-muted-foreground" />
                </div>
                <div v-else class="w-4 shrink-0" />

                <!-- Collapse toggle for parent items -->
                <button
                  v-if="hasChildren(ci.id)"
                  class="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  @click="toggleCollapse(ci.id)">
                  <Icon
                    :name="ci.collapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'"
                    class="h-3 w-3" />
                </button>

                <!-- Checkbox -->
                <button
                  class="h-4 w-4 shrink-0 rounded border border-border flex items-center justify-center transition-colors"
                  :class="ci.completed ? 'bg-primary border-primary' : 'hover:border-primary/50'"
                  @click="ci.completed = !ci.completed">
                  <Icon v-if="ci.completed" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
                </button>

                <!-- Label -->
                <input
                  v-if="!isViewMode"
                  v-model="ci.label"
                  type="text"
                  data-checklist-input
                  placeholder="Checklist item..."
                  class="flex-1 bg-transparent text-sm outline-none border-none min-w-0"
                  :class="ci.completed ? 'line-through text-muted-foreground' : ''"
                  @keydown="onChecklistKeydown($event, ci)" />
                <span v-else class="flex-1 text-sm min-w-0" :class="ci.completed ? 'line-through text-muted-foreground' : ''">
                  {{ ci.label }}
                </span>

                <!-- Actions -->
                <div v-if="!isViewMode" class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Add item below"
                    @click="addItemAfter(ci.id)">
                    <Icon name="lucide:plus" class="h-3 w-3" />
                  </button>
                  <button
                    class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Indent (Ctrl+])"
                    @click="indentItem(ci.id)">
                    <Icon name="lucide:indent-increase" class="h-3 w-3" />
                  </button>
                  <button
                    v-if="ci.parentId"
                    class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Outdent (Ctrl+[)"
                    @click="outdentItem(ci.id)">
                    <Icon name="lucide:indent-decrease" class="h-3 w-3" />
                  </button>
                  <button
                    class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                    @click="removeItem(ci.id)">
                    <Icon name="lucide:x" class="h-3 w-3" />
                  </button>
                </div>
              </div>

              <!-- Children (nested) -->
              <div v-if="hasChildren(ci.id) && !ci.collapsed" class="ml-6">
                <draggable
                  :list="childrenOf(ci.id)"
                  item-key="id"
                  handle=".drag-handle"
                  ghost-class="opacity-30"
                  :animation="150"
                  :disabled="isViewMode"
                  @end="onChildDragEnd(ci.id)">
                  <template #item="{ element: child }">
                    <div class="group flex items-center gap-1.5 w-fit rounded-md hover:bg-muted/30 transition-colors py-0.5 pr-1">
                      <!-- Drag handle -->
                      <div
                        v-if="!isViewMode"
                        class="drag-handle shrink-0 w-4 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
                        <Icon name="lucide:grip-vertical" class="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div v-else class="w-4 shrink-0" />

                      <!-- Checkbox -->
                      <button
                        class="h-4 w-4 shrink-0 rounded border border-border flex items-center justify-center transition-colors"
                        :class="child.completed ? 'bg-primary border-primary' : 'hover:border-primary/50'"
                        @click="child.completed = !child.completed">
                        <Icon v-if="child.completed" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
                      </button>

                      <!-- Label -->
                      <input
                        v-if="!isViewMode"
                        v-model="child.label"
                        type="text"
                        data-checklist-input
                        placeholder="Sub-item..."
                        class="flex-1 bg-transparent text-sm outline-none border-none min-w-0"
                        :class="child.completed ? 'line-through text-muted-foreground' : ''"
                        @keydown="onChecklistKeydown($event, child)" />
                      <span v-else class="flex-1 text-sm min-w-0" :class="child.completed ? 'line-through text-muted-foreground' : ''">
                        {{ child.label }}
                      </span>

                      <!-- Actions -->
                      <div v-if="!isViewMode" class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Add item below"
                          @click="addItemAfter(child.id)">
                          <Icon name="lucide:plus" class="h-3 w-3" />
                        </button>
                        <button
                          class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Outdent (Ctrl+[)"
                          @click="outdentItem(child.id)">
                          <Icon name="lucide:indent-decrease" class="h-3 w-3" />
                        </button>
                        <button
                          class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                          @click="removeItem(child.id)">
                          <Icon name="lucide:x" class="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>
  </div>
</template>

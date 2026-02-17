<script lang="ts" setup>
  import { countChecklistProgress, checklistItemsToHtml } from '~/utils/checklistToHtml'
  import type { ChecklistItem } from '~/types/entity'

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

  // ── Legacy migration: convert ChecklistItem[] → HTML on first access ──
  const migratedOnce = ref(false)
  watchEffect(() => {
    if (migratedOnce.value) return
    const raw = item.value
    if (!raw) return
    // If we have a legacy checklist array but no checklistContent, convert it
    if (Array.isArray(raw.checklist) && raw.checklist.length > 0 && !raw.checklistContent) {
      raw.checklistContent = checklistItemsToHtml(raw.checklist as ChecklistItem[])
      raw.checklist = [] // clear legacy field
    }
    migratedOnce.value = true
  })

  // ── Checklist content (HTML string) ───────────────────────────────────
  const checklistContent = computed({
    get: () => item.value?.checklistContent ?? '',
    set: (v: string) => {
      if (item.value) item.value.checklistContent = v
    },
  })

  // ── Progress tracking from HTML content ───────────────────────────────
  const progress = computed(() => countChecklistProgress(checklistContent.value))
  const hasItems = computed(() => progress.value.total > 0)
  const progressPercent = computed(() =>
    progress.value.total ? (progress.value.checked / progress.value.total) * 100 : 0,
  )

  /** Interpolate progress bar color from red (0%) → yellow (50%) → green (100%) */
  const progressColor = computed(() => {
    const p = progressPercent.value / 100
    if (p < 0.5) {
      const r = 239
      const g = Math.round(68 + (200 - 68) * (p * 2))
      const b = 68
      return `rgb(${r}, ${g}, ${b})`
    }
    const r = Math.round(239 - (239 - 34) * ((p - 0.5) * 2))
    const g = Math.round(200 + (197 - 200) * ((p - 0.5) * 2))
    const b = Math.round(68 - (68 - 94) * ((p - 0.5) * 2))
    return `rgb(${r}, ${g}, ${b})`
  })

  /** Rendered HTML for view mode */
  const renderedContent = computed(() => {
    if (!checklistContent.value) return ''
    return checklistContent.value
  })
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Checklist -->
    <div v-if="hasItems || !isViewMode" class="p-4 space-y-2">
      <!-- Header: label left, progress right -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
          @click="checklistCollapsed = !checklistCollapsed">
          <Icon
            :name="checklistCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'"
            class="h-3 w-3" />
          <span>Checklist</span>
          <span v-if="hasItems" class="text-[10px] font-normal normal-case tracking-normal opacity-70">
            ({{ progress.checked }}/{{ progress.total }})
          </span>
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="hasItems && !checklistCollapsed" class="h-1 rounded-full bg-muted/40 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${progressPercent}%`, backgroundColor: progressColor }" />
      </div>

      <!-- Checklist editor / view -->
      <div v-if="!checklistCollapsed">
        <UiRichTextEditor
          v-if="!isViewMode"
          v-model="checklistContent"
          tasklist
          compact
          placeholder="Add checklist items..."
          class="border-none! rounded-none! -mx-1" />
        <div
          v-else-if="checklistContent"
          class="prose prose-sm max-w-none text-sm text-foreground checklist-view"
          v-html="renderedContent" />
        <p v-else class="text-sm text-muted-foreground/50 italic">No checklist items.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* View-mode task list styling (mirrors editor styles) */
  :deep(ul[data-type='taskList']) {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }

  :deep(ul[data-type='taskList'] li[data-type='taskItem']) {
    display: flex !important;
    align-items: flex-start !important;
    gap: 0.375rem;
    padding: 0.125rem 0;
  }

  :deep(ul[data-type='taskList'] li[data-type='taskItem'] > label) {
    display: flex !important;
    align-items: center;
    flex-shrink: 0;
    margin-top: 0.2em;
  }

  :deep(ul[data-type='taskList'] li[data-type='taskItem'] > label input[type='checkbox']) {
    appearance: none;
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    border: 1.5px solid hsl(var(--border));
    border-radius: 0.25rem;
    position: relative;
    flex-shrink: 0;
    pointer-events: none;
    background: transparent;
  }

  :deep(ul[data-type='taskList'] li[data-checked='true'] > label input[type='checkbox']) {
    background: hsl(var(--primary));
    border-color: hsl(var(--primary));
  }

  :deep(ul[data-type='taskList'] li[data-checked='true'] > label input[type='checkbox']::after) {
    content: '';
    position: absolute;
    left: 3px;
    top: 0.5px;
    width: 5px;
    height: 8px;
    border: solid hsl(var(--primary-foreground));
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  :deep(ul[data-type='taskList'] li[data-type='taskItem'] > div) {
    flex: 1 !important;
    min-width: 0;
  }

  :deep(ul[data-type='taskList'] li[data-type='taskItem'] > div p) {
    margin: 0;
  }

  :deep(ul[data-type='taskList'] li[data-checked='true'] > div p) {
    text-decoration: line-through;
    color: hsl(var(--muted-foreground));
  }

  :deep(ul[data-type='taskList'] ul[data-type='taskList']) {
    margin-left: 1.25rem;
  }
</style>

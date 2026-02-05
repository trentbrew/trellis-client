<script setup lang="ts">
  import type { PermitCondition } from './ConditionCard.vue'

  interface Props {
    conditions: PermitCondition[]
    activeConditionId?: string | null
    currentPage: number
    isCollapsed?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    activeConditionId: null,
    isCollapsed: false,
  })

  const emit = defineEmits<{
    'condition-select': [condition: PermitCondition]
    'go-to-page': [page: number]
    'update:is-collapsed': [value: boolean]
    close: []
  }>()

  // Group conditions by page for visual grouping
  const conditionsByPage = computed(() => {
    const grouped = new Map<number, PermitCondition[]>()
    for (const condition of props.conditions) {
      const page = condition.page
      if (!grouped.has(page)) {
        grouped.set(page, [])
      }
      grouped.get(page)!.push(condition)
    }
    // Sort by page number
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])
  })

  function isOnCurrentPage(condition: PermitCondition) {
    return condition.page === props.currentPage
  }

  function getTypeBadgeClass(type: PermitCondition['type']) {
    const classes: Record<string, string> = {
      monitoring: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      recordkeeping: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      reporting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    }
    return classes[type || 'other'] || classes.other
  }
</script>

<template>
  <aside
    class="flex h-full flex-col border-r border-border bg-card transition-all duration-200"
    :class="isCollapsed ? 'w-0 overflow-hidden' : 'w-72'">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border px-3 py-3">
      <div class="flex items-center gap-2">
        <Icon name="lucide:list" class="size-4 text-muted-foreground" />
        <span class="text-sm font-medium">Conditions</span>
        <span class="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {{ conditions.length }}
        </span>
      </div>
      <UiButton variant="ghost" size="icon" class="size-7" @click="emit('update:is-collapsed', true)">
        <Icon name="lucide:panel-left-close" class="size-4" />
      </UiButton>
    </div>

    <!-- Unified Conditions List -->
    <div class="flex-1 overflow-y-auto px-2 py-2">
      <template v-for="[page, pageConditions] in conditionsByPage" :key="page">
        <!-- Page Group Wrapper - highlighted when current page -->
        <div
          class="mb-2 rounded-lg transition-colors"
          :class="
            page === currentPage
              ? 'bg-violet-50/50 ring-1 ring-violet-200 dark:bg-violet-950/20 dark:ring-violet-800'
              : ''
          ">
          <!-- Page Label -->
          <div
            class="flex items-center gap-2 px-2 py-1.5"
            :class="page === currentPage ? 'text-violet-700 dark:text-violet-300' : 'text-muted-foreground'">
            <Icon name="lucide:file-text" class="size-3" />
            <span class="text-xs font-medium">Page {{ page }}</span>
            <span v-if="page === currentPage" class="ml-auto text-[10px] uppercase tracking-wide">viewing</span>
          </div>

          <!-- Conditions in this page group -->
          <div class="space-y-1 px-1 pb-1">
            <button
              v-for="condition in pageConditions"
              :key="condition.id"
              class="w-full rounded-md p-2 text-left transition-colors hover:bg-accent"
              :class="[
                activeConditionId === condition.id ? 'bg-violet-100 dark:bg-violet-900/40' : '',
                isOnCurrentPage(condition) ? '' : '',
              ]"
              @click="emit('condition-select', condition)">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    class="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    :class="
                      activeConditionId === condition.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                    ">
                    {{ condition.number }}
                  </span>
                  <span :class="getTypeBadgeClass(condition.type)" class="rounded px-1.5 py-0.5 text-[10px] capitalize">
                    {{ condition.type || 'Other' }}
                  </span>
                </div>
                <span v-if="condition.needsTask" class="text-amber-500">
                  <Icon name="lucide:alert-circle" class="size-3" />
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {{ condition.quote }}
              </p>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Footer Actions -->
    <div class="flex items-center justify-between border-t border-border px-3 py-2">
      <span class="text-xs text-muted-foreground">
        {{ conditions.filter((c) => !c.needsTask).length }}/{{ conditions.length }} indexed
      </span>
      <UiButton variant="outline" size="sm" class="h-7 gap-1 text-xs">
        <Icon name="lucide:plus" class="size-3" />
        Add
      </UiButton>
    </div>
  </aside>
</template>

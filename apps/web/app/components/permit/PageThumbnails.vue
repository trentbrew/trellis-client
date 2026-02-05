<script setup lang="ts">
  interface PageInfo {
    page: number
    hasConditions: boolean
    conditionCount: number
  }

  interface Props {
    pages: PageInfo[]
    currentPage: number
    isCollapsed?: boolean
  }

  withDefaults(defineProps<Props>(), {
    isCollapsed: false,
  })

  const emit = defineEmits<{
    pageSelect: [page: number]
    'update:isCollapsed': [value: boolean]
  }>()

  function handlePageClick(page: number) {
    emit('pageSelect', page)
  }
</script>

<template>
  <div class="flex w-20 flex-col border-r border-border bg-card/50">
    <!-- Page list -->
    <div class="flex-1 overflow-y-auto p-2">
      <div class="space-y-1.5">
        <button
          v-for="pageInfo in pages"
          :key="pageInfo.page"
          type="button"
          :class="[
            'relative flex w-full flex-col items-center rounded-md border p-1.5 transition-all',
            currentPage === pageInfo.page
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border bg-background hover:border-primary/30 hover:bg-accent/50',
          ]"
          @click="handlePageClick(pageInfo.page)">
          <!-- Page thumbnail placeholder -->
          <div
            :class="[
              'flex h-12 w-full items-center justify-center rounded-sm text-xs font-medium',
              currentPage === pageInfo.page ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
            ]">
            {{ pageInfo.page }}
          </div>

          <!-- Condition indicator -->
          <div v-if="pageInfo.hasConditions" class="mt-1 flex items-center gap-0.5">
            <div class="size-1.5 rounded-full bg-violet-500" />
            <span class="text-[10px] text-muted-foreground">{{ pageInfo.conditionCount }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

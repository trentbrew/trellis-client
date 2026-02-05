<script setup lang="ts">
  import type { PageStat } from './Page.vue'

  interface PageSplitProps {
    title?: string
    subtitle?: string
    description?: string
    icon?: string
    iconClass?: string
    showBackButton?: boolean
    /** Width ratio of left panel (default 50%) */
    leftWidth?: string
    /** Whether the divider is draggable */
    resizable?: boolean
    /** Collapse the right panel */
    rightCollapsed?: boolean
    /** Stats to display in the header */
    stats?: PageStat[]
    /** Whether to hide the page header */
    hideHeader?: boolean
  }

  const props = withDefaults(defineProps<PageSplitProps>(), {
    leftWidth: '50%',
    resizable: false,
    rightCollapsed: false,
    hideHeader: true,
  })

  const emit = defineEmits<{
    'update:rightCollapsed': [value: boolean]
  }>()

  const leftPanelStyle = computed(() => ({
    width: props.rightCollapsed ? '100%' : props.leftWidth,
    minWidth: props.rightCollapsed ? '100%' : '300px',
  }))

  const toggleRightPanel = () => {
    emit('update:rightCollapsed', !props.rightCollapsed)
  }
</script>

<template>
  <Page
    :title="title"
    :subtitle="subtitle"
    :description="description"
    :icon="icon"
    :icon-class="iconClass"
    :show-back-button="showBackButton"
    :stats="stats"
    :full-width="true"
    :fill-height="true"
    :hide-header="hideHeader">
    <!-- Stats slot -->
    <template v-if="$slots.stats" #stats>
      <slot name="stats" />
    </template>

    <div class="flex h-full">
      <!-- Left Panel (e.g., PDF viewer, document preview) -->
      <div :style="leftPanelStyle" class="flex h-full flex-col border-r border-border transition-all duration-200">
        <!-- Left panel header -->
        <div v-if="$slots['left-header']" class="shrink-0 border-b border-border bg-card/50 px-4 py-3">
          <slot name="left-header" />
        </div>
        <!-- Left panel content -->
        <div class="min-h-0 flex-1 overflow-auto">
          <slot name="left" />
        </div>
      </div>

      <!-- Divider with toggle -->
      <div class="relative flex w-0 items-center justify-center">
        <button
          type="button"
          class="absolute z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent"
          :title="rightCollapsed ? 'Show panel' : 'Hide panel'"
          @click="toggleRightPanel">
          <Icon
            :name="rightCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-right-open'"
            class="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <!-- Right Panel (e.g., form, details) -->
      <div v-show="!rightCollapsed" class="flex h-full min-w-[300px] flex-1 flex-col bg-card/30">
        <!-- Right panel header -->
        <div v-if="$slots['right-header']" class="shrink-0 border-b border-border bg-card/50 px-4 py-3">
          <slot name="right-header" />
        </div>
        <!-- Right panel content -->
        <div class="min-h-0 flex-1 overflow-auto">
          <slot name="right" />
        </div>
        <!-- Right panel footer -->
        <div v-if="$slots['right-footer']" class="shrink-0 border-t border-border bg-card/50 px-4 py-3">
          <slot name="right-footer" />
        </div>
      </div>
    </div>
  </Page>
</template>

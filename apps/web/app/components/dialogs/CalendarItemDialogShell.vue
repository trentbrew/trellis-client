<script lang="ts" setup>
  /**
   * CalendarItemDialogShell — Reusable dialog chrome for all CalendarItem dialogs.
   *
   * Provides:
   *  - UiDialog + UiDialogContent with correct sizing & zero-padding
   *  - Header: type badge, schedule badge (edit mode), nav arrows, close, title input, seamless description
   *  - Properties row: single-line, scrollable, via #properties slot
   *  - Content area: via default slot (caller owns layout: sidebars, divide-y, etc.)
   *  - Footer: left info + right actions via #footer-left / #footer-right slots
   */

  const props = withDefaults(
    defineProps<{
      open: boolean
      title: string
      description: string
      mode?: 'view' | 'create' | 'edit'
      typeBadge?: { icon: string; label: string }
      scheduleBadge?: { text: string; statusText: string; isOverdue: boolean; isRecurring: boolean }
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      /** sr-only dialog title override */
      dialogTitle?: string
      /** sr-only dialog description override */
      dialogDescription?: string
    }>(),
    {
      mode: 'edit',
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'update:title': [value: string]
    'update:description': [value: string]
    close: []
    navigatePrev: []
    navigateNext: []
  }>()

  const isViewMode = computed(() => props.mode === 'view')
  const isCreateMode = computed(() => props.mode === 'create')

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(1100px,calc(100vw-4rem))]! max-w-[min(1100px,calc(100vw-4rem))]! h-[min(720px,calc(100vh-4rem))] max-h-[min(720px,calc(100vh-4rem))] p-0! gap-0! overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex! flex-col">
      <UiDialogTitle class="sr-only">
        {{ dialogTitle || title || 'Item' }}
      </UiDialogTitle>
      <UiDialogDescription class="sr-only">
        {{ dialogDescription || 'Item details.' }}
      </UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <span v-if="typeBadge" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                <Icon :name="typeBadge.icon" class="h-3 w-3" />
                {{ typeBadge.label }}
              </span>
              <slot name="header-badges" />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="!isCreateMode">
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigatePrev" @click="emit('navigatePrev')">
                  <Icon name="lucide:chevron-up" class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigateNext" @click="emit('navigateNext')">
                  <Icon name="lucide:chevron-down" class="h-4 w-4" />
                </UiButton>
              </template>
              <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <input
            v-if="!isViewMode"
            :value="title"
            type="text"
            placeholder="Item name..."
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all"
            @input="emit('update:title', ($event.target as HTMLInputElement).value)" />
          <h2 v-else class="text-xl font-semibold px-1">{{ title }}</h2>
          <div class="mt-1 px-1">
            <UiRichTextEditor v-if="!isViewMode" :model-value="description" placeholder="Add a description..." seamless @update:model-value="emit('update:description', $event)" />
            <p v-else-if="description" class="text-sm text-muted-foreground" v-html="description" />
            <p v-else class="text-sm text-muted-foreground/50 italic">No description</p>
          </div>
        </div>
      </div>

      <!-- Properties Row -->
      <div v-if="$slots.properties" class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <div class="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none whitespace-nowrap">
          <slot name="properties" />
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <slot />
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <slot name="footer-left" />
        </div>
        <div class="flex items-center gap-2">
          <slot name="footer-right" />
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

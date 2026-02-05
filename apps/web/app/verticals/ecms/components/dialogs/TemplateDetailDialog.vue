<script lang="ts" setup>
  export interface TemplateData {
    id: string
    name: string
    category: string
    usageCount?: number
    lastUsed?: string
    status?: 'Active' | 'Draft' | 'Archived'
    description?: string
  }

  withDefaults(
    defineProps<{
      open: boolean
      template: TemplateData | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
    }>(),
    {
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    edit: [template: TemplateData]
    delete: [template: TemplateData]
    use: [template: TemplateData]
    navigatePrev: []
    navigateNext: []
  }>()

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(900px,calc(100vw-4rem))]! max-w-[min(900px,calc(100vw-4rem))]! h-[min(600px,calc(100vh-4rem))] max-h-[min(600px,calc(100vh-4rem))] p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">{{ template?.name || 'Template' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ template?.description || 'Reusable task template.' }}</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                v-if="template?.status"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                :class="
                  template.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : template.status === 'Draft'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                ">
                {{ template.status }}
              </span>
              <p class="text-xs text-muted-foreground truncate">{{ template?.description || 'Reusable task template.' }}</p>
            </div>
            <!-- Navigation + Close -->
            <div class="flex items-center gap-1 shrink-0">
              <UiButton
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :disabled="!canNavigatePrev"
                @click="emit('navigatePrev')">
                <Icon name="lucide:chevron-up" class="h-4 w-4" />
              </UiButton>
              <UiButton
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :disabled="!canNavigateNext"
                @click="emit('navigateNext')">
                <Icon name="lucide:chevron-down" class="h-4 w-4" />
              </UiButton>
              <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <h2 class="text-xl font-semibold px-1">{{ template?.name || 'Template' }}</h2>
        </div>
      </div>

      <!-- Properties Row -->
      <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Properties</p>
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:tag" class="h-3.5 w-3.5" />
            {{ template?.category || 'Uncategorized' }}
          </span>
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
            {{ template?.usageCount ?? 0 }} uses
          </span>
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:clock" class="h-3.5 w-3.5" />
            {{ template?.lastUsed || 'Never used' }}
          </span>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="template" class="p-4 space-y-4">
          <slot name="content" />
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="text-xs text-muted-foreground">
          <span v-if="template?.id">ID: {{ template.id }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UiButton
            v-if="template"
            variant="outline"
            size="sm"
            class="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:border-red-800 dark:hover:bg-red-900/20"
            @click="emit('delete', template)">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            Delete
          </UiButton>
          <UiButton variant="outline" size="sm" @click="closeDialog">Close</UiButton>
          <UiButton v-if="template" variant="outline" size="sm" class="gap-1.5" @click="emit('edit', template)">
            <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            Edit
          </UiButton>
          <UiButton v-if="template" size="sm" class="gap-1.5" @click="emit('use', template)">
            <Icon name="lucide:play" class="h-3.5 w-3.5" />
            Use
          </UiButton>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

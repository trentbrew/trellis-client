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
  <DialogWrapper
    :open="open"
    :title="template?.name || 'Template'"
    :description="template?.description || 'Reusable task template.'"
    size="lg"
    @update:open="emit('update:open', $event)"
    @close="closeDialog">
    <template #header-actions>
      <div class="flex items-center gap-1 shrink-0">
        <UiButton
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          :disabled="!canNavigatePrev"
          @click="emit('navigatePrev')">
          <Icon name="lucide:chevron-up" class="h-4 w-4" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          :disabled="!canNavigateNext"
          @click="emit('navigateNext')">
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </UiButton>
      </div>
    </template>

    <div v-if="template" class="p-6 space-y-5">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border bg-muted/20 p-4">
          <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Icon name="lucide:tag" class="h-3.5 w-3.5" />
            Category
          </div>
          <div class="text-sm font-medium">{{ template.category }}</div>
        </div>
        <div class="rounded-lg border border-border bg-muted/20 p-4">
          <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
            Usage
          </div>
          <div class="text-sm font-medium">{{ template.usageCount ?? 0 }} uses</div>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name="lucide:clock" class="h-4 w-4 text-muted-foreground" />
            <div class="text-sm text-muted-foreground">Last used</div>
          </div>
          <div class="text-sm font-medium">{{ template.lastUsed || '—' }}</div>
        </div>
      </div>

      <slot name="content" />
    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="text-xs text-muted-foreground">ID: {{ template?.id || '—' }}</div>
        <div class="flex items-center gap-2">
          <UiButton
            v-if="template"
            variant="outline"
            size="sm"
            class="gap-1.5 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            @click="emit('delete', template)">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            Delete
          </UiButton>
          <UiButton v-if="template" variant="outline" size="sm" @click="closeDialog">Close</UiButton>
          <UiButton v-if="template" size="sm" class="gap-1.5" @click="emit('edit', template)">
            <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            Edit
          </UiButton>
          <UiButton v-if="template" size="sm" class="gap-1.5" @click="emit('use', template)">
            <Icon name="lucide:play" class="h-3.5 w-3.5" />
            Use
          </UiButton>
        </div>
      </div>
    </template>
  </DialogWrapper>
</template>

<script lang="ts" setup>
  import type { TaskStatus } from '~/types/calendarItem'
  import { TASK_STATUS_OPTIONS } from '~/types/calendarItem'

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
  const taskStatusOpen = ref(false)
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Task Status -->
    <div class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task Status</p>
      <UiPopover v-model:open="taskStatusOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            :class="TASK_STATUS_OPTIONS.find((s) => s.value === item.taskStatus)?.color || 'bg-muted/50'">
            <Icon :name="TASK_STATUS_OPTIONS.find((s) => s.value === item.taskStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
            {{ TASK_STATUS_OPTIONS.find((s) => s.value === item.taskStatus)?.label || 'Status' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in TASK_STATUS_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="item.taskStatus = opt.value as TaskStatus; taskStatusOpen = false">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="item.taskStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Checklist -->
    <div v-if="item.checklist?.length || !isViewMode" class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Checklist</p>
      <div class="space-y-1">
        <div v-for="(ci, idx) in item.checklist" :key="ci.id" class="flex items-center gap-2">
          <button
            class="h-4 w-4 rounded border border-border flex items-center justify-center transition-colors"
            :class="ci.completed ? 'bg-primary border-primary' : 'hover:border-primary/50'"
            @click="ci.completed = !ci.completed">
            <Icon v-if="ci.completed" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
          </button>
          <input
            v-if="!isViewMode"
            v-model="ci.label"
            type="text"
            placeholder="Checklist item..."
            class="flex-1 bg-transparent text-sm outline-none border-none"
            :class="ci.completed ? 'line-through text-muted-foreground' : ''" />
          <span v-else class="flex-1 text-sm" :class="ci.completed ? 'line-through text-muted-foreground' : ''">{{ ci.label }}</span>
          <button v-if="!isViewMode" class="text-muted-foreground hover:text-destructive" @click="item.checklist?.splice(idx, 1)">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
      </div>
      <button
        v-if="!isViewMode"
        class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        @click="item.checklist = [...(item.checklist || []), { id: `cl-${Date.now()}`, label: '', completed: false, order: item.checklist?.length || 0 }]">
        <Icon name="lucide:plus" class="h-3 w-3" />
        Add item
      </button>
    </div>
  </div>
</template>

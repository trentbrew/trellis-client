<script lang="ts" setup>
  import type { SprintStatus } from '~/types/entity'

  const SPRINT_STATUS_OPTIONS: { value: SprintStatus; label: string; icon: string; color: string }[] = [
    { value: 'planning', label: 'Planning', icon: 'lucide:map', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'active', label: 'Active', icon: 'lucide:play', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'completed', label: 'Completed', icon: 'lucide:check-circle', color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' },
    { value: 'cancelled', label: 'Cancelled', icon: 'lucide:x-circle', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  ]

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
  const sprintStatusOpen = ref(false)
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Sprint Status / Velocity -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sprint Status</p>
        <UiPopover v-model:open="sprintStatusOpen">
          <UiPopoverTrigger as-child>
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              :class="SPRINT_STATUS_OPTIONS.find((s) => s.value === item.sprintStatus)?.color || 'bg-muted/50'">
              <Icon :name="SPRINT_STATUS_OPTIONS.find((s) => s.value === item.sprintStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
              {{ SPRINT_STATUS_OPTIONS.find((s) => s.value === item.sprintStatus)?.label || 'Status' }}
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-44 p-1">
            <button
              v-for="opt in SPRINT_STATUS_OPTIONS"
              :key="opt.value"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="item.sprintStatus = opt.value as SprintStatus; sprintStatusOpen = false">
              <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ opt.label }}</span>
              <Icon v-if="item.sprintStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </UiPopoverContent>
        </UiPopover>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Velocity</p>
        <UiInput v-if="!isViewMode" v-model.number="item.velocity" type="number" placeholder="Story points" class="text-sm" />
        <p v-else class="text-sm font-medium">{{ item.velocity ?? '—' }}</p>
      </div>
    </div>

    <!-- Sprint Goal -->
    <div class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sprint Goal</p>
      <textarea
        v-if="!isViewMode"
        v-model="item.sprintGoal"
        placeholder="What does this sprint aim to achieve?"
        rows="3"
        class="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 border border-border rounded-md px-3 py-2" />
      <p v-else class="text-sm whitespace-pre-wrap">{{ item.sprintGoal || '—' }}</p>
    </div>
  </div>
</template>

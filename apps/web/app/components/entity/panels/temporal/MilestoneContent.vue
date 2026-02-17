<script lang="ts" setup>
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
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Achieved / Project -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Achieved</p>
        <button
          v-if="!isViewMode"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          :class="item.achieved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
          @click="item.achieved = !item.achieved">
          <Icon :name="item.achieved ? 'lucide:check-circle' : 'lucide:circle'" class="h-3.5 w-3.5" />
          {{ item.achieved ? 'Achieved' : 'Not yet' }}
        </button>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
          :class="item.achieved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'">
          <Icon :name="item.achieved ? 'lucide:check-circle' : 'lucide:circle'" class="h-3.5 w-3.5" />
          {{ item.achieved ? 'Achieved' : 'Not yet' }}
        </span>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project ID</p>
        <UiInput v-if="!isViewMode" v-model="item.projectId" placeholder="Link to project..." class="text-sm" />
        <p v-else class="text-sm">{{ item.projectId || '—' }}</p>
      </div>
    </div>
  </div>
</template>

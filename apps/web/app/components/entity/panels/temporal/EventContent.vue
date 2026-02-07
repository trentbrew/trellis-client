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

  // Unified location field — stores to `location`, detects URLs for link rendering
  const isUrl = computed(() => {
    const v = item.value.location || ''
    return /^https?:\/\//i.test(v)
  })
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Location / Link (merged) -->
    <div class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
      <div v-if="!isViewMode" class="relative">
        <Icon
          :name="isUrl ? 'lucide:video' : 'lucide:map-pin'"
          class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <UiInput v-model="item.location" placeholder="Address, room, or meeting link..." class="text-sm pl-8" />
      </div>
      <template v-else>
        <a
          v-if="isUrl"
          :href="item.location"
          target="_blank"
          class="text-sm text-primary underline inline-flex items-center gap-1">
          <Icon name="lucide:video" class="h-3.5 w-3.5" />
          {{ item.location }}
        </a>
        <p v-else class="text-sm">{{ item.location || '—' }}</p>
      </template>
    </div>
  </div>
</template>

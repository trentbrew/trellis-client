<script lang="ts" setup>
  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed(() => props.modelValue)

  const progressPercent = computed(() => {
    if (!item.value.targetValue || !item.value.currentValue) return 0
    return Math.min(100, Math.round((item.value.currentValue / item.value.targetValue) * 100))
  })
</script>

<template>
  <div v-if="item.targetValue" class="p-4">
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted-foreground">Progress</span>
        <span class="font-medium">{{ progressPercent }}%</span>
      </div>
      <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full bg-emerald-500 transition-all"
          :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>
  </div>
</template>

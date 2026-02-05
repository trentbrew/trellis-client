<script lang="ts" setup>
  import { ref } from 'vue'

  withDefaults(
    defineProps<{
      hideHeader?: boolean
    }>(),
    {
      hideHeader: false,
    },
  )

  const activeTab = ref(0)
</script>

<template>
  <div class="my-6">
    <div v-if="!hideHeader" class="flex gap-2 border-b border-border pb-2 mb-4">
      <button
        v-for="(slot, index) in $slots.default"
        :key="index"
        :class="[
          'px-3 py-1.5 text-sm font-medium transition-colors rounded-t',
          activeTab === index
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
        @click="activeTab = index">
        {{ (slot as any).children?.[0]?.props?.label || `Tab ${index + 1}` }}
      </button>
    </div>
    <div class="relative">
      <div
        v-for="(slot, index) in $slots.default"
        v-show="activeTab === index"
        :key="index"
        class="prose prose-slate dark:prose-invert max-w-none">
        <slot :name="index" />
      </div>
    </div>
  </div>
</template>

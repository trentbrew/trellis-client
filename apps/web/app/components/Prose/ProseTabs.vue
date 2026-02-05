<script lang="ts" setup>
  import { ref } from 'vue'

  const props = withDefaults(
    defineProps<{
      prose?: boolean
      variant?: 'card' | 'line'
    }>(),
    {
      prose: true,
      variant: 'card',
    },
  )

  const activeTab = ref(0)
</script>

<template>
  <div class="my-6">
    <div :class="['flex gap-2', variant === 'card' ? 'border-b border-border pb-2 mb-4' : 'mb-4']">
      <button
        v-for="(slot, index) in $slots.default"
        :key="index"
        :class="[
          'px-3 py-1.5 text-sm font-medium transition-colors',
          variant === 'card' ? 'rounded-t' : 'rounded-full border border-border',
          activeTab === index
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        ]"
        @click="activeTab = index">
        {{ (slot as any).children?.[0]?.props?.label || `Tab ${index + 1}` }}
        <Icon
          v-if="(slot as any).children?.[0]?.props?.icon"
          :name="(slot as any).children?.[0]?.props?.icon"
          class="ml-1.5 h-4 w-4" />
      </button>
    </div>
    <div class="relative">
      <div
        v-for="(slot, index) in $slots.default"
        v-show="activeTab === index"
        :key="index"
        :class="prose ? 'prose prose-slate dark:prose-invert max-w-none' : ''">
        <slot :name="index" />
      </div>
    </div>
  </div>
</template>

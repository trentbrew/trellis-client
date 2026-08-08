<script lang="ts" setup>
  import { ref, computed, useSlots } from 'vue'

  const props = withDefaults(
    defineProps<{
      defaultValue?: string
      expandAll?: boolean
    }>(),
    {
      defaultValue: '',
      expandAll: false,
    },
  )

  const $slots = useSlots()

  const activeFile = ref(props.defaultValue)
  const files = computed(() => {
    const slots = Object.keys($slots).filter((key) => !isNaN(Number(key)))
    return slots.map((key) => {
      const slotVNodes = ($slots[key] ?? []) as any[]
      const slotContent = slotVNodes[0] as any
      return {
        name: key,
        label: slotContent?.props?.label || key,
        icon: slotContent?.props?.icon,
        code: slotContent?.children?.[0]?.children || '',
      }
    })
  })
</script>

<template>
  <div class="my-6">
    <div class="flex flex-col sm:flex-row gap-2 border border-border rounded-lg overflow-hidden">
      <div
        class="flex flex-col sm:flex-row gap-0 sm:gap-0 border-b sm:border-b-0 sm:border-r border-border bg-muted/50 p-2">
        <button
          v-for="file in files"
          :key="file.name"
          :class="[
            'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded whitespace-nowrap',
            activeFile === file.name
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
          ]"
          @click="activeFile = file.name">
          <Icon v-if="file.icon" :name="file.icon" class="h-4 w-4" />
          <span>{{ file.label }}</span>
        </button>
      </div>
      <div class="flex-1 bg-background p-4 overflow-x-auto">
        <div v-for="file in files" v-show="activeFile === file.name" :key="file.name">
          <slot :name="file.name" />
        </div>
      </div>
    </div>
  </div>
</template>

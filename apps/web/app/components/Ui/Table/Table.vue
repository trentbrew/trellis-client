<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  defineOptions({ inheritAttrs: false })
  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({ base: 'w-full caption-bottom text-sm' })
</script>

<template>
  <div data-slot="table-container" class="relative w-full overflow-x-auto">
    <table data-slot="table" :class="styles({ class: props.class })" v-bind="$attrs">
      <slot />
    </table>
  </div>
</template>

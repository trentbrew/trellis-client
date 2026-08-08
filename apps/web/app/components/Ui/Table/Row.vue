<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  defineOptions({ inheritAttrs: false })

  const attrs = useAttrs()

  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({
    base: 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
  })
</script>

<template>
  <tr v-bind="attrs" data-slot="table-row" :class="styles({ class: props.class })">
    <slot />
  </tr>
</template>

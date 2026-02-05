<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'

  defineOptions({ inheritAttrs: false })

  const attrs = useAttrs()

  const props = defineProps<{
    class?: HTMLAttributes['class']
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

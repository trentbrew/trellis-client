<script lang="ts" setup>
  import { ListboxVirtualizer, useForwardProps } from 'reka-ui'
  import type { ListboxVirtualizerProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<ListboxVirtualizerProps & { class?: ClassNameValue }>()
  const forwarded = useForwardProps(reactiveOmit(props, 'class'))

  const styles = tv({
    base: '',
  })
</script>

<template>
  <ListboxVirtualizer
    v-slot="{ option }"
    data-slot="listbox-virtualizer"
    v-bind="forwarded"
    :class="styles({ class: props.class })"
  >
    <slot :option="option" />
  </ListboxVirtualizer>
</template>

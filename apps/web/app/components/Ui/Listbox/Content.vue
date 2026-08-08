<script lang="ts" setup>
  import { ListboxContent, useForwardProps } from 'reka-ui'
  import type { ListboxContentProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<ListboxContentProps & { class?: ClassNameValue }>()
  const forwarded = useForwardProps(reactiveOmit(props))

  const styles = tv({
    base: 'max-h-[300px] w-full overflow-y-auto rounded-md border bg-popover px-3 py-1.5',
  })
</script>

<template>
  <ListboxContent data-slot="listbox-content" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </ListboxContent>
</template>

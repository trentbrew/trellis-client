<script lang="ts" setup>
  import { ListboxItemIndicator, useForwardPropsEmits } from 'reka-ui'
  import type { ListboxItemIndicatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<ListboxItemIndicatorProps & { class?: ClassNameValue; icon?: string }>()
  const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'))

  const styles = tv({
    base: 'size-4 shrink-0 text-primary',
  })
</script>

<template>
  <ListboxItemIndicator data-slot="listbox-indicator" v-bind="forwarded">
    <slot>
      <Icon :class="styles({ class: props.class })" :name="icon || 'lucide:check'" />
    </slot>
  </ListboxItemIndicator>
</template>

<script lang="ts" setup>
  import { SelectIcon, useForwardProps } from 'reka-ui'
  import type { SelectIconProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SelectIconProps & {
      /** Icon to render */
      icon?: string
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
    }
  >()
  const forwarded = useForwardProps(reactiveOmit(props, 'class'))

  const styles = tv({
    base: 'size-4 shrink-0 opacity-50',
  })
</script>

<template>
  <SelectIcon data-slot="select-icon" v-bind="forwarded" class="flex items-center justify-center">
    <slot>
      <Icon :class="styles({ class: props.class })" :name="icon || 'lucide:chevron-down'" />
    </slot>
  </SelectIcon>
</template>

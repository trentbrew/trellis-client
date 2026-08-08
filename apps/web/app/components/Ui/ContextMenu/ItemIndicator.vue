<script lang="ts" setup>
  import { ContextMenuItemIndicator } from 'reka-ui'
  import type { ContextMenuItemIndicatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    ContextMenuItemIndicatorProps & {
      /** The icon to display */
      icon?: string
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'icon')

  const styles = tv({
    base: 'flex items-center justify-center',
  })
</script>

<template>
  <ContextMenuItemIndicator v-bind="forwarded" :class="styles({ class: props.class })">
    <slot>
      <Icon v-if="icon" :name="icon" class="size-4" />
    </slot>
  </ContextMenuItemIndicator>
</template>

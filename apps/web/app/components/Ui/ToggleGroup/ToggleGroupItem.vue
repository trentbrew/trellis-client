<script lang="ts" setup>
  import { ToggleGroupItem, useForwardProps } from 'reka-ui'
  import type { ToggleGroupItemProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  import { toggleStyles } from '../Toggle.vue'

  const props = defineProps<
    ToggleGroupItemProps & {
      /** custom class to add to the toggle */
      class?: ClassNameValue
      /** icon to display */
      icon?: string
      /** variant of the toggle */
      variant?: VariantProps<typeof toggleStyles>['variant']
      /** size of the toggle */
      size?: VariantProps<typeof toggleStyles>['size']
    }
  >()

  const forwarded = useForwardProps(reactiveOmit(props, 'class', 'icon', 'variant', 'size'))
</script>

<template>
  <ToggleGroupItem
    data-slot="toggle-group-item"
    v-bind="forwarded"
    :class="toggleStyles({ class: props.class, size, variant })"
  >
    <slot>
      <Icon v-if="icon" class="size-4" :name="icon" />
    </slot>
  </ToggleGroupItem>
</template>

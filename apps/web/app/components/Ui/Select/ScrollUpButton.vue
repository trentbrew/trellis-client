<script lang="ts" setup>
  import { SelectScrollUpButton } from 'reka-ui'
  import type { SelectScrollUpButtonProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SelectScrollUpButtonProps & {
      /** Icon to render */
      icon?: string
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'icon')
  const styles = tv({
    base: 'flex cursor-default items-center justify-center py-1',
  })
</script>

<template>
  <SelectScrollUpButton :class="styles({ class: props.class })" data-slot="select-scroll-up-button" v-bind="forwarded">
    <slot>
      <Icon :name="icon || 'lucide:chevron-up'" class="size-4" />
    </slot>
  </SelectScrollUpButton>
</template>

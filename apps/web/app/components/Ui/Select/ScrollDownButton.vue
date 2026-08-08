<script lang="ts" setup>
  import { SelectScrollDownButton } from 'reka-ui'
  import type { SelectScrollDownButtonProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SelectScrollDownButtonProps & {
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
  <SelectScrollDownButton
    data-slot="select-scroll-down-button"
    :class="styles({ class: props.class })"
    v-bind="forwarded"
  >
    <slot><Icon :name="icon || 'lucide:chevron-down'" class="size-4" /></slot>
  </SelectScrollDownButton>
</template>

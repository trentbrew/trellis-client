<script lang="ts" setup>
  import { NumberFieldDecrement, useForwardProps } from 'reka-ui'
  import type { NumberFieldDecrementProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      NumberFieldDecrementProps & {
        class?: ClassNameValue
        icon?: string
      }
    >(),
    { icon: 'lucide:minus' },
  )

  const forwarded = useForwardProps(reactiveOmit(props, 'class'))

  const styles = tv({
    base: 'flex h-full shrink-0 items-center justify-center bg-transparent p-3 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  })
</script>

<template>
  <NumberFieldDecrement data-slot="number-field-decrement" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot>
      <Icon :name="props.icon" />
    </slot>
  </NumberFieldDecrement>
</template>

<script lang="ts" setup>
  import { StepperItem, useForwardProps } from 'reka-ui'
  import type { StepperItemProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    StepperItemProps & {
      class?: ClassNameValue
    }
  >()

  const forwarded = useForwardProps(reactiveOmit(props, 'class'))
  const styles = tv({
    base: 'group/step flex items-center group-data-[orientation=horizontal]/stepper:flex-row group-data-[orientation=vertical]/stepper:flex-col',
  })
</script>

<template>
  <StepperItem v-slot="slotProps" data-slot="stepper-item" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot v-bind="slotProps" />
  </StepperItem>
</template>

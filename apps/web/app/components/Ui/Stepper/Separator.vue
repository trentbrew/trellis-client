<script lang="ts" setup>
  import { StepperSeparator, useForwardProps } from 'reka-ui'
  import type { StepperSeparatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    StepperSeparatorProps & {
      class?: ClassNameValue
    }
  >()

  const forwarded = useForwardProps(reactiveOmit(props, 'class'))

  const styles = tv({
    base: 'm-0.5 bg-muted group-data-[orientation=horizontal]/stepper:h-0.5 group-data-[orientation=horizontal]/stepper:w-full group-data-[orientation=horizontal]/stepper:flex-1 group-data-[orientation=vertical]/stepper:h-12 group-data-[orientation=vertical]/stepper:w-0.5 group-data-[state=completed]/step:bg-primary',
  })
</script>

<template>
  <StepperSeparator data-slot="stepper-separator" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </StepperSeparator>
</template>

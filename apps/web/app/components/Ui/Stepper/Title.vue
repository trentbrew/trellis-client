<script lang="ts" setup>
  import { StepperTitle, useForwardProps } from 'reka-ui'
  import type { StepperTitleProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    StepperTitleProps & {
      class?: ClassNameValue
    }
  >()
  const forwarded = useForwardProps(reactiveOmit(props, 'class'))
  const styles = tv({ base: 'text-sm font-medium' })
</script>

<template>
  <StepperTitle v-bind="forwarded" data-slot="stepper-title" :class="styles({ class: props.class })">
    <slot />
  </StepperTitle>
</template>

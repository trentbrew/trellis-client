<script lang="ts" setup>
  import { StepperDescription, useForwardProps } from 'reka-ui'
  import type { StepperDescriptionProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    StepperDescriptionProps & {
      class?: ClassNameValue
    }
  >()

  const forwarded = useForwardProps(reactiveOmit(props, 'class'))

  const styles = tv({ base: 'text-sm text-muted-foreground' })
</script>

<template>
  <StepperDescription
    v-slot="slotProps"
    data-slot="stepper-description"
    v-bind="forwarded"
    :class="styles({ class: props.class })"
  >
    <slot v-bind="slotProps" />
  </StepperDescription>
</template>

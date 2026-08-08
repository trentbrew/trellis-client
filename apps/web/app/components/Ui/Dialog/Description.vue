<script lang="ts" setup>
  import { DialogDescription } from 'reka-ui'
  import type { DialogDescriptionProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    DialogDescriptionProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
      /** The description text */
      description?: string
    }
  >()
  const forwarded = reactiveOmit(props, 'class', 'description')
  const styles = tv({
    base: 'text-sm text-muted-foreground',
  })
</script>

<template>
  <DialogDescription data-slot="dialog-description" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot>{{ description }}</slot>
  </DialogDescription>
</template>

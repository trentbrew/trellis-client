<script lang="ts" setup>
  import { CollapsibleContent } from 'reka-ui'
  import type { CollapsibleContentProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    CollapsibleContentProps & {
      /** Customer class(es) to add to the element */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'overflow-hidden transition duration-200 will-change-auto data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=open]:overflow-visible',
  })
</script>

<template>
  <CollapsibleContent data-slot="collapsible-content" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot />
  </CollapsibleContent>
</template>

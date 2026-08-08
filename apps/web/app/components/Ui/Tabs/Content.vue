<script lang="ts" setup>
  import { TabsContent } from 'reka-ui'
  import type { TabsContentProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    TabsContentProps & {
      /** Custom class(es) to add to parent element */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'flex-1 outline-none',
  })
</script>

<template>
  <TabsContent data-slot="tabs-content" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </TabsContent>
</template>

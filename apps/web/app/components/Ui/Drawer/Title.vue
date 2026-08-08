<script lang="ts" setup>
  import { DrawerTitle } from 'vaul-vue'
  import type { DrawerTitleProps } from 'vaul-vue'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    DrawerTitleProps & {
      /**
       * Custom class(es) to add to the parent.
       */
      class?: ClassNameValue
      /**
       * The text content of the title.
       */
      text?: string
    }
  >()

  const styles = tv({
    base: 'text-lg leading-none font-semibold tracking-tight',
  })
</script>

<template>
  <DrawerTitle data-slot="drawer-title" v-bind="props" :class="styles({ class: props.class })">
    <slot>
      {{ props.text }}
    </slot>
  </DrawerTitle>
</template>

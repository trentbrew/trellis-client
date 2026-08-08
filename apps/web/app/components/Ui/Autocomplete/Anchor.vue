<script lang="ts" setup>
  import { ComboboxAnchor } from 'reka-ui'
  import type { ComboboxAnchorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    ComboboxAnchorProps & {
      class?: ClassNameValue
    }
  >()

  const styles = tv({
    base: 'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-base shadow-xs transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:outline-none dark:bg-input/30',
  })
</script>

<template>
  <ComboboxAnchor data-slot="autocomplete-anchor" v-bind="props" :class="styles({ class: props.class })">
    <slot />
  </ComboboxAnchor>
</template>

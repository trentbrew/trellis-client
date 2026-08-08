<script lang="ts">
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const sideBarMenuStyles = tv({
    base: 'flex w-full min-w-0 flex-col gap-1',
  })
</script>
<script setup lang="ts">
  const props = defineProps<{
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }>()
</script>
<template>
  <ul data-slot="sidebar-menu" data-sidebar="menu" :class="sideBarMenuStyles({ class: props.class })">
    <slot />
  </ul>
</template>

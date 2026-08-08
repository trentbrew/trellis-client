<script lang="ts">
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const sideBarMenuItemStyles = tv({
    base: 'group/menu-item relative',
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
  <li data-slot="sidebar-menu-item" data-sidebar="menu-item" :class="sideBarMenuItemStyles({ class: props.class })">
    <slot />
  </li>
</template>

<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const styles = tv({
    base: 'group/menu-sub-item relative',
  })

  const props = defineProps<{
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }>()
</script>

<template>
  <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" :class="styles({ class: props.class })">
    <slot />
  </li>
</template>

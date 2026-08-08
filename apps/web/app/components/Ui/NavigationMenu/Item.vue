<script lang="ts" setup>
  import { NavigationMenuItem } from 'reka-ui'
  import type { NavigationMenuItemProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const styles = tv({ base: 'relative' })

  const props = defineProps<
    NavigationMenuItemProps & {
      class?: ClassNameValue
    }
  >()
</script>

<template>
  <NavigationMenuItem :class="styles({ class: props.class })" data-slot="navigation-menu-item" v-bind="props">
    <slot />
  </NavigationMenuItem>
</template>

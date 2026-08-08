<script lang="ts" setup>
  import { NavigationMenuList } from 'reka-ui'
  import type { NavigationMenuListProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    NavigationMenuListProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'group flex flex-1 list-none items-center justify-center gap-1',
  })
</script>

<template>
  <NavigationMenuList data-slot="navigation-menu-list" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </NavigationMenuList>
</template>

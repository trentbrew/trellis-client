<script lang="ts" setup generic="T extends Record<string, any>">
  import { TreeItem, useForwardPropsEmits } from 'reka-ui'
  import type { ComputedRef } from 'vue'
  import type { TreeItemEmits, TreeItemProps } from 'reka-ui'

  const props = defineProps<TreeItemProps<T>>()
  const emit = defineEmits<TreeItemEmits<T>>()

  const forwarded = useForwardPropsEmits(props, emit) as unknown as ComputedRef<TreeItemProps<T> & Record<string, any>>
</script>

<template>
  <TreeItem v-slot="slotProps" data-slot="tree-item" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </TreeItem>
</template>

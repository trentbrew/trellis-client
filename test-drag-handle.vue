<script lang="ts" setup>
import { ref } from 'vue'
import { NodeSelection } from 'prosemirror-state'
const currentDragPos = ref<number | null>(null)
</script>
<template>
  <DragHandle
    @node-change="({ pos }) => currentDragPos = pos"
    @click="onDragHandleClick"
  />
</template>

<script lang="ts" setup>
  import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

  const props = defineProps(nodeViewProps)

  const isActive = computed(() => !!(props.node.attrs.active as boolean))
</script>

<template>
  <NodeViewWrapper class="tab-item-block" :class="{ 'is-active': isActive }" data-type="tab-item">
    <div v-show="isActive" class="tab-item-content">
      <NodeViewContent />
    </div>
  </NodeViewWrapper>
</template>

<style>
  .tab-item-block {
    display: block;
  }

  .tab-item-block:not(.is-active) {
    display: none;
  }

  .tab-item-content > * {
    margin-top: 0;
  }

  .tab-item-content > *:last-child {
    margin-bottom: 0;
  }
</style>

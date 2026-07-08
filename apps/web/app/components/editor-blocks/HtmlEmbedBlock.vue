<script setup lang="ts">
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import HtmlEmbedFrame from './HtmlEmbedFrame.vue'
  import type { HtmlEmbedConfig } from '~/lib/block-registry/types'
  import { createHtmlEmbedConfig } from '~/lib/block-registry/html-embed'

  const props = defineProps(nodeViewProps)

  const config = computed<HtmlEmbedConfig>(() =>
    createHtmlEmbedConfig({
      id: props.node.attrs.id as string | undefined,
      title: props.node.attrs.title as string | undefined,
      source: props.node.attrs.source as string | undefined,
      height: props.node.attrs.height as number | undefined,
      lastValidSource: props.node.attrs.lastValidSource as string | undefined,
    }),
  )

  function updateSource(source: string) {
    props.updateAttributes({
      source,
      lastValidSource: source,
    })
  }
</script>

<template>
  <NodeViewWrapper as="div" data-type="html-embed" contenteditable="false">
    <HtmlEmbedFrame
      :config="config"
      :editable="editor?.isEditable"
      :selected="selected"
      surface="rich-text"
      @update:source="updateSource"
      @remove="deleteNode"
    />
  </NodeViewWrapper>
</template>

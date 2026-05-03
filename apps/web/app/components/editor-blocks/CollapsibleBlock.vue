<script lang="ts" setup>
  import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

  const props = defineProps(nodeViewProps)

  const isOpen = computed(() => props.node.attrs.open as boolean)
  const title = computed(() => (props.node.attrs.title as string) || 'Toggle')

  function toggleOpen() {
    props.updateAttributes({ open: !isOpen.value })
  }

  function handleTitleInput(event: Event) {
    const input = event.target as HTMLInputElement
    props.updateAttributes({ title: input.value })
  }
</script>

<template>
  <NodeViewWrapper class="collapsible-block" data-type="collapsible">
    <div class="collapsible-summary" contenteditable="false">
      <button
        type="button"
        class="collapsible-toggle"
        :class="{ 'is-open': isOpen }"
        :aria-expanded="isOpen"
        :title="isOpen ? 'Collapse' : 'Expand'"
        @click.stop="toggleOpen">
        <Icon name="lucide:chevron-right" class="h-3.5 w-3.5 collapsible-chevron" />
      </button>
      <input
        class="collapsible-title"
        :value="title"
        placeholder="Toggle"
        @input="handleTitleInput"
        @keydown.enter.prevent="toggleOpen" />
    </div>
    <div v-show="isOpen" class="collapsible-content-wrapper">
      <NodeViewContent class="collapsible-content" />
    </div>
  </NodeViewWrapper>
</template>

<style>
  .collapsible-block {
    border-radius: 0.375rem;
    margin: 0.375rem 0;
  }

  .collapsible-summary {
    align-items: center;
    display: flex;
    gap: 0.25rem;
    padding: 0.125rem 0;
    user-select: none;
  }

  .collapsible-toggle {
    align-items: center;
    background: none;
    border: none;
    border-radius: 0.25rem;
    color: var(--muted-foreground);
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    height: 1.5rem;
    justify-content: center;
    padding: 0;
    transition: color 100ms;
    width: 1.5rem;
  }

  .collapsible-toggle:hover {
    color: var(--foreground);
  }

  .collapsible-chevron {
    flex-shrink: 0;
    transition: transform 150ms ease;
  }

  .collapsible-toggle.is-open .collapsible-chevron {
    transform: rotate(90deg);
  }

  .collapsible-title {
    background: none;
    border: none;
    color: var(--foreground);
    cursor: text;
    flex: 1;
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.5;
    min-width: 0;
    outline: none;
    padding: 0;
  }

  .collapsible-title::placeholder {
    color: var(--muted-foreground);
  }

  .collapsible-content-wrapper {
    border-left: 2px solid var(--border);
    margin-left: 0.6875rem;
    margin-top: 0.25rem;
    padding-left: 1rem;
  }

  .collapsible-content > * {
    margin: 0;
  }
</style>

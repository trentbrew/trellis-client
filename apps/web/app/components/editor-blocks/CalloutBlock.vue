<script lang="ts" setup>
  import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
  import { CALLOUT_VARIANTS, type CalloutVariant } from '~/lib/callout-extension'

  const props = defineProps(nodeViewProps)

  const variant = computed(() => (props.node.attrs.variant || 'info') as CalloutVariant)

  const config = computed(() => {
    return CALLOUT_VARIANTS.find((v) => v.id === variant.value) ?? CALLOUT_VARIANTS[0]!
  })

  const colorClasses = computed(() => {
    const c = config.value.color
    return {
      bg: `callout-bg-${c}`,
      border: `callout-border-${c}`,
      icon: `callout-icon-${c}`,
    }
  })

  function cycleVariant() {
    const currentIdx = CALLOUT_VARIANTS.findIndex((v) => v.id === variant.value)
    const nextIdx = (currentIdx + 1) % CALLOUT_VARIANTS.length
    props.updateAttributes({ variant: CALLOUT_VARIANTS[nextIdx]!.id })
  }
</script>

<template>
  <NodeViewWrapper class="callout-block" :class="[colorClasses.bg, colorClasses.border]" data-type="callout">
    <button
      type="button"
      class="callout-icon-button"
      :class="colorClasses.icon"
      contenteditable="false"
      :title="`${config.label} — click to change`"
      @click.stop="cycleVariant">
      <Icon :name="config.icon" class="h-4 w-4" />
    </button>
    <NodeViewContent class="callout-content" />
  </NodeViewWrapper>
</template>

<style>
  .callout-block {
    border-radius: 0.5rem;
    border-left-width: 3px;
    border-left-style: solid;
    display: flex;
    gap: 0.625rem;
    margin: 0.75rem 0;
    padding: 0.75rem 1rem;
    position: relative;
  }

  .callout-icon-button {
    align-items: center;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    height: 1.5rem;
    justify-content: center;
    margin-top: 0.125rem;
    padding: 0;
    transition: opacity 150ms;
    width: 1.5rem;
    background: transparent;
  }

  .callout-icon-button:hover {
    opacity: 0.7;
  }

  .callout-content {
    flex: 1;
    min-width: 0;
  }

  .callout-content > * {
    margin: 0;
  }

  /* ── Variant colors ── */
  .callout-bg-blue { background: color-mix(in oklch, oklch(0.62 0.17 250) 8%, transparent); }
  .callout-bg-amber { background: color-mix(in oklch, oklch(0.72 0.17 70) 8%, transparent); }
  .callout-bg-emerald { background: color-mix(in oklch, oklch(0.72 0.18 150) 8%, transparent); }
  .callout-bg-red { background: color-mix(in oklch, oklch(0.63 0.21 25) 8%, transparent); }
  .callout-bg-purple { background: color-mix(in oklch, oklch(0.60 0.19 295) 8%, transparent); }
  .callout-bg-gray { background: hsl(var(--muted) / 0.5); }

  .callout-border-blue { border-left-color: oklch(0.62 0.17 250); }
  .callout-border-amber { border-left-color: oklch(0.72 0.17 70); }
  .callout-border-emerald { border-left-color: oklch(0.72 0.18 150); }
  .callout-border-red { border-left-color: oklch(0.63 0.21 25); }
  .callout-border-purple { border-left-color: oklch(0.60 0.19 295); }
  .callout-border-gray { border-left-color: hsl(var(--border)); }

  .callout-icon-blue { color: oklch(0.62 0.17 250); }
  .callout-icon-amber { color: oklch(0.72 0.17 70); }
  .callout-icon-emerald { color: oklch(0.72 0.18 150); }
  .callout-icon-red { color: oklch(0.63 0.21 25); }
  .callout-icon-purple { color: oklch(0.60 0.19 295); }
  .callout-icon-gray { color: hsl(var(--muted-foreground)); }
</style>

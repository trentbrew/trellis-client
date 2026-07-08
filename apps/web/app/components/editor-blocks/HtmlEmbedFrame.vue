<script setup lang="ts">
  import type { HtmlEmbedConfig } from '~/lib/block-registry/types'
  import {
    htmlEmbedIframeSandbox,
    htmlEmbedIframeTitle,
    htmlSourceContainsScript,
  } from '~/lib/block-registry/html-embed'

  const props = withDefaults(
    defineProps<{
      config: HtmlEmbedConfig
      editable?: boolean
      selected?: boolean
      surface?: 'rich-text' | 'deck'
    }>(),
    {
      editable: false,
      selected: false,
      surface: 'rich-text',
    },
  )

  const emit = defineEmits<{
    'update:source': [source: string]
    remove: []
  }>()

  const sourceDraft = ref(props.config.source)
  const showSource = ref(props.editable && !props.config.source.trim())

  const containsScript = computed(() => htmlSourceContainsScript(sourceDraft.value))
  const iframeTitle = computed(() => htmlEmbedIframeTitle(props.config))
  const iframeHeight = computed(() => `${Math.max(120, props.config.height ?? 320)}px`)

  watch(
    () => props.config.source,
    (source) => {
      if (source !== sourceDraft.value) sourceDraft.value = source
    },
  )

  function updateSource() {
    emit('update:source', sourceDraft.value)
  }
</script>

<template>
  <section
    class="overflow-hidden rounded-lg border bg-muted/20"
    :class="[
      selected ? 'border-orange-400/70 shadow-[0_0_0_1px_rgba(255,138,76,0.65)]' : 'border-border',
      surface === 'deck' ? 'h-full' : 'my-4',
    ]"
    role="group"
    aria-label="HTML embed block"
  >
    <header class="flex items-center gap-2 border-b border-border bg-orange-500/10 px-3 py-2 text-xs">
      <span class="font-mono text-[10px] font-semibold uppercase tracking-wider text-orange-300">HTML</span>
      <span class="min-w-0 flex-1 truncate font-medium">{{ config.title || 'HTML embed' }}</span>
      <span
        class="rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
        :class="containsScript ? 'border-amber-400/50 text-amber-300' : 'border-emerald-400/40 text-emerald-300'"
      >
        {{ containsScript ? 'scripts disabled' : 'sandboxed' }}
      </span>
      <button
        v-if="editable"
        type="button"
        class="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        @click.stop="showSource = !showSource"
      >
        {{ showSource ? 'Preview' : 'Source' }}
      </button>
      <button
        v-if="editable"
        type="button"
        class="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
        aria-label="Remove HTML embed"
        @click.stop="emit('remove')"
      >
        ×
      </button>
    </header>

    <div v-if="showSource && editable" class="space-y-2 p-3">
      <label class="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground" for="html-embed-source">
        Source HTML
      </label>
      <textarea
        id="html-embed-source"
        v-model="sourceDraft"
        class="min-h-40 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-orange-400"
        spellcheck="false"
        @blur="updateSource"
      />
      <p class="text-[11px] leading-relaxed text-muted-foreground">
        Rendered in a sandboxed iframe. Scripts, forms, popups, and same-origin access are disabled.
      </p>
    </div>

    <div v-else class="relative bg-background">
      <iframe
        class="block w-full bg-background"
        :style="{ height: iframeHeight }"
        :srcdoc="sourceDraft"
        :sandbox="htmlEmbedIframeSandbox()"
        referrerpolicy="no-referrer"
        :title="iframeTitle"
      />
    </div>
  </section>
</template>

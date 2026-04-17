<script lang="ts" setup>
  /**
   * EmailContent — renders a Gmail thread body + headers.
   *
   * AI entity/tag suggestions are now surfaced in the right sidebar
   * (see EntityAISuggestionsPanel mounted from EntityRightSidebar).
   */

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  // ── Email fields ──────────────────────────────────────────────────────
  const from = computed(() => item.value?.from || '')
  const to = computed(() => item.value?.to || '')
  const cc = computed(() => item.value?.cc || '')
  const date = computed(() => item.value?.date || '')

  function formatSender(raw: string): string {
    const match = /^(.+?)\s*<(.+)>$/.exec(raw)
    return match?.[1]?.replace(/["']/g, '').trim() || raw
  }

  function formatDate(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  /**
   * Clean an email's HTML body for embedding inside the Trellis UI.
   *
   * Goals:
   *  - Drop scripts/styles/trackers (security + layout safety).
   *  - Strip colour-scheme directives so dark emails don't render black-on-black
   *    and light emails don't render white-on-white under dark mode.
   *  - Leave structure/layout intact (tables, images, links, spacing).
   *
   * All sender-provided colours are neutralised — the Trellis theme then drives
   * all text + background colours via the wrapping `.email-body` styles.
   */
  function sanitizedBody(html: string | undefined): string {
    if (!html) return ''

    let cleaned = html
      // Remove executable / style blocks entirely.
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/<meta\b[^>]*>/gi, '')
      // Drop legacy <font color="…"> wrappers but keep their content.
      .replace(/<font\b[^>]*>/gi, '<span>')
      .replace(/<\/font>/gi, '</span>')

    // Strip colour-bearing attributes on any tag: bgcolor, color, text,
    // link, vlink, alink (these appear on <body>, <table>, <td>, etc.).
    cleaned = cleaned.replace(/\s(bgcolor|color|text|link|vlink|alink)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

    // Strip colour-related declarations from inline style="" — keep layout
    // properties like padding, margin, width, display, etc.
    cleaned = cleaned.replace(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_m, dq, sq) => {
      const raw = (dq ?? sq ?? '') as string
      if (!raw) return ''
      const filtered = raw
        .split(';')
        .map((decl) => decl.trim())
        .filter((decl) => {
          if (!decl) return false
          const prop = decl.split(':')[0]?.trim().toLowerCase() || ''
          // Any colour/background property gets dropped.
          return !/^(color|background(-[a-z]+)?|border[-a-z]*color|outline-color|fill|stroke|filter|backdrop-filter)$/.test(
            prop,
          )
        })
        .join('; ')
      return filtered ? `style="${filtered}"` : ''
    })

    return cleaned
  }
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Email metadata header -->
    <div class="px-4 py-3 border-b border-border bg-muted/20 shrink-0 space-y-1.5">
      <div class="flex items-center gap-2 text-sm">
        <div class="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
          <span class="text-xs font-semibold text-rose-600">
            {{ formatSender(from).charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-medium truncate">{{ formatSender(from) }}</div>
          <div class="text-xs text-muted-foreground truncate">
            to {{ to }}
            <span v-if="cc">· cc {{ cc }}</span>
          </div>
        </div>
        <time class="text-xs text-muted-foreground shrink-0">{{ formatDate(date) }}</time>
      </div>
    </div>

    <!-- Email body — sanitized + colour-neutralised so it adopts the
         Trellis theme (tokens in .email-body below override any leftover
         sender colours that slipped through the regex sanitiser). -->
    <div class="flex-1 overflow-y-auto">
      <div
        class="email-body prose prose-sm dark:prose-invert max-w-none p-6 text-sm"
        v-html="sanitizedBody(item.bodyHtml) || item.bodyText || item.snippet || ''" />
    </div>
  </div>
</template>

<style scoped>
  /* Force all sender HTML to inherit Trellis theme colours. Inline
     `style=""` is stripped in sanitizedBody(), but <img>, <a>, and any
     UA defaults still carry their own colours — this normalises them. */
  .email-body :deep(*) {
    color: inherit !important;
    background-color: transparent !important;
    background-image: none !important;
    border-color: hsl(var(--border)) !important;
  }

  .email-body :deep(a) {
    color: hsl(var(--primary)) !important;
    text-decoration: underline;
  }

  /* Keep images visible — transparent background would otherwise hide
     PNGs that rely on a white canvas. Let them carry their own pixels. */
  .email-body :deep(img) {
    background-color: transparent !important;
    max-width: 100%;
    height: auto;
  }

  /* Preserve table structure but normalise cells. */
  .email-body :deep(table),
  .email-body :deep(td),
  .email-body :deep(th),
  .email-body :deep(tr) {
    background-color: transparent !important;
  }

  /* Code/pre blocks keep their tokenised theme via prose styles. */
  .email-body :deep(code),
  .email-body :deep(pre) {
    background-color: hsl(var(--muted)) !important;
    color: hsl(var(--foreground)) !important;
  }

  /* Blockquotes get a subtle tint so they read as quotes. */
  .email-body :deep(blockquote) {
    border-left: 3px solid hsl(var(--border)) !important;
    color: hsl(var(--muted-foreground)) !important;
  }
</style>

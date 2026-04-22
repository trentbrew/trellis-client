<script lang="ts" setup>
  /**
   * EmailContent — renders a Gmail thread body + headers.
   *
   * Body renders inside a sandboxed iframe so the email's own CSS is
   * preserved and fully isolated from the app's Tailwind/theme styles.
   */
  import { buildEmailSrcdoc } from '~/lib/emailRender'

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

  const srcdoc = computed(() => buildEmailSrcdoc(item.value || {}))

  // ── Auto-resize iframe to content height ───────────────────────────
  const iframeRef = ref<HTMLIFrameElement | null>(null)
  const iframeHeight = ref(200)
  let resizeObserver: ResizeObserver | null = null

  function syncHeight() {
    const doc = iframeRef.value?.contentDocument
    if (!doc?.body) return
    const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
    if (h > 0) iframeHeight.value = h
  }

  function onIframeLoad() {
    syncHeight()
    const doc = iframeRef.value?.contentDocument
    if (!doc?.body) return
    // Re-measure when embedded images finish loading.
    const imgs = Array.from(doc.images || [])
    for (const img of imgs) {
      if (!img.complete) {
        img.addEventListener('load', syncHeight, { once: true })
        img.addEventListener('error', syncHeight, { once: true })
      }
    }
    resizeObserver?.disconnect()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => syncHeight())
      resizeObserver.observe(doc.body)
    }
  }

  watch(srcdoc, () => {
    iframeHeight.value = 200
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })
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

    <!-- Sandboxed iframe: email CSS stays intact, app theme can't leak in -->
    <div class="flex-1 overflow-y-auto bg-white">
      <iframe
        ref="iframeRef"
        :srcdoc="srcdoc"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
        class="w-full block border-0"
        :style="{ height: iframeHeight + 'px' }"
        @load="onIframeLoad" />
    </div>
  </div>
</template>

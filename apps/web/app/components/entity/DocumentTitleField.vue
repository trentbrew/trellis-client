<script lang="ts" setup>
  import { DOC_TITLE_CLASS } from '~/lib/document-chrome'

  export interface DocumentTitlePeer {
    peerId: string
    name: string
    initials: string
    color: string
  }

  const props = withDefaults(
    defineProps<{
      title: string
      mode?: 'view' | 'create' | 'edit'
      placeholder?: string
      peers?: DocumentTitlePeer[]
    }>(),
    {
      mode: 'edit',
      placeholder: 'Untitled',
      peers: () => [],
    },
  )

  const emit = defineEmits<{
    'update:title': [value: string]
    focus: []
    blur: []
  }>()

  const isViewMode = computed(() => props.mode === 'view')
  const titleRef = ref<HTMLTextAreaElement | null>(null)

  const viewTitleClass = computed(() =>
    DOC_TITLE_CLASS.replace('focus:ring-2 focus:ring-primary/35', ''),
  )

  const supportsFieldSizing = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')

  function resizeTitleField() {
    const el = titleRef.value
    if (!el || supportsFieldSizing) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }

  function onInput(e: Event) {
    const el = e.target as HTMLTextAreaElement
    emit('update:title', el.value)
    resizeTitleField()
  }

  watch(
    () => props.title,
    () => nextTick(resizeTitleField),
  )

  let resizeObserver: ResizeObserver | undefined

  onMounted(() => {
    nextTick(() => {
      resizeTitleField()
      if (supportsFieldSizing || !titleRef.value) return
      resizeObserver = new ResizeObserver(() => resizeTitleField())
      resizeObserver.observe(titleRef.value)
    })
  })

  onUnmounted(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="relative w-full min-w-0">
    <textarea
      v-if="!isViewMode"
      ref="titleRef"
      data-testid="document-title"
      :value="title"
      :placeholder="placeholder"
      spellcheck="false"
      aria-label="Document title"
      :class="DOC_TITLE_CLASS"
      @input="onInput"
      @focus="emit('focus')"
      @blur="emit('blur')" />
    <h1 v-else data-testid="document-title" :class="[viewTitleClass, 'm-0']">
      {{ title || placeholder }}
    </h1>
    <span
      v-if="peers.length"
      class="absolute right-0 top-2 flex items-center -space-x-1 pr-1 pointer-events-none">
      <span
        v-for="peer in peers.slice(0, 3)"
        :key="peer.peerId"
        :title="peer.name + ' is editing title'"
        class="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-background shadow-sm"
        :class="peer.color">
        {{ peer.initials[0] }}
      </span>
    </span>
  </div>
</template>

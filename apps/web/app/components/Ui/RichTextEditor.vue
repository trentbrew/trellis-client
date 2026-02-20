<script lang="ts" setup>
  import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
  import StarterKit from '@tiptap/starter-kit'
  import Placeholder from '@tiptap/extension-placeholder'
  import { TextStyle } from '@tiptap/extension-text-style'
  import Color from '@tiptap/extension-color'
  import Highlight from '@tiptap/extension-highlight'
  import { TaskList, TaskItem } from '@tiptap/extension-list'
  import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
  import { ResizableImageExtension } from '~/lib/resizable-image-extension'
  import { TableKit } from '@tiptap/extension-table'
  import { Mathematics } from '@tiptap/extension-mathematics'
  import { common, createLowlight } from 'lowlight'
  import { EditorContent, useEditor, VueNodeViewRenderer } from '@tiptap/vue-3'
  import { TextSelection } from 'prosemirror-state'
  import CodeBlockComponent from './CodeBlockComponent.vue'
  import { createMentionExtension, parseMentionQuery } from '~/lib/mention-extension'
  import { createSlashCommandExtension } from '~/lib/slash-command-extension'
  import { Callout } from '~/lib/callout-extension'
  import { Collapsible } from '~/lib/collapsible-extension'
  import { TabsContainer, TabItem } from '~/lib/tabs-extension'
  import { EntityEmbed } from '~/lib/entity-embed-extension'
  import { QueryView } from '~/lib/query-view-extension'
  import { useEntitySearch } from '~/composables/useEntitySearch'
  import type { EntitySearchItem } from '~/composables/useEntitySearch'
  import { createDefaultItem } from '~/types/entity'
  import { useImageUpload } from '~/composables/useImageUpload'
  import { markdownToHtml } from '~/utils/markdown'
  import { BUILTIN_TEMPLATES } from '~/lib/noteTemplates'

  const lowlight = createLowlight(common)

  const TEXT_COLORS = [
    { label: 'Default', value: '' },
    { label: 'Gray', value: 'var(--muted-foreground)' },
    { label: 'Red', value: 'oklch(0.63 0.21 25)' },
    { label: 'Orange', value: 'oklch(0.72 0.17 50)' },
    { label: 'Yellow', value: 'oklch(0.83 0.17 85)' },
    { label: 'Green', value: 'oklch(0.72 0.18 150)' },
    { label: 'Blue', value: 'oklch(0.62 0.17 250)' },
    { label: 'Purple', value: 'oklch(0.60 0.19 295)' },
    { label: 'Pink', value: 'oklch(0.68 0.19 340)' },
  ]

  const HIGHLIGHT_COLORS = [
    { label: 'None', value: '' },
    { label: 'Red', value: 'oklch(0.85 0.08 25 / 0.3)' },
    { label: 'Orange', value: 'oklch(0.88 0.08 65 / 0.3)' },
    { label: 'Yellow', value: 'oklch(0.92 0.08 95 / 0.3)' },
    { label: 'Green', value: 'oklch(0.88 0.08 150 / 0.3)' },
    { label: 'Blue', value: 'oklch(0.85 0.08 250 / 0.3)' },
    { label: 'Purple', value: 'oklch(0.85 0.08 295 / 0.3)' },
    { label: 'Pink', value: 'oklch(0.88 0.08 340 / 0.3)' },
  ]

  const props = defineProps<{
    modelValue?: string
    placeholder?: string
    minHeight?: string
    compact?: boolean
    seamless?: boolean
    fillHeight?: boolean
    mentions?: boolean
    tasklist?: boolean
    images?: boolean
    tables?: boolean
    mathematics?: boolean
    draghandle?: boolean
    embeds?: boolean
    templates?: boolean
    collaborative?: boolean
    entityId?: string
    submitOnEnter?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'mention-click': [attrs: { id: string; label: string; entityType: string }]
    'submit': []
  }>()

  // ── Image upload infrastructure ──────────────────────────────────────
  const imageUpload = props.images ? useImageUpload(props.entityId) : null
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const nuxtApp = useNuxtApp()

  /** SVG placeholder shown while an image upload is in progress. */
  const UPLOAD_PLACEHOLDER_SRC = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">'
    + '<rect width="400" height="200" rx="6" fill="%23f4f4f5"/>'
    + '<text x="200" y="105" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="%23a1a1aa">Uploading\u2026</text>'
    + '</svg>',
  )}`

  /** Prefix for placeholder alt text — used to identify uploading images. */
  const PLACEHOLDER_ALT_PREFIX = '__uploading__'

  function makePlaceholderId(): string {
    return `${PLACEHOLDER_ALT_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  /** Replace an image node's attributes by matching its alt text marker. */
  function replaceImageAttrs(altMarker: string, newAttrs: Record<string, string>) {
    const e = editor.value
    if (!e) return
    const { tr } = e.state
    let found = false
    e.state.doc.descendants((node, pos) => {
      if (found) return false
      if (node.type.name === 'image' && node.attrs.alt === altMarker) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...newAttrs })
        found = true
        return false
      }
    })
    if (found) e.view.dispatch(tr)
  }

  /** Remove an image node by its alt text marker (used on upload failure). */
  function removePlaceholder(altMarker: string) {
    const e = editor.value
    if (!e) return
    const { tr } = e.state
    let found = false
    e.state.doc.descendants((node, pos) => {
      if (found) return false
      if (node.type.name === 'image' && node.attrs.alt === altMarker) {
        tr.delete(pos, pos + node.nodeSize)
        found = true
        return false
      }
    })
    if (found) e.view.dispatch(tr)
  }

  /** Collect all current image src values from the editor document. */
  function collectImageSrcs(): Set<string> {
    const srcs = new Set<string>()
    editor.value?.state.doc.descendants((node) => {
      if (node.type.name === 'image' && node.attrs.src) {
        srcs.add(node.attrs.src as string)
      }
    })
    return srcs
  }

  const editorClass = props.seamless
    ? 'min-h-[24px] focus:outline-none prose-sm prose-p:my-0.5 prose-headings:my-1 prose-ul:my-0.5 prose-li:my-0'
    : props.compact
      ? 'min-h-[60px] focus:outline-none prose-sm prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5'
      : 'min-h-[100px] focus:outline-none prose-sm prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-1'

  // Build entity search for mentions and embeds
  const entitySearch = (props.mentions || props.embeds) ? useEntitySearch() : null
  const { create: _createEntity, items: _allEntities } = (props.mentions || props.embeds || props.templates) ? useTrellisEntities() : { create: async () => null, items: ref([]) }
  const tablesEnabled = props.tables !== false
  const mathematicsEnabled = props.mathematics !== false

  // ── Collaborative editing ───────────────────────────────────────────
  const collabEntityId = computed(() => props.entityId)
  const collabEnabled = computed(() => !!props.collaborative && !!props.entityId)
  const initialContent = computed(() => props.modelValue || '')
  const { ydoc: _ydoc, collabExtensions, connectionStatus: _connectionStatus, isLeader: _isLeader, destroy: destroyCollab } = useCollaborativeEditor(
    collabEntityId,
    { initialContent, enabled: collabEnabled },
  )

  // ── Embed picker state ──────────────────────────────────────────────
  const showEntityPicker = ref(false)
  const showQueryPicker = ref(false)
  const entityPickerSearch = ref('')
  const queryPickerType = ref('task')

  const entityPickerItems = computed(() => {
    if (!entitySearch || !showEntityPicker.value) return []
    const q = entityPickerSearch.value.toLowerCase().trim()
    const items = entitySearch.filteredItems.value as EntitySearchItem[]
    if (!q) return items.slice(0, 20)
    return items.filter((i) =>
      i.title?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q),
    ).slice(0, 20)
  })

  function handleEmbedEntity(_editor: any) {
    showEntityPicker.value = true
    entityPickerSearch.value = ''
  }

  function handleEmbedQuery(_editor: any) {
    showQueryPicker.value = true
    queryPickerType.value = 'task'
  }

  function handleEmbedImage(_editor: any) {
    triggerImageUpload()
  }

  function selectEntityForEmbed(item: EntitySearchItem) {
    editor.value?.chain().focus().insertEntityEmbed({
      entityId: item.id,
      entityType: item.type,
      title: item.title || 'Untitled',
    }).run()
    showEntityPicker.value = false
  }

  function selectTypeForQuery() {
    editor.value?.chain().focus().insertQueryView({
      entityType: queryPickerType.value,
      maxRows: 5,
    }).run()
    showQueryPicker.value = false
  }

  const QUERY_TYPE_OPTIONS = [
    { value: 'task', label: 'Tasks' },
    { value: 'note', label: 'Notes' },
    { value: 'event', label: 'Events' },
    { value: 'person', label: 'People' },
    { value: 'project', label: 'Projects' },
    { value: 'bookmark', label: 'Bookmarks' },
    { value: 'goal', label: 'Goals' },
    { value: 'payment', label: 'Payments' },
  ]

  const DEFAULT_INLINE_MATH = '\\frac{a}{b}'
  const DEFAULT_BLOCK_MATH = '\\int_0^1 x^2\\,dx'

  function promptLatex(message: string, initialValue: string): string | null {
    if (typeof window === 'undefined') return null
    const value = window.prompt(message, initialValue)
    if (value === null) return null
    const trimmed = value.trim()
    return trimmed || initialValue
  }

  function insertInlineMath() {
    const e = editor.value as any
    if (!e) return
    const latex = promptLatex('Insert inline math (LaTeX)', DEFAULT_INLINE_MATH)
    if (!latex) return
    e.chain().focus().insertInlineMath({ latex }).run()
  }

  function insertBlockMath() {
    const e = editor.value as any
    if (!e) return
    const latex = promptLatex('Insert block math (LaTeX)', DEFAULT_BLOCK_MATH)
    if (!latex) return
    e.chain().focus().insertBlockMath({ latex }).run()
  }

  function editInlineMath(pos?: number, initialLatex?: string) {
    const e = editor.value as any
    if (!e) return
    const currentLatex = initialLatex || e.getAttributes('inlineMath')?.latex || DEFAULT_INLINE_MATH
    const latex = promptLatex('Edit inline math (LaTeX)', currentLatex)
    if (!latex) return

    const chain = e.chain().focus()
    if (typeof pos === 'number') chain.setNodeSelection(pos)
    chain.updateInlineMath({ latex }).run()
  }

  function editBlockMath(pos?: number, initialLatex?: string) {
    const e = editor.value as any
    if (!e) return
    const currentLatex = initialLatex || e.getAttributes('blockMath')?.latex || DEFAULT_BLOCK_MATH
    const latex = promptLatex('Edit block math (LaTeX)', currentLatex)
    if (!latex) return

    const chain = e.chain().focus()
    if (typeof pos === 'number') chain.setNodeSelection(pos)
    chain.updateBlockMath({ latex }).run()
  }

  const buildExtensions = () => {
    const exts = [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        // When collaborative, disable built-in history — Y.js handles undo/redo
        ...(collabEnabled.value ? { history: false } : {}),
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return VueNodeViewRenderer(CodeBlockComponent)
        },
      }).configure({ lowlight }),
      Placeholder.configure({
        placeholder: props.placeholder || '',
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ]
    if (tablesEnabled) {
      exts.push(
        TableKit.configure({
          table: {
            resizable: true,
          },
        }) as any,
      )
    }
    if (mathematicsEnabled) {
      exts.push(
        Mathematics.configure({
          inlineOptions: {
            onClick(node: any, pos: number) {
              editInlineMath(pos, node?.attrs?.latex)
            },
          },
          blockOptions: {
            onClick(node: any, pos: number) {
              editBlockMath(pos, node?.attrs?.latex)
            },
          },
          katexOptions: {
            throwOnError: false,
            strict: 'ignore',
          },
        }) as any,
      )
    }
    if (props.images) {
      exts.push(
        ResizableImageExtension.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: 'editor-image',
          },
        }) as any,
      )
    }
    if (props.tasklist) {
      exts.push(
        TaskList as any,
        TaskItem.configure({ nested: true }) as any,
      )
    }
    if (props.mentions && entitySearch) {
      exts.push(
        createMentionExtension({
          getItems(query: string) {
            const parsed = parseMentionQuery(query)
            if (parsed?.type) {
              entitySearch.search.value = parsed.name
              return (entitySearch.filteredItems.value as EntitySearchItem[]).filter(i => i.type === parsed.type)
            }
            entitySearch.search.value = query
            return entitySearch.filteredItems.value as EntitySearchItem[]
          },
          async onCreate(type: string | null, name: string) {
            const entityType = (type || 'note') as any
            const title = name.trim() || 'Untitled'
            const defaults = createDefaultItem(entityType)
            const id = await _createEntity({ ...defaults, type: entityType, title } as any)
            if (!id) return null
            return { id, title, type: entityType } as EntitySearchItem
          },
        }) as any,
      )
    }
    if (props.embeds || props.templates) {
      exts.push(
        createSlashCommandExtension({
          hasEmbeds: !!props.embeds,
          hasImages: !!props.images,
          onEmbedEntity: props.embeds ? handleEmbedEntity : undefined,
          onEmbedQuery: props.embeds ? handleEmbedQuery : undefined,
          onEmbedImage: (props.embeds && props.images) ? handleEmbedImage : undefined,
          getTemplates: () => {
            const userTemplates = (_allEntities.value ?? [])
              .filter((e: any) => e.type === 'template' && e.content)
              .map((e: any) => ({
                id: `user:${e.id}`,
                label: e.title || 'Untitled Template',
                description: e.description ? String(e.description).slice(0, 80) : 'Custom template',
                icon: 'lucide:file-text',
                content: e.content as string,
              }))
            return [...BUILTIN_TEMPLATES, ...userTemplates]
          },
        }) as any,
      )
      if (props.embeds) {
        exts.push(
          Callout as any,
          Collapsible as any,
          TabsContainer as any,
          TabItem as any,
          EntityEmbed as any,
          QueryView as any,
        )
      }
    }
    // Inject Y.js Collaboration extension when collaborative mode is active
    if (collabEnabled.value && collabExtensions.value.length) {
      exts.push(...collabExtensions.value)
    }
    return exts
  }

  /** Handle image files from paste, drop, or file input. */
  async function handleImageFiles(files: File[]) {
    if (!imageUpload || !editor.value) return
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    for (const file of imageFiles) {
      const placeholderId = makePlaceholderId()

      // Insert a visible placeholder so the user sees immediate feedback
      editor.value.chain().focus().setImage({
        src: UPLOAD_PLACEHOLDER_SRC,
        alt: placeholderId,
      }).run()

      try {
        const result = await imageUpload.uploadImage(file)
        replaceImageAttrs(placeholderId, { src: result.url, alt: file.name })
      } catch (err: any) {
        removePlaceholder(placeholderId)
        const message = err?.message || 'Image upload failed'
        console.error('[RichTextEditor] Image upload failed:', err)
        ;(nuxtApp as any).$toast?.error(message)
      }
    }
  }

  /**
   * After TipTap processes an HTML paste containing external images,
   * re-upload each new external image to our storage via server proxy.
   * Gracefully degrades: if proxy fails, the original URL is left intact.
   */
  async function reuploadExternalImages(beforeSrcs: Set<string>) {
    const e = editor.value
    if (!e || !props.images) return

    // Find new external image URLs added by the paste
    const seen = new Set<string>()
    const toReupload: string[] = []
    e.state.doc.descendants((node) => {
      if (node.type.name === 'image' && node.attrs.src) {
        const src = node.attrs.src as string
        if (/^https?:\/\//i.test(src) && !beforeSrcs.has(src) && !seen.has(src)) {
          seen.add(src)
          toReupload.push(src)
        }
      }
    })

    if (!toReupload.length) return

    for (const originalSrc of toReupload) {
      try {
        const timestamp = Date.now()
        const urlFilename = new URL(originalSrc).pathname.split('/').pop() || 'image'
        const sanitized = urlFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const scope = props.entityId || 'unscoped'
        const storagePath = `entities/${scope}/${timestamp}-${sanitized}`

        const result = await $fetch<{ url: string }>('/api/storage/proxy-upload', {
          method: 'POST',
          body: { url: originalSrc, path: storagePath },
        })

        if (result?.url) {
          // Replace all nodes still pointing at the original URL
          const { tr } = e.state
          let replaced = false
          e.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === originalSrc) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: result.url })
              replaced = true
            }
          })
          if (replaced) e.view.dispatch(tr)
        }
      } catch (err: any) {
        // Graceful degradation — leave the external URL as-is
        console.warn('[RichTextEditor] Failed to re-upload external image:', originalSrc, err?.message || err)
      }
    }
  }

  function onImageFileInput(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return
    handleImageFiles(Array.from(input.files))
    input.value = '' // reset so the same file can be re-selected
  }

  const editor = useEditor({
    extensions: buildExtensions(),
    content: markdownToHtml(props.modelValue || ''),
    editorProps: {
      attributes: {
        class: editorClass,
        spellcheck: 'false',
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        // Handle pasted image files (screenshots, "Copy Image")
        if (props.images && clipboardData.files.length) {
          const imageFiles = Array.from(clipboardData.files).filter((f) => f.type.startsWith('image/'))
          if (imageFiles.length) {
            event.preventDefault()
            handleImageFiles(imageFiles)
            return true
          }
        }

        const html = clipboardData.getData('text/html')

        // If pasting HTML that contains external images, let TipTap render it
        // immediately, then re-upload external images to our storage.
        if (html && props.images && /<img\s/i.test(html)) {
          const beforeSrcs = collectImageSrcs()
          // TipTap processes the HTML synchronously after we return false.
          // setTimeout(0) fires after that, so we can diff the document.
          setTimeout(() => reuploadExternalImages(beforeSrcs), 0)
          return false
        }

        if (html) return false // already has HTML — let TipTap handle it
        const text = clipboardData.getData('text/plain')
        if (!text) return false
        const converted = markdownToHtml(text)
        if (converted === text) return false // no conversion happened
        editor.value?.commands.insertContent(converted)
        return true
      },
      handleDrop: (view, event) => {
        if (!props.images || !event.dataTransfer?.files.length) return false
        const imageFiles = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
        if (!imageFiles.length) return false
        event.preventDefault()
        handleImageFiles(imageFiles)
        return true
      },
      handleKeyDown: (view, event) => {
        // Auto-indentation for code blocks: when Enter is pressed,
        // copy the leading whitespace from the current line to the new line
        if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
          const { state } = view
          const { selection } = state
          const { $from } = selection

          // Check if we're inside a code block
          const isInCodeBlock = $from.parent.type.name === 'codeBlock' ||
            $from.node($from.depth - 1)?.type?.name === 'codeBlock'

          if (isInCodeBlock) {
            const lineStart = $from.start($from.depth)
            const lineEnd = $from.pos
            const currentLine = state.doc.textBetween(lineStart, lineEnd, '\n')

            // Match leading whitespace (spaces or tabs)
            const indentMatch = currentLine.match(/^[\t ]*/)
            const currentIndent = indentMatch ? indentMatch[0] : ''

            // Check if the line ends with opening brace/bracket/paren for extra indent
            const shouldIncreaseIndent = /[{[(]\s*$/.test(currentLine)
            const extraIndent = shouldIncreaseIndent ? '  ' : ''
            const newIndent = currentIndent + extraIndent

            if (newIndent) {
              event.preventDefault()

              // Insert newline + indentation
              const tr = state.tr
              tr.insertText('\n' + newIndent, $from.pos)

              // Move cursor to after the inserted indentation
              const newPos = $from.pos + 1 + newIndent.length
              tr.setSelection(TextSelection.create(tr.doc, newPos))

              view.dispatch(tr)
              return true
            }
          }

        }
        // Submit on Cmd+Enter (or Ctrl+Enter)
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && props.submitOnEnter) {
          // Don't fire if a suggestion dropdown (mention/slash) is open
          const hasSuggestion = document.querySelector('.tippy-box, [data-tippy-root]')
          if (!hasSuggestion) {
            event.preventDefault()
            emit('submit')
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      // In collaborative mode, suppress emissions until Y.doc has been seeded
      // to prevent the empty Y.doc from overwriting persisted content.
      if (collabEnabled.value && !collabSeeded) return
      emit('update:modelValue', e.getHTML())
    },
  })

  // Seed Y.doc with initial HTML when collaborative mode is active.
  // The Collaboration extension ignores the `content` editor option,
  // so we populate via setContent after the editor is created. If a peer
  // sends full state later, Y.js CRDT merges cleanly (identical content = no-op).
  // useEditor() creates the editor asynchronously, so we must watch for it.
  let collabSeeded = false
  watch(
    () => editor.value,
    (e) => {
      if (!e || collabSeeded || !collabEnabled.value) return
      collabSeeded = true
      const html = markdownToHtml(props.modelValue || '')
      if (html && html !== '<p></p>') {
        e.commands.setContent(html)
      }
    },
    { immediate: true },
  )

  // External modelValue sync — suppressed when collaborative (Y.js doc is authoritative)
  watch(
    () => props.modelValue,
    (val) => {
      if (collabEnabled.value) return // Y.js doc is authoritative in collab mode
      if (editor.value && val !== editor.value.getHTML()) {
        editor.value.commands.setContent(markdownToHtml(val || ''))
      }
    },
  )

  onBeforeUnmount(() => {
    destroyCollab()
    editor.value?.destroy()
  })

  function clearContent() {
    editor.value?.commands.clearContent(true)
  }

  function focusEditor() {
    editor.value?.commands.focus()
  }

  function getEditor() {
    return editor.value
  }

  function triggerImageUpload() {
    imageInputRef.value?.click()
  }

  defineExpose({ clearContent, focusEditor, getEditor, triggerImageUpload })
</script>

<template>
  <div
    v-if="editor"
    :class="[
      seamless ? 'overflow-hidden' : 'rounded-none border-none bg-card overflow-hidden',
      fillHeight ? 'flex flex-col min-h-0' : '',
    ]">
    <!-- Drag Handle (conditional) -->
    <DragHandle
      v-if="draghandle && editor"
      :editor="editor"
      :nested="true">
      <div class="drag-handle" />
    </DragHandle>

    <!-- Compact Toolbar -->
    <div v-if="!seamless" class="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-1.5 py-[2.5px]">
      <!-- Text Formatting -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('bold')"
              @click="editor.chain().focus().toggleBold().run()">
              <Icon name="lucide:bold" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Bold</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('italic')"
              @click="editor.chain().focus().toggleItalic().run()">
              <Icon name="lucide:italic" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Italic</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('strike')"
              @click="editor.chain().focus().toggleStrike().run()">
              <Icon name="lucide:strikethrough" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Strike</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Headings -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('heading', { level: 1 })"
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
              <Icon name="lucide:heading-1" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Heading 1</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('heading', { level: 2 })"
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
              <Icon name="lucide:heading-2" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Heading 2</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('heading', { level: 3 })"
              @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
              <Icon name="lucide:heading-3" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Heading 3</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Lists -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('bulletList')"
              @click="editor.chain().focus().toggleBulletList().run()">
              <Icon name="lucide:list" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Bullet List</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('orderedList')"
              @click="editor.chain().focus().toggleOrderedList().run()">
              <Icon name="lucide:list-ordered" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Ordered List</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Block Elements -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('codeBlock')"
              @click="editor.chain().focus().toggleCodeBlock().run()">
              <Icon name="lucide:code" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Code Block</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('blockquote')"
              @click="editor.chain().focus().toggleBlockquote().run()">
              <Icon name="lucide:quote" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Blockquote</UiTooltipContent>
        </UiTooltip>
      </div>

      <!-- Tables -->
      <template v-if="tablesEnabled">
        <UiSeparator orientation="vertical" class="h-5 mx-0.5" />
        <div class="flex items-center">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <UiButton
                size="icon"
                variant="ghost"
                class="h-7 w-7"
                @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
                <Icon name="lucide:table" class="h-3.5 w-3.5" />
              </UiButton>
            </UiTooltipTrigger>
            <UiTooltipContent side="bottom" class="text-xs">Insert Table</UiTooltipContent>
          </UiTooltip>

          <UiPopover>
            <UiTooltip>
              <UiTooltipTrigger as-child>
                <UiPopoverTrigger as-child>
                  <UiButton
                    size="icon"
                    variant="ghost"
                    class="h-7 w-7"
                    :disabled="!editor.isActive('table')">
                    <Icon name="lucide:settings-2" class="h-3.5 w-3.5" />
                  </UiButton>
                </UiPopoverTrigger>
              </UiTooltipTrigger>
              <UiTooltipContent side="bottom" class="text-xs">Table Actions</UiTooltipContent>
            </UiTooltip>
            <UiPopoverContent class="w-64 p-2" align="start">
              <div class="grid grid-cols-2 gap-1">
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().addRowBefore().run()">
                  Row before
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().addRowAfter().run()">
                  Row after
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().addColumnBefore().run()">
                  Col before
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().addColumnAfter().run()">
                  Col after
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().toggleHeaderRow().run()">
                  Header row
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().toggleHeaderColumn().run()">
                  Header col
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().toggleHeaderCell().run()">
                  Header cell
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().mergeOrSplit().run()">
                  Merge/split
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().deleteRow().run()">
                  Delete row
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('table')"
                  @click="editor.chain().focus().deleteColumn().run()">
                  Delete col
                </UiButton>
              </div>
              <UiSeparator class="my-2" />
              <UiButton
                size="sm"
                variant="ghost"
                class="h-7 w-full justify-start text-xs text-destructive"
                :disabled="!editor.isActive('table')"
                @click="editor.chain().focus().deleteTable().run()">
                Delete table
              </UiButton>
            </UiPopoverContent>
          </UiPopover>
        </div>
      </template>

      <!-- Mathematics -->
      <template v-if="mathematicsEnabled">
        <UiSeparator orientation="vertical" class="h-5 mx-0.5" />
        <div class="flex items-center">
          <UiPopover>
            <UiTooltip>
              <UiTooltipTrigger as-child>
                <UiPopoverTrigger as-child>
                  <UiButton
                    size="icon"
                    variant="ghost"
                    class="h-7 w-7">
                    <Icon name="lucide:calculator" class="h-3.5 w-3.5" />
                  </UiButton>
                </UiPopoverTrigger>
              </UiTooltipTrigger>
              <UiTooltipContent side="bottom" class="text-xs">Mathematics</UiTooltipContent>
            </UiTooltip>
            <UiPopoverContent class="w-52 p-2" align="start">
              <div class="flex flex-col gap-1">
                <UiButton size="sm" variant="ghost" class="h-7 justify-start text-xs" @click="insertInlineMath()">
                  Insert inline math
                </UiButton>
                <UiButton size="sm" variant="ghost" class="h-7 justify-start text-xs" @click="insertBlockMath()">
                  Insert block math
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('inlineMath')"
                  @click="editInlineMath()">
                  Edit inline math
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  class="h-7 justify-start text-xs"
                  :disabled="!editor.isActive('blockMath')"
                  @click="editBlockMath()">
                  Edit block math
                </UiButton>
              </div>
            </UiPopoverContent>
          </UiPopover>
        </div>
      </template>

      <!-- Task List (conditional) -->
      <template v-if="tasklist">
        <UiSeparator orientation="vertical" class="h-5 mx-0.5" />
        <div class="flex items-center">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <UiToggle
                size="sm"
                class="h-7 w-7 p-0"
                :pressed="editor.isActive('taskList')"
                @click="editor.chain().focus().toggleTaskList().run()">
                <Icon name="lucide:list-checks" class="h-3.5 w-3.5" />
              </UiToggle>
            </UiTooltipTrigger>
            <UiTooltipContent side="bottom" class="text-xs">Task List</UiTooltipContent>
          </UiTooltip>
        </div>
      </template>

      <!-- Image Upload (conditional) -->
      <template v-if="images">
        <UiSeparator orientation="vertical" class="h-5 mx-0.5" />
        <div class="flex items-center">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <UiButton
                size="icon"
                variant="ghost"
                class="h-7 w-7"
                :disabled="imageUpload?.isUploading.value"
                @click="imageInputRef?.click()">
                <Icon v-if="!imageUpload?.isUploading.value" name="lucide:image-plus" class="h-3.5 w-3.5" />
                <Icon v-else name="svg-spinners:ring-resize" class="h-3.5 w-3.5" />
              </UiButton>
            </UiTooltipTrigger>
            <UiTooltipContent side="bottom" class="text-xs">Insert Image</UiTooltipContent>
          </UiTooltip>
        </div>
      </template>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Text Color -->
      <div class="flex items-center">
        <UiPopover>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <UiPopoverTrigger as-child>
                <UiButton
                  size="icon"
                  variant="ghost"
                  class="h-7 w-7 relative">
                  <Icon name="lucide:palette" class="h-3.5 w-3.5" />
                  <span
                    class="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3.5 rounded-full"
                    :style="{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }" />
                </UiButton>
              </UiPopoverTrigger>
            </UiTooltipTrigger>
            <UiTooltipContent side="bottom" class="text-xs">Text Color</UiTooltipContent>
          </UiTooltip>
          <UiPopoverContent class="w-auto p-2" align="start">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Text Color</span>
              <div class="flex gap-1">
                <button
                  v-for="c in TEXT_COLORS"
                  :key="c.label"
                  class="h-5 w-5 rounded-full border border-border/50 transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring"
                  :class="{ 'ring-1 ring-primary ring-offset-1 ring-offset-background': c.value ? editor.isActive('textStyle', { color: c.value }) : !editor.isActive('textStyle') }"
                  :style="{ backgroundColor: c.value || 'var(--foreground)' }"
                  :title="c.label"
                  @click="c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()" />
              </div>
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mt-1">Highlight</span>
              <div class="flex gap-1">
                <button
                  v-for="h in HIGHLIGHT_COLORS"
                  :key="h.label"
                  class="h-5 w-5 rounded-full border border-border/50 transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring"
                  :class="{ 'ring-1 ring-primary ring-offset-1 ring-offset-background': h.value ? editor.isActive('highlight', { color: h.value }) : !editor.isActive('highlight') }"
                  :style="{ backgroundColor: h.value || 'var(--muted)' }"
                  :title="h.label"
                  @click="h.value ? editor.chain().focus().toggleHighlight({ color: h.value }).run() : editor.chain().focus().unsetHighlight().run()" />
              </div>
            </div>
          </UiPopoverContent>
        </UiPopover>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Undo/Redo -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton
              size="icon"
              variant="ghost"
              class="h-7 w-7"
              :disabled="!editor.can().undo()"
              @click="editor.chain().focus().undo().run()">
              <Icon name="lucide:undo" class="h-3.5 w-3.5" />
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Undo</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton
              size="icon"
              variant="ghost"
              class="h-7 w-7"
              :disabled="!editor.can().redo()"
              @click="editor.chain().focus().redo().run()">
              <Icon name="lucide:redo" class="h-3.5 w-3.5" />
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Redo</UiTooltipContent>
        </UiTooltip>
      </div>
    </div>

    <!-- Editor Content -->
    <EditorContent
      :editor="editor"
      class="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground"
      :class="[
        seamless ? 'px-0 py-0' : 'px-8 py-8',
        seamless ? 'min-h-[24px]' : compact ? 'min-h-[60px]' : 'min-h-[100px]',
        fillHeight ? 'flex-1 min-h-0 overflow-y-auto' : '',
      ]" />

    <!-- Hidden file input for image upload -->
    <input
      v-if="images"
      ref="imageInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onImageFileInput" />

    <!-- ── Entity Picker Dialog ── -->
    <UiDialog v-if="embeds" :open="showEntityPicker" @update:open="showEntityPicker = $event">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>Embed Entity</UiDialogTitle>
          <UiDialogDescription>Search for an entity to embed inline.</UiDialogDescription>
        </UiDialogHeader>
        <div class="space-y-3 py-2">
          <input
            v-model="entityPickerSearch"
            type="text"
            placeholder="Search entities..."
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          <div class="max-h-60 overflow-y-auto space-y-0.5">
            <button
              v-for="item in entityPickerItems"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent transition-colors"
              @click="selectEntityForEmbed(item)">
              <Icon :name="entitySearch?.getIcon(item.type) || 'lucide:file'" class="h-4 w-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ item.title || 'Untitled' }}</span>
              </div>
              <span class="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{{ item.type }}</span>
            </button>
            <p v-if="!entityPickerItems.length" class="py-4 text-center text-xs text-muted-foreground">No entities found</p>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>

    <!-- ── Query Type Picker Dialog ── -->
    <UiDialog v-if="embeds" :open="showQueryPicker" @update:open="showQueryPicker = $event">
      <UiDialogContent class="sm:max-w-xs">
        <UiDialogHeader>
          <UiDialogTitle>Embed Query View</UiDialogTitle>
          <UiDialogDescription>Choose an entity type to display.</UiDialogDescription>
        </UiDialogHeader>
        <div class="space-y-3 py-2">
          <div class="space-y-0.5">
            <button
              v-for="opt in QUERY_TYPE_OPTIONS"
              :key="opt.value"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors"
              :class="queryPickerType === opt.value ? 'bg-primary/10 text-primary' : 'hover:bg-accent'"
              @click="queryPickerType = opt.value">
              <span class="font-medium">{{ opt.label }}</span>
            </button>
          </div>
          <UiButton class="w-full" size="sm" @click="selectTypeForQuery">
            Insert
          </UiButton>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<style scoped>
  :deep(.ProseMirror) {
    outline: none;
    color: var(--foreground) !important;
  }

  :deep(.tiptap) {
    min-height: 100%;

    :first-child {
      margin-top: 0;
    }
  }

  :deep(.ProseMirror h1) {
    font-size: 1.75rem !important;
    margin-top: 1.75rem !important;
    color: var(--foreground);
  }

  :deep(.ProseMirror h2) {
    font-size: 1.25rem !important;
    margin-top: 1.25rem !important;
    color: var(--foreground);
  }

  :deep(.ProseMirror p),
  :deep(.ProseMirror li),
  :deep(.ProseMirror h3),
  :deep(.ProseMirror h4),
  :deep(.ProseMirror h5),
  :deep(.ProseMirror h6) {
    color: var(--foreground);
  }

  :deep(.ProseMirror p.is-editor-empty:first-child::before) {
    color: var(--muted-foreground);
    opacity: 0.5;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  :deep(.ProseMirror pre) {
    background: var(--muted) !important;
    border-radius: 0.375rem !important;
    color: var(--foreground) !important;
    font-family: 'JetBrainsMono', monospace !important;
    font-size: 0.8rem !important;
    padding: 0.5rem 0.75rem !important;
    border: 1px solid var(--border) !important;
  }

  :deep(.ProseMirror code) {
    background: var(--muted) !important;
    border-radius: 0.25rem !important;
    color: var(--foreground) !important;
    font-size: 0.85em !important;
    padding: 0.15em 0.3em !important;
    border: 1px solid var(--border) !important;
  }

  :deep(.ProseMirror pre code) {
    background: var(--color-card) !important;
    color: inherit !important;
    font-size: inherit !important;

    padding: 0 !important;
  }

  :deep(.ProseMirror blockquote) {
    border-left: 2px solid var(--border);
    padding-left: 0.75rem;
    color: var(--muted-foreground);
    margin: 0.5rem 0;
  }

  /* Table extension styles */
  :deep(.ProseMirror .tableWrapper) {
    margin: 1rem 0;
    overflow-x: auto;
    border-radius: calc(var(--radius) - 4px);
    border: 1px solid var(--border);
    background: var(--card);
  }

  :deep(.ProseMirror table) {
    border-collapse: separate;
    border-spacing: 0;
    margin: 0;
    table-layout: fixed;
    width: 100%;
    font-size: 0.875rem;
  }

  /* Header cells */
  :deep(.ProseMirror table th) {
    background: color-mix(in oklch, var(--muted) 80%, var(--background));
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    color: var(--foreground);
    font-weight: 600;
    font-size: 0.8rem;
    letter-spacing: 0.02em;
    min-width: 6rem;
    padding: 0.5rem 0.75rem;
    position: relative;
    text-align: left;
    text-transform: uppercase;
  }

  :deep(.ProseMirror table th:first-child) {
    border-top-left-radius: calc(var(--radius) - 4px);
  }

  :deep(.ProseMirror table th:last-child) {
    border-top-right-radius: calc(var(--radius) - 4px);
    border-right: none;
  }

  /* Body cells */
  :deep(.ProseMirror table td) {
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    min-width: 6rem;
    padding: 0.5rem 0.75rem;
    position: relative;
    vertical-align: top;
    transition: background-color 0.15s ease;
  }

  :deep(.ProseMirror table td:last-child) {
    border-right: none;
  }

  /* Zebra striping for rows */
  :deep(.ProseMirror table tbody tr:nth-child(even)) {
    background: color-mix(in oklch, var(--muted) 30%, transparent);
  }

  /* Hover effect for rows */
  :deep(.ProseMirror table tbody tr:hover) {
    background: color-mix(in oklch, var(--primary) 8%, var(--background));
  }

  /* Remove zebra striping on hover for cleaner interaction */
  :deep(.ProseMirror table tbody tr:hover:nth-child(even)) {
    background: color-mix(in oklch, var(--primary) 8%, var(--background));
  }

  /* Last row rounded corners */
  :deep(.ProseMirror table tbody tr:last-child td:first-child) {
    border-bottom-left-radius: calc(var(--radius) - 4px);
  }

  :deep(.ProseMirror table tbody tr:last-child td:last-child) {
    border-bottom-right-radius: calc(var(--radius) - 4px);
  }

  /* Remove bottom border from last row */
  :deep(.ProseMirror table tbody tr:last-child td) {
    border-bottom: none;
  }

  /* Paragraph spacing in cells */
  :deep(.ProseMirror table td p),
  :deep(.ProseMirror table th p) {
    margin: 0;
    line-height: 1.5;
  }

  /* Selected cell highlight */
  :deep(.ProseMirror .selectedCell::after) {
    background: color-mix(in oklch, var(--primary) 15%, transparent);
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
    z-index: 1;
    border-radius: 2px;
  }

  /* Focus/selection ring for active cell editing */
  :deep(.ProseMirror table td:focus-within),
  :deep(.ProseMirror table th:focus-within) {
    outline: 2px solid color-mix(in oklch, var(--primary) 40%, transparent);
    outline-offset: -2px;
  }

  /* Column resize handle */
  :deep(.ProseMirror .column-resize-handle) {
    background-color: var(--primary);
    bottom: 0;
    opacity: 0.8;
    pointer-events: none;
    position: absolute;
    right: -2px;
    top: 0;
    width: 3px;
    transition: opacity 0.15s ease;
  }

  :deep(.ProseMirror .column-resize-handle:hover) {
    opacity: 1;
  }

  /* Mathematics extension styles */
  :deep(.tiptap-mathematics-render) {
    color: var(--foreground);
  }

  :deep(.tiptap-mathematics-render--editable) {
    cursor: pointer;
  }

  :deep(.tiptap-mathematics-render[data-type='inline-math']) {
    background: color-mix(in oklch, var(--primary) 10%, transparent);
    border-radius: 0.25rem;
    display: inline-flex;
    line-height: 1.35;
    padding: 0.1rem 0.25rem;
  }

  :deep(.tiptap-mathematics-render[data-type='block-math']) {
    background: var(--muted);
    border: 1px solid var(--border);
    border-radius: 0.375rem;
    display: block;
    margin: 0.75rem 0;
    overflow-x: auto;
    padding: 0.5rem 0.75rem;
  }

  :deep(.tiptap-mathematics-render .katex) {
    color: var(--foreground);
    font-size: 1em;
  }

  /* List styles */
  :deep(.ProseMirror ul),
  :deep(.ProseMirror ol) {
    padding: 0 1rem;
    margin: 1.25rem 1rem 1.25rem 0.4rem;
  }

  :deep(.ProseMirror ul li p),
  :deep(.ProseMirror ol li p) {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  :deep(.ProseMirror h1) {
    font-size: 1.25rem;
    font-weight: 600;
  }

  :deep(.ProseMirror h2) {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1rem;
  }

  :deep(.ProseMirror h3) {
    font-size: 1rem;
    font-weight: 600;
  }

  /* Task list specific styles */
  :deep(ul[data-type='taskList']) {
    list-style: none;
    margin-left: 0 !important;
    padding: 0;
  }

  :deep(ul[data-type='taskList'] li) {
    align-items: flex-start;
    margin-left: 0 !important;
    display: flex;
  }

  :deep(ul[data-type='taskList'] li > label) {
    flex: 0 0 auto;
    margin-right: 0.5rem;
    user-select: none;
  }

  :deep(ul[data-type='taskList'] li > div) {
    flex: 1 1 auto;
  }

  :deep(ul[data-type='taskList'] input[type='checkbox']) {
    cursor: pointer;
  }

  :deep(ul[data-type='taskList'] ul[data-type='taskList']) {
    margin: 0;
    position: relative;
  }

  /* Indentation guide lines for nested task lists */
  :deep(ul[data-type='taskList'] ul[data-type='taskList'])::before {
    content: '';
    position: absolute;
    left: -0.75rem;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--border) 50%, transparent) 0%,
      color-mix(in oklch, var(--border) 50%, transparent) 80%,
      transparent 100%
    );
    pointer-events: none;
  }

  :deep(ul[data-type='taskList'] li[data-checked='true'] > div > p) {
    text-decoration: line-through;
    color: var(--muted-foreground);
  }

  :deep(hr) {
    margin: 1.5rem 0 0 0;
    opacity: 0.1;
  }

  /* ── Syntax Highlighting (lowlight / hljs) ──────────────────────────── */
  :deep(.hljs-comment),
  :deep(.hljs-quote) {
    color: var(--muted-foreground);
    font-style: italic;
  }

  :deep(.hljs-keyword),
  :deep(.hljs-selector-tag),
  :deep(.hljs-built_in),
  :deep(.hljs-name),
  :deep(.hljs-tag) {
    color: oklch(0.65 0.19 295);
  }

  :deep(.hljs-string),
  :deep(.hljs-title),
  :deep(.hljs-section),
  :deep(.hljs-attribute),
  :deep(.hljs-literal),
  :deep(.hljs-template-tag),
  :deep(.hljs-template-variable),
  :deep(.hljs-type),
  :deep(.hljs-addition) {
    color: oklch(0.72 0.18 150);
  }

  :deep(.hljs-number),
  :deep(.hljs-symbol),
  :deep(.hljs-bullet),
  :deep(.hljs-link) {
    color: oklch(0.72 0.17 50);
  }

  :deep(.hljs-meta),
  :deep(.hljs-selector-id),
  :deep(.hljs-selector-class) {
    color: oklch(0.62 0.17 250);
  }

  :deep(.hljs-deletion) {
    color: oklch(0.63 0.21 25);
  }

  :deep(.hljs-emphasis) {
    font-style: italic;
  }

  :deep(.hljs-strong) {
    font-weight: 700;
  }

  /* Language label on code blocks */
  :deep(.ProseMirror pre) {
    position: relative;
  }

  :deep(.ProseMirror pre code::before) {
    content: attr(data-language);
    position: absolute;
    top: 0.25rem;
    right: 0.5rem;
    font-size: 0.6rem;
    font-family: sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-foreground);
    opacity: 0.6;
    pointer-events: none;
  }

  /* ── Image styles ───────────────────────────────────────────────────── */
  :deep(.ProseMirror .editor-image) {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
    margin: 0.75rem 0;
    cursor: default;
  }

  :deep(.ProseMirror .editor-image.ProseMirror-selectednode) {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: 0.375rem;
  }

  /* Upload placeholder pulsing animation */
  :deep(.ProseMirror .editor-image[alt^='__uploading__']) {
    animation: image-upload-pulse 1.5s ease-in-out infinite;
    pointer-events: none;
  }

  :deep(strong) {
    color: var(--foreground);
  }

  @keyframes image-upload-pulse {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.3;
    }
  }

  /* ── Drag Handle Styles ──────────────────────────────────────────────── */
  :deep(.drag-handle) {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    border-radius: 0.25rem;
    color: var(--muted-foreground);
    transition: all 0.15s ease;
  }

  :deep(.drag-handle:hover) {
    background: var(--muted);
    color: var(--foreground);
  }

  :deep(.drag-handle:active) {
    cursor: grabbing;
  }

  :deep(.drag-handle::before) {
    content: '';
    width: 0.75rem;
    height: 0.75rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: 0.7;
  }

  /* Highlight node being dragged */
  :deep(.ProseMirror .is-dragging) {
    opacity: 0.5;
    background: color-mix(in oklch, var(--muted) 50%, transparent);
    border-radius: 0.25rem;
  }

  /* Collaborative cursor styles (y-prosemirror defaults) */
  :deep(.ProseMirror-yjs-cursor) {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid;
    border-right: 1px solid;
    word-break: normal;
    pointer-events: none;
  }

  :deep(.ProseMirror-yjs-cursor > div) {
    position: absolute;
    top: -1.4em;
    left: -1px;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.2;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: white;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    z-index: 10;
  }

  :deep(.ProseMirror-yjs-selection) {
    background-color: currentColor;
    opacity: 0.2;
  }

</style>

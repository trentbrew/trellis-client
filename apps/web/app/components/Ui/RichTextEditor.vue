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
  import { TableKit, TableHandleExtension } from '~/lib/table'
  import TableHandle from '~/components/editor-blocks/table/TableHandle.vue'
  import TableExtendButtons from '~/components/editor-blocks/table/TableExtendButtons.vue'
  import { Mathematics } from '@tiptap/extension-mathematics'
  import { common, createLowlight } from 'lowlight'
  import { Extension, InputRule, Node, mergeAttributes, wrappingInputRule } from '@tiptap/core'
  import { EditorContent, useEditor, VueNodeViewRenderer } from '@tiptap/vue-3'
  import { InlineComment } from '~/lib/inline-comment-extension'
  import { DropIndicator } from '~/lib/drop-indicator-extension'
  import { TextSelection, NodeSelection } from 'prosemirror-state'
  import CodeBlockComponent from './CodeBlockComponent.vue'
  import { createMentionExtension, parseMentionQuery } from '~/lib/mention-extension'
  import { createSlashCommandExtension } from '~/lib/slash-command-extension'
  import { Callout } from '~/lib/callout-extension'
  import { Collapsible } from '~/lib/collapsible-extension'
  import { TabsContainer, TabItem } from '~/lib/tabs-extension'
  import { Card } from '~/lib/card-extension'
  // TableControls replaced by enhanced table system (TableHandleExtension + Vue components)
  import { EntityEmbed } from '~/lib/entity-embed-extension'
  import { QueryView } from '~/lib/query-view-extension'
  import { SheetRange } from '~/lib/sheet-range-extension'
  import { parseA1Range } from '~/lib/sheet-a1'
  import { HtmlEmbed, HtmlEmbedPasteHandler } from '~/lib/html-embed-extension'
  import { UrlEmbed, UrlEmbedPasteHandler } from '~/lib/url-embed-extension'
  import { useEntitySearch } from '~/composables/useEntitySearch'
  import type { EntitySearchItem } from '~/composables/useEntitySearch'
  import { createDefaultItem } from '~/types/entity'
  import { useImageUpload } from '~/composables/useImageUpload'
  import { markdownToHtml, shouldPasteMarkdownAsRichText } from '~/utils/markdown'
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
    chatMode?: boolean
    entityId?: string
    submitOnEnter?: boolean
    enterKeyBehavior?: 'send' | 'newline'
    inlineComments?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'mention-click': [attrs: { id: string; label: string; entityType: string }]
    submit: []
    'add-inline-comment': [{ commentId: string; quotedText: string }]
  }>()

  // ── Image upload infrastructure ──────────────────────────────────────
  const imageUpload = props.images ? useImageUpload(props.entityId) : null
  const imageInputRef = ref<HTMLInputElement | null>(null)
  const nuxtApp = useNuxtApp()

  /** SVG placeholder shown while an image upload is in progress. */
  const UPLOAD_PLACEHOLDER_SRC = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">' +
      '<rect width="400" height="200" rx="6" fill="%23f4f4f5"/>' +
      '<text x="200" y="105" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="%23a1a1aa">Uploading\u2026</text>' +
      '</svg>',
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
    ? 'min-h-[24px] focus:outline-none prose-lg prose-p:my-0.5 prose-headings:my-1 prose-ul:my-0.5 prose-li:my-0'
    : props.compact
      ? 'min-h-[60px] focus:outline-none prose-lg prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5'
      : 'min-h-[100px] focus:outline-none prose-lg prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-1'

  // Build entity search for mentions and embeds
  const entitySearch = props.mentions || props.embeds ? useEntitySearch() : null
  const { create: _createEntity, items: _allEntities } =
    props.mentions || props.embeds || props.templates
      ? useTrellisEntities()
      : { create: async () => null, items: ref([]) }
  const tablesEnabled = props.tables !== false
  const mathematicsEnabled = props.mathematics !== false
  const { toolbarMode } = useLayoutPreferences()

  const currentBlockType = computed(() => {
    const e = editor.value
    if (!e) return { label: 'Paragraph', shortLabel: '¶' }
    if (e.isActive('heading', { level: 1 })) return { label: 'Heading 1', shortLabel: 'H1' }
    if (e.isActive('heading', { level: 2 })) return { label: 'Heading 2', shortLabel: 'H2' }
    if (e.isActive('heading', { level: 3 })) return { label: 'Heading 3', shortLabel: 'H3' }
    if (e.isActive('bulletList')) return { label: 'Bullet List', shortLabel: '•' }
    if (e.isActive('orderedList')) return { label: 'Ordered List', shortLabel: '1.' }
    if (e.isActive('taskList')) return { label: 'Task List', shortLabel: '☐' }
    if (e.isActive('blockquote')) return { label: 'Blockquote', shortLabel: '"' }
    if (e.isActive('codeBlock')) return { label: 'Code Block', shortLabel: '</>' }
    return { label: 'Paragraph', shortLabel: '¶' }
  })

  // ── Collaborative editing ───────────────────────────────────────────
  const collabEntityId = computed(() => props.entityId)
  const adapter = useDataAdapter()
  const collabEnabled = computed(() => !!props.collaborative && !!props.entityId && adapter.mode === 'cloud')
  const initialContent = computed(() => props.modelValue || '')
  const {
    ydoc: _ydoc,
    collabExtensions,
    connectionStatus: _connectionStatus,
    isLeader: _isLeader,
    destroy: destroyCollab,
  } = useCollaborativeEditor(collabEntityId, { initialContent, enabled: collabEnabled })

  // ── Embed picker state ──────────────────────────────────────────────
  const showEntityPicker = ref(false)
  const showQueryPicker = ref(false)
  const showSheetRangePicker = ref(false)
  const entityPickerSearch = ref('')
  const queryPickerType = ref('task')
  const sheetRangePickerSearch = ref('')
  const sheetRangePickerId = ref('')
  const sheetRangePickerRange = ref('A2:E6')
  const sheetRangePickerTitle = ref('')
  const sheetRangePickerError = ref('')

  const entityPickerItems = computed(() => {
    if (!entitySearch || !showEntityPicker.value) return []
    const q = entityPickerSearch.value.toLowerCase().trim()
    const items = entitySearch.filteredItems.value as EntitySearchItem[]
    if (!q) return items.slice(0, 20)
    return items.filter((i) => i.title?.toLowerCase().includes(q) || i.type?.toLowerCase().includes(q)).slice(0, 20)
  })

  function handleEmbedEntity(_editor: any) {
    showEntityPicker.value = true
    entityPickerSearch.value = ''
  }

  function handleEmbedQuery(_editor: any) {
    showQueryPicker.value = true
    queryPickerType.value = 'task'
  }

  function handleEmbedSheetRange(_editor: any) {
    showSheetRangePicker.value = true
    sheetRangePickerSearch.value = ''
    sheetRangePickerId.value = ''
    sheetRangePickerRange.value = 'A2:E6'
    sheetRangePickerTitle.value = ''
    sheetRangePickerError.value = ''
  }

  const sheetPickerItems = computed(() => {
    if (!entitySearch || !showSheetRangePicker.value) return []
    const q = sheetRangePickerSearch.value.toLowerCase().trim()
    const items = (entitySearch.filteredItems.value as EntitySearchItem[]).filter((i) => i.type === 'sheet')
    if (!q) return items.slice(0, 20)
    return items.filter((i) => i.title?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q)).slice(0, 20)
  })

  function selectSheetForRange(item: EntitySearchItem) {
    sheetRangePickerId.value = item.id
    sheetRangePickerTitle.value = item.title || 'Sheet range'
    sheetRangePickerSearch.value = item.title || item.id
  }

  function insertSheetRangeBlock() {
    sheetRangePickerError.value = ''
    if (!sheetRangePickerId.value) {
      sheetRangePickerError.value = 'Pick a sheet entity'
      return
    }
    if (!parseA1Range(sheetRangePickerRange.value)) {
      sheetRangePickerError.value = 'Range must look like A2:E6'
      return
    }
    editor.value
      ?.chain()
      .focus()
      .insertSheetRange({
        sheetId: sheetRangePickerId.value,
        range: sheetRangePickerRange.value.trim(),
        title: sheetRangePickerTitle.value.trim() || undefined,
      })
      .run()
    showSheetRangePicker.value = false
  }

  function handleEmbedImage(_editor: any) {
    triggerImageUpload()
  }

  function handleEmbedUrl(_editor: any) {
    editor.value?.commands.insertUrlEmbed({ mode: 'embed' })
  }

  function handleEmbedHtml(_editor: any) {
    editor.value?.commands.insertHtmlEmbed()
  }

  function handleEmbedImageUrl(_editor: any) {
    editor.value?.commands.insertUrlEmbed({ mode: 'image' })
  }

  function handleEmbedYoutube(_editor: any) {
    editor.value?.commands.insertUrlEmbed({ mode: 'youtube', height: 360 })
  }

  function handleEmbedSpotify(_editor: any) {
    editor.value?.commands.insertUrlEmbed({ mode: 'spotify', height: 152 })
  }

  function selectEntityForEmbed(item: EntitySearchItem) {
    editor.value
      ?.chain()
      .focus()
      .insertEntityEmbed({
        entityId: item.id,
        entityType: item.type,
        title: item.title || 'Untitled',
      })
      .run()
    showEntityPicker.value = false
  }

  function selectTypeForQuery() {
    editor.value
      ?.chain()
      .focus()
      .insertQueryView({
        entityType: queryPickerType.value,
        maxRows: 5,
      })
      .run()
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

  // ── Block selection via drag handle ─────────────────────────────
  const currentDragPos = ref<number | null>(null)

  function onDragHandleClick() {
    const e = editor.value
    const pos = currentDragPos.value
    if (!e || pos === null) return

    try {
      // Create a NodeSelection at the block position
      const selection = NodeSelection.create(e.state.doc, pos)
      const tr = e.state.tr.setSelection(selection)
      e.view.dispatch(tr)
      e.view.focus()
    } catch (err) {
      console.error('[RichTextEditor] Failed to select node:', err)
    }
  }

  // ── Context menu ─────────────────────────────────────────────────
  const contextMenu = reactive({ visible: false, x: 0, y: 0 })

  function closeContextMenu() {
    contextMenu.visible = false
  }

  // Context menu action handlers (extracted to avoid multi-line inline JS in template)
  function ctxSetParagraph() {
    editor.value?.chain().focus().setParagraph().run()
    closeContextMenu()
  }
  function ctxToggleHeading(level: number) {
    editor.value
      ?.chain()
      .focus()
      .toggleHeading({ level: level as 1 | 2 | 3 })
      .run()
    closeContextMenu()
  }
  function ctxToggleBulletList() {
    editor.value?.chain().focus().toggleBulletList().run()
    closeContextMenu()
  }
  function ctxToggleOrderedList() {
    editor.value?.chain().focus().toggleOrderedList().run()
    closeContextMenu()
  }
  function ctxToggleTaskList() {
    editor.value?.chain().focus().toggleTaskList().run()
    closeContextMenu()
  }
  function ctxToggleBlockquote() {
    editor.value?.chain().focus().toggleBlockquote().run()
    closeContextMenu()
  }
  function ctxToggleCodeBlock() {
    editor.value?.chain().focus().toggleCodeBlock().run()
    closeContextMenu()
  }
  function ctxToggleBold() {
    editor.value?.chain().focus().toggleBold().run()
    closeContextMenu()
  }
  function ctxToggleItalic() {
    editor.value?.chain().focus().toggleItalic().run()
    closeContextMenu()
  }
  function ctxToggleStrike() {
    editor.value?.chain().focus().toggleStrike().run()
    closeContextMenu()
  }
  function ctxToggleCode() {
    editor.value?.chain().focus().toggleCode().run()
    closeContextMenu()
  }
  function ctxAddInlineComment() {
    addInlineComment()
    closeContextMenu()
  }

  function onDocClick() {
    closeContextMenu()
  }
  function onDocKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeContextMenu()
  }

  watch(
    () => contextMenu.visible,
    (v) => {
      if (v) {
        document.addEventListener('click', onDocClick)
        document.addEventListener('keydown', onDocKeydown)
      } else {
        document.removeEventListener('click', onDocClick)
        document.removeEventListener('keydown', onDocKeydown)
      }
    },
  )

  // ── Custom Blockquote — triggered by | instead of > ───────────────
  const CustomBlockquote = Node.create({
    name: 'blockquote',
    group: 'block',
    content: 'block+',
    defining: true,
    parseHTML() {
      return [{ tag: 'blockquote' }]
    },
    renderHTML({ HTMLAttributes }) {
      return ['blockquote', mergeAttributes(HTMLAttributes), 0]
    },
    addCommands() {
      return {
        setBlockquote:
          () =>
          ({ commands }: any) =>
            commands.wrapIn(this.type),
        toggleBlockquote:
          () =>
          ({ commands }: any) =>
            commands.toggleWrap(this.type),
        unsetBlockquote:
          () =>
          ({ commands }: any) =>
            commands.lift(this.type),
      } as any
    },
    addKeyboardShortcuts() {
      return { 'Mod-Shift-b': () => (this.editor.commands as any).toggleBlockquote() }
    },
    addInputRules() {
      return [wrappingInputRule({ find: /^\|\s$/, type: this.type })]
    },
  })

  const buildExtensions = () => {
    const exts = [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        blockquote: false, // replaced by CustomBlockquote (| trigger instead of >)
        // Disable history only when collaborative (Y.js provides it)
        history: collabEnabled.value ? false : undefined,
      }),
      CustomBlockquote,
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
        TableHandleExtension as any,
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
      exts.push(TaskList as any, TaskItem.configure({ nested: true }) as any)
    }
    if (props.mentions && entitySearch) {
      exts.push(
        createMentionExtension({
          getItems(query: string) {
            const parsed = parseMentionQuery(query)
            if (parsed?.type) {
              entitySearch.search.value = parsed.name
              return (entitySearch.filteredItems.value as EntitySearchItem[]).filter((i) => i.type === parsed.type)
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
          chatMode: !!props.chatMode,
          onEmbedEntity: props.embeds ? handleEmbedEntity : undefined,
          onEmbedQuery: props.embeds ? handleEmbedQuery : undefined,
          onEmbedHtml: props.embeds ? handleEmbedHtml : undefined,
          onEmbedSheetRange: props.embeds ? handleEmbedSheetRange : undefined,
          onEmbedImage: props.embeds && props.images ? handleEmbedImage : undefined,
          onEmbedUrl: props.embeds ? handleEmbedUrl : undefined,
          onEmbedImageUrl: props.embeds ? handleEmbedImageUrl : undefined,
          onEmbedYoutube: props.embeds ? handleEmbedYoutube : undefined,
          onEmbedSpotify: props.embeds ? handleEmbedSpotify : undefined,
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
          Card as any,
          EntityEmbed as any,
          QueryView as any,
          SheetRange as any,
          HtmlEmbed as any,
          HtmlEmbedPasteHandler as any,
          UrlEmbed as any,
          UrlEmbedPasteHandler as any,
        )
        // Input rule: > at start of empty line → Collapsible toggle
        exts.push(
          Extension.create({
            name: 'collapsibleInputRule',
            addInputRules() {
              return [
                new InputRule({
                  find: /^\s*>\s$/,
                  handler({ chain, range }: any) {
                    chain().deleteRange(range).insertCollapsible({ title: 'Toggle', open: true }).run()
                  },
                }),
              ]
            },
          }),
        )
      }
    }
    // Inject Y.js Collaboration extension when collaborative mode is active
    if (collabEnabled.value && collabExtensions.value.length) {
      exts.push(...collabExtensions.value)
    }
    if (props.draghandle) {
      exts.push(DropIndicator)
    }
    if (props.inlineComments) {
      exts.push(InlineComment as any)
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
      editor.value
        .chain()
        .focus()
        .setImage({
          src: UPLOAD_PLACEHOLDER_SRC,
          alt: placeholderId,
        })
        .run()

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
        const text = clipboardData.getData('text/plain')

        // Check for markdown checkbox syntax - if present, force markdown conversion
        // This ensures `- [ ]` and `- [x]` get converted to TipTap TaskList format
        // Check both text and HTML content for checkbox patterns
        const checkboxPattern = /-\s*\[[ xX]\]/
        const hasCheckboxInText = text && checkboxPattern.test(text)
        const hasCheckboxInHtml = html && (checkboxPattern.test(html) || html.includes('type="checkbox"'))

        if ((hasCheckboxInText || hasCheckboxInHtml) && props.tasklist) {
          event.preventDefault()
          const converted = markdownToHtml(text || '')
          editor.value?.commands.insertContent(converted)
          return true
        }

        // Markdown copied from editors often includes text/html as <pre><code> — convert to rich text.
        if (shouldPasteMarkdownAsRichText(html, text)) {
          event.preventDefault()
          editor.value?.commands.insertContent(markdownToHtml(text))
          return true
        }

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
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          if (props.seamless) return false
          event.preventDefault()
          const vw = window.innerWidth
          const vh = window.innerHeight
          const MENU_W = 196
          const MENU_H = 320
          contextMenu.x = Math.min(event.clientX, vw - MENU_W - 8)
          contextMenu.y = Math.min(event.clientY, vh - MENU_H - 8)
          contextMenu.visible = true
          return true
        },
      },
      handleKeyDown: (view, event) => {
        // Auto-indentation for code blocks: when Enter is pressed,
        // copy the leading whitespace from the current line to the new line
        if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
          const { state } = view
          const { selection } = state
          const { $from } = selection

          // Check if we're inside a code block
          const isInCodeBlock =
            $from.parent.type.name === 'codeBlock' || $from.node($from.depth - 1)?.type?.name === 'codeBlock'

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
        // Submit on Enter key
        if (props.submitOnEnter) {
          const shouldSubmit =
            props.enterKeyBehavior === 'send'
              ? event.key === 'Enter' && !event.shiftKey
              : event.key === 'Enter' && (event.metaKey || event.ctrlKey)

          if (shouldSubmit) {
            // Don't fire if a suggestion dropdown (mention/slash) is open
            const hasSuggestion = document.querySelector('.tippy-box, [data-tippy-root]')
            if (!hasSuggestion) {
              event.preventDefault()
              emit('submit')
              return true
            }
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
  // The Collaboration extension ignores the `content` editor option, so we
  // populate via setContent. IMPORTANT: only the confirmed leader (first peer)
  // should seed — if both peers seed independently with the same HTML, Y.js
  // CRDT treats them as distinct concurrent insertions and duplicates content
  // on merge. We wait for _isLeader to become true before seeding.
  let collabSeeded = false
  watch(
    [() => editor.value, _isLeader, () => props.modelValue],
    ([e, leader, mv]) => {
      if (!e || !leader || collabSeeded || !collabEnabled.value) return
      // Defer seeding until content has arrived from the DB.
      // isLeader fires at ~600ms but InstantDB may not have returned the
      // entity yet — if we seed with an empty string the content is lost.
      if (!mv) return
      collabSeeded = true
      const html = markdownToHtml(mv)
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

  function addInlineComment() {
    const e = editor.value
    if (!e) return
    const { from, to } = e.state.selection
    if (from === to) return
    const selectedText = e.state.doc.textBetween(from, to, ' ')
    const commentId = crypto.randomUUID()
    ;(e.chain().focus() as any).setInlineComment(commentId).run()
    emit('add-inline-comment', { commentId, quotedText: selectedText })
  }

  // ── Inline comment floating toolbar ─────────────────────────────
  const bubbleMenu = reactive({ visible: false, top: 0, left: 0 })

  function updateBubbleMenu() {
    const e = editor.value
    if (!e) {
      bubbleMenu.visible = false
      return
    }
    const { from, to, empty } = e.state.selection
    if (empty) {
      bubbleMenu.visible = false
      return
    }
    try {
      const startCoords = e.view.coordsAtPos(from)
      const endCoords = e.view.coordsAtPos(to)
      const rawLeft = (startCoords.left + endCoords.right) / 2
      const rawTop = Math.min(startCoords.top, endCoords.top) - 48
      const BUBBLE_HALF_W = 220
      const MARGIN = 8
      const vw = window.innerWidth
      bubbleMenu.left = Math.max(BUBBLE_HALF_W + MARGIN, Math.min(rawLeft, vw - BUBBLE_HALF_W - MARGIN))
      bubbleMenu.top = rawTop < 72 ? Math.max(startCoords.bottom, endCoords.bottom) + 6 : rawTop
      bubbleMenu.visible = true
    } catch {
      bubbleMenu.visible = false
    }
  }

  function hideBubbleMenu() {
    bubbleMenu.visible = false
  }

  watch(
    editor,
    (e, prev) => {
      if (prev) {
        prev.off('selectionUpdate', updateBubbleMenu)
        prev.off('blur', hideBubbleMenu)
      }
      if (e) {
        e.on('selectionUpdate', updateBubbleMenu)
        e.on('blur', hideBubbleMenu)
      }
    },
    { immediate: true },
  )

  defineExpose({ clearContent, focusEditor, getEditor, triggerImageUpload, addInlineComment })
</script>

<template>
  <div
    v-if="editor"
    :class="[
      'w-full min-w-0',
      seamless ? 'overflow-hidden' : 'rounded-none border-none bg-card/0 overflow-hidden',
      fillHeight ? 'flex flex-col min-h-0' : '',
      fillHeight && !seamless ? 'rte-scroll-pad-content' : '',
    ]">
    <!-- Drag Handle (conditional) — class applied directly to avoid duplicate icon from nested div -->
    <DragHandle
      v-if="draghandle && editor"
      :editor="editor"
      :nested="true"
      class="drag-handle"
      @node-change="({ pos }) => (currentDragPos = pos)"
      @click="onDragHandleClick" />

    <!-- Floating selection toolbar -->
    <Teleport to="body">
      <div
        v-if="!seamless && editor && bubbleMenu.visible && (toolbarMode === 'floating' || inlineComments)"
        class="bubble-menu-bar"
        :style="{ top: `${bubbleMenu.top}px`, left: `${bubbleMenu.left}px` }"
        @mousedown.prevent>
        <!-- ── Floating mode: full toolbar ── -->
        <template v-if="toolbarMode === 'floating'">
          <!-- Block type picker -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button class="bubble-btn bubble-type-btn" :title="currentBlockType.label">
                <span class="text-[10px] font-semibold leading-none">{{ currentBlockType.shortLabel }}</span>
                <Icon name="lucide:chevron-down" class="h-2 w-2 opacity-50 ml-0.5" />
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent class="w-44 p-1" align="center" side="bottom" :side-offset="6">
              <button
                class="bubble-type-option"
                :class="{
                  'is-active':
                    !editor.isActive('heading') &&
                    !editor.isActive('bulletList') &&
                    !editor.isActive('orderedList') &&
                    !editor.isActive('taskList') &&
                    !editor.isActive('blockquote') &&
                    !editor.isActive('codeBlock'),
                }"
                @mousedown.prevent="editor.chain().focus().setParagraph().run()">
                <span class="w-5 font-mono text-[10px] opacity-50">¶</span>
                Paragraph
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
                @mousedown.prevent="editor.chain().focus().toggleHeading({ level: 1 }).run()">
                <span class="w-5 font-mono text-[10px] opacity-50">H1</span>
                Heading 1
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
                @mousedown.prevent="editor.chain().focus().toggleHeading({ level: 2 }).run()">
                <span class="w-5 font-mono text-[10px] opacity-50">H2</span>
                Heading 2
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
                @mousedown.prevent="editor.chain().focus().toggleHeading({ level: 3 }).run()">
                <span class="w-5 font-mono text-[10px] opacity-50">H3</span>
                Heading 3
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('bulletList') }"
                @mousedown.prevent="editor.chain().focus().toggleBulletList().run()">
                <Icon name="lucide:list" class="h-3 w-3 opacity-50" />
                Bullet List
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('orderedList') }"
                @mousedown.prevent="editor.chain().focus().toggleOrderedList().run()">
                <Icon name="lucide:list-ordered" class="h-3 w-3 opacity-50" />
                Ordered List
              </button>
              <button
                v-if="tasklist"
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('taskList') }"
                @mousedown.prevent="editor.chain().focus().toggleTaskList().run()">
                <Icon name="lucide:list-checks" class="h-3 w-3 opacity-50" />
                Task List
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('blockquote') }"
                @mousedown.prevent="editor.chain().focus().toggleBlockquote().run()">
                <Icon name="lucide:quote" class="h-3 w-3 opacity-50" />
                Blockquote
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'is-active': editor.isActive('codeBlock') }"
                @mousedown.prevent="editor.chain().focus().toggleCodeBlock().run()">
                <Icon name="lucide:code" class="h-3 w-3 opacity-50" />
                Code Block
              </button>
            </UiPopoverContent>
          </UiPopover>

          <div class="bubble-sep" />

          <!-- Inline marks -->
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('bold') }"
            title="Bold"
            @click="editor.chain().focus().toggleBold().run()">
            <Icon name="lucide:bold" class="h-3 w-3" />
          </button>
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('italic') }"
            title="Italic"
            @click="editor.chain().focus().toggleItalic().run()">
            <Icon name="lucide:italic" class="h-3 w-3" />
          </button>
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('strike') }"
            title="Strikethrough"
            @click="editor.chain().focus().toggleStrike().run()">
            <Icon name="lucide:strikethrough" class="h-3 w-3" />
          </button>
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('code') }"
            title="Inline Code"
            @click="editor.chain().focus().toggleCode().run()">
            <Icon name="lucide:code" class="h-3 w-3" />
          </button>

          <div class="bubble-sep" />

          <!-- Color / Highlight -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button class="bubble-btn" title="Color &amp; Highlight" style="position: relative">
                <Icon name="lucide:palette" class="h-3 w-3" />
                <span
                  class="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full"
                  :style="{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }" />
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent class="w-auto p-2" align="center" side="bottom" :side-offset="6">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                  Text Color
                </span>
                <div class="flex gap-1">
                  <button
                    v-for="c in TEXT_COLORS"
                    :key="c.label"
                    class="h-5 w-5 rounded-full border border-border/50 transition-all hover:scale-110"
                    :class="{
                      'ring-1 ring-primary ring-offset-1 ring-offset-background': c.value
                        ? editor.isActive('textStyle', { color: c.value })
                        : !editor.isActive('textStyle'),
                    }"
                    :style="{ backgroundColor: c.value || 'var(--foreground)' }"
                    :title="c.label"
                    @mousedown.prevent="
                      c.value
                        ? editor.chain().focus().setColor(c.value).run()
                        : editor.chain().focus().unsetColor().run()
                    " />
                </div>
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mt-1">
                  Highlight
                </span>
                <div class="flex gap-1">
                  <button
                    v-for="h in HIGHLIGHT_COLORS"
                    :key="h.label"
                    class="h-5 w-5 rounded-full border border-border/50 transition-all hover:scale-110"
                    :class="{
                      'ring-1 ring-primary ring-offset-1 ring-offset-background': h.value
                        ? editor.isActive('highlight', { color: h.value })
                        : !editor.isActive('highlight'),
                    }"
                    :style="{ backgroundColor: h.value || 'var(--muted)' }"
                    :title="h.label"
                    @mousedown.prevent="
                      h.value
                        ? editor.chain().focus().toggleHighlight({ color: h.value }).run()
                        : editor.chain().focus().unsetHighlight().run()
                    " />
                </div>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Overflow: tables / images / math + undo/redo -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button class="bubble-btn" title="More"><Icon name="lucide:ellipsis" class="h-3 w-3" /></button>
            </UiPopoverTrigger>
            <UiPopoverContent class="w-44 p-1" align="center" side="bottom" :side-offset="6">
              <template v-if="tablesEnabled">
                <button
                  class="bubble-type-option"
                  @mousedown.prevent="
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                  ">
                  <Icon name="lucide:table" class="h-3 w-3 opacity-50" />
                  Insert Table
                </button>
                <button
                  v-if="editor.isActive('table')"
                  class="bubble-type-option"
                  @mousedown.prevent="editor.chain().focus().deleteTable().run()">
                  <Icon name="lucide:trash-2" class="h-3 w-3 text-destructive opacity-70" />
                  Delete Table
                </button>
              </template>
              <button v-if="images" class="bubble-type-option" @mousedown.prevent="triggerImageUpload()">
                <Icon name="lucide:image-plus" class="h-3 w-3 opacity-50" />
                Insert Image
              </button>
              <template v-if="mathematicsEnabled">
                <button class="bubble-type-option" @mousedown.prevent="insertInlineMath()">
                  <Icon name="lucide:calculator" class="h-3 w-3 opacity-50" />
                  Inline Math
                </button>
                <button class="bubble-type-option" @mousedown.prevent="insertBlockMath()">
                  <Icon name="lucide:calculator" class="h-3 w-3 opacity-50" />
                  Block Math
                </button>
              </template>
              <div class="h-px bg-border my-1" />
              <button
                class="bubble-type-option"
                :class="{ 'opacity-40 pointer-events-none': !editor.can().undo() }"
                @mousedown.prevent="editor.chain().focus().undo().run()">
                <Icon name="lucide:undo" class="h-3 w-3 opacity-50" />
                Undo
              </button>
              <button
                class="bubble-type-option"
                :class="{ 'opacity-40 pointer-events-none': !editor.can().redo() }"
                @mousedown.prevent="editor.chain().focus().redo().run()">
                <Icon name="lucide:redo" class="h-3 w-3 opacity-50" />
                Redo
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Comment -->
          <template v-if="inlineComments">
            <div class="bubble-sep" />
            <button
              class="bubble-btn"
              :class="{ 'is-active': editor.isActive('inlineComment') }"
              title="Add comment"
              @click="addInlineComment">
              <Icon name="lucide:message-square" class="h-3 w-3" />
            </button>
          </template>
        </template>

        <!-- ── Static mode: bold/italic/strike + comment (existing behaviour) ── -->
        <template v-else>
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('bold') }"
            title="Bold"
            @click="editor.chain().focus().toggleBold().run()">
            <Icon name="lucide:bold" class="h-3 w-3" />
          </button>
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('italic') }"
            title="Italic"
            @click="editor.chain().focus().toggleItalic().run()">
            <Icon name="lucide:italic" class="h-3 w-3" />
          </button>
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('strike') }"
            title="Strikethrough"
            @click="editor.chain().focus().toggleStrike().run()">
            <Icon name="lucide:strikethrough" class="h-3 w-3" />
          </button>
          <div class="bubble-sep" />
          <button
            class="bubble-btn"
            :class="{ 'is-active': editor.isActive('inlineComment') }"
            title="Add comment"
            @click="addInlineComment">
            <Icon name="lucide:message-square" class="h-3 w-3" />
          </button>
        </template>
      </div>
    </Teleport>

    <!-- Context menu (right-click) -->
    <Teleport to="body">
      <div
        v-if="!seamless && editor && contextMenu.visible"
        class="ctx-menu"
        :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
        @mousedown.stop
        @contextmenu.prevent.stop>
        <!-- Block type section -->
        <div class="ctx-label">Turn into</div>
        <button
          class="ctx-item"
          :class="{
            'is-active':
              !editor.isActive('heading') &&
              !editor.isActive('bulletList') &&
              !editor.isActive('orderedList') &&
              !editor.isActive('taskList') &&
              !editor.isActive('blockquote') &&
              !editor.isActive('codeBlock'),
          }"
          @mousedown.prevent="ctxSetParagraph()">
          <span class="ctx-mono">¶</span>
          Paragraph
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
          @mousedown.prevent="ctxToggleHeading(1)">
          <span class="ctx-mono">H1</span>
          Heading 1
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
          @mousedown.prevent="ctxToggleHeading(2)">
          <span class="ctx-mono">H2</span>
          Heading 2
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
          @mousedown.prevent="ctxToggleHeading(3)">
          <span class="ctx-mono">H3</span>
          Heading 3
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @mousedown.prevent="ctxToggleBulletList()">
          <Icon name="lucide:list" class="ctx-icon" />
          Bullet List
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @mousedown.prevent="ctxToggleOrderedList()">
          <Icon name="lucide:list-ordered" class="ctx-icon" />
          Numbered List
        </button>
        <button
          v-if="tasklist"
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('taskList') }"
          @mousedown.prevent="ctxToggleTaskList()">
          <Icon name="lucide:list-checks" class="ctx-icon" />
          Task List
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          @mousedown.prevent="ctxToggleBlockquote()">
          <Icon name="lucide:quote" class="ctx-icon" />
          Quote
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          @mousedown.prevent="ctxToggleCodeBlock()">
          <Icon name="lucide:code" class="ctx-icon" />
          Code Block
        </button>

        <div class="ctx-sep" />

        <!-- Inline formatting -->
        <div class="ctx-label">Format</div>
        <button class="ctx-item" :class="{ 'is-active': editor.isActive('bold') }" @mousedown.prevent="ctxToggleBold()">
          <Icon name="lucide:bold" class="ctx-icon" />
          Bold
          <span class="ctx-shortcut">⌘B</span>
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('italic') }"
          @mousedown.prevent="ctxToggleItalic()">
          <Icon name="lucide:italic" class="ctx-icon" />
          Italic
          <span class="ctx-shortcut">⌘I</span>
        </button>
        <button
          class="ctx-item"
          :class="{ 'is-active': editor.isActive('strike') }"
          @mousedown.prevent="ctxToggleStrike()">
          <Icon name="lucide:strikethrough" class="ctx-icon" />
          Strikethrough
        </button>
        <button class="ctx-item" :class="{ 'is-active': editor.isActive('code') }" @mousedown.prevent="ctxToggleCode()">
          <Icon name="lucide:code" class="ctx-icon" />
          Inline Code
          <span class="ctx-shortcut">⌘E</span>
        </button>

        <template v-if="inlineComments && !editor.state.selection.empty">
          <div class="ctx-sep" />
          <button class="ctx-item" @mousedown.prevent="ctxAddInlineComment()">
            <Icon name="lucide:message-square" class="ctx-icon" />
            Add comment
          </button>
        </template>
      </div>
    </Teleport>

    <!-- Compact Toolbar (shown when toolbarMode is 'static') -->
    <div
      v-if="!seamless && toolbarMode === 'static'"
      class="hidden flex flex-wrap items-center gap-1 border-b bg-transparent px-1.5 py-[2.5px]">
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

      <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />

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

      <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />

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

      <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />

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
        <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />
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
                  <UiButton size="icon" variant="ghost" class="h-7 w-7" :disabled="!editor.isActive('table')">
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
        <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />
        <div class="flex items-center">
          <UiPopover>
            <UiTooltip>
              <UiTooltipTrigger as-child>
                <UiPopoverTrigger as-child>
                  <UiButton size="icon" variant="ghost" class="h-7 w-7">
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
        <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />
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
        <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />
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

      <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />

      <!-- Text Color -->
      <div class="flex items-center">
        <UiPopover>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <UiPopoverTrigger as-child>
                <UiButton size="icon" variant="ghost" class="h-7 w-7 relative">
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
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                Text Color
              </span>
              <div class="flex gap-1">
                <button
                  v-for="c in TEXT_COLORS"
                  :key="c.label"
                  class="h-5 w-5 rounded-full border border-border/50 transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring"
                  :class="{
                    'ring-1 ring-primary ring-offset-1 ring-offset-background': c.value
                      ? editor.isActive('textStyle', { color: c.value })
                      : !editor.isActive('textStyle'),
                  }"
                  :style="{ backgroundColor: c.value || 'var(--foreground)' }"
                  :title="c.label"
                  @click="
                    c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run()
                  " />
              </div>
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mt-1">
                Highlight
              </span>
              <div class="flex gap-1">
                <button
                  v-for="h in HIGHLIGHT_COLORS"
                  :key="h.label"
                  class="h-5 w-5 rounded-full border border-border/50 transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-ring"
                  :class="{
                    'ring-1 ring-primary ring-offset-1 ring-offset-background': h.value
                      ? editor.isActive('highlight', { color: h.value })
                      : !editor.isActive('highlight'),
                  }"
                  :style="{ backgroundColor: h.value || 'var(--muted)' }"
                  :title="h.label"
                  @click="
                    h.value
                      ? editor.chain().focus().toggleHighlight({ color: h.value }).run()
                      : editor.chain().focus().unsetHighlight().run()
                  " />
              </div>
            </div>
          </UiPopoverContent>
        </UiPopover>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5 bg-foreground/40" />

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
      class="prose prose-sm dark:prose-invert max-w-none w-full min-w-0 text-sm text-foreground"
      :class="[
        seamless ? 'px-0 py-0' : fillHeight ? 'px-0 py-0' : 'px-0 py-0',
        seamless ? 'min-h-[24px]' : compact ? 'min-h-[60px]' : 'min-h-[100px]',
        fillHeight ? 'flex-1 min-h-0 overflow-y-auto' : '',
      ]" />

    <!-- Enhanced table controls -->
    <TableHandle v-if="tablesEnabled && editor" :editor="editor" />
    <TableExtendButtons v-if="tablesEnabled && editor" :editor="editor" />

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
        <div class="flex flex-col gap-3 py-2 min-w-0">
          <input
            v-model="entityPickerSearch"
            type="text"
            placeholder="Search entities..."
            class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <div class="max-h-60 overflow-y-auto space-y-0 min-w-0">
            <button
              v-for="item in entityPickerItems"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent transition-colors"
              @click="selectEntityForEmbed(item)">
              <Icon
                :name="entitySearch?.getIcon(item.type) || 'lucide:file'"
                class="h-4 w-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ item.title || 'Untitled' }}</span>
              </div>
              <span
                class="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                {{ item.type }}
              </span>
            </button>
            <p v-if="!entityPickerItems.length" class="py-4 text-center text-xs text-muted-foreground">
              No entities found
            </p>
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
        <div class="flex flex-col gap-3 py-2 min-w-0">
          <div class="flex flex-col gap-0.5 min-w-0">
            <button
              v-for="opt in QUERY_TYPE_OPTIONS"
              :key="opt.value"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors"
              :class="queryPickerType === opt.value ? 'bg-primary/10 text-primary' : 'hover:bg-accent'"
              @click="queryPickerType = opt.value">
              <span class="font-medium truncate">{{ opt.label }}</span>
            </button>
          </div>
          <UiButton class="w-full shrink-0" size="sm" @click="selectTypeForQuery">Insert</UiButton>
        </div>
      </UiDialogContent>
    </UiDialog>

    <!-- ── Sheet Range Picker Dialog ── -->
    <UiDialog v-if="embeds" :open="showSheetRangePicker" @update:open="showSheetRangePicker = $event">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>Embed Sheet Range</UiDialogTitle>
          <UiDialogDescription>Pick a sheet and A1 range for live transclusion.</UiDialogDescription>
        </UiDialogHeader>
        <div class="flex flex-col gap-3 py-2 min-w-0">
          <input
            v-model="sheetRangePickerSearch"
            type="text"
            placeholder="Search sheets…"
            class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            @focus="sheetRangePickerId = ''" />
          <div v-if="!sheetRangePickerId" class="max-h-48 overflow-y-auto space-y-0 min-w-0">
            <button
              v-for="item in sheetPickerItems"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent transition-colors"
              @click="selectSheetForRange(item)">
              <Icon name="lucide:table-2" class="h-4 w-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ item.title || 'Untitled' }}</span>
                <span class="block truncate font-data text-[10px] text-muted-foreground">{{ item.id }}</span>
              </div>
            </button>
            <p v-if="!sheetPickerItems.length" class="py-4 text-center text-xs text-muted-foreground">
              No sheet entities found — seed q3-runway demo first
            </p>
          </div>
          <div v-else class="space-y-3">
            <p class="text-xs text-muted-foreground">
              Sheet: <span class="font-medium text-foreground">{{ sheetRangePickerTitle }}</span>
            </p>
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground">A1 range</label>
              <input
                v-model="sheetRangePickerRange"
                type="text"
                placeholder="A2:E6"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-data text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground">Block title (optional)</label>
              <input
                v-model="sheetRangePickerTitle"
                type="text"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          <p v-if="sheetRangePickerError" class="text-xs text-destructive">{{ sheetRangePickerError }}</p>
          <UiButton class="w-full shrink-0" size="sm" :disabled="!sheetRangePickerId" @click="insertSheetRangeBlock">
            Insert
          </UiButton>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

<style scoped>
  .rte-scroll-pad-content :deep(.ProseMirror) {
    padding-bottom: 2rem;
    padding-top: 2rem;
  }

  :deep(.ProseMirror) {
    outline: none;
    color: var(--foreground) !important;
    max-width: 100%;
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
    overflow: visible;
    max-width: 100%;
    position: relative;
  }

  :deep(.ProseMirror .table-container) {
    overflow-x: auto;
    width: 100%;
    max-width: 100%;
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
    border: none;
    border-top: 1px solid var(--border);
    margin: 0;
    opacity: 1;
    padding: 1rem 0;
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
  .drag-handle {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    border-radius: 0.25rem;
    color: var(--muted-foreground);
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .drag-handle:hover {
    background: var(--muted);
    color: var(--foreground);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  /* Single icon via mask — applied to the component element directly */
  .drag-handle::before {
    content: '';
    width: 0.75rem;
    height: 0.75rem;
    display: block;
    background-color: currentColor;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E");
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E");
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
  }

  /* Drag in progress: dimmed ghost + subtle scale */
  :deep(.ProseMirror .is-dragging) {
    opacity: 0.4;
    transform: scale(0.985);
    background: color-mix(in oklch, var(--muted) 50%, transparent);
    border-radius: 0.25rem;
    box-shadow: 0 4px 16px color-mix(in oklch, var(--foreground) 10%, transparent);
    transition:
      opacity 0.1s ease,
      transform 0.1s ease;
  }

  /* ── Inline Comment mark ─────────────────────────────────────────────── */
  :deep(.inline-comment) {
    background: oklch(0.92 0.08 95 / 0.25);
    border-bottom: 2px solid oklch(0.83 0.17 85 / 0.6);
    border-radius: 2px 2px 0 0;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  :deep(.inline-comment:hover) {
    background: oklch(0.92 0.08 95 / 0.45);
  }

  /* ── Bubble Menu ──────────────────────────────────────────────────────── */
  .bubble-menu-bar {
    position: fixed;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 1px;
    background: var(--popover);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    padding: 3px;
    box-shadow: 0 2px 12px color-mix(in oklch, var(--foreground) 15%, transparent);
    animation: bubble-in 0.1s ease;
  }

  @keyframes bubble-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .bubble-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: calc(var(--radius) - 4px);
    color: var(--muted-foreground);
    transition:
      background 0.1s ease,
      color 0.1s ease;
  }

  .bubble-btn:hover {
    background: var(--accent);
    color: var(--foreground);
  }

  .bubble-btn.is-active {
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .bubble-sep {
    width: 1px;
    height: 1rem;
    background: var(--border);
    margin: 0 2px;
  }

  .bubble-type-btn {
    width: auto;
    padding: 0 0.375rem;
    gap: 0.125rem;
    font-size: 0.7rem;
  }

  .bubble-type-option {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    padding: 0.3rem 0.5rem;
    border-radius: calc(var(--radius) - 4px);
    font-size: 0.75rem;
    color: var(--foreground);
    text-align: left;
    transition: background 0.1s ease;
  }

  .bubble-type-option:hover {
    background: var(--accent);
  }

  .bubble-type-option.is-active {
    background: var(--accent);
    font-weight: 500;
  }

  /* ── Context menu ───────────────────────────────────────────────── */
  .ctx-menu {
    position: fixed;
    z-index: 9999;
    min-width: 188px;
    background: var(--popover);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow:
      0 4px 24px rgba(0, 0, 0, 0.15),
      0 1px 4px rgba(0, 0, 0, 0.08);
    padding: 4px;
    font-size: 0.8rem;
  }

  .ctx-label {
    font-size: 0.65rem;
    color: var(--muted-foreground);
    padding: 4px 8px 2px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    user-select: none;
  }

  .ctx-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 8px;
    border-radius: calc(var(--radius) - 3px);
    color: var(--foreground);
    cursor: pointer;
    text-align: left;
    transition: background 0.08s ease;
    white-space: nowrap;
  }

  .ctx-item:hover {
    background: var(--accent);
  }

  .ctx-item.is-active {
    background: var(--accent);
    color: var(--primary);
    font-weight: 500;
  }

  .ctx-mono {
    display: inline-block;
    width: 1.4rem;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    opacity: 0.55;
    text-align: center;
    flex-shrink: 0;
  }

  .ctx-icon {
    width: 14px;
    height: 14px;
    opacity: 0.6;
    flex-shrink: 0;
  }

  .ctx-shortcut {
    margin-left: auto;
    font-size: 0.68rem;
    opacity: 0.4;
    padding-left: 1rem;
  }

  .ctx-sep {
    height: 1px;
    background: var(--border);
    margin: 3px 0;
  }

  /* ── Inline table controls ─────────────────────────────────────── */

  /* Delete-row cell: narrow gutter column on the right of each row */
  :deep(.tc-del-row-cell) {
    width: 20px !important;
    min-width: 20px !important;
    max-width: 20px !important;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    vertical-align: middle;
  }

  :deep(.tc-del-row) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    color: transparent;
    transition:
      color 0.1s,
      background 0.1s;
    cursor: pointer;
  }

  :deep(tr:hover .tc-del-row) {
    color: var(--muted-foreground);
  }

  :deep(.tc-del-row:hover) {
    background: hsl(var(--destructive) / 0.12);
    color: hsl(var(--destructive)) !important;
  }

  /* Delete-column button: top-right corner of each header cell */
  :deep(.tc-del-col) {
    position: absolute;
    top: 2px;
    right: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    color: transparent;
    transition:
      color 0.1s,
      background 0.1s;
    cursor: pointer;
  }

  :deep(.tc-del-col:hover) {
    color: var(--destructive);
    background: color-mix(in srgb, var(--destructive) 10%, transparent);
  }

  /* ── Table Controls (Overlay) ────────────────────────────────────────── */

  :deep(.tc-overlay) {
    pointer-events: none;
    z-index: 10;
    overflow: visible;
  }

  :deep(.tc-add-row),
  :deep(.tc-add-col) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: var(--background);
    border: 1px solid var(--border);
    color: var(--muted-foreground);
    opacity: 0;
    transition:
      opacity 0.15s,
      background-color 0.15s,
      color 0.15s;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    pointer-events: auto !important; /* Ensure they are clickable */
  }

  :deep(.tc-add-row:hover),
  :deep(.tc-add-col:hover) {
    background: var(--accent);
    color: var(--foreground);
  }

  :deep(.tc-overlay:hover .tc-add-row),
  :deep(.tc-overlay:hover .tc-add-col),
  :deep(.tableWrapper:hover .tc-add-row),
  :deep(.tableWrapper:hover .tc-add-col),
  :deep(.tc-overlay:hover .tc-del-row),
  :deep(.tc-overlay:hover .tc-del-col),
  :deep(.tableWrapper:hover .tc-del-row),
  :deep(.tableWrapper:hover .tc-del-col) {
    opacity: 1;
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

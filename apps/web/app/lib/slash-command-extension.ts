import type { Editor } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import { VueRenderer } from '@tiptap/vue-3'
import Suggestion from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import SlashCommandMenu from '~/components/Ui/SlashCommandMenu.vue'
import type { NoteTemplate } from '~/lib/noteTemplates'
import { HTML_BLOCK_DEFINITION } from '~/lib/block-registry/registry'

type SuggestionRectProps = {
  clientRect?: (() => DOMRect | null) | null
  editor: Editor
  range: { from: number }
}

function coordsClientRect(editor: Editor, from: number): DOMRect {
  const coords = editor.view.coordsAtPos(from)
  return new DOMRect(
    coords.left,
    coords.top,
    Math.max(coords.right - coords.left, 1),
    Math.max(coords.bottom - coords.top, 20),
  )
}

/** TipTap can omit clientRect inside dialogs; fall back to caret coords so the menu still mounts. */
function resolveSuggestionClientRect(props: SuggestionRectProps): () => DOMRect {
  const fallback = () => coordsClientRect(props.editor, props.range.from)
  if (!props.clientRect) return fallback
  return () => {
    const rect = props.clientRect?.() ?? null
    if (!rect || (rect.width === 0 && rect.height === 0)) return fallback()
    return rect
  }
}

function resolveSuggestionAppendTo(editor: Editor): HTMLElement {
  return (editor.view.dom.closest('[role="dialog"]') ?? document.body) as HTMLElement
}

function mountSlashPopup(props: SuggestionRectProps, component: VueRenderer): TippyInstance {
  const appendTo = resolveSuggestionAppendTo(props.editor)
  return tippy(document.body as Element, {
    getReferenceClientRect: resolveSuggestionClientRect(props),
    appendTo: () => appendTo,
    content: component.element as Element,
    showOnCreate: true,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom-start',
    zIndex: 9999,
    maxWidth: 320,
  })
}

export interface SlashCommandItem {
  id: string
  label: string
  description: string
  icon: string
  group: string
  action: (_editor: any) => void
}

function getBuiltInCommands(hasEmbeds: boolean, hasImages: boolean): SlashCommandItem[] {
  const items: SlashCommandItem[] = [
    // ── Text ──
    {
      id: 'heading-1',
      label: 'Heading 1',
      description: 'Large section heading',
      icon: 'lucide:heading-1',
      group: 'Text',
      action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      description: 'Medium section heading',
      icon: 'lucide:heading-2',
      group: 'Text',
      action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      description: 'Small section heading',
      icon: 'lucide:heading-3',
      group: 'Text',
      action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'bullet-list',
      label: 'Bullet List',
      description: 'Unordered list',
      icon: 'lucide:list',
      group: 'Text',
      action: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      label: 'Numbered List',
      description: 'Ordered list',
      icon: 'lucide:list-ordered',
      group: 'Text',
      action: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'task-list',
      label: 'Task List',
      description: 'Checklist with checkboxes',
      icon: 'lucide:list-checks',
      group: 'Text',
      action: (e) => e.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'blockquote',
      label: 'Quote',
      description: 'Block quotation',
      icon: 'lucide:quote',
      group: 'Text',
      action: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code-block',
      label: 'Code Block',
      description: 'Syntax-highlighted code',
      icon: 'lucide:code',
      group: 'Text',
      action: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      label: 'Divider',
      description: 'Horizontal rule',
      icon: 'lucide:minus',
      group: 'Text',
      action: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    // ── Insert ──
    {
      id: 'table',
      label: 'Table',
      description: 'Insert a table',
      icon: 'lucide:table',
      group: 'Insert',
      action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ]

  if (hasEmbeds) {
    items.push(
      {
        id: 'callout',
        label: 'Callout',
        description: 'Highlighted info box',
        icon: 'lucide:message-square-quote',
        group: 'Embeds',
        action: (e) => {
          e.chain().focus().insertCallout({ variant: 'info' }).run()
        },
      },
      {
        id: 'collapsible',
        label: 'Collapsible',
        description: 'Foldable section with an editable title',
        icon: 'lucide:chevron-right',
        group: 'Embeds',
        action: (e) => {
          e.chain().focus().insertCollapsible().run()
        },
      },
      {
        id: 'tabs',
        label: 'Tabs',
        description: 'Tabbed content panel',
        icon: 'lucide:layout-panel-top',
        group: 'Embeds',
        action: (e) => {
          e.chain().focus().insertTabs().run()
        },
      },
      {
        id: 'card',
        label: 'Card',
        description: 'Wrap content in a styled card container',
        icon: 'lucide:square',
        group: 'Embeds',
        action: (e) => {
          e.chain().focus().insertCard().run()
        },
      },
    )

    if (hasImages) {
      items.push({
        id: 'image-embed',
        label: 'Image',
        description: 'Insert an image from file',
        icon: 'lucide:image',
        group: 'Embeds',
        action: (_editor) => {
          // Handled by onEmbedImage callback in RichTextEditor
        },
      })
    }

    items.push(
      {
        id: 'html-embed',
        label: HTML_BLOCK_DEFINITION.label,
        description: HTML_BLOCK_DEFINITION.description,
        icon: HTML_BLOCK_DEFINITION.icon,
        group: 'Embeds',
        action: (_editor) => {
          // Handled by onEmbedHtml callback in RichTextEditor
        },
      },
      {
        id: 'entity-embed',
        label: 'Entity',
        description: 'Embed a live entity card',
        icon: 'lucide:box',
        group: 'Embeds',
        action: (_editor) => {
          // This is handled by the SlashCommandMenu component which emits 'embed-entity'
          // The RichTextEditor will listen for this and open the entity picker
        },
      },
      {
        id: 'query-view',
        label: 'Query View',
        description: 'Embed a live data table',
        icon: 'lucide:database',
        group: 'Embeds',
        action: (_editor) => {
          // Handled by SlashCommandMenu emitting 'embed-query'
        },
      },
      {
        id: 'sheet-range',
        label: 'Sheet Range',
        description: 'Live transclusion from a sheet projection',
        icon: 'lucide:table-2',
        group: 'Embeds',
        action: (_editor) => {
          // Handled by onEmbedSheetRange callback in RichTextEditor
        },
      },
      {
        id: 'diagram',
        label: 'Diagram',
        description: 'Mermaid flowchart, sequence, Gantt, and more',
        icon: 'lucide:workflow',
        group: 'Embeds',
        action: (e) => {
          e.chain().focus().insertContent({
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do it]\n    B -->|No| D[Skip]\n    C --> E[End]\n    D --> E' }],
          }).run()
        },
      },
      {
        id: 'url-embed',
        label: 'Embed',
        description: 'Embed a webpage or video via URL',
        icon: 'lucide:globe',
        group: 'Embeds',
        action: (_editor) => {
          // Handled by onEmbedUrl callback in RichTextEditor
        },
      },
      {
        id: 'image-url',
        label: 'Image URL',
        description: 'Insert a remote image by URL',
        icon: 'lucide:image-plus',
        group: 'Embeds',
        action: (_editor) => {
          // Handled by onEmbedImageUrl callback in RichTextEditor
        },
      },
      {
        id: 'youtube-embed',
        label: 'YouTube',
        description: 'Embed a YouTube video by URL or ID',
        icon: 'lucide:youtube',
        group: 'Embeds',
        action: (_e) => {
          // Handled by onEmbedYoutube callback in RichTextEditor
        },
      },
      {
        id: 'spotify-embed',
        label: 'Spotify',
        description: 'Embed a Spotify track, album, or playlist',
        icon: 'lucide:music',
        group: 'Embeds',
        action: (_e) => {
          // Handled by onEmbedSpotify callback in RichTextEditor
        },
      },
    )
  }

  return items
}

export interface SlashCommandConfig {
  hasEmbeds?: boolean
  hasImages?: boolean
  chatMode?: boolean
  onEmbedEntity?: (_editor: any) => void
  onEmbedQuery?: (_editor: any) => void
  onEmbedHtml?: (_editor: any) => void
  onEmbedDiagram?: (_editor: any) => void
  onEmbedImage?: (_editor: any) => void
  onEmbedUrl?: (_editor: any) => void
  onEmbedImageUrl?: (_editor: any) => void
  onEmbedYoutube?: (_editor: any) => void
  onEmbedSpotify?: (_editor: any) => void
  onEmbedSheetRange?: (_editor: any) => void
  getTemplates?: () => NoteTemplate[]
}

const CHAT_EXCLUDED_IDS = new Set(['heading-1', 'heading-2', 'heading-3', 'table', 'diagram'])

export function createSlashCommandExtension(config: SlashCommandConfig = {}) {
  const { hasEmbeds = false, hasImages = false, chatMode = false, onEmbedEntity, onEmbedQuery, onEmbedHtml, onEmbedImage, onEmbedUrl, onEmbedImageUrl, onEmbedYoutube, onEmbedSpotify, onEmbedSheetRange, getTemplates } = config

  return Extension.create({
    name: 'slashCommand',

    addOptions() {
      return {
        suggestion: {
          char: '/',
          startOfLine: false,
          command: ({ editor, range, props: itemProps }: any) => {
            // Delete the slash + query text
            editor.chain().focus().deleteRange(range).run()

            const item = itemProps as SlashCommandItem

            // Special handling for embed commands that need picker UIs
            if (item.id === 'entity-embed' && onEmbedEntity) {
              onEmbedEntity(editor)
              return
            }
            if (item.id === 'query-view' && onEmbedQuery) {
              onEmbedQuery(editor)
              return
            }
            if (item.id === 'html-embed' && onEmbedHtml) {
              onEmbedHtml(editor)
              return
            }
            if (item.id === 'image-embed' && onEmbedImage) {
              onEmbedImage(editor)
              return
            }
            if (item.id === 'url-embed' && onEmbedUrl) {
              onEmbedUrl(editor)
              return
            }
            if (item.id === 'image-url' && onEmbedImageUrl) {
              onEmbedImageUrl(editor)
              return
            }
            if (item.id === 'youtube-embed' && onEmbedYoutube) {
              onEmbedYoutube(editor)
              return
            }
            if (item.id === 'spotify-embed' && onEmbedSpotify) {
              onEmbedSpotify(editor)
              return
            }
            if (item.id === 'sheet-range' && onEmbedSheetRange) {
              onEmbedSheetRange(editor)
              return
            }
            item.action(editor)
          },
          items: ({ query }: { query: string }) => {
            let commands = getBuiltInCommands(hasEmbeds, hasImages)

            if (chatMode) {
              commands = commands.filter((item) => !CHAT_EXCLUDED_IDS.has(item.id))
            }

            if (getTemplates) {
              const templates = getTemplates()
              for (const tpl of templates) {
                commands.push({
                  id: `template:${tpl.id}`,
                  label: tpl.label,
                  description: tpl.description,
                  icon: tpl.icon,
                  group: 'Templates',
                  action: (editor: any) => {
                    editor.chain().focus().insertContent(tpl.content).run()
                  },
                })
              }
            }

            if (!query) return commands
            const q = query.toLowerCase()
            return commands.filter(
              (item) =>
                item.label.toLowerCase().includes(q)
                || item.description.toLowerCase().includes(q)
                || item.id.includes(q)
                || (q === 'html' && item.id === 'html-embed'),
            )
          },
          render: () => {
            let component: VueRenderer
            let popup: TippyInstance

            return {
              onStart(props: any) {
                component = new VueRenderer(SlashCommandMenu, {
                  props: {
                    items: props.items,
                    command: props.command,
                  },
                  editor: props.editor,
                })

                popup = mountSlashPopup(props, component)
              },

              onUpdate(props: any) {
                component?.updateProps({
                  items: props.items,
                  command: props.command,
                })

                if (!popup) {
                  popup = mountSlashPopup(props, component)
                  return
                }

                popup.setProps({
                  getReferenceClientRect: resolveSuggestionClientRect(props),
                })
              },

              onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === 'Escape') {
                  popup?.hide()
                  return true
                }
                return component?.ref?.onKeyDown(props.event) ?? false
              },

              onExit() {
                popup?.destroy()
                component?.destroy()
              },
            }
          },
        },
      }
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ]
    },
  })
}

import { Extension } from '@tiptap/core'
import { VueRenderer } from '@tiptap/vue-3'
import Suggestion from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import SlashCommandMenu from '~/components/Ui/SlashCommandMenu.vue'

export interface SlashCommandItem {
  id: string
  label: string
  description: string
  icon: string
  group: string
  action: (editor: any) => void
}

function getBuiltInCommands(hasEmbeds: boolean): SlashCommandItem[] {
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
    )
  }

  return items
}

export interface SlashCommandConfig {
  hasEmbeds?: boolean
  onEmbedEntity?: (editor: any) => void
  onEmbedQuery?: (editor: any) => void
}

export function createSlashCommandExtension(config: SlashCommandConfig = {}) {
  const { hasEmbeds = false, onEmbedEntity, onEmbedQuery } = config

  return Extension.create({
    name: 'slashCommand',

    addOptions() {
      return {
        suggestion: {
          char: '/',
          startOfLine: true,
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

            item.action(editor)
          },
          items: ({ query }: { query: string }) => {
            const commands = getBuiltInCommands(hasEmbeds)
            if (!query) return commands
            const q = query.toLowerCase()
            return commands.filter(
              (item) =>
                item.label.toLowerCase().includes(q)
                || item.description.toLowerCase().includes(q)
                || item.id.includes(q),
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

                if (!props.clientRect) return

                const editorEl = props.editor.view.dom
                const dialogContent = editorEl.closest('[role="dialog"]') || document.body

                popup = tippy(document.body as Element, {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => dialogContent as HTMLElement,
                  content: component.element as Element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  zIndex: 9999,
                  maxWidth: 320,
                })
              },

              onUpdate(props: any) {
                component?.updateProps({
                  items: props.items,
                  command: props.command,
                })

                if (!props.clientRect) return

                popup?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
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

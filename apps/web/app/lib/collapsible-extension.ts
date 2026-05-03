import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CollapsibleBlock from '~/components/editor-blocks/CollapsibleBlock.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    collapsible: {
      insertCollapsible: (_attrs?: { title?: string; open?: boolean }) => ReturnType
    }
  }
}

export const Collapsible = Node.create({
  name: 'collapsible',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Toggle',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || 'Toggle',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-title': attributes.title,
        }),
      },
      open: {
        default: true,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-open') !== 'false',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-open': String(attributes.open),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="collapsible"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'collapsible' }), 0]
  },

  addCommands() {
    return {
      insertCollapsible:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                title: attrs?.title ?? 'Toggle',
                open: attrs?.open ?? true,
              },
              content: [{ type: 'paragraph' }],
            })
            .run()
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(CollapsibleBlock)
  },
})

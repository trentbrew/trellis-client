import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CardBlock from '~/components/editor-blocks/CardBlock.vue'

export const Card = Node.create({
  name: 'card',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-title') || '',
        renderHTML: (attrs) => ({ 'data-title': attrs.title || '' }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="card"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'card' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(CardBlock)
  },

  addCommands() {
    return {
      insertCard:
        (attrs?: { title?: string }) =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            attrs: attrs || {},
            content: [{ type: 'paragraph' }],
          }),
    } as any
  },
})

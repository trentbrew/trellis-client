import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import EntityEmbedView from '~/components/editor/EntityEmbedView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityEmbed: {
      insertEntityEmbed: (_attrs: { entityId: string; entityType: string; title?: string }) => ReturnType
    }
  }
}

export const EntityEmbed = Node.create({
  name: 'entityEmbed',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      entityId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-entity-id'),
        renderHTML: (attributes: Record<string, any>) => ({
          'data-entity-id': attributes.entityId,
        }),
      },
      entityType: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-entity-type'),
        renderHTML: (attributes: Record<string, any>) => ({
          'data-entity-type': attributes.entityType,
        }),
      },
      title: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || '',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-title': attributes.title,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="entity-embed"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'entity-embed' }),
      HTMLAttributes['data-title'] || 'Entity',
    ]
  },

  addCommands() {
    return {
      insertEntityEmbed:
        (attrs: { entityId: string; entityType: string; title?: string }) =>
        ({ chain }: any) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run()
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(EntityEmbedView)
  },
})

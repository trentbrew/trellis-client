import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import QueryViewBlock from '~/components/editor-blocks/QueryViewBlock.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    queryView: {
      insertQueryView: (_attrs: { entityType: string; maxRows?: number; title?: string }) => ReturnType
    }
  }
}

export const QueryView = Node.create({
  name: 'queryView',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      entityType: {
        default: 'task',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-entity-type') || 'task',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-entity-type': attributes.entityType,
        }),
      },
      maxRows: {
        default: 5,
        parseHTML: (element: HTMLElement) => {
          const val = element.getAttribute('data-max-rows')
          return val ? parseInt(val, 10) : 5
        },
        renderHTML: (attributes: Record<string, any>) => ({
          'data-max-rows': String(attributes.maxRows),
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
        tag: 'div[data-type="query-view"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'query-view' }),
      HTMLAttributes['data-title'] || `${HTMLAttributes['data-entity-type']} query`,
    ]
  },

  addCommands() {
    return {
      insertQueryView:
        (attrs: { entityType: string; maxRows?: number; title?: string }) =>
        ({ chain }: any) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                entityType: attrs.entityType,
                maxRows: attrs.maxRows ?? 5,
                title: attrs.title || '',
              },
            })
            .run()
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(QueryViewBlock)
  },
})

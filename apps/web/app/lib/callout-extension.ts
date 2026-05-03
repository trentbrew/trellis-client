import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CalloutBlock from '~/components/editor-blocks/CalloutBlock.vue'

export type CalloutVariant = 'info' | 'warning' | 'success' | 'danger' | 'tip' | 'note'

export const CALLOUT_VARIANTS: { id: CalloutVariant; label: string; icon: string; color: string }[] = [
  { id: 'info', label: 'Info', icon: 'lucide:info', color: 'blue' },
  { id: 'warning', label: 'Warning', icon: 'lucide:triangle-alert', color: 'amber' },
  { id: 'success', label: 'Success', icon: 'lucide:circle-check', color: 'emerald' },
  { id: 'danger', label: 'Danger', icon: 'lucide:circle-x', color: 'red' },
  { id: 'tip', label: 'Tip', icon: 'lucide:lightbulb', color: 'purple' },
  { id: 'note', label: 'Note', icon: 'lucide:pencil', color: 'gray' },
]

export function getCalloutConfig(variant: CalloutVariant) {
  return CALLOUT_VARIANTS.find((v) => v.id === variant) || CALLOUT_VARIANTS[0]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-variant') || 'info',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-variant': attributes.variant,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0]
  },

  addCommands() {
    return {
      insertCallout:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { variant: attrs?.variant || 'info' },
              content: [{ type: 'paragraph' }],
            })
            .run()
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(CalloutBlock)
  },
})

import { VueRenderer, VueNodeViewRenderer } from '@tiptap/vue-3'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionOptions, SuggestionKeyDownProps } from '@tiptap/suggestion'
import Mention from '@tiptap/extension-mention'
import MentionSuggestionList from '~/components/Ui/MentionSuggestionList.vue'
import MentionChip from '~/components/Ui/MentionChip.vue'
import type { EntitySearchItem } from '~/composables/useEntitySearch'

export interface MentionSuggestionConfig {
  getItems: (_query: string) => EntitySearchItem[]
  onSelect?: (_item: EntitySearchItem) => void
}

const CustomMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      entityType: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-entity-type'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.entityType) return {}
          return { 'data-entity-type': attributes.entityType }
        },
      },
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(MentionChip)
  },
})

export function createMentionExtension(config: MentionSuggestionConfig) {
  return CustomMention.configure({
    HTMLAttributes: {
      class: 'mention-chip',
    },
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`
    },
    suggestion: createSuggestion(config),
  })
}

function createSuggestion(config: MentionSuggestionConfig): Omit<SuggestionOptions, 'editor'> {
  return {
    char: '@',
    allowSpaces: false,

    items({ query }) {
      return config.getItems(query)
    },

    render() {
      let component: VueRenderer
      let popup: TippyInstance

      return {
        onStart(props) {
          component = new VueRenderer(MentionSuggestionList, {
            props: {
              items: props.items,
              command: (item: EntitySearchItem) => {
                props.command({
                  id: item.id,
                  label: item.title || 'Untitled',
                  entityType: item.type,
                })
                config.onSelect?.(item)
              },
            },
            editor: props.editor,
          })

          if (!props.clientRect) return

          // Find the closest dialog/overlay parent so tippy renders inside
          // the dismissable layer (reka-ui intercepts clicks outside it)
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
          })
        },

        onUpdate(props) {
          component?.updateProps({
            items: props.items,
            command: (item: EntitySearchItem) => {
              props.command({
                id: item.id,
                label: item.title || 'Untitled',
                entityType: item.type,
              })
              config.onSelect?.(item)
            },
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
  }
}

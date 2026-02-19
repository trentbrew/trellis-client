import { VueRenderer, VueNodeViewRenderer } from '@tiptap/vue-3'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionOptions, SuggestionKeyDownProps } from '@tiptap/suggestion'
import Mention from '@tiptap/extension-mention'
import MentionSuggestionList from '~/components/Ui/MentionSuggestionList.vue'
import MentionChip from '~/components/Ui/MentionChip.vue'
import type { EntitySearchItem } from '~/composables/useEntitySearch'
import { getAllEntityTypeIds } from '~/config/entityRegistry'

export interface MentionCreateContext {
  type: string | null
  name: string
}

export interface MentionSuggestionConfig {
  getItems: (_query: string) => EntitySearchItem[]
  onSelect?: (_item: EntitySearchItem) => void
  onCreate?: (_type: string | null, _name: string) => Promise<EntitySearchItem | null>
}

/** Parse `type:name` query syntax. Returns null when query is empty (no create option shown). */
export function parseMentionQuery(query: string): MentionCreateContext | null {
  if (!query.trim()) return null
  const colonIdx = query.indexOf(':')
  if (colonIdx > 0) {
    const possibleType = query.slice(0, colonIdx).toLowerCase()
    const validTypes = new Set<string>(getAllEntityTypeIds() as string[])
    if (validTypes.has(possibleType)) {
      return { type: possibleType, name: query.slice(colonIdx + 1) }
    }
  }
  return { type: null, name: query }
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

      function buildCommand(props: any) {
        return (item: EntitySearchItem) => {
          props.command({
            id: item.id,
            label: item.title || 'Untitled',
            entityType: item.type,
          })
          config.onSelect?.(item)
        }
      }

      function buildOnCreateNew(props: any) {
        if (!config.onCreate) return undefined
        return async (typeOverride?: string) => {
          const ctx = parseMentionQuery(props.query)
          if (!ctx) return
          popup?.hide()
          const resolvedType = typeOverride ?? ctx.type
          const result = await config.onCreate!(resolvedType, ctx.name)
          if (result) {
            props.command({
              id: result.id,
              label: result.title || 'Untitled',
              entityType: result.type,
            })
            config.onSelect?.(result)
          }
        }
      }

      return {
        onStart(props) {
          component = new VueRenderer(MentionSuggestionList, {
            props: {
              items: props.items,
              command: buildCommand(props),
              createContext: parseMentionQuery(props.query),
              onCreateNew: buildOnCreateNew(props),
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
            command: buildCommand(props),
            createContext: parseMentionQuery(props.query),
            onCreateNew: buildOnCreateNew(props),
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

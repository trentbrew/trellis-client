import type { PageItem } from '~/types/entity'
import type { SidecarPage } from './schema/page'
import { UNTITLED_PAGE_TITLE } from './schema/page'

export function mapSidecarToPageItem(page: SidecarPage): PageItem {
  return {
    id: page.id,
    type: 'page',
    title: page.title || UNTITLED_PAGE_TITLE,
    content: typeof page.body === 'string' ? page.body : '',
    description: '',
    isPublished: false,
    pinned: false,
    sortOrder: page.sortOrder,
  }
}

export function mapPageItemToSidecar(partial: Partial<PageItem>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (partial.title !== undefined) {
    out.title = partial.title.trim() || UNTITLED_PAGE_TITLE
  }
  if (partial.content !== undefined) {
    out.body = partial.content
  }
  if (partial.sortOrder !== undefined) {
    out.sortOrder = partial.sortOrder
  }
  return out
}

import { defineType } from 'trellis/browser'
import { z } from 'zod'

/** Sidecar page schema — `body` maps to PageItem.content in the app layer. */
export const PageType = defineType(
  'Page',
  {
    title: z.string().min(1),
    body: z.string().optional(),
    sortOrder: z.number().int().optional(),
  },
  {
    title: 'title',
    extends: 'core:Record',
    label: 'Page',
  },
)

export type SidecarPage = {
  id: string
  type: 'Page'
  title: string
  body?: string
  sortOrder?: number
}

export const UNTITLED_PAGE_TITLE = 'Untitled'

export function pageTitleOrFallback(title: string | undefined | null): string {
  const trimmed = (title ?? '').trim()
  return trimmed || UNTITLED_PAGE_TITLE
}

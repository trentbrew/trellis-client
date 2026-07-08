import type { SlideLayoutId, SlideRegions } from '~/types/deck'

/** Effective layout when `regions.layoutId` is unset (seed / legacy slides). */
export function effectiveLayoutId(regions: SlideRegions): SlideLayoutId {
  if (regions.layoutId) return regions.layoutId
  if (regions.queryView?.query) return 'live-data'
  if (regions.body) return 'content'
  return 'title'
}

export const SLIDE_LAYOUT_OPTIONS: { id: SlideLayoutId; label: string }[] = [
  { id: 'title', label: 'title' },
  { id: 'content', label: 'content' },
  { id: 'two-col', label: 'two-col' },
  { id: 'live-data', label: 'live data' },
]

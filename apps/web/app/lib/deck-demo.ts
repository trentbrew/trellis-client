/** Demo deck schema + seed ids (TRL-295 P1 vertical slice) */
import type { SlideRegions } from '~/types/deck'

export const DECK_YC_S26_ID = 'entity:deck-yc-s26'

export const SHOWROOM_ZONE = 'entity:founder-facility-showroom'
export const FOUNDER_FACILITY = 'entity:founder-facility'

export type DemoSlideSeed = {
  id: string
  title: string
  order: number
  regions: SlideRegions
  speakerNotes?: string
}

export const YC_S26_SLIDES: DemoSlideSeed[] = [
  {
    id: 'entity:slide-yc-title',
    title: 'Title',
    order: 1,
    regions: {
      eyebrow: 'Turtle Labs',
      title: '<p>Trellis</p>',
      body: '<p>The local-first graph OS.</p>',
    },
    speakerNotes: 'Lead with the substrate story.',
  },
  {
    id: 'entity:slide-yc-problem',
    title: 'Problem',
    order: 2,
    regions: {
      eyebrow: 'Problem',
      title: "<p>Your tools don't share a brain</p>",
      body: '<p>Files are blobs; every app rebuilds the same graph.</p>',
      layoutId: 'content',
    },
    speakerNotes: 'Land the blob line.',
  },
  {
    id: 'entity:slide-yc-traction',
    title: 'Traction',
    order: 3,
    regions: {
      eyebrow: 'Traction',
      title: '<p>Raster.tv pays the bills while Trellis compounds</p>',
      layoutId: 'live-data',
      queryView: {
        query: 'find revenue where product = "raster" group by month',
        viz: 'both',
        title: 'Raster.tv MRR',
      },
    },
    speakerNotes: 'Raster revenue + graph compounding.',
  },
]

export const YC_S26_SLIDE_QUERY = (deckId: string) =>
  `FIND entity AS ?s WHERE ?s.type = "slide" AND ?s.deckId = "${deckId}" RETURN ?s`

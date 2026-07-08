/** Graph-native deck projection types (TRL-295 / TRL-300 / TRL-305) */
import type { DeckObjectFrame, DeckSlideObject } from '~/lib/block-registry/types'

export type SlideLayoutId = 'title' | 'content' | 'two-col' | 'live-data'

export type QueryViewRegionConfig = {
  query: string
  viz?: 'chart' | 'tiles' | 'both'
  title?: string
}

export type SlideRegions = {
  eyebrow?: string
  title?: string
  body?: string
  layoutId?: SlideLayoutId
  queryView?: QueryViewRegionConfig
  objects?: DeckSlideObject[]
}

export type SlideDefinition = {
  entityId: string
  title: string
  order: number
  regions: SlideRegions
  speakerNotes?: string
  deckId?: string
}

export type DeckDefinition = {
  title: string
  zoneId?: string
  facilityId?: string
}

export type DeckFixedObjectKind = 'slide' | 'eyebrow' | 'title' | 'body' | 'queryView'

export type DeckDynamicObjectKind = `object:${string}`

export type DeckObjectKind = DeckFixedObjectKind | DeckDynamicObjectKind

export type { DeckObjectFrame, DeckSlideObject }

export type DeckSelection = {
  slideEntityId: string
  objectId: DeckObjectKind
}

export type DeckViewportTransform = {
  x: number
  y: number
  k: number
}

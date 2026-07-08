#!/usr/bin/env bun
/**
 * Seed YC S26 deck demo entities via graph mutate API.
 * Usage: bun apps/web/scripts/seed-deck-demo.mjs
 */
import {
  DECK_YC_S26_ID,
  SHOWROOM_ZONE,
  FOUNDER_FACILITY,
  YC_S26_SLIDES,
} from '../app/lib/deck-demo.ts'

const PORT = process.env.TRELLIS_PORT || '1414'
const BASE = `http://localhost:${PORT}/api/graph`

async function mutate(body) {
  const res = await fetch(`${BASE}/mutate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, agentId: 'seed-script' }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`mutate failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function upsertSlide(slide) {
  const { id, regions, ...rest } = slide
  const data = { ...rest }
  if (regions) {
    if (regions.eyebrow != null) data['regions.eyebrow'] = regions.eyebrow
    if (regions.title != null) data['regions.title'] = regions.title
    if (regions.body != null) data['regions.body'] = regions.body
    if (regions.layoutId != null) data['regions.layoutId'] = regions.layoutId
    if (regions.queryView != null) data['regions.queryView'] = JSON.stringify(regions.queryView)
  }
  await mutate({
    action: 'createNode',
    entityId: id,
    type: 'entity',
    data: {
      type: 'slide',
      deckId: DECK_YC_S26_ID,
      zoneId: SHOWROOM_ZONE,
      facilityId: FOUNDER_FACILITY,
      ...data,
    },
  }).catch(() =>
    mutate({
      action: 'updateNode',
      entityId: id,
      type: 'entity',
      data: {
        type: 'slide',
        deckId: DECK_YC_S26_ID,
        ...data,
      },
    }),
  )
}

async function linkSlide(slideId) {
  await mutate({
    action: 'link',
    e1: DECK_YC_S26_ID,
    relation: 'parentOf',
    e2: slideId,
  }).catch(() => {})
}

async function main() {
  console.log('Seeding deck demo…')

  await mutate({
    action: 'createNode',
    entityId: DECK_YC_S26_ID,
    type: 'entity',
    data: {
      type: 'slide_deck',
      title: 'YC S26 Pitch',
      zoneId: SHOWROOM_ZONE,
      facilityId: FOUNDER_FACILITY,
    },
  }).catch(() => {
    console.log('Deck entity may already exist — updating')
    return mutate({
      action: 'updateNode',
      entityId: DECK_YC_S26_ID,
      type: 'entity',
      data: {
        type: 'slide_deck',
        title: 'YC S26 Pitch',
      },
    })
  })

  for (const slide of YC_S26_SLIDES) {
    await upsertSlide(slide)
    await linkSlide(slide.id)
  }

  console.log(`✓ Deck: ${DECK_YC_S26_ID}`)
  console.log(`✓ ${YC_S26_SLIDES.length} slides`)
  console.log(`Open: http://localhost:${PORT}/decks/yc-s26`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

import { describe, expect, it } from 'vitest'
import {
  appendLayoutNode,
  createEntityRefNode,
  createStickyNode,
  EMPTY_CANVAS_LAYOUT,
  parseCanvasLayout,
  removeLayoutNode,
  updateLayoutNodePosition,
  updateLayoutStickyBody,
  updateLayoutNodeDimensions,
} from '~/types/canvas'

describe('parseCanvasLayout', () => {
  it('returns empty layout for null', () => {
    const layout = parseCanvasLayout(null)
    expect(layout.nodes).toEqual([])
    expect(layout.viewport.zoom).toBe(1)
  })

  it('parses JSON string layout', () => {
    const raw = JSON.stringify({
      viewport: { x: 10, y: 20, zoom: 1.5 },
      nodes: [{ id: 'n1', kind: 'sticky', x: 1, y: 2, w: 180, h: 100, body: 'hi' }],
    })
    const layout = parseCanvasLayout(raw)
    expect(layout.viewport).toEqual({ x: 10, y: 20, zoom: 1.5 })
    expect(layout.nodes).toHaveLength(1)
    expect(layout.nodes[0]?.kind).toBe('sticky')
    expect(layout.nodes[0]?.body).toBe('hi')
  })

  it('defaults invalid entity-ref nodes', () => {
    const layout = parseCanvasLayout({ nodes: [{ id: 'x', kind: 'entity-ref', entityId: 'entity:task-1' }] })
    expect(layout.nodes[0]?.kind).toBe('entity-ref')
    expect(layout.nodes[0]?.entityId).toBe('entity:task-1')
  })
})

describe('layout mutations', () => {
  it('appends sticky node', () => {
    const sticky = createStickyNode(40, 50, 'note')
    const next = appendLayoutNode(EMPTY_CANVAS_LAYOUT, sticky)
    expect(next.nodes).toHaveLength(1)
    expect(next.nodes[0]?.body).toBe('note')
  })

  it('appends entity ref node', () => {
    const ref = createEntityRefNode('entity:note-1', 10, 10)
    const next = appendLayoutNode(EMPTY_CANVAS_LAYOUT, ref)
    expect(next.nodes[0]?.entityId).toBe('entity:note-1')
  })

  it('updates node position', () => {
    const ref = createEntityRefNode('entity:note-1', 0, 0)
    const base = appendLayoutNode(EMPTY_CANVAS_LAYOUT, ref)
    const next = updateLayoutNodePosition(base, ref.id, 99, 88)
    expect(next.nodes[0]?.x).toBe(99)
    expect(next.nodes[0]?.y).toBe(88)
  })

  it('removes node by id', () => {
    const ref = createEntityRefNode('entity:note-1', 0, 0)
    const base = appendLayoutNode(EMPTY_CANVAS_LAYOUT, ref)
    const next = removeLayoutNode(base, ref.id)
    expect(next.nodes).toHaveLength(0)
  })

  it('updates sticky body', () => {
    const sticky = createStickyNode(0, 0)
    const base = appendLayoutNode(EMPTY_CANVAS_LAYOUT, sticky)
    const next = updateLayoutStickyBody(base, sticky.id, 'updated')
    expect(next.nodes[0]?.body).toBe('updated')
  })

  it('updates node dimensions', () => {
    const sticky = createStickyNode(0, 0)
    const base = appendLayoutNode(EMPTY_CANVAS_LAYOUT, sticky)
    const next = updateLayoutNodeDimensions(base, sticky.id, 320, 240)
    expect(next.nodes[0]?.w).toBe(320)
    expect(next.nodes[0]?.h).toBe(240)
  })
})

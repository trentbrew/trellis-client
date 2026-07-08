export type CanvasNodeKind = 'entity-ref' | 'sticky'

export type CanvasLayoutNode = {
  id: string
  kind: CanvasNodeKind
  x: number
  y: number
  w: number
  h: number
  entityId?: string
  body?: string
}

export type CanvasViewport = {
  x: number
  y: number
  zoom: number
}

export type CanvasLayout = {
  viewport: CanvasViewport
  nodes: CanvasLayoutNode[]
  edges: []
}

export const EMPTY_CANVAS_LAYOUT: CanvasLayout = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
  edges: [],
}

export const MAX_CANVAS_NODES = 200

export const TRELLIS_ENTITY_DND_MIME = 'application/x-trellis-entity-id'

export const DEFAULT_ENTITY_NODE_SIZE = { w: 280, h: 240 }
export const DEFAULT_STICKY_SIZE = { w: 180, h: 100 }

export function parseCanvasLayout(raw: unknown): CanvasLayout {
  if (raw == null) return JSON.parse(JSON.stringify(EMPTY_CANVAS_LAYOUT)) as CanvasLayout
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return JSON.parse(JSON.stringify(EMPTY_CANVAS_LAYOUT)) as CanvasLayout
    }
  }
  if (typeof parsed !== 'object' || parsed == null || Array.isArray(parsed)) {
    return JSON.parse(JSON.stringify(EMPTY_CANVAS_LAYOUT)) as CanvasLayout
  }
  const obj = parsed as Record<string, unknown>
  const viewportRaw = obj.viewport
  const viewport: CanvasViewport =
    viewportRaw && typeof viewportRaw === 'object' && !Array.isArray(viewportRaw)
      ? {
          x: Number((viewportRaw as CanvasViewport).x) || 0,
          y: Number((viewportRaw as CanvasViewport).y) || 0,
          zoom: Number((viewportRaw as CanvasViewport).zoom) || 1,
        }
      : { x: 0, y: 0, zoom: 1 }

  const nodesRaw = Array.isArray(obj.nodes) ? obj.nodes : []
  const nodes: CanvasLayoutNode[] = nodesRaw
    .filter((n): n is Record<string, unknown> => n != null && typeof n === 'object')
    .map((n) => ({
      id: String(n.id ?? crypto.randomUUID()),
      kind: n.kind === 'sticky' ? 'sticky' : 'entity-ref',
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      w: Number(n.w) || DEFAULT_ENTITY_NODE_SIZE.w,
      h: Number(n.h) || DEFAULT_ENTITY_NODE_SIZE.h,
      entityId: n.entityId != null ? String(n.entityId) : undefined,
      body: n.body != null ? String(n.body) : undefined,
    }))

  return { viewport, nodes, edges: [] }
}

export function serializeCanvasLayout(layout: CanvasLayout): string {
  return JSON.stringify(layout)
}

export function createStickyNode(x: number, y: number, body = 'New note'): CanvasLayoutNode {
  return {
    id: `sticky-${crypto.randomUUID()}`,
    kind: 'sticky',
    x,
    y,
    w: DEFAULT_STICKY_SIZE.w,
    h: DEFAULT_STICKY_SIZE.h,
    body,
  }
}

export function createEntityRefNode(entityId: string, x: number, y: number): CanvasLayoutNode {
  return {
    id: `ref-${crypto.randomUUID()}`,
    kind: 'entity-ref',
    x,
    y,
    w: DEFAULT_ENTITY_NODE_SIZE.w,
    h: DEFAULT_ENTITY_NODE_SIZE.h,
    entityId,
  }
}

export function updateLayoutNodePosition(
  layout: CanvasLayout,
  nodeId: string,
  x: number,
  y: number,
): CanvasLayout {
  return {
    ...layout,
    nodes: layout.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
  }
}

export function updateLayoutNodeDimensions(
  layout: CanvasLayout,
  nodeId: string,
  w: number,
  h: number,
): CanvasLayout {
  return {
    ...layout,
    nodes: layout.nodes.map((n) => (n.id === nodeId ? { ...n, w, h } : n)),
  }
}

export function appendLayoutNode(layout: CanvasLayout, node: CanvasLayoutNode): CanvasLayout {
  if (layout.nodes.length >= MAX_CANVAS_NODES) return layout
  return { ...layout, nodes: [...layout.nodes, node] }
}

export function removeLayoutNode(layout: CanvasLayout, nodeId: string): CanvasLayout {
  return { ...layout, nodes: layout.nodes.filter((n) => n.id !== nodeId) }
}

export function updateLayoutStickyBody(layout: CanvasLayout, nodeId: string, body: string): CanvasLayout {
  return {
    ...layout,
    nodes: layout.nodes.map((n) => (n.id === nodeId && n.kind === 'sticky' ? { ...n, body } : n)),
  }
}

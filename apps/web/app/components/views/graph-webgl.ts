// 3D / WebGL renderer for GraphView.vue.
//
// Mounted alongside the existing VueFlow + d3-force renderers. Activated by
// `graphMode === 'webgl'`. Visual goals (mirrored from trellis-opencode):
//   - sphere (type color) + icon sprite per node
//   - 1-hop edge closure brightens on hover
//   - depth fog so distant geometry blends into the surface bg
//
// Imperative mount API matching the trellis-opencode `RenderHandle` shape so
// the call site can swap renderers without coupling to ForceGraph3D internals.

import ForceGraph3D from "3d-force-graph"
import * as THREE from "three"

export type WebGLNode = {
  id: string
  title: string
  nodeType: string
  color: string
  icon: string
  raw: any
  x?: number
  y?: number
  z?: number
}

export type WebGLLink = {
  id: string
  source: string
  target: string
  label?: string
  dashed?: boolean
}

export type WebGLCallbacks = {
  onSelect?: (n: WebGLNode) => void
  onHover?: (n: WebGLNode | null) => void
  onDeselect?: () => void
  getIconCanvas: (iconName: string, color: string, sizePx: number) => Promise<HTMLCanvasElement | null>
  bgColor?: string
}

export type WebGLHandle = {
  stop: () => void
  focus: (id: string | null) => void
  setHoveredId: (id: string | null) => void
}

export function mountGraphWebGL(
  container: HTMLElement,
  nodes: WebGLNode[],
  links: WebGLLink[],
  cb: WebGLCallbacks,
): WebGLHandle {
  // ---------------------------------------------------------------------------
  // Adjacency for hover closure
  // ---------------------------------------------------------------------------
  const byId = new Map<string, WebGLNode>()
  for (const n of nodes) byId.set(n.id, n)

  const adj = new Map<string, Set<string>>()
  for (const n of nodes) adj.set(n.id, new Set())
  for (const l of links) {
    adj.get(l.source)?.add(l.target)
    adj.get(l.target)?.add(l.source)
  }

  function linkInClosure(l: any): boolean {
    if (!hoveredId) return false
    const s = typeof l.source === "object" ? l.source.id : l.source
    const t = typeof l.target === "object" ? l.target.id : l.target
    return s === hoveredId || t === hoveredId
  }

  // ---------------------------------------------------------------------------
  // Per-node Object3D bookkeeping
  // ---------------------------------------------------------------------------
  const meshById = new Map<string, THREE.Mesh>()
  const baseColorById = new Map<string, THREE.Color>()
  const disposables: Array<{ dispose: () => void }> = []

  function nodeRadius(n: WebGLNode): number {
    const t = n.nodeType
    if (t === "issue") return 14
    if (t === "project") return 12
    if (t === "epic") return 10
    if (t === "task") return 9
    if (t === "person") return 9
    if (t === "directory") return 8
    if (t === "file") return 7
    return 8
  }

  function buildNodeObject(n: WebGLNode): THREE.Object3D {
    const r = nodeRadius(n)
    const color = new THREE.Color(n.color || "#8b5cf6")
    const group = new THREE.Group()

    const geom = new THREE.SphereGeometry(r, 16, 12)
    const mat = new THREE.MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.95,
      fog: true,
    })
    const mesh = new THREE.Mesh(geom, mat)
    group.add(mesh)
    meshById.set(n.id, mesh)
    baseColorById.set(n.id, color.clone())
    disposables.push(geom, mat)

    // Async-load the icon sprite. The sphere shows immediately; the sprite
    // pops in once the SVG has rasterized to a canvas.
    const iconPx = Math.max(24, Math.round(r * 4))
    cb.getIconCanvas(n.icon || "lucide:circle", "#ffffff", iconPx)
      .then((canvas) => {
        if (!canvas) return
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        const spriteMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: false,
          fog: true,
        })
        const sprite = new THREE.Sprite(spriteMat)
        const s = r * 1.4
        sprite.scale.set(s, s, 1)
        sprite.position.set(0, 0, r * 0.05)
        group.add(sprite)
        disposables.push(tex, spriteMat)
      })
      .catch(() => {})

    return group
  }

  // ---------------------------------------------------------------------------
  // Hover state + edge styling
  // ---------------------------------------------------------------------------
  let hoveredId: string | null = null
  let lastTinted: string | null = null

  const baseLinkRgba = "rgba(180,180,200,0.22)"
  const hotLinkRgba = "rgba(255,255,255,0.85)"
  const dimLinkRgba = "rgba(180,180,200,0.06)"

  function linkColorFn(l: any): string {
    if (!hoveredId) return baseLinkRgba
    if (linkInClosure(l)) return hotLinkRgba
    return dimLinkRgba
  }
  function linkWidthFn(l: any): number {
    if (!hoveredId) return 0.5
    return linkInClosure(l) ? 1.6 : 0.3
  }

  function tintHoveredSphere(id: string | null) {
    if (lastTinted && lastTinted !== id) {
      const m = meshById.get(lastTinted)
      const base = baseColorById.get(lastTinted)
      if (m && base) (m.material as THREE.MeshBasicMaterial).color.copy(base)
    }
    if (id) {
      const m = meshById.get(id)
      if (m) (m.material as THREE.MeshBasicMaterial).color.set("#ffffff")
    }
    lastTinted = id
  }

  function refreshLinks() {
    fg.linkColor(linkColorFn).linkWidth(linkWidthFn)
  }

  // ---------------------------------------------------------------------------
  // ForceGraph3D
  // ---------------------------------------------------------------------------
  const fg = new ForceGraph3D(container)
    .backgroundColor("rgba(0,0,0,0)")
    .showNavInfo(false)
    .nodeRelSize(1)
    .nodeOpacity(0.95)
    .nodeThreeObject(((n: any) => buildNodeObject(n as WebGLNode)) as any)
    .nodeThreeObjectExtend(false)
    .linkColor(linkColorFn)
    .linkWidth(linkWidthFn)
    .linkDirectionalParticles(0)
    .onNodeHover((n: any) => onHover(n))
    .onNodeClick((n: any) => onClick(n))
    .onBackgroundClick(() => cb.onDeselect?.())

  const size = nodes.length
  const baseDist = size > 2200 ? 30 : size > 1200 ? 50 : 80
  const baseCharge = size > 2200 ? -90 : size > 1200 ? -130 : -250

  const charge = fg.d3Force("charge") as any
  charge?.strength(baseCharge).distanceMax(600)
  const linkForce = fg.d3Force("link") as any
  linkForce?.distance(baseDist).strength(0.4)

  fg.graphData({ nodes: nodes as any, links: links as any })

  const scene = fg.scene()
  const fogNear = 120
  const fogFar = size > 2000 ? 2400 : size > 500 ? 1800 : 1200
  scene.fog = new THREE.Fog(new THREE.Color(cb.bgColor || "#0a0a0c"), fogNear, fogFar)

  const ro = new ResizeObserver(() => {
    fg.width(container.clientWidth).height(container.clientHeight)
  })
  ro.observe(container)
  fg.width(container.clientWidth).height(container.clientHeight)

  // ---------------------------------------------------------------------------
  // Hover + click handlers
  // ---------------------------------------------------------------------------
  function onHover(n: WebGLNode | null) {
    const id = n?.id ?? null
    if (id === hoveredId) return
    hoveredId = id
    tintHoveredSphere(id)
    refreshLinks()
    container.style.cursor = id ? "pointer" : "default"
    cb.onHover?.(n)
  }

  function onClick(n: WebGLNode) {
    cb.onSelect?.(n)
    flyTo(n)
  }

  function flyTo(n: WebGLNode) {
    const x = n.x ?? 0
    const y = n.y ?? 0
    const z = n.z ?? 0
    const dist = 120
    const len = Math.hypot(x, y, z) || 1
    const r = 1 + dist / len
    fg.cameraPosition({ x: x * r, y: y * r, z: z * r }, { x, y, z }, 800)
  }

  function focus(id: string | null) {
    if (!id) return
    const n = byId.get(id)
    if (n) flyTo(n)
  }

  function setHoveredId(id: string | null) {
    if (id && !byId.has(id)) return
    if (id === hoveredId) return
    hoveredId = id
    tintHoveredSphere(id)
    refreshLinks()
  }

  function stop() {
    ro.disconnect()
    fg._destructor?.()
    for (const d of disposables) {
      try {
        d.dispose()
      } catch {}
    }
    disposables.length = 0
    meshById.clear()
    baseColorById.clear()
    while (container.firstChild) container.removeChild(container.firstChild)
  }

  return { stop, focus, setHoveredId }
}

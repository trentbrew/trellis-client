/**
 * In-memory reactive data store with localStorage persistence.
 * Mirrors InstantDB's entity storage model.
 *
 * Migration: When switching to real InstantDB, this file is no longer needed —
 * the real SDK manages its own local cache + server sync.
 */

export type Entity = Record<string, any> & { id: string }
export type SubscriptionCallback = (_result: { data?: Record<string, any[]>; error?: any }) => void

export interface Subscription {
  id: string
  query: Record<string, any>
  callback: SubscriptionCallback
  namespaces: Set<string>
}

export class LocalStore {
  private entities: Map<string, Map<string, Entity>> = new Map()
  private links: Map<string, Set<string>> = new Map()
  private subscriptions: Map<string, Subscription> = new Map()
  private storageKey: string
  private persistTimer: ReturnType<typeof setTimeout> | null = null

  constructor(storageKey: string = 'instant-local') {
    this.storageKey = storageKey
    this.hydrate()
  }

  // ── Entity operations ───────────────────────────────────────────────

  getNamespace(ns: string): Map<string, Entity> {
    if (!this.entities.has(ns)) {
      this.entities.set(ns, new Map())
    }
    return this.entities.get(ns)!
  }

  get(ns: string, id: string): Entity | undefined {
    return this.getNamespace(ns).get(id)
  }

  getAll(ns: string): Entity[] {
    return Array.from(this.getNamespace(ns).values())
  }

  set(ns: string, id: string, data: Record<string, any>): void {
    this.getNamespace(ns).set(id, { ...data, id })
  }

  merge(ns: string, id: string, data: Record<string, any>): void {
    const existing = this.get(ns, id)
    if (!existing) {
      this.set(ns, id, data)
      return
    }
    this.getNamespace(ns).set(id, this.deepMerge(existing, data))
  }

  delete(ns: string, id: string): void {
    this.getNamespace(ns).delete(id)
    this.cleanupLinks(ns, id)
  }

  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target }
    for (const [key, value] of Object.entries(source)) {
      if (value === null) {
        Reflect.deleteProperty(result, key)
      } else if (value !== undefined) {
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key]) &&
          result[key] !== null
        ) {
          result[key] = this.deepMerge(result[key], value)
        } else {
          result[key] = value
        }
      }
    }
    return result
  }

  // ── Link operations ─────────────────────────────────────────────────

  private linkKey(ns: string, id: string, label: string): string {
    return `${ns}\0${id}\0${label}`
  }

  addLink(ns: string, id: string, label: string, targetId: string): void {
    const key = this.linkKey(ns, id, label)
    if (!this.links.has(key)) this.links.set(key, new Set())
    this.links.get(key)!.add(targetId)
  }

  removeLink(ns: string, id: string, label: string, targetId: string): void {
    this.links.get(this.linkKey(ns, id, label))?.delete(targetId)
  }

  getLinks(ns: string, id: string, label: string): string[] {
    return Array.from(this.links.get(this.linkKey(ns, id, label)) || [])
  }

  private cleanupLinks(ns: string, id: string): void {
    const prefix = `${ns}\0${id}\0`
    for (const key of this.links.keys()) {
      if (key.startsWith(prefix)) this.links.delete(key)
    }
    for (const [key, targets] of this.links) {
      targets.delete(id)
      if (targets.size === 0) this.links.delete(key)
    }
  }

  // ── Subscription management ─────────────────────────────────────────

  addSubscription(query: Record<string, any>, callback: SubscriptionCallback): string {
    const id = crypto.randomUUID()
    const namespaces = new Set(Object.keys(query))
    this.subscriptions.set(id, { id, query, callback, namespaces })
    return id
  }

  removeSubscription(id: string): void {
    this.subscriptions.delete(id)
  }

  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values())
  }

  // ── Persistence ─────────────────────────────────────────────────────

  persist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => this.persistSync(), 50)
  }

  persistSync(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const data: Record<string, Record<string, Entity>> = {}
      for (const [ns, entities] of this.entities) {
        if (entities.size > 0) data[ns] = Object.fromEntries(entities)
      }
      const linkData: Record<string, string[]> = {}
      for (const [key, targets] of this.links) {
        if (targets.size > 0) linkData[key] = Array.from(targets)
      }
      localStorage.setItem(`${this.storageKey}:entities`, JSON.stringify(data))
      localStorage.setItem(`${this.storageKey}:links`, JSON.stringify(linkData))
    } catch (e) {
      console.warn('[instant-local] Failed to persist:', e)
    }
  }

  private hydrate(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const raw = localStorage.getItem(`${this.storageKey}:entities`)
      if (raw) {
        const data = JSON.parse(raw) as Record<string, Record<string, Entity>>
        for (const [ns, entities] of Object.entries(data)) {
          const nsMap = new Map<string, Entity>()
          for (const [id, entity] of Object.entries(entities)) {
            nsMap.set(id, entity)
          }
          this.entities.set(ns, nsMap)
        }
      }
      const linksRaw = localStorage.getItem(`${this.storageKey}:links`)
      if (linksRaw) {
        const linkData = JSON.parse(linksRaw) as Record<string, string[]>
        for (const [key, targets] of Object.entries(linkData)) {
          this.links.set(key, new Set(targets))
        }
      }
    } catch (e) {
      console.warn('[instant-local] Failed to hydrate:', e)
    }
  }

  clear(): void {
    this.entities.clear()
    this.links.clear()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${this.storageKey}:entities`)
      localStorage.removeItem(`${this.storageKey}:links`)
    }
  }
}

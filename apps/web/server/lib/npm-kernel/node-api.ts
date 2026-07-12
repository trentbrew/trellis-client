/**
 * Entity-write adapter over the published-trellis kernel.
 *
 * The fork's `TrellisKernel` shipped high-level CRUD (`createNode`/`updateNode`/
 * `deleteNode`); the published `trellis@3.2.x` kernel exposes only low-level
 * `mutate`. These helpers are a faithful port of the fork's semantics, built on
 * `mutate` + the published `jsonEntityFacts`, so the ~30 server call sites map
 * across 1:1.
 *
 * Key difference from the fork: the published `mutate` payload distinguishes
 * added facts (`facts`) from removed facts (`deleteFacts`), so a replace/merge
 * is one atomic op rather than the fork's delete-then-add pair.
 *
 * @module server/lib/npm-kernel
 */
import { jsonEntityFacts } from 'trellis/core'
import type { TrellisKernel, MiddlewareContext } from 'trellis/core'

export type WriteCtx = Partial<MiddlewareContext>

export interface NodeApi {
  /** Idempotent full-replace: drops any existing facts for `id`, writes `data`. */
  createNode(id: string, data: unknown, type: string, ctx?: WriteCtx): Promise<void>
  /** Merge: named fields overwrite, unmentioned fields preserved. */
  updateNode(id: string, data: Record<string, unknown>, type: string, ctx?: WriteCtx): Promise<void>
  /** Remove all facts for `id`. */
  deleteNode(id: string, ctx?: WriteCtx): Promise<void>
}

export function createNodeApi(kernel: TrellisKernel): NodeApi {
  const store = () => kernel.getStore()
  return {
    async createNode(id, data, type, ctx = {}) {
      const deleteFacts = store().getFactsByEntity(id)
      await kernel.mutate('addFacts', { facts: jsonEntityFacts(id, data, type), deleteFacts }, ctx)
    },

    async updateNode(id, data, type, ctx = {}) {
      const existingFacts = store().getFactsByEntity(id)
      const existing: Record<string, unknown> = {}
      for (const f of existingFacts) {
        // preserve the domain type fact; only the EAV namespace `type` is re-derived
        if (f.a === 'type' && f.v === type) continue
        existing[f.a] = f.v
      }
      const merged = { ...existing, ...data }
      await kernel.mutate('addFacts', { facts: jsonEntityFacts(id, merged, type), deleteFacts: existingFacts }, ctx)
    },

    async deleteNode(id, ctx = {}) {
      const deleteFacts = store().getFactsByEntity(id)
      if (deleteFacts.length) await kernel.mutate('deleteFacts', { deleteFacts }, ctx)
    },
  }
}

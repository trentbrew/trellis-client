/**
 * Query bridge: run an app-dialect `FIND…` string on the published-trellis
 * kernel and return the fork-compatible result shape (`.rows`).
 *
 * Drop-in for the fork's `kernel.query(eqls)` at the server call sites:
 * `await kernel.query(eqls)` → `await queryFind(kernel, eqls)`.
 *
 * @module server/lib/npm-kernel
 */
import type { TrellisKernel, Atom } from 'trellis/core'
import { transpileFind } from './find-to-select'

export type QueryRow = Record<string, Atom>

export interface FindResult {
  /** Fork-compatible alias for the published kernel's `bindings`. */
  rows: QueryRow[]
  executionTime: number
  count: number
}

/** Transpile + execute an app-dialect EQL-S query; returns `{ rows, … }`. */
export async function queryFind(kernel: TrellisKernel, src: string): Promise<FindResult> {
  const result = await kernel.query(transpileFind(src))
  const rows = result.bindings as QueryRow[]
  return { rows, executionTime: result.executionTime, count: rows.length }
}

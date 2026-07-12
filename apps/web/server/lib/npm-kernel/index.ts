/**
 * npm-kernel adapters — bridge the app's fork-kernel call sites onto the
 * published `trellis@3.2.x` kernel. See ADR-002 server-retirement track.
 *
 * @module server/lib/npm-kernel
 */
export { transpileFind } from './find-to-select'
export { queryFind } from './query'
export type { FindResult, QueryRow } from './query'
export { createNodeApi } from './node-api'
export type { NodeApi, WriteCtx } from './node-api'

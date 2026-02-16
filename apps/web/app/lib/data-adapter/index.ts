/**
 * Data Adapter — unified data backend abstraction.
 *
 * Usage:
 *   import { createLocalAdapter } from '~/lib/data-adapter'
 *   import type { DataAdapter } from '~/lib/data-adapter'
 */

export type {
  DataAdapter,
  DataMode,
  AuthUser,
  AuthPayload,
  AuthCallback,
  QueryResult,
  QueryCallback,
  TxAction,
  TxChunk,
} from './types'

export { createLocalAdapter } from './local-adapter'
export type { LocalAdapterOptions } from './local-adapter'

export { createCloudAdapter } from './cloud-adapter'
export type { CloudAdapterOptions } from './cloud-adapter'

export { exportAdapterData, importToAdapter, exportOntology, importOntology } from './migrate'
export type { DataExport } from './migrate'

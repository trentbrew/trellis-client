/**
 * SQLite kernel backend — npm `trellis/core` schema with legacy embedded fallback.
 *
 * TRL-19a: Existing `.data/trellis.db` files use the embedded ops schema
 * (id/ts/payload columns). Fresh databases use the npm ops layout via
 * `NpmBetterSqliteKernelBackend` (schema-compatible with trellis@3.2.3).
 */
import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import type { KernelBackend, KernelOp } from '@turtle.tech/trellis-kernel/persist'
import { NpmBetterSqliteKernelBackend } from './npm-better-sqlite-kernel'

type NpmSqliteBackend = {
  init(): void
  append(op: KernelOp): void
  readAll(): KernelOp[]
  readUntil(hash: string): KernelOp[]
  readAfter(hash: string): KernelOp[]
  readUntilTimestamp(isoTimestamp: string): KernelOp[]
  getLastOp(): KernelOp | undefined
  getOpCount?(): number
  getOpByHash?(hash: string): KernelOp | undefined
  saveSnapshot(lastOpHash: string, data: unknown): void
  loadLatestSnapshot(): { lastOpHash: string; data: unknown } | undefined
  close?(): void
}

/** True when `ops` table matches embedded fork schema (id + ts columns). */
export function isLegacyEmbeddedSqliteSchema(dbPath: string): boolean {
  if (!existsSync(dbPath)) return false

  const db = new Database(dbPath, { readonly: true })
  try {
    const cols = db.prepare('PRAGMA table_info(ops)').all() as Array<{ name: string }>
    if (cols.length === 0) return false
    const names = new Set(cols.map((c) => c.name))
    return names.has('id') && names.has('ts')
  } catch {
    return false
  } finally {
    db.close()
  }
}

class NpmSqliteBackendAdapter implements KernelBackend {
  constructor(private readonly inner: NpmSqliteBackend) {}

  init(): void {
    this.inner.init()
  }

  append(op: KernelOp): void {
    this.inner.append(op)
  }

  readAll(): KernelOp[] {
    return this.inner.readAll()
  }

  readUntil(hash: string): KernelOp[] {
    return this.inner.readUntil(hash)
  }

  readAfter(hash: string): KernelOp[] {
    return this.inner.readAfter(hash)
  }

  readUntilTimestamp(isoTimestamp: string): KernelOp[] {
    return this.inner.readUntilTimestamp(isoTimestamp)
  }

  getLastOp(): KernelOp | undefined {
    return this.inner.getLastOp()
  }

  countOpsAfter(hash?: string): number {
    if (!hash) {
      if (typeof this.inner.getOpCount === 'function') {
        return this.inner.getOpCount()
      }
      return this.inner.readAll().length
    }

    if (typeof this.inner.getOpByHash === 'function' && !this.inner.getOpByHash(hash)) {
      return 0
    }

    return this.inner.readAfter(hash).length
  }

  saveSnapshot(lastOpHash: string, data: unknown): void {
    this.inner.saveSnapshot(lastOpHash, data)
  }

  loadLatestSnapshot(): { lastOpHash: string; data: unknown } | undefined {
    return this.inner.loadLatestSnapshot()
  }

  close(): void {
    this.inner.close?.()
  }
}

async function createLegacyEmbeddedBackend(dbPath: string): Promise<KernelBackend> {
  const { BetterSqliteBackend } = await import('@turtle.tech/trellis-kernel/persist/better-sqlite')
  const backend = new BetterSqliteBackend({ filename: dbPath })
  backend.init()
  return backend
}

async function createNpmBackend(dbPath: string): Promise<KernelBackend> {
  const inner = new NpmBetterSqliteKernelBackend(dbPath)
  inner.init()
  return new NpmSqliteBackendAdapter(inner)
}

/**
 * Resolve SQLite persistence for embedded `TrellisKernel`.
 * Legacy schema → embedded backend; otherwise npm `trellis/core`.
 */
export async function createNpmSqliteKernelBackend(dbPath: string): Promise<KernelBackend> {
  if (isLegacyEmbeddedSqliteSchema(dbPath)) {
    console.info(
      '[trellis-kernel] legacy SQLite ops schema detected — using embedded BetterSqliteBackend',
    )
    return createLegacyEmbeddedBackend(dbPath)
  }

  console.info('[trellis-kernel] using npm trellis/core SQLite backend')
  return createNpmBackend(dbPath)
}

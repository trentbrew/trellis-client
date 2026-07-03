// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { TrellisKernel } from '@turtle.tech/trellis-kernel'
import {
  createNpmSqliteKernelBackend,
  isLegacyEmbeddedSqliteSchema,
} from './npm-sqlite-backend'

describe('isLegacyEmbeddedSqliteSchema', () => {
  let tmpDir: string

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns false for a missing database file', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernel-adapter-'))
    expect(isLegacyEmbeddedSqliteSchema(join(tmpDir, 'missing.db'))).toBe(false)
  })

  it('returns true for embedded ops schema (id + ts)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernel-adapter-'))
    const dbPath = join(tmpDir, 'legacy.db')
    const db = new Database(dbPath)
    db.exec(`
      CREATE TABLE ops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        ts INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `)
    db.close()
    expect(isLegacyEmbeddedSqliteSchema(dbPath)).toBe(true)
  })

  it('returns false for npm ops schema (timestamp + agent_id)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernel-adapter-'))
    const dbPath = join(tmpDir, 'npm.db')
    const db = new Database(dbPath)
    db.exec(`
      CREATE TABLE ops (
        hash TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        previous_hash TEXT,
        payload TEXT NOT NULL
      );
    `)
    db.close()
    expect(isLegacyEmbeddedSqliteSchema(dbPath)).toBe(false)
  })
})

describe('createNpmSqliteKernelBackend', () => {
  let tmpDir: string
  let kernel: TrellisKernel

  afterEach(() => {
    kernel?.close()
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
  })

  it('boots TrellisKernel on a fresh db via npm trellis/core backend', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernel-adapter-npm-'))
    const dbPath = join(tmpDir, 'fresh.db')
    const backend = await createNpmSqliteKernelBackend(dbPath)
    kernel = new TrellisKernel({ backend, autoReplay: true })
    await kernel.boot({ workspace: { name: 'adapter-test' } })

    await kernel.createNode('entity:adapter-test-1', { type: 'note', title: 'npm backend' }, 'entity')
    const result = await kernel.query('FIND entity AS ?e WHERE ?e.type = "note" RETURN ?e.title LIMIT 1')
    const rows = 'rows' in result ? result.rows : []
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  it('countOpsAfter tracks ops on fresh npm backend', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernel-adapter-count-'))
    const dbPath = join(tmpDir, 'count.db')
    const backend = await createNpmSqliteKernelBackend(dbPath)
    expect(backend.countOpsAfter?.()).toBe(0)

    kernel = new TrellisKernel({ backend, autoReplay: true })
    await kernel.boot({ workspace: { name: 'count-test' } })
    await kernel.createNode('entity:count-test-1', { type: 'note', title: 'count' }, 'entity')

    expect(backend.countOpsAfter?.()).toBeGreaterThan(0)
    const lastOp = backend.getLastOp()
    expect(backend.countOpsAfter?.(lastOp?.hash)).toBe(0)
  })

  it('uses embedded backend when legacy schema is present', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernel-adapter-legacy-'))
    const dbPath = join(tmpDir, 'legacy.db')
    writeFileSync(dbPath, '') // touch — schema created below
    const db = new Database(dbPath)
    db.exec(`
      CREATE TABLE ops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        ts INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_op_hash TEXT NOT NULL,
        ts INTEGER NOT NULL,
        data TEXT NOT NULL
      );
    `)
    db.close()

    const backend = await createNpmSqliteKernelBackend(dbPath)
    kernel = new TrellisKernel({ backend, autoReplay: true })
    await kernel.boot({ workspace: { name: 'legacy-test' } })
    await kernel.createNode('entity:legacy-adapter-1', { type: 'note', title: 'legacy backend' }, 'entity')
    const result = await kernel.query('FIND entity AS ?e WHERE ?e.type = "note" RETURN ?e.title LIMIT 1')
    const rows = 'rows' in result ? result.rows : []
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })
})

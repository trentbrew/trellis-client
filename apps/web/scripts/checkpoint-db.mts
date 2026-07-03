/**
 * One-shot script: boot the TQL kernel and create a snapshot checkpoint.
 * Run with: node --max-old-space-size=12000 -r tsx/register scripts/checkpoint-db.mts
 * Or:       npx tsx --max-old-space-size=12000 scripts/checkpoint-db.mts
 */

import { resolve } from 'node:path'
import { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { BetterSqliteBackend } from '@turtle.tech/trellis-kernel/persist/better-sqlite'
import { createWorkspaceConfig } from '../server/utils/trellis-ontologies.js'

const dbPath = process.env.TRELLIS_DB_PATH || resolve(process.cwd(), '.data/trellis.db')

console.log('[checkpoint] Opening DB:', dbPath)
const backend = new BetterSqliteBackend({ filename: dbPath })

console.log('[checkpoint] Booting kernel (replaying all ops — this may take a while)...')
const t0 = Date.now()

const kernel = new TrellisKernel({ backend, autoReplay: true })
const workspaceConfig = createWorkspaceConfig()
await kernel.boot(workspaceConfig)

console.log(`[checkpoint] Boot complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

console.log('[checkpoint] Writing snapshot...')
await kernel.checkpoint()

console.log('[checkpoint] Snapshot saved. Future boots will be fast.')
kernel.close()

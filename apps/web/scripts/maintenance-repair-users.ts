import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const init = (_args: any): any => {
  throw new Error('InstantDB has been removed from this prototype. This script is deprecated.')
}

const readDotEnv = () => {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const raw = readFileSync(envPath, 'utf8')
  raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .forEach((line) => {
      const idx = line.indexOf('=')
      if (idx === -1) return
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (!key) return
      if (process.env[key]) return
      process.env[key] = value
    })
}

type Mode = 'dry-run' | 'apply'

type ParsedArgs = {
  mode: Mode
  userIds: string[]
  limit: number
  repair: {
    projections: boolean
    schema: boolean
  }
}

const parseArgs = (): ParsedArgs => {
  const argv = process.argv.slice(2)

  const getFlag = (name: string) => argv.includes(name)
  const getString = (prefix: string) => {
    const found = argv.find((a) => a.startsWith(prefix))
    return found ? found.slice(prefix.length) : null
  }

  const mode: Mode = getFlag('--apply') ? 'apply' : 'dry-run'
  const userIdsRaw = getString('--userIds=') || ''
  const userIds = userIdsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const limitRaw = getString('--limit=')
  const limit = limitRaw ? Number(limitRaw) : 50

  const repairProjections = !getFlag('--no-projections')
  const repairSchema = !getFlag('--no-schema')

  return {
    mode,
    userIds,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    repair: {
      projections: repairProjections,
      schema: repairSchema,
    },
  }
}

const looksLikeProjectionsArray = (value: any) => {
  if (!Array.isArray(value)) return false
  return value.every((p) => p && typeof p === 'object' && typeof p.type === 'string')
}

async function main() {
  readDotEnv()

  const appId = process.env.INSTANT_APP_ID
  const adminToken = process.env.INSTANT_SECRET
  if (!appId || !adminToken) {
    throw new Error('Missing INSTANT_APP_ID or INSTANT_SECRET in env (admin script needs Instant admin access)')
  }

  const args = parseArgs()

  const admin = init({ appId, adminToken })
  const tx = (admin as any).tx

  const isDryRun = args.mode === 'dry-run'

  let targetUsers: Array<{ id: string; email?: string }> = []

  if (args.userIds.length) {
    targetUsers = args.userIds.map((id) => ({ id }))
  } else {
    // List users via admin auth API (limited)
    const listed = (await (admin as any).auth.listUsers({ limit: args.limit })) as any
    const users = (listed?.users || listed || []) as any[]
    targetUsers = users
      .map((u) => ({ id: u?.id as string, email: u?.email as string }))
      .filter((u) => typeof u.id === 'string' && u.id)
  }

  if (!targetUsers.length) {
    console.log('No users found to repair.')
    return
  }

  console.log(`Mode: ${args.mode}`)
  console.log(`Users: ${targetUsers.length}`)

  const summary = {
    usersScanned: 0,
    projectionsToRepair: 0,
    projectionsRepaired: 0,
    schemaToRepair: 0,
    schemaRepaired: 0,
  }

  for (const u of targetUsers) {
    summary.usersScanned += 1

    const ownerId = u.id

    const resp = await (admin as any).query({
      settings: {
        $: {
          where: {
            ownerId,
            entityType: 'collection',
          },
        },
      },
      collections: {
        $: {
          where: {
            ownerId,
          },
        },
      },
    })

    const settings = ((resp as any)?.settings || []) as any[]
    const collections = ((resp as any)?.collections || []) as any[]
    const collectionTypeById = new Map<string, any>()
    collections.forEach((c) => {
      if (typeof c?.id === 'string' && c.id) collectionTypeById.set(c.id, c.type)
    })

    const projectionSettings = settings.filter((s) => s?.key === 'projections' && s?.entityType === 'collection')
    const schemaSettings = settings.filter((s) => s?.key === 'schema' && s?.entityType === 'collection')

    const txOps: any[] = []

    if (args.repair.projections) {
      for (const s of projectionSettings) {
        const settingId = typeof s?.id === 'string' ? s.id : ''
        const entityId = typeof s?.entityId === 'string' ? s.entityId : ''
        if (!settingId || !entityId) continue

        const expectedSettingKey = `collection:${entityId}:projections`
        const wrongKey = typeof s?.settingKey === 'string' && s.settingKey !== expectedSettingKey
        const wrongShape = !looksLikeProjectionsArray(s?.value)

        if (!wrongKey && !wrongShape) continue

        summary.projectionsToRepair += 1

        if (isDryRun) continue

        // Minimal safe reset: if shape is wrong, delete the record and let app recreate defaults.
        // If only key is wrong, rewrite metadata and keep value.
        if (wrongShape) {
          txOps.push(tx.settings[settingId].delete())
        } else {
          txOps.push(
            tx.settings[settingId].update({
              ownerId,
              settingKey: expectedSettingKey,
              entityType: 'collection',
              entityId,
              key: 'projections',
              value: s.value,
              updatedAt: Date.now(),
            }),
          )
        }
      }
    }

    if (args.repair.schema) {
      for (const s of schemaSettings) {
        const settingId = typeof s?.id === 'string' ? s.id : ''
        const entityId = typeof s?.entityId === 'string' ? s.entityId : ''
        if (!settingId || !entityId) continue

        const expectedSettingKey = `collection:${entityId}:schema`
        const wrongKey = typeof s?.settingKey === 'string' && s.settingKey !== expectedSettingKey
        const value = s?.value
        const wrongShape =
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          !Array.isArray((value as any).fields) ||
          !Array.isArray((value as any).views)

        if (!wrongKey && !wrongShape) continue

        summary.schemaToRepair += 1

        if (isDryRun) continue

        if (wrongShape) {
          txOps.push(tx.settings[settingId].delete())
        } else {
          txOps.push(
            tx.settings[settingId].update({
              ownerId,
              settingKey: expectedSettingKey,
              entityType: 'collection',
              entityId,
              key: 'schema',
              value: s.value,
              updatedAt: Date.now(),
            }),
          )
        }
      }
    }

    if (!txOps.length) continue

    console.log(`[repair] user=${ownerId}${u.email ? ` (${u.email})` : ''} ops=${txOps.length} dryRun=${isDryRun}`)

    if (!isDryRun) {
      await (admin as any).transact(txOps)
      // We can't perfectly count repaired vs toRepair without re-querying; keep it simple.
      summary.projectionsRepaired += txOps.length
    }
  }

  console.log('---')
  console.log('Summary:', summary)
  console.log('Notes:')
  console.log('- This script defaults to dry-run. Add --apply to execute.')
  console.log('- For wrong-shaped settings, we delete the setting; app/middleware will recreate defaults.')
}

main().catch((err) => {
  console.error('❌ Maintenance repair failed')
  console.error(err)
  process.exitCode = 1
})

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const init = (_args: any): any => {
  throw new Error('InstantDB has been removed from this prototype. This script is deprecated.')
}

type SeedAppDef = {
  slug: string
  name: string
  icon: string
  color: string
  description: string
}

type SeedCollectionDef = {
  slug: string
  title: string
  icon: string
  type: 'database'
  order: number
}

type ProjectionType = 'table' | 'kanban' | 'calendar' | 'graph' | 'list' | 'trellis-blocks' | 'blocks' | 'code'

type Projection = {
  id: string
  type: ProjectionType
  name: string
  icon?: string
  config: Record<string, any>
  isDefault?: boolean
  order?: number
}

type DatabaseSchema = {
  id: string
  collectionId: string
  fields: Array<{
    id: string
    name: string
    type:
      | 'text'
      | 'number'
      | 'select'
      | 'multiselect'
      | 'date'
      | 'checkbox'
      | 'url'
      | 'email'
      | 'file'
      | 'relation'
      | 'formula'
    options?: { value: string; color: string }[]
    required: boolean
    order: number
    config?: Record<string, any>
    formula?: string
    formulaReturnType?: 'text' | 'number' | 'boolean' | 'date'
  }>
  views: Array<{
    id: string
    name: string
    type: 'table' | 'board' | 'calendar' | 'gallery' | 'list'
    filters: string[]
    sorts: string[]
    groupBy?: string
    isDefault: boolean
  }>
  projections?: Projection[]
  createdAt: number
  updatedAt: number
}

type DatabaseRecord = {
  id: string
  collectionId: string
  fields: Record<string, any>
  createdBy: string
  createdAt: number
  updatedAt: number
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

const projectionIcons: Record<ProjectionType, string> = {
  'trellis-blocks': 'lucide:layout-list',
  table: 'lucide:table',
  kanban: 'lucide:kanban',
  calendar: 'lucide:calendar',
  graph: 'lucide:network',
  list: 'lucide:list',
  blocks: 'lucide:blocks',
  code: 'lucide:code-2',
}

const projectionLabels: Record<ProjectionType, string> = {
  'trellis-blocks': 'Trellis',
  table: 'Data Table',
  kanban: 'Kanban',
  calendar: 'Calendar',
  graph: 'Graph',
  list: 'List',
  blocks: 'Blocks',
  code: 'JSON-LD',
}

const createDefaultProjections = (collectionType: 'database'): Projection[] => {
  const projections: Projection[] = []

  ;(['table', 'kanban', 'calendar', 'graph', 'list'] as const).forEach((type, index) => {
    projections.push({
      id: crypto.randomUUID(),
      type,
      name: projectionLabels[type],
      icon: projectionIcons[type],
      config: {},
      isDefault: type === 'table',
      order: index,
    })
  })

  if (collectionType === 'database') {
    projections.push({
      id: crypto.randomUUID(),
      type: 'trellis-blocks',
      name: projectionLabels['trellis-blocks'],
      icon: projectionIcons['trellis-blocks'],
      config: {},
      order: 100,
    })
  }

  projections.push({
    id: crypto.randomUUID(),
    type: 'blocks',
    name: projectionLabels.blocks,
    icon: projectionIcons.blocks,
    config: {},
    order: 101,
  })

  projections.push({
    id: crypto.randomUUID(),
    type: 'code',
    name: projectionLabels.code,
    icon: projectionIcons.code,
    config: {},
    order: 102,
  })

  return projections
}

const createBaseSchema = (collectionId: string, fields: DatabaseSchema['fields']): DatabaseSchema => {
  const now = Date.now()
  return {
    id: '',
    collectionId,
    fields,
    views: [
      {
        id: crypto.randomUUID(),
        name: 'All Records',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
    ],
    projections: undefined,
    createdAt: now,
    updatedAt: now,
  }
}

const ensureSetting = async (
  db: any,
  tx: any,
  ownerId: string,
  entityType: string,
  entityId: string,
  key: string,
  value: any,
) => {
  const settingKey = `${entityType}:${entityId}:${key}`
  const resp = await db.query({
    settings: {
      $: {
        where: {
          settingKey,
        },
      },
    },
  })

  const existing = (resp as any)?.settings?.[0]
  const now = Date.now()

  if (existing?.id) {
    await db.transact([
      tx.settings[existing.id].update({
        ownerId,
        settingKey,
        entityType,
        entityId,
        key,
        value,
        updatedAt: now,
      }),
    ])
    return existing.id as string
  }

  const id = crypto.randomUUID()
  await db.transact([
    tx.settings[id].create({
      ownerId,
      settingKey,
      entityType,
      entityId,
      key,
      value,
      updatedAt: now,
    }),
  ])
  return id
}

const ensureOrg = async (db: any, tx: any, ownerId: string) => {
  const resp = await db.query({
    organizations: {
      $: {
        where: {
          ownerId,
          slug: 'personal',
        },
      },
    },
  })

  const existing = (resp as any)?.organizations?.[0]
  const now = Date.now()

  if (existing?.id) {
    await db.transact([
      tx.organizations[existing.id].update({
        ownerId,
        name: 'Personal',
        slug: 'personal',
        plan: 'free',
        updatedAt: now,
      }),
    ])
    return existing.id as string
  }

  const orgId = crypto.randomUUID()
  await db.transact([
    tx.organizations[orgId].create({
      ownerId,
      name: 'Personal',
      slug: 'personal',
      plan: 'free',
      createdAt: now,
      updatedAt: now,
    }),
  ])

  return orgId
}

const ensureApp = async (db: any, tx: any, ownerId: string, orgId: string, def: SeedAppDef) => {
  const resp = await db.query({
    applications: {
      $: {
        where: {
          orgId,
          slug: def.slug,
        },
      },
    },
  })

  const existing = (resp as any)?.applications?.[0]
  const now = Date.now()

  if (existing?.id) {
    await db.transact([
      tx.applications[existing.id].update({
        ownerId,
        orgId,
        name: def.name,
        slug: def.slug,
        icon: def.icon,
        color: def.color,
        description: def.description,
        updatedAt: now,
      }),
    ])
    return existing.id as string
  }

  const appId = crypto.randomUUID()
  await db.transact([
    tx.applications[appId].create({
      ownerId,
      orgId,
      name: def.name,
      slug: def.slug,
      icon: def.icon,
      color: def.color,
      description: def.description,
      createdAt: now,
      updatedAt: now,
    }),
    tx.organizations[orgId].link({ applications: appId }),
  ])

  return appId
}

const ensureCollection = async (
  db: any,
  tx: any,
  ownerId: string,
  appId: string,
  def: SeedCollectionDef,
): Promise<string> => {
  const resp = await db.query({
    collections: {
      $: {
        where: {
          appId,
          slug: def.slug,
        },
      },
    },
  })

  const existing = (resp as any)?.collections?.[0]
  const now = Date.now()

  if (existing?.id) {
    await db.transact([
      tx.collections[existing.id].update({
        ownerId,
        appId,
        parentId: null,
        title: def.title,
        slug: def.slug,
        icon: def.icon,
        type: def.type,
        order: def.order,
        isPublished: true,
        createdBy: ownerId,
        updatedAt: now,
      }),
    ])
    return existing.id as string
  }

  const collectionId = crypto.randomUUID()
  await db.transact([
    tx.collections[collectionId].create({
      ownerId,
      appId,
      parentId: null,
      title: def.title,
      slug: def.slug,
      icon: def.icon,
      type: def.type,
      order: def.order,
      isPublished: true,
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now,
    }),
    tx.applications[appId].link({ collections: collectionId }),
  ])

  return collectionId
}

async function main() {
  readDotEnv()

  const appId = process.env.INSTANT_APP_ID
  const adminToken = process.env.INSTANT_SECRET

  if (!appId || !adminToken) {
    throw new Error('Missing INSTANT_APP_ID or INSTANT_SECRET in env (seed script needs admin access)')
  }

  const seedUserId = process.env.SEED_USER_ID
  const seedUserEmail = process.env.SEED_USER_EMAIL

  const admin: any = init({ appId, adminToken })
  const tx = (admin as any).tx

  let ownerId: string | null = seedUserId || null
  if (!ownerId) {
    if (!seedUserEmail) {
      throw new Error('Provide SEED_USER_ID or SEED_USER_EMAIL for seeding (ownerId for created records)')
    }
    const user = await admin.auth.getUser({ email: seedUserEmail })
    ownerId = (user as any)?.id || null
  }
  if (!ownerId) throw new Error('Unable to resolve seed user id')

  const orgId = await ensureOrg(admin, tx, ownerId)
  await ensureSetting(admin, tx, ownerId, 'user', ownerId, 'personalOrgId', orgId)

  const apps: SeedAppDef[] = [
    {
      slug: 'personal',
      name: 'Personal',
      icon: 'lucide:layout',
      color: 'bg-primary',
      description: 'Personal workspace',
    },
    {
      slug: 'connector-hub',
      name: 'Connector Hub',
      icon: 'lucide:plug',
      color: 'bg-sky-500',
      description: 'Integrations, connectors, and sync runs',
    },
    {
      slug: 'trip-planner',
      name: 'Trip Planner',
      icon: 'lucide:map',
      color: 'bg-emerald-500',
      description: 'Trips, itineraries, and bookings',
    },
    {
      slug: 'family-finance',
      name: 'Family Finance',
      icon: 'lucide:wallet',
      color: 'bg-violet-500',
      description: 'Accounts, transactions, budgets, and categories',
    },
  ]

  const appIdsBySlug = new Map<string, string>()
  for (const def of apps) {
    const createdId = await ensureApp(admin, tx, ownerId, orgId, def)
    appIdsBySlug.set(def.slug, createdId)
  }

  const collectionsByAppSlug: Record<string, SeedCollectionDef[]> = {
    personal: [
      { slug: 'home', title: 'Home', icon: 'lucide:home', type: 'database', order: 0 },
      { slug: 'notes', title: 'Notes', icon: 'lucide:sticky-note', type: 'database', order: 1 },
    ],
    'connector-hub': [
      { slug: 'connectors', title: 'Connectors', icon: 'lucide:plug', type: 'database', order: 0 },
      { slug: 'sync-jobs', title: 'Sync Jobs', icon: 'lucide:refresh-cw', type: 'database', order: 1 },
      { slug: 'runs', title: 'Runs', icon: 'lucide:activity', type: 'database', order: 2 },
      { slug: 'logs', title: 'Logs', icon: 'lucide:file-text', type: 'database', order: 3 },
    ],
    'trip-planner': [
      { slug: 'trips', title: 'Trips', icon: 'lucide:map-pin', type: 'database', order: 0 },
      { slug: 'days', title: 'Days', icon: 'lucide:calendar', type: 'database', order: 1 },
      { slug: 'bookings', title: 'Bookings', icon: 'lucide:ticket', type: 'database', order: 2 },
      { slug: 'places', title: 'Places', icon: 'lucide:building-2', type: 'database', order: 3 },
    ],
    'family-finance': [
      { slug: 'accounts', title: 'Accounts', icon: 'lucide:credit-card', type: 'database', order: 0 },
      { slug: 'transactions', title: 'Transactions', icon: 'lucide:arrow-left-right', type: 'database', order: 1 },
      { slug: 'budgets', title: 'Budgets', icon: 'lucide:piggy-bank', type: 'database', order: 2 },
      { slug: 'categories', title: 'Categories', icon: 'lucide:tags', type: 'database', order: 3 },
    ],
  }

  for (const [slug, appId2] of appIdsBySlug.entries()) {
    const defs = collectionsByAppSlug[slug] || []
    for (const colDef of defs) {
      const collectionId = await ensureCollection(admin, tx, ownerId, appId2, colDef)

      // Schema
      const fields: DatabaseSchema['fields'] = (() => {
        if (slug === 'connector-hub' && colDef.slug === 'connectors') {
          return [
            { id: 'name', name: 'Name', type: 'text', required: true, order: 0 },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: true,
              order: 1,
              options: [
                { value: 'Connected', color: 'green' },
                { value: 'Needs Auth', color: 'yellow' },
                { value: 'Error', color: 'red' },
              ],
            },
            { id: 'provider', name: 'Provider', type: 'text', required: false, order: 2 },
            { id: 'lastSyncAt', name: 'Last Sync', type: 'date', required: false, order: 3 },
          ]
        }

        if (slug === 'trip-planner' && colDef.slug === 'trips') {
          return [
            { id: 'title', name: 'Title', type: 'text', required: true, order: 0 },
            { id: 'startDate', name: 'Start Date', type: 'date', required: false, order: 1 },
            { id: 'endDate', name: 'End Date', type: 'date', required: false, order: 2 },
            {
              id: 'status',
              name: 'Status',
              type: 'select',
              required: true,
              order: 3,
              options: [
                { value: 'Planning', color: 'blue' },
                { value: 'Booked', color: 'green' },
                { value: 'Completed', color: 'gray' },
              ],
            },
          ]
        }

        if (slug === 'family-finance' && colDef.slug === 'transactions') {
          return [
            { id: 'date', name: 'Date', type: 'date', required: true, order: 0 },
            { id: 'merchant', name: 'Merchant', type: 'text', required: true, order: 1 },
            { id: 'amount', name: 'Amount', type: 'number', required: true, order: 2 },
            { id: 'category', name: 'Category', type: 'text', required: false, order: 3 },
          ]
        }

        // Default minimal schema
        return [
          { id: 'title', name: 'Title', type: 'text', required: true, order: 0 },
          {
            id: 'status',
            name: 'Status',
            type: 'select',
            required: false,
            order: 1,
            options: [{ value: 'Open', color: 'blue' }],
          },
        ]
      })()

      const schema = createBaseSchema(collectionId, fields)
      await ensureSetting(admin, tx, ownerId, 'collection', collectionId, 'schema', schema)

      // Projections
      const projections = createDefaultProjections('database')
      await ensureSetting(admin, tx, ownerId, 'collection', collectionId, 'projections', projections)

      // Records
      const now = Date.now()
      const sampleRecords: DatabaseRecord[] = (() => {
        if (slug === 'connector-hub' && colDef.slug === 'connectors') {
          return [
            {
              id: crypto.randomUUID(),
              collectionId,
              fields: { name: 'Slack', status: 'Connected', provider: 'Slack', lastSyncAt: now },
              createdBy: ownerId,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: crypto.randomUUID(),
              collectionId,
              fields: { name: 'Google Drive', status: 'Needs Auth', provider: 'Google', lastSyncAt: now },
              createdBy: ownerId,
              createdAt: now,
              updatedAt: now,
            },
          ]
        }

        if (slug === 'trip-planner' && colDef.slug === 'trips') {
          return [
            {
              id: crypto.randomUUID(),
              collectionId,
              fields: { title: 'Tokyo 2026', status: 'Planning', startDate: now, endDate: now },
              createdBy: ownerId,
              createdAt: now,
              updatedAt: now,
            },
          ]
        }

        if (slug === 'family-finance' && colDef.slug === 'transactions') {
          return [
            {
              id: crypto.randomUUID(),
              collectionId,
              fields: { date: now, merchant: 'Grocery Store', amount: 84.12, category: 'Groceries' },
              createdBy: ownerId,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: crypto.randomUUID(),
              collectionId,
              fields: { date: now, merchant: 'Gas Station', amount: 52.44, category: 'Transport' },
              createdBy: ownerId,
              createdAt: now,
              updatedAt: now,
            },
          ]
        }

        return []
      })()

      await ensureSetting(admin, tx, ownerId, 'collection', collectionId, 'records', sampleRecords)
    }
  }

  // App-scoped settings: customTypes + workflows
  for (const [slug, appId3] of appIdsBySlug.entries()) {
    const now = Date.now()

    const customTypes =
      slug === 'family-finance'
        ? [
            {
              id: crypto.randomUUID(),
              appId: appId3,
              name: 'Account',
              description: 'A financial account',
              icon: 'lucide:credit-card',
              extends: 'Thing',
              createdAt: now,
              updatedAt: now,
            },
          ]
        : []

    const workflows =
      slug === 'connector-hub'
        ? [
            {
              id: crypto.randomUUID(),
              appId: appId3,
              name: 'Run nightly sync',
              description: 'Placeholder workflow definition',
              icon: 'lucide:workflow',
              trigger: 'scheduled',
              active: true,
              createdAt: now,
              updatedAt: now,
            },
          ]
        : []

    await ensureSetting(admin, tx, ownerId, 'app', appId3, 'customTypes', customTypes)
    await ensureSetting(admin, tx, ownerId, 'app', appId3, 'workflows', workflows)

    // Keep current selection stable; do not touch lastOrgId/lastAppId.
  }

  console.log('✅ Demo seed complete')
  console.log(`- org: ${orgId}`)
  console.log(
    `- apps: ${Array.from(appIdsBySlug.entries())
      .map(([s]) => s)
      .join(', ')}`,
  )
}

main().catch((err) => {
  console.error('❌ Demo seed failed')
  console.error(err)
  process.exitCode = 1
})

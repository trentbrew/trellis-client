import type {
  Organization,
  Application,
  Collection,
  CustomType,
  Workflow,
  WorkflowGraph,
  DatabaseSchema,
} from '~/types/database'
import { pickOrgAndApp } from '~/lib/pickOrgAndApp'
import { createCollectionGraph, serializeTrellisDocument } from '~/lib/trellis'
import { createDefaultProjections } from '~/lib/projections'

/**
 * Default JSON-LD boilerplate for new database collections
 */
function _getDefaultJsonLdBoilerplate(options: { id: string; name: string; description?: string }): string {
  return serializeTrellisDocument(
    createCollectionGraph({
      collectionId: options.id,
      collectionName: options.name,
      collectionDescription: options.description || '',
    }),
    true,
  )
}

function createSeedSchema(collectionId: string): DatabaseSchema {
  const now = Date.now()
  return {
    id: '',
    collectionId,
    fields: [
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        options: [
          { value: 'Todo', color: 'gray' },
          { value: 'In Progress', color: 'blue' },
          { value: 'Done', color: 'green' },
        ],
        required: false,
        order: 0,
      },
      {
        id: 'dueDate',
        name: 'Due date',
        type: 'date',
        required: false,
        order: 1,
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'number',
        required: false,
        order: 2,
      },
    ],
    views: [
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'view_all_records',
        name: 'All Records',
        type: 'table',
        filters: [],
        sorts: [],
        isDefault: true,
      },
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'view_board',
        name: 'Board',
        type: 'board',
        filters: [],
        sorts: [],
        groupBy: 'status',
        isDefault: false,
      },
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'view_calendar',
        name: 'Calendar',
        type: 'calendar',
        filters: [],
        sorts: [],
        isDefault: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

function getSeededDatabaseContent(options: {
  id: string
  name: string
  description?: string
  ownerId: string
  schema: DatabaseSchema
}): string {
  const doc = createCollectionGraph({
    collectionId: options.id,
    collectionName: options.name,
    collectionDescription: options.description || '',
    schemaFields: options.schema.fields.map((f) => ({ name: f.name, valueType: f.type })),
  })

  const nowIso = new Date().toISOString()
  const mkRecord = (title: string, status: string, offsetDays: number, priority: number) => {
    const due = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString()
    return {
      '@id': `trellis:record/${crypto.randomUUID()}`,
      '@type': 'trellis:Record',
      'trellis:title': title,
      'trellis:description': '',
      'trellis:content': { '@type': 'trellis:Document', blocks: [] },
      'trellis:metadata': {
        createdTime: nowIso,
        createdBy: { '@id': options.ownerId },
        lastEditedTime: nowIso,
        lastEditedBy: { '@id': options.ownerId },
      },
      'user:status': status,
      'user:dueDate': due,
      'user:priority': priority,
    }
  }

  ;(doc.graph.nodes as Record<string, any>[]).push(mkRecord('First task', 'Todo', 2, 1))
  ;(doc.graph.nodes as Record<string, any>[]).push(mkRecord('Second task', 'In Progress', 5, 2))
  ;(doc.graph.nodes as Record<string, any>[]).push(mkRecord('Ship it', 'Done', 8, 3))

  return serializeTrellisDocument(doc, true)
}

/**
 * InstantDB data layer - replaces Dexie with reactive queries
 * Uses InstantDB's built-in local storage, sync, and reactivity
 */
export function useInstantData() {
  const db = useInstantDb()
  const { user } = useInstantAuth()
  const tx = db.tx as Record<string, any>
  const isLocalMode = db.mode === 'local'

  const route = import.meta.client ? useRoute() : null

  const router = import.meta.client ? useRouter() : null

  const currentOrg = useState<Organization | null>('currentOrg', () => null)
  const currentApp = useState<Application | null>('currentApp', () => null)

  // Organizations - reactive data
  const organizations = useState<Organization[]>('instantData:organizations', () => [])
  const orgsLoading = useState<boolean>('instantData:orgsLoading', () => true)
  const orgsError = useState<any>('instantData:orgsError', () => null)

  // Applications - reactive data filtered by current org
  const applications = useState<Application[]>('instantData:applications', () => [])
  const appsLoading = useState<boolean>('instantData:appsLoading', () => false)

  // Collections - reactive data filtered by current app
  const collections = useState<Collection[]>('instantData:collections', () => [])
  const collectionsLoading = useState<boolean>('instantData:collectionsLoading', () => false)

  // Custom Types - app-scoped, stored in settings
  const customTypes = useState<CustomType[]>('instantData:customTypes', () => [])
  const customTypesLoading = useState<boolean>('instantData:customTypesLoading', () => false)

  // Workflows - app-scoped, stored in settings
  const workflows = useState<Workflow[]>('instantData:workflows', () => [])
  const workflowsLoading = useState<boolean>('instantData:workflowsLoading', () => false)

  // Subscriptions/watches are registered once and kept for the app lifetime.
  // This avoids Vue lifecycle warnings when useInstantData() is called from middleware.
  if (import.meta.client) {
    const subscriptionsStarted = useState<boolean>('instantData:subscriptionsStarted', () => false)

    if (!subscriptionsStarted.value) {
      subscriptionsStarted.value = true

      db.subscribeQuery({ organizations: {} }, (result: any) => {
        if (result.error) {
          orgsError.value = result.error
          orgsLoading.value = false
        } else if (result.data) {
          organizations.value = ((result.data as Record<string, any>).organizations || []) as Organization[]
          orgsLoading.value = false
        }
      })

      let unsubApps: (() => void) | null = null
      watch(
        currentOrg,
        (org) => {
          if (unsubApps) {
            unsubApps()
            unsubApps = null
          }

          if (!org) {
            applications.value = []
            appsLoading.value = false
            return
          }

          appsLoading.value = true
          unsubApps = db.subscribeQuery(
            {
              applications: {
                $: {
                  where: {
                    orgId: org.id,
                  },
                },
              },
            },
            (result: any) => {
              if (result.data) {
                applications.value = ((result.data as Record<string, any>).applications || []) as Application[]
              }
              appsLoading.value = false
            },
          )
        },
        { immediate: true },
      )

      let unsubCollections: (() => void) | null = null
      watch(
        currentApp,
        (app) => {
          if (unsubCollections) {
            unsubCollections()
            unsubCollections = null
          }

          if (!app) {
            collections.value = []
            collectionsLoading.value = false
            return
          }

          collectionsLoading.value = true
          unsubCollections = db.subscribeQuery(
            {
              collections: {
                $: {
                  where: {
                    appId: app.id,
                  },
                },
              },
            },
            (result: any) => {
              if (result.data) {
                const items = (((result.data as Record<string, any>).collections || []) as Collection[]).slice()
                collections.value = items.sort((a, b) => (a.order || 0) - (b.order || 0))
              }
              collectionsLoading.value = false
            },
          )
        },
        { immediate: true },
      )

      // If the user switches apps while on a collection detail route, ensure the slug exists
      // in the newly-selected app. Otherwise, route back to /ontologies.
      watch(
        [currentApp, collections, collectionsLoading],
        () => {
          if (!router || !route) return
          const app = currentApp.value
          if (!app) return

          const path = route.path
          let slug = ''
          if (path.includes('/collections/')) {
            // Match both /collections/:slug and the legacy /database/collections/:slug shim.
            const marker = path.includes('/database/collections/') ? '/database/collections/' : '/collections/'
            slug = path.split(marker)[1]?.split('/')[0] || ''
          }
          if (!slug) return

          if (collectionsLoading.value) return

          const exists = (collections.value || []).some((c) => c.appId === app.id && c.slug === slug)
          if (exists) return

          void router.replace('/ontologies')
        },
        { immediate: true },
      )

      let unsubCustomTypes: (() => void) | null = null
      watch(
        currentApp,
        (app) => {
          if (unsubCustomTypes) {
            unsubCustomTypes()
            unsubCustomTypes = null
          }

          if (!app) {
            customTypes.value = []
            customTypesLoading.value = false
            return
          }

          customTypesLoading.value = true
          const settingKey = `app:${app.id}:customTypes`
          unsubCustomTypes = db.subscribeQuery(
            {
              settings: {
                $: {
                  where: {
                    settingKey,
                  },
                },
              },
            },
            (result: any) => {
              const raw = (result.data as Record<string, any>)?.settings?.[0]?.value
              const items = Array.isArray(raw) ? (raw as CustomType[]) : []
              customTypes.value = items
              customTypesLoading.value = false
            },
          )
        },
        { immediate: true },
      )

      let unsubWorkflows: (() => void) | null = null
      watch(
        currentApp,
        (app) => {
          if (unsubWorkflows) {
            unsubWorkflows()
            unsubWorkflows = null
          }

          if (!app) {
            workflows.value = []
            workflowsLoading.value = false
            return
          }

          workflowsLoading.value = true
          const settingKey = `app:${app.id}:workflows`
          unsubWorkflows = db.subscribeQuery(
            {
              settings: {
                $: {
                  where: {
                    settingKey,
                  },
                },
              },
            },
            (result: any) => {
              const raw = (result.data as Record<string, any>)?.settings?.[0]?.value
              const items = Array.isArray(raw) ? (raw as Workflow[]) : []
              workflows.value = items
              workflowsLoading.value = false
            },
          )
        },
        { immediate: true },
      )
    }
  }

  if (import.meta.client) {
    const contextSyncStarted = useState<boolean>('instantData:contextSyncStarted', () => false)

    if (!contextSyncStarted.value) {
      contextSyncStarted.value = true

      const STORAGE_LAST_ORG_ID = 'turtle:lastOrgId'
      const STORAGE_LAST_APP_ID = 'turtle:lastAppId'

      const safeGetStorageItem = (key: string) => {
        try {
          return localStorage.getItem(key)
        } catch {
          return null
        }
      }

      const safeSetStorageItem = (key: string, value: string) => {
        try {
          localStorage.setItem(key, value)
        } catch {
          return
        }
      }

      const findOrgFromToken = (token: string | null) => {
        if (!token) return null
        return organizations.value.find((o) => o.id === token || o.slug === token) || null
      }

      const findAppFromToken = (token: string | null) => {
        if (!token) return null
        return applications.value.find((a) => a.id === token || a.slug === token) || null
      }

      const getQueryToken = (key: string): string | null => {
        const raw = route?.query?.[key]
        if (typeof raw === 'string' && raw) return raw
        return null
      }

      const reconcileOrgAndApp = () => {
        const orgs = organizations.value || []
        const apps = applications.value || []
        if (orgs.length === 0) return

        const orgToken = getQueryToken('org')
        const appToken = getQueryToken('app')

        if (appToken) {
          const app = findAppFromToken(appToken)
          if (app) {
            const orgForApp = orgs.find((o) => o.id === app.orgId) || null
            if (orgForApp) currentOrg.value = orgForApp
            currentApp.value = app
            return
          }
        }

        if (orgToken) {
          const org = findOrgFromToken(orgToken)
          if (org) {
            currentOrg.value = org
            if (currentApp.value?.orgId !== org.id) {
              currentApp.value = apps.find((a) => a.orgId === org.id) || null
            }
            return
          }
        }

        const orgMismatch = !!(currentOrg.value && currentApp.value && currentApp.value.orgId !== currentOrg.value.id)
        if (currentOrg.value && currentApp.value && !orgMismatch) return

        const picked = pickOrgAndApp({
          orgs,
          apps,
          lastOrgId: currentOrg.value?.id || safeGetStorageItem(STORAGE_LAST_ORG_ID),
          lastAppId: currentApp.value?.id || safeGetStorageItem(STORAGE_LAST_APP_ID),
        })

        if (picked.org) currentOrg.value = picked.org
        currentApp.value = picked.app
      }

      watch([organizations, applications], reconcileOrgAndApp, { immediate: true })
      watch(() => [route?.query?.org, route?.query?.app], reconcileOrgAndApp, { immediate: true })

      // Auto-create a default organization when none exist.
      // In cloud mode, users start with an empty InstantDB — this bootstraps the data layer
      // so the UI has a valid org/app context on first load after authentication.
      //
      // IMPORTANT: This must NOT fire for invited members who belong to an existing org.
      // We gate on:
      //   1. onboardingComplete — if onboarding hasn't finished, the onboarding page handles org setup
      //   2. lastOrgId — if set, the user already belongs to an org; wait for the subscription to resolve it
      //   3. memberships — if the user has any pending/active member records, skip auto-creation
      //   4. debounce — give the WebSocket subscription time to deliver permission-based orgs
      const isAutoCreatingOrg = useState<boolean>('instantData:isAutoCreatingOrg', () => false)
      let orgAutoCreateTimer: ReturnType<typeof setTimeout> | null = null
      watch(
        [organizations, orgsLoading, user],
        ([orgs, loading, authUser]) => {
          // Clear any pending auto-create when the watcher re-fires
          if (orgAutoCreateTimer) {
            clearTimeout(orgAutoCreateTimer)
            orgAutoCreateTimer = null
          }

          if (loading || isAutoCreatingOrg.value || !authUser?.id) return
          if ((orgs || []).length > 0) return

          // Debounce: wait 2s for WebSocket sync to deliver member-visible orgs
          orgAutoCreateTimer = setTimeout(async () => {
            // Re-check after debounce — orgs may have arrived via subscription
            if ((organizations.value || []).length > 0 || isAutoCreatingOrg.value) return

            if (!isLocalMode) {
              try {
                const settingResp = await db.queryOnce({
                  settings: { $: { where: { settingKey: `user:${authUser.id}:onboardingComplete` } } },
                })
                const onboardingDone = (settingResp.data as Record<string, any>)?.settings?.[0]?.value
                if (!onboardingDone) {
                  console.info('[useInstantData] Skipping auto-create org: onboarding not complete')
                  return
                }
              } catch {
                /* non-fatal — proceed with other checks */
              }
            }

            // Gate 2: Don't auto-create if lastOrgId is set (user belongs to an existing org)
            try {
              const orgIdResp = await db.queryOnce({
                settings: { $: { where: { settingKey: `user:${authUser.id}:lastOrgId` } } },
              })
              const lastOrgId = (orgIdResp.data as Record<string, any>)?.settings?.[0]?.value
              if (typeof lastOrgId === 'string' && lastOrgId) {
                console.info('[useInstantData] Skipping auto-create org: lastOrgId is set, waiting for subscription')
                return
              }
            } catch {
              /* non-fatal */
            }

            // Gate 3: Don't auto-create if user has memberships (invited to an existing org)
            try {
              const memberResp = await db.queryOnce({
                members: { $: { where: { userId: authUser.id } } },
              })
              const memberships = (memberResp.data as Record<string, any>)?.members || []
              if (memberships.length > 0) {
                console.info('[useInstantData] Skipping auto-create org: user has', memberships.length, 'membership(s)')
                return
              }
            } catch {
              /* non-fatal */
            }

            // Final re-check: orgs may have appeared during the async checks
            if ((organizations.value || []).length > 0) return

            isAutoCreatingOrg.value = true
            try {
              const id = crypto.randomUUID()
              const now = Date.now()
              await db.transact([
                tx.organizations[id].update({
                  ownerId: authUser.id,
                  name: 'My Workspace',
                  slug: 'my-workspace',
                  description: 'Default workspace',
                  status: 'active',
                  createdAt: now,
                  updatedAt: now,
                }),
              ])
              console.info('✓ Auto-created default organization')
            } catch (e) {
              console.error('Failed to auto-create default organization:', e)
            } finally {
              isAutoCreatingOrg.value = false
            }
          }, 2000)
        },
        { immediate: true },
      )

      // Auto-create a default app when an org exists but has no apps.
      // This avoids the "No active app" error without removing the appId-based data layer.
      // Only auto-create if the current user is the org OWNER — members should not create apps
      // in orgs they were invited to.
      const isAutoCreatingApp = useState<boolean>('instantData:isAutoCreatingApp', () => false)
      let appAutoCreateTimer: ReturnType<typeof setTimeout> | null = null
      watch(
        [currentOrg, applications, appsLoading, user],
        ([org, apps, loading, authUser]) => {
          if (appAutoCreateTimer) {
            clearTimeout(appAutoCreateTimer)
            appAutoCreateTimer = null
          }

          if (!org || loading || isAutoCreatingApp.value || !authUser?.id) return
          const orgApps = (apps || []).filter((a) => a.orgId === org.id)
          if (orgApps.length > 0) return

          // Only org owners should auto-create apps
          if ((org as Record<string, any>).ownerId !== authUser.id) {
            console.info('[useInstantData] Skipping auto-create app: user is not org owner')
            return
          }

          // Debounce: wait 1.5s for apps to arrive via subscription
          appAutoCreateTimer = setTimeout(async () => {
            const currentApps = (applications.value || []).filter(
              (a) => a.orgId === (currentOrg.value as Record<string, any>)?.id,
            )
            if (currentApps.length > 0 || isAutoCreatingApp.value) return

            isAutoCreatingApp.value = true
            try {
              const id = crypto.randomUUID()
              const now = Date.now()
              await db.transact([
                tx.applications[id].update({
                  ownerId: authUser.id,
                  orgId: org.id,
                  name: 'Workspace',
                  slug: 'workspace',
                  icon: 'lucide:layout-grid',
                  color: '#6366f1',
                  createdAt: now,
                  updatedAt: now,
                }),
              ])
            } catch (e) {
              console.error('Failed to auto-create default app:', e)
            } finally {
              isAutoCreatingApp.value = false
            }
          }, 1500)
        },
        { immediate: true },
      )

      watch(
        currentOrg,
        (org) => {
          if (!org) return
          safeSetStorageItem(STORAGE_LAST_ORG_ID, org.id)

          if (currentApp.value && currentApp.value.orgId !== org.id) {
            currentApp.value = applications.value.find((a) => a.orgId === org.id) || null
          }
        },
        { immediate: true },
      )

      watch(
        currentApp,
        (app) => {
          if (!app) return
          safeSetStorageItem(STORAGE_LAST_APP_ID, app.id)

          if (currentOrg.value && currentOrg.value.id !== app.orgId) {
            const orgForApp = organizations.value.find((o) => o.id === app.orgId) || null
            if (orgForApp) currentOrg.value = orgForApp
          }
        },
        { immediate: true },
      )

      const upsertUserSetting = async (key: 'lastOrgId' | 'lastAppId', value: string) => {
        const authUser = user.value
        if (!authUser?.id) return

        const settingKey = `user:${authUser.id}:${key}`
        const resp = await db.queryOnce({
          settings: {
            $: {
              where: {
                settingKey,
              },
            },
          },
        })

        const existing = (resp.data as Record<string, any>)?.settings?.[0]
        const now = Date.now()

        if (existing?.id) {
          await db.transact([
            tx.settings[existing.id].update({
              ownerId: authUser.id,
              settingKey,
              entityType: 'user',
              entityId: authUser.id,
              key,
              value,
              updatedAt: now,
            }),
          ])
          return
        }

        const id = crypto.randomUUID()
        try {
          await db.transact([
            tx.settings[id].create({
              ownerId: authUser.id,
              settingKey,
              entityType: 'user',
              entityId: authUser.id,
              key,
              value,
              updatedAt: now,
            }),
          ])
        } catch (err) {
          const retryResp = await db.queryOnce({
            settings: {
              $: {
                where: {
                  settingKey,
                },
              },
            },
          })
          const retryExisting = (retryResp.data as Record<string, any>)?.settings?.[0]
          if (!retryExisting?.id) throw err
          await db.transact([
            tx.settings[retryExisting.id].update({
              ownerId: authUser.id,
              settingKey,
              entityType: 'user',
              entityId: authUser.id,
              key,
              value,
              updatedAt: now,
            }),
          ])
        }
      }

      let persistTimer: ReturnType<typeof setTimeout> | null = null
      let lastPersistedOrgId: string | null = null
      let lastPersistedAppId: string | null = null

      const schedulePersist = () => {
        if (persistTimer) clearTimeout(persistTimer)
        persistTimer = setTimeout(async () => {
          const orgId = currentOrg.value?.id || null
          const appId = currentApp.value?.id || null
          const authUserId = user.value?.id || null
          if (!authUserId) return

          const chunks: Promise<void>[] = []
          if (orgId && orgId !== lastPersistedOrgId) {
            lastPersistedOrgId = orgId
            chunks.push(upsertUserSetting('lastOrgId', orgId))
          }
          if (appId && appId !== lastPersistedAppId) {
            lastPersistedAppId = appId
            chunks.push(upsertUserSetting('lastAppId', appId))
          }

          if (chunks.length) {
            try {
              await Promise.all(chunks)
            } catch (e) {
              console.error('Failed to persist org/app selection:', e)
            }
          }
        }, 250)
      }

      watch([currentOrg, currentApp, user], schedulePersist, { immediate: true })
    }
  }

  // CRUD Operations using InstantDB transactions

  const createOrganization = async (data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user.value) throw new Error('User not authenticated')

    const id = crypto.randomUUID()
    const now = Date.now()

    await db.transact([
      tx.organizations[id].update({
        ...data,
        ownerId: user.value.id,
        createdAt: now,
        updatedAt: now,
      }),
    ])

    return id
  }

  const updateOrganization = async (id: string, data: Partial<Organization>) => {
    await db.transact([
      tx.organizations[id].update({
        ...data,
        updatedAt: Date.now(),
      }),
    ])
  }

  const deleteOrganization = async (id: string) => {
    await db.transact([tx.organizations[id].delete()])
  }

  const createApplication = async (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user.value) throw new Error('User not authenticated')

    const id = crypto.randomUUID()
    const now = Date.now()

    await db.transact([
      tx.applications[id].update({
        ...data,
        ownerId: user.value.id,
        createdAt: now,
        updatedAt: now,
      }),
    ])

    return id
  }

  const updateApplication = async (id: string, data: Partial<Application>) => {
    await db.transact([
      tx.applications[id].update({
        ...data,
        updatedAt: Date.now(),
      }),
    ])
  }

  const deleteApplication = async (id: string) => {
    await db.transact([tx.applications[id].delete()])
  }

  const createCollection = async (data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user.value) throw new Error('User not authenticated')

    const id = crypto.randomUUID()
    const now = Date.now()

    const ownerId = user.value.id

    const name = String((data as Record<string, any>).title || (data as Record<string, any>).name || 'Untitled')
    const description = String((data as Record<string, any>).description || '')

    const isDatabase = data.type === 'database'
    const seedSchema = isDatabase ? createSeedSchema(id) : null
    const initialContent = isDatabase
      ? import.meta.dev
        ? getSeededDatabaseContent({ id, name, description, ownerId, schema: seedSchema! })
        : _getDefaultJsonLdBoilerplate({ id, name, description })
      : undefined

    const txs: any[] = []
    txs.push(
      tx.collections[id].update({
        ...data,
        content: initialContent,
        ownerId,
        createdAt: now,
        updatedAt: now,
      }),
    )

    if (isDatabase) {
      const schemaSettingKey = `collection:${id}:schema`
      const projectionsSettingKey = `collection:${id}:projections`

      const schemaSettingId = crypto.randomUUID()
      const projectionsSettingId = crypto.randomUUID()

      txs.push(
        tx.settings[schemaSettingId].create({
          ownerId,
          settingKey: schemaSettingKey,
          entityType: 'collection',
          entityId: id,
          key: 'schema',
          value: seedSchema,
          updatedAt: now,
        }),
      )

      txs.push(
        tx.settings[projectionsSettingId].create({
          ownerId,
          settingKey: projectionsSettingKey,
          entityType: 'collection',
          entityId: id,
          key: 'projections',
          value: createDefaultProjections(id, 'database'),
          updatedAt: now,
        }),
      )
    }

    await db.transact(txs)

    return id
  }

  const updateCollection = async (id: string, data: Partial<Collection>) => {
    await db.transact([
      tx.collections[id].update({
        ...data,
        updatedAt: Date.now(),
      }),
    ])
  }

  const deleteCollection = async (id: string) => {
    await db.transact([tx.collections[id].delete()])
  }

  const upsertAppSetting = async (appId: string, key: string, value: any) => {
    const authUser = user.value
    if (!authUser?.id) throw new Error('User not authenticated')

    const settingKey = `app:${appId}:${key}`
    const resp = await db.queryOnce({
      settings: {
        $: {
          where: {
            settingKey,
          },
        },
      },
    })

    const existing = (resp.data as Record<string, any>)?.settings?.[0]
    const now = Date.now()

    if (existing?.id) {
      await db.transact([
        tx.settings[existing.id].update({
          ownerId: authUser.id,
          settingKey,
          entityType: 'app',
          entityId: appId,
          key,
          value,
          updatedAt: now,
        }),
      ])
      return
    }

    const id = crypto.randomUUID()
    await db.transact([
      tx.settings[id].create({
        ownerId: authUser.id,
        settingKey,
        entityType: 'app',
        entityId: appId,
        key,
        value,
        updatedAt: now,
      }),
    ])
  }

  const createCustomType = async (data: Omit<CustomType, 'id' | 'appId' | 'createdAt' | 'updatedAt'>) => {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const now = Date.now()
    const next: CustomType = {
      id: crypto.randomUUID(),
      appId,
      name: data.name,
      description: data.description,
      icon: data.icon,
      extends: data.extends,
      createdAt: now,
      updatedAt: now,
    }

    const items = (customTypes.value || []).slice()
    items.push(next)
    await upsertAppSetting(appId, 'customTypes', items)
    return next.id
  }

  const updateCustomType = async (id: string, patch: Partial<CustomType>) => {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const items = (customTypes.value || []).slice()
    const idx = items.findIndex((t) => t.id === id)
    if (idx === -1) return

    const prev = items[idx]!
    const next: CustomType = {
      ...prev,
      ...patch,
      id,
      appId,
      name: typeof patch.name === 'string' && patch.name ? patch.name : prev.name,
      createdAt: prev.createdAt,
      updatedAt: Date.now(),
    }
    items[idx] = next

    await upsertAppSetting(appId, 'customTypes', items)
  }

  const deleteCustomType = async (id: string) => {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const items = (customTypes.value || []).filter((t) => t.id !== id)
    await upsertAppSetting(appId, 'customTypes', items)
  }

  const createWorkflow = async (
    data: Pick<Workflow, 'name'> & Partial<Omit<Workflow, 'id' | 'appId' | 'createdAt' | 'updatedAt'>>,
  ) => {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const now = Date.now()
    const defaultGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'start-1',
          kind: 'start',
          position: { x: 250, y: 250 },
          label: 'Start',
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
    const next: Workflow = {
      id: crypto.randomUUID(),
      appId,
      name: String(data.name || 'Untitled Workflow'),
      description: data.description,
      icon: data.icon,
      trigger: data.trigger,
      active: typeof data.active === 'boolean' ? data.active : true,
      graph: data.graph || defaultGraph,
      createdAt: now,
      updatedAt: now,
    }

    const items = (workflows.value || []).slice()
    items.push(next)
    await upsertAppSetting(appId, 'workflows', JSON.parse(JSON.stringify(items)))
    return next.id
  }

  const updateWorkflow = async (id: string, patch: Partial<Workflow>) => {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const items = (workflows.value || []).slice()
    const idx = items.findIndex((w) => w.id === id)
    if (idx === -1) return

    const prev = items[idx]!
    const next: Workflow = {
      ...prev,
      ...patch,
      id,
      appId,
      name: typeof patch.name === 'string' && patch.name ? patch.name : prev.name,
      createdAt: prev.createdAt,
      updatedAt: Date.now(),
    }
    items[idx] = next

    await upsertAppSetting(appId, 'workflows', JSON.parse(JSON.stringify(items)))
  }

  const deleteWorkflow = async (id: string) => {
    const appId = currentApp.value?.id
    if (!appId) throw new Error('No application selected')

    const items = (workflows.value || []).filter((w) => w.id !== id)
    await upsertAppSetting(appId, 'workflows', JSON.parse(JSON.stringify(items)))
  }

  // Helper functions
  const getCollectionBySlug = (appId: string, slug: string) => {
    return collections.value.find((c) => c.appId === appId && c.slug === slug)
  }

  const getApplicationBySlug = (orgId: string, slug: string) => {
    return applications.value.find((a) => a.orgId === orgId && a.slug === slug)
  }

  return {
    // State
    currentOrg,
    currentApp,

    // Reactive data
    organizations,
    applications,
    collections,
    customTypes,
    workflows,

    // Loading states
    orgsLoading,
    appsLoading,
    collectionsLoading,
    customTypesLoading,
    workflowsLoading,

    // Errors
    orgsError,

    // Organization CRUD
    createOrganization,
    updateOrganization,
    deleteOrganization,

    // Application CRUD
    createApplication,
    updateApplication,
    deleteApplication,

    // Collection CRUD
    createCollection,
    updateCollection,
    deleteCollection,

    // Custom Types (app scoped)
    createCustomType,
    updateCustomType,
    deleteCustomType,

    // Workflows (app scoped)
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,

    // Settings
    upsertAppSetting,

    // Helpers
    getCollectionBySlug,
    getApplicationBySlug,
  }
}

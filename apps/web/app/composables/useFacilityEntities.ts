import type { DatabaseSchema } from '~/types/database'
import { buildSchemaFromType, getTypeNodeById } from '~/lib/appConfig'
import seedData from '~/data/ecmsSeedData.json'

/**
 * Entity type mapping: URL slug → JSON-LD type ID → seed data key
 */
const ENTITY_TYPE_MAP: Record<
  string,
  {
    typeId: string
    seedKey: keyof typeof seedData
    idField: string
    facilityField: string
  }
> = {
  task: {
    typeId: 'type:Task',
    seedKey: 'tasks',
    idField: 'taskID',
    facilityField: 'facilityID',
  },
  'task-generator': {
    typeId: 'type:TaskGenerator',
    seedKey: 'taskGenerators',
    idField: 'taskGeneratorID',
    facilityField: 'facilityID',
  },
  'task-template': {
    typeId: 'type:TaskTemplate',
    seedKey: 'taskTemplates',
    idField: 'taskTemplateID',
    facilityField: 'facilities', // array field
  },
  folder: {
    typeId: 'type:Folder',
    seedKey: 'folders',
    idField: 'folderID',
    facilityField: 'facilityID',
  },
  'external-task': {
    typeId: 'type:ExternalTask',
    seedKey: 'externalTasks',
    idField: 'externalTaskID',
    facilityField: 'facilityID',
  },
  user: {
    typeId: 'type:User',
    seedKey: 'users',
    idField: 'uid',
    facilityField: 'facilityID',
  },
  facility: {
    typeId: 'type:Facility',
    seedKey: 'facilities',
    idField: 'facilityID',
    facilityField: 'facilityID', // self-reference
  },
}

/**
 * Normalize ECMS task data to a consistent format for UI consumption
 * Matches the real ECMS Task interface from common/types/ecms.ts
 */
function normalizeTask(raw: any): any {
  const dueDate = raw.dueAt ? new Date(raw.dueAt) : null
  const now = new Date()
  const isOverdue = dueDate && dueDate < now && !raw.completedAt
  const isDueSoon = dueDate && !isOverdue && dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
  const isCompleted = !!raw.completedAt

  let status = 'on-track'
  if (isCompleted) status = 'completed'
  else if (isOverdue || raw.overdue) status = 'overdue'
  else if (isDueSoon) status = 'due-soon'

  // Derive priority from category and tracked status
  const highPriorityCategories = ['Emergency Preparedness', 'Fire Safety', 'Process Safety']
  const priority = highPriorityCategories.includes(raw.category)
    ? 'high'
    : raw.tracked
      ? 'medium'
      : 'low'

  return {
    // Core identifiers
    id: raw.taskID,
    taskTemplateID: raw.taskTemplateID,
    taskGeneratorID: raw.taskGeneratorID,
    facilityId: raw.facilityID,
    displayNumber: raw.displayNumber,

    // Content
    title: raw.title,
    description: raw.description,
    notes: raw.notes || '',

    // Classification
    category: raw.category,
    inspectionType: raw.inspectionType,
    branches: raw.branches || [],
    standardTaskIds: raw.standardTaskIds || [],

    // Derived UI fields
    status,
    priority,

    // Ownership & involvement
    owner: raw.owner,
    ownerConfigured: raw.ownerConfigured,
    involved: raw.involved || [],
    involvedConfigured: raw.involvedConfigured || [],
    assignee: raw.owner, // Alias for table display

    // Dates
    dueDate: raw.dueAt,
    dueAt: raw.dueAt,
    dueAtTime: raw.dueAtTime,
    dueAtOrig: raw.dueAtOrig,
    completedAt: raw.completedAt,
    completedBy: raw.completedBy,
    createdAt: raw.createdAt,
    createdBy: raw.createdBy,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,

    // Activity & comments
    comments: raw.comments || [],
    commentCount: (raw.comments || []).length,

    // Files & folders
    files: raw.files || [],
    parentFolderIDs: raw.parentFolderIDs || [],
    fileCount: (raw.files || []).length,

    // Status flags
    tracked: raw.tracked,
    overdue: raw.overdue || isOverdue,
    taskNeedsCorrectiveAction: raw.taskNeedsCorrectiveAction || false,

    // Custom fields
    customFieldDefinitions: raw.customFieldDefinitions || [],
    customFieldValues: raw.customFieldValues || {},

    // Preserve original data for detail views
    _raw: raw,
  }
}

/**
 * Normalize entity data based on type
 */
function normalizeEntity(entityType: string, raw: any): any {
  switch (entityType) {
    case 'task':
      return normalizeTask(raw)
    case 'folder':
      return {
        id: raw.folderID,
        name: raw.name,
        facilityId: raw.facilityID,
        parentFolderIds: raw.parentFolderIDs || [],
        isSystemGenerated: raw.isSystemGenerated,
        _raw: raw,
      }
    case 'task-generator':
      return {
        id: raw.taskGeneratorID,
        title: raw.title,
        description: raw.description,
        facilityId: raw.facilityID,
        schedule: raw.schedule,
        category: raw.category,
        owner: raw.owner,
        _raw: raw,
      }
    case 'external-task':
      return {
        id: raw.externalTaskID,
        title: raw.title,
        description: raw.description,
        type: raw.type,
        facilityId: raw.facilityID,
        dueDate: raw.data?.dueAt,
        _raw: raw,
      }
    case 'user':
      return {
        id: raw.uid,
        email: raw.email,
        firstName: raw.first_name,
        lastName: raw.last_name,
        name: `${raw.first_name} ${raw.last_name}`,
        jobTitle: raw.jobTitle,
        facilityId: raw.facilityID,
        branches: raw.branches,
        _raw: raw,
      }
    case 'facility':
      return {
        id: raw.facilityID,
        name: raw.facility,
        abbr: raw.abbr,
        group: raw.group,
        address: raw.address,
        city: raw.city,
        state: raw.state,
        _raw: raw,
      }
    default:
      return { id: raw.id || raw[Object.keys(raw).find((k) => k.endsWith('ID')) || 'id'], ...raw }
  }
}

export interface UseFacilityEntitiesOptions {
  facilityId?: string | null
  entityType: string
  filter?: (item: any) => boolean
}

export interface UseFacilityEntitiesReturn<T = any> {
  items: Ref<T[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  schema: ComputedRef<DatabaseSchema | null>
  typeNode: ComputedRef<any | null>

  // Stats
  stats: ComputedRef<{
    total: number
    overdue?: number
    dueSoon?: number
    completed?: number
  }>

  // CRUD operations
  create: (data: Partial<T>) => Promise<string>
  update: (id: string, data: Partial<T>) => Promise<void>
  remove: (id: string) => Promise<void>

  // Helpers
  refresh: () => Promise<void>
  getById: (id: string) => T | undefined
}

/**
 * Composable for fetching facility-scoped entity data
 *
 * Bridges JSON-LD schema definitions with actual data retrieval.
 * Currently uses seed data; will integrate with InstantDB in Phase 2.
 */
export function useFacilityEntities<T = any>(options: UseFacilityEntitiesOptions): UseFacilityEntitiesReturn<T> {
  const { facilityId, entityType, filter } = options

  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(true)
  const error = ref<string | null>(null)

  // Get type configuration
  const entityConfig = computed(() => ENTITY_TYPE_MAP[entityType] || null)

  // Get JSON-LD type node for metadata
  const typeNode = computed(() => {
    if (!entityConfig.value) return null
    return getTypeNodeById(entityConfig.value.typeId)
  })

  // Build schema from JSON-LD type definition
  const schema = computed<DatabaseSchema | null>(() => {
    if (!entityConfig.value) return null
    return buildSchemaFromType(entityConfig.value.typeId)
  })

  // Load data from seed (will be replaced with InstantDB query)
  const loadData = async () => {
    loading.value = true
    error.value = null

    try {
      const config = entityConfig.value
      if (!config) {
        error.value = `Unknown entity type: ${entityType}`
        items.value = []
        return
      }

      // Get raw data from seed
      const rawData = (seedData as any)[config.seedKey] as any[]
      if (!Array.isArray(rawData)) {
        items.value = []
        return
      }

      // Filter by facility if provided
      // Note: In development, if no matching facility data found, show all data
      let filtered = rawData
      if (facilityId && config.facilityField) {
        const facilityFiltered = rawData.filter((item) => {
          const fieldValue = item[config.facilityField]
          // Handle array fields (like taskTemplates.facilities)
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(facilityId)
          }
          return fieldValue === facilityId
        })
        // If we found matching data, use it; otherwise show all (dev mode fallback)
        if (facilityFiltered.length > 0) {
          filtered = facilityFiltered
        }
        // else: keep all rawData for development purposes
      }

      // Apply custom filter if provided
      if (filter) {
        filtered = filtered.filter(filter)
      }

      // Normalize and set items
      items.value = filtered.map((raw) => normalizeEntity(entityType, raw)) as T[]
    } catch (e) {
      console.error(`[useFacilityEntities] Failed to load ${entityType}:`, e)
      error.value = e instanceof Error ? e.message : 'Failed to load data'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  // Compute stats based on entity type
  const stats = computed(() => {
    const total = items.value.length

    if (entityType === 'task') {
      const tasks = items.value as any[]
      return {
        total,
        overdue: tasks.filter((t) => t.status === 'overdue').length,
        dueSoon: tasks.filter((t) => t.status === 'due-soon').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
      }
    }

    return { total }
  })

  // CRUD operations (stubbed for now - will integrate with InstantDB)
  const create = async (data: Partial<T>): Promise<string> => {
    const id = crypto.randomUUID()
    const newItem = { id, ...data } as unknown as T
    items.value = [...items.value, newItem]
    // TODO: Persist to InstantDB
    return id
  }

  const update = async (id: string, data: Partial<T>): Promise<void> => {
    const index = items.value.findIndex((item: any) => item.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...data } as T
      items.value = [...items.value] // Trigger reactivity
    }
    // TODO: Persist to InstantDB
  }

  const remove = async (id: string): Promise<void> => {
    items.value = items.value.filter((item: any) => item.id !== id)
    // TODO: Persist to InstantDB
  }

  const getById = (id: string): T | undefined => {
    return items.value.find((item: any) => item.id === id)
  }

  const refresh = async () => {
    await loadData()
  }

  // Initial load
  if (import.meta.client) {
    loadData()
  }

  // Reload when facility changes
  watch(
    () => facilityId,
    () => {
      loadData()
    },
  )

  return {
    items,
    loading,
    error,
    schema,
    typeNode,
    stats,
    create,
    update,
    remove,
    refresh,
    getById,
  }
}

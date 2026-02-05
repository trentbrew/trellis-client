import type { Collection, DatabaseField, DatabaseSchema } from '~/types/database'
import { TrellisDocumentSchema, createDefaultTrellisContext, isTrellisDocument } from '~/lib/trellis'

const slugify = (input: string) => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const nowIso = () => new Date().toISOString()

const getCollectionSchemaSettingKey = (collectionId: string) => `collection:${collectionId}:schema`

const mapFieldTypeToValueType = (type: DatabaseField['type']): string => {
  switch (type) {
    case 'text':
      return 'rich_text'
    case 'number':
      return 'number'
    case 'select':
      return 'select'
    case 'multiselect':
      return 'multi_select'
    case 'date':
      return 'date'
    case 'checkbox':
      return 'checkbox'
    case 'url':
      return 'url'
    case 'email':
      return 'email'
    case 'file':
      return 'files'
    case 'relation':
      return 'relation'
    case 'formula':
      return 'formula'
    default:
      return 'rich_text'
  }
}

const toTrellisSchema = (schema: DatabaseSchema, collection: Collection) => {
  return {
    '@id': `trellis:schema/${collection.id}`,
    '@type': 'trellis:PropertyValueSpecification',

    name: `${collection.title} Schema`,
    version: '1.0.0',
    description: collection.description || '',

    fields: (schema.fields || [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((f) => {
        const valueType = mapFieldTypeToValueType(f.type)

        const base: any = {
          '@id': `trellis:field/${collection.id}/${f.id}`,
          '@type': 'trellis:PropertyValue',
          name: f.id,
          valueType,
          required: !!f.required,
          description: f.name,
        }

        if ((valueType === 'select' || valueType === 'multi_select') && Array.isArray(f.options)) {
          base.selectOptions = f.options.map((o) => ({ name: o.value, color: o.color }))
        }

        if (valueType === 'formula' && typeof f.formula === 'string') {
          base.formula = f.formula
          if (typeof f.formulaReturnType === 'string') {
            base.formulaReturnType = f.formulaReturnType
          }
        }

        return base
      }),
  }
}

const extractLegacyItemsFromCollectionContent = (content: string | undefined): any[] => {
  if (!content) return []

  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    return []
  }

  if (Array.isArray(parsed)) return parsed

  if (parsed && typeof parsed === 'object') {
    const graph = (parsed as any).graph
    if (graph && typeof graph === 'object' && !Array.isArray(graph)) {
      const nestedCandidates = ['nodes', 'records', 'items', 'data', '@graph']
      for (const k of nestedCandidates) {
        if (Array.isArray((graph as any)[k])) return (graph as any)[k]
      }
    }

    const candidates = ['@graph', 'records', 'items', 'data', 'nodes']
    for (const k of candidates) {
      if (Array.isArray(parsed[k])) return parsed[k]
    }
  }

  return []
}

const makeTrellisNodeFromLegacy = (item: any, fallbackIndex: number) => {
  const obj = item && typeof item === 'object' && !Array.isArray(item) ? item : {}

  const idCandidate = typeof obj['@id'] === 'string' && obj['@id'] ? obj['@id'] : ''
  const typeCandidate = typeof obj['@type'] === 'string' && obj['@type'] ? obj['@type'] : ''

  const titleCandidate =
    (typeof obj['trellis:title'] === 'string' && obj['trellis:title']) ||
    (typeof obj['name'] === 'string' && obj['name']) ||
    (typeof obj['title'] === 'string' && obj['title']) ||
    (typeof obj['identifier'] === 'string' && obj['identifier']) ||
    idCandidate ||
    `Record ${fallbackIndex + 1}`

  const descriptionCandidate =
    (typeof obj['trellis:description'] === 'string' && obj['trellis:description']) ||
    (typeof obj['description'] === 'string' && obj['description']) ||
    ''

  const nodeId = idCandidate || `trellis:record/${crypto.randomUUID()}`
  const nodeType = typeCandidate || 'trellis:Record'

  const required = {
    '@id': nodeId,
    '@type': nodeType,
    'trellis:title': String(titleCandidate).slice(0, 280),
    'trellis:description': String(descriptionCandidate).slice(0, 1000),
    'trellis:content': {
      '@type': 'trellis:Document',
      blocks: [],
    },
    'trellis:metadata': {
      createdTime: nowIso(),
      createdBy: { '@id': 'system:import' },
      lastEditedTime: nowIso(),
      lastEditedBy: { '@id': 'system:import' },
    },
  }

  const out: any = { ...obj, ...required }
  return out
}

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  if (!import.meta.client) return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const useTrellisAdapter = () => {
  const instant = useInstantDb()
  const tx = instant.tx as any
  const { currentApp, createCollection, updateCollection, collections } = useInstantData()

  const getAuthUserId = async () => {
    const authUser = await instant.getAuth()
    return authUser?.id || 'system'
  }

  const loadCollectionSchema = async (collectionId: string): Promise<DatabaseSchema | null> => {
    const settingKey = getCollectionSchemaSettingKey(collectionId)

    const resp = await instant.queryOnce({
      settings: {
        $: {
          where: {
            settingKey,
          },
        },
      },
    })

    let settingData = (resp.data as any)?.settings?.[0]

    if (!settingData?.id) {
      const fallbackResp = await instant.queryOnce({
        settings: {
          $: {
            where: {
              entityType: 'collection',
              entityId: collectionId,
              key: 'schema',
            },
          },
        },
      })
      settingData = (fallbackResp.data as any)?.settings?.[0]
    }

    const value = settingData?.value
    if (!value) return null
    return value as DatabaseSchema
  }

  const upsertSetting = async (settingKey: string, entityId: string, key: string, value: any) => {
    const now = Date.now()
    const ownerId = await getAuthUserId()

    const resp = await instant.queryOnce({
      settings: {
        $: {
          where: {
            settingKey,
          },
        },
      },
    })

    const existing = (resp.data as any)?.settings?.[0]

    if (existing?.id) {
      await instant.transact([
        tx.settings[existing.id].update({
          ownerId,
          settingKey,
          entityType: 'collection',
          entityId,
          key,
          value,
          updatedAt: now,
        }),
      ])
      return existing.id as string
    }

    const id = crypto.randomUUID()
    await instant.transact([
      tx.settings[id].create({
        ownerId,
        settingKey,
        entityType: 'collection',
        entityId,
        key,
        value,
        updatedAt: now,
      }),
    ])
    return id
  }

  const exportCollectionToTrellis = async (collection: Collection) => {
    const schema = await loadCollectionSchema(collection.id)
    const legacyItems = extractLegacyItemsFromCollectionContent(collection.content)

    const schemaNode = schema ? toTrellisSchema(schema, collection) : null

    const trellisItems = legacyItems.map((item, i) => makeTrellisNodeFromLegacy(item, i))

    const collectionNode: any = {
      '@id': `trellis:collection/${collection.id}`,
      '@type': 'trellis:Collection',
      name: collection.title,
      schema: schemaNode ? { '@id': schemaNode['@id'] } : undefined,
      views: schema?.views ? schema.views : undefined,
      projections: undefined,
      items: trellisItems.map((n: any) => ({ '@id': n['@id'] })),
    }

    const graph: any[] = []
    if (schemaNode) graph.push(schemaNode)
    graph.push(collectionNode)
    graph.push(...trellisItems)

    const doc = {
      '@context': createDefaultTrellisContext(),
      '@graph': graph,
    }

    return TrellisDocumentSchema.parse(doc)
  }

  const downloadCollectionAsTrellis = async (collection: Collection) => {
    const doc = await exportCollectionToTrellis(collection)
    const filename = `${slugify(collection.title || 'collection')}.trellis`
    downloadTextFile(filename, JSON.stringify(doc, null, 2), 'application/vnd.trellis+json')
    return doc
  }

  const importTrellis = async (raw: unknown, overrides?: { title?: string }) => {
    const parsed = TrellisDocumentSchema.parse(raw)

    if (!currentApp.value) {
      throw new Error('No active app')
    }

    if (!isTrellisDocument(parsed)) {
      throw new Error('Invalid Trellis document')
    }

    const rawGraph = (parsed as any)['@graph']
    const graphObj = (parsed as any).graph

    if (!Array.isArray(rawGraph) && graphObj && typeof graphObj === 'object' && !Array.isArray(graphObj)) {
      const title =
        overrides?.title ||
        String((graphObj as any)['trellis:title'] ?? (graphObj as any).name ?? (graphObj as any).title ?? 'Imported')

      const slugBase = slugify(title) || `imported-${Date.now()}`
      const slug = collections.value.some((c) => c.slug === slugBase) ? `${slugBase}-${Date.now()}` : slugBase

      const collectionId = await createCollection({
        appId: currentApp.value.id,
        title,
        description: '',
        icon: 'lucide:database',
        type: 'database',
        slug,
        order: collections.value.length,
        isPublished: false,
        createdBy: 'current-user',
      })

      const content = JSON.stringify(parsed, null, 2)
      await updateCollection(collectionId, { content })
      return collectionId
    }

    const graph = rawGraph
    const collectionNode = Array.isArray(graph)
      ? graph.find((n: any) => n && typeof n === 'object' && n['@type'] === 'trellis:Collection')
      : null

    const schemaRef = collectionNode?.schema?.['@id']
    const schemaNode = schemaRef ? graph.find((n: any) => n && typeof n === 'object' && n['@id'] === schemaRef) : null

    const itemRefs: string[] = Array.isArray(collectionNode?.items)
      ? collectionNode.items.map((x: any) => (x && typeof x === 'object' ? x['@id'] : '')).filter(Boolean)
      : []

    const itemNodes = itemRefs.length
      ? graph.filter((n: any) => n && typeof n === 'object' && itemRefs.includes(n['@id']))
      : []

    const title = overrides?.title || collectionNode?.name || 'Imported'

    const slugBase = slugify(title) || `imported-${Date.now()}`
    const slug = collections.value.some((c) => c.slug === slugBase) ? `${slugBase}-${Date.now()}` : slugBase

    const collectionId = await createCollection({
      appId: currentApp.value.id,
      title,
      description: '',
      icon: 'lucide:database',
      type: 'database',
      slug,
      order: collections.value.length,
      isPublished: false,
      createdBy: 'current-user',
    })

    if (schemaNode) {
      const dbSchema: DatabaseSchema = {
        id: '',
        collectionId,
        fields: Array.isArray(schemaNode.fields)
          ? schemaNode.fields.map((f: any, i: number) => {
              const valueType = typeof f.valueType === 'string' ? f.valueType : 'rich_text'
              const type =
                valueType === 'number'
                  ? 'number'
                  : valueType === 'select'
                    ? 'select'
                    : valueType === 'multi_select'
                      ? 'multiselect'
                      : valueType === 'date'
                        ? 'date'
                        : valueType === 'checkbox'
                          ? 'checkbox'
                          : valueType === 'url'
                            ? 'url'
                            : valueType === 'email'
                              ? 'email'
                              : valueType === 'files'
                                ? 'file'
                                : valueType === 'relation'
                                  ? 'relation'
                                  : valueType === 'formula'
                                    ? 'formula'
                                    : 'text'

              const options = Array.isArray(f.selectOptions)
                ? f.selectOptions
                    .filter((o: any) => o && typeof o === 'object')
                    .map((o: any) => ({ value: String(o.name || ''), color: String(o.color || '') }))
                    .filter((o: any) => o.value)
                : undefined

              return {
                id: typeof f.name === 'string' ? f.name : `field_${i}`,
                name:
                  typeof f.description === 'string'
                    ? f.description
                    : typeof f.name === 'string'
                      ? f.name
                      : `Field ${i + 1}`,
                type,
                options,
                config: undefined,
                required: !!f.required,
                order: i,
                formula: typeof f.formula === 'string' ? f.formula : undefined,
                formulaReturnType: typeof f.formulaReturnType === 'string' ? f.formulaReturnType : undefined,
              }
            })
          : [],
        views: Array.isArray(collectionNode?.views) ? collectionNode.views : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await upsertSetting(getCollectionSchemaSettingKey(collectionId), collectionId, 'schema', dbSchema)
    }

    const content = JSON.stringify({ '@graph': itemNodes }, null, 2)
    await updateCollection(collectionId, { content })

    return collectionId
  }

  return {
    exportCollectionToTrellis,
    downloadCollectionAsTrellis,
    importTrellis,
  }
}

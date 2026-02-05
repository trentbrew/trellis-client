import type { DatabaseField } from '~/types/database'
import { normalizeDatabaseSchema } from '~/lib/normalizeDatabaseSchema'

/**
 * Graph edge interface for traversal functions
 * Compatible with JSON-LD edge schema
 */
export interface GraphEdge {
  '@id'?: string
  source: string
  target: string
  relation: string
  properties?: Record<string, unknown>
}

/**
 * Formula evaluation engine for collection records
 * Evaluates formula fields client-side with reactive updates
 */
export const useCollectionFormulas = (collectionId: string) => {
  const instant = useInstantDb()

  const isValidIdentifier = (key: string) => {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
  }

  const normalizeValueForFormula = (value: any, fieldType?: DatabaseField['type']) => {
    if (!Array.isArray(value)) return value

    // Preserve true array-valued fields.
    if (fieldType === 'multiselect' || fieldType === 'file') return value

    // JSON-LD often represents scalar values as a single-item array.
    if (value.length === 0) return undefined
    if (value.length === 1) return value[0]
    return value
  }

  const toIdentifier = (label: string) => {
    const raw = String(label || '').trim()
    if (!raw) return ''
    const parts = raw.split(/[^A-Za-z0-9]+/g).filter(Boolean)
    if (!parts.length) return ''

    const first = parts[0]!
    const rest = parts.slice(1)
    const camel =
      first.slice(0, 1).toLowerCase() +
      first.slice(1) +
      rest.map((p) => p.slice(0, 1).toUpperCase() + p.slice(1)).join('')

    return isValidIdentifier(camel) ? camel : ''
  }

  const normalizeRecordForSchema = (record: any, schema: any) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return record
    if (!schema || typeof schema !== 'object' || !Array.isArray((schema as any).fields)) return record

    const out: Record<string, any> = { ...(record as any) }
    for (const f of (schema as any).fields as DatabaseField[]) {
      const alias = typeof f.name === 'string' ? toIdentifier(f.name) : ''
      const keys = [f.id, f.name, alias].filter((k) => typeof k === 'string' && k)
      for (const k of keys) {
        if (!(k in out)) continue
        out[k] = normalizeValueForFormula(out[k], f.type)
      }

      // Add JS-friendly aliases so formulas can reference fields by a stable identifier
      // derived from their display name (e.g. "Due date" -> dueDate, "Status" -> status).
      if (alias) {
        const sourceKey = f.id in out ? f.id : f.name in out ? f.name : alias in out ? alias : ''
        if (sourceKey) out[alias] = normalizeValueForFormula(out[sourceKey], f.type)
      }
    }
    return out
  }

  /**
   * Get the @id of a record, handling various formats
   */
  const getNodeId = (node: any): string | null => {
    if (!node) return null
    if (typeof node === 'string') return node
    return node['@id'] || node.id || null
  }

  /**
   * Create execution context for formula evaluation
   * Provides record data + helper functions + graph traversal
   */
  const createContext = (
    record: any,
    allRecords: any[],
    schema: any,
    edges: GraphEdge[] = [],
  ) => {
    // Build lookup maps for efficient graph traversal
    const nodeMap = new Map<string, any>()
    for (const r of allRecords) {
      const id = getNodeId(r)
      if (id) nodeMap.set(id, r)
    }

    // Index edges by source and target for fast lookups
    const edgesBySource = new Map<string, GraphEdge[]>()
    const edgesByTarget = new Map<string, GraphEdge[]>()
    for (const edge of edges) {
      // By source
      if (!edgesBySource.has(edge.source)) {
        edgesBySource.set(edge.source, [])
      }
      edgesBySource.get(edge.source)!.push(edge)
      // By target
      if (!edgesByTarget.has(edge.target)) {
        edgesByTarget.set(edge.target, [])
      }
      edgesByTarget.get(edge.target)!.push(edge)
    }

    /**
     * $related - Get nodes related to a given node via edges
     * @param nodeOrId - The node or node ID to find relations for
     * @param relationType - Optional filter by relation type
     * @param direction - 'outgoing' (default), 'incoming', or 'both'
     */
    const $related = (
      nodeOrId: any,
      relationType?: string,
      direction: 'outgoing' | 'incoming' | 'both' = 'both',
    ): any[] => {
      const nodeId = getNodeId(nodeOrId) || getNodeId(record)
      if (!nodeId) return []

      const related: any[] = []
      const seenIds = new Set<string>()

      // Outgoing edges (this node is source)
      if (direction === 'outgoing' || direction === 'both') {
        const outgoing = edgesBySource.get(nodeId) || []
        for (const edge of outgoing) {
          if (relationType && edge.relation !== relationType) continue
          const targetNode = nodeMap.get(edge.target)
          if (targetNode && !seenIds.has(edge.target)) {
            seenIds.add(edge.target)
            related.push(targetNode)
          }
        }
      }

      // Incoming edges (this node is target)
      if (direction === 'incoming' || direction === 'both') {
        const incoming = edgesByTarget.get(nodeId) || []
        for (const edge of incoming) {
          if (relationType && edge.relation !== relationType) continue
          const sourceNode = nodeMap.get(edge.source)
          if (sourceNode && !seenIds.has(edge.source)) {
            seenIds.add(edge.source)
            related.push(sourceNode)
          }
        }
      }

      return related
    }

    /**
     * $ancestors - Get ancestor nodes (following incoming edges recursively)
     * @param nodeOrId - The node or node ID to find ancestors for
     * @param depth - Maximum depth to traverse (default: Infinity)
     * @param relationType - Optional filter by relation type
     */
    const $ancestors = (
      nodeOrId: any,
      depth: number = Infinity,
      relationType?: string,
    ): any[] => {
      const nodeId = getNodeId(nodeOrId) || getNodeId(record)
      if (!nodeId) return []

      const ancestors: any[] = []
      const visited = new Set<string>([nodeId])
      const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }]

      while (queue.length > 0) {
        const { id, level } = queue.shift()!
        if (level >= depth) continue

        const incoming = edgesByTarget.get(id) || []
        for (const edge of incoming) {
          if (relationType && edge.relation !== relationType) continue
          if (visited.has(edge.source)) continue

          visited.add(edge.source)
          const sourceNode = nodeMap.get(edge.source)
          if (sourceNode) {
            ancestors.push(sourceNode)
            queue.push({ id: edge.source, level: level + 1 })
          }
        }
      }

      return ancestors
    }

    /**
     * $descendants - Get descendant nodes (following outgoing edges recursively)
     * @param nodeOrId - The node or node ID to find descendants for
     * @param depth - Maximum depth to traverse (default: Infinity)
     * @param relationType - Optional filter by relation type
     */
    const $descendants = (
      nodeOrId: any,
      depth: number = Infinity,
      relationType?: string,
    ): any[] => {
      const nodeId = getNodeId(nodeOrId) || getNodeId(record)
      if (!nodeId) return []

      const descendants: any[] = []
      const visited = new Set<string>([nodeId])
      const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }]

      while (queue.length > 0) {
        const { id, level } = queue.shift()!
        if (level >= depth) continue

        const outgoing = edgesBySource.get(id) || []
        for (const edge of outgoing) {
          if (relationType && edge.relation !== relationType) continue
          if (visited.has(edge.target)) continue

          visited.add(edge.target)
          const targetNode = nodeMap.get(edge.target)
          if (targetNode) {
            descendants.push(targetNode)
            queue.push({ id: edge.target, level: level + 1 })
          }
        }
      }

      return descendants
    }

    /**
     * $path - Check if a path exists between two nodes
     * @param fromNodeOrId - Start node or ID
     * @param toNodeOrId - End node or ID
     * @param relationType - Optional filter by relation type
     */
    const $path = (
      fromNodeOrId: any,
      toNodeOrId: any,
      relationType?: string,
    ): boolean => {
      const fromId = getNodeId(fromNodeOrId)
      const toId = getNodeId(toNodeOrId)
      if (!fromId || !toId) return false
      if (fromId === toId) return true

      const visited = new Set<string>([fromId])
      const queue = [fromId]

      while (queue.length > 0) {
        const currentId = queue.shift()!
        const outgoing = edgesBySource.get(currentId) || []

        for (const edge of outgoing) {
          if (relationType && edge.relation !== relationType) continue
          if (edge.target === toId) return true
          if (!visited.has(edge.target)) {
            visited.add(edge.target)
            queue.push(edge.target)
          }
        }
      }

      return false
    }

    /**
     * $siblings - Get nodes that share the same parent(s)
     * @param nodeOrId - The node or node ID
     * @param relationType - Optional filter by relation type
     */
    const $siblings = (nodeOrId: any, relationType?: string): any[] => {
      const nodeId = getNodeId(nodeOrId) || getNodeId(record)
      if (!nodeId) return []

      // Find parents
      const parents = $ancestors(nodeOrId, 1, relationType)
      if (parents.length === 0) return []

      // Find all children of parents (excluding self)
      const siblings: any[] = []
      const seenIds = new Set<string>([nodeId])

      for (const parent of parents) {
        const parentId = getNodeId(parent)
        if (!parentId) continue

        const children = $descendants(parent, 1, relationType)
        for (const child of children) {
          const childId = getNodeId(child)
          if (childId && !seenIds.has(childId)) {
            seenIds.add(childId)
            siblings.push(child)
          }
        }
      }

      return siblings
    }

    /**
     * $edges - Get edges for a node
     * @param nodeOrId - The node or ID
     * @param direction - 'outgoing', 'incoming', or 'both'
     */
    const $edges = (
      nodeOrId: any,
      direction: 'outgoing' | 'incoming' | 'both' = 'both',
    ): GraphEdge[] => {
      const nodeId = getNodeId(nodeOrId) || getNodeId(record)
      if (!nodeId) return []

      const result: GraphEdge[] = []
      if (direction === 'outgoing' || direction === 'both') {
        result.push(...(edgesBySource.get(nodeId) || []))
      }
      if (direction === 'incoming' || direction === 'both') {
        result.push(...(edgesByTarget.get(nodeId) || []))
      }
      return result
    }

    return {
      // Current record fields
      ...record,

      // Collection-wide data
      $records: allRecords,
      $schema: schema,
      $edges: edges,

      // Graph traversal functions
      $related,
      $ancestors,
      $descendants,
      $path,
      $siblings,
      $nodeEdges: $edges,

      // Helper functions - Array operations
      $sum: (...values: number[]) => values.reduce((a, b) => a + b, 0),
      $avg: (...values: number[]) => {
        const nums = values.filter((v) => typeof v === 'number')
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
      },
      $min: (...values: number[]) => Math.min(...values.filter((v) => typeof v === 'number')),
      $max: (...values: number[]) => Math.max(...values.filter((v) => typeof v === 'number')),
      $count: (items: any[]) => (Array.isArray(items) ? items.length : 0),

      // Helper functions - String operations
      $concat: (...strings: any[]) => strings.join(''),
      $upper: (str: string) => String(str).toUpperCase(),
      $lower: (str: string) => String(str).toLowerCase(),
      $trim: (str: string) => String(str).trim(),

      // Helper functions - Formatting
      $currency: (val: number, currency = 'USD') => {
        if (typeof val !== 'number') return val
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(val)
      },
      $percent: (val: number, decimals = 2) => {
        if (typeof val !== 'number') return val
        return `${(val * 100).toFixed(decimals)}%`
      },
      $date: (val: any, format = 'short') => {
        const date = val instanceof Date ? val : new Date(val)
        return date.toLocaleDateString('en-US', {
          dateStyle: format as any,
        })
      },

      // Helper functions - Collection queries
      $filter: (predicate: (r: any) => boolean) => allRecords.filter(predicate),
      $find: (predicate: (r: any) => boolean) => allRecords.find(predicate),
      $map: (arr: any[], fn: (item: any) => any) => (Array.isArray(arr) ? arr.map(fn) : []),
      $reduce: (arr: any[], fn: (acc: any, item: any) => any, initial: any) =>
        Array.isArray(arr) ? arr.reduce(fn, initial) : initial,

      // Helper functions - Conditional
      $if: (condition: boolean, trueVal: any, falseVal: any) => (condition ? trueVal : falseVal),
      $switch: (value: any, cases: Record<string, any>, defaultVal?: any) =>
        cases[value] !== undefined ? cases[value] : defaultVal,

      // Helper functions - Math
      $round: (val: number, decimals = 0) => {
        if (typeof val !== 'number') return val
        const multiplier = Math.pow(10, decimals)
        return Math.round(val * multiplier) / multiplier
      },
      $floor: (val: number) => (typeof val === 'number' ? Math.floor(val) : val),
      $ceil: (val: number) => (typeof val === 'number' ? Math.ceil(val) : val),
      $abs: (val: number) => (typeof val === 'number' ? Math.abs(val) : val),
    }
  }

  /**
   * Safely evaluate a formula expression
   * Returns null on error to avoid breaking the UI
   * @param field - The formula field to evaluate
   * @param record - The current record
   * @param allRecords - All records in the collection
   * @param schema - The collection schema
   * @param edges - Optional graph edges for traversal functions
   */
  const evaluateFormula = (
    field: DatabaseField,
    record: any,
    allRecords: any[],
    schema: any,
    edges: GraphEdge[] = [],
  ): any => {
    if (!field.formula) return null

    try {
      // Clean up the formula string
      let expr = field.formula.trim()

      // Handle @expr wrapper if present (JSON-LD style)
      if (expr.startsWith('"@expr"') || expr.startsWith("'@expr'")) {
        const match = expr.match(/["']@expr["']\s*:\s*["'](.+)["']/)
        if (match && match[1]) {
          expr = match[1]
        }
      } else if (expr.startsWith('@expr')) {
        expr = expr.replace(/^@expr\s*:\s*/, '').replace(/^["']|["']$/g, '')
      }

      const normalizedRecord = normalizeRecordForSchema(record, schema)

      // Create safe evaluation context with edges for graph traversal
      const rawContext = createContext(normalizedRecord, allRecords, schema, edges) as Record<string, any>
      const context: Record<string, any> = {
        ...rawContext,
        record: normalizedRecord,
        $field: (name: string) =>
          normalizedRecord && typeof normalizedRecord === 'object' ? (normalizedRecord as any)[name] : undefined,
      }

      const safeContext: Record<string, any> = Object.create(null)
      for (const [key, value] of Object.entries(context)) {
        if (!isValidIdentifier(key)) continue
        safeContext[key] = value
      }

      // Always expose a stable way to access the underlying record, even if it has
      // keys that are not valid JS identifiers (e.g. "Due date").
      safeContext.record = normalizedRecord
      safeContext.$field = context.$field

      const contextKeys = Object.keys(safeContext)
      const contextValues = contextKeys.map((k) => (safeContext as any)[k])

      // Create and execute function with context
      const fn = new Function(...contextKeys, `'use strict'; return (${expr})`)
      const result = fn(...contextValues)

      // Type coercion based on formulaReturnType
      if (field.formulaReturnType === 'number') {
        return typeof result === 'number' ? result : Number(result)
      } else if (field.formulaReturnType === 'boolean') {
        return Boolean(result)
      } else if (field.formulaReturnType === 'date') {
        return result instanceof Date ? result : new Date(result)
      }

      return result
    } catch (error) {
      console.error(`Formula evaluation error in field "${field.name}":`, error)
      if (import.meta.dev) {
        return `[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`
      }
      return null
    }
  }

  /**
   * Get schema from InstantDB settings
   */
  const getSchema = async () => {
    try {
      const settingKey = `collection:${collectionId}:schema`
      const result = await instant.queryOnce({
        settings: {
          $: {
            where: {
              settingKey,
            },
          },
        },
      })

      let setting = (result.data as any)?.settings?.[0]

      if (!setting?.id) {
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
        setting = (fallbackResp.data as any)?.settings?.[0]
      }

      const value = setting?.value
      if (!value) return null
      return normalizeDatabaseSchema(value, collectionId)
    } catch (error) {
      console.error('Failed to load schema:', error)
      return null
    }
  }

  /**
   * Get all records for this collection
   */
  const getRecords = async () => {
    try {
      // In a real implementation, you'd have a records entity
      // For now, return empty array as placeholder
      // TODO: Implement records storage in InstantDB schema
      return []
    } catch (error) {
      console.error('Failed to load records:', error)
      return []
    }
  }

  /**
   * Compute all formula fields for given records
   * @param records - Array of records to compute formulas for
   * @param schema - The collection schema with formula definitions
   * @param edges - Optional graph edges for graph traversal functions
   */
  const computeFormulas = (records: any[], schema: any, edges: GraphEdge[] = []) => {
    if (!schema?.fields) return records

    const formulaFields = schema.fields.filter((f: DatabaseField) => f.type === 'formula')
    if (!formulaFields.length) return records

    return records.map((record) => {
      const computed: Record<string, any> = {}

      formulaFields.forEach((field: DatabaseField) => {
        computed[field.name] = evaluateFormula(field, record, records, schema, edges)
      })

      return {
        ...record,
        ...computed,
      }
    })
  }

  /**
   * Reactive computed records with formulas evaluated
   */
  const recordsWithFormulas = ref<any[]>([])
  const isLoading = ref(true)
  const error = ref<Error | null>(null)

  /**
   * Load and compute formulas
   */
  const loadAndCompute = async () => {
    isLoading.value = true
    error.value = null

    try {
      const [schema, records] = await Promise.all([getSchema(), getRecords()])

      if (schema) {
        recordsWithFormulas.value = computeFormulas(records, schema)
      } else {
        recordsWithFormulas.value = records
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Unknown error')
      recordsWithFormulas.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Load on mount (client-side only)
  if (import.meta.client) {
    onMounted(loadAndCompute)
  }

  /**
   * Evaluate a single formula for testing/preview
   * @param formula - The formula expression to evaluate
   * @param sampleData - Sample record data (single record or record with context)
   * @param allRecords - Optional array of all records for collection queries
   * @param edges - Optional edges array for graph traversal testing
   */
  const evaluateSingleFormula = (
    formula: string,
    sampleData: any = {},
    allRecords?: any[],
    edges: GraphEdge[] = [],
  ) => {
    const tempField: DatabaseField = {
      id: 'temp',
      name: 'temp',
      type: 'formula',
      formula,
      required: false,
      order: 0,
    }

    // If allRecords not provided, wrap sampleData as the collection
    const records = allRecords || [sampleData]

    return evaluateFormula(tempField, sampleData, records, {}, edges)
  }

  return {
    // State
    recordsWithFormulas: readonly(recordsWithFormulas),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Methods
    loadAndCompute,
    evaluateSingleFormula,
    computeFormulas,
    evaluateFormula,
  }
}

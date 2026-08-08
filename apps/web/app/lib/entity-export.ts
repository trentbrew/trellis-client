import type { Entity, EntityType } from '~/types/entity'
import * as XLSX from 'xlsx'

export type ExportFormat = 'csv' | 'json' | 'jsonld' | 'xlsx'

export const CSV_SKIP_KEYS = new Set(['body', 'content'])

const PREFERRED_KEY_ORDER = ['title', 'type', 'id', 'startDate', 'updatedAt', 'description', 'category', 'tags']

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isScalarExportValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  const t = typeof value
  return t === 'string' || t === 'number' || t === 'boolean'
}

export function defaultEntityExportKeys(entities: Entity[]): string[] {
  const keys = new Set<string>()
  for (const entity of entities) {
    for (const [key, value] of Object.entries(entity as unknown as Record<string, unknown>)) {
      if (CSV_SKIP_KEYS.has(key)) continue
      if (isScalarExportValue(value) || Array.isArray(value)) keys.add(key)
    }
  }
  const ordered = PREFERRED_KEY_ORDER.filter((k) => keys.has(k))
  const rest = [...keys].filter((k) => !PREFERRED_KEY_ORDER.includes(k)).sort()
  return [...ordered, ...rest]
}

export function serializeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const str = JSON.stringify(value).replace(/"/g, '""')
    return `"${str}"`
  }
  const str = String(value).replace(/"/g, '""')
  return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
}

export function entitiesToExportRows(
  entities: Entity[],
  columnKeys?: string[],
): Record<string, unknown>[] {
  const keys = columnKeys ?? defaultEntityExportKeys(entities)
  return entities.map((entity) => {
    const record = entity as unknown as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of keys) {
      if (CSV_SKIP_KEYS.has(key)) continue
      const val = record[key]
      if (val === undefined) {
        out[key] = ''
        continue
      }
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        out[key] = JSON.stringify(val)
      } else if (Array.isArray(val)) {
        out[key] = JSON.stringify(val)
      } else {
        out[key] = val
      }
    }
    return out
  })
}

export function rowsToCsv(rows: Record<string, unknown>[], keys: string[]): string {
  const header = keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(',')
  const lines = rows.map((row) => keys.map((k) => serializeCsvCell(row[k])).join(','))
  return [header, ...lines].join('\n')
}

export interface ExportDataOptions {
  /** Base slug without extension, e.g. `browse-all` → `browse-all-export.csv` */
  filenameSlug: string
  /** When set, JSON-LD uses trellis:Collection + trellis:records shape */
  collectionId?: string
}

function exportFilename(slug: string, ext: string) {
  const safe = slug.replace(/[^a-zA-Z0-9-_]/g, '_')
  return `${safe}-export.${ext}`
}

export function exportData(
  rows: Record<string, unknown>[],
  keys: string[],
  format: ExportFormat,
  options: ExportDataOptions,
) {
  if (!rows.length) return

  switch (format) {
    case 'csv': {
      const csv = rowsToCsv(rows, keys)
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), exportFilename(options.filenameSlug, 'csv'))
      break
    }
    case 'json': {
      const json = JSON.stringify(rows, null, 2)
      downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), exportFilename(options.filenameSlug, 'json'))
      break
    }
    case 'jsonld': {
      const ld = options.collectionId
        ? {
            '@context': {
              '@vocab': 'https://trellis.dev/ns/',
              trellis: 'https://trellis.dev/ns/',
            },
            '@type': 'trellis:Collection',
            '@id': `trellis:collection/${options.collectionId}`,
            'trellis:records': rows.map((row) => {
              const record: Record<string, unknown> = { '@type': 'trellis:Record' }
              for (const [k, v] of Object.entries(row)) record[k] = v
              return record
            }),
          }
        : {
            '@context': {
              '@vocab': 'https://trellis.dev/ns/',
              trellis: 'https://trellis.dev/ns/',
            },
            '@type': 'trellis:EntityExport',
            'trellis:entities': rows,
          }
      const json = JSON.stringify(ld, null, 2)
      downloadBlob(
        new Blob([json], { type: 'application/ld+json;charset=utf-8' }),
        exportFilename(options.filenameSlug, 'jsonld'),
      )
      break
    }
    case 'xlsx': {
      const ws = XLSX.utils.json_to_sheet(rows, { header: keys })
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Records')
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      downloadBlob(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        exportFilename(options.filenameSlug, 'xlsx'),
      )
      break
    }
  }
}

export function exportEntities(
  entities: Entity[],
  format: ExportFormat,
  options: ExportDataOptions & { columnKeys?: string[] },
) {
  if (!entities.length) return
  const keys = options.columnKeys ?? defaultEntityExportKeys(entities)

  if (format === 'json') {
    const json = JSON.stringify(entities, null, 2)
    downloadBlob(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      exportFilename(options.filenameSlug, 'json'),
    )
    return
  }

  const rows = entitiesToExportRows(entities, keys)
  exportData(rows, keys, format, options)
}

export type EntityImportPayload = Partial<Entity> & { type: EntityType; title: string }

export function parseEntityImportJson(parsed: unknown): EntityImportPayload[] {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Import file must be a JSON object or array')
  }

  let items: unknown[] = []

  if (Array.isArray(parsed)) {
    items = parsed
  } else {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj['trellis:entities'])) {
      items = obj['trellis:entities'] as unknown[]
    } else if (Array.isArray(obj['trellis:records'])) {
      items = obj['trellis:records'] as unknown[]
    } else if (Array.isArray(obj['@graph'])) {
      items = (obj['@graph'] as unknown[]).filter(
        (node) => node && typeof node === 'object' && (node as Record<string, unknown>)['@type'] !== 'trellis:Collection',
      )
    } else {
      throw new Error('JSON-LD must contain an array, trellis:entities, trellis:records, or @graph')
    }
  }

  if (!items.length) throw new Error('Import file contains no entities')

  return items.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Row ${index + 1} is not an object`)
    }
    const row = { ...(raw as Record<string, unknown>) }
    delete row['@type']
    delete row['@id']
    delete row['@context']

    const type = row.type
    if (typeof type !== 'string' || !type.trim()) {
      throw new Error(`Row ${index + 1} is missing a valid type`)
    }

    const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : 'Untitled'
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row

    return {
      ...(rest as unknown as Partial<Entity>),
      type: type as EntityType,
      title,
    } as EntityImportPayload
  })
}

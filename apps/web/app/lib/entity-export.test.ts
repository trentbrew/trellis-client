import { describe, expect, test } from 'vitest'
import type { Entity } from '~/types/entity'
import {
  defaultEntityExportKeys,
  entitiesToExportRows,
  parseEntityImportJson,
  rowsToCsv,
  serializeCsvCell,
} from '~/lib/entity-export'

describe('entity-export', () => {
  test('defaultEntityExportKeys prioritizes core fields', () => {
    const entities = [
      { id: '1', type: 'task', title: 'A', zebra: 'z', startDate: '2026-01-01' },
    ] as Entity[]
    const keys = defaultEntityExportKeys(entities)
    expect(keys[0]).toBe('title')
    expect(keys).toContain('type')
    expect(keys).toContain('zebra')
  })

  test('entitiesToExportRows skips body/content and stringifies objects', () => {
    const entities = [
      {
        id: '1',
        type: 'note',
        title: 'Note',
        content: 'long body',
        tags: ['a', 'b'],
        references: [{ kind: 'entity', id: 'r1' }],
      },
    ] as unknown as Entity[]

    const rows = entitiesToExportRows(entities, ['title', 'type', 'content', 'tags', 'references'])
    expect(rows[0]?.content).toBeUndefined()
    expect(rows[0]?.tags).toBe(JSON.stringify(['a', 'b']))
    expect(rows[0]?.references).toBe(JSON.stringify([{ kind: 'entity', id: 'r1' }]))
  })

  test('serializeCsvCell escapes commas and quotes', () => {
    expect(serializeCsvCell('hello, world')).toBe('"hello, world"')
    expect(serializeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(serializeCsvCell(null)).toBe('')
  })

  test('rowsToCsv produces valid header and rows', () => {
    const csv = rowsToCsv(
      [{ title: 'A', type: 'task' }],
      ['title', 'type'],
    )
    expect(csv).toBe('"title","type"\nA,task')
  })

  test('parseEntityImportJson accepts array and jsonld shapes', () => {
    const fromArray = parseEntityImportJson([{ type: 'task', title: 'One' }])
    expect(fromArray).toHaveLength(1)
    expect(fromArray[0]?.type).toBe('task')

    const fromLd = parseEntityImportJson({
      'trellis:entities': [{ type: 'note', title: 'Two' }],
    })
    expect(fromLd[0]?.title).toBe('Two')

    const untitled = parseEntityImportJson([{ type: 'task' }])
    expect(untitled[0]?.title).toBe('Untitled')
  })

  test('parseEntityImportJson rejects invalid roots', () => {
    expect(() => parseEntityImportJson({})).toThrow()
    expect(() => parseEntityImportJson([])).toThrow()
    expect(() => parseEntityImportJson([{ title: 'no type' }])).toThrow()
  })
})

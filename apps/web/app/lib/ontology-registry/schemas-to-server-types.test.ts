import { describe, expect, it } from 'vitest'
import {
  ONTOLOGY_SYSTEM_SCHEMA_IDS,
  schemasRecordToServerTypes,
  schemaToEntityTypeConfig,
} from './schemas-to-server-types'

describe('schemasRecordToServerTypes', () => {
  const taskSchema = {
    '@id': 'trellis:schema/task',
    '@type': 'trellis:Schema',
    version: '1.0.0',
    tier: 'system' as const,
    entityClass: 'temporal' as const,
    label: 'Task',
    labelPlural: 'Tasks',
    icon: 'lucide:check-square',
    fields: [
      { name: 'title', valueType: 'title', required: true },
      { name: 'taskStatus', valueType: 'status' },
    ],
  }

  it('maps task schema to slug task with tier system', () => {
    const map = schemasRecordToServerTypes({ 'trellis:schema/task': taskSchema })
    const task = map.get('task')
    expect(task).toBeDefined()
    expect(task?.type).toBe('task')
    expect(task?.tier).toBe('system')
    expect(task?.schemaId).toBe('trellis:schema/task')
    expect(task?.fields).toHaveLength(2)
  })

  it('skips storage-level system schema ids', () => {
    const entityNs = [...ONTOLOGY_SYSTEM_SCHEMA_IDS][0]!
    const map = schemasRecordToServerTypes({
      [entityNs]: { ...taskSchema, '@id': entityNs },
      'trellis:schema/task': taskSchema,
    })
    expect(map.has('task')).toBe(true)
    expect(map.size).toBe(1)
  })

  it('schemaToEntityTypeConfig infers container class without entityClass', () => {
    const custom = schemaToEntityTypeConfig({
      '@id': 'trellis:schema/widget',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      tier: 'user',
      fields: [{ name: 'title', valueType: 'title' }],
    })
    expect(custom.type).toBe('widget')
    expect(custom.class).toBe('container')
    expect(custom.tier).toBe('user')
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildAppConfigImportTasks,
  compareOntologyParity,
  ontologyImportTask,
  ontologySlugFromSchemaId,
  sidecarSchemaIdSet,
} from './app-config-import-tasks.mjs'

describe('app-config-import-tasks', () => {
  it('maps ontology schemaId to ontology:{slug} AppSchema task', () => {
    const task = ontologyImportTask('trellis:schema/task', {
      '@id': 'trellis:schema/task',
      label: 'Task',
      fields: [],
    })

    expect(task.type).toBe('AppSchema')
    expect(task.id).toBe('ontology:task')
    expect(task.attributes.schemaId).toBe('trellis:schema/task')
    expect(JSON.parse(task.attributes.configJson)['@id']).toBe('trellis:schema/task')
  })

  it('slugifies nested schema paths', () => {
    expect(ontologySlugFromSchemaId('trellis:schema/foo/bar')).toBe('foo-bar')
  })

  it('buildAppConfigImportTasks returns empty array for empty config', () => {
    expect(buildAppConfigImportTasks({})).toEqual([])
  })

  it('compareOntologyParity reports missing and extra schemaIds', () => {
    const config = {
      ontologies: {
        'trellis:schema/task': { '@id': 'trellis:schema/task' },
        'trellis:schema/note': { '@id': 'trellis:schema/note' },
      },
    }

    const sidecar = [
      {
        type: 'AppSchema',
        attributes: { schemaId: 'trellis:schema/task' },
      },
      {
        type: 'AppSchema',
        attributes: { schemaId: 'trellis:schema/event' },
      },
    ]

    const result = compareOntologyParity(config, sidecar)
    expect(result.ok).toBe(false)
    expect(result.missing).toEqual(['trellis:schema/note'])
    expect(result.extra).toEqual(['trellis:schema/event'])
    expect(result.expectedCount).toBe(2)
    expect(result.actualCount).toBe(2)
  })

  it('sidecarSchemaIdSet reads flat schemaId field', () => {
    const ids = sidecarSchemaIdSet([{ schemaId: 'trellis:schema/task' }])
    expect([...ids]).toEqual(['trellis:schema/task'])
  })
})

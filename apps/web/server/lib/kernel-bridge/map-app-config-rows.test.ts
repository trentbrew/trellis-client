// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { kernelNodeToBridgeRow } from './map-app-config-rows'

describe('kernelNodeToBridgeRow', () => {
  it('maps route:home facts to AppRoute row with configJson', () => {
    const route = {
      id: 'home',
      label: 'Home',
      path: '/home',
      icon: 'lucide:home',
    }

    const row = kernelNodeToBridgeRow('route:home', {
      '@type': 'app_route',
      title: 'Home',
      configJson: JSON.stringify(route),
    })

    expect(row).toEqual({
      id: 'route:home',
      type: 'AppRoute',
      title: 'Home',
      configJson: JSON.stringify(route),
    })
  })

  it('maps trellis_schema node to AppSchema row', () => {
    const row = kernelNodeToBridgeRow('ontology:task', {
      '@type': 'trellis_schema',
      title: 'Task',
      schemaId: 'trellis:schema/task',
      configJson: '{"@id":"trellis:schema/task"}',
    })

    expect(row?.type).toBe('AppSchema')
    expect(row).toMatchObject({
      id: 'ontology:task',
      schemaId: 'trellis:schema/task',
    })
  })
})

// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { assembleAppConfigFromRows } from './assemble-config'

const homeRouteJson = JSON.stringify({
  '@id': 'route:home',
  '@type': 'trellis:Route',
  routePath: '/home',
  label: 'Home',
  order: 1,
})

describe('assembleAppConfigFromRows', () => {
  it('assembles routes keyed by route:* matching P1 snapshot shape', () => {
    const config = assembleAppConfigFromRows({
      routes: [
        {
          id: 'route:home',
          type: 'AppRoute',
          title: 'Home',
          configJson: homeRouteJson,
        },
      ],
      schemas: [],
      projections: [],
      projectionViews: [],
    })

    expect(config.routes['route:home']?.routePath).toBe('/home')
    expect(config.routes['route:home']?.label).toBe('Home')
  })

  it('parses ontologies and projection views by schema/projection ids', () => {
    const schemaJson = JSON.stringify({
      '@id': 'trellis:schema/task',
      '@type': 'trellis:Schema',
      version: '1.0.0',
      fields: [{ name: 'title', valueType: 'title' }],
      label: 'Task',
    })

    const viewJson = JSON.stringify({
      projectionType: 'table',
      label: 'Data Table',
      icon: 'lucide:table',
      order: 1,
    })

    const config = assembleAppConfigFromRows({
      routes: [],
      schemas: [
        {
          id: 'ontology:task',
          type: 'AppSchema',
          title: 'Task',
          schemaId: 'trellis:schema/task',
          configJson: schemaJson,
        },
      ],
      projections: [],
      projectionViews: [
        {
          id: 'projection-view:table',
          type: 'AppProjectionView',
          title: 'Data Table',
          projectionType: 'table',
          configJson: viewJson,
        },
      ],
    })

    expect(config.ontologies['trellis:schema/task']?.label).toBe('Task')
    expect(config.projectionViews['projection-view:table']?.projectionType).toBe('table')
  })
})

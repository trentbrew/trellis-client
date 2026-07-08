import { describe, expect, it } from 'vitest'
import { buildNavPath, getSidebarSection, parseFullPath } from './routes'
import type { RouteConfig } from './routes'

const shellRoutes: RouteConfig[] = [
  {
    path: '/ontologies',
    label: 'Ontologies',
    icon: 'lucide:shapes',
    sidebarSections: [{ label: 'TOOLS', key: 'ontologies-tools', items: [] }],
  },
  {
    path: '/mail',
    label: 'Mail',
    icon: 'lucide:mail',
    sidebarSections: [{ label: 'MAILBOXES', key: 'mail-mailboxes', items: [] }],
  },
  {
    path: '/workspace',
    label: 'Workspace',
    icon: 'lucide:layers',
  },
]

describe('parseFullPath', () => {
  it('keeps flat shell paths unchanged', () => {
    expect(parseFullPath('/mail').cleanPath).toBe('/mail')
    expect(parseFullPath('/ontologies/graph').cleanPath).toBe('/ontologies/graph')
  })

  it('maps workspace/app shell paths to flat routes', () => {
    expect(parseFullPath('/front/lab/mail').cleanPath).toBe('/mail')
    expect(parseFullPath('/front/lab/ontologies').cleanPath).toBe('/ontologies')
    expect(parseFullPath('/front/lab/workspace/browse').cleanPath).toBe('/workspace/browse')
  })

  it('maps workspace/app legacy sandbox paths to /app/*', () => {
    expect(parseFullPath('/front/lab/tasks').cleanPath).toBe('/app/tasks')
  })

  it('round-trips flat shell paths through buildNavPath', () => {
    expect(buildNavPath('/mail', 'front', 'lab')).toBe('/front/lab/mail')
    expect(buildNavPath('/app/tasks', 'front', 'lab')).toBe('/front/lab/tasks')
  })
})

describe('getSidebarSection', () => {
  it('resolves mail for workspace-scoped URLs', () => {
    const section = getSidebarSection('/front/lab/mail', shellRoutes)
    expect(section?.path).toBe('/mail')
    expect(section?.label).toBe('Mail')
  })
})

import { describe, expect, it } from 'vitest'

import { pickOrgAndApp } from '../app/lib/pickOrgAndApp'

describe('pickOrgAndApp', () => {
  it('returns null org/app when orgs is empty', () => {
    const picked = pickOrgAndApp({ orgs: [], apps: [], lastOrgId: null, lastAppId: null })
    expect(picked.org).toBe(null)
    expect(picked.app).toBe(null)
  })

  it('picks org by lastOrgId and then picks app by orgId', () => {
    const orgs = [{ id: 'org_1' }, { id: 'org_2' }]
    const apps = [
      { id: 'app_1', orgId: 'org_1' },
      { id: 'app_2', orgId: 'org_2' },
    ]

    const picked = pickOrgAndApp({ orgs, apps, lastOrgId: 'org_1', lastAppId: null })
    expect(picked.org?.id).toBe('org_1')
    expect(picked.app?.id).toBe('app_1')
  })

  it('falls back to an app from all apps if the selected org has no apps, and aligns org to app.orgId', () => {
    const orgs = [{ id: 'org_1' }, { id: 'org_2' }]
    const apps = [{ id: 'app_2', orgId: 'org_2' }]

    const picked = pickOrgAndApp({ orgs, apps, lastOrgId: 'org_1', lastAppId: null })
    expect(picked.app?.id).toBe('app_2')
    expect(picked.org?.id).toBe('org_2')
  })

  it('picks lastAppId even if it belongs to a different org, and aligns org accordingly', () => {
    const orgs = [{ id: 'org_1' }, { id: 'org_2' }]
    const apps = [
      { id: 'app_1', orgId: 'org_1' },
      { id: 'app_2', orgId: 'org_2' },
    ]

    const picked = pickOrgAndApp({ orgs, apps, lastOrgId: 'org_1', lastAppId: 'app_2' })
    expect(picked.app?.id).toBe('app_2')
    expect(picked.org?.id).toBe('org_2')
  })
})

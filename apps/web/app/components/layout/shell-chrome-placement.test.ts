import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const appHeader = readFileSync(resolve(here, '../app/AppHeader.vue'), 'utf8')
const iconRail = readFileSync(resolve(here, 'IconRail.vue'), 'utf8')

/**
 * LOCKED: resident cluster in AppHeader top-right — NOT IconRail dock.
 * See .cursor/rules/trellis-shell-chrome.mdc
 */
describe('shell chrome placement', () => {
  it('mounts AccountRailCluster in AppHeader with placement="header"', () => {
    expect(appHeader).toMatch(/AccountRailCluster[^>]*placement="header"/)
  })

  it('does not mount AccountRailCluster on IconRail', () => {
    expect(iconRail).not.toMatch(/<AccountRailCluster/)
  })
})

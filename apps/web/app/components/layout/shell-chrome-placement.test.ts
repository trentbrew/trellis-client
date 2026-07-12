import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const appHeader = readFileSync(resolve(here, '../app/AppHeader.vue'), 'utf8')
const iconRail = readFileSync(resolve(here, 'IconRail.vue'), 'utf8')
const cluster = readFileSync(resolve(here, '../app/AccountRailCluster.vue'), 'utf8')
const activeCss = readFileSync(resolve(here, '../../assets/css/tailwind.css'), 'utf8')

/**
 * Split resident placement — see .cursor/rules/trellis-shell-chrome.mdc
 */
describe('shell chrome placement', () => {
  it('mounts slim AccountRailCluster in AppHeader with placement="header"', () => {
    expect(appHeader).toMatch(/AccountRailCluster[^>]*placement="header"/)
  })

  it('does not mount AccountRailCluster on IconRail', () => {
    expect(iconRail).not.toMatch(/<AccountRailCluster/)
  })

  it('mounts UserAccountMenu and QuickCreateButton on IconRail corners', () => {
    expect(iconRail).toMatch(/UserAccountMenu/)
    expect(iconRail).toMatch(/QuickCreateButton/)
    expect(iconRail).toMatch(/AdapterModeBadge/)
  })

  it('does not put avatar or QuickCreate inside AccountRailCluster', () => {
    expect(cluster).not.toMatch(/UserAccountMenu/)
    expect(cluster).not.toMatch(/QuickCreateButton/)
    expect(cluster).toMatch(/NotificationBell/)
    expect(cluster).toMatch(/QuickCapturePopover/)
  })

  it('mounts ZonePresenceAvatars in AppHeader', () => {
    expect(appHeader).toMatch(/ZonePresenceAvatars/)
  })

  it('ghost logo wrapper has no filled chip classes', () => {
    expect(appHeader).not.toMatch(/bg-rail-foreground\/10[\s\S]{0,80}AppLogo/)
    expect(appHeader).not.toMatch(/bg-accent-foreground\/10[\s\S]{0,80}AppLogo/)
  })

  it('active dock style is bg-card without border', () => {
    expect(activeCss).toMatch(/\.rail-nav-active-zone\s*\{[^}]*background:\s*var\(--card\)/)
    expect(activeCss).toMatch(/\.rail-nav-active-zone\s*\{[^}]*border:\s*none/)
  })
})

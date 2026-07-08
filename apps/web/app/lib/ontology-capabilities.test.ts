import { describe, it, expect } from 'vitest'
import {
  resolveBrowseEnabled,
  resolveStaticBrowseEnabled,
  getRoutedSurface,
  ROUTED_ONTOLOGY_SURFACES,
} from '~/lib/ontology-capabilities'

describe('ontology-capabilities', () => {
  it('routes channel and message to /messages', () => {
    expect(getRoutedSurface('channel')).toBe('/messages')
    expect(getRoutedSurface('message')).toBe('/messages')
    expect(ROUTED_ONTOLOGY_SURFACES.channel).toBe('/messages')
  })

  it('enables browse for user-tier types by default', () => {
    expect(resolveBrowseEnabled('invoice', { tier: 'user' })).toBe(true)
  })

  it('disables browse for routed system types', () => {
    expect(resolveBrowseEnabled('channel', { tier: 'system' })).toBe(false)
    expect(resolveBrowseEnabled('message', { tier: 'system', routed: '/messages' })).toBe(false)
  })

  it('disables browse for core tier', () => {
    expect(resolveBrowseEnabled('entity', { tier: 'core' })).toBe(false)
  })

  it('respects explicit browse.enabled override', () => {
    expect(resolveBrowseEnabled('task', { tier: 'system', browse: { enabled: false } })).toBe(false)
    expect(resolveBrowseEnabled('channel', { tier: 'system', browse: { enabled: true } })).toBe(true)
  })

  it('uses static fallback when server schema not loaded', () => {
    expect(resolveStaticBrowseEnabled('task')).toBe(true)
    expect(resolveStaticBrowseEnabled('task', true)).toBe(false)
    expect(resolveStaticBrowseEnabled('channel')).toBe(false)
  })
})

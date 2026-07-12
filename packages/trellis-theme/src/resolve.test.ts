import { describe, expect, it } from 'vitest'
import { resolveActiveTheme } from './resolve'
import type { ThemePresets } from './types'

const presets: ThemePresets = {
  graphite: {
    label: 'Graphite',
    source: 'BUILT_IN',
    styles: {
      light: { background: 'oklch(1 0 0)', foreground: 'oklch(0.2 0 0)' },
      dark: { background: 'oklch(0.14 0 0)', foreground: 'oklch(0.88 0 0)' },
    },
  },
  twitter: {
    label: 'Twitter',
    source: 'BUILT_IN',
    styles: {
      light: { background: 'oklch(1 0 0)', foreground: 'oklch(0.1 0 0)' },
      dark: { background: 'oklch(0.1 0 0)', foreground: 'oklch(0.9 0 0)' },
    },
  },
}

describe('resolveActiveTheme', () => {
  it('defaults to graphite dark', () => {
    const theme = resolveActiveTheme(presets, {})
    expect(theme.presetId).toBe('graphite')
    expect(theme.mode).toBe('dark')
    expect(theme.styles.background).toBe('oklch(0.14 0 0)')
    expect(theme.source).toBe('default')
  })

  it('resolves explicit preference', () => {
    const theme = resolveActiveTheme(presets, { presetId: 'twitter', mode: 'light' })
    expect(theme.presetId).toBe('twitter')
    expect(theme.mode).toBe('light')
    expect(theme.source).toBe('platform')
    expect(theme.presetFallback).toBe(false)
  })

  it('flags fallback when custom preset is unavailable', () => {
    const theme = resolveActiveTheme(presets, { presetId: 'missing-custom', mode: 'dark' })
    expect(theme.presetId).toBe('graphite')
    expect(theme.requestedPresetId).toBe('missing-custom')
    expect(theme.presetFallback).toBe(true)
  })
})

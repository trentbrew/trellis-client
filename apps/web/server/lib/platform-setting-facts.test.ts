// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  readPlatformSettingValue,
  resolveLatestFactValue,
  unflattenPrefixed,
} from './platform-setting-facts'

describe('platform-setting-facts', () => {
  it('resolveLatestFactValue returns the last array element', () => {
    expect(resolveLatestFactValue(['a', 'b', 'twitter'])).toBe('twitter')
    expect(resolveLatestFactValue('light')).toBe('light')
  })

  it('unflattenPrefixed rebuilds nested theme preference', () => {
    const node = {
      '@id': 'platform:setting/app/theme',
      key: 'theme',
      'value.presetId': ['missing-custom', 'twitter'],
      'value.mode': ['dark', 'light'],
    }

    expect(unflattenPrefixed(node, 'value')).toEqual({
      presetId: 'twitter',
      mode: 'light',
    })
  })

  it('readPlatformSettingValue rebuilds custom preset maps', () => {
    const node = {
      '@id': 'platform:setting/app/theme-custom-presets',
      'value.acme.label': 'Acme',
      'value.acme.styles.light.background': 'oklch(1 0 0)',
      'value.acme.styles.dark.background': 'oklch(0.1 0 0)',
    }

    expect(readPlatformSettingValue(node)).toEqual({
      acme: {
        label: 'Acme',
        styles: {
          light: { background: 'oklch(1 0 0)' },
          dark: { background: 'oklch(0.1 0 0)' },
        },
      },
    })
  })

  it('readPlatformSettingValue prefers direct value when present', () => {
    expect(readPlatformSettingValue({ value: { presetId: 'graphite', mode: 'dark' } })).toEqual({
      presetId: 'graphite',
      mode: 'dark',
    })
  })
})

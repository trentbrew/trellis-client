import { describe, expect, test } from 'vitest'
import {
  BROWSE_GRID_DEFAULT_DENSITY,
  BROWSE_GRID_MAX_DENSITY,
  BROWSE_GRID_MIN_DENSITY,
  browseGridDensityLabel,
  buildBrowseGridStyle,
  clampBrowseGridDensity,
  colsPreferenceToDensity,
} from './browse-grid-density'

describe('browse-grid-density', () => {
  test('clampBrowseGridDensity bounds values', () => {
    expect(clampBrowseGridDensity(0.5)).toBe(BROWSE_GRID_MIN_DENSITY)
    expect(clampBrowseGridDensity(2)).toBe(BROWSE_GRID_MAX_DENSITY)
    expect(clampBrowseGridDensity(1)).toBe(BROWSE_GRID_DEFAULT_DENSITY)
  })

  test('colsPreferenceToDensity maps legacy column counts', () => {
    expect(colsPreferenceToDensity(4)).toBeCloseTo(1.2, 2)
    expect(colsPreferenceToDensity(1)).toBe(BROWSE_GRID_MAX_DENSITY)
    expect(colsPreferenceToDensity(6)).toBeCloseTo(0.778, 2)
  })

  test('buildBrowseGridStyle sets density CSS variables', () => {
    const style = buildBrowseGridStyle(1.1)
    expect(style['--browse-density']).toBe('1.1')
    expect(style['--browse-base-min']).toBe('240px')
    expect(style).not.toHaveProperty('gridTemplateColumns')
  })

  test('browseGridDensityLabel rounds to percent', () => {
    expect(browseGridDensityLabel(1)).toBe('100%')
    expect(browseGridDensityLabel(1.125)).toBe('113%')
  })
})

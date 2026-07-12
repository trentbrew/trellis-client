export const BROWSE_GRID_BASE_MIN_PX = 240
export const BROWSE_GRID_MIN_DENSITY = 0.75
export const BROWSE_GRID_MAX_DENSITY = 1.5
export const BROWSE_GRID_DEFAULT_DENSITY = 1
export const BROWSE_GRID_DENSITY_STEP = 0.1
export const BROWSE_GRID_REFERENCE_WIDTH = 1200
export const BROWSE_GRID_GAP_PX = 16

export function clampBrowseGridDensity(value: number) {
  return Math.min(BROWSE_GRID_MAX_DENSITY, Math.max(BROWSE_GRID_MIN_DENSITY, value))
}

/** Map legacy 1–6 column preference to an equivalent density at a reference width. */
export function colsPreferenceToDensity(
  cols: number,
  referenceWidth = BROWSE_GRID_REFERENCE_WIDTH,
  gap = BROWSE_GRID_GAP_PX,
  baseMin = BROWSE_GRID_BASE_MIN_PX,
) {
  const clampedCols = Math.min(6, Math.max(1, Math.round(cols)))
  const available = referenceWidth - (clampedCols - 1) * gap
  const colWidth = available / clampedCols
  return clampBrowseGridDensity(colWidth / baseMin)
}

export function browseGridDensityLabel(density: number) {
  return `${Math.round(density * 100)}%`
}

export function buildBrowseGridStyle(density: number, baseMinPx = BROWSE_GRID_BASE_MIN_PX) {
  return {
    '--browse-base-min': `${baseMinPx}px`,
    '--browse-density': String(density),
  }
}

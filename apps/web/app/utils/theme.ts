import type { ThemePreset, ThemeStyleProps } from '~/types/theme'

/**
 * Converts a color value to CSS variable format
 * Handles hex, rgb, hsl, and oklch colors
 */
function normalizeColorValue(value: string): string {
  // If it's already a CSS variable, return as is
  if (value.startsWith('var(') || value.startsWith('--')) {
    return value
  }

  // If it's a hex color, convert to oklch if needed (for Tailwind v4)
  // For now, we'll keep the original format
  return value
}

/**
 * Applies theme styles to the document root as CSS variables
 * Tailwind CSS v4 uses CSS variables directly on :root and .dark
 */
export function applyThemeStyles(styles: Partial<ThemeStyleProps>, _mode: 'light' | 'dark' = 'light'): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  // Apply each style as a CSS variable
  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined) return

    // Convert kebab-case to CSS variable format
    // Tailwind v4 expects variables like --background, --foreground, etc.
    // The CSS already defines these, so we just need to override them
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    const normalizedValue = normalizeColorValue(value)

    // Set the CSS variable on the root element
    // Tailwind v4 will use these variables
    root.style.setProperty(cssVar, normalizedValue)
  })
}

/**
 * Applies a complete theme preset to the document
 */
export function applyThemePreset(preset: ThemePreset, mode: 'light' | 'dark' = 'light'): void {
  const styles = preset.styles[mode]
  applyThemeStyles(styles, mode)
}

/**
 * Converts hex color to oklch format (if needed)
 * This is a placeholder - you might want to use a color conversion library
 */
export function hexToOklch(hex: string): string {
  // For now, return hex as-is
  // In a production app, you'd want to convert hex -> rgb -> oklch
  return hex
}

/**
 * Gets the current theme CSS variables from the document
 */
export function getCurrentThemeStyles(_mode: 'light' | 'dark' = 'light'): Partial<ThemeStyleProps> {
  if (typeof document === 'undefined') return {}

  const root = document.documentElement
  const styles: Partial<ThemeStyleProps> = {}
  const computedStyle = getComputedStyle(root)

  // List of all possible theme properties
  const themeKeys: (keyof ThemeStyleProps)[] = [
    'background',
    'foreground',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    'border',
    'input',
    'ring',
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
    'radius',
    'sidebar',
    'sidebar-foreground',
    'sidebar-primary',
    'sidebar-primary-foreground',
    'sidebar-accent',
    'sidebar-accent-foreground',
    'sidebar-border',
    'sidebar-ring',
    'sidebar-input',
    'rail',
    'rail-foreground',
    'rail-border',
    'font-sans',
    'font-serif',
    'font-mono',
  ]

  themeKeys.forEach((key) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    const value = computedStyle.getPropertyValue(cssVar).trim()
    if (value) {
      styles[key] = value
    }
  })

  return styles
}

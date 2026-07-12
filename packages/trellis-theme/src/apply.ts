import type { ColorMode, ThemeStyleProps } from './types'

export const THEME_STYLE_KEYS: Array<keyof ThemeStyleProps> = [
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
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
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

function normalizeColorValue(value: string): string {
  if (value.startsWith('var(') || value.startsWith('--'))
    return value

  return value
}

function toCssVarName(key: string): string {
  return `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
}

/** Remove inline theme overrides so base CSS tokens take effect again. */
export function clearThemeOverrides(): void {
  if (typeof document === 'undefined')
    return

  const root = document.documentElement

  for (const key of THEME_STYLE_KEYS)
    root.style.removeProperty(toCssVarName(key))
}

/** Apply token map to document root as CSS custom properties. */
export function applyThemeStyles(
  styles: Partial<ThemeStyleProps>,
  _mode: ColorMode = 'light',
): void {
  if (typeof document === 'undefined')
    return

  const root = document.documentElement

  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined)
      continue

    root.style.setProperty(toCssVarName(key), normalizeColorValue(value))
  }
}

/** Apply a full preset for the given color mode. */
export function applyThemePreset(preset: import('./types').ThemePreset, mode: ColorMode = 'light'): void {
  applyThemeStyles(preset.styles[mode], mode)
}

/** Toggle the `.dark` class and apply resolved theme tokens. */
export function applyActiveTheme(
  theme: { mode: ColorMode; styles: Partial<ThemeStyleProps> },
): void {
  if (typeof document === 'undefined')
    return

  document.documentElement.classList.toggle('dark', theme.mode === 'dark')
  applyThemeStyles(theme.styles, theme.mode)
}

/** Reset studio overrides and apply only the color mode class (uses base.css tokens). */
export function applyLocalColorMode(mode: ColorMode): void {
  if (typeof document === 'undefined')
    return

  clearThemeOverrides()
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

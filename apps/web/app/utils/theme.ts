import type { ColorMode, ThemeStyleProps } from '@turtle.tech/trellis-theme'

export {
  applyActiveTheme,
  applyThemePreset,
  applyThemeStyles,
  clearThemeOverrides,
} from '@turtle.tech/trellis-theme'

export function getCurrentThemeStyles(_mode: ColorMode = 'light'): Partial<ThemeStyleProps> {
  if (typeof document === 'undefined')
    return {}

  const root = document.documentElement
  const styles: Partial<ThemeStyleProps> = {}
  const computedStyle = getComputedStyle(root)

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

  for (const key of themeKeys) {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    const value = computedStyle.getPropertyValue(cssVar).trim()
    if (value)
      styles[key] = value
  }

  return styles
}

export function hexToOklch(hex: string): string {
  return hex
}

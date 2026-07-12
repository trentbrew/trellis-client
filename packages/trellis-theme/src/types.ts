export interface ThemeStyleProps {
  background: string
  foreground: string
  card: string
  'card-foreground': string
  popover: string
  'popover-foreground': string
  primary: string
  'primary-foreground': string
  secondary: string
  'secondary-foreground': string
  muted: string
  'muted-foreground': string
  accent: string
  'accent-foreground': string
  destructive: string
  'destructive-foreground': string
  border: string
  input: string
  ring: string
  'chart-1': string
  'chart-2': string
  'chart-3': string
  'chart-4': string
  'chart-5': string
  radius?: string
  sidebar?: string
  'sidebar-foreground'?: string
  'sidebar-primary'?: string
  'sidebar-primary-foreground'?: string
  'sidebar-accent'?: string
  'sidebar-accent-foreground'?: string
  'sidebar-border'?: string
  'sidebar-ring'?: string
  'sidebar-input'?: string
  rail?: string
  'rail-foreground'?: string
  'rail-border'?: string
  'font-sans'?: string
  'font-serif'?: string
  'font-mono'?: string
  success?: string
  'success-foreground'?: string
  warning?: string
  'warning-foreground'?: string
}

export interface ThemeStyles {
  light: Partial<ThemeStyleProps>
  dark: Partial<ThemeStyleProps>
}

export interface ThemePreset {
  label: string
  createdAt?: string
  source?: 'BUILT_IN' | 'CUSTOM'
  styles: ThemeStyles
}

export type ThemePresetId = string
export type ThemePresets = Record<ThemePresetId, ThemePreset>
export type ColorMode = 'light' | 'dark'

export interface ThemePreference {
  presetId?: string
  mode?: ColorMode
}

export interface ActiveTheme {
  presetId: string
  mode: ColorMode
  label: string
  styles: Partial<ThemeStyleProps>
  source: 'platform' | 'default'
  requestedPresetId?: string
  presetFallback?: boolean
}

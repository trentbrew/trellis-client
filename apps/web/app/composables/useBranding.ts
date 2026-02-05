/**
 * Branding Composable
 *
 * Provides white-label customization for the self-building app.
 * Supports theme colors, typography, logos, and custom CSS.
 */

// Color palette for theming
export interface ColorPalette {
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  card: string
  cardForeground: string
  border: string
  input: string
  ring: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
}

// Typography settings
export interface TypographySettings {
  fontFamily: {
    sans: string
    serif: string
    mono: string
  }
  fontSize: {
    base: string
    scale: number
  }
  fontWeight: {
    normal: number
    medium: number
    semibold: number
    bold: number
  }
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
  }
  letterSpacing: {
    tight: string
    normal: string
    wide: string
  }
}

// Logo configuration
export interface LogoConfig {
  primary: {
    url: string
    alt: string
    width?: number
    height?: number
  }
  icon: {
    url: string
    alt: string
    size?: number
  }
  favicon: {
    url: string
  }
  darkMode?: {
    primary?: string
    icon?: string
  }
}

// Layout customization
export interface LayoutConfig {
  sidebar: {
    width: number
    collapsedWidth: number
    position: 'left' | 'right'
    style: 'floating' | 'fixed' | 'overlay'
  }
  header: {
    height: number
    sticky: boolean
    transparent: boolean
  }
  content: {
    maxWidth: string
    padding: string
  }
  borderRadius: {
    none: string
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
}

// Complete brand configuration
export interface BrandConfig {
  id: string
  name: string
  tagline?: string
  description?: string
  logo: LogoConfig
  colors: {
    light: ColorPalette
    dark: ColorPalette
  }
  typography: TypographySettings
  layout: LayoutConfig
  customCss?: string
  metadata: {
    title?: string
    description?: string
    keywords?: string[]
    ogImage?: string
  }
  createdAt: number
  updatedAt: number
}

// Preset themes
export type ThemePreset = 'default' | 'minimal' | 'vibrant' | 'corporate' | 'playful' | 'dark'

export function useBranding() {
  const { currentOrganization } = useOrganizations()

  // Default color palettes
  const defaultLightPalette: ColorPalette = {
    primary: '222.2 47.4% 11.2%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96.1%',
    secondaryForeground: '222.2 47.4% 11.2%',
    accent: '210 40% 96.1%',
    accentForeground: '222.2 47.4% 11.2%',
    background: '0 0% 100%',
    foreground: '222.2 47.4% 11.2%',
    muted: '210 40% 96.1%',
    mutedForeground: '215.4 16.3% 46.9%',
    card: '0 0% 100%',
    cardForeground: '222.2 47.4% 11.2%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '222.2 47.4% 11.2%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 40% 98%',
    success: '142 76% 36%',
    successForeground: '210 40% 98%',
    warning: '38 92% 50%',
    warningForeground: '222.2 47.4% 11.2%',
  }

  const defaultDarkPalette: ColorPalette = {
    primary: '210 40% 98%',
    primaryForeground: '222.2 47.4% 11.2%',
    secondary: '217.2 32.6% 17.5%',
    secondaryForeground: '210 40% 98%',
    accent: '217.2 32.6% 17.5%',
    accentForeground: '210 40% 98%',
    background: '222.2 84% 4.9%',
    foreground: '210 40% 98%',
    muted: '217.2 32.6% 17.5%',
    mutedForeground: '215 20.2% 65.1%',
    card: '222.2 84% 4.9%',
    cardForeground: '210 40% 98%',
    border: '217.2 32.6% 17.5%',
    input: '217.2 32.6% 17.5%',
    ring: '212.7 26.8% 83.9%',
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '210 40% 98%',
    success: '142 76% 36%',
    successForeground: '210 40% 98%',
    warning: '38 92% 50%',
    warningForeground: '222.2 47.4% 11.2%',
  }

  // Default typography
  const defaultTypography: TypographySettings = {
    fontFamily: {
      sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
      serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
      mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    },
    fontSize: {
      base: '16px',
      scale: 1.25,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  }

  // Default layout
  const defaultLayout: LayoutConfig = {
    sidebar: {
      width: 280,
      collapsedWidth: 64,
      position: 'left',
      style: 'fixed',
    },
    header: {
      height: 64,
      sticky: true,
      transparent: false,
    },
    content: {
      maxWidth: '1280px',
      padding: '1.5rem',
    },
    borderRadius: {
      none: '0',
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    },
  }

  // Default logo config
  const defaultLogo: LogoConfig = {
    primary: {
      url: '/logo.svg',
      alt: 'Logo',
      width: 120,
      height: 32,
    },
    icon: {
      url: '/icon.svg',
      alt: 'Icon',
      size: 32,
    },
    favicon: {
      url: '/favicon.ico',
    },
  }

  // Create default brand config
  const createDefaultBrandConfig = (name?: string): BrandConfig => ({
    id: crypto.randomUUID(),
    name: name || currentOrganization.value?.name || 'My App',
    tagline: 'Build something amazing',
    description: '',
    logo: { ...defaultLogo },
    colors: {
      light: { ...defaultLightPalette },
      dark: { ...defaultDarkPalette },
    },
    typography: { ...defaultTypography },
    layout: { ...defaultLayout },
    metadata: {
      title: name || 'My App',
      description: 'A custom application',
      keywords: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Theme presets
  const themePresets: Record<ThemePreset, Partial<BrandConfig>> = {
    default: {},
    minimal: {
      colors: {
        light: {
          ...defaultLightPalette,
          primary: '0 0% 9%',
          accent: '0 0% 96%',
        },
        dark: {
          ...defaultDarkPalette,
          primary: '0 0% 98%',
          accent: '0 0% 15%',
        },
      },
      layout: {
        ...defaultLayout,
        borderRadius: {
          none: '0',
          sm: '0',
          md: '0.25rem',
          lg: '0.375rem',
          xl: '0.5rem',
          full: '9999px',
        },
      },
    },
    vibrant: {
      colors: {
        light: {
          ...defaultLightPalette,
          primary: '262 83% 58%',
          primaryForeground: '0 0% 100%',
          accent: '316 73% 52%',
          accentForeground: '0 0% 100%',
        },
        dark: {
          ...defaultDarkPalette,
          primary: '262 83% 68%',
          primaryForeground: '0 0% 0%',
          accent: '316 73% 62%',
          accentForeground: '0 0% 0%',
        },
      },
    },
    corporate: {
      colors: {
        light: {
          ...defaultLightPalette,
          primary: '221 83% 53%',
          primaryForeground: '0 0% 100%',
          accent: '199 89% 48%',
          accentForeground: '0 0% 100%',
        },
        dark: {
          ...defaultDarkPalette,
          primary: '217 91% 60%',
          primaryForeground: '0 0% 100%',
          accent: '199 89% 58%',
          accentForeground: '0 0% 100%',
        },
      },
      typography: {
        ...defaultTypography,
        fontFamily: {
          sans: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
          serif: '"IBM Plex Serif", Georgia, serif',
          mono: '"IBM Plex Mono", ui-monospace, monospace',
        },
      },
    },
    playful: {
      colors: {
        light: {
          ...defaultLightPalette,
          primary: '339 90% 51%',
          primaryForeground: '0 0% 100%',
          accent: '47 96% 53%',
          accentForeground: '0 0% 0%',
          background: '45 100% 98%',
        },
        dark: {
          ...defaultDarkPalette,
          primary: '339 90% 61%',
          primaryForeground: '0 0% 100%',
          accent: '47 96% 63%',
          accentForeground: '0 0% 0%',
        },
      },
      layout: {
        ...defaultLayout,
        borderRadius: {
          none: '0',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          full: '9999px',
        },
      },
    },
    dark: {
      colors: {
        light: {
          ...defaultLightPalette,
          background: '240 10% 3.9%',
          foreground: '0 0% 98%',
          card: '240 10% 3.9%',
          cardForeground: '0 0% 98%',
          primary: '0 0% 98%',
          primaryForeground: '240 5.9% 10%',
          muted: '240 3.7% 15.9%',
          mutedForeground: '240 5% 64.9%',
          border: '240 3.7% 15.9%',
          input: '240 3.7% 15.9%',
        },
        dark: {
          ...defaultDarkPalette,
          background: '240 10% 3.9%',
          foreground: '0 0% 98%',
          card: '240 10% 3.9%',
          cardForeground: '0 0% 98%',
          primary: '0 0% 98%',
          primaryForeground: '240 5.9% 10%',
          muted: '240 3.7% 15.9%',
          mutedForeground: '240 5% 64.9%',
          border: '240 3.7% 15.9%',
          input: '240 3.7% 15.9%',
        },
      },
    },
  }

  // Apply a theme preset
  const applyPreset = (config: BrandConfig, preset: ThemePreset): BrandConfig => {
    const presetConfig = themePresets[preset]
    return {
      ...config,
      colors: presetConfig.colors
        ? {
            light: { ...config.colors.light, ...presetConfig.colors.light },
            dark: { ...config.colors.dark, ...presetConfig.colors.dark },
          }
        : config.colors,
      typography: presetConfig.typography
        ? { ...config.typography, ...presetConfig.typography }
        : config.typography,
      layout: presetConfig.layout ? { ...config.layout, ...presetConfig.layout } : config.layout,
      updatedAt: Date.now(),
    }
  }

  // Generate CSS variables from brand config
  const generateCssVariables = (config: BrandConfig, mode: 'light' | 'dark'): string => {
    const palette = config.colors[mode]
    const layout = config.layout
    const typography = config.typography

    return `
      --primary: ${palette.primary};
      --primary-foreground: ${palette.primaryForeground};
      --secondary: ${palette.secondary};
      --secondary-foreground: ${palette.secondaryForeground};
      --accent: ${palette.accent};
      --accent-foreground: ${palette.accentForeground};
      --background: ${palette.background};
      --foreground: ${palette.foreground};
      --muted: ${palette.muted};
      --muted-foreground: ${palette.mutedForeground};
      --card: ${palette.card};
      --card-foreground: ${palette.cardForeground};
      --border: ${palette.border};
      --input: ${palette.input};
      --ring: ${palette.ring};
      --destructive: ${palette.destructive};
      --destructive-foreground: ${palette.destructiveForeground};
      --success: ${palette.success};
      --success-foreground: ${palette.successForeground};
      --warning: ${palette.warning};
      --warning-foreground: ${palette.warningForeground};
      --radius: ${layout.borderRadius.md};
      --font-sans: ${typography.fontFamily.sans};
      --font-serif: ${typography.fontFamily.serif};
      --font-mono: ${typography.fontFamily.mono};
    `.trim()
  }

  // Validate brand config
  const validateBrandConfig = (
    config: BrandConfig
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!config.name?.trim()) {
      errors.push('Brand name is required')
    }

    if (!config.logo.primary.url?.trim()) {
      errors.push('Primary logo URL is required')
    }

    return { valid: errors.length === 0, errors }
  }

  // Serialize to JSON-LD
  const toJsonLd = (config: BrandConfig): Record<string, any> => {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        brand: 'https://schema.org/Brand',
        theme: 'https://example.org/theme/',
      },
      '@type': 'Brand',
      '@id': `brand:${config.id}`,
      name: config.name,
      slogan: config.tagline,
      description: config.description,
      logo: {
        '@type': 'ImageObject',
        url: config.logo.primary.url,
        width: config.logo.primary.width,
        height: config.logo.primary.height,
      },
      'theme:colors': config.colors,
      'theme:typography': config.typography,
      'theme:layout': config.layout,
      'theme:customCss': config.customCss,
      dateCreated: new Date(config.createdAt).toISOString(),
      dateModified: new Date(config.updatedAt).toISOString(),
    }
  }

  return {
    // Defaults
    defaultLightPalette,
    defaultDarkPalette,
    defaultTypography,
    defaultLayout,
    defaultLogo,

    // Brand config operations
    createDefaultBrandConfig,
    applyPreset,
    validateBrandConfig,

    // Theme presets
    themePresets,

    // CSS generation
    generateCssVariables,

    // Serialization
    toJsonLd,

    // Context
    currentOrganization,
  }
}
